import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjyhhecmkqhfiedvlioz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qeWhoZWNta3FoZmllZHZsaW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTQzMDEsImV4cCI6MjA4NzczMDMwMX0.rzVetEP4KKwhSkuQ8EvZQ8uEGBVLFDoM_-J1p-KkA0w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error, count } = await supabase.from('ambulances').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Count:', count);
  }
}

test();
