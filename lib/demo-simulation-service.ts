import { calculateSmartPriority, PriorityEngineResult } from './priority-engine';

export type DemoStage =
  | 'NORMAL'
  | 'WASTE_SURGE'
  | 'CRITICAL_PRIORITIES'
  | 'SMART_ROUTE'
  | 'DRIVER_COLLECTION'
  | 'VERIFIED_COMPLETION';

export interface DemoPoint {
  id: string;
  name: string;
  ward: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_fill_percent: number;
  current_weight_kg: number;
  status: 'active' | 'overflowing' | 'maintenance' | 'inactive';
  is_demo: boolean;
  sensitivity: string;
  last_collected_at?: string;
  priorityRes?: PriorityEngineResult;
}

export interface SimulatedSensorReading {
  id: string;
  point_id: string;
  recorded_at: string;
  fill_percent: number;
  battery_level: number;
  is_simulated: boolean;
  source: 'demo_simulation';
}

export interface DemoSimulationState {
  stage: DemoStage;
  points: DemoPoint[];
  simulated_readings: SimulatedSensorReading[];
  active_demo_route: any | null;
  last_updated: string;
  surge_count: number;
}

const DEMO_STORAGE_KEY = 'smartwaste_demo_simulation_state';
const EVENT_DEMO_CHANGE = 'smartwaste_demo_state_change';

export const BASELINE_DEMO_POINTS: DemoPoint[] = [
  {
    id: 'cp-demo-1',
    name: 'Narasipuram Main Road',
    ward: 'Narasipuram Zone',
    latitude: 11.0003,
    longitude: 76.7725,
    capacity: 1000,
    current_fill_percent: 35,
    current_weight_kg: 140,
    status: 'active',
    is_demo: true,
    sensitivity: 'commercial',
  },
  {
    id: 'cp-demo-2',
    name: 'Vellaimalaipattinam Residential Area',
    ward: 'Vellaimalaipattinam Zone',
    latitude: 10.9980,
    longitude: 76.7650,
    capacity: 1200,
    current_fill_percent: 28,
    current_weight_kg: 110,
    status: 'active',
    is_demo: true,
    sensitivity: 'residential',
  },
  {
    id: 'cp-demo-3',
    name: 'Ikkaraibooluvampatti Community Area',
    ward: 'Ikkaraibooluvampatti Zone',
    latitude: 11.0085,
    longitude: 76.7620,
    capacity: 800,
    current_fill_percent: 20,
    current_weight_kg: 64,
    status: 'active',
    is_demo: true,
    sensitivity: 'community',
  },
  {
    id: 'cp-demo-4',
    name: 'Devarayapuram Main Road',
    ward: 'Devarayapuram Zone',
    latitude: 10.9880,
    longitude: 76.7820,
    capacity: 1500,
    current_fill_percent: 42,
    current_weight_kg: 230,
    status: 'active',
    is_demo: true,
    sensitivity: 'commercial',
  },
];

/**
 * Retrieves the current Demo Simulation state.
 * Returns baseline 'NORMAL' state if no state is stored in localStorage.
 */
export function getDemoState(): DemoSimulationState {
  if (typeof window === 'undefined') {
    return createBaselineState();
  }

  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createBaselineState();
    const parsed = JSON.parse(raw) as DemoSimulationState;
    // Attach Priority calculations
    parsed.points = parsed.points.map(attachPriority);
    return parsed;
  } catch (e) {
    console.warn('Error reading demo state from localStorage:', e);
    return createBaselineState();
  }
}

/**
 * Creates default baseline NORMAL state.
 */
export function createBaselineState(): DemoSimulationState {
  const pointsWithPriority = BASELINE_DEMO_POINTS.map(attachPriority);
  return {
    stage: 'NORMAL',
    points: pointsWithPriority,
    simulated_readings: [],
    active_demo_route: null,
    last_updated: new Date().toISOString(),
    surge_count: 0,
  };
}

/**
 * Calculates priority using PriorityEngine and attaches it to DemoPoint.
 */
function attachPriority(point: DemoPoint): DemoPoint {
  const isSurge = point.current_fill_percent >= 85;
  const mockLastCollected = new Date(
    Date.now() - (isSurge ? 3600 * 1000 * 48 : 3600 * 1000 * 4)
  ).toISOString();

  const priorityRes = calculateSmartPriority({
    fill_percentage: point.current_fill_percent,
    current_weight_kg: point.current_weight_kg,
    capacity_kg: point.capacity,
    location_sensitivity: point.sensitivity || 'residential',
    last_collected_at: point.last_collected_at || mockLastCollected,
    hours_since_collection: isSurge ? 48 : 4,
    complaint_count: isSurge ? 3 : 0,
    citizen_reported_severity: isSurge ? 'CRITICAL' : 'LOW',
  });
  return {
    ...point,
    priorityRes,
  };
}

/**
 * Triggers a "Waste Surge" demo simulation.
 * Elevates demo collection points fill levels to 88%-96%, logs simulated sensor readings with `is_simulated: true`,
 * recalculates priority scores, and transitions stage to WASTE_SURGE -> CRITICAL_PRIORITIES.
 */
