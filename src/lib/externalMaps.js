
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
 * Fetch a driving route between two points using OSRM with fallbacks
 * @param {[number, number]} start [lat, lng]
 * @param {[number, number]} end [lat, lng]
 * @returns {Promise<Object>} Route data with geometry and duration
 */
export async function fetchRoute(start, end) {
  // Try each endpoint in order
  for (const baseUrl of OSRM_ENDPOINTS) {
    const url = `${baseUrl}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) continue; // Try next endpoint
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert [lng, lat] to [lat, lng]
          distance: route.distance, // meters
          duration: route.duration // seconds
        };
      }
    } catch (error) {
      console.warn(`OSRM endpoint ${baseUrl} failed:`, error.message);
      continue;
    }
  }

  // Final fallback to straight line if all endpoints fail
  console.error('All OSRM routing endpoints failed. Falling back to straight line.');
  return {
    geometry: [start, end],
    distance: Math.hypot(start[0] - end[0], start[1] - end[1]) * 111000,
    duration: 600
  };
}
