import assert from 'node:assert';
import {
  getWasteDemandPrediction,
  generateAllDemandPredictions,
} from './ai-demand-forecast';
import { CollectionPoint } from '@/types/database';

export function runAIDemandForecastTests() {
  // Test 1: Baseline point returns LOW or MEDIUM risk
  const baselinePoint: CollectionPoint = {
    id: 'cp-base',
    name: 'MG Road Park Bin',
    capacity: 1000,
    current_fill_percent: 25,
    current_weight_kg: 100,
    status: 'active',
    created_at: new Date().toISOString(),
    latitude: 11.0003,
    longitude: 76.7725,
  };

  const pred1 = getWasteDemandPrediction({ point: baselinePoint, reports_count: 0, hours_since_collection: 6 });
  assert.ok(pred1.riskScore < 50);
  assert.ok(pred1.level === 'LOW' || pred1.level === 'MEDIUM');

  // Test 2: High fill point (88%) returns HIGH or CRITICAL risk
  const highFillPoint: CollectionPoint = {
    ...baselinePoint,
    id: 'cp-high',
    name: 'Market Yard Overflowing Bin',
    current_fill_percent: 88,
    current_weight_kg: 440,
    status: 'overflowing',
  };

  const pred2 = getWasteDemandPrediction({ point: highFillPoint, reports_count: 2, hours_since_collection: 36 });
  assert.ok(pred2.riskScore >= 75);
  assert.strictEqual(pred2.level, 'CRITICAL');
  assert.ok(pred2.explanation.includes('critical fill level'));
  assert.ok(pred2.recommendedAction.includes('Collect earlier'));

  // Test 3: Multiple citizen reports increase risk score
  const noReportsPred = getWasteDemandPrediction({ point: baselinePoint, reports_count: 0 });
  const withReportsPred = getWasteDemandPrediction({ point: baselinePoint, reports_count: 3 });
  assert.ok(withReportsPred.riskScore > noReportsPred.riskScore);

  // Test 4: Extended collection age increases risk score
  const recentPred = getWasteDemandPrediction({ point: baselinePoint, hours_since_collection: 2 });
  const agedPred = getWasteDemandPrediction({ point: baselinePoint, hours_since_collection: 48 });
  assert.ok(agedPred.riskScore > recentPred.riskScore);

  // Test 5: Waste surge simulation identifies high risk locations
  const pointsList: CollectionPoint[] = [baselinePoint, highFillPoint];
  const allPreds = generateAllDemandPredictions(pointsList, []);
  assert.strictEqual(allPreds.length, 2);
  assert.strictEqual(allPreds[0].point_id, 'cp-high'); // Top risk first
  assert.ok(allPreds[0].riskScore > allPreds[1].riskScore);

  // Test 6: AI failure fallback returns safe prediction without crashing
  const badPoint: any = null;
  const fallbackPred = getWasteDemandPrediction({ point: badPoint });
  assert.strictEqual(fallbackPred.level, 'LOW');
  assert.ok(fallbackPred.riskScore <= 40);

  console.log('✅ AI Waste Demand Forecast Engine Unit Tests Passed (6/6 cases verified)!');
}

runAIDemandForecastTests();
