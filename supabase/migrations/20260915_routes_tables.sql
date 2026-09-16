-- Migration: Create routes and route_stops tables with indexes and RLS policies

CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_code TEXT NOT NULL UNIQUE,
    vehicle_id TEXT,
    driver_id TEXT,
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('draft', 'assigned', 'in_progress', 'completed', 'cancelled')),
    total_stops INTEGER NOT NULL DEFAULT 0,
    total_distance_km NUMERIC NOT NULL DEFAULT 0,
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 0,
    highest_priority_level TEXT DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    collection_point_id TEXT,
    report_id TEXT,
    sequence_number INTEGER NOT NULL,
    location_name TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    priority_score INTEGER NOT NULL DEFAULT 50,
    priority_level TEXT NOT NULL DEFAULT 'MEDIUM',
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'collected', 'skipped', 'issue_reported')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Indexes
CREATE INDEX IF NOT EXISTS idx_routes_status ON public.routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_date ON public.routes(route_date);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON public.route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON public.route_stops(route_id, sequence_number);

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Allow public insert routes" ON public.routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update routes" ON public.routes FOR UPDATE USING (true);

CREATE POLICY "Allow public read route_stops" ON public.route_stops FOR SELECT USING (true);
CREATE POLICY "Allow public insert route_stops" ON public.route_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update route_stops" ON public.route_stops FOR UPDATE USING (true);
