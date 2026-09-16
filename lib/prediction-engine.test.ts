import assert from 'node:assert';
import { predictCollectionPointDemand } from './prediction-engine';

export function runPredictionEngineTests() {
  // Test 1: < 3 readings returns Insufficient historical data
  const res1 = predictCollectionPointDemand({
    point_id: 'cp-insufficient',
    point_name: 'Unsampled Container',
    current_fill_percent: 50,
    capacity_kg: 1000,
    historical_readings: [
      { recorded_at: new Date(Date.now() - 3600 * 1000).toISOString(), fill_percent: 45 },
    ],
  });

  assert.strictEqual(res1.has_sufficient_data, false);
  assert.strictEqual(res1.data_quality_label, 'Insufficient historical data');
  assert.strictEqual(res1.readings_count, 1);

  // Test 2: >= 3 readings calculates forecast accumulation
  const baseTime = Date.now();
  const res2 = predictCollectionPointDemand({
    point_id: 'cp-sufficient',
    point_name: 'Market Commercial Bin',
    current_fill_percent: 60,
    capacity_kg: 1200,
    forecast_hours: 12,
    historical_readings: [
      { recorded_at: new Date(baseTime - 3600 * 1000 * 12).toISOString(), fill_percent: 20 },
      { recorded_at: new Date(baseTime - 3600 * 1000 * 6).toISOString(), fill_percent: 40 },
      { recorded_at: new Date(baseTime).toISOString(), fill_percent: 60 },
    ],
  });

  assert.strictEqual(res2.has_sufficient_data, true);
  assert.strictEqual(res2.readings_count, 3);
  assert.ok(res2.data_quality_label.includes('Moderate Quality Data'));
  assert.ok(res2.predicted_fill_percent > res2.current_fill_percent);

  // Test 3: High accumulation triggering HIGH DEMAND (Overflow Risk)
  const res3 = predictCollectionPointDemand({
    point_id: 'cp-overflow',
    point_name: 'High Accumulation Point',
    current_fill_percent: 75,
    capacity_kg: 1000,
    forecast_hours: 6,
    recent_reports_count: 2,
    historical_readings: [
      { recorded_at: new Date(baseTime - 3600 * 1000 * 10).toISOString(), fill_percent: 25 },
      { recorded_at: new Date(baseTime - 3600 * 1000 * 5).toISOString(), fill_percent: 50 },
      { recorded_at: new Date(baseTime).toISOString(), fill_percent: 75 },
    ],
  });

  assert.strictEqual(res3.predicted_demand_level, 'HIGH DEMAND (Overflow Risk)');
  assert.ok(res3.predicted_fill_percent >= 85);

  // Test 4: Verify no fake accuracy percentages exist in result properties
  const res4Json = JSON.stringify(res3);
  assert.strictEqual(res4Json.includes('% accuracy'), false);
  assert.strictEqual(res4Json.includes('AI Accuracy'), false);

  console.log('✅ Waste-Demand Prototype Prediction Engine Unit Tests Passed (4/4 cases verified)!');
}

runPredictionEngineTests();
