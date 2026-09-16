-- SmartWaste Supabase PostgreSQL Seed Data (Strict Hex UUIDs)

-- 1. SEED AREAS (Hex IDs: a1..., a2..., a3...)
INSERT INTO areas (id, name, type, population, latitude, longitude) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Narasipuram Town Zone', 'village', 4500, 11.0003, 76.7725),
  ('a2222222-2222-2222-2222-222222222222', 'Vellaimalaipattinam & Ikkaraibooluvampatti Zone', 'town', 8200, 10.9980, 76.7650),
  ('a3333333-3333-3333-3333-333333333333', 'Devarayapuram & Thondamuthur Zone', 'ward', 6100, 10.9880, 76.7820)
ON CONFLICT (id) DO NOTHING;

-- 2. SEED 10 COLLECTION POINTS (Hex IDs: c0000000-0000-0000-0000-000000000001..10)
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