export function simulateWasteSurge(): DemoSimulationState {
  const currentState = getDemoState();

  const surgeLevels: Record<string, { fill: number; status: 'overflowing' | 'active' }> = {
    'cp-demo-1': { fill: 96, status: 'overflowing' },
    'cp-demo-2': { fill: 92, status: 'overflowing' },
    'cp-demo-3': { fill: 88, status: 'overflowing' },
    'cp-demo-4': { fill: 85, status: 'overflowing' },
  };

  const timestamp = new Date().toISOString();
  const newReadings: SimulatedSensorReading[] = [];

  const updatedPoints = currentState.points.map((pt) => {
    const surge = surgeLevels[pt.id] || { fill: 90, status: 'overflowing' };
    const newWeight = Math.round((surge.fill / 100) * pt.capacity);

    // Create realistic simulated sensor reading explicitly stamped as simulation data
    newReadings.push({
      id: `sim-reading-${pt.id}-${Date.now()}`,
      point_id: pt.id,
      recorded_at: timestamp,
      fill_percent: surge.fill,
      battery_level: 94,
      is_simulated: true,
      source: 'demo_simulation',
    });

    const updatedPt: DemoPoint = {
      ...pt,
      current_fill_percent: surge.fill,
      current_weight_kg: newWeight,
      status: surge.status,
    };
    return attachPriority(updatedPt);
  });

  const newState: DemoSimulationState = {
    stage: 'CRITICAL_PRIORITIES',
    points: updatedPoints,
    simulated_readings: [...currentState.simulated_readings, ...newReadings],
    active_demo_route: null,
    last_updated: timestamp,
    surge_count: currentState.surge_count + 1,
  };

  saveAndNotifyDemoState(newState);
  return newState;
}

/**
 * Resets the demo data to its original baseline state.
 */
export function resetDemo(): DemoSimulationState {
  const baseline = createBaselineState();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem('smartwaste_saved_driver_route');
  }
  saveAndNotifyDemoState(baseline);
  return baseline;
}

/**
 * Updates stage in the demo workflow.
 */
export function updateDemoStage(newStage: DemoStage, activeRoute?: any): DemoSimulationState {
  const state = getDemoState();
  const updated: DemoSimulationState = {
    ...state,
    stage: newStage,
    active_demo_route: activeRoute !== undefined ? activeRoute : state.active_demo_route,
    last_updated: new Date().toISOString(),
  };
  saveAndNotifyDemoState(updated);
  return updated;
}

/**
 * Updates a stop collection completion in the active demo route.
 */
export function completeDemoStop(stopId: string, verificationData: any): DemoSimulationState {
  const state = getDemoState();
  let route = state.active_demo_route;

  if (!route && typeof window !== 'undefined') {
    const storedRouteStr = localStorage.getItem('smartwaste_saved_driver_route');
    if (storedRouteStr) {
      try {
        route = JSON.parse(storedRouteStr);
      } catch (e) {
        console.warn('Error reading saved driver route:', e);
      }
    }
  }

  if (route && route.stops) {
    let completedCount = 0;
    const updatedStops = route.stops.map((s: any) => {
      if (s.id === stopId) {
        return {
          ...s,
          status: 'collected',
          collected_at: new Date().toISOString(),
          verification_image_url: verificationData?.verification_image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
          verification_latitude: verificationData?.verification_latitude || null,
          verification_longitude: verificationData?.verification_longitude || null,
          gps_verified: Boolean(verificationData?.gps_verified),
          location_status: verificationData?.location_status || 'verified',
        };
      }
      return s;
    });

    completedCount = updatedStops.filter((s: any) => s.status === 'collected').length;
    const isAllCompleted = completedCount === updatedStops.length;

    route = {
      ...route,
      stops: updatedStops,
      completed_stops: completedCount,
      remaining_stops: updatedStops.length - completedCount,
      route_status: isAllCompleted ? 'completed' : 'in_progress',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('smartwaste_saved_driver_route', JSON.stringify(route));
    }

    // Reset fill levels of completed points in demo state
    const collectedPointIds = new Set(
      updatedStops.filter((s: any) => s.status === 'collected').map((s: any) => s.collection_point_id || s.bin_id)
    );

    const updatedPoints = state.points.map((p) => {
      if (collectedPointIds.has(p.id)) {
        return attachPriority({
          ...p,
          current_fill_percent: 0,
          current_weight_kg: 0,
          status: 'active',
          last_collected_at: new Date().toISOString(),
        });
      }
      return p;
    });

    const newState: DemoSimulationState = {
      ...state,
      stage: isAllCompleted ? 'VERIFIED_COMPLETION' : 'DRIVER_COLLECTION',
      points: updatedPoints,
      active_demo_route: route,
      last_updated: new Date().toISOString(),
    };

    saveAndNotifyDemoState(newState);
    return newState;
  }

  return state;
}

/**
 * Saves demo state to localStorage and broadcasts custom change event across components.
 */
function saveAndNotifyDemoState(state: DemoSimulationState) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(EVENT_DEMO_CHANGE, { detail: state }));
    } catch (e) {
      console.warn('Error writing demo state to localStorage:', e);
    }
  }
}

/**
 * Listens for Demo Simulation state change events.
 */
export function subscribeDemoStateChange(callback: (state: DemoSimulationState) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DemoSimulationState>;
    callback(customEvent.detail || getDemoState());
  };

  window.addEventListener(EVENT_DEMO_CHANGE, handler);
  return () => {
    window.removeEventListener(EVENT_DEMO_CHANGE, handler);
  };
}
