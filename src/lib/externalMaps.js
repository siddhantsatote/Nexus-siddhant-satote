
/**
 * External Map APIs (Free Alternatives to Google Maps)
 * - Overpass API: OpenStreetMap hospital search
 * - OSRM: Open Source Routing Machine for real-time directions
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving/';

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
 * Fetch a driving route between two points using OSRM
 * @param {[number, number]} start [lat, lng]
 * @param {[number, number]} end [lat, lng]
 * @returns {Promise<Object>} Route data with geometry and duration
 */
export async function fetchRoute(start, end) {
  // Use OSRM with full overview and annotations for better road following
  const url = `${OSRM_URL}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSRM network response was not ok');
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM error: ${data.code}`);
    }
    
    const route = data.routes[0];
    return {
      geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert [lng, lat] to [lat, lng]
      distance: route.distance, // meters
      duration: route.duration // seconds
    };
  } catch (error) {
    console.error('Failed to fetch route from OSRM:', error);
    // Fallback to straight line if OSRM fails, so we at least see something
    return {
      geometry: [start, end],
      distance: Math.hypot(start[0] - end[0], start[1] - end[1]) * 111000,
      duration: 600
    };
  }
}
