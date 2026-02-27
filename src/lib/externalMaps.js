
/**
 * External Map APIs (Free Alternatives to Google Maps)
 * - Overpass API: OpenStreetMap hospital search
 * - OSRM: Open Source Routing Machine for real-time directions
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving/',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
  'https://osrm.overpass-api.de/route/v1/driving/'
];

/**
 * Fetch hospitals near a given coordinate using Overpass API
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} radiusInMeters 
 * @returns {Promise<Array>} List of hospitals
 */
export async function fetchNearbyHospitals(lat, lng, radiusInMeters = 5000) {
  const query = `
    [out:json];
    node["amenity"="hospital"](around:${radiusInMeters},${lat},${lng});
    out;
  `;
  
  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!response.ok) {
      const text = await response.text();
      console.warn('Overpass API returned non-OK status:', response.status, text.slice(0, 100));
      return [];
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.warn('Overpass API returned non-JSON content:', contentType, text.slice(0, 100));
      return [];
    }
    const data = await response.json();
    return data.elements.map(el => ({
      id: el.id,
      name: el.tags.name || 'Hospital',
      lat: el.lat,
      lng: el.lon,
      tags: el.tags
    }));
  } catch (error) {
    console.error('Failed to fetch hospitals from Overpass:', error);
    return [];
  }
}

const routeCache = new Map();

/**
 * Generate a smooth stable curve between two points as fallback
 */
function generateStableRoute(start, end) {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  
  const dist = Math.hypot(endLat - startLat, endLng - startLng);
  const numWaypoints = Math.max(2, Math.ceil(dist / 0.005));
  
  const points = [];
  for (let i = 0; i <= numWaypoints; i++) {
    const t = i / numWaypoints;
    // Add a very subtle arc to the path so it doesn't look like a direct clip through buildings
    const offset = Math.sin(t * Math.PI) * dist * 0.1;
    const lat = startLat + (endLat - startLat) * t + offset;
    const lng = startLng + (endLng - startLng) * t - offset;
    points.push([lat, lng]);
  }
  return points;
}

/**
 * Fetch a driving route between two points using OSRM with fallbacks
 * @param {[number, number]} start [lat, lng]
 * @param {[number, number]} end [lat, lng]
 * @returns {Promise<Object|null>} Route data with geometry and duration, or null if failed
 */
export async function fetchRoute(start, end) {
  if (!start || !end) return null;
  
  const cacheKey = `${start[0].toFixed(5)},${start[1].toFixed(5)}-${end[0].toFixed(5)},${end[1].toFixed(5)}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  for (const baseUrl of OSRM_ENDPOINTS) {
    try {
      const url = `${baseUrl}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      
      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0];
          const result = {
            geometry: route.geometry.coordinates.map(c => [c[1], c[0]]),
            distance: route.distance,
            duration: route.duration
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn(`OSRM Error (${baseUrl}):`, e.message);
    }
  }

  // Fallback: stable curve
  const geometry = generateStableRoute(start, end);
  const distance = Math.hypot(end[0] - start[0], end[1] - start[1]) * 111319;
  return {
    geometry,
    distance,
    duration: distance / 13 // ~45km/h
  };
}
