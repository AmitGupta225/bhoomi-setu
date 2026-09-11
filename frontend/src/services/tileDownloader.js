/**
 * BHOOMI SETU - Offline Map Tile Downloader
 * Downloads and caches raster map tiles (OpenStreetMap and Satellite)
 * for a village/project bounding box so maps render completely offline
 * without internet in rural cadastre zones.
 */

const CACHE_NAME = 'bhoomi-setu-v1';

/**
 * Converts Latitude/Longitude to Web Mercator Tile coordinates (x, y, z)
 */
export function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

/**
 * Calculates geographic bounding box for a project village and its parcels
 * Includes a safety padding margin (~1.5 km) around the survey zone
 */
export function calculateVillageBounds(project, parcels = []) {
  // Center point: project center or first parcel or default Palghar
  const cLat = parseFloat(project?.center_lat) || (parcels?.[0]?.lat ? parseFloat(parcels[0].lat) : 19.7280);
  const cLng = parseFloat(project?.center_lng) || (parcels?.[0]?.lng ? parseFloat(parcels[0].lng) : 72.8450);

  let minLat = cLat - 0.012;
  let maxLat = cLat + 0.012;
  let minLng = cLng - 0.012;
  let maxLng = cLng + 0.012;

  // Filter parcels STRICTLY for this project/village
  const projectParcels = (parcels || []).filter(p => 
    !project?.id || p.project_id === project.id
  );

  if (projectParcels.length > 0) {
    let pMinLat = 90, pMaxLat = -90, pMinLng = 180, pMaxLng = -180;
    projectParcels.forEach(p => {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (lat < pMinLat) pMinLat = lat;
        if (lat > pMaxLat) pMaxLat = lat;
        if (lng < pMinLng) pMinLng = lng;
        if (lng > pMaxLng) pMaxLng = lng;
      }
    });

    // Only expand if valid and within a sensible village extent (< 0.06 deg, ~6km)
    if (pMinLat < 90 && (pMaxLat - pMinLat < 0.06) && (pMaxLng - pMinLng < 0.06)) {
      minLat = pMinLat - 0.006;
      maxLat = pMaxLat + 0.006;
      minLng = pMinLng - 0.006;
      maxLng = pMaxLng + 0.006;
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Calculates all unique tile coordinates (x, y, z) for a bounding box
 * across designated zoom levels (e.g. 14, 15, 16)
 */
export function getTilesForBounds(bounds, zoomLevels = [14, 15, 16]) {
  const tiles = [];
  const seen = new Set();

  for (const z of zoomLevels) {
    const nw = latLngToTile(bounds.maxLat, bounds.minLng, z);
    const se = latLngToTile(bounds.minLat, bounds.maxLng, z);

    const minX = Math.min(nw.x, se.x);
    const maxX = Math.max(nw.x, se.x);
    const minY = Math.min(nw.y, se.y);
    const maxY = Math.max(nw.y, se.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${z}/${x}/${y}`;
        if (!seen.has(key)) {
          seen.add(key);
          tiles.push({ x, y, z });
        }
      }
    }
  }

  return tiles;
}

/**
 * Downloads and caches map tiles for a project village
 * @param {Object} bounds - { minLat, maxLat, minLng, maxLng }
 * @param {Object} options - { zoomLevels, onProgress, downloadSatellite }
 */
export async function downloadVillageMapTiles(bounds, options = {}) {
  const {
    zoomLevels = [14, 15, 16],
    downloadSatellite = true,
    onProgress = () => {}
  } = options;

  if (!('caches' in window)) {
    throw new Error('CacheStorage is not supported in this browser environment');
  }

  const cache = await caches.open(CACHE_NAME);
  const tiles = getTilesForBounds(bounds, zoomLevels);

  // Generate list of URLs to download
  const urlsToDownload = [];
  tiles.forEach(tile => {
    // OpenStreetMap
    urlsToDownload.push(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`);
    if (downloadSatellite) {
      // Esri Satellite
      urlsToDownload.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${tile.z}/${tile.y}/${tile.x}`);
    }
  });

  const total = urlsToDownload.length;
  let completed = 0;
  let bytesDownloaded = 0;
  let failed = 0;

  onProgress({
    status: 'STARTING',
    completed: 0,
    total,
    percent: 0,
    bytes: 0,
    message: `Preparing to download ${total} map tiles for offline cadastre...`
  });

  // Concurrency limit to prevent overwhelming network or rate limits
  const BATCH_SIZE = 6;
  for (let i = 0; i < urlsToDownload.length; i += BATCH_SIZE) {
    const batch = urlsToDownload.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (url) => {
        try {
          // Check if already in cache
          const existing = await cache.match(url);
          if (existing) {
            completed++;
            const blob = await existing.clone().blob().catch(() => null);
            if (blob) bytesDownloaded += blob.size;
            return;
          }

          // Fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(url, {
            mode: 'cors',
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response && response.status === 200) {
            const clone = response.clone();
            const blob = await clone.blob();
            bytesDownloaded += blob.size;
            await cache.put(url, response);
            completed++;
          } else {
            failed++;
          }
        } catch (err) {
          // Silently handle tile timeout/cors failure
          failed++;
        }
      })
    );

    const percent = Math.min(100, Math.round((completed / total) * 100));
    onProgress({
      status: 'DOWNLOADING',
      completed,
      total,
      failed,
      percent,
      bytes: bytesDownloaded,
      message: `Downloading offline map tiles: ${completed}/${total} (${percent}%)`
    });

    // Small delay between batches to respect tile servers
    await new Promise(r => setTimeout(r, 60));
  }

  onProgress({
    status: 'COMPLETED',
    completed,
    total,
    failed,
    percent: 100,
    bytes: bytesDownloaded,
    message: `Successfully cached ${completed} map tiles (${(bytesDownloaded / (1024 * 1024)).toFixed(2)} MB) for offline fieldwork!`
  });

  return {
    success: true,
    total,
    cached: completed,
    bytes: bytesDownloaded,
    failed
  };
}

/**
 * Returns number of map tiles currently cached in CacheStorage
 */
export async function getCachedTileStats() {
  if (!('caches' in window)) return { count: 0, bytes: 0 };
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const tileKeys = keys.filter(req => 
      req.url.includes('tile.openstreetmap.org') || 
      req.url.includes('arcgisonline.com')
    );
    return {
      count: tileKeys.length
    };
  } catch (err) {
    console.warn('Failed to inspect cached tiles:', err);
    return { count: 0 };
  }
}
