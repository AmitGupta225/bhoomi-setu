/**
 * BHOOMI SETU - Synchronizer & Conflict Resolution Engine
 * Handles automatic background synchronization when internet connectivity resumes,
 * optimistic queue draining, and conflict adjudication events.
 */

import {
  getOutboxItems,
  updateOutboxItemStatus,
  removeOutboxItem,
  getOutboxStats
} from './offlineStorage';
import { syncFieldSurveysBatch, resolveFieldConflict } from './api';

const listeners = new Set();

export function isDeviceOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function subscribeSyncStatus(callback) {
  listeners.add(callback);
  // Initial emission
  notifySubscribers();
  return () => listeners.delete(callback);
}

async function notifySubscribers(extraData = {}) {
  try {
    const stats = await getOutboxStats();
    const payload = {
      isOnline: isDeviceOnline(),
      stats,
      ...extraData
    };
    listeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[SyncEngine] Subscriber callback error:', err);
      }
    });
  } catch (err) {
    console.warn('[SyncEngine] Failed to get stats for subscribers:', err);
  }
}

// Auto-trigger sync on network restoration
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[SyncEngine] Network connection restored. Auto-syncing outbox...');
    notifySubscribers({ event: 'ONLINE' });
    await triggerSyncNow();
  });

  window.addEventListener('offline', () => {
    console.warn('[SyncEngine] Network connection lost. Switched to offline local-first mode.');
    notifySubscribers({ event: 'OFFLINE' });
  });
}

/**
 * Manually or automatically trigger synchronization of all pending outbox items.
 */
export async function triggerSyncNow() {
  if (!isDeviceOnline()) {
    notifySubscribers({ syncStatus: 'OFFLINE_BLOCKED' });
    return { success: false, error: 'Device is offline. Connect to network to sync.' };
  }

  notifySubscribers({ syncStatus: 'SYNCING' });

  try {
    const allItems = await getOutboxItems();
    const pendingItems = allItems.filter(
      (item) => item.status === 'PENDING' || item.status === 'FAILED' || item.status === 'SYNCING'
    );

    if (pendingItems.length === 0) {
      notifySubscribers({ syncStatus: 'IDLE' });
      return { success: true, processed: [], message: 'Outbox has no pending surveys.' };
    }

    // Mark as SYNCING in IndexedDB
    for (const item of pendingItems) {
      await updateOutboxItemStatus(item.id, 'SYNCING');
    }

    // Send batch payload to backend
    const res = await syncFieldSurveysBatch(pendingItems);

    if (res && res.success && Array.isArray(res.processed)) {
      for (const proc of res.processed) {
        if (proc.status === 'SYNCED') {
          await updateOutboxItemStatus(proc.item_id, 'SYNCED');
        } else if (proc.status === 'CONFLICT') {
          await updateOutboxItemStatus(
            proc.item_id,
            'CONFLICT',
            proc.reason,
            {
              server_record: proc.server_record,
              client_record: proc.client_record
            }
          );
        }
      }
    }

    notifySubscribers({ syncStatus: 'COMPLETED' });
    return { success: true, processed: res.processed || [] };
  } catch (err) {
    console.error('[SyncEngine] Batch sync error:', err);
    notifySubscribers({ syncStatus: 'ERROR', error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Adjudicate a conflict for a specific outbox item
 * @param {string} itemId
 * @param {'OVERRIDE_FIELD' | 'DISCARD_FIELD'} resolution
 * @param {object} finalData
 */
export async function resolveConflictAndCommit(itemId, resolution, finalData) {
  try {
    const res = await resolveFieldConflict({
      item_id: itemId,
      resolution,
      data: finalData
    });

    if (res && res.success) {
      await removeOutboxItem(itemId);
      notifySubscribers({ event: 'CONFLICT_RESOLVED' });
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to resolve conflict' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
