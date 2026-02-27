import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file
const envFile = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => line.split('=').map(part => part.trim()))
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Clearing existing data...');
  
  // Delete incidents first (due to foreign keys)
  const { error: errorInc } = await supabase.from('incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errorInc) console.error('Error clearing incidents:', errorInc);

  const { error: errorAmb } = await supabase.from('ambulances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errorAmb) console.error('Error clearing ambulances:', errorAmb);

  const { error: errorHosp } = await supabase.from('hospitals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errorHosp) console.error('Error clearing hospitals:', errorHosp);

  console.log('Inserting new Pune-focused data...');

  // Pune & Pimpri Chinchwad Ambulances
  const ambulances = [
    // Shaniwar Wada & Central Pune
    { unit_code: 'PUN-A1', type: 'ALS', status: 'available', location_lat: 18.5204, location_lng: 73.8567, driver_name: 'Rajesh Kumar', driver_phone: '+91-9876543210', zone: 'Shaniwar Wada' },
    { unit_code: 'PUN-A2', type: 'BLS', status: 'available', location_lat: 18.5074, location_lng: 73.8077, driver_name: 'Amit Patil', driver_phone: '+91-9876543211', zone: 'Karve Road' },
    { unit_code: 'PUN-A11', type: 'ALS', status: 'available', location_lat: 18.5150, location_lng: 73.8150, driver_name: 'Harish Desai', driver_phone: '+91-9876543320', zone: 'Camp' },
    { unit_code: 'PUN-A12', type: 'BLS', status: 'available', location_lat: 18.5100, location_lng: 73.8050, driver_name: 'Nilesh Joshi', driver_phone: '+91-9876543321', zone: 'Sadashiv Peth' },
    
    // Viman Nagar & East Pune
    { unit_code: 'PUN-A3', type: 'ALS', status: 'available', location_lat: 18.5679, location_lng: 73.9143, driver_name: 'Suresh Nair', driver_phone: '+91-9876543212', zone: 'Viman Nagar' },
    { unit_code: 'PUN-A13', type: 'ALS', status: 'available', location_lat: 18.5600, location_lng: 73.9200, driver_name: 'Priya Tanvi', driver_phone: '+91-9876543322', zone: 'Kharadi' },
    { unit_code: 'PUN-A22', type: 'BLS', status: 'available', location_lat: 18.5650, location_lng: 73.9250, driver_name: 'Kavya Singh', driver_phone: '+91-9876543338', zone: 'Magarpatta' },
    
    // South Pune - Hadapsar & Yerawada
    { unit_code: 'PUN-A4', type: 'BLS', status: 'available', location_lat: 18.5089, location_lng: 73.9259, driver_name: 'Deepak Sharma', driver_phone: '+91-9876543213', zone: 'Hadapsar' },
    { unit_code: 'PUN-A23', type: 'ALS', status: 'available', location_lat: 18.4900, location_lng: 73.9100, driver_name: 'Arjun Reddy', driver_phone: '+91-9876543339', zone: 'Yerawada' },
    { unit_code: 'PUN-A24', type: 'BLS', status: 'available', location_lat: 18.4800, location_lng: 73.8950, driver_name: 'Sneha Gupta', driver_phone: '+91-9876543340', zone: 'Mundhwa' },
    
    // North Pune - Aundh & Baner
    { unit_code: 'PUN-A5', type: 'ALS', status: 'available', location_lat: 18.5515, location_lng: 73.8225, driver_name: 'Vikram Singh', driver_phone: '+91-9876543214', zone: 'Aundh' },
    { unit_code: 'PUN-A25', type: 'BLS', status: 'available', location_lat: 18.5600, location_lng: 73.8050, driver_name: 'Pooja Menon', driver_phone: '+91-9876543341', zone: 'Baner' },
    { unit_code: 'PUN-A26', type: 'ALS', status: 'available', location_lat: 18.5550, location_lng: 73.7900, driver_name: 'Varun Patel', driver_phone: '+91-9876543342', zone: 'Pashan' },
    
    // Hinjewadi & Wakad (IT Hub)
    { unit_code: 'PUN-A6', type: 'BLS', status: 'available', location_lat: 18.5900, location_lng: 73.7400, driver_name: 'Ravi Verma', driver_phone: '+91-9876543215', zone: 'Hinjewadi' },
    { unit_code: 'PUN-A19', type: 'ALS', status: 'available', location_lat: 18.5750, location_lng: 73.7450, driver_name: 'Anand Bhagat', driver_phone: '+91-9876543335', zone: 'Wakad' },
    { unit_code: 'PUN-A20', type: 'BLS', status: 'available', location_lat: 18.5700, location_lng: 73.7500, driver_name: 'Gaurav Jadhav', driver_phone: '+91-9876543336', zone: 'Wakad Tech Park' },
    { unit_code: 'PUN-A21', type: 'ALS', status: 'available', location_lat: 18.5800, location_lng: 73.7380, driver_name: 'Chandrika Iyer', driver_phone: '+91-9876543337', zone: 'Hinjewadi Phase 2' },
    
    // Katraj & Bavdhan (South West)
    { unit_code: 'PUN-A7', type: 'ALS', status: 'available', location_lat: 18.5250, location_lng: 73.8750, driver_name: 'Manoj Tiwari', driver_phone: '+91-9876543216', zone: 'Deccan' },
    { unit_code: 'PUN-A8', type: 'ALS', status: 'available', location_lat: 18.4500, location_lng: 73.8800, driver_name: 'Karthik Reddy', driver_phone: '+91-9876543217', zone: 'Katraj' },
    { unit_code: 'PUN-A27', type: 'BLS', status: 'available', location_lat: 18.4600, location_lng: 73.8600, driver_name: 'Maya Sharma', driver_phone: '+91-9876543343', zone: 'Bavdhan' },
    
    // Koregaon Park & Kalyani Nagar
    { unit_code: 'PUN-A10', type: 'ALS', status: 'available', location_lat: 18.5200, location_lng: 73.8400, driver_name: 'Prakash Deshmukh', driver_phone: '+91-9876543219', zone: 'Koregaon Park' },
    { unit_code: 'PUN-A28', type: 'BLS', status: 'available', location_lat: 18.5300, location_lng: 73.8600, driver_name: 'Riya Iyer', driver_phone: '+91-9876543344', zone: 'Kalyani Nagar' },
    
    // Shivajinagar & Nagar Road
    { unit_code: 'PUN-A9', type: 'BLS', status: 'available', location_lat: 18.5500, location_lng: 73.9300, driver_name: 'Sunil Ghadge', driver_phone: '+91-9876543218', zone: 'Shivajinagar' },
    { unit_code: 'PUN-A29', type: 'ALS', status: 'available', location_lat: 18.5400, location_lng: 73.8200, driver_name: 'Arjun Singh', driver_phone: '+91-9876543345', zone: 'Nagar Road' },
    
    // Railway Station & Cantonment
    { unit_code: 'PUN-A30', type: 'ALS', status: 'available', location_lat: 18.5289, location_lng: 73.8744, driver_name: 'Rohit Kumar', driver_phone: '+91-9876543346', zone: 'Railway Station' },
    { unit_code: 'PUN-A31', type: 'BLS', status: 'available', location_lat: 18.5350, location_lng: 73.8650, driver_name: 'Simran Kaur', driver_phone: '+91-9876543347', zone: 'Cantonment' },

    // Pimpri Zone
    { unit_code: 'PIM-A1', type: 'ALS', status: 'available', location_lat: 18.6298, location_lng: 73.7997, driver_name: 'Ashok Gavhane', driver_phone: '+91-9876543328', zone: 'Pimpri' },
    { unit_code: 'PIM-A2', type: 'BLS', status: 'available', location_lat: 18.6250, location_lng: 73.7900, driver_name: 'Vishnu Nair', driver_phone: '+91-9876543329', zone: 'Pimpri Industrial' },
    { unit_code: 'PIM-A3', type: 'ALS', status: 'available', location_lat: 18.6350, location_lng: 73.8100, driver_name: 'Rajendra Singh', driver_phone: '+91-9876543330', zone: 'Akurdi' },
    { unit_code: 'PIM-A4', type: 'BLS', status: 'available', location_lat: 18.6300, location_lng: 73.7850, driver_name: 'Isha Mehta', driver_phone: '+91-9876543348', zone: 'Ravet' },

    // Chinchwad Zone
    { unit_code: 'CHI-A1', type: 'ALS', status: 'available', location_lat: 18.6400, location_lng: 73.8200, driver_name: 'Sandeep Sharma', driver_phone: '+91-9876543331', zone: 'Chinchwad' },
    { unit_code: 'CHI-A2', type: 'BLS', status: 'available', location_lat: 18.6350, location_lng: 73.8150, driver_name: 'Akshay Joshi', driver_phone: '+91-9876543332', zone: 'Talegaon' },
    { unit_code: 'CHI-A3', type: 'ALS', status: 'available', location_lat: 18.6450, location_lng: 73.8300, driver_name: 'Pranav Rao', driver_phone: '+91-9876543333', zone: 'Dapodi' },
    { unit_code: 'CHI-A4', type: 'BLS', status: 'available', location_lat: 18.6300, location_lng: 73.8100, driver_name: 'Neha Kapoor', driver_phone: '+91-9876543334', zone: 'Nigdi' },
    { unit_code: 'CHI-A5', type: 'ALS', status: 'available', location_lat: 18.6500, location_lng: 73.8250, driver_name: 'Ankur Malhotra', driver_phone: '+91-9876543349', zone: 'Kasarwadi' }
  ];

  const { data: ambData, error: ambError } = await supabase.from('ambulances').insert(ambulances).select();
  if (ambError) console.error('Error inserting ambulances:', ambError);

  // Pune Hospitals
  const hospitals = [
    { name: 'Sassoon General Hospital', location_lat: 18.5276, location_lng: 73.8724, icu_beds_available: 15, general_beds_available: 120, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'cardiac', 'neuro', 'burns'] },
    { name: 'Sahyadri Super Speciality Hospital, Karve Rd', location_lat: 18.5126, location_lng: 73.8344, icu_beds_available: 8, general_beds_available: 35, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['cardiac', 'neuro', 'ortho'] },
    { name: 'Noble Hospital, Magarpatta', location_lat: 18.5034, location_lng: 73.9214, icu_beds_available: 12, general_beds_available: 80, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'cardiac', 'neuro', 'burns', 'pediatric'] },
    { name: 'Ruby Hall Clinic, Bund Garden', location_lat: 18.5303, location_lng: 73.8770, icu_beds_available: 10, general_beds_available: 95, trauma_capable: true, cardiac_cath: true, burn_unit: true, specialties: ['trauma', 'burns', 'ortho'] },
    { name: 'Deenanath Mangeshkar Hospital', location_lat: 18.5055, location_lng: 73.8322, icu_beds_available: 14, general_beds_available: 150, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['cardiac', 'neuro', 'ortho', 'pediatric'] },
    { name: 'Jehangir Hospital', location_lat: 18.5290, location_lng: 73.8765, icu_beds_available: 9, general_beds_available: 85, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['trauma', 'ortho', 'general'] },
    { name: 'Jupiter Hospital, Baner', location_lat: 18.5600, location_lng: 73.7800, icu_beds_available: 20, general_beds_available: 100, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['trauma', 'cardiac', 'neuro', 'ortho'] },
    { name: 'Columbia Asia Hospital, Kharadi', location_lat: 18.5520, location_lng: 73.9400, icu_beds_available: 10, general_beds_available: 60, trauma_capable: true, cardiac_cath: true, burn_unit: false, specialties: ['cardiac', 'ortho', 'general'] }
  ];

  const { data: hospData, error: hospError } = await supabase.from('hospitals').insert(hospitals).select();
  if (hospError) console.error('Error inserting hospitals:', hospError);

  // Pune Incidents
  const incidents = [
    { priority: 'P1', incident_type: 'cardiac', status: 'open', caller_description: 'Elderly man collapsed at Shaniwar Wada garden area.', location_lat: 18.5195, location_lng: 73.8553, location_raw: 'Shaniwar Wada, Pune' },
    { priority: 'P2', incident_type: 'accident', status: 'open', caller_description: 'Motorcycle slip near Nal Stop flyover. Rider has arm injury.', location_lat: 18.5050, location_lng: 73.8300, location_raw: 'Karve Road near Nal Stop, Pune' },
    { priority: 'P3', incident_type: 'other', status: 'open', caller_description: 'Woman fainted at Pune Railway Station platform 1.', location_lat: 18.5289, location_lng: 73.8744, location_raw: 'Pune Railway Station' },
    { priority: 'P1', incident_type: 'trauma', status: 'open', caller_description: 'Serious car accident on Mumbai-Pune Expressway near Hinjewadi exit.', location_lat: 18.5900, location_lng: 73.7400, location_raw: 'Expressway Hinjewadi Exit, Pune' },
    { priority: 'P2', incident_type: 'respiratory', status: 'open', caller_description: 'Asthma attack reported at Phoenix Marketcity mall.', location_lat: 18.5622, location_lng: 73.9167, location_raw: 'Phoenix Marketcity, Viman Nagar' }
  ];

  const { data: incData, error: incError } = await supabase.from('incidents').insert(incidents).select();
  if (incError) console.error('Error inserting incidents:', incError);

  console.log('Seeding completed successfully!');
}

seed()
  .then(() => {
    console.log('Seed successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

