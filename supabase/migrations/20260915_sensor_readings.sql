-- Migration: Create sensor_readings table with indexes and RLS policies
-- Description: SmartWaste IoT telemetry readings table

CREATE TABLE IF NOT EXISTS public.sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_point_id TEXT NOT NULL,
    fill_percent NUMERIC NOT NULL CHECK (fill_percent >= 0 AND fill_percent <= 100),
    weight_kg NUMERIC NOT NULL CHECK (weight_kg >= 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for collection_point_id and recorded_at
CREATE INDEX IF NOT EXISTS idx_sensor_readings_collection_point_id 
    ON public.sensor_readings(collection_point_id);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at 
    ON public.sensor_readings(recorded_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sensor readings
CREATE POLICY "Allow public read access to sensor_readings"
    ON public.sensor_readings FOR SELECT
    USING (true);

-- Allow authenticated/anon insert access for telemetry endpoint
CREATE POLICY "Allow public insert to sensor_readings"
    ON public.sensor_readings FOR INSERT
    WITH CHECK (true);
