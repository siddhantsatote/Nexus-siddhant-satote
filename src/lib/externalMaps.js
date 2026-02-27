
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
  const url = `${OSRM_URL}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok') {
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
    return null;
  }
}
