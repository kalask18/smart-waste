import { supabase } from '@/lib/supabase/client';
import { WasteReport, ReportStatus } from '@/types/database';
import { INITIAL_REPORTS } from '@/lib/demo-data';

const REPORTS_CACHE_KEY = 'smartwaste_cached_reports';
const EVENT_REPORTS_CHANGE = 'smartwaste_reports_change';

const CP_LOCATION_MAP: Record<string, string> = {
  'c0000000-0000-0000-0000-000000000001': 'Narasipuram Main Road Bin',
  'c0000000-0000-0000-0000-000000000002': 'Narasipuram Residential Bin',
  'c0000000-0000-0000-0000-000000000003': 'Vellaimalaipattinam Clinic Bin',
  'c0000000-0000-0000-0000-000000000004': 'Ikkaraibooluvampatti Spot',
  'c0000000-0000-0000-0000-000000000005': 'Devarayapuram Main Road Yard',
  'cp1': 'Narasipuram Panchayat Main Gate Dumpster',
  'cp2': 'Primary Health Centre Dumpster',
  'cp3': 'Govt Higher Sec School Gate Container',
  'cp4': 'Thondamuthur Weekly Market Yard Bin',
  'cp5': 'Velliangiri Foothills Bus Stop Bin',
};

/**
 * Formats a clean human-readable Report Code (e.g. WR-001, WR-002, WR-784912).
 */
function generateReportCode(id: string): string {
  if (!id) return 'WR-1001';
  const cleanId = String(id).replace(/^rep-/i, '').replace(/^d0+/i, '');
  if (cleanId.length <= 4 && !isNaN(Number(cleanId))) {
    return `WR-${cleanId.padStart(3, '0')}`;
  }
  const digitsOrHex = String(id).replace(/[^a-zA-Z0-9]/g, '');
  return `WR-${digitsOrHex.slice(-6).toUpperCase()}`;
}

/**
 * Parses raw DB row into standard WasteReport structure.
 */
export function parseDbReport(item: any): WasteReport {
  let locationName = item.location_name || item.location;
  let description = item.description || '';

  if (!locationName && item.collection_point_id && CP_LOCATION_MAP[item.collection_point_id]) {
    locationName = CP_LOCATION_MAP[item.collection_point_id];
  }

  if (!locationName && description.includes(': ')) {
    const parts = description.split(': ');
    locationName = parts[0];
    description = parts.slice(1).join(': ');
  }

  if (!locationName) {
    if (description.toLowerCase().includes('narasipuram')) locationName = 'Narasipuram Main Road';
    else if (description.toLowerCase().includes('vellaimalaipattinam')) locationName = 'Vellaimalaipattinam Area';
    else if (description.toLowerCase().includes('devarayapuram')) locationName = 'Devarayapuram Market';
    else if (description.toLowerCase().includes('ikkara')) locationName = 'Ikkaraibooluvampatti Spot';
    else locationName = 'Narasipuram Waste Point';
  }

  const rawStatus = item.status || 'Submitted';
  const mappedStatus = rawStatus === 'pending' ? 'Submitted' : rawStatus;

  const reportCode = item.report_code || generateReportCode(item.id);

  return {
    id: item.id,
    report_code: reportCode,
    user_id: item.user_id,
    collection_point_id: item.collection_point_id,
    location_name: locationName,
    category: item.category || item.waste_category || 'general',
    description: description,
    latitude: Number(item.latitude) || 11.0003,
    longitude: Number(item.longitude) || 76.7725,
    image_url: item.image_url || item.photo_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    photo_url: item.image_url || item.photo_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
    severity: item.severity || item.priority_level || 'MEDIUM',
    status: mappedStatus as ReportStatus,
    priority_score: item.priority_score ?? (item.severity === 'CRITICAL' ? 95 : item.severity === 'HIGH' ? 80 : item.severity === 'MEDIUM' ? 55 : 30),
    priority_level: item.severity || item.priority_level || 'MEDIUM',
    created_at: item.created_at || new Date().toISOString(),
  };
}

/**
 * Gets cached reports from localStorage.
 */
export function getLocalReports(): WasteReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPORTS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WasteReport[];
  } catch (e) {
    console.warn('Error reading reports cache:', e);
    return [];
  }
}

/**
 * Saves a report to localStorage cache and notifies subscribers across tabs.
 */
export function saveReportToLocalCache(report: WasteReport) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalReports();
    const updated = [report, ...current.filter((r) => r.id !== report.id)];
    localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_REPORTS_CHANGE, { detail: updated }));
  } catch (e) {
    console.warn('Error saving report to local cache:', e);
  }
}

export function isNarasipuramLocation(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return false;
  return lat >= 10.80 && lat <= 11.20 && lng >= 76.50 && lng <= 77.00;
}

/**
 * Fetches reports from Supabase DB, merged with local cache and initial demo reports.
 * Excludes legacy Bangalore coordinates (outside Narasipuram demo bounding box).
 */
export async function fetchMergedWasteReports(): Promise<WasteReport[]> {
  let dbReports: WasteReport[] = [];

  try {
    const { data, error } = await supabase
      .from('waste_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      dbReports = data.map(parseDbReport).filter((r) => isNarasipuramLocation(r.latitude, r.longitude));
    }
  } catch (err) {
    console.warn('Notice querying waste_reports from Supabase:', err);
  }

  const localReports = getLocalReports().filter((r) => isNarasipuramLocation(r.latitude, r.longitude));
  const demoReports = (INITIAL_REPORTS as any[]).map(parseDbReport).filter((r) => isNarasipuramLocation(r.latitude, r.longitude));

  const seenIds = new Set<string>();
  const merged: WasteReport[] = [];

  for (const r of [...dbReports, ...localReports, ...demoReports]) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      merged.push(r);
    }
  }

  return merged;
}

/**
 * Subscribes to report changes via custom events, storage event, and Supabase Realtime.
 */
export function subscribeReportsChange(callback: (reports: WasteReport[]) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    fetchMergedWasteReports().then((items) => callback(items));
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === REPORTS_CACHE_KEY) {
      fetchMergedWasteReports().then((items) => callback(items));
    }
  };

  window.addEventListener(EVENT_REPORTS_CHANGE, handler);
  window.addEventListener('storage', storageHandler);

  const channelId = `rep_rt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_reports' }, () => {
      fetchMergedWasteReports().then((items) => callback(items));
    })
    .subscribe();

  return () => {
    window.removeEventListener(EVENT_REPORTS_CHANGE, handler);
    window.removeEventListener('storage', storageHandler);
    supabase.removeChannel(channel);
  };
}
