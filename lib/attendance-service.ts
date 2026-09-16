import { supabase } from '@/lib/supabase/client';

export interface WorkerAttendanceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  vehicle_number: string;
  route_code: string;
  attendance_status: 'PRESENT_VERIFIED' | 'ON_DUTY' | 'COMPLETED' | 'OFF_DUTY';
  clock_in_time: string;
  last_collection_time: string | null;
  verified_collections_count: number;
  total_assigned_stops: number;
  on_time_rating: number; // percentage e.g. 98
  auto_updated: boolean;
  latest_geotag_url?: string;
  shift_date: string;
  notes?: string;
}

const STORAGE_KEY_ATTENDANCE = 'smartwaste_worker_attendance';

const INITIAL_ATTENDANCE_SEED: WorkerAttendanceRecord[] = [
  {
    id: 'att-101',
    worker_id: 'd1111111-1111-1111-1111-111111111111',
    worker_name: 'Ramesh Patel',
    vehicle_number: 'TN-37-EV-2024',
    route_code: 'RT-ASSIGNED-01',
    attendance_status: 'PRESENT_VERIFIED',
    clock_in_time: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    last_collection_time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    verified_collections_count: 3,
    total_assigned_stops: 4,
    on_time_rating: 98,
    auto_updated: true,
    latest_geotag_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    shift_date: new Date().toISOString().split('T')[0],
    notes: 'Auto-verified via geotagged collection proof.',
  },
  {
    id: 'att-102',
    worker_id: 'd2222222-2222-2222-2222-222222222222',
    worker_name: 'S. Murugan',
    vehicle_number: 'TN-37-EV-2025',
    route_code: 'RT-DISPATCH-02',
    attendance_status: 'ON_DUTY',
    clock_in_time: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    last_collection_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    verified_collections_count: 2,
    total_assigned_stops: 5,
    on_time_rating: 95,
    auto_updated: true,
    latest_geotag_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    shift_date: new Date().toISOString().split('T')[0],
    notes: 'Shift active in Thondamuthur Ward 2.',
  },
  {
    id: 'att-103',
    worker_id: 'd3333333-3333-3333-3333-333333333333',
    worker_name: 'K. Selvam',
    vehicle_number: 'TN-37-EV-2026',
    route_code: 'RT-DISPATCH-03',
    attendance_status: 'PRESENT_VERIFIED',
    clock_in_time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    last_collection_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    verified_collections_count: 5,
    total_assigned_stops: 5,
    on_time_rating: 100,
    auto_updated: true,
    latest_geotag_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    shift_date: new Date().toISOString().split('T')[0],
    notes: 'Completed full shift route.',
  },
];

/**
 * Fetches current worker attendance records.
 */
export function getWorkerAttendanceList(): WorkerAttendanceRecord[] {
  if (typeof window === 'undefined') return INITIAL_ATTENDANCE_SEED;

  try {
    const cached = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading worker attendance cache:', err);
  }

  // Save initial seed
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE_SEED));
  }
  return INITIAL_ATTENDANCE_SEED;
}

/**
 * Saves worker attendance list locally.
 */
export function saveWorkerAttendanceList(list: WorkerAttendanceRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(list));
  }
}

export interface RecordCollectionAttendanceParams {
  workerId: string;
  workerName?: string;
  vehicleNumber?: string;
  routeCode?: string;
  geotagUrl?: string;
}

/**
 * AUTOMATICALLY updates worker attendance when worker confirms collection of waste.
 * Sets status to PRESENT_VERIFIED, updates clock-in time if missing, increments collections count.
 */
export async function recordWorkerCollectionAttendance(
  params: RecordCollectionAttendanceParams
): Promise<WorkerAttendanceRecord> {
  const {
    workerId,
    workerName = 'Ramesh Patel',
    vehicleNumber = 'TN-37-EV-2024',
    routeCode = 'RT-ASSIGNED-01',
    geotagUrl,
  } = params;

  const currentList = getWorkerAttendanceList();
  const existingIdx = currentList.findIndex(
    (a) => a.worker_id === workerId || a.vehicle_number === vehicleNumber
  );

  const nowIso = new Date().toISOString();

  let targetRecord: WorkerAttendanceRecord;

  if (existingIdx !== -1) {
    const existing = currentList[existingIdx];
    targetRecord = {
      ...existing,
      worker_name: workerName || existing.worker_name,
      vehicle_number: vehicleNumber || existing.vehicle_number,
      route_code: routeCode || existing.route_code,
      attendance_status: 'PRESENT_VERIFIED',
      clock_in_time: existing.clock_in_time || nowIso,
      last_collection_time: nowIso,
      verified_collections_count: existing.verified_collections_count + 1,
      auto_updated: true,
      latest_geotag_url: geotagUrl || existing.latest_geotag_url,
      notes: `Attendance auto-updated upon waste collection confirmation at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    };
    currentList[existingIdx] = targetRecord;
  } else {
    targetRecord = {
      id: `att-${Date.now()}`,
      worker_id: workerId,
      worker_name: workerName,
      vehicle_number: vehicleNumber,
      route_code: routeCode,
      attendance_status: 'PRESENT_VERIFIED',
      clock_in_time: nowIso,
      last_collection_time: nowIso,
      verified_collections_count: 1,
      total_assigned_stops: 4,
      on_time_rating: 100,
      auto_updated: true,
      latest_geotag_url: geotagUrl,
      shift_date: nowIso.split('T')[0],
      notes: `Attendance auto-marked PRESENT upon first waste collection confirmation.`,
    };
    currentList.push(targetRecord);
  }

  saveWorkerAttendanceList(currentList);

  // Try updating Supabase worker_attendance table if exists
  try {
    await supabase.from('worker_attendance').upsert({
      worker_id: targetRecord.worker_id,
      worker_name: targetRecord.worker_name,
      vehicle_number: targetRecord.vehicle_number,
      attendance_status: targetRecord.attendance_status,
      clock_in_time: targetRecord.clock_in_time,
      last_collection_time: targetRecord.last_collection_time,
      verified_collections_count: targetRecord.verified_collections_count,
      latest_geotag_url: targetRecord.latest_geotag_url,
      updated_at: nowIso,
    });
  } catch (err) {
    console.warn('Supabase attendance sync notice:', err);
  }

  return targetRecord;
}

/**
 * Manually update worker attendance status (Admin override)
 */
export function manualUpdateAttendanceStatus(
  workerId: string,
  newStatus: 'PRESENT_VERIFIED' | 'ON_DUTY' | 'COMPLETED' | 'OFF_DUTY'
): WorkerAttendanceRecord[] {
  const currentList = getWorkerAttendanceList();
  const updated = currentList.map((rec) => {
    if (rec.worker_id === workerId || rec.id === workerId) {
      return {
        ...rec,
        attendance_status: newStatus,
        notes: `Admin manually updated status to ${newStatus} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }
    return rec;
  });
  saveWorkerAttendanceList(updated);
  return updated;
}
