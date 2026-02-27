
const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving/',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
  'https://osrm.overpass-api.de/route/v1/driving/'
];

async function testOSRM() {
  const start = [18.5204, 73.8567]; // Pune center
  const end = [18.5500, 73.9000];   // Random point in Pune
  
  for (const baseUrl of OSRM_ENDPOINTS) {
    const url = `${baseUrl}${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    console.log(`Testing ${url}...`);
    try {
      const response = await fetch(url);
      console.log(`Status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Code: ${data.code}`);
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          console.log(`Success! Geometry points: ${data.routes[0].geometry.coordinates.length}`);
          return;
        }
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
  console.log('All OSRM endpoints failed.');
}

testOSRM();
