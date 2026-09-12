import React, { useEffect, useState } from 'react';
import { fetchParcels, fetchProjects, createParcel, submitFieldSurvey, approveSurvey, fetchUlpinData } from '../services/api';
import { 
  cacheVillageProject, 
  getCachedParcels, 
  getCachedProjects, 
  queueOfflineSurvey, 
  getOutboxItems, 
  getOutboxStats,
  removeOutboxItem 
} from '../services/offlineStorage';
import { 
  isDeviceOnline, 
  subscribeSyncStatus, 
  triggerSyncNow, 
  resolveConflictAndCommit 
} from '../services/syncEngine';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  downloadVillageMapTiles, 
  calculateVillageBounds, 
  getCachedTileStats 
} from '../services/tileDownloader';
import { 
  Smartphone, 
  CheckCircle2, 
  Compass, 
  Lock,
  Plus,
  Trash2,
  Layers,
  FileCheck,
  Crosshair,
  Globe,
  Search,
  MapPin,
  X,
  Wifi,
  WifiOff,
  CloudUpload,
  Download,
  AlertTriangle,
  RefreshCw,
  Clock,
  Database,
  Undo2
} from 'lucide-react';

// Fix default leaflet marker icon bug in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Red Marker Icon for Current User Location
const redMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});



// Interactive Map Click Handler Helper (moves pin to tapped map coordinate)
function MapEventsListener({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

// Leaflet Location Handler Helper with robust offline support
function MapLocationTrigger({ locateTrigger, setUserLocation, setIsLocating, setIsUserLocationActive }) {
  const map = useMap();

  useEffect(() => {
    if (locateTrigger === 0) return;

    setIsLocating(true);
    setIsUserLocationActive(true);

    const onLocationFound = (e) => {
      const uLat = parseFloat(e.latlng.lat.toFixed(6));
      const uLng = parseFloat(e.latlng.lng.toFixed(6));
      const acc = Math.round(e.accuracy);
      setUserLocation({ lat: uLat, lng: uLng, accuracy: acc, isFallback: false });
      setIsLocating(false);
      map.flyTo(e.latlng, acc > 5000 ? 12 : 16, { duration: 1.2 });
    };

    const onLocationError = () => {
      setIsLocating(false);
      // Try standard browser geolocation with cached fallback
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = parseFloat(pos.coords.latitude.toFixed(6));
            const uLng = parseFloat(pos.coords.longitude.toFixed(6));
            const acc = Math.round(pos.coords.accuracy || 10);
            setUserLocation({ lat: uLat, lng: uLng, accuracy: acc, isFallback: false });
            map.flyTo([uLat, uLng], acc > 5000 ? 12 : 16, { duration: 1.2 });
          },
          () => {
            // Offline/Network provider failure fallback: Use current map center to position rover pin
            const center = map.getCenter();
            const uLat = parseFloat(center.lat.toFixed(6));
            const uLng = parseFloat(center.lng.toFixed(6));
            setUserLocation({ lat: uLat, lng: uLng, accuracy: 25, isFallback: true });
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
        );
      } else {
        const center = map.getCenter();
        const uLat = parseFloat(center.lat.toFixed(6));
        const uLng = parseFloat(center.lng.toFixed(6));
        setUserLocation({ lat: uLat, lng: uLng, accuracy: 25, isFallback: true });
      }
    };

    map.once('locationfound', onLocationFound);
    map.once('locationerror', onLocationError);

    map.locate({ setView: false, enableHighAccuracy: true, timeout: 5000, maxZoom: 17 });

    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [locateTrigger, map]);

  return null;
}

// Fly to searched location helper
function FlyToSearch({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat && target.lng) {
      // Use setView to force instant change, which is more reliable across large distances
      map.setView([target.lat, target.lng], 16, { animate: true, duration: 1 });
    }
  }, [target, map]);
  return null;
}

// Calculate approximate area in Hectares from polygon vertices (Shoelace formula)
function calculatePolygonAreaHa(vertices) {
  if (vertices.length < 3) return 0;
  let area = 0;
  const numPoints = vertices.length;
  for (let i = 0; i < numPoints; i++) {
    const j = (i + 1) % numPoints;
    const x1 = vertices[i].lng * 111000 * Math.cos((vertices[i].lat * Math.PI) / 180);
    const y1 = vertices[i].lat * 111000;
    const x2 = vertices[j].lng * 111000 * Math.cos((vertices[j].lat * Math.PI) / 180);
    const y2 = vertices[j].lat * 111000;
    area += (x1 * y2) - (x2 * y1);
  }
  const sqMeters = Math.abs(area / 2);
  return (sqMeters / 10000).toFixed(2);
}

// Safely extract [lat, lng] array from parcel coordinates or GeoJSON for Leaflet rendering
function extractPolygonCoordinates(p) {
  if (!p) return null;
  if (Array.isArray(p.coordinates) && p.coordinates.length >= 3) {
    return p.coordinates;
  }
  if (p.geojson) {
    try {
      const geo = typeof p.geojson === 'string' ? JSON.parse(p.geojson) : p.geojson;
      const geom = geo.geometry || geo;
      if (geom && geom.coordinates && Array.isArray(geom.coordinates[0])) {
        // GeoJSON standard is [lng, lat], Leaflet Polygon expects [lat, lng]
        return geom.coordinates[0].map(pt => [pt[1], pt[0]]);
      }
    } catch (e) {
      console.warn('Failed to parse parcel geojson coordinates:', e);
    }
  }
  return null;
}

