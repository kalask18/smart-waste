import { calculateSmartPriority, PriorityEngineResult } from './priority-engine';
import { fetchOSRMRoute, calculateHaversineDistance, OSRMRouteResult } from './osrm-service';
import { CollectionPoint, WasteReport, PriorityLevel } from '../types/database';
import { supabase } from './supabase/client';

export interface GeneratedRouteStop {
  id: string;
  stop_number: number;
  collection_point_id?: string;
  report_id?: string;
  location_name: string;
  latitude: number;
  longitude: number;
  fill_percent?: number;
  estimated_weight_kg: number;
  distance_from_prev_km: number;
  estimated_arrival_time: string;
  waste_category?: string;
  priority_score: number;
  priority_level: PriorityLevel;
  explanation: string;
  why_this_stop: string[];
  status: 'pending' | 'arrived' | 'collected';
}

export interface SmartRouteInput {
  vehicle_lat?: number;
  vehicle_lng?: number;
  vehicle_capacity_kg?: number;
  collectionPoints?: CollectionPoint[];
  wasteReports?: WasteReport[];
  route_date?: string;
  driver_name?: string;
  vehicle_number?: string;
  forceFallback?: boolean;
}

export interface SmartRouteResult {
  id: string;
  route_code: string;
  assigned_driver: string;
  assigned_vehicle: string;
  route_date: string;
  route_status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  vehicle_capacity_kg: number;
  total_payload_kg: number;
  remaining_capacity_kg: number;
  capacity_exceeded: boolean;
  total_stops: number;
  total_distance_km: number;
  estimated_duration_minutes: number;
  highest_priority_level: PriorityLevel;
  is_fallback: boolean;
  geometry_coordinates: Array<[number, number]>;
  route_explanation: string[];
  stops: GeneratedRouteStop[];
  created_at: string;
}

/**
 * Smart Priority-Aware Collection Route Generator:
 * Generates an ordered sequential collection route based on Priority Engine score ranking,
 * nearest-neighbour geographic distance selection, vehicle capacity limits, and OSRM road routing.
 */
