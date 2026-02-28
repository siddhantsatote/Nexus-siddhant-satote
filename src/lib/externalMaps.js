
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

/**
 * Generate an approximate route with multiple waypoints
 * This creates a path that curves through the map rather than straight line
 */
function generateApproximateRoute(start, end) {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  
  const distance = Math.hypot(endLat - startLat, endLng - startLng);
  const numWaypoints = Math.ceil(distance / 0.01) + 1; // Add waypoint every ~1km
  
  const points = [start];
  
  for (let i = 1; i < numWaypoints - 1; i++) {
    const t = i / (numWaypoints - 1);
    const lat = startLat + (endLat - startLat) * t + (Math.random() - 0.5) * distance * 0.05;
    const lng = startLng + (endLng - startLng) * t + (Math.random() - 0.5) * distance * 0.05;
    points.push([lat, lng]);
  }
  
  points.push(end);
  return points;
}

// Persistent cache using localStorage
function getCachedRoute(key) {
  try {
    const cached = localStorage.getItem(`route_${key}`);
    if (cached) return JSON.parse(cached);
  } catch(e) {}
  return null;
}

function setCachedRoute(key, data) {
  try {
    localStorage.setItem(`route_${key}`, JSON.stringify(data));
  } catch(e) {}
}

/** Clear all cached routes so they can be re-fetched from OSRM */
export function clearRouteCache() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('route_'));
    keys.forEach(k => localStorage.removeItem(k));
    console.log(`🗑️ Cleared ${keys.length} cached routes`);
  } catch (e) {}
}

// Request queue to prevent spamming OSRM and getting IP banned/throttled
let requestQueue = Promise.resolve();

/**
 * Fetch a driving route between two points using OSRM with fallbacks
 * @param {[number, number]} start [lat, lng]
 * @param {[number, number]} end [lat, lng]
 * @returns {Promise<Object|null>} Route data with geometry and duration
 */
export async function fetchRoute(start, end) {
  if (!start || !end || start.length < 2 || end.length < 2) return null;

  const startLat = start[0], startLng = start[1];
  const endLat = end[0], endLng = end[1];

  // Round coordinates to ~11 meters to increase cache hits
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}-${endLat.toFixed(4)},${endLng.toFixed(4)}`;
  
  // 1. Check persistent cache first (instant, 0 lag!)
  const cached = getCachedRoute(cacheKey);
  if (cached) return cached;

  // 2. Queue the request so we don't blast OSRM with 10 parallel requests
  return new Promise((resolve) => {
    requestQueue = requestQueue.then(async () => {
      // Throttle to max ~2.5 requests per second to avoid OSRM rate limits
      await new Promise(r => setTimeout(r, 400));
      
      for (const baseUrl of OSRM_ENDPOINTS) {
        const url = `${baseUrl}${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        try {
          // Fast timeout so UI doesn't hang if server is dead
          const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
          if (!response.ok) continue;
          
          const data = await response.json();
          if (data.code === 'Ok' && data.routes?.length > 0) {
            const route = data.routes[0];
            const geometry = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            if (geometry.length > 1) {
              const result = {
                geometry,
                distance: route.distance,
                duration: route.duration
              };
              console.log('✓ Route fetched & cached from OSRM');
              setCachedRoute(cacheKey, result); // Save for future page reloads
              resolve(result);
              return;
            }
          }
        } catch (error) {
          // ignore individual endpoint timeouts, will try next
        }
      }

      // Fallback if all OSRM servers fail
      console.log('⚠ Using approximate route (OSRM unavailable)');
      const distance = Math.hypot(endLat - startLat, endLng - startLng) * 111000;
      const result = {
        geometry: generateApproximateRoute(start, end),
        distance,
        duration: Math.max(300, Math.ceil(distance / 15))
      };
      
      // We don't cache the fallback so it can retry OSRM later
      resolve(result);
    }).catch((e) => {
      console.error("Route queue error:", e);
      resolve(null);
    });
  });
}
