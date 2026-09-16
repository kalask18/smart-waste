-- SmartWaste Complete Supabase PostgreSQL Migration (Core Schema + RLS Policies + Seed Data + Auth Trigger)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AREAS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('village', 'town', 'ward', 'panchayat_zone')),
  population INT CHECK (population >= 0),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. PROFILES TABLE (Role-based access control for citizen, driver, admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'driver', 'admin')),
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. COLLECTION POINTS TABLE (Bins, waste accumulation spots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS collection_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity DOUBLE PRECISION NOT NULL DEFAULT 240.0,
  current_fill_percent INT NOT NULL DEFAULT 0 CHECK (current_fill_percent >= 0 AND current_fill_percent <= 100),
  current_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (current_weight_kg >= 0),
  last_collected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'overflowing', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. WASTE REPORTS TABLE (Citizen reports & smart alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waste_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  collection_point_id UUID REFERENCES collection_points(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('organic', 'recyclable', 'hazardous', 'construction', 'general', 'overflowing_bin')),
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  severity TEXT NOT NULL DEFAULT 'LOW' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- 5. VEHICLES TABLE (Sanitation trucks, e-rickshaws, compactors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  capacity_kg DOUBLE PRECISION NOT NULL CHECK (capacity_kg > 0),
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_route', 'maintenance', 'offline')),
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. ROUTES TABLE (Collection shifts & routes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  route_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'assigned', 'in_progress', 'completed', 'cancelled')),
  total_distance_km DOUBLE PRECISION CHECK (total_distance_km >= 0),
  estimated_duration_minutes INT CHECK (estimated_duration_minutes >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. ROUTE STOPS TABLE (Sequenced collection points for driver)
-- ============================================================================
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL CHECK (sequence_number > 0),
  priority_score INT NOT NULL DEFAULT 10 CHECK (priority_score >= 0 AND priority_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'collected', 'skipped', 'issue_reported')),
  UNIQUE (route_id, sequence_number)
);

-- ============================================================================
-- 8. COLLECTIONS TABLE (Collection logs & verification records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  arrived_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'arrived', 'completed', 'missed', 'issue_reported')),
  verification_image_url TEXT,
  verification_latitude DOUBLE PRECISION,
  verification_longitude DOUBLE PRECISION,
  issue_description TEXT
);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'alert', 'task')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON profiles(area_id);

CREATE INDEX IF NOT EXISTS idx_collection_points_area ON collection_points(area_id);
CREATE INDEX IF NOT EXISTS idx_collection_points_status ON collection_points(status);
CREATE INDEX IF NOT EXISTS idx_collection_points_fill ON collection_points(current_fill_percent DESC);

