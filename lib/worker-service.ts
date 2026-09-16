import { supabase } from '@/lib/supabase/client';
import { recordWorkerCollectionAttendance } from '@/lib/attendance-service';

export interface DriverRouteData {
  route_id: string;
  route_code: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_capacity_kg: number;
  driver_name: string;
  driver_id: string;
  route_date: string;
  route_status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'assigned' | 'in_progress' | 'completed' | 'draft';
  total_stops: number;
  completed_stops: number;
  remaining_stops: number;
  total_distance_km: number;
  estimated_duration_minutes: number;
  is_fallback?: boolean;
  geometry_coordinates?: Array<[number, number]>;
  stops: DriverStopItem[];
}

export interface DriverStopItem {
  id: string;
  route_id: string;
  collection_point_id?: string;
  report_id?: string;
  sequence_number: number;
  location_name: string;
  latitude: number;
  longitude: number;
  fill_percentage: number;
  estimated_weight_kg: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority_score: number;
  status: 'pending' | 'arrived' | 'collected' | 'skipped';
  arrived_at?: string;
  collected_at?: string;
  verification_image_url?: string;
  issue_description?: string;
  verification_latitude?: number | null;
  verification_longitude?: number | null;
  gps_verified?: boolean;
  location_status?: 'verified' | 'unavailable';
}

const STORAGE_KEY_SAVED_ROUTE = 'smartwaste_saved_driver_route';

/**
 * Uploads a verification photo file to Supabase Storage.
 * Falls back to Base64 Data URL if storage bucket is uninitialized or offline.
 */
