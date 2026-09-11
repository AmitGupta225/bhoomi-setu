import React, { useEffect, useState } from 'react';
import { fetchParcels, fetchProjects, createParcel, submitFieldSurvey, approveSurvey, fetchUlpinData } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  X
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

export const FieldSurveyMobile = () => {
  const { activeRole, selectedProjectId, t } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState('');
  
  // Tabs
  

  // Inspection State
  const [inspParcelId, setInspParcelId] = useState('');
  const [inspLandCondition, setInspLandCondition] = useState('Vacant Land');
  const [inspLandType, setInspLandType] = useState('Unirrigated');
  const [inspFamilies, setInspFamilies] = useState(0);
  const [inspFamilyCategory, setInspFamilyCategory] = useState("General");
  const [inspFamilyMembers, setInspFamilyMembers] = useState(0);
  const [inspStructures, setInspStructures] = useState(0);
  const [inspTrees, setInspTrees] = useState(0);
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
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap India</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri World Imagery'
    }
  };
  
  // Default vertices (non-square 4-point polygon around project center)
  const [vertices, setVertices] = useState([
    { lat: 19.7280, lng: 72.8440 },
    { lat: 19.7292, lng: 72.8465 },
    { lat: 19.7275, lng: 72.8475 },
    { lat: 19.7265, lng: 72.8445 }
  ]);

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const pList = await fetchParcels(selectedProjectId ? { project_id: selectedProjectId } : {});
      const projList = await fetchProjects();
      setParcels(pList);
      setProjects(projList);
      
      let activeProjId = selectedProjectId;
      if (projList.length > 0 && !selectedProjectId) {
        activeProjId = projList[0].id;
      }
      if (activeProjId) setNewProjId(activeProjId);
      
      // Fly to active project's location
      const activeProj = projList.find(p => p.id === activeProjId);
      if (activeProj && activeProj.center_lat && activeProj.center_lng) {
        const pLat = parseFloat(activeProj.center_lat);
        const pLng = parseFloat(activeProj.center_lng);
        setSearchTarget({ lat: pLat, lng: pLng });
        setIsUserLocationActive(false);
        
        // Update default polygon to be a generic boundary around project center
        // (Only do this if they haven't selected a specific parcel to edit)
        setVertices([
          { lat: parseFloat((pLat).toFixed(5)), lng: parseFloat((pLng - 0.001).toFixed(5)) },
          { lat: parseFloat((pLat + 0.0012).toFixed(5)), lng: parseFloat((pLng + 0.0015).toFixed(5)) },
          { lat: parseFloat((pLat - 0.0005).toFixed(5)), lng: parseFloat((pLng + 0.0025).toFixed(5)) },
          { lat: parseFloat((pLat - 0.0015).toFixed(5)), lng: parseFloat((pLng - 0.0005).toFixed(5)) }
        ]);
        setCustomLat(pLat.toFixed(6));
        setCustomLng(pLng.toFixed(6));
      }
      
      setLoading(false);
    }
    loadData();
  }, [selectedProjectId]);

  const handleAddCurrentGpsAsVertex = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const vLat = parseFloat(pos.coords.latitude.toFixed(5));
          const vLng = parseFloat(pos.coords.longitude.toFixed(5));
          setVertices(prev => [...prev, { lat: vLat, lng: vLng }]);
        },
        (err) => alert('GPS capture error: ' + err.message)
      );
    } else {
      alert('Geolocation not supported in browser.');
    }
  };

  const handleAddCustomVertex = () => {
    const vLat = parseFloat(customLat);
    const vLng = parseFloat(customLng);
    if (isNaN(vLat) || isNaN(vLng)) {
      alert('Please enter valid numerical Latitude and Longitude values.');
      return;
    }
    setVertices(prev => [...prev, { lat: vLat, lng: vLng }]);
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
             const parsed = pGeom.coordinates[0].map(pt => ({ lat: pt[1], lng: pt[0] }));
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
    if (!inspParcelId) return alert('Select a parcel');
    setInspLoading(true);
    try {
      const p = parcels.find(x => x.id === inspParcelId);
      await submitFieldSurvey({
        project_id: p.project_id,
        parcel_id: p.id,
        surveyor_name: activeRole.label,
        surveyor_id: 'SURV-881',
        gps_lat: userLocation ? userLocation.lat : p.lat,
        gps_lng: userLocation ? userLocation.lng : p.lng,
        land_condition: inspLandCondition,
        land_type: inspLandType,
        affected_families_count: inspFamilies,
        structures_count: inspStructures,
        trees_count: inspTrees,
        family_category: inspFamilyCategory,
        family_members_count: inspFamilyMembers,
        is_tribal_land: inspTribal,
        consent_obtained: inspConsent,
        verification_notes: inspNotes
      });
      setSubmitSuccess('Field Inspection Report Submitted!');
      setTimeout(() => setSubmitSuccess(''), 5000);
      setInspParcelId('');
    } catch (err) {
      alert('Error: ' + err.message);
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

    try {
      const res = await createParcel({
        project_id: newProjId,
        survey_number: newSurveyNo,
        khata_number: newKhataNo,
        village: newVillage,
        land_type: newLandType,
        owner_name: newOwnerName,
        owner_contact: newOwnerContact,
        address: newAddress,
        area_ha: finalAreaHa > 0 ? finalAreaHa : 1.25,
        vertices: vertices,
        lat: vertices[0].lat,
        lng: vertices[0].lng
      });

      
      if (res.success) {
        // Also automatically submit the LARR Inspection Report for this new parcel!
        try {
          await submitFieldSurvey(res.id, {
            land_type: newLandType,
            affected_families: inspFamilies,
            family_members: inspFamilyMembers,
            family_category: inspFamilyCategory,
            structures_count: inspStructures,
            trees_count: inspTrees,
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
        setTimeout(() => setSubmitSuccess(''), 5000);
      }
    } catch (err) {
      alert('Parcel Creation Failed: ' + err.message);
    }
  };

  const calculatedHa = calculatePolygonAreaHa(vertices);
  const displayAreaHa = manualAreaHa !== null ? manualAreaHa : calculatedHa;
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

            <div className="h-[60vh] min-h-[400px] w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0">
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
                center={[vertices[0]?.lat || 19.7280, vertices[0]?.lng || 72.8450]}
                zoom={16}
                className="w-full h-full"
              >
                
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

                {/* Draw markers for each vertex */}
                {vertices.map((v, idx) => (
                  <Marker key={idx} position={[v.lat, v.lng]}>
                    <Popup>
                      <div className="text-xs font-mono">
                        <strong className="text-cyan-700 block font-sans">{t('Vertex')} V{idx + 1}</strong>
                        {t('Lat:')} {v.lat}<br />
                        {t('Lng:')} {v.lng}
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
                          accuracy: null
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

          <p className="text-xs text-slate-400 italic text-center pt-2 mb-4">💡 {t('As you add or remove vertex coordinates below, the green polygon boundary updates live on the map above.')}</p>

        {/* INJECTED VERTEX CONTROLS */}
        {/* VERTEX CONTROL SECTION */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>{t('Boundary Vertices')} ({vertices.length} {t('Points')})</span>
                </span>

                <button
                  type="button"
                  onClick={handleAddCurrentGpsAsVertex}
                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                  title="Add your physical device location"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Device GPS')}</span>
                </button>
              </div>

              {/* Custom Point Input */}
              <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-slate-800">
                <div className="col-span-5 font-mono">
                  <span className="text-slate-500 text-[10px] block">{t('Custom Lat:')}</span>
                  <input
                    type="text"
                    value={customLat}
                    onChange={(e) =>setCustomLat(e.target.value)}
                    className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 text-xs focus:outline-none"
                  /></div>
                <div className="col-span-5 font-mono">
                  <span className="text-slate-500 text-[10px] block">{t('Custom Lng:')}</span>
                  <input
                    type="text"
                    value={customLng}
                    onChange={(e) =>setCustomLng(e.target.value)}
                    className="w-full p-1.5 bg-slate-800 border border-slate-700 rounded text-emerald-400 text-xs focus:outline-none"
                  /></div>
                <div className="col-span-12 pt-1">
                  <button
                    type="button"
                    onClick={handleAddCustomVertex}
                    className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/50"
                    title="Add Red Pin Location to Polygon"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Add Red Pin to Boundary')}</span>
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
                  <input type="number" value={inspFamilies} onChange={e => setInspFamilies(parseInt(e.target.value) || 0)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
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
                    <label className="text-slate-400 mb-1 block">{t('Size')}</label>
                    <input type="number" value={inspFamilyMembers} onChange={e => setInspFamilyMembers(parseInt(e.target.value) || 0)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-slate-400 mb-1 block">{t('Structures (Houses)')}</label>
                  <input type="number" value={inspStructures} onChange={e => setInspStructures(parseInt(e.target.value) || 0)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">{t('Trees (Valuable)')}</label>
                  <input type="number" value={inspTrees} onChange={e => setInspTrees(parseInt(e.target.value) || 0)} className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
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
 
</div>
  );
};
