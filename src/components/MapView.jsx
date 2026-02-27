import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigation } from '../hooks/useNavigation';
import { fetchNearbyHospitals, fetchRoute } from '../lib/externalMaps';

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
    </style>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  }),
  P2: createIcon('#f59e0b', 14),
  P3: createIcon('#22c55e', 12),
};

function MapBounds({ ambulances, hospitals, externalHospitals, incidents }) {
  const map = useMap();

  useEffect(() => {
    const allCoords = [
      ...ambulances.filter(a => a && a.location_lat && a.location_lng).map(a => [a.location_lat, a.location_lng]),
      ...hospitals.filter(h => h && h.location_lat && h.location_lng).map(h => [h.location_lat, h.location_lng]),
      ...externalHospitals.filter(h => h && h.lat && h.lng).map(h => [h.lat, h.lng]),
      ...incidents.filter(i => i && i.location_lat && i.location_lng).map(i => [i.location_lat, i.location_lng]),
    ];

    if (allCoords.length > 1) {
      map.fitBounds(allCoords, { padding: [40, 40], maxZoom: 12 });
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], 12);
    }
  }, [ambulances, hospitals, externalHospitals, incidents]);

  return null;
}

function HospitalRouteLayer({ incidents, externalHospitals, hospitals }) {
  const [hospitalRoutes, setHospitalRoutes] = useState([]);

  useEffect(() => {
    const fetchAllRoutes = async () => {
      const activeIncidents = incidents.filter(i => i.status === 'dispatched' && i.location_lat);
      const newRoutes = [];

      for (const inc of activeIncidents) {
        // Find nearest hospital from both internal and external lists
        const allHospitals = [
          ...hospitals.filter(h => h && h.location_lat && h.location_lng).map(h => ({ name: h.name, lat: h.location_lat, lng: h.location_lng, source: 'internal' })),
          ...externalHospitals.filter(h => h && h.lat && h.lng).map(h => ({ name: h.name, lat: h.lat, lng: h.lng, source: 'external' }))
        ];

        if (allHospitals.length === 0) continue;

        let nearestHosp = null;
        let minDist = Infinity;

        allHospitals.forEach(h => {
          const d = Math.hypot(h.lat - inc.location_lat, h.lng - inc.location_lng);
          if (d < minDist) {
            minDist = d;
            nearestHosp = h;
          }
        });

        if (nearestHosp) {
          const route = await fetchRoute([inc.location_lat, inc.location_lng], [nearestHosp.lat, nearestHosp.lng]);
          if (route) {
            newRoutes.push({
              id: `hosp-route-${inc.id}`,
              points: route.geometry,
              hospital: nearestHosp.name,
              eta: Math.round(route.duration / 60)
            });
          }
        }
      }
      setHospitalRoutes(newRoutes);
    };

    if (incidents.length > 0) {
      fetchAllRoutes();
    }
  }, [incidents, externalHospitals, hospitals]);

  return (
    <>
      {hospitalRoutes.map(route => (
        <Polyline
          key={route.id}
          positions={route.points}
          pathOptions={{
            color: '#8b5cf6', // Purple for hospital route
            weight: 3,
            opacity: 0.8,
            lineJoin: 'round',
            dashArray: '5, 5',
            className: 'hosp-route'
          }}
        >
          <Tooltip sticky direction="top" opacity={0.9}>
            <div style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '10px' }}>🏥</span> Route to {route.hospital} ({route.eta}m)
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}

function NavigationLayer({ ambulances, incidents, hospitals }) {
  const [paths, setPaths] = useState([]);
  const { calculateETA, graph } = useNavigation(ambulances, incidents, hospitals);

  useEffect(() => {
    if (!graph) return;

    const newPaths = [];
    incidents.forEach(inc => {
      if (inc.status === 'dispatched' && inc.assigned_ambulance) {
        const amb = ambulances.find(a => a.id === inc.assigned_ambulance);
        if (amb && amb.location_lat && amb.location_lng && inc.location_lat && inc.location_lng) {
          const result = calculateETA(
            amb.location_lat, amb.location_lng,
            inc.location_lat, inc.location_lng
          );
          if (result && result.path.length > 1) {
            newPaths.push({
              id: `path-${inc.id}`,
              points: result.path.map(n => [n.lat, n.lng]),
              color: '#f59e0b',
              eta: result.eta
            });
          }
        }
      }
    });

    setPaths(newPaths);
  }, [graph, ambulances, incidents, calculateETA]);

  if (!graph) return null;

  return (
    <>
      {/* Heavy Traffic visual markers (simplified) */}
      {incidents
        .filter(i => i.priority === 'P1' && i.location_lat)
        .map((h, i) => (
          <Circle
            key={`traffic-${i}`}
            center={[h.location_lat, h.location_lng]}
            radius={3000}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '5, 10'
            }}
          />
        ))}

      {/* Navigation paths */}
      {paths.map(path => (
        <Polyline
          key={path.id}
          positions={path.points}
          pathOptions={{
            color: path.color,
            weight: 4,
            opacity: 0.6,
            lineJoin: 'round',
            dashArray: '1, 8',
            className: 'amb-route'
          }}
        >
          <Tooltip sticky direction="top" opacity={0.9}>
            <div style={{ padding: '2px 6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '10px' }}>⚡</span> ETA: {path.eta}m
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}

export default function MapView({ ambulances, hospitals, incidents }) {
  const [externalHospitals, setExternalHospitals] = useState([]);

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
  }, [incidents]);

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
        />
        
        <NavigationLayer 
          ambulances={ambulances} 
          incidents={incidents} 
          hospitals={hospitals} 
        />

        <HospitalRouteLayer 
          incidents={incidents}
          hospitals={hospitals}
          externalHospitals={externalHospitals}
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
