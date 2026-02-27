-- ============================================================
-- PRAANA-AI — Supabase Schema & Seed Data (PUNE FOCUSED)
-- ============================================================

-- Call Logs table (for Vapi.ai incoming calls)
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vapi_call_id text,
  caller_phone text,
  caller_name text,
  callback_number text,
  transcript text,
  summary text,
  priority text CHECK (priority IN ('P1', 'P2', 'P3')),
  incident_type text,
  location_raw text,
  patient_count int DEFAULT 1,
  patient_condition text,
  call_duration int DEFAULT 0,
  call_status text DEFAULT 'completed',
  linked_incident_id uuid,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ambulances table
CREATE TABLE IF NOT EXISTS ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_code text NOT NULL,
  type text CHECK (type IN ('ALS', 'BLS')),
  status text CHECK (status IN ('available', 'dispatched', 'returning', 'offline')) DEFAULT 'available',
  location_lat float,
  location_lng float,
  driver_name text,
  driver_phone text,
  zone text,
  updated_at timestamptz DEFAULT now()
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location_lat float,
  location_lng float,
  icu_beds_available int DEFAULT 0,
  general_beds_available int DEFAULT 0,
  trauma_capable boolean DEFAULT false,
  cardiac_cath boolean DEFAULT false,
  burn_unit boolean DEFAULT false,
  specialties text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text CHECK (priority IN ('P1', 'P2', 'P3')),
  incident_type text,
  status text DEFAULT 'open',
  caller_description text,
  ai_triage_json jsonb,
  location_lat float,
  location_lng float,
  location_raw text,
  assigned_ambulance uuid REFERENCES ambulances(id),
  assigned_hospital uuid REFERENCES hospitals(id),
  created_at timestamptz DEFAULT now(),
  dispatched_at timestamptz,
  hospital_arrival_at timestamptz,
  resolved_at timestamptz
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Pune Ambulances
INSERT INTO ambulances (unit_code, type, status, location_lat, location_lng, driver_name, driver_phone, zone) VALUES
('PUN-A1', 'ALS', 'available', 18.5204, 73.8567, 'Rajesh Kumar', '+91-9876543210', 'Pune-Central'),
('PUN-A2', 'BLS', 'available', 18.5074, 73.8077, 'Amit Patil', '+91-9876543211', 'Pune-West'),
('PUN-A3', 'ALS', 'dispatched', 18.5679, 73.9143, 'Suresh Nair', '+91-9876543212', 'Pune-East'),
('PUN-A4', 'BLS', 'available', 18.5089, 73.9259, 'Deepak Sharma', '+91-9876543213', 'Pune-South'),
('PUN-A5', 'ALS', 'available', 18.5515, 73.8225, 'Vikram Singh', '+91-9876543214', 'Pune-North'),
('PUN-A6', 'BLS', 'available', 18.5900, 73.7400, 'Ravi Verma', '+91-9876543215', 'Pune-Hinjewadi'),
('PUN-A7', 'ALS', 'returning', 18.5250, 73.8750, 'Manoj Tiwari', '+91-9876543216', 'Pune-Camp'),
('PUN-A8', 'ALS', 'available', 18.4500, 73.8800, 'Karthik Reddy', '+91-9876543217', 'Pune-Katraj');

-- Pune Hospitals
INSERT INTO hospitals (name, location_lat, location_lng, icu_beds_available, general_beds_available, trauma_capable, cardiac_cath, burn_unit, specialties) VALUES
('Sassoon Hospital', 18.5276, 73.8724, 15, 120, true, true, true, ARRAY['trauma', 'cardiac', 'neuro', 'burns']),
('Sahyadri Hospital', 18.5126, 73.8344, 8, 35, true, true, false, ARRAY['cardiac', 'neuro', 'ortho']),
('Noble Hospital', 18.5034, 73.9214, 12, 80, true, true, true, ARRAY['trauma', 'cardiac', 'neuro', 'burns', 'pediatric']),
('Ruby Hall Clinic', 18.5303, 73.8770, 10, 95, true, true, true, ARRAY['trauma', 'burns', 'ortho']),
('Deenanath Mangeshkar Hospital', 18.5055, 73.8322, 14, 150, true, true, false, ARRAY['cardiac', 'neuro', 'ortho', 'pediatric']),
('Jehangir Hospital', 18.5290, 73.8765, 9, 85, true, true, false, ARRAY['trauma', 'ortho', 'general']);

-- Sample Pune Incidents
INSERT INTO incidents (priority, incident_type, status, caller_description, location_lat, location_lng, location_raw, created_at) VALUES
('P1', 'cardiac', 'open', 'Middle-aged man collapsed on the road, not breathing. Near Shaniwar Wada.', 18.5195, 73.8553, 'Near Shaniwar Wada, Shaniwar Peth, Pune', now() - interval '5 minutes'),
('P2', 'accident', 'dispatched', 'Two-wheeler accident on Karve Road, rider has visible leg fracture, conscious but in pain.', 18.5050, 73.8300, 'Karve Road near Nal Stop, Pune', now() - interval '12 minutes'),
('P3', 'other', 'open', 'Minor burn on hand from cooking oil. Patient is stable, needs dressing.', 18.5670, 73.9140, 'Viman Nagar, Pune', now() - interval '20 minutes');