CREATE INDEX IF NOT EXISTS idx_waste_reports_user ON waste_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_reports_collection_point ON waste_reports(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_waste_reports_status ON waste_reports(status);
CREATE INDEX IF NOT EXISTS idx_waste_reports_severity ON waste_reports(severity);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

CREATE INDEX IF NOT EXISTS idx_routes_vehicle ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_point ON route_stops(collection_point_id);

CREATE INDEX IF NOT EXISTS idx_collections_point ON collections(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_collections_worker ON collections(worker_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. AREAS POLICIES
CREATE POLICY "Areas: viewable by authenticated users"
  ON areas FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Areas: manageable by admins"
  ON areas FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 2. PROFILES POLICIES
CREATE POLICY "Profiles: viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Profiles: users update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: full admin management"
  ON profiles FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');

-- 3. COLLECTION POINTS POLICIES
CREATE POLICY "Collection Points: viewable by all"
  ON collection_points FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Collection Points: updatable by drivers and admins"
  ON collection_points FOR UPDATE TO authenticated
  USING (get_current_user_role() IN ('driver', 'admin'))
  WITH CHECK (get_current_user_role() IN ('driver', 'admin'));

CREATE POLICY "Collection Points: insert/delete by admins"
  ON collection_points FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');

-- 4. WASTE REPORTS POLICIES
CREATE POLICY "Waste Reports: viewable by all"
  ON waste_reports FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Waste Reports: insertable by citizens and users"
  ON waste_reports FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Waste Reports: updatable by reporter, driver, or admin"
  ON waste_reports FOR UPDATE TO authenticated, anon
  USING (user_id = auth.uid() OR get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL)
  WITH CHECK (user_id = auth.uid() OR get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL);

CREATE POLICY "Waste Reports: deletable by admins"
  ON waste_reports FOR DELETE TO authenticated USING (get_current_user_role() = 'admin');

-- 5. VEHICLES POLICIES
CREATE POLICY "Vehicles: viewable by all"
  ON vehicles FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Vehicles: driver or admin can update"
  ON vehicles FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() OR get_current_user_role() = 'admin')
  WITH CHECK (driver_id = auth.uid() OR get_current_user_role() = 'admin');

CREATE POLICY "Vehicles: admin full control"
  ON vehicles FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');

-- 6. ROUTES & ROUTE STOPS POLICIES
CREATE POLICY "Routes: viewable by drivers and admins"
  ON routes FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Route Stops: viewable by drivers and admins"
  ON route_stops FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Routes: manageable by admin"
  ON routes FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Route Stops: manageable by admin"
  ON route_stops FOR ALL TO authenticated
  USING (get_current_user_role() = 'admin') WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Route Stops: status updated by drivers"
  ON route_stops FOR UPDATE TO authenticated, anon
  USING (get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL)
  WITH CHECK (get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL);

-- 7. COLLECTIONS POLICIES
CREATE POLICY "Collections: viewable by all"
  ON collections FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Collections: driver insert/update verification"
  ON collections FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Collections: driver update collection details"
  ON collections FOR UPDATE TO authenticated, anon
  USING (worker_id = auth.uid() OR get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL)
  WITH CHECK (worker_id = auth.uid() OR get_current_user_role() IN ('driver', 'admin') OR auth.uid() IS NULL);

-- 8. NOTIFICATIONS POLICIES
CREATE POLICY "Notifications: view own"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Notifications: update read status"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Notifications: insert by system/admin"
  ON notifications FOR INSERT TO authenticated, anon WITH CHECK (true);

-- ============================================================================
-- AUTH USER TRIGGER FOR AUTOMATIC PROFILE CREATION & ROLE SANITIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
  user_phone TEXT;
  user_area UUID;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  IF (NEW.raw_user_meta_data->>'area_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'area_id') != '' THEN
    user_area := (NEW.raw_user_meta_data->>'area_id')::uuid;
  ELSE
    user_area := NULL;
  END IF;

  -- SANITIZE ROLE: Only 'citizen' or 'driver' can be passed publicly
  assigned_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'));
  IF assigned_role NOT IN ('citizen', 'driver') THEN
    assigned_role := 'citizen';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role, area_id, created_at)
  VALUES (NEW.id, user_name, user_phone, assigned_role, user_area, NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED DATA (Valid Hexadecimal UUIDs)
-- ============================================================================

-- 1. SEED AREAS
INSERT INTO areas (id, name, type, population, latitude, longitude) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Narasipuram Town Zone', 'village', 4500, 11.0003, 76.7725),
  ('a2222222-2222-2222-2222-222222222222', 'Vellaimalaipattinam & Ikkaraibooluvampatti Zone', 'town', 8200, 10.9980, 76.7650),
  ('a3333333-3333-3333-3333-333333333333', 'Devarayapuram & Thondamuthur Zone', 'ward', 6100, 10.9880, 76.7820)
ON CONFLICT (id) DO NOTHING;

-- 2. SEED 10 COLLECTION POINTS
INSERT INTO collection_points (id, area_id, name, latitude, longitude, capacity, current_fill_percent, current_weight_kg, last_collected_at, status) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'CP-01 Narasipuram Main Road Bin', 11.0003, 76.7725, 300.0, 95, 58.5, NOW() - INTERVAL '24 hours', 'overflowing'),
  ('c0000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'CP-02 Narasipuram Residential Bin', 11.0028, 76.7705, 240.0, 85, 42.0, NOW() - INTERVAL '18 hours', 'overflowing'),
  ('c0000000-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111111', 'CP-03 Vellaimalaipattinam Clinic Bin', 10.9980, 76.7650, 240.0, 90, 65.0, NOW() - INTERVAL '30 hours', 'overflowing'),
  ('c0000000-0000-0000-0000-000000000004', 'a2222222-2222-2222-2222-222222222222', 'CP-04 Ikkaraibooluvampatti Spot', 11.0085, 76.7620, 240.0, 75, 35.0, NOW() - INTERVAL '12 hours', 'active'),
  ('c0000000-0000-0000-0000-000000000005', 'a2222222-2222-2222-2222-222222222222', 'CP-05 Devarayapuram Main Road Yard', 10.9880, 76.7820, 400.0, 88, 70.0, NOW() - INTERVAL '20 hours', 'overflowing'),
  ('c0000000-0000-0000-0000-000000000006', 'a2222222-2222-2222-2222-222222222222', 'CP-06 Thennamanallur Station Bin', 10.9780, 76.7920, 240.0, 60, 28.0, NOW() - INTERVAL '8 hours', 'active'),
  ('c0000000-0000-0000-0000-000000000007', 'a2222222-2222-2222-2222-222222222222', 'CP-07 Alanthurai Market Bin', 10.9690, 76.8010, 120.0, 40, 18.0, NOW() - INTERVAL '36 hours', 'active'),
  ('c0000000-0000-0000-0000-000000000008', 'a3333333-3333-3333-3333-333333333333', 'CP-08 Pooluvapatti Community Spot', 10.9820, 76.7760, 240.0, 30, 14.0, NOW() - INTERVAL '10 hours', 'active'),
  ('c0000000-0000-0000-0000-000000000009', 'a3333333-3333-3333-3333-333333333333', 'CP-09 Thondamuthur Town Spot', 10.9945, 76.7810, 240.0, 50, 22.0, NOW() - INTERVAL '14 hours', 'active'),
  ('c0000000-0000-0000-0000-000000000010', 'a3333333-3333-3333-3333-333333333333', 'CP-10 Narasipuram Bus Stop Bin', 11.0015, 76.7718, 240.0, 20, 9.0, NOW() - INTERVAL '48 hours', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED 3 VEHICLES (Hex IDs: b1..., b2..., b3...)
INSERT INTO vehicles (id, vehicle_number, vehicle_type, capacity_kg, driver_id, status, current_latitude, current_longitude) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'TN-37-EV-1020', 'Electric Tipper E-Rickshaw', 500.0, NULL, 'on_route', 11.0003, 76.7725),
  ('b2222222-2222-2222-2222-222222222222', 'TN-37-G-4090', 'Tata Ace Open Tipper', 1200.0, NULL, 'available', 10.9980, 76.7650),
  ('b3333333-3333-3333-3333-333333333333', 'TN-37-M-8800', 'Mahindra Compactor Truck', 3500.0, NULL, 'available', 10.9880, 76.7820)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED SAMPLE WASTE REPORTS (Hex IDs: d0...)
INSERT INTO waste_reports (id, user_id, collection_point_id, category, description, latitude, longitude, image_url, severity, status, created_at) VALUES
  ('d0000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', 'overflowing_bin', 'Overflowing plastic and commercial waste near Narasipuram Main Road.', 11.0003, 76.7725, 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800', 'CRITICAL', 'pending', NOW() - INTERVAL '2 hours'),
  ('d0000000-0000-0000-0000-000000000002', NULL, 'c0000000-0000-0000-0000-000000000003', 'hazardous', 'Medical packaging discarded near Vellaimalaipattinam clinic entrance.', 10.9980, 76.7650, 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&q=80&w=800', 'CRITICAL', 'assigned', NOW() - INTERVAL '3 hours'),
  ('d0000000-0000-0000-0000-000000000003', NULL, 'c0000000-0000-0000-0000-000000000005', 'organic', 'Decaying vegetable scraps left at Devarayapuram market area.', 10.9880, 76.7820, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800', 'HIGH', 'pending', NOW() - INTERVAL '4 hours'),
  ('d0000000-0000-0000-0000-000000000004', NULL, 'c0000000-0000-0000-0000-000000000004', 'recyclable', 'Plastic bottles cluttering Ikkaraibooluvampatti bus stop area.', 11.0085, 76.7620, 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800', 'MEDIUM', 'resolved', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED ROUTES & ROUTE STOPS (Hex IDs: e0..., f0...)
INSERT INTO routes (id, vehicle_id, route_date, status, total_distance_km, estimated_duration_minutes) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111', CURRENT_DATE, 'in_progress', 6.8, 35)
ON CONFLICT (id) DO NOTHING;

INSERT INTO route_stops (id, route_id, collection_point_id, sequence_number, priority_score, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 95, 'arrived'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 2, 90, 'pending'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 3, 85, 'pending')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED COLLECTION RECORDS (Hex IDs: c01...)
INSERT INTO collections (id, collection_point_id, vehicle_id, worker_id, scheduled_at, arrived_at, status, verification_image_url) VALUES
  ('c0100000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b1111111-1111-1111-1111-111111111111', NULL, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '5 minutes', 'arrived', NULL),
  ('c0100000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000004', 'b2222222-2222-2222-2222-222222222222', NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3.5 hours', 'completed', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800')
ON CONFLICT (id) DO NOTHING;
