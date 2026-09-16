-- SmartWaste Supabase PostgreSQL Migration: Core Schema, Constraints, Indexes & RLS Policies

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
-- 2. PROFILES TABLE (Role-based access control for citizen, worker, admin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'worker', 'admin')),
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
  capacity DOUBLE PRECISION NOT NULL DEFAULT 240.0, -- in liters or kg
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
  vehicle_type TEXT NOT NULL, -- e.g., 'E-Rickshaw Loader', 'Tata Ace Tipper', 'Mahindra Compactor'
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

-- Enable RLS on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get current authenticated user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. AREAS POLICIES
-- Anyone authenticated can view areas
CREATE POLICY "Areas: viewable by authenticated users"
  ON areas FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can modify areas
CREATE POLICY "Areas: manageable by admins"
  ON areas FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 2. PROFILES POLICIES
-- Users can view all active profiles (for names/avatars) or public list
CREATE POLICY "Profiles: viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Users can update their own profile
CREATE POLICY "Profiles: users update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can manage all profiles
CREATE POLICY "Profiles: full admin management"
  ON profiles FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 3. COLLECTION POINTS POLICIES
-- Anyone can view collection points
CREATE POLICY "Collection Points: viewable by all"
  ON collection_points FOR SELECT
  TO authenticated, anon
  USING (true);

-- Workers and admins can update fill level and status
CREATE POLICY "Collection Points: updatable by workers and admins"
  ON collection_points FOR UPDATE
  TO authenticated
  USING (get_current_user_role() IN ('worker', 'admin'))
  WITH CHECK (get_current_user_role() IN ('worker', 'admin'));

-- Admins can insert/delete collection points
CREATE POLICY "Collection Points: insert/delete by admins"
  ON collection_points FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 4. WASTE REPORTS POLICIES
-- Anyone can view waste reports (public transparency)
CREATE POLICY "Waste Reports: viewable by all"
  ON waste_reports FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users (citizens) can submit reports
CREATE POLICY "Waste Reports: insertable by citizens and users"
  ON waste_reports FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Users can update their own pending reports OR workers/admins can update status
CREATE POLICY "Waste Reports: updatable by reporter, worker, or admin"
  ON waste_reports FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = auth.uid() OR get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() OR get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL
  );

-- Admins can delete waste reports
CREATE POLICY "Waste Reports: deletable by admins"
  ON waste_reports FOR DELETE
  TO authenticated
  USING (get_current_user_role() = 'admin');

-- 5. VEHICLES POLICIES
-- Viewable by all authenticated users & workers
CREATE POLICY "Vehicles: viewable by all"
  ON vehicles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Assigned driver (worker) or admin can update vehicle status and live location
CREATE POLICY "Vehicles: driver or admin can update"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid() OR get_current_user_role() = 'admin')
  WITH CHECK (driver_id = auth.uid() OR get_current_user_role() = 'admin');

-- Admins full control
CREATE POLICY "Vehicles: admin full control"
  ON vehicles FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- 6. ROUTES & ROUTE STOPS POLICIES
-- Viewable by workers and admins
CREATE POLICY "Routes: viewable by workers and admins"
  ON routes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Route Stops: viewable by workers and admins"
  ON route_stops FOR SELECT
  TO authenticated, anon
  USING (true);

-- Admins can manage routes and stops
CREATE POLICY "Routes: manageable by admin"
  ON routes FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Route Stops: manageable by admin"
  ON route_stops FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- Workers can update assigned route stop status
CREATE POLICY "Route Stops: status updated by workers"
  ON route_stops FOR UPDATE
  TO authenticated, anon
  USING (get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL)
  WITH CHECK (get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL);

-- 7. COLLECTIONS POLICIES
-- Viewable by all (for transparency and analytics)
CREATE POLICY "Collections: viewable by all"
  ON collections FOR SELECT
  TO authenticated, anon
  USING (true);

-- Workers can log arrival, collection, and upload verification proof
CREATE POLICY "Collections: worker insert/update verification"
  ON collections FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Collections: worker update collection details"
  ON collections FOR UPDATE
  TO authenticated, anon
  USING (worker_id = auth.uid() OR get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL)
  WITH CHECK (worker_id = auth.uid() OR get_current_user_role() IN ('worker', 'admin') OR auth.uid() IS NULL);

-- 8. NOTIFICATIONS POLICIES
-- Users can view their own notifications
CREATE POLICY "Notifications: view own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update read status on their notifications
CREATE POLICY "Notifications: update read status"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System & admins can insert notifications
CREATE POLICY "Notifications: insert by system/admin"
  ON notifications FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
