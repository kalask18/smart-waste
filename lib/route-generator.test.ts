import { generateSmartCollectionRoute } from './route-generator';

/**
 * Unit Test Suite for SmartWaste Route-Generation Engine
 * Runs deterministic assertions against all required routing scenarios.
 */
export async function runRouteGeneratorTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 RUNNING ROUTE-GENERATION ENGINE UNIT TESTS');
  console.log('----------------------------------------------------\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`      -> ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`      -> ${detail}`);
      failed++;
    }
  }

  // Scenario 1: No Collection Points
  {
    const res = await generateSmartCollectionRoute({
      collectionPoints: [],
      wasteReports: [],
      forceFallback: true,
    });
    assert(
      res.total_stops === 0 && res.total_distance_km === 0,
      'Scenario 1: No Collection Points',
      `Stops: ${res.total_stops}, Total Distance: ${res.total_distance_km}km`
    );
  }

  // Scenario 2: One Collection Point
  {
    const res = await generateSmartCollectionRoute({
      collectionPoints: [
        {
          id: 'cp-1',
          name: 'Central Panchayat Bin',
          latitude: 11.0003,
          longitude: 76.7725,
          capacity: 1000,
          current_fill_percent: 85,
          current_weight_kg: 350,
          status: 'overflowing',
          created_at: new Date().toISOString(),
        },
      ],
      forceFallback: true,
    });
    assert(
      res.total_stops === 1 && res.stops[0].location_name === 'Central Panchayat Bin' && res.stops[0].why_this_stop.length > 0,
      'Scenario 2: One Collection Point',
      `Stops: ${res.total_stops}, Stop 1: "${res.stops[0]?.location_name}", Why: "${res.stops[0]?.why_this_stop[0]}"`
    );
  }

  // Scenario 3: Multiple Collection Points
  {
    const res = await generateSmartCollectionRoute({
      collectionPoints: [
        { id: 'cp-1', name: 'Narasipuram Market Bin', latitude: 11.0003, longitude: 76.7725, capacity: 1000, current_fill_percent: 85, current_weight_kg: 340, status: 'overflowing', created_at: new Date().toISOString() },
        { id: 'cp-2', name: 'Primary Health Centre Dumpster', latitude: 10.9980, longitude: 76.7745, capacity: 1200, current_fill_percent: 90, current_weight_kg: 410, status: 'overflowing', created_at: new Date().toISOString() },
        { id: 'cp-3', name: 'Government School Container', latitude: 11.0028, longitude: 76.7705, capacity: 800, current_fill_percent: 65, current_weight_kg: 210, status: 'active', created_at: new Date().toISOString() },
      ],
      forceFallback: true,
    });
    assert(
      res.total_stops === 3 && res.total_distance_km > 0 && res.remaining_capacity_kg >= 0,
      'Scenario 3: Multiple Collection Points',
      `Stops: ${res.total_stops}, Distance: ${res.total_distance_km}km, Remaining Capacity: ${res.remaining_capacity_kg}kg`
    );
  }

  // Scenario 4: Insufficient Vehicle Capacity
  {
    const res = await generateSmartCollectionRoute({
      vehicle_capacity_kg: 300, // Small vehicle (300 kg)
      collectionPoints: [
        { id: 'cp-1', name: 'Bin A', latitude: 11.0003, longitude: 76.7725, capacity: 1000, current_fill_percent: 90, current_weight_kg: 250, status: 'overflowing', created_at: new Date().toISOString() },
        { id: 'cp-2', name: 'Bin B', latitude: 10.9980, longitude: 76.7745, capacity: 1000, current_fill_percent: 85, current_weight_kg: 250, status: 'overflowing', created_at: new Date().toISOString() },
      ],
      forceFallback: true,
    });
    assert(
      res.capacity_exceeded === true && res.total_payload_kg > 300,
      'Scenario 4: Insufficient Vehicle Capacity',
      `Capacity Exceeded Flag: ${res.capacity_exceeded}, Payload: ${res.total_payload_kg}kg / Limit: 300kg`
    );
  }

  // Scenario 5: Critical Points Prioritization
  {
    const res = await generateSmartCollectionRoute({
      collectionPoints: [
        { id: 'cp-low', name: 'Low Residential Bin', latitude: 11.0003, longitude: 76.7725, capacity: 1000, current_fill_percent: 15, current_weight_kg: 50, status: 'active', created_at: new Date().toISOString() },
        { id: 'cp-crit', name: 'Hospital Critical Dumpster', latitude: 10.9980, longitude: 76.7745, capacity: 1200, current_fill_percent: 98, current_weight_kg: 500, status: 'overflowing', created_at: new Date().toISOString() },
      ],
      forceFallback: true,
    });
    assert(
      res.stops[0].location_name === 'Hospital Critical Dumpster',
      'Scenario 5: Critical Points Prioritization',
      `First Priority Stop: "${res.stops[0]?.location_name}" (Score: ${res.stops[0]?.priority_score})`
    );
  }

  // Scenario 6: Unavailable Routing Service (Haversine Fallback)
  {
    const res = await generateSmartCollectionRoute({
      collectionPoints: [
        { id: 'cp-1', name: 'Bin 1', latitude: 11.0003, longitude: 76.7725, capacity: 1000, current_fill_percent: 70, current_weight_kg: 200, status: 'active', created_at: new Date().toISOString() },
        { id: 'cp-2', name: 'Bin 2', latitude: 10.9980, longitude: 76.7745, capacity: 1000, current_fill_percent: 80, current_weight_kg: 300, status: 'active', created_at: new Date().toISOString() },
      ],
      forceFallback: true,
    });
    assert(
      res.is_fallback === true && res.total_distance_km > 0,
      'Scenario 6: Unavailable Routing Service (Haversine Fallback)',
      `Fallback Active: ${res.is_fallback}, Calculated Distance: ${res.total_distance_km}km`
    );
  }

  console.log('\n----------------------------------------------------');
  console.log(`📊 ROUTE ENGINE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    throw new Error(`Route Engine tests failed with ${failed} error(s).`);
  }

  return { passed, failed };
}

// Execute tests if run directly with Node/tsx
if (typeof process !== 'undefined' && require.main === module) {
  runRouteGeneratorTests();
}