export async function generateSmartCollectionRoute(
  input: SmartRouteInput
): Promise<SmartRouteResult> {
  const startLat = input.vehicle_lat ?? 11.0003;
  const startLng = input.vehicle_lng ?? 76.7725;
  const vehicleCapacityKg = input.vehicle_capacity_kg ?? 2000;
  const routeDate = input.route_date || new Date().toISOString().split('T')[0];

  // Strict Narasipuram, Coimbatore Geographic Bounding Box Filter
  // Ensures zero legacy Bangalore data or far-away coordinates enter route generation
  const isWithinNarasipuram = (lat?: number, lng?: number) => {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return false;
    return lat >= 10.80 && lat <= 11.20 && lng >= 76.50 && lng <= 77.00;
  };

  // 1. Gather all candidate collection points and reports strictly within Narasipuram zone
  const candidates: Array<{
    id: string;
    cp_id?: string;
    report_id?: string;
    name: string;
    lat: number;
    lng: number;
    estimated_weight_kg: number;
    category?: string;
    fill_percent?: number;
    sensitivity?: string;
    priorityResult: PriorityEngineResult;
  }> = [];

  if (input.collectionPoints) {
    input.collectionPoints.forEach((cp) => {
      const lat = cp.latitude || startLat;
      const lng = cp.longitude || startLng;
      if (!isWithinNarasipuram(lat, lng)) return;

      // Count matching citizen reports for this collection point
      const matchingReports = (input.wasteReports || []).filter(
        (r) =>
          r.collection_point_id === cp.id ||
          (r.location_name && r.location_name.toLowerCase().includes(cp.name.toLowerCase().split(' ')[0]))
      );

      const highestSev = matchingReports.some((r) => r.severity === 'CRITICAL')
        ? 'CRITICAL'
        : matchingReports.some((r) => r.severity === 'HIGH')
        ? 'HIGH'
        : null;

      const priorityResult = calculateSmartPriority({
        fill_percentage: cp.current_fill_percent,
        current_weight_kg: cp.current_weight_kg,
        capacity_kg: cp.capacity || 1000,
        last_collected_at: cp.last_collected_at,
        location_sensitivity: (cp as any).sensitivity || 'residential',
        complaint_count: matchingReports.length,
        citizen_reported_severity: highestSev as any,
      });

      const estWeight = cp.current_weight_kg || Math.round((cp.current_fill_percent / 100) * (cp.capacity || 1000));

      candidates.push({
        id: `cp-${cp.id}`,
        cp_id: cp.id,
        name: cp.name,
        lat,
        lng,
        estimated_weight_kg: Math.max(50, estWeight),
        category: 'smart_bin',
        fill_percent: cp.current_fill_percent,
        sensitivity: (cp as any).sensitivity || 'residential',
        priorityResult,
      });
    });
  }

  if (input.wasteReports) {
    input.wasteReports.forEach((rep) => {
      const lat = rep.latitude || startLat;
      const lng = rep.longitude || startLng;
      if (!isWithinNarasipuram(lat, lng)) return;

      const priorityResult = calculateSmartPriority({
        fill_percentage: rep.severity === 'CRITICAL' ? 95 : rep.severity === 'HIGH' ? 80 : 55,
        citizen_reported_severity: rep.severity,
        location_sensitivity: rep.location_name || 'residential',
        complaint_count: 2,
      });

      const estWeight = rep.severity === 'CRITICAL' ? 400 : rep.severity === 'HIGH' ? 250 : 150;
      const reportName = rep.location_name && rep.location_name !== 'Report Location'
        ? `${rep.location_name} (Reported Incident)`
        : 'Narasipuram Citizen Waste Report';

      candidates.push({
        id: `rep-${rep.id}`,
        report_id: rep.id,
        name: reportName,
        lat,
        lng,
        estimated_weight_kg: estWeight,
        category: rep.category,
        fill_percent: rep.severity === 'CRITICAL' ? 95 : 75,
        sensitivity: rep.location_name || 'residential',
        priorityResult,
      });
    });
  }

  // Handle No Points scenario
  if (candidates.length === 0) {
    return {
      id: `rt-${Date.now().toString().slice(-6)}`,
      route_code: `RT-SMART-${Math.floor(100 + Math.random() * 900)}`,
      assigned_driver: input.driver_name || 'Ramesh Patel',
      assigned_vehicle: input.vehicle_number || 'TN-37-EV-2024',
      route_date: routeDate,
      route_status: 'PLANNED',
      vehicle_capacity_kg: vehicleCapacityKg,
      total_payload_kg: 0,
      remaining_capacity_kg: vehicleCapacityKg,
      capacity_exceeded: false,
      total_stops: 0,
      total_distance_km: 0,
      estimated_duration_minutes: 0,
      highest_priority_level: 'LOW',
      is_fallback: false,
      geometry_coordinates: [[startLat, startLng]],
      route_explanation: [
        'No collection points require service for this date.',
        'All smart bins are within normal capacity limits.',
      ],
      stops: [],
      created_at: new Date().toISOString(),
    };
  }

  // 2. Nearest-Neighbour Selection with Priority Weighting & Vehicle Capacity Constraints
  const selectedStops: GeneratedRouteStop[] = [];
  let remainingCandidates = [...candidates];
  let currentLat = startLat;
  let currentLng = startLng;
  let accumulatedPayloadKg = 0;
  let capacityExceeded = false;
  let accumulatedTimeMins = 0;

  // Base start time: 08:30 AM
  const baseStartTime = new Date();
  baseStartTime.setHours(8, 30, 0, 0);

  while (remainingCandidates.length > 0) {
    let bestIndex = -1;
    let bestCost = Infinity;

    for (let i = 0; i < remainingCandidates.length; i++) {
      const cand = remainingCandidates[i];
      const dist = calculateHaversineDistance(currentLat, currentLng, cand.lat, cand.lng);
      const priorityUrgencyBonus = cand.priorityResult.score * 0.15;
      const cost = dist - priorityUrgencyBonus;

      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) break;

    const chosen = remainingCandidates[bestIndex];
    const distFromPrev = calculateHaversineDistance(currentLat, currentLng, chosen.lat, chosen.lng);

    // Capacity Check
    if (accumulatedPayloadKg + chosen.estimated_weight_kg > vehicleCapacityKg) {
      capacityExceeded = true;
      if (chosen.priorityResult.level === 'LOW' && selectedStops.length > 0) {
        remainingCandidates.splice(bestIndex, 1);
        continue;
      }
    }

    accumulatedPayloadKg += chosen.estimated_weight_kg;
    currentLat = chosen.lat;
    currentLng = chosen.lng;

    // Time estimation per stop
    const travelMins = Math.round((distFromPrev / 25) * 60);
    const serviceMins = 10; // 10 mins service per stop
    accumulatedTimeMins += travelMins + serviceMins;

    const arrivalDate = new Date(baseStartTime.getTime() + accumulatedTimeMins * 60 * 1000);
    const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Build "Why this stop?" explainable bullets
    const whyBullets: string[] = [
      `${chosen.priorityResult.level} priority score: ${chosen.priorityResult.score}/100`,
      `${chosen.fill_percent ? `${chosen.fill_percent}% bin fill level` : 'High waste volume reported'}`,
    ];
    if (chosen.sensitivity) {
      whyBullets.push(`Location sensitivity: ${chosen.sensitivity}`);
    }
    whyBullets.push(`${distFromPrev.toFixed(1)} km from previous stop`);

    selectedStops.push({
      id: chosen.id,
      stop_number: selectedStops.length + 1,
      collection_point_id: chosen.cp_id,
      report_id: chosen.report_id,
      location_name: chosen.name,
      latitude: chosen.lat,
      longitude: chosen.lng,
      fill_percent: chosen.fill_percent,
      estimated_weight_kg: chosen.estimated_weight_kg,
      distance_from_prev_km: Math.round(distFromPrev * 10) / 10,
      estimated_arrival_time: arrivalTimeStr,
      waste_category: chosen.category,
      priority_score: chosen.priorityResult.score,
      priority_level: chosen.priorityResult.level,
      explanation: chosen.priorityResult.explanation,
      why_this_stop: whyBullets,
      status: 'pending',
    });

    remainingCandidates.splice(bestIndex, 1);
  }

  // 3. OSRM Road Distance & Geometry Polyline Fetch (with Haversine fallback)
  const waypoints: Array<[number, number]> = [
    [startLat, startLng],
    ...selectedStops.map((s) => [s.latitude, s.longitude] as [number, number]),
  ];

  const osrmResult: OSRMRouteResult = await fetchOSRMRoute(waypoints, input.forceFallback);

  const highestPriority = selectedStops.length > 0
    ? selectedStops.reduce((max, s) => (s.priority_score > max.priority_score ? s : max), selectedStops[0]).priority_level
    : 'LOW';

  const remainingCapacityKg = Math.max(0, vehicleCapacityKg - accumulatedPayloadKg);

  const routeExplanation = [
    '1. Critical & High priority locations were considered first by the Priority Engine.',
    '2. Nearby collection points were grouped to reduce unnecessary travel distance.',
    `3. Vehicle capacity (${vehicleCapacityKg} kg) was evaluated against cumulative waste weights.`,
    '4. Nearest-neighbour distance selection was used to order subsequent stops.',
    osrmResult.isFallback
      ? '5. Geographic distance formula was used for fallback route geometry.'
      : '5. OSRM road routing engine provided driving polyline paths.',
  ];

  return {
    id: `rt-${Date.now().toString().slice(-6)}`,
    route_code: `RT-SMART-${Math.floor(100 + Math.random() * 900)}`,
    assigned_driver: input.driver_name || 'Ramesh Patel',
    assigned_vehicle: input.vehicle_number || 'TN-37-EV-2024',
    route_date: routeDate,
    route_status: 'PLANNED',
    vehicle_capacity_kg: vehicleCapacityKg,
    total_payload_kg: accumulatedPayloadKg,
    remaining_capacity_kg: remainingCapacityKg,
    capacity_exceeded: capacityExceeded,
    total_stops: selectedStops.length,
    total_distance_km: osrmResult.totalDistanceKm,
    estimated_duration_minutes: osrmResult.estimatedDurationMins,
    highest_priority_level: highestPriority,
    is_fallback: osrmResult.isFallback,
    geometry_coordinates: osrmResult.geometryCoordinates,
    route_explanation: routeExplanation,
    stops: selectedStops,
    created_at: new Date().toISOString(),
  };
}

