
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

/** Clear all cached routes so they can be re-fetched from OSRM */
export function clearRouteCache() {
  routeCache.clear();
  console.log('🗑️ Route cache cleared');
}

/**
 * Generate a road-like fallback route using L-shaped turns on the grid.
 * Instead of a straight diagonal line, creates a path that mimics turning
 * at intersections — much more realistic on a map.
 */
function generateStableRoute(start, end) {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  const dist = Math.hypot(endLat - startLat, endLng - startLng);

  // For short distances, use a simple L-shaped turn
  if (dist < 0.02) {
    return [
      [startLat, startLng],
      [startLat, endLng], // Go horizontal first
      [endLat, endLng],
    ];
  }

  // For longer routes, create multi-segment L-turns that mimic road navigation
  const segments = Math.max(3, Math.ceil(dist / 0.01));
  const points = [[startLat, startLng]];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Alternate between moving along lat and lng to create step-like pattern
    if (i % 2 === 1) {
      // Move along latitude (N-S road)
      const lat = startLat + (endLat - startLat) * t;
      const lng = points[points.length - 1][1]; // Keep same lng
      points.push([lat, lng]);
    } else {
      // Move along longitude (E-W road)  
      const lat = points[points.length - 1][0]; // Keep same lat
      const lng = startLng + (endLng - startLng) * t;
      points.push([lat, lng]);
    }
  }

  points.push([endLat, endLng]);
  return points;
}

/**
 * Fetch a driving route between two points using OSRM with fallbacks.
 * Uses longer timeout and retries across multiple OSRM servers.
 * @param {[number, number]} start [lat, lng]
 * @param {[number, number]} end [lat, lng]
 * @returns {Promise<Object|null>} Route data with geometry and duration, or null if failed
 */
export async function fetchRoute(start, end) {
  if (!start || !end) return null;
  
  const cacheKey = `${start[0].toFixed(5)},${start[1].toFixed(5)}-${end[0].toFixed(5)},${end[1].toFixed(5)}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  // Try each OSRM endpoint with generous timeout
  for (const baseUrl of OSRM_ENDPOINTS) {
    try {
      const url = `${baseUrl}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      
      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0];
          const result = {
            geometry: route.geometry.coordinates.map(c => [c[1], c[0]]),
            distance: route.distance,
            duration: route.duration
          };
          console.log(`✓ OSRM route fetched: ${result.geometry.length} road points from ${baseUrl.split('/')[2]}`);
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn(`OSRM timeout/error (${baseUrl.split('/')[2]}):`, e.message);
    }
  }

  // Second attempt: retry the primary endpoint with longer timeout
  try {
    const url = `${OSRM_ENDPOINTS[0]}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0];
        const result = {
          geometry: route.geometry.coordinates.map(c => [c[1], c[0]]),
          distance: route.distance,
          duration: route.duration
        };
        console.log(`✓ OSRM retry succeeded: ${result.geometry.length} road points`);
        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (e) {
    console.warn('OSRM retry also failed:', e.message);
  }

  // Fallback: road-like L-turn path
  console.warn('⚠️ All OSRM servers failed — using grid-based fallback route');
  const geometry = generateStableRoute(start, end);
  const distance = Math.hypot(end[0] - start[0], end[1] - start[1]) * 111319;
  const result = {
    geometry,
    distance,
    duration: distance / 13 // ~45km/h
  };
  routeCache.set(cacheKey, result);
  return result;
}
