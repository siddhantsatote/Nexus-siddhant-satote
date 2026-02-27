import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchNearbyHospitals, fetchRoute } from '../lib/externalMaps';
import { useNavigation } from '../hooks/useNavigation';
import { RefreshCcw, Navigation, RotateCcw } from 'lucide-react';

// Custom icon creators
function createIcon(color, size = 12, isDriver = false) {
  if (isDriver) {
    return L.divIcon({
      className: 'custom-marker driver-marker',
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: #fff;
        border-radius: 50%;
        border: 2px solid ${color};
        box-shadow: 0 0 15px ${color}60;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size - 6}" height="${size - 6}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: ${color};
          border-radius: 50%;
          border: 1px solid white;
        "></div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 4],
    });
  }
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 0 10px ${color}80;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

const ambulanceIcons = {
  available: createIcon('#22c55e', 18, true),
  dispatched: createIcon('#f59e0b', 18, true),
  returning: createIcon('#3b82f6', 18, true),
  offline: createIcon('#6b7280', 14, true),
};

const hospitalIcon = createIcon('#8b5cf6', 16);
const externalHospitalIcon = createIcon('#a855f7', 16); // Purple for external hospitals

const incidentIcons = {
  P1: L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 18px; height: 18px;
      background: rgba(239,68,68,0.9);
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 20px rgba(239,68,68,0.6);
      animation: pulse-marker 1.5s infinite;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 900; color: white;
    ">!</div>
    <style>
      @keyframes pulse-marker {
        0%,100% { box-shadow: 0 0 10px rgba(239,68,68,0.4); }
        50% { box-shadow: 0 0 25px rgba(239,68,68,0.8); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .spinning-once {
        animation: spin 0.5s ease-in-out;
      }
    </style>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  }),
  P2: createIcon('#f59e0b', 14),
  P3: createIcon('#22c55e', 12),
};

function MapBounds({ ambulances, hospitals, externalHospitals, incidents, refreshKey }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only auto-fit on:
    // 1. Initial load
    // 2. Manual refresh (refreshKey change)
    // 3. Number of incidents or hospitals changes (new emergency added)
    
    const allCoords = [
      ...ambulances.filter(a => a && a.location_lat && a.location_lng).map(a => [a.location_lat, a.location_lng]),
      ...hospitals.filter(h => h && h.location_lat && h.location_lng).map(h => [h.location_lat, h.location_lng]),
      ...externalHospitals.filter(h => h && h.lat && h.lng).map(h => [h.lat, h.lng]),
      ...incidents.filter(i => i && i.location_lat && i.location_lng).map(i => [i.location_lat, i.location_lng]),
    ];

    if (allCoords.length > 0) {
      if (allCoords.length > 1) {
        map.fitBounds(allCoords, { padding: [40, 40], maxZoom: 12 });
      } else {
        map.setView(allCoords[0], 12);
      }
    }
  }, [incidents.length, hospitals.length, externalHospitals.length, refreshKey]);

  return null;
}