export const FieldSurveyMobile = () => {
  const { activeRole, selectedProjectId, t } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Offline & Synchronization State
  const [isOnline, setIsOnline] = useState(() => isDeviceOnline());
  const [outboxStats, setOutboxStats] = useState({ total: 0, pending: 0, conflicts: 0, synced: 0 });
  const [outboxItems, setOutboxItems] = useState([]);
  const [showOutboxModal, setShowOutboxModal] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedConflictItem, setSelectedConflictItem] = useState(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  // Project Area Map Tile State
  const [showTileDownloadModal, setShowTileDownloadModal] = useState(false);
  const [tileDownloadProgress, setTileDownloadProgress] = useState(null);
  const [cachedTileCount, setCachedTileCount] = useState(0);

  // Tabs
  

  // Inspection State
  const [inspParcelId, setInspParcelId] = useState('');
  const [inspLandCondition, setInspLandCondition] = useState('Vacant Land');
  const [inspLandType, setInspLandType] = useState('Unirrigated');
  const [inspFamilies, setInspFamilies] = useState('');
  const [inspFamilyCategory, setInspFamilyCategory] = useState("General");
  const [inspFamilyMembers, setInspFamilyMembers] = useState('');
  const [inspStructures, setInspStructures] = useState('');
  const [inspTrees, setInspTrees] = useState('');
  const [inspTribal, setInspTribal] = useState(false);
  const [inspConsent, setInspConsent] = useState(false);
  const [inspNotes, setInspNotes] = useState('');
  const [inspLoading, setInspLoading] = useState(false);

  // Multi-Vertex Parcel Creation State
  const [newProjId, setNewProjId] = useState(selectedProjectId || '');
  const [newSurveyNo, setNewSurveyNo] = useState('204/3A');
  const [newKhataNo, setNewKhataNo] = useState('KH-5510');
  const [newVillage, setNewVillage] = useState(() => t('Manor Farm Zone'));
  const [newLandType, setNewLandType] = useState(() => t('Irrigated Agricultural Farm'));
  const [newOwnerName, setNewOwnerName] = useState(() => t('Anil Kumar Patil'));
  const [newOwnerContact, setNewOwnerContact] = useState('+91 98221 44500');
  const [newAddress, setNewAddress] = useState(() => t('Plot No. 47, GT Road'));
  const [customLat, setCustomLat] = useState('19.7285');
  const [customLng, setCustomLng] = useState('72.8455');
  const [manualAreaHa, setManualAreaHa] = useState(null);
  
  // ULPIN State
  const [ulpinInput, setUlpinInput] = useState('');
  const [isVerifyingUlpin, setIsVerifyingUlpin] = useState(false);

  const [mapStyle, setMapStyle] = useState('osm');

  const tileLayerConfig = {
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap India</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri World Imagery'
    }
  };
  
  // Default vertices: clean start with 0 points (points added only when surveyor records them)
  const [vertices, setVertices] = useState([]);

  const [userLocation, setUserLocation] = useState(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [isUserLocationActive, setIsUserLocationActive] = useState(false);

  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = React.useRef(null);

  const canSurvey = activeRole.id === 'surveyor' || activeRole.id === 'collector';

  const handleLocationInput = (val) => {
    setLocationQuery(val);
    setShowSuggestions(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim() || val.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // ArcGIS World Geocoding - free, no key, full address-level India data
        const arcRes = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=${encodeURIComponent(val)}&maxSuggestions=8&f=json`
        );
        const arcData = await arcRes.json();
        const arcResults = (arcData.suggestions || []).map(s => ({
          display_name: s.text,
          magicKey: s.magicKey  // needed to resolve lat/lng
        }));

        if (arcResults.length > 0) {
          setLocationSuggestions(arcResults);
        } else {
          // Fallback: Photon
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=6&lang=en`
          );
          const photonData = await photonRes.json();
          const photonResults = (photonData.features || []).map(f => ({
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            display_name: [
              f.properties.name, f.properties.street,
              f.properties.city || f.properties.town || f.properties.village,
              f.properties.state, f.properties.country
            ].filter(Boolean).join(', ')
          }));
          setLocationSuggestions(photonResults || []);
        }
      } catch {
        setLocationSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

  };

  const handleLocationSelect = async (place) => {
    setShowSuggestions(false);
    setLocationSuggestions([]);
    setLocationQuery(place.display_name);

    try {
      let lat, lng;
      if (place.magicKey) {
        // ArcGIS result - resolve lat/lng via findAddressCandidates
        const res = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(place.display_name)}&magicKey=${place.magicKey}&maxLocations=1&outFields=Match_addr&f=json`
        );
        const data = await res.json();
        const candidate = data.candidates?.[0];
        if (!candidate) return;
        lat = candidate.location.y;
        lng = candidate.location.x;
      } else {
        lat = parseFloat(place.lat);
        lng = parseFloat(place.lon);
      }

      // Drop red pin and fly map to location
      setUserLocation({ lat, lng, accuracy: null });
      setIsUserLocationActive(true);
      setSearchTarget({ lat, lng });
      setCustomLat(lat.toFixed(6));
      setCustomLng(lng.toFixed(6));
    } catch {
      alert('Could not resolve location coordinates. Please try another result.');
    }
  };

  // 1. Subscribe to network status and outbox synchronization events
  const refreshOutbox = async () => {
    try {
      const items = await getOutboxItems();
      setOutboxItems(items || []);
      const stats = await getOutboxStats();
      if (stats) setOutboxStats(stats);
    } catch (e) {
      console.warn('Failed to read outbox:', e);
    }
  };

  useEffect(() => {
    refreshOutbox();

    const unsubscribe = subscribeSyncStatus((status) => {
      setIsOnline(status.isOnline);
      if (status.stats) setOutboxStats(status.stats);
      if (status.syncStatus === 'SYNCING') setIsSyncing(true);
      else if (status.syncStatus === 'COMPLETED' || status.syncStatus === 'ERROR' || status.syncStatus === 'IDLE') {
        setIsSyncing(false);
      }
      refreshOutbox();
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Parcels with offline fallback from IndexedDB
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      let pList = [];
      let projList = [];

      try {
        pList = await fetchParcels(selectedProjectId ? { project_id: selectedProjectId } : {});
        projList = await fetchProjects();
      } catch (err) {
        console.warn('[FieldSurvey] Network error, falling back to local IndexedDB:', err);
      }

      // Offline Fallbacks from IndexedDB
      if (!pList || pList.length === 0) {
        pList = await getCachedParcels(selectedProjectId);
      }
      if (!projList || projList.length === 0) {
        projList = await getCachedProjects();
      }

      setParcels(pList || []);
      setProjects(projList || []);
      
      let activeProjId = selectedProjectId;
      if (projList && projList.length > 0 && !selectedProjectId) {
        activeProjId = projList[0].id;
      }
      if (activeProjId) setNewProjId(activeProjId);
      
      // Fly to active project's location
      const activeProj = projList ? projList.find(p => p.id === activeProjId) : null;
      if (activeProj && activeProj.center_lat && activeProj.center_lng) {
        const pLat = parseFloat(activeProj.center_lat);
        const pLng = parseFloat(activeProj.center_lng);
        setSearchTarget({ lat: pLat, lng: pLng });
        setIsUserLocationActive(false);
        setCustomLat(pLat.toFixed(6));
        setCustomLng(pLng.toFixed(6));
      }
      
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  // Read cached tile count on mount
  useEffect(() => {
    async function checkTileStats() {
      try {
        const stats = await getCachedTileStats();
        if (stats && stats.count) setCachedTileCount(stats.count);
      } catch (e) {
        console.warn('Failed to read cached tile stats:', e);
      }
    }
    checkTileStats();
  }, []);

  const handleDownloadVillageOffline = async () => {
    try {
      setIsCaching(true);
      setShowTileDownloadModal(true);
      const activeProj = projects.find(p => p.id === newProjId) || projects[0];
      if (!activeProj) {
        alert(t('No project selected to cache.'));
        setIsCaching(false);
        return;
      }

      // Step 1: Cache village project and parcels into IndexedDB
      setTileDownloadProgress({
        phase: 'PARCELS',
        percent: 10,
        completed: 0,
        total: 100,
        bytes: 0,
        message: t(`Caching ${parcels.length} project cadastral parcel boundaries...`)
      });
      const res = await cacheVillageProject(activeProj, parcels);

      // Step 2: Calculate geographic bounding box (entire 3 km project area radius)
      const bounds = calculateVillageBounds(activeProj, parcels, 3.0);

      // Step 3: Download map tiles (OSM & Satellite) for zooms 14, 15, 16
      setTileDownloadProgress({
        phase: 'TILES',
        percent: 25,
        completed: 0,
        total: 80,
        bytes: 0,
        message: t('Downloading project area map tiles (Street & Satellite)...')
      });

      const tileResult = await downloadVillageMapTiles(bounds, {
        zoomLevels: [14, 15, 16],
        downloadSatellite: true,
        onProgress: (p) => {
          setTileDownloadProgress({
            phase: 'TILES',
            percent: Math.min(98, 25 + Math.round(p.percent * 0.73)),
            completed: p.completed,
            total: p.total,
            bytes: p.bytes,
            message: p.message
          });
        }
      });

      const stats = await getCachedTileStats();
      setCachedTileCount(stats.count);

      setTileDownloadProgress({
        phase: 'COMPLETE',
        percent: 100,
        completed: tileResult.cached,
        total: tileResult.total,
        bytes: tileResult.bytes,
        message: `✓ ${t('Project area downloaded! You can now use the map and survey completely offline.')}`
      });

      setCacheMessage(`✓ ${t('Project Area Map Downloaded for Offline Surveying')} (${tileResult.cached} ${t('tiles')})`);
      setTimeout(() => setCacheMessage(''), 8000);
    } catch (err) {
      console.error('Failed to download project map:', err);
      setTileDownloadProgress({
        phase: 'ERROR',
        percent: 100,
        message: t('Download error: ') + err.message
      });
    } finally {
      setIsCaching(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerSyncNow();
      if (res && res.success) {
        await refreshOutbox();
        // Reload parcels
        const pList = await fetchParcels(selectedProjectId ? { project_id: selectedProjectId } : {});
        if (pList && pList.length > 0) setParcels(pList);
        setSubmitSuccess(t('Outbox synchronization complete!'));
        setTimeout(() => setSubmitSuccess(''), 5000);
      } else {
        alert(res?.error || t('Sync failed'));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (resolution, targetItem = null) => {
    const item = targetItem || selectedConflictItem;
    if (!item) return;
    setIsResolvingConflict(true);
    try {
      const res = await resolveConflictAndCommit(
        item.id,
        resolution,
        item.data
      );
      if (res && res.success) {
        setSelectedConflictItem(null);
        await refreshOutbox();
        setSubmitSuccess(t('Conflict resolved successfully!'));
        setTimeout(() => setSubmitSuccess(''), 5000);
      } else {
        alert(res?.error || t('Failed to resolve conflict'));
      }
    } finally {
      setIsResolvingConflict(false);
    }
  };

  const handleMapClick = (latlng) => {
    const newLat = parseFloat(latlng.lat.toFixed(6));
    const newLng = parseFloat(latlng.lng.toFixed(6));
    setUserLocation({ lat: newLat, lng: newLng, accuracy: null, isFallback: false });
    setCustomLat(newLat.toFixed(6));
    setCustomLng(newLng.toFixed(6));
  };

  const handleVertexDrag = (index, e) => {
    const pos = e.target.getLatLng();
    const newLat = parseFloat(pos.lat.toFixed(6));
    const newLng = parseFloat(pos.lng.toFixed(6));
    setVertices(prev => {
      const updated = [...prev];
      updated[index] = { lat: newLat, lng: newLng };
      return updated;
    });
    setCustomLat(newLat.toFixed(6));
    setCustomLng(newLng.toFixed(6));
  };

  const handleUndoVertex = () => {
    setVertices(prev => prev.slice(0, -1));
  };

  const handleClearAllVertices = () => {
    if (vertices.length === 0) return;
    if (window.confirm(t('Clear all boundary vertices and start a fresh plot?'))) {
      setVertices([]);
    }
  };

  const handleAddCurrentGpsAsVertex = () => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      const vLat = parseFloat(userLocation.lat.toFixed(6));
      const vLng = parseFloat(userLocation.lng.toFixed(6));
      setVertices(prev => [...prev, { lat: vLat, lng: vLng }]);
      setSubmitSuccess(`Added Vertex V${vertices.length + 1} (${vLat}, ${vLng})`);
      setTimeout(() => setSubmitSuccess(''), 3000);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const vLat = parseFloat(pos.coords.latitude.toFixed(6));
          const vLng = parseFloat(pos.coords.longitude.toFixed(6));
          setVertices(prev => [...prev, { lat: vLat, lng: vLng }]);
          setUserLocation({ lat: vLat, lng: vLng, accuracy: Math.round(pos.coords.accuracy || 10), isFallback: false });
          setSubmitSuccess(`Added Vertex V${vertices.length + 1} (${vLat}, ${vLng})`);
          setTimeout(() => setSubmitSuccess(''), 3000);
        },
        () => {
          const cLat = parseFloat(customLat) || 19.7280;
          const cLng = parseFloat(customLng) || 72.8450;
          setVertices(prev => [...prev, { lat: cLat, lng: cLng }]);
          setUserLocation({ lat: cLat, lng: cLng, accuracy: 15, isFallback: true });
          setSubmitSuccess(`Added Vertex V${vertices.length + 1} (${cLat}, ${cLng})`);
          setTimeout(() => setSubmitSuccess(''), 3000);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      const cLat = parseFloat(customLat) || 19.7280;
      const cLng = parseFloat(customLng) || 72.8450;
      setVertices(prev => [...prev, { lat: cLat, lng: cLng }]);
      setSubmitSuccess(`Added Vertex V${vertices.length + 1} (${cLat}, ${cLng})`);
      setTimeout(() => setSubmitSuccess(''), 3000);
    }
  };

  const handleAddCustomVertex = () => {
    const vLat = parseFloat(customLat);
    const vLng = parseFloat(customLng);
    if (isNaN(vLat) || isNaN(vLng)) {
      alert(t('Please enter valid numerical Latitude and Longitude values.'));
      return;
    }
    setVertices(prev => [...prev, { lat: vLat, lng: vLng }]);
    setSubmitSuccess(`Added Vertex V${vertices.length + 1} (${vLat}, ${vLng})`);
    setTimeout(() => setSubmitSuccess(''), 3000);
  };

  const handleRemoveVertex = (index) => {
    setVertices(prev => prev.filter((_, i) => i !== index));
  };

  const handleVerifyUlpin = async () => {
    if (!ulpinInput || ulpinInput.length < 10) {
      alert("Please enter a valid 14-digit ULPIN code");
      return;
    }
    setIsVerifyingUlpin(true);
    try {
      const data = await fetchUlpinData(ulpinInput);
      if (data.success && data.data) {
        const record = data.data;
        setNewOwnerName(record.owner_details.primary_owner);
        setNewSurveyNo(record.land_details.survey_number);
        setNewKhataNo(record.land_details.khata_number);
        // Map land type dynamically or use closest match
        setNewLandType('Irrigated Agricultural Farm'); // Simplified for demo
        alert(`Bhu-Naksha Verified!\nOwner: ${record.owner_details.primary_owner}\nLitigated: ${record.legal_status.is_litigated ? 'YES' : 'NO'}`);
      } else {
        alert(data.error || 'Failed to verify ULPIN');
      }
    } catch (err) {
      alert("Error contacting Bhu-Naksha API simulator: " + err.message);
    } finally {
      setIsVerifyingUlpin(false);
    }
  };

  
  
  const handleSelectExistingParcel = (parcelId) => {
    setInspParcelId(parcelId);
    if (!parcelId) {
      // Reset to create new
      setNewSurveyNo('');
      setNewKhataNo('');
      setNewVillage('');
      setNewOwnerName('');
      setNewOwnerContact('');
      setNewAddress('');
      setVertices([]);
      return;
    }
    const p = parcels.find(x => x.id === parcelId);
    if (p) {
      setNewSurveyNo(p.survey_number || '');
      setNewKhataNo(p.khata_number || '');
      setNewVillage(p.village || '');
      setNewOwnerName(p.owner_name || '');
      setNewOwnerContact(p.owner_contact || '');
      setNewAddress(p.address || '');
      setNewLandType(p.land_type || 'Irrigated Agricultural Farm');
      
      try {
        if (p.geojson) {
          const geoData = typeof p.geojson === 'string' ? JSON.parse(p.geojson) : p.geojson;
          const pGeom = geoData?.geometry || geoData;
          if (pGeom?.coordinates && pGeom.coordinates[0]) {
             let parsed = pGeom.coordinates[0].map(pt => ({ lat: pt[1], lng: pt[0] }));
             // Strip trailing duplicate closing point from GeoJSON LinearRing if present
             if (parsed.length > 1 && 
                 Math.abs(parsed[0].lat - parsed[parsed.length - 1].lat) < 0.000001 && 
                 Math.abs(parsed[0].lng - parsed[parsed.length - 1].lng) < 0.000001) {
               parsed = parsed.slice(0, -1);
             }
             if (parsed.length > 0) {
                 setVertices(parsed);
                 setSearchTarget({ lat: parsed[0].lat, lng: parsed[0].lng });
                 setCustomLat(parsed[0].lat.toFixed(6));
                 setCustomLng(parsed[0].lng.toFixed(6));
                 setIsUserLocationActive(false);
                 return;
             }
          }
        }
        alert('This parcel does not have mapped boundary coordinates yet. You can draw them now.');
      } catch(e) {
        alert('This parcel does not have mapped boundary coordinates yet. You can draw them now.');
      }
    }
  };

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!inspParcelId) return alert(t('Select a parcel'));
    setInspLoading(true);
    const p = parcels.find(x => x.id === inspParcelId) || {};
    const surveyPayload = {
      project_id: p.project_id || newProjId,
      parcel_id: p.id || inspParcelId,
      ulpin: p.ulpin || null,
      surveyor_name: activeRole?.label || 'Field Surveyor',
      surveyor_id: 'SURV-881',
      gps_lat: userLocation ? userLocation.lat : p.lat,
      gps_lng: userLocation ? userLocation.lng : p.lng,
      land_condition: inspLandCondition,
      land_type: inspLandType,
      affected_families_count: parseInt(inspFamilies) || 0,
      structures_count: parseInt(inspStructures) || 0,
      trees_count: parseInt(inspTrees) || 0,
      family_category: inspFamilyCategory,
      family_members_count: parseInt(inspFamilyMembers) || 0,
      is_tribal_land: inspTribal,
      consent_obtained: inspConsent,
      verification_notes: inspNotes
    };

    if (!isOnline) {
      await queueOfflineSurvey(surveyPayload, 'INSPECTION');
      setSubmitSuccess(t('Offline Mode: Inspection saved to local Outbox! Will auto-sync when online.'));
      setTimeout(() => setSubmitSuccess(''), 6000);
      setInspParcelId('');
      setInspFamilies('');
      setInspFamilyMembers('');
      setInspStructures('');
      setInspTrees('');
      setInspNotes('');
      await refreshOutbox();
      setInspLoading(false);
      return;
    }

    try {
      await submitFieldSurvey(surveyPayload);
      setSubmitSuccess(t('Field Inspection Report Submitted!'));
      setTimeout(() => setSubmitSuccess(''), 5000);
      setInspParcelId('');
      setInspFamilies('');
      setInspFamilyMembers('');
      setInspStructures('');
      setInspTrees('');
      setInspNotes('');
    } catch (err) {
      console.warn('Online submission failed, falling back to local outbox:', err);
      await queueOfflineSurvey(surveyPayload, 'INSPECTION');
      setSubmitSuccess(t('Network unreachable. Inspection safely queued to offline outbox!'));
      setTimeout(() => setSubmitSuccess(''), 6000);
      setInspParcelId('');
      setInspFamilies('');
      setInspFamilyMembers('');
      setInspStructures('');
      setInspTrees('');
      setInspNotes('');
      await refreshOutbox();
    }
    setInspLoading(false);
  };

  const handleCreateMultiVertexParcel = async (e) => {
    e.preventDefault();
    if (!canSurvey) {
      alert('Role Restriction: Only Field Surveyors or District SLAOs can map new land parcels.');
      return;
    }

    const activeProject = projects.find(p => p.id === newProjId);
    if (activeProject && activeProject.current_stage_id < 4) {
      alert('Pipeline Restriction: Field Surveys legally restricted until Section 11 Preliminary Notification (Stage 4) is published.');
      return;
    }

    if (vertices.length < 3) {
      alert('A valid land boundary polygon must have at least 3 corner vertices.');
      return;
    }

    const calculatedAreaHaRaw = parseFloat(calculatePolygonAreaHa(vertices));
    const finalAreaHa = manualAreaHa !== null && manualAreaHa !== '' ? parseFloat(manualAreaHa) : calculatedAreaHaRaw;

    const provisionalUlpin = `IN-MH-OFF-${Date.now().toString().slice(-6)}`;
    const parcelPayload = {
      project_id: newProjId,
      ulpin: provisionalUlpin,
      survey_number: newSurveyNo,
      khata_number: newKhataNo,
      village: newVillage,
      land_type: newLandType,
      owner_name: newOwnerName,
      owner_contact: newOwnerContact,
      address: newAddress,
      area_ha: finalAreaHa > 0 ? finalAreaHa : 1.25,
      coordinates: vertices.map(v => [v.lat, v.lng]),
      vertices: vertices,
      lat: vertices[0].lat,
      lng: vertices[0].lng,
      surveyor_name: activeRole?.label || 'Field Surveyor',
      affected_families_count: parseInt(inspFamilies) || 0,
      structures_count: parseInt(inspStructures) || 0,
      trees_count: parseInt(inspTrees) || 0,
      is_tribal_land: inspTribal,
      consent_obtained: inspConsent,
      verification_notes: inspNotes
    };

    if (!isOnline) {
      await queueOfflineSurvey(parcelPayload, 'NEW_PARCEL');
      const localParcel = {
        id: `offline-${Date.now()}`,
        ...parcelPayload,
        status: 'Verified'
      };
      setParcels(prev => [localParcel, ...prev]);
      setVertices([]);
      setManualAreaHa(null);
      setInspFamilies('');
      setInspFamilyMembers('');
      setInspStructures('');
      setInspTrees('');
      setInspNotes('');
      setInspParcelId('');
      setSubmitSuccess(t('✓ Parcel & Inspection saved locally! Will sync automatically when back online.'));
      setTimeout(() => setSubmitSuccess(''), 7000);
      await refreshOutbox();
      return;
    }

    try {
      const res = await createParcel(parcelPayload);
      if (res.success) {
        try {
          await submitFieldSurvey(res.id, {
            land_type: newLandType,
            affected_families: parseInt(inspFamilies) || 0,
            family_members: parseInt(inspFamilyMembers) || 0,
            family_category: inspFamilyCategory,
            structures_count: parseInt(inspStructures) || 0,
            trees_count: parseInt(inspTrees) || 0,
            tribal_land: inspTribal ? 1 : 0,
            consent_obtained: inspConsent ? 1 : 0,
            inspection_notes: inspNotes
          });
        } catch (surveyErr) {
          console.error("Warning: Parcel created, but LARR inspection submission failed", surveyErr);
        }

        setSubmitSuccess(`New Parcel (ULPIN: ${res.ulpin}) & LARR Report created successfully!`);
        const pList = await fetchParcels();
        setParcels(pList);
        setVertices([]);
        setManualAreaHa(null);
        setInspFamilies('');
        setInspFamilyMembers('');
        setInspStructures('');
        setInspTrees('');
        setInspNotes('');
        setInspParcelId('');
        setTimeout(() => setSubmitSuccess(''), 5000);
      }
    } catch (err) {
      console.warn('Online create failed, falling back to local outbox:', err);
      await queueOfflineSurvey(parcelPayload, 'NEW_PARCEL');
      const localParcel = {
        id: `offline-${Date.now()}`,
        ...parcelPayload,
        status: 'Verified'
      };
      setParcels(prev => [localParcel, ...prev]);
      setVertices([]);
      setManualAreaHa(null);
      setInspFamilies('');
      setInspFamilyMembers('');
      setInspStructures('');
      setInspTrees('');
      setInspNotes('');
      setInspParcelId('');
      setSubmitSuccess(t('✓ Saved to offline storage! Will sync automatically when connection returns.'));
      setTimeout(() => setSubmitSuccess(''), 7000);
      await refreshOutbox();
    }
  };

  const calculatedHa = calculatePolygonAreaHa(vertices);
  const displayAreaHa = manualAreaHa !== null ? manualAreaHa : (vertices.length >= 3 ? calculatedHa : '');
  const displayAreaParsed = displayAreaHa === '' ? 0 : parseFloat(displayAreaHa);
  const calculatedSqM = (displayAreaParsed * 10000).toLocaleString();

  useEffect(() => {
    setManualAreaHa(null);
  }, [vertices]);

  return (
    <div className="px-2 sm:px-4 py-3 space-y-4 w-full">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Smartphone className="w-4 h-4" />
            <span>{t('Mobile-Responsive Field Parcel Boundary Mapper')}</span>
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-white mt-1">
            {t('Multi-Vertex Land Boundary Creator')}
          </h1>
          <p className="text-xs text-slate-400">{t('Plot non-square parcel boundaries, capture live vertex GPS points, and render closed GIS polygons')}</p>
        </div>
        
        {activeRole?.id === 'surveyor' && canSurvey && (
          <button 
            onClick={async () => {
              if (window.confirm(t('Are you sure you want to mark all field surveys as completed? This will forward the project to Stage 6.'))) {
                try {
                  await approveSurvey(selectedProjectId);
                  alert(t('Stage 5 Cadastral Survey Marked as Completed!'));
                  // optional reload
                  window.location.reload();
                } catch (e) {
                  alert(e.message);
                }
              }
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shrink-0 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {t('Complete Stage 5 (Cadastral Survey)')}
          </button>
        )}
      </div>

      {/* Connectivity & Offline Fieldwork Control Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center flex-wrap gap-2.5">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi size={14} />
              <span>{t('Online • Cloud Connected')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <WifiOff size={14} />
              <span>{t('Offline Mode • Satellite GPS Active (Zero Cellular)')}</span>
            </div>
          )}

          {/* Download Project Area Map Button */}
          <button
            type="button"
            disabled={isCaching}
            onClick={() => setShowTileDownloadModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-900/70 to-slate-800 hover:from-teal-800/90 hover:to-slate-700 text-teal-200 border border-teal-500/40 text-xs font-bold flex items-center gap-2 transition shadow-sm"
            title={t('Download the entire project area map and parcels for offline fieldwork')}
          >
            <Download size={14} className={isCaching ? 'animate-bounce text-emerald-400' : 'text-teal-400'} />
            <span>{isCaching ? t('Downloading Map...') : t('📥 Download Project Area Map')}</span>
          </button>
          {cachedTileCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-slate-800/90 text-cyan-300 text-[11px] font-mono border border-slate-700 flex items-center gap-1.5 shadow-sm">
              <Globe size={12} className="text-cyan-400" />
              <span>{cachedTileCount} {t('Offline Tiles Cached')}</span>
            </span>
          )}
          {cacheMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in">{cacheMessage}</span>
          )}
        </div>

        {/* Outbox & Conflict Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOutboxModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition shadow-sm ${
              outboxStats.conflicts > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 animate-pulse'
                : outboxStats.pending > 0
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <CloudUpload size={14} className={isSyncing ? 'animate-spin text-cyan-400' : ''} />
            <span>
              {outboxStats.conflicts > 0
                ? `${outboxStats.conflicts} ${t('Sync Conflict(s)')}`
                : `${outboxStats.pending} ${t('Pending Outbox')}`}
            </span>
            {outboxStats.pending > 0 && isOnline && (
              <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500 text-slate-950 rounded font-black">
                {t('Ready')}
              </span>
            )}
          </button>

          {isOnline && outboxItems.some(i => i.status !== 'SYNCED') && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncNow}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition shadow"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? t('Syncing...') : t('Sync Now')}</span>
            </button>
          )}
        </div>
      </div>

      {!canSurvey && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="block font-bold">{t('ReadOnly Access Mode')} ({t(activeRole.label)})</strong>
            <span>{t('Submitting ground survey reports requires Field Surveyor persona. Switch active persona from the header dropdown to upload reports.')}</span>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{t(submitSuccess)}</span>
        </div>
      )}

      {/* DEDICATED MULTI-VERTEX BOUNDARY PARCEL CREATOR */}
      
      {/* Interactive Live Map Displaying Multi-Vertex Polygon */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-3 shadow-2xl flex flex-col relative w-full overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-white font-heading">{t('Map')}</h2>
              <span className="text-xs text-slate-400 font-mono">{t('Vertices Connected:')} {vertices.length}</span>
            </div>

            {/* Location Search Bar */}
            <div className="relative mb-3">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => handleLocationInput(e.target.value)}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={t('Search location to navigate map (e.g. Palghar, Maharashtra)...')}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
                {isSearching && (
                  <span className="absolute right-3 text-[10px] text-cyan-400 animate-pulse">{t('Searching...')}</span>
                )}
                {locationQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => { setLocationQuery(''); setLocationSuggestions([]); setShowSuggestions(false); }}
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[9999] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl mt-1 overflow-hidden">
                  {locationSuggestions.map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>handleLocationSelect(place)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-800 transition flex items-start gap-2.5 border-b border-slate-800 last:border-0"
                    ><MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-slate-200 leading-snug">{place.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-[60vh] min-h-[400px] w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0 bg-slate-950">
              {/* PROMINENT HIGH-CONTRAST MAP VIEW SWITCHER (STANDARD MAP vs SATELLITE VIEW) */}
              <div className="absolute top-4 right-4 z-[500] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMapStyle('osm')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    mapStyle === 'osm' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('Standard Map')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapStyle('satellite')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    mapStyle === 'satellite' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('Satellite')}</span>
                </button>
              </div>

              {/* CIRCULAR GOOGLE MAPS-STYLE MY LOCATION BUTTON (BOTTOM-LEFT CORNER) */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setLocateTrigger(prev => prev + 1); }}
                disabled={isLocating}
                className="absolute bottom-6 left-6 z-[500] w-12 h-12 rounded-full bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-700/90 shadow-2xl backdrop-blur-md flex items-center justify-center text-rose-400 hover:text-rose-300 transition-all transform hover:scale-110 active:scale-95 group"
                title="Fly to My Current GPS Location"
              >
                <Crosshair className={`w-6 h-6 ${isLocating ? 'animate-spin text-amber-400' : 'group-hover:rotate-45 transition-transform duration-300'}`} />
              </button>

              <MapContainer
                center={[vertices[0]?.lat || searchTarget?.lat || 19.7280, vertices[0]?.lng || searchTarget?.lng || 72.8450]}
                zoom={16}
                className="w-full h-full"
                style={{ backgroundColor: '#0a1628' }}
              >
                <MapEventsListener onMapClick={handleMapClick} />

                <FlyToSearch target={searchTarget} />
                
                <MapLocationTrigger 
                  locateTrigger={locateTrigger} 
                  setUserLocation={setUserLocation} 
                  setIsLocating={setIsLocating} 
                  setIsUserLocationActive={setIsUserLocationActive} 
                />

                <TileLayer
                  attribution={tileLayerConfig[mapStyle].attribution}
                  url={tileLayerConfig[mapStyle].url}
                />

                {/* Existing Village Cadastral Parcels Outlines */}
                {parcels.map((p) => {
                  const positions = extractPolygonCoordinates(p);
                  if (!positions || positions.length < 3) return null;
                  const isTarget = inspParcelId && p.id === inspParcelId;
                  return (
                    <Polygon
                      key={`village-parcel-${p.id || p.ulpin}`}
                      positions={positions}
                      eventHandlers={{
                        click: () => handleSelectExistingParcel(p.id)
                      }}
                      pathOptions={{
                        color: isTarget ? '#f59e0b' : '#38bdf8',
                        fillColor: isTarget ? '#f59e0b' : '#0284c7',
                        fillOpacity: isTarget ? 0.45 : 0.15,
                        weight: isTarget ? 2.5 : 1.5,
                        dashArray: isTarget ? '4,4' : undefined
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 font-sans">
                          <strong className="block text-cyan-700 font-bold">{p.ulpin}</strong>
                          <div className="text-slate-700 font-medium">Plot #{p.survey_number} • Khata: {p.khata_number}</div>
                          <div className="text-slate-600">Owner: {p.owner_name}</div>
                          <div className="text-slate-600">Area: {p.area_ha} Ha</div>
                          <button
                            type="button"
                            onClick={() => handleSelectExistingParcel(p.id)}
                            className="mt-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold block w-full text-center transition"
                          >
                            Inspect This Parcel
                          </button>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                })}

                {/* Draw draggable markers for each vertex */}
                {vertices.map((v, idx) => (
                  <Marker 
                    key={idx} 
                    position={[v.lat, v.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => handleVertexDrag(idx, e)
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-mono">
                        <strong className="text-cyan-700 block font-sans">{t('Vertex')} V{idx + 1}</strong>
                        {t('Lat:')} {v.lat}<br />
                        {t('Lng:')} {v.lng}<br />
                        <span className="text-[10px] text-slate-500 font-sans italic">💡 Drag marker to adjust boundary corner</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Render Closed Multi-Vertex Polygon */}
                {vertices.length >= 3 && (
                  <Polygon
                    positions={vertices.map(v => [v.lat, v.lng])}
                    pathOptions={{
                      color: '#10b981',
                      fillColor: '#10b981',
                      fillOpacity: 0.35,
                      weight: 3
                    }}
                  />
                )}

                {/* ACCURACY CIRCLE AROUND USER LOCATION */}
                {userLocation && userLocation.accuracy && (
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={userLocation.accuracy}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.12,
                      weight: 1.5
                    }}
                  />
                )}

                {/* RED MARKER PIN FOR USER'S CURRENT GPS LOCATION */}
                {userLocation && (
                  <Marker 
                    position={[userLocation.lat, userLocation.lng]} 
                    icon={redMarkerIcon}
                    draggable={true}
                    zIndexOffset={1000}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const pos = marker.getLatLng();
                        const newLat = parseFloat(pos.lat.toFixed(6));
                        const newLng = parseFloat(pos.lng.toFixed(6));
                        setUserLocation({
                          lat: newLat,
                          lng: newLng,
                          accuracy: null,
                          isFallback: false
                        });
                        setCustomLat(newLat.toFixed(6));
                        setCustomLng(newLng.toFixed(6));
                      }
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 font-mono">
                        <strong className="block text-rose-600 font-sans font-bold">
                          📍 {userLocation.accuracy ? (userLocation.accuracy > 2000 ? t('Regional IP Gateway') : t('GPS Location')) : t('Selected Custom Point')}
                        </strong>
                        {userLocation.accuracy && (
                          <div className="text-[10px] text-amber-600 font-sans font-semibold">
                            {t('Accuracy:')} ±{userLocation.accuracy > 1000 ? `${(userLocation.accuracy / 1000).toFixed(1)} ${t('km')}` : `${userLocation.accuracy} ${t('m')}`}
                          </div>
                        )}
                        <div>{t('Lat:')} {userLocation.lat}</div>
                        <div>{t('Lng:')} {userLocation.lng}</div>
                        <div className="text-[10px] text-slate-500 font-sans italic pt-1 border-t border-slate-200">💡 {t('Drag pin anywhere on map to micro-adjust')}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic text-center pt-2 mb-4">💡 {t('Tap on the map or drag corner markers to shape your boundary polygon in real-time.')}</p>

        {/* INJECTED VERTEX CONTROLS */}
        {/* VERTEX CONTROL SECTION */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>{t('Boundary Vertices')} ({vertices.length} {t('Points')})</span>
                </span>

                <div className="flex items-center gap-2">
                  {vertices.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUndoVertex}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
                      title={t('Undo last vertex')}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>{t('Undo')}</span>
                    </button>
                  )}

                  {vertices.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllVertices}
                      className="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
                      title={t('Clear all vertices')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('Clear')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddCurrentGpsAsVertex}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                    title={t('Record current GPS location to boundary')}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('Record GPS Point')}</span>
                  </button>
                </div>
              </div>

              {/* Custom Point Input */}
              <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-slate-800">
                <div className="col-span-6 font-mono">
                  <span className="text-slate-500 text-[10px] block">{t('Selected Pin Lat:')}</span>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 text-xs focus:outline-none"
                  />
                </div>
                <div className="col-span-6 font-mono">
                  <span className="text-slate-500 text-[10px] block">{t('Selected Pin Lng:')}</span>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 text-xs focus:outline-none"
                  />
                </div>
                <div className="col-span-12 pt-1">
                  <button
                    type="button"
                    onClick={handleAddCustomVertex}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40"
                    title={t('Add selected pin location to boundary')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Add Selected Pin to Boundary')}</span>
                  </button>
                </div>
              </div>

              {/* Active Vertices List */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 pt-1 font-mono text-[11px]">
                {vertices.map((v, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[10px] rounded font-bold">
                        V{idx + 1}
                      </span>
                      <span className="text-slate-300">{t('Lat:')} {v.lat}, {t('Lng:')} {v.lng}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>handleRemoveVertex(idx)}
                      className="text-rose-400 hover:text-rose-300 transition p-1"
                      title="Remove Vertex"
                    ><Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live Area Calculation Box */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-300 font-medium">{t('Calculated Polygon Area (Ha):')}</span>
                  <span className="text-slate-400 font-sans text-[10px]">({calculatedSqM} {t('m²')})</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={displayAreaHa}
                  onChange={(e) =>setManualAreaHa(e.target.value)}
                  className="w-full p-2 bg-emerald-900/50 border border-emerald-500/50 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                  placeholder={t('Auto-calculated (edit to override)')}
                /></div>
            </div>

            
            
        </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        {/* Form & Vertex Controls */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{t('Map Custom Multi-Vertex Land Boundary')}</span>
          </h2>

          <form onSubmit={handleCreateMultiVertexParcel} className="space-y-4 text-xs">
            <div className="space-y-4 w-full">
            <div className="mb-4 bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
              <label className="text-cyan-400 font-bold mb-2 block text-sm">{t('Target Parcel for Inspection:')}</label>
              <select
                value={inspParcelId}
                onChange={(e) => handleSelectExistingParcel(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold"
              >
                <option value="">-- {t('Create New Multi-Vertex Parcel')} --</option>
                {parcels.filter(p => !selectedProjectId || p.project_id === selectedProjectId).map(p => (
                  <option key={p.id} value={p.id}>{p.ulpin} - {p.owner_name} ({p.village})</option>
                ))}
              </select>
            </div>

            {/* Simulated Bhu-Naksha ULPIN Verification */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-700/60 mb-4">
              <label className="text-emerald-400 font-bold mb-1.5 block flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />{t('Auto-Fetch DILRMP Land Records (ULPIN)')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ulpinInput}
                  onChange={(e) =>setUlpinInput(e.target.value)}
                  placeholder="e.g. IN-MH-PAL-2026"
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase text-xs"
                /><button
                  type="button"
                  onClick={handleVerifyUlpin}
                  disabled={isVerifyingUlpin}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition"
                >
                  {isVerifyingUlpin ? t('Verifying...') : t('Verify')}
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-8"></div>
<div className="space-y-4">
<h3 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4">{t('Land & Owner Details')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 mb-1 block">{t('Survey Number:')}</label>
                <input
                  type="text"
                  value={newSurveyNo}
                  onChange={(e) =>setNewSurveyNo(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                /></div>
              <div>
                <label className="text-slate-400 mb-1 block">{t('Khata Number:')}</label>
                <input
                  type="text"
                  value={newKhataNo}
                  onChange={(e) =>setNewKhataNo(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 mb-1 block">{t('Village / Settlement:')}</label>
                <input
                  type="text"
                  value={newVillage}
                  onChange={(e) =>setNewVillage(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                /></div>
              <div>
                <label className="text-slate-400 mb-1 block">{t('Land Category:')}</label>
                <select
                  value={newLandType}
                  onChange={(e) =>setNewLandType(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                ><option value="Suburban Residential House">{t('Suburban Residential House')}</option>
                  <option value="Roadside Commercial Shop">{t('Roadside Commercial Shop')}</option>
                  <option value="Irrigated Agricultural Farm">{t('Irrigated Agricultural Farm')}</option>
                  <option value="Fruit Orchard Estate">{t('Fruit Orchard Estate')}</option>
                  <option value="Industrial Logistics Park">{t('Industrial Logistics Park')}</option>
                  <option value="Solar Photovoltaic Grid Zone">{t('Solar Photovoltaic Grid Zone')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 mb-1 block">{t('Primary Landowner Name:')}</label>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) =>setNewOwnerName(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                /></div>
              <div>
                <label className="text-slate-400 mb-1 block">{t('Owner Contact Phone:')}</label>
                <input
                  type="text"
                  value={newOwnerContact}
                  onChange={(e) =>setNewOwnerContact(e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                /></div>
            </div>

            <div className="mb-4">
              <label className="text-slate-400 mb-1 block">{t('Property / Land Address:')}</label>
              <textarea
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                rows={2}
                placeholder={t('Enter complete address, landmarks, street name, etc.')}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
              />
            </div>

            {/* INJECTED LARR SECTION */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <h2 className="text-base font-bold text-emerald-400 font-heading flex items-center gap-2 mb-4">
                {t('LARR 2013 Field Inspection Details')}
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-slate-400 mb-1 block">{t('Affected Families')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={inspFamilies}
                    onChange={e => setInspFamilies(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 mb-1 block">{t('Social Cat.')}</label>
                    <select value={inspFamilyCategory} onChange={e => setInspFamilyCategory(e.target.value)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs">
                      <option value="General">{t('General')}</option>
                      <option value="OBC">{t('OBC')}</option>
                      <option value="SC">{t('SC')}</option>
                      <option value="ST">{t('ST')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block" title={t('Total Persons in Affected Family')}>
                      {t('Family Members')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={inspFamilyMembers}
                      onChange={e => setInspFamilyMembers(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-slate-400 mb-1 block">{t('Structures (Houses)')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={inspStructures}
                    onChange={e => setInspStructures(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">{t('Trees (Valuable)')}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={inspTrees}
                    onChange={e => setInspTrees(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex gap-4 mb-4 text-xs">
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" checked={inspTribal} onChange={e => setInspTribal(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                  {t('Tribal Land (FRA 2006)')}
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input type="checkbox" checked={inspConsent} onChange={e => setInspConsent(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                  {t('Owner Consent')}
                </label>
              </div>
              <div className="mb-4">
                <label className="text-slate-400 mb-1 block">{t('Inspection Notes')}</label>
                <textarea rows={2} value={inspNotes} onChange={e => setInspNotes(e.target.value)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none" placeholder={t('Add LARR specific field observations...')}></textarea>
              </div>
            </div>
            {/* END INJECTED LARR SECTION */}


            
</div>
</div>

            <button
              type="submit"
              disabled={!canSurvey}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
            >
              {!canSurvey ? <Lock className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
              <span>{t('Save Parcel & LARR Inspection Report')}</span>
            </button>
          </form>

</div>

        
      </div>
 
      {/* Offline Village Dossier & Map Tiles Download Progress Modal */}
      {/* Download Entire Project Area Map Modal */}
      {showTileDownloadModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">{t('Download Project Area Map')}</h3>
                  <p className="text-xs text-slate-400">{t('Save entire project radius & parcels to use the map offline')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTileDownloadModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">{t('Project:')}</span>
                  <span className="font-semibold text-white">{projects.find(p => p.id === newProjId)?.name || t('Active Corridor Project')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">{t('Village / Settlement:')}</span>
                  <span className="font-semibold text-cyan-400">{newVillage || t('Project Corridor Zone')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">{t('Offline Map Coverage:')}</span>
                  <span className="font-semibold text-emerald-400">{t('Full ~3 km Project Radius (Street & Satellite)')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">{t('Cadastral Parcels:')}</span>
                  <span className="font-mono text-cyan-400 font-bold">{parcels.length} {t('Plots')}</span>
                </div>
              </div>

              {tileDownloadProgress && (
                <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-200">{tileDownloadProgress.message}</span>
                    <span className="text-cyan-400 font-mono">{tileDownloadProgress.percent}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        tileDownloadProgress.phase === 'COMPLETE' 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                          : tileDownloadProgress.phase === 'ERROR'
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${tileDownloadProgress.percent}%` }}
                    />
                  </div>
                  {tileDownloadProgress.total > 0 && (
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>Tiles: {tileDownloadProgress.completed} / {tileDownloadProgress.total}</span>
                      {tileDownloadProgress.bytes > 0 && (
                        <span>Downloaded: {(tileDownloadProgress.bytes / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  {t('Once downloaded, everything works just like online with zero internet. Any surveys and parcels you create are stored on your device and will sync automatically when you reconnect.')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {tileDownloadProgress?.phase === 'COMPLETE' ? (
                <button
                  type="button"
                  onClick={() => setShowTileDownloadModal(false)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('✓ Ready to Survey (Close)')}</span>
                </button>
              ) : isCaching ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-slate-800 text-slate-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>{t('Downloading Map & Parcel Data...')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadVillageOffline}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:brightness-110 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('📥 Download Entire Project Area Map')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offline Outbox & Conflict Adjudication Modal */}
      {showOutboxModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {t('Offline Field Outbox & Conflict Center')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('Manage locally queued field surveys and resolve cloud synchronization conflicts')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOutboxModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Outbox Metrics Banner */}
            <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  {t('Total in Queue:')} <strong className="text-white font-mono">{outboxItems.length}</strong>
                </span>
                <span className="text-amber-400">
                  {t('Pending:')} <strong className="font-mono">{outboxStats.pending}</strong>
                </span>
                {outboxStats.conflicts > 0 && (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {t('Conflicts:')} <strong className="font-mono">{outboxStats.conflicts}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t('Connected • Ready to Sync')}
                  </span>
                ) : (
                  <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {t('Offline • Actions stored in local IndexedDB')}
                  </span>
                )}
              </div>
            </div>

            {/* Outbox Items List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {outboxItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500/60" />
                  <p className="text-sm font-semibold text-slate-300">{t('Outbox is completely clear!')}</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('All cadastral surveys and parcel polygons are safely synced with the National Land Acquisition Portal.')}
                  </p>
                </div>
              ) : (
                outboxItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition ${
                      item.status === 'CONFLICT'
                        ? 'bg-rose-950/20 border-rose-500/50'
                        : item.status === 'SYNCED'
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-800/50 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {item.type === 'NEW_PARCEL' ? t('New Boundary Polygon') : t('Ground LARR Inspection')}
                          </span>
                          <span className="text-xs text-slate-300 font-bold font-mono">
                            {item.ulpin || item.data?.ulpin || `Parcel: ${item.parcel_id || 'N/A'}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span>{item.data?.survey_number ? `Survey No: ${item.data.survey_number}` : `Village: ${item.data?.village || 'Field'}`}</span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {item.status === 'CONFLICT' ? (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle size={13} />
                            {t('Conflict Detected')}
                          </span>
                        ) : item.status === 'SYNCING' ? (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                            <RefreshCw size={13} className="animate-spin" />
                            {t('Syncing...')}
                          </span>
                        ) : item.status === 'SYNCED' ? (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            {t('Synced')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {t('Pending Sync')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conflict Resolution Box */}
                    {item.status === 'CONFLICT' && (
                      <div className="mt-3.5 pt-3.5 border-t border-rose-500/30 space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
                          <strong className="block font-bold text-rose-300 mb-0.5">
                            {t('Data Conflict')}: {item.error || item.conflict_details?.reason || t('Concurrent Modification')}
                          </strong>
                          <span className="text-[11px] text-rose-300/80">
                            {t('The online database was updated with administrative actions while this survey was recorded offline.')}
                          </span>
                        </div>

                        {/* Comparative Diff Table */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">
                              {t('Master Cloud Record')}
                            </span>
                            <div className="text-slate-300 space-y-0.5 text-[11px]">
                              <div>Status: <strong className="text-amber-400">{item.conflict_details?.server_record?.status || 'Active'}</strong></div>
                              <div>Owner: {item.conflict_details?.server_record?.owner_name || 'N/A'}</div>
                              <div>Area: {item.conflict_details?.server_record?.area_ha || 'N/A'} Ha</div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40">
                            <span className="text-[10px] text-cyan-400 uppercase tracking-wider block font-bold mb-1">
                              {t('Offline Field Survey Record')}
                            </span>
                            <div className="text-slate-300 space-y-0.5 text-[11px]">
                              <div>Status: <strong className="text-emerald-400">Verified (Field GPS)</strong></div>
                              <div>Condition: {item.data?.land_condition || 'Inspected'}</div>
                              <div>Trees: {item.data?.trees_count || 0} | Families: {item.data?.affected_families_count || 0}</div>
                            </div>
                          </div>
                        </div>

                        {/* Adjudication Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isResolvingConflict}
                            onClick={async () => {
                              await handleResolveConflict('OVERRIDE_FIELD', item);
                            }}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <CheckCircle2 size={14} />
                            <span>{t('Override Cloud with Field Survey')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isResolvingConflict}
                            onClick={async () => {
                              await handleResolveConflict('DISCARD_FIELD', item);
                            }}
                            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                          >
                            <span>{t('Discard Draft')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Non-conflict item actions */}
                    {item.status !== 'CONFLICT' && (
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(t('Discard this offline draft?'))) {
                              await removeOutboxItem(item.id);
                              await refreshOutbox();
                            }
                          }}
                          className="text-[11px] text-slate-500 hover:text-rose-400 transition flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>{t('Remove Draft')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 flex-wrap gap-2">
              <span className="text-xs text-slate-500">
                {t('Bhoomi Setu Local-First Storage (IndexedDB)')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutboxModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  {t('Close')}
                </button>
                {isOnline && outboxItems.some(i => i.status !== 'SYNCED') && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSyncNow}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold hover:brightness-110 flex items-center gap-1.5 transition shadow"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? t('Syncing...') : t('Sync All Pending')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