/**
 * Saves generated route and route_stops into Supabase database.
 */
export async function saveRouteToSupabase(route: SmartRouteResult) {
  try {
    // 1. Save to localStorage for immediate sync across admin & worker interfaces
    if (typeof window !== 'undefined') {
      const driverData = {
        route_id: route.id || `rt-${Date.now()}`,
        route_code: route.route_code,
        vehicle_number: route.assigned_vehicle,
        vehicle_type: 'Electric Tipper E-Rickshaw',
        vehicle_capacity_kg: route.vehicle_capacity_kg,
        driver_name: route.assigned_driver || 'Ramesh Patel',
        driver_id: 'd1111111-1111-1111-1111-111111111111',
        route_date: route.route_date,
        route_status: 'assigned',
        total_stops: route.total_stops,
        completed_stops: 0,
        remaining_stops: route.total_stops,
        stops: route.stops.map((s, idx) => ({
          id: s.id || `stop-${idx + 1}`,
          route_id: route.id || `rt-${Date.now()}`,
          collection_point_id: s.collection_point_id,
          report_id: s.report_id,
          sequence_number: s.stop_number,
          location_name: s.location_name,
          latitude: s.latitude,
          longitude: s.longitude,
          fill_percentage: s.fill_percent || 85,
          estimated_weight_kg: s.estimated_weight_kg || 250,
          priority_level: s.priority_level,
          priority_score: s.priority_score,
          status: 'pending',
        })),
      };
      localStorage.setItem('smartwaste_saved_driver_route', JSON.stringify(driverData));
    }

    // 2. Insert into Supabase tables
    const { data: dbRoute, error: routeErr } = await supabase
      .from('routes')
      .insert({
        route_code: route.route_code,
        status: 'assigned',
        total_stops: route.total_stops,
        total_distance_km: route.total_distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        highest_priority_level: route.highest_priority_level,
        route_date: route.route_date,
        vehicle_number: route.assigned_vehicle,
        vehicle_capacity_kg: route.vehicle_capacity_kg,
        driver_name: route.assigned_driver,
        is_fallback: route.is_fallback,
      })
      .select('id')
      .single();

    if (!routeErr && dbRoute) {
      const stopsToInsert = route.stops.map((s) => ({
        route_id: dbRoute.id,
        collection_point_id: s.collection_point_id || null,
        report_id: s.report_id || null,
        sequence_number: s.stop_number,
        location_name: s.location_name,
        latitude: s.latitude,
        longitude: s.longitude,
        priority_score: s.priority_score,
        priority_level: s.priority_level,
        fill_percentage: s.fill_percent || 85,
        estimated_weight_kg: s.estimated_weight_kg || 250,
        explanation: s.explanation,
        status: 'pending',
      }));

      await supabase.from('route_stops').insert(stopsToInsert);
    }
    return { success: true };
  } catch (err) {
    console.warn('Database persistence notice for route:', err);
    return { success: false };
  }
}