function HospitalRouteLayer({ incidents, externalHospitals, hospitals, refreshKey }) {
  const [hospitalRoutes, setHospitalRoutes] = useState([]);
  const routeCache = useRef({});

  useEffect(() => {
    routeCache.current = {};
  }, [refreshKey]);

  useEffect(() => {
    const fetchAllRoutes = async () => {
      const activeIncidents = incidents.filter(i => (i.status === 'dispatched' || i.status === 'open') && i.location_lat);
      console.log('📍 Hospital route layer - Active incidents:', activeIncidents.length);
      
      const routePromises = activeIncidents.map(async (inc) => {
        // Use pre-fetched stable route if available
        if (inc.hospital_route) {
          const hInfo = hospitals.find(h => h.id === inc.assigned_hospital) || externalHospitals.find(h => h.id === inc.assigned_hospital);
          return {
            id: `hosp-route-${inc.id}`,
            points: inc.hospital_route,
            hospital: hInfo?.name || 'Hospital',
            eta: Math.round(Math.hypot(inc.location_lat - (hInfo?.location_lat || hInfo?.lat || 0), inc.location_lng - (hInfo?.location_lng || hInfo?.lng || 0)) * 111 / 15 * 60)
          };
        }

        let targetHosp = null;
        if (inc.assigned_hospital) {
          targetHosp = hospitals.find(h => h.id === inc.assigned_hospital);
          if (targetHosp) {
            targetHosp = { name: targetHosp.name, lat: targetHosp.location_lat, lng: targetHosp.location_lng };
          } else {
            targetHosp = externalHospitals.find(h => h.id === inc.assigned_hospital);
          }
        }

        if (!targetHosp) {
          const allHospitals = [
            ...hospitals.filter(h => h && h.location_lat && h.location_lng).map(h => ({ name: h.name, lat: h.location_lat, lng: h.location_lng })),
            ...externalHospitals.filter(h => h && h.lat && h.lng).map(h => ({ name: h.name, lat: h.lat, lng: h.lng }))
          ];
          if (allHospitals.length === 0) return null;
          let minDist = Infinity;
          allHospitals.forEach(h => {
            const d = Math.hypot(h.lat - inc.location_lat, h.lng - inc.location_lng);
            if (d < minDist) { minDist = d; targetHosp = h; }
          });
        }

        if (targetHosp) {
          const cacheKey = `hosp-${inc.id}-${targetHosp.lat}-${targetHosp.lng}`;
          if (cacheKey in routeCache.current) return routeCache.current[cacheKey];

          const route = await fetchRoute([inc.location_lat, inc.location_lng], [targetHosp.lat, targetHosp.lng]);
          if (route) {
            const data = {
              id: `hosp-route-${inc.id}`,
              points: route.geometry,
              hospital: targetHosp.name,
              eta: Math.round(route.duration / 60)
            };
            routeCache.current[cacheKey] = data;
            return data;
          }
        }
        return null;
      });

      const results = await Promise.all(routePromises);
      const validRoutes = results.filter(Boolean);
      console.log('📊 Hospital routes ready:', validRoutes.length);
      setHospitalRoutes(validRoutes);
    };

    if (incidents.length > 0) {
      fetchAllRoutes();
    }
  }, [incidents, externalHospitals, hospitals, refreshKey]);

  return (
    <>
      {hospitalRoutes.map(route => {
        if (!route || !route.points || route.points.length < 2) return null;
        return (
          <Polyline
            key={route.id}
            positions={route.points}
            pathOptions={{
              color: '#8b5cf6', // Purple for hospital route
              weight: 4,
              opacity: 0.9,
              lineJoin: 'round',
              lineCap: 'round',
              className: 'hosp-route'
            }}
          >
            <Tooltip sticky direction="top" opacity={0.9}>
              <div style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '10px' }}>🏥</span> Route to {route.hospital} ({route.eta}m)
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}

function AmbulanceRouteLayer({ ambulances, incidents, refreshKey, calculateETA }) {
  const [ambRoutes, setAmbRoutes] = useState([]);
  const routeCache = useRef({});

  const [incidentEtas, setIncidentEtas] = useState({});

  useEffect(() => {
    const fetchEtas = async () => {
      const etas = {};
      const dispatched = incidents.filter(i => i.status === 'dispatched' && i.assigned_ambulance);
      for (const inc of dispatched) {
        const amb = ambulances.find(a => a.id === inc.assigned_ambulance);
        if (amb?.location_lat && inc.location_lat) {
          const result = await calculateETA(amb.location_lat, amb.location_lng, inc.location_lat, inc.location_lng);
          if (result) etas[inc.id] = result.eta;
        }
      }
      setIncidentEtas(etas);
    };
    fetchEtas();
  }, [incidents, ambulances, calculateETA]);

  useEffect(() => {
    routeCache.current = {};
  }, [refreshKey]);

  useEffect(() => {
    const fetchAllRoutes = async () => {
      const activeIncidents = incidents.filter(i => i.location_lat && (i.status === 'dispatched' || i.status === 'open'));
      console.log('🚑 Ambulance route layer - Active incidents:', activeIncidents.length);
      
      const routePromises = activeIncidents.map(async (inc) => {
        // Use pre-fetched dispatch route if available (highly efficient)
        if (inc.dispatch_route) {
          return {
            id: `amb-route-${inc.id}`,
            points: inc.dispatch_route,
            eta: incidentEtas[inc.id] || 0,
            isAnticipated: false
          };
        }

        let amb = null;
        if (inc.status === 'dispatched' && inc.assigned_ambulance) {
          amb = ambulances.find(a => a.id === inc.assigned_ambulance);
        } else if (inc.status === 'open') {
          // For open incidents, find nearest available ambulance to show anticipated route
          const available = ambulances.filter(a => a.status === 'available' && a.location_lat);
          let minDist = Infinity;
          available.forEach(a => {
            const d = Math.hypot(a.location_lat - inc.location_lat, a.location_lng - inc.location_lng);
            if (d < minDist) {
              minDist = d;
              amb = a;
            }
          });
        }

        if (amb && amb.location_lat && inc.location_lat) {
          const cacheKey = `amb-${inc.id}-${amb.id}-${amb.location_lat}-${amb.location_lng}`;
          if (cacheKey in routeCache.current) {
            console.log('  (cached)');
            return routeCache.current[cacheKey];
          }

          console.log(`  Fetching ambulance route for ${amb.unit_code}...`);
          const route = await fetchRoute([amb.location_lat, amb.location_lng], [inc.location_lat, inc.location_lng]);
          if (route) {
            const data = {
              id: `amb-route-${inc.id}`,
              points: route.geometry,
              eta: Math.round(route.duration / 60),
              isAnticipated: inc.status === 'open'
            };
            routeCache.current[cacheKey] = data;
            console.log(`  ✓ Ambulance route created: ${route.geometry.length} points`);
            return data;
          } else {
            // Cache the failure to avoid repeated requests
            routeCache.current[cacheKey] = null;
            console.log(`  ✗ Route fetch failed`);
          }
        }
        return null;
      });

      const results = await Promise.all(routePromises);
      const validRoutes = results.filter(Boolean);
      console.log('📊 Ambulance routes ready:', validRoutes.length);
      setAmbRoutes(validRoutes);
    };

    if (incidents.length > 0) {
      fetchAllRoutes();
    }
  }, [incidents, ambulances, refreshKey]);

  return (
    <>
      {ambRoutes.map(route => {
        if (!route || !route.points || route.points.length < 2) return null;
        return (
          <Polyline
            key={route.id}
            positions={route.points}
            pathOptions={{
              color: route.isAnticipated ? '#94a3b8' : '#f59e0b', // Muted color for anticipated
              weight: route.isAnticipated ? 3 : 5,
              dashArray: route.isAnticipated ? '10, 10' : '0',
              opacity: route.isAnticipated ? 0.5 : 0.8,
              lineJoin: 'round',
              lineCap: 'round',
              className: route.isAnticipated ? 'amb-route anticipated' : 'amb-route'
            }}
          >
            <Tooltip sticky direction="top" opacity={0.9}>
              <div style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '10px' }}>⚡</span> ETA: {route.eta}m
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}

export default function MapView({ ambulances, hospitals, incidents, resetAmbulancePositions }) {
  const [externalHospitals, setExternalHospitals] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { calculateETA } = useNavigation(ambulances, incidents, hospitals);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setExternalHospitals([]);
  };

  // Fetch real-time hospitals when incidents occur
  useEffect(() => {
    const fetchHospitals = async () => {
      const activeIncidents = incidents.filter(i => i.status === 'dispatched' && i.location_lat);
      if (activeIncidents.length === 0) return;

      const latestIncident = activeIncidents[0];
      const nearby = await fetchNearbyHospitals(latestIncident.location_lat, latestIncident.location_lng, 10000); // 10km radius
      
      // Filter out hospitals we already have or duplicates
      setExternalHospitals(prev => {
        const existingIds = new Set(prev.map(h => h.id));
        const filtered = nearby.filter(h => !existingIds.has(h.id));
        return [...prev, ...filtered].slice(-20); // Keep last 20 found
      });
    };

    fetchHospitals();
  }, [incidents, refreshKey]);

  return (
    <div className="map-container">
      <MapContainer
        center={[18.5204, 73.8567]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapBounds 
          ambulances={ambulances} 
          hospitals={hospitals} 
          externalHospitals={externalHospitals}
          incidents={incidents} 
          refreshKey={refreshKey}
        />
        
        <AmbulanceRouteLayer 
          ambulances={ambulances} 
          incidents={incidents} 
          refreshKey={refreshKey}
          calculateETA={calculateETA}
        />

        <HospitalRouteLayer 
          incidents={incidents}
          hospitals={hospitals}
          externalHospitals={externalHospitals}
          refreshKey={refreshKey}
        />

          {/* Ambulance markers */}
          {ambulances.filter(a => a.location_lat).map(amb => (
            <Marker
              key={`amb-${amb.id}`}
              position={[amb.location_lat, amb.location_lng]}
              icon={ambulanceIcons[amb.status] || ambulanceIcons.offline}
            >
              <Tooltip 
                permanent 
                direction="top" 
                offset={[0, -12]}
                className="driver-tooltip"
              >
                <div style={{ 
                  padding: '1px 6px', 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  color: 'white'
                }}>
                  <span style={{ fontSize: '9px' }}>👤</span> {amb.driver_name?.split(' ')[0]}
                </div>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{amb.unit_code}</strong>
                  <span className={`type-badge ${amb.type?.toLowerCase()}`} style={{ marginLeft: 8 }}>
                    {amb.type}
                  </span>
                  <br />
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    Driver: {amb.driver_name} • {amb.zone}
                  </span>
                  <br />
                  <span className={`status-badge ${amb.status}`} style={{ marginTop: 4, display: 'inline-flex' }}>
                    {amb.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Internal Hospital markers */}
        {hospitals.filter(h => h.location_lat).map(hosp => (
          <Marker
            key={`hosp-${hosp.id}`}
            position={[hosp.location_lat, hosp.location_lng]}
            icon={hospitalIcon}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>🏥 {hosp.name}</strong>
                <br />
                <span style={{ fontSize: '0.75rem' }}>
                  ICU: {hosp.icu_beds_available} beds
                  {hosp.trauma_capable && ' • Trauma ✓'}
                  {hosp.cardiac_cath && ' • Cath Lab ✓'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* External (Real-time) Hospital markers */}
        {externalHospitals.map(hosp => (
          <Marker
            key={`ext-hosp-${hosp.id}`}
            position={[hosp.lat, hosp.lng]}
            icon={externalHospitalIcon}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>🏥 {hosp.name} (Real-time)</strong>
                <br />
                <span style={{ fontSize: '0.75rem' }}>
                  Source: OpenStreetMap
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident markers */}
        {incidents.filter(i => i.location_lat && i.status !== 'resolved').map(inc => (
          <Marker
            key={`inc-${inc.id}`}
            position={[inc.location_lat, inc.location_lng]}
            icon={incidentIcons[inc.priority] || incidentIcons.P3}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <span className={`priority-badge ${inc.priority?.toLowerCase()}`}>{inc.priority}</span>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                  {inc.incident_type}
                </span>
                <br />
                <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block', marginTop: 4 }}>
                  {inc.location_raw || inc.caller_description?.slice(0, 80)}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Action Buttons */}
      <div className="map-actions" style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <button 
          onClick={handleRefresh}
          className="map-action-btn"
          title="Refresh Routes & Data"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--bg-secondary)',
            color: 'var(--text-default)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            transition: 'all 0.2s',
            border: '1px solid var(--border-default)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--accent-blue)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-default)';
          }}
        >
          <RefreshCcw size={20} className={refreshKey > 0 ? 'spinning-once' : ''} />
        </button>

        <button 
          onClick={resetAmbulancePositions}
          className="map-action-btn"
          title="Reset Driver Positions"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'var(--bg-secondary)',
            color: 'var(--text-default)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            transition: 'all 0.2s',
            border: '1px solid var(--border-default)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--accent-orange)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-default)';
          }}
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Map legend */}
      <div className="map-legend">
        <div className="map-legend-item">
          <div style={{ 
            width: 14, height: 14, borderRadius: '50%', background: '#fff', 
            border: '2px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '8px', color: '#22c55e' }}>👤</span>
          </div>
          Available Driver
        </div>
        <div className="map-legend-item">
          <div style={{ 
            width: 14, height: 14, borderRadius: '50%', background: '#fff', 
            border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '8px', color: '#f59e0b' }}>👤</span>
          </div>
          Dispatched Driver
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#8b5cf6' }}></span>
          Hospital
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot" style={{ background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}></span>
          Incident
        </div>
        <div className="map-legend-item">
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px dashed #f59e0b', background: 'rgba(245, 158, 11, 0.1)', marginRight: 4 }}></div>
          Amb Route
        </div>
        <div className="map-legend-item">
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px dashed #8b5cf6', background: 'rgba(139, 92, 246, 0.1)', marginRight: 4 }}></div>
          Hosp Route
        </div>
      </div>
    </div>
  );
}
