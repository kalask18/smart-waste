import assert from 'node:assert';
import {
  createBaselineState,
  simulateWasteSurge,
  resetDemo,
  getDemoState,
} from './demo-simulation-service';

export function runDemoSimulationTests() {
  // Test 1: Baseline state starts in NORMAL
  const baseline = createBaselineState();
  assert.strictEqual(baseline.stage, 'NORMAL');
  assert.strictEqual(baseline.points.length, 4);
  assert.ok(baseline.points.every((p) => p.current_fill_percent < 50));
  assert.ok(baseline.points.every((p) => p.is_demo === true));

  // Test 2: simulateWasteSurge elevates fill levels and tags simulated readings
  const surgeState = simulateWasteSurge();
  assert.strictEqual(surgeState.stage, 'CRITICAL_PRIORITIES');
  assert.ok(surgeState.points.every((p) => p.current_fill_percent >= 85));
  assert.ok(surgeState.points.every((p) => p.status === 'overflowing'));
  assert.ok(surgeState.points.every((p) => p.priorityRes?.level === 'CRITICAL'));
  assert.strictEqual(surgeState.simulated_readings.length, 4);
  assert.ok(surgeState.simulated_readings.every((r) => r.is_simulated === true));
  assert.ok(surgeState.simulated_readings.every((r) => r.source === 'demo_simulation'));

  // Test 3: resetDemo restores baseline NORMAL state cleanly
  const resetState = resetDemo();
  assert.strictEqual(resetState.stage, 'NORMAL');
  assert.strictEqual(resetState.simulated_readings.length, 0);
  assert.ok(resetState.points.every((p) => p.current_fill_percent < 50));

  // Test 4: Repeatability (Surge -> Reset -> Surge)
  const surge2 = simulateWasteSurge();
  assert.strictEqual(surge2.stage, 'CRITICAL_PRIORITIES');
  assert.ok(surge2.points.every((p) => p.current_fill_percent >= 85));

  const reset2 = resetDemo();
  assert.strictEqual(reset2.stage, 'NORMAL');

  console.log('✅ Demo Simulation Service Unit Tests Passed (4/4 cases verified)!');
}

runDemoSimulationTests();
