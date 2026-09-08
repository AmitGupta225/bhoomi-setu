import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchParcels, fetchProjects, checkULPIN, updateParcelStatus } from '../services/api';
import { MapContainer, TileLayer, Polygon, Popup, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Compass,
  Maximize2,
  Globe,
  Layers,
  Crosshair,
  Clock
} from 'lucide-react';

// Fix default leaflet marker icon bug in React (Blue Marker)
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





// User Location Recenter Helper
function FlyToLocation({ location, locationKey }) {
  const map = useMap();
  useEffect(() => {
    if (location && location.lat && location.lng) {
      map.flyTo([location.lat, location.lng], location.accuracy && location.accuracy > 5000 ? 12 : 16, { duration: 1.5 });
    }
  }, [location, locationKey, map]);
  return null;
}

// Leaflet Location Handler Helper
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
      setUserLocation({ lat: uLat, lng: uLng, accuracy: acc });
      setIsLocating(false);
      map.flyTo(e.latlng, acc > 5000 ? 12 : 16, { duration: 1.2 });
    };

    const onLocationError = (e) => {
      setIsLocating(false);
      // Fall back to standard browser geolocation if Leaflet locate errors
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = parseFloat(pos.coords.latitude.toFixed(6));
            const uLng = parseFloat(pos.coords.longitude.toFixed(6));
            const acc = Math.round(pos.coords.accuracy || 0);
            setUserLocation({ lat: uLat, lng: uLng, accuracy: acc });
            map.flyTo([uLat, uLng], acc > 5000 ? 12 : 16, { duration: 1.2 });
          },
          (err) => {
            alert('Location permission or acquisition error: ' + err.message);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        alert('Geolocation is not supported by your browser: ' + e.message);
      }
    };

    map.once('locationfound', onLocationFound);
    map.once('locationerror', onLocationError);

    map.locate({ setView: false, enableHighAccuracy: true, timeout: 8000 });

    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [locateTrigger, map]);

  return null;
}


