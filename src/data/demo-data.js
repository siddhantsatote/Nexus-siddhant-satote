// Demo data used when Supabase is not configured
export const DEMO_AMBULANCES = [
  { id: 'amb-1', unit_code: 'PUN-A1', type: 'ALS', status: 'available', location_lat: 18.5204, location_lng: 73.8567, driver_name: 'Rajesh Kumar', driver_phone: '+91-9876543210', zone: 'Pune-Central' },
  { id: 'amb-2', unit_code: 'PUN-A2', type: 'BLS', status: 'available', location_lat: 18.5074, location_lng: 73.8077, driver_name: 'Amit Patil', driver_phone: '+91-9876543211', zone: 'Pune-West' },
  { id: 'amb-3', unit_code: 'PUN-A3', type: 'ALS', status: 'dispatched', location_lat: 18.5679, location_lng: 73.9143, driver_name: 'Suresh Nair', driver_phone: '+91-9876543212', zone: 'Pune-East' },
  { id: 'amb-4', unit_code: 'PUN-A4', type: 'BLS', status: 'available', location_lat: 18.5089, location_lng: 73.9259, driver_name: 'Deepak Sharma', driver_phone: '+91-9876543213', zone: 'Pune-South' },
  { id: 'amb-5', unit_code: 'PUN-A5', type: 'ALS', status: 'available', location_lat: 18.5515, location_lng: 73.8225, driver_name: 'Vikram Singh', driver_phone: '+91-9876543214', zone: 'Pune-North' },
  { id: 'amb-6', unit_code: 'PUN-A6', type: 'BLS', status: 'available', location_lat: 18.4900, location_lng: 73.8500, driver_name: 'Ravi Verma', driver_phone: '+91-9876543215', zone: 'Pune-South' },
  { id: 'amb-7', unit_code: 'PUN-A7', type: 'ALS', status: 'returning', location_lat: 18.5250, location_lng: 73.8750, driver_name: 'Manoj Tiwari', driver_phone: '+91-9876543216', zone: 'Pune-Central' },
  { id: 'amb-8', unit_code: 'PUN-A8', type: 'ALS', status: 'available', location_lat: 18.5800, location_lng: 73.7400, driver_name: 'Karthik Reddy', driver_phone: '+91-9876543217', zone: 'Pune-West' },
  { id: 'amb-9', unit_code: 'PUN-A9', type: 'BLS', status: 'available', location_lat: 18.4500, location_lng: 73.8800, driver_name: 'Prashanth Gowda', driver_phone: '+91-9876543218', zone: 'Pune-South' },
  { id: 'amb-10', unit_code: 'PUN-A10', type: 'BLS', status: 'offline', location_lat: 18.6000, location_lng: 73.9000, driver_name: 'Ganesh Hegde', driver_phone: '+91-9876543219', zone: 'Pune-North' },
];

export const DEMO_HOSPITALS = [
  { id: 'hosp-1', name: 'Sassoon Hospital', location_lat: 18.5276, location_lng: 73.8724, icu_beds_available: 15, general_beds_available: 120, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'cardiac', 'neuro', 'burns'] },
  { id: 'hosp-2', name: 'Sahyadri Hospital', location_lat: 18.5126, location_lng: 73.8344, icu_beds_available: 8, general_beds_available: 35, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['cardiac', 'neuro', 'ortho'] },
  { id: 'hosp-3', name: 'Noble Hospital', location_lat: 18.5034, location_lng: 73.9214, icu_beds_available: 12, general_beds_available: 80, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'cardiac', 'neuro', 'burns', 'pediatric'] },
  { id: 'hosp-4', name: 'Ruby Hall Clinic', location_lat: 18.5303, location_lng: 73.8770, icu_beds_available: 10, general_beds_available: 95, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'burns', 'ortho'] },
  { id: 'hosp-5', name: "Deenanath Mangeshkar Hospital", location_lat: 18.5055, location_lng: 73.8322, icu_beds_available: 14, general_beds_available: 150, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['cardiac', 'neuro', 'ortho', 'pediatric'] },
  { id: 'hosp-6', name: 'Jehangir Hospital', location_lat: 18.5290, location_lng: 73.8765, icu_beds_available: 9, general_beds_available: 85, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['trauma', 'ortho', 'general'] },
];

export const DEMO_INCIDENTS = [
  { id: 'inc-1', priority: 'P1', incident_type: 'cardiac', status: 'open', caller_description: 'Middle-aged man collapsed on the road, not breathing. Near Shaniwar Wada.', location_lat: 18.5195, location_lng: 73.8553, location_raw: 'Near Shaniwar Wada, Shaniwar Peth, Pune', created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'inc-2', priority: 'P2', incident_type: 'accident', status: 'dispatched', caller_description: 'Two-wheeler accident on Karve Road, rider has visible leg fracture, conscious but in pain.', location_lat: 18.5050, location_lng: 73.8300, location_raw: 'Karve Road near Nal Stop, Pune', created_at: new Date(Date.now() - 12 * 60000).toISOString(), assigned_ambulance: 'amb-3' },
  { id: 'inc-3', priority: 'P3', incident_type: 'other', status: 'open', caller_description: 'Minor burn on hand from cooking oil. Patient is stable, needs dressing.', location_lat: 18.5670, location_lng: 73.9140, location_raw: 'Viman Nagar, Pune', created_at: new Date(Date.now() - 20 * 60000).toISOString() },
];
