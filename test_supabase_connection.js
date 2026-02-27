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

async function testInsert() {
  const { data, error } = await supabase.from('incidents').insert([{
    priority: 'P1',
    incident_type: 'cardiac',
    status: 'open',
    caller_description: 'TEST EMERGENCY: Man collapsed near Shaniwar Wada.',
    location_raw: 'Shaniwar Wada, Pune',
    location_lat: 18.5195,
    location_lng: 73.8553
  }]).select().single();

  if (error) {
    console.error('Error inserting incident:', error);
  } else {
    console.log('Successfully inserted incident:', data.id);
  }
}

testInsert();
