/**
 * BHOOMI SETU - Offline Local-First Database (IndexedDB)
 * Provides offline village dossier caching, offline survey outbox queue,
 * and conflict adjudication storage for rural zero-network environments.
 */

const DB_NAME = 'BhoomiSetuOfflineDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Cached Projects / Villages
      if (!db.objectStoreNames.contains('offline_projects')) {
        db.createObjectStore('offline_projects', { keyPath: 'id' });
      }

      // 2. Cached Land Parcels (Cadastral boundaries & attributes)
      if (!db.objectStoreNames.contains('offline_parcels')) {
        const parcelStore = db.createObjectStore('offline_parcels', { keyPath: 'id' });
        parcelStore.createIndex('project_id', 'project_id', { unique: false });
        parcelStore.createIndex('ulpin', 'ulpin', { unique: false });
      }

      // 3. Survey Outbox (Queued offline submissions)
      if (!db.objectStoreNames.contains('survey_outbox')) {
        const outboxStore = db.createObjectStore('survey_outbox', { keyPath: 'id' });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('project_id', 'project_id', { unique: false });
        outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 4. Conflicts pending adjudication
      if (!db.objectStoreNames.contains('conflicts')) {
        db.createObjectStore('conflicts', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache an entire project / village dossier and its cadastral parcels for offline fieldwork.
 */
export async function cacheVillageProject(project, parcels = []) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['offline_projects', 'offline_parcels'], 'readwrite');
    const projectStore = tx.objectStore('offline_projects');
    const parcelStore = tx.objectStore('offline_parcels');

    const projectWithMeta = {
      ...project,
      cached_at: new Date().toISOString(),
      parcels_count: parcels.length
    };
    projectStore.put(projectWithMeta);

    parcels.forEach(p => {
      parcelStore.put({
        ...p,
        cached_at: new Date().toISOString(),
        base_version: p.version || 1
      });
    });

    tx.oncomplete = () => resolve({ success: true, count: parcels.length });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Fetch cached parcels for a project from IndexedDB.
 */
export async function getCachedParcels(projectId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_parcels', 'readonly');
    const store = tx.objectStore('offline_parcels');
    const index = store.index('project_id');
    const request = projectId ? index.getAll(projectId) : store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fetch all cached projects from IndexedDB.
 */
export async function getCachedProjects() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_projects', 'readonly');
    const store = tx.objectStore('offline_projects');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Queue an offline survey submission into the outbox.
 */
export async function queueOfflineSurvey(surveyPayload, type = 'INSPECTION') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('survey_outbox', 'readwrite');
    const store = tx.objectStore('survey_outbox');

    const outboxItem = {
      id: `OUTBOX-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type, // 'INSPECTION' | 'NEW_PARCEL'
      project_id: surveyPayload.project_id,
      parcel_id: surveyPayload.parcel_id || null,
      ulpin: surveyPayload.ulpin || surveyPayload.parcel_ulpin || null,
      data: surveyPayload,
      status: 'PENDING', // 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED'
      timestamp: new Date().toISOString(),
      retry_count: 0,
      error: null,
      conflict_details: null
    };

    const request = store.add(outboxItem);
    request.onsuccess = () => resolve(outboxItem);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all outbox items.
 */
export async function getOutboxItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('survey_outbox', 'readonly');
    const store = tx.objectStore('survey_outbox');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update the status of an outbox item.
 */
export async function updateOutboxItemStatus(id, status, error = null, conflictDetails = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('survey_outbox', 'readwrite');
    const store = tx.objectStore('survey_outbox');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) {
        resolve(null);
        return;
      }
      item.status = status;
      if (error !== null) item.error = error;
      if (conflictDetails !== null) item.conflict_details = conflictDetails;
      if (status === 'SYNCING') item.retry_count = (item.retry_count || 0) + 1;
      item.updated_at = new Date().toISOString();

      const putReq = store.put(item);
      putReq.onsuccess = () => resolve(item);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Remove an item from the outbox (e.g. after successful sync or dismissal).
 */
export async function removeOutboxItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('survey_outbox', 'readwrite');
    const store = tx.objectStore('survey_outbox');
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count pending, syncing, and conflict items in the outbox.
 */
export async function getOutboxStats() {
  const items = await getOutboxItems();
  return {
    total: items.length,
    pending: items.filter(i => i.status === 'PENDING').length,
    conflicts: items.filter(i => i.status === 'CONFLICT').length,
    synced: items.filter(i => i.status === 'SYNCED').length,
    failed: items.filter(i => i.status === 'FAILED').length
  };
}