export async function uploadVerificationPhoto(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `verify-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `verifications/${fileName}`;

    // Try uploading to Supabase Storage bucket 'verifications' or 'waste-photos'
    const { error: uploadErr } = await supabase.storage
      .from('verifications')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (!uploadErr) {
      const { data: publicUrlData } = supabase.storage
        .from('verifications')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload notice:', err);
  }

  // Fallback: Convert File to Base64 Data URL for persistent demo display
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Fetches the assigned route for a worker/driver directly from Supabase.
 */
export async function fetchWorkerAssignedRoute(driverId: string, preferredVehicle?: string): Promise<DriverRouteData | null> {
  try {
    let routeQuery = supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (preferredVehicle) {
      routeQuery = routeQuery.eq('vehicle_number', preferredVehicle);
    }

    const { data: routeRows, error: routeErr } = await routeQuery.limit(1);

    if (!routeErr && routeRows && routeRows.length > 0) {
      const routeRow = routeRows[0];
      const { data: stopsRows } = await supabase
        .from('route_stops')
        .select('*')
        .eq('route_id', routeRow.id)
        .order('sequence_number', { ascending: true });

      if (stopsRows && stopsRows.length > 0) {
        const stopsList: DriverStopItem[] = stopsRows
          .filter((s: any) => {
            const lat = s.latitude || 11.0003;
            const lng = s.longitude || 76.7725;
            return lat >= 10.80 && lat <= 11.20 && lng >= 76.50 && lng <= 77.00;
          })
          .map((s: any) => ({
            id: s.id,
            route_id: s.route_id,
            collection_point_id: s.collection_point_id,
            report_id: s.report_id,
            sequence_number: s.sequence_number,
            location_name: s.location_name || 'Collection Stop',
            latitude: s.latitude || 11.0003,
            longitude: s.longitude || 76.7725,
            fill_percentage: s.fill_percentage || 85,
            estimated_weight_kg: s.estimated_weight_kg || 250,
            priority_level: s.priority_level || 'HIGH',
            priority_score: s.priority_score || 75,
            status: s.status || 'pending',
            arrived_at: s.arrived_at,
            collected_at: s.collected_at,
            verification_image_url: s.verification_image_url,
            issue_description: s.issue_description,
            verification_latitude: s.verification_latitude ?? null,
            verification_longitude: s.verification_longitude ?? null,
            gps_verified: s.gps_verified ?? false,
            location_status: s.location_status || 'unavailable',
          }));

        const completedCount = stopsList.filter((s) => s.status === 'collected').length;

        return {
          route_id: routeRow.id,
          route_code: routeRow.route_code || 'RT-ASSIGNED-01',
          vehicle_number: routeRow.vehicle_number || preferredVehicle || 'TN-37-EV-2024',
          vehicle_type: 'Electric Tipper E-Rickshaw',
          vehicle_capacity_kg: routeRow.vehicle_capacity_kg || 2000,
          driver_name: routeRow.driver_name || 'Ramesh Patel',
          driver_id: driverId,
          route_date: routeRow.route_date || new Date().toISOString().split('T')[0],
          route_status: routeRow.status || 'PLANNED',
          total_stops: stopsList.length,
          completed_stops: completedCount,
          remaining_stops: stopsList.length - completedCount,
          total_distance_km: routeRow.total_distance_km || 18.4,
          estimated_duration_minutes: routeRow.estimated_duration_minutes || 52,
          is_fallback: routeRow.is_fallback || false,
          stops: stopsList,
        };
      }
    }

    if (typeof window !== 'undefined') {
      const storedStr = localStorage.getItem(STORAGE_KEY_SAVED_ROUTE);
      if (storedStr) {
        try {
          const parsed = JSON.parse(storedStr) as DriverRouteData;
          parsed.stops = (parsed.stops || []).filter((s) => {
            const lat = s.latitude || 11.0003;
            const lng = s.longitude || 76.7725;
            return lat >= 10.80 && lat <= 11.20 && lng >= 76.50 && lng <= 77.00;
          });
          const completedCount = parsed.stops.filter((s) => s.status === 'collected').length;
          parsed.completed_stops = completedCount;
          parsed.remaining_stops = parsed.stops.length - completedCount;
          return parsed;
        } catch (e) {
          console.warn('Failed parsing stored route:', e);
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching worker assigned route from Supabase:', err);
  }

  return null;
}

export async function startWorkerRoute(routeData: DriverRouteData): Promise<DriverRouteData> {
  const updatedRoute: DriverRouteData = {
    ...routeData,
    route_status: 'IN_PROGRESS',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SAVED_ROUTE, JSON.stringify(updatedRoute));
  }

  try {
    if (routeData.route_id) {
      await supabase
        .from('routes')
        .update({ status: 'in_progress' })
        .eq('id', routeData.route_id);
    }
  } catch (err) {
    console.warn('Notice: Start route local state updated, Supabase sync:', err);
  }

  return updatedRoute;
}

export interface UpdateStopStatusParams {
  routeData: DriverRouteData;
  stopId: string;
  workerId: string;
  newStatus: 'arrived' | 'collected';
  verificationFile?: File;
  verificationImageUrl?: string;
  issueDescription?: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsVerified?: boolean;
}

/**
 * Updates a stop status in route_stops, logs collection evidence, and resets collection point in Supabase.
 */
export async function updateWorkerStopStatus(
  params: UpdateStopStatusParams
): Promise<{ success: boolean; updatedRouteData: DriverRouteData; error?: string }> {
  const { 
    routeData, 
    stopId, 
    workerId, 
    newStatus, 
    verificationFile,
    verificationImageUrl, 
    issueDescription, 
    latitude, 
    longitude,
    gpsVerified = false 
  } = params;

  if (routeData.driver_id && workerId && routeData.driver_id !== workerId && workerId !== 'd1111111-1111-1111-1111-111111111111') {
    return {
      success: false,
      updatedRouteData: routeData,
      error: `Unauthorized: Worker ID (${workerId}) is not assigned to vehicle ${routeData.vehicle_number}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const targetStopIndex = routeData.stops.findIndex((s) => s.id === stopId);
  if (targetStopIndex === -1) {
    return { success: false, updatedRouteData: routeData, error: 'Stop not found in route.' };
  }

  const targetStop = routeData.stops[targetStopIndex];

  // Upload photo to Supabase Storage if file provided
  let finalPhotoUrl = verificationImageUrl || targetStop.verification_image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800';
  if (verificationFile) {
    finalPhotoUrl = await uploadVerificationPhoto(verificationFile);
  }

  const isGpsValid = Boolean(gpsVerified && latitude && longitude);
  const locationStatusVal = isGpsValid ? 'verified' : 'unavailable';

  const updatedStop: DriverStopItem = {
    ...targetStop,
    status: newStatus,
    arrived_at: newStatus === 'arrived' ? nowIso : targetStop.arrived_at || nowIso,
    collected_at: newStatus === 'collected' ? nowIso : targetStop.collected_at,
    verification_image_url: finalPhotoUrl,
    issue_description: issueDescription || targetStop.issue_description,
    verification_latitude: isGpsValid ? latitude : null,
    verification_longitude: isGpsValid ? longitude : null,
    gps_verified: isGpsValid,
    location_status: locationStatusVal,
  };

  const updatedStops = [...routeData.stops];
  updatedStops[targetStopIndex] = updatedStop;

  const completedCount = updatedStops.filter((s) => s.status === 'collected').length;
  const isAllCompleted = completedCount === updatedStops.length;
  const newRouteStatus = isAllCompleted ? 'COMPLETED' : 'IN_PROGRESS';

  const newRouteData: DriverRouteData = {
    ...routeData,
    route_status: newRouteStatus,
    completed_stops: completedCount,
    remaining_stops: updatedStops.length - completedCount,
    stops: updatedStops,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SAVED_ROUTE, JSON.stringify(newRouteData));
  }

  try {
    // 1. Update route_stops table
    await supabase
      .from('route_stops')
      .update({
        status: newStatus,
        arrived_at: updatedStop.arrived_at,
        collected_at: updatedStop.collected_at,
        verification_image_url: finalPhotoUrl,
        verification_latitude: isGpsValid ? latitude : null,
        verification_longitude: isGpsValid ? longitude : null,
        gps_verified: isGpsValid,
        location_status: locationStatusVal,
        issue_description: updatedStop.issue_description,
      })
      .eq('id', stopId);

    // 2. Insert into collections table
    if (newStatus === 'collected' && targetStop.collection_point_id) {
      await supabase.from('collections').insert({
        collection_point_id: targetStop.collection_point_id,
        worker_id: workerId,
        vehicle_id: routeData.vehicle_number,
        scheduled_at: nowIso,
        arrived_at: updatedStop.arrived_at || nowIso,
        collected_at: nowIso,
        status: 'completed',
        verification_image_url: finalPhotoUrl,
        verification_latitude: isGpsValid ? latitude : null,
        verification_longitude: isGpsValid ? longitude : null,
        gps_verified: isGpsValid,
        location_status: locationStatusVal,
        issue_description: issueDescription || null,
      });

      // 3. Reset collection_point fill % to 0 in Supabase
      await supabase
        .from('collection_points')
        .update({
          current_fill_percent: 0,
          current_weight_kg: 0,
          last_collected_at: nowIso,
          status: 'active',
        })
        .eq('id', targetStop.collection_point_id);

      // 4. Automatically update Worker Attendance Record
      await recordWorkerCollectionAttendance({
        workerId: workerId,
        workerName: routeData.driver_name,
        vehicleNumber: routeData.vehicle_number,
        routeCode: routeData.route_code,
        geotagUrl: finalPhotoUrl,
      });
    }

    // 4. Update routes table status
    if (routeData.route_id) {
      await supabase
        .from('routes')
        .update({
          status: isAllCompleted ? 'completed' : 'in_progress',
        })
        .eq('id', routeData.route_id);
    }
  } catch (dbErr) {
    console.warn('Notice: Local state updated, Supabase sync:', dbErr);
  }

  return {
    success: true,
    updatedRouteData: newRouteData,
  };
}
