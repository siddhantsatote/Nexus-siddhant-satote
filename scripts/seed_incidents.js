    import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleIncidents = [
  { priority: 'P1', incident_type: 'cardiac', status: 'open', caller_description: 'Middle-aged man collapsed on the road, not breathing. Near Shaniwar Wada.', location_lat: 18.5195, location_lng: 73.8553, location_raw: 'Near Shaniwar Wada, Shaniwar Peth, Pune' },
  { priority: 'P1', incident_type: 'respiratory', status: 'open', caller_description: 'Elderly woman having severe difficulty breathing, suspected asthma attack. Near Swargate.', location_lat: 18.5018, location_lng: 73.8636, location_raw: 'Swargate Bus Stand, Pune' },
  { priority: 'P2', incident_type: 'trauma', status: 'open', caller_description: 'Construction worker fell from 10ft, conscious but head injury and bleeding from arm.', location_lat: 18.5913, location_lng: 73.7389, location_raw: 'Hinjewadi Phase 1, near IT Park' },
  { priority: 'P1', incident_type: 'accident', status: 'open', caller_description: 'Major car pileup on Mumbai-Pune Highway, multiple injuries reported.', location_lat: 18.6416, location_lng: 73.7715, location_raw: 'Chinchwad Highway, Pune' }
];

async function seed() {
  console.log('🌱 Seeding sample incidents...');
  const { data, error } = await supabase.from('incidents').insert(sampleIncidents).select();
  
  if (error) {
    console.error('Error seeding incidents:', error);
  } else {
    console.log(`✅ Successfully seeded ${data.length} incidents!`);
  }
}

seed();
