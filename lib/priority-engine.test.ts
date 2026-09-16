import { calculateSmartPriority } from './priority-engine';

/**
 * Unit Test Suite for SmartWaste Priority Engine
 * Runs deterministic assertions against all required operational scenarios.
 */
export function runPriorityEngineTests() {
  console.log('----------------------------------------------------');
  console.log('🧪 RUNNING SMARTWASTE PRIORITY ENGINE UNIT TESTS');
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

  // Scenario 1: Low Fill Level
  {
    const res = calculateSmartPriority({
      fill_percentage: 15,
      hours_since_collection: 4,
      complaint_count: 0,
      location_sensitivity: 'residential',
    });
    assert(
      res.level === 'LOW' && res.score <= 30,
      'Scenario 1: Low Fill Level',
      `Score: ${res.score}, Level: ${res.level} | Explanation: "${res.explanation}"`
    );
  }

  // Scenario 2: High Fill Level
  {
    const res = calculateSmartPriority({
      fill_percentage: 80,
      hours_since_collection: 36,
      complaint_count: 1,
      location_sensitivity: 'market',
    });
    assert(
      res.level === 'HIGH' && res.score >= 56 && res.score <= 75,
      'Scenario 2: High Fill Level',
      `Score: ${res.score}, Level: ${res.level} | Explanation: "${res.explanation}"`
    );
  }

  // Scenario 3: Overflow Bin Level
  {
    const res = calculateSmartPriority({
      fill_percentage: 98,
      hours_since_collection: 36,
      complaint_count: 2,
      location_sensitivity: 'market',
    });
    assert(
      res.level === 'CRITICAL' && res.score >= 76,
      'Scenario 3: Overflow Bin Level',
      `Score: ${res.score}, Level: ${res.level} | Explanation: "${res.explanation}"`
    );
  }

  // Scenario 4: Multiple Citizen Complaints
  {
    const res = calculateSmartPriority({
      fill_percentage: 40,
      hours_since_collection: 6,
      complaint_count: 4, // 4 complaints = 100 complaint score
      location_sensitivity: 'residential',
    });
    assert(
      res.factors.complaintScore === 100,
      'Scenario 4: Multiple Citizen Complaints',
      `Complaint Factor Score: ${res.factors.complaintScore}/100, Total Score: ${res.score}`
    );
  }

  // Scenario 5: Long Overdue Collection
  {
    const res = calculateSmartPriority({
      fill_percentage: 30,
      hours_since_collection: 50, // > 48h = 100 time score
      complaint_count: 0,
      location_sensitivity: 'residential',
    });
    assert(
      res.factors.timeElapsedScore === 100,
      'Scenario 5: Long Overdue Collection',
      `Time Factor Score: ${res.factors.timeElapsedScore}/100, Total Score: ${res.score}`
    );
  }

  // Scenario 6: Critical Combination (Overflow + Overdue + Complaints + Hospital)
  {
    const res = calculateSmartPriority({
      fill_percentage: 98,
      hours_since_collection: 60,
      complaint_count: 4,
      location_sensitivity: 'hospital',
    });
    assert(
      res.level === 'CRITICAL' && res.score >= 90,
      'Scenario 6: Critical Combination',
      `Score: ${res.score}, Level: ${res.level} | Explanation: "${res.explanation}"`
    );
  }

  // Scenario 7: Custom Configurable Weight Overrides
  {
    const customWeights = { fillLevel: 0.80, timeSinceCollection: 0.10, complaints: 0.05, locationSensitivity: 0.05 };
    const res = calculateSmartPriority({
      fill_percentage: 100,
      hours_since_collection: 0,
      complaint_count: 0,
      location_sensitivity: 'residential',
      weights: customWeights,
    });
    assert(
      res.weights.fillLevel === 0.80 && res.score >= 80,
      'Scenario 7: Custom Configurable Weight Overrides',
      `Custom Fill Weight: ${res.weights.fillLevel * 100}%, Score: ${res.score}`
    );
  }

  console.log('\n----------------------------------------------------');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    throw new Error(`Priority Engine tests failed with ${failed} error(s).`);
  }

  return { passed, failed };
}

// Execute tests if run directly with Node/tsx
if (typeof process !== 'undefined' && require.main === module) {
  runPriorityEngineTests();
}
