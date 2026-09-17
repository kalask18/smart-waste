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
 * Tries secondary OpenStreetMap routing service if primary is unreachable.
 * Falls back to smooth curved Haversine calculation if OSRM is unreachable.
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

  const formattedCoordinates = waypoints
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');

  // Endpoint 1: Primary OSRM public server
  const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${formattedCoordinates}?overview=full&geometries=geojson`;
  // Endpoint 2: Secondary OpenStreetMap DE routing server
  const secondaryUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${formattedCoordinates}?overview=full&geometries=geojson`;

  const endpoints = [primaryUrl, secondaryUrl];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout per endpoint

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
      console.warn(`OSRM endpoint (${url}) unreachable, trying next:`, e);
    }
  }

  return calculateHaversineFallback(waypoints);
}

/**
 * Fallback route calculator using Haversine distance formula with smooth road curve interpolation.
 */
function calculateHaversineFallback(waypoints: Array<[number, number]>): OSRMRouteResult {
  let totalDist = 0;
  const smoothCoords: Array<[number, number]> = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lng1] = waypoints[i];
    const [lat2, lng2] = waypoints[i + 1];
    totalDist += calculateHaversineDistance(lat1, lng1, lat2, lng2);

    // Generate 8 intermediate points with subtle curvature simulating road curves
    const steps = 8;
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    // Perpendicular vector for subtle road curvature
    const perpLat = -dLng * 0.08;
    const perpLng = dLat * 0.08;

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      // Quadratic curve offset
      const curveFactor = 4 * t * (1 - t); // 0 at ends, 1 at midpoint
      const intLat = lat1 + dLat * t + perpLat * curveFactor;
      const intLng = lng1 + dLng * t + perpLng * curveFactor;
      smoothCoords.push([intLat, intLng]);
    }
  }

  // Push final endpoint
  if (waypoints.length > 0) {
    smoothCoords.push(waypoints[waypoints.length - 1]);
  }

  totalDist = Math.max(1.5, Math.round(totalDist * 10) / 10);
  // Estimate driving time at ~25 km/h average speed in municipal zone
  const durationMins = Math.round((totalDist / 25) * 60 + waypoints.length * 5);

  return {
    totalDistanceKm: totalDist,
    estimatedDurationMins: durationMins,
    geometryCoordinates: smoothCoords.length > 0 ? smoothCoords : waypoints,
    isFallback: true,
  };
}
