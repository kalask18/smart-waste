/**
 * OSRM (Open Source Routing Machine) Service with Haversine Fallback
 * Provides real road-distance routing & polyline geometry, falling back gracefully
 * to geographic Haversine distance when OSRM API is offline or unavailable.
 */

export interface OSRMRouteResult {
  totalDistanceKm: number;
  estimatedDurationMins: number;
  geometryCoordinates: Array<[number, number]>; // [lat, lng] array for Leaflet polyline
  isFallback: boolean;
}

/**
 * Calculates Haversine geographic distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimal places
}

/**
 * Fetches road routing geometry and distance from OSRM Public API.
 * Falls back to Haversine calculation if OSRM is unreachable or disabled.
 */
export async function fetchOSRMRoute(
  waypoints: Array<[number, number]>, // Array of [lat, lng]
  forceFallback: boolean = false
): Promise<OSRMRouteResult> {
  if (waypoints.length < 2) {
    return {
      totalDistanceKm: 0,
      estimatedDurationMins: 0,
      geometryCoordinates: waypoints,
      isFallback: false,
    };
  }

  if (forceFallback) {
    return calculateHaversineFallback(waypoints);
  }

  try {
    // OSRM format: lng,lat;lng,lat...
    const formattedCoordinates = waypoints
      .map(([lat, lng]) => `${lng},${lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${formattedCoordinates}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMins = Math.round(route.duration / 60);
        // Convert OSRM GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
        const geometryCoordinates: Array<[number, number]> = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );

        return {
          totalDistanceKm: distanceKm,
          estimatedDurationMins: durationMins,
          geometryCoordinates,
          isFallback: false,
        };
      }
    }
  } catch (e) {
    console.warn('OSRM service unavailable, using Haversine fallback:', e);
  }

  return calculateHaversineFallback(waypoints);
}

/**
 * Fallback route calculator using Haversine distance formula.
 */
function calculateHaversineFallback(waypoints: Array<[number, number]>): OSRMRouteResult {
  let totalDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];
    totalDist += calculateHaversineDistance(lat1, lng1, lat2, lng2);
  }

  totalDist = Math.max(1.5, Math.round(totalDist * 10) / 10);
  // Estimate driving time at ~25 km/h average speed in municipal zone
  const durationMins = Math.round((totalDist / 25) * 60 + waypoints.length * 5);

  return {
    totalDistanceKm: totalDist,
    estimatedDurationMins: durationMins,
    geometryCoordinates: waypoints, // Straight line polyline segments
    isFallback: true,
  };
}