export const GisSpatialViewer = () => {
  const { selectedProjectId, activeRole, addNotification , t } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [searchUlpin, setSearchUlpin] = useState('');
  const [mapCenter, setMapCenter] = useState([19.6967, 72.7699]); // Default Palghar
  const [mapZoom, setMapZoom] = useState(14);
  const [mapStyle, setMapStyle] = useState('osm'); // 'osm' (Standard Map) or 'satellite' (Satellite View)
  const [userLocation, setUserLocation] = useState(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [parcelLogs, setParcelLogs] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isUserLocationActive, setIsUserLocationActive] = useState(false);
  
  // Bulletproof map instance and bounds tracking
  const [mapInstance, setMapInstance] = useState(null);
  const prevParcelIdRef = useRef(null);

  useEffect(() => {
    if (mapInstance && selectedParcel && selectedParcel.id && selectedParcel.id !== prevParcelIdRef.current && !isUserLocationActive) {
      prevParcelIdRef.current = selectedParcel.id;
      const geojsonGeom = selectedParcel.geojson?.geometry || selectedParcel.geojson;
      const coords = geojsonGeom?.coordinates?.[0]?.map(pt => [pt[1], pt[0]]) || [];
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        mapInstance.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 1.0 });
      } else if (selectedParcel.lat && selectedParcel.lng) {
        mapInstance.flyTo([selectedParcel.lat, selectedParcel.lng], 15, { duration: 1.0 });
      }
    }
  }, [selectedParcel?.id, isUserLocationActive, mapInstance]);

  useEffect(() => {
    async function loadGisData() {
      const pList = await fetchParcels(selectedProjectId ? { project_id: selectedProjectId } : {});
      const projList = await fetchProjects();
      setParcels(pList);
      setProjects(projList);
      if (selectedProjectId) {
        const projParcels = pList.filter(p => p.project_id === selectedProjectId);
        if (projParcels.length > 0) {
          setSelectedParcel(projParcels[0]);
          return;
        }
      }
      if (pList.length > 0) {
        setSelectedParcel(pList[0]);
      }
    }
    loadGisData();
  }, [selectedProjectId]);

  // Sync automatically with global top bar active project selector
  useEffect(() => {
    if (selectedProjectId && parcels.length > 0 && !isUserLocationActive) {
      const projParcels = parcels.filter(p => p.project_id === selectedProjectId);
      const proj = projects.find(p => p.id === selectedProjectId);
      if (projParcels.length > 0) {
        setSelectedParcel(projParcels[0]);
      } else if (proj && proj.center_lat && proj.center_lng) {
        setSelectedParcel({
          id: `PROJ-CENTER-${proj.id}`,
          ulpin: `${proj.code} (Corridor Center)`,
          survey_number: 'N/A',
          khata_number: 'N/A',
          village: proj.district,
          tehsil: proj.district,
          district: proj.district,
          state: proj.state,
          area_ha: proj.total_land_proposed_ha,
          land_type: proj.project_type,
          owner_name: proj.agency,
          status: proj.status,
          lat: proj.center_lat,
          lng: proj.center_lng
        });
      }
    }
  }, [selectedProjectId, parcels, projects, isUserLocationActive]);

  useEffect(() => {
    async function loadParcelAuditLogs() {
      if (selectedParcel?.ulpin) {
        try {
          const res = await fetch(`/api/audit-logs/parcel/${encodeURIComponent(selectedParcel.ulpin)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.success && data.data) {
            setParcelLogs(data.data);
          } else {
            setParcelLogs([]);
          }
        } catch (e) {
          setParcelLogs([]); // silently ignore - log endpoint may not exist
        }
      } else {
        setParcelLogs([]);
      }
    }
    loadParcelAuditLogs();
  }, [selectedParcel?.ulpin]);

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedParcel || selectedParcel.id.startsWith('PROJ')) return;
    try {
      const res = await updateParcelStatus(selectedParcel.id, newStatus, activeRole?.label, activeRole?.label);
      if (res.success) {
        if (addNotification) addNotification(`[GIS Hub] Parcel ${selectedParcel.ulpin} status updated to ${newStatus}`);
        
        // Update local state to trigger instant re-render of map polygons
        const updatedParcels = parcels.map(p => 
          p.id === selectedParcel.id ? { ...p, status: newStatus } : p
        );
        setParcels(updatedParcels);
        setSelectedParcel({ ...selectedParcel, status: newStatus });
        
        // Add log locally
        setParcelLogs([{
          id: Date.now(),
          timestamp: new Date().toISOString(),
          action: `Updated Parcel Status`,
          user_name: activeRole?.label || 'GIS User',
          user_role: 'Authorized Officer'
        }, ...parcelLogs]);
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Clean ULPIN Search Handler
  const handleUlpinSearch = (e) => {
    e.preventDefault();
    if (!searchUlpin.trim()) return;
    const match = parcels.find(p => p.ulpin.toLowerCase().includes(searchUlpin.trim().toLowerCase()));
    if (match) {
      setIsUserLocationActive(false);
      setSelectedParcel(match);
    } else {
      alert(`No parcel found matching ULPIN "${searchUlpin}".`);
    }
  };

  const handleFetchCurrentLocation = () => {
    setLocateTrigger(prev => prev + 1);
  };

  const filteredParcels = selectedProjectId
    ? parcels.filter(p => p.project_id === selectedProjectId)
    : parcels;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Possessed': return '#10b981'; // Green
      case 'Awarded': return '#06b6d4'; // Cyan
      case 'Notified': return '#f59e0b'; // Amber
      case 'Disputed': return '#ef4444'; // Red
      default: return '#8b5cf6'; // Purple
    }
  };

  // Base Tile Layer selection (Standard Map vs Satellite View)
  const tileLayerConfig = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap India</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri World Imagery'
    }
  };

  // Calculate exact corner coordinates & bounding box for selected parcel
  const selectedGeom = selectedParcel?.geojson?.geometry || selectedParcel?.geojson;
  const selectedParcelCoords = selectedGeom?.coordinates?.[0]?.map(pt => [pt[1], pt[0]]) || [];
  
  const getParcelBoundsInfo = () => {
    if (!selectedParcelCoords || selectedParcelCoords.length === 0) return null;
    const lats = selectedParcelCoords.map(c => c[0]);
    const lngs = selectedParcelCoords.map(c => c[1]);
    const minLat = Math.min(...lats).toFixed(6);
    const maxLat = Math.max(...lats).toFixed(6);
    const minLng = Math.min(...lngs).toFixed(6);
    const maxLng = Math.max(...lngs).toFixed(6);

    return {
      nw: [maxLat, minLng],
      ne: [maxLat, maxLng],
      se: [minLat, maxLng],
      sw: [minLat, minLng],
      centroid: [selectedParcel.lat, selectedParcel.lng]
    };
  };

  const boundsInfo = getParcelBoundsInfo();

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col lg:flex-row overflow-hidden relative">
      {/* Sidebar Controls & Parcel Details Panel */}
      <div className="w-full lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0 shadow-2xl">
        {/* Header Search */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>GIS Spatial Hub</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">OSM WGS84</span>
          </div>

          {/* ULPIN Search Form */}
          <form onSubmit={handleUlpinSearch} className="relative">
            <input
              type="text"
              placeholder="Enter ULPIN (e.g. IN-MH-PAL-2026-00101)..."
              value={searchUlpin}
              onChange={(e) => setSearchUlpin(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Direct Parcel Selector within Active Project */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedParcel?.id || ''}
              onChange={(e) => {
                const pcl = parcels.find(p => p.id === e.target.value);
                if (pcl) {
                  setIsUserLocationActive(false);
                  setSelectedParcel(pcl);
                }
              }}
              className="w-full bg-slate-800 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 font-medium px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">Jump to Land Parcel...</option>
              {filteredParcels.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ulpin} (Survey: {p.survey_number} • {p.area_ha} Ha - {p.land_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Parcel Deep Details & Boundary Lat/Lng Box */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {selectedParcel ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {selectedParcel.ulpin}
                  </span>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-slate-950 uppercase"
                    style={{ backgroundColor: getStatusColor(selectedParcel.status) }}
                  >
                    {selectedParcel.status}
                  </span>
                </div>
                
                <h3 className="text-sm font-bold text-white font-heading">
                  Survey No. {selectedParcel.survey_number} (Khata: {selectedParcel.khata_number})
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedParcel.village}, {selectedParcel.tehsil}, {selectedParcel.district}, {selectedParcel.state}
                </p>
              </div>

              {/* Attributes Table */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Owner Name:</span>
                  <span className="font-semibold text-white">{selectedParcel.owner_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Land Category:</span>
                  <span className="font-medium text-emerald-400">{selectedParcel.land_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Plot Area:</span>
                  <span className="font-bold text-white">
                    {selectedParcel.area_ha} Hectares <span className="text-slate-400 font-normal">({(selectedParcel.area_ha * 10000).toLocaleString()} m²)</span>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Centroid GPS:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{selectedParcel.lat}, {selectedParcel.lng}</span>
                </div>
              </div>

              {/* Quick Action Status Updater */}
              {activeRole && !selectedParcel.id.startsWith('PROJ-') && (
                <div className="bg-slate-950/80 border border-slate-700 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />Update Parcel Status</span>
                  <div className="flex flex-wrap gap-2">
                    {['Proposed', 'Notified', 'Verified', 'Awarded', 'Possessed', 'Disputed'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={selectedParcel.status === status}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                          selectedParcel.status === status 
                            ? 'opacity-60 cursor-not-allowed shadow-inner' 
                            : 'hover:-translate-y-0.5 hover:shadow-lg border border-slate-700/50'
                        }`}
                        style={{ 
                          backgroundColor: selectedParcel.status === status ? getStatusColor(status) : 'rgba(15, 23, 42, 0.6)', 
                          color: selectedParcel.status === status ? '#000' : getStatusColor(status)
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parcel Audit Trail */}
              {parcelLogs.length > 0 && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Compliance Audit Trail</span>
                  </h3>
                  <div className="space-y-3 pl-2 border-l-2 border-slate-800">
                    {parcelLogs.map(log => (
                      <div key={log.id} className="relative pl-4 space-y-1">
                        <div className="absolute w-2 h-2 rounded-full bg-cyan-500 -left-[5px] top-1.5 ring-4 ring-slate-900"></div>
                        <div className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</div>
                        <div className="text-xs font-semibold text-white">{log.action}</div>
                        <div className="text-[10px] text-slate-300">{log.user_name} ({log.user_role})</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exact Polygon Boundary Vertices Box */}
              {boundsInfo && (
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5" />Exact Boundary Corner Lat / Lng Box</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-500 block font-sans font-bold">North-West Corner</span>
                      <span className="text-white block">{boundsInfo.nw[0]} N</span>
                      <span className="text-slate-400 block">{boundsInfo.nw[1]} E</span>
                    </div>

                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-500 block font-sans font-bold">North-East Corner</span>
                      <span className="text-white block">{boundsInfo.ne[0]} N</span>
                      <span className="text-slate-400 block">{boundsInfo.ne[1]} E</span>
                    </div>

                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-500 block font-sans font-bold">South-West Corner</span>
                      <span className="text-white block">{boundsInfo.sw[0]} N</span>
                      <span className="text-slate-400 block">{boundsInfo.sw[1]} E</span>
                    </div>

                    <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-500 block font-sans font-bold">South-East Corner</span>
                      <span className="text-white block">{boundsInfo.se[0]} N</span>
                      <span className="text-slate-400 block">{boundsInfo.se[1]} E</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">Select a parcel from map to view GIS spatial attributes.</div>
          )}
        </div>

        {/* Legend Panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-[11px] space-y-2">
          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Parcel Status Legend</span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-slate-300">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Possessed</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>Awarded</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>Verified</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Notified</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>Disputed</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Center */}
      <div className="flex-1 h-full relative z-0">
        {/* PROMINENT HIGH-CONTRAST MAP VIEW SWITCHER (STANDARD MAP vs SATELLITE VIEW) */}
        <div className="absolute top-4 right-4 z-[500] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
          <button
            onClick={() => setMapStyle('osm')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mapStyle === 'osm' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Standard Map</span>
          </button>

          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mapStyle === 'satellite' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satellite View</span>
          </button>
        </div>

        {/* CIRCULAR GOOGLE MAPS-STYLE MY LOCATION BUTTON (BOTTOM-LEFT CORNER) */}
        <button
          onClick={handleFetchCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-6 left-6 z-[500] w-12 h-12 rounded-full bg-slate-900/95 hover:bg-slate-800 border-2 border-slate-700/90 shadow-2xl backdrop-blur-md flex items-center justify-center text-rose-400 hover:text-rose-300 transition-all transform hover:scale-110 active:scale-95 group"
          title="Fly to My Current GPS Location"
        >
          <Crosshair className={`w-6 h-6 ${isLocating ? 'animate-spin text-amber-400' : 'group-hover:rotate-45 transition-transform duration-300'}`} />
        </button>

        <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" ref={setMapInstance}>
          <MapLocationTrigger 
            locateTrigger={locateTrigger} 
            setUserLocation={setUserLocation} 
            setIsLocating={setIsLocating} 
            setIsUserLocationActive={setIsUserLocationActive} 
          />
          <TileLayer
            key={mapStyle}
            attribution={tileLayerConfig[mapStyle].attribution}
            url={tileLayerConfig[mapStyle].url}
          />

          {/* Render Parcel Polygons with Exact Bounds */}
          {filteredParcels.map(p => {
            const pGeom = p.geojson?.geometry || p.geojson;
            const coords = pGeom?.coordinates?.[0]?.map(pt => [pt[1], pt[0]]) || [];
            if (coords.length === 0) return null;

            const isSelected = selectedParcel?.id === p.id;
            const strokeColor = isSelected ? '#ffffff' : getStatusColor(p.status);

            return (
              <React.Fragment key={p.id}>
                <Polygon
                  positions={coords}
                  pathOptions={{
                    color: strokeColor,
                    fillColor: getStatusColor(p.status),
                    fillOpacity: isSelected ? 0.65 : 0.35,
                    weight: isSelected ? 3.5 : 1.5
                  }}
                  eventHandlers={{
                    click: () => {
                      setIsUserLocationActive(false);
                      setSelectedParcel(p);
                    }
                  }}
                >
                </Polygon>

                {/* Blue Marker Pin for Land Parcels */}
                <Marker 
                  position={[p.lat, p.lng]}
                  eventHandlers={{
                    click: () => {
                      setIsUserLocationActive(false);
                      setSelectedParcel(p);
                    }
                  }}
                >
                </Marker>
              </React.Fragment>
            );
          })}

          {/* SINGLE CONTROLLED POPUP TO PREVENT BLANK RENDER BUGS */}
          {selectedParcel && selectedParcel.id && !selectedParcel.id.startsWith('PROJ-CENTER') && (
            <Popup position={[selectedParcel.lat, selectedParcel.lng]} autoPan={false} closeButton={false}>
              <div className="space-y-1 text-slate-100 text-xs min-w-[150px] relative pr-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedParcel(null); }}
                  className="absolute -top-1 -right-2 text-slate-400 hover:text-white font-bold p-1 leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
                <strong className="block text-emerald-400 text-sm">{selectedParcel.ulpin}</strong>
                <div><span className="text-slate-400">Owner:</span> <strong>{selectedParcel.owner_name}</strong></div>
                <div><span className="text-slate-400">Survey No:</span> <strong>{selectedParcel.survey_number}</strong></div>
                <div><span className="text-slate-400">Area:</span> <strong>{selectedParcel.area_ha} Ha</strong></div>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-700/50 mt-1">
                  GPS: {selectedParcel.lat.toFixed(4)}, {selectedParcel.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
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
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  setUserLocation({
                    lat: parseFloat(pos.lat.toFixed(6)),
                    lng: parseFloat(pos.lng.toFixed(6)),
                    accuracy: null
                  });
                }
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 font-mono">
                  <strong className="block text-rose-600 font-sans font-bold">
                    📍 {userLocation.accuracy ? (userLocation.accuracy > 2000 ? 'Regional IP Gateway' : 'GPS Location') : 'Selected Custom Point'}
                  </strong>
                  {userLocation.accuracy && (
                    <div className="text-[10px] text-amber-600 font-sans font-semibold">
                      Accuracy: ±{userLocation.accuracy > 1000 ? `${(userLocation.accuracy / 1000).toFixed(1)} km` : `${userLocation.accuracy}m`}
                    </div>
                  )}
                  <div>Lat: {userLocation.lat}</div>
                  <div>Lng: {userLocation.lng}</div>
                  <div className="text-[10px] text-slate-500 font-sans italic pt-1 border-t border-slate-200">💡 Drag pin anywhere on map to micro-adjust</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