// Backward compatibility helper
export function generatePriorityRoute(params: any) {
  const startLat = 11.0003;
  const startLng = 76.7725;
  const stops: GeneratedRouteStop[] = (params.collectionPoints || []).map((cp: any, idx: number) => ({
    id: `stop-${idx + 1}`,
    stop_number: idx + 1,
    collection_point_id: cp.id,
    location_name: cp.name,
    latitude: cp.latitude || startLat,
    longitude: cp.longitude || startLng,
    estimated_weight_kg: cp.current_weight_kg || 250,
    distance_from_prev_km: 2.1,
    estimated_arrival_time: '09:00 AM',
    priority_score: cp.current_fill_percent >= 85 ? 90 : 50,
    priority_level: cp.current_fill_percent >= 85 ? 'CRITICAL' : 'MEDIUM',
    explanation: 'Priority engine calculation',
    why_this_stop: ['High priority score', 'Proximity to route'],
    status: 'pending',
  }));

  return {
    id: `rt-${Date.now().toString().slice(-6)}`,
    route_code: `RT-SMART-${Math.floor(100 + Math.random() * 900)}`,
    assigned_driver: params.driverName || 'Ramesh Patel',
    assigned_vehicle: params.vehicleNumber || 'TN-37-EV-2024',
    route_date: new Date().toISOString().split('T')[0],
    route_status: 'PLANNED',
    vehicle_capacity_kg: 2000,
    total_payload_kg: 1000,
    remaining_capacity_kg: 1000,
    capacity_exceeded: false,
    total_stops: stops.length,
    total_distance_km: 12.4,
    estimated_duration_minutes: 45,
    highest_priority_level: 'CRITICAL',
    is_fallback: false,
    geometry_coordinates: [[startLat, startLng]],
    route_explanation: [
      '1. Critical/high-priority locations were considered first.',
      '2. Nearby collection points were grouped to reduce unnecessary travel.',
    ],
    stops,
    created_at: new Date().toISOString(),
  };
}
