import assert from 'node:assert';
import { calculateHotspotScore } from './hotspot-engine';

export function runHotspotEngineTests() {
  // Test 1: High reports + high fill + overdue → CRITICAL Hotspot
  const res1 = calculateHotspotScore({
    point_id: 'cp1',
    point_name: 'Narasipuram Main Road Bin',
    reports_count: 5,
    average_fill_percent: 92,
    high_fill_readings_percent: 90,
    overdue_collections_count: 2,
    collections_per_week: 4,
  });

  assert.strictEqual(res1.severity, 'CRITICAL');
  assert.ok(res1.hotspot_score >= 75);
  assert.strictEqual(res1.score_breakdown.length, 4);

  // Test 2: Moderate fill + low reports → MEDIUM Hotspot
  const res2 = calculateHotspotScore({
    point_id: 'cp2',
    point_name: 'School Gate Container',
    reports_count: 1,
    average_fill_percent: 55,
    high_fill_readings_percent: 40,
    overdue_collections_count: 0,
    collections_per_week: 2,
  });

  assert.ok(res2.hotspot_score >= 20 && res2.hotspot_score < 75);
  assert.strictEqual(res2.overdue_count, 0);

  // Test 3: Zero reports + low fill → LOW Hotspot
  const res3 = calculateHotspotScore({
    point_id: 'cp3',
    point_name: 'Low Demand Bin',
    reports_count: 0,
    average_fill_percent: 20,
    high_fill_readings_percent: 10,
    overdue_collections_count: 0,
    collections_per_week: 1,
  });

  assert.strictEqual(res3.severity, 'LOW');
  assert.ok(res3.hotspot_score < 35);

  console.log('✅ Hotspot Analytics Engine Unit Tests Passed (3/3 cases verified)!');
}

runHotspotEngineTests();
