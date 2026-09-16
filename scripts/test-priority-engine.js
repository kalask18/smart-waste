/**
 * Smart Waste Priority Engine Automated Unit Test Suite
 */

const { calculateSmartPriority } = require('../lib/priority-engine.ts');

function runPriorityEngineTests() {
  console.log('---------------------------------------------------------');
  console.log('🧪 RUNNING SMART WASTE PRIORITY ENGINE UNIT TEST SUITE');
  console.log('---------------------------------------------------------\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`   ✅ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`   ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // TEST 1: High Fill Level in Sensitive Location (School)
  console.log('1. Testing Fresh IoT Sensor Data in High Sensitivity Zone (School)...');
  const test1 = calculateSmartPriority({
    fill_percentage: 94,
    location_sensitivity: 'school',
    last_collected_at: new Date(Date.now() - 36 * 3600 * 1000), // 36 hours ago
    complaint_count: 4,
    sensor_is_online: true,
    sensor_last_ping: new Date(),
  });

  assert(test1.level === 'CRITICAL', `Expected CRITICAL priority, got ${test1.level}`);
  assert(test1.score >= 76, `Expected score >= 76, got ${test1.score}`);
  assert(test1.factors.usedSensorData === true, 'Expected usedSensorData === true');
  assert(test1.explanation.includes('fill level is 94%'), 'Expected explanation to mention 94% fill level');
  assert(test1.explanation.includes('overdue'), 'Expected explanation to mention overdue collection');
  console.log(`   📝 Explanation: "${test1.explanation}"\n`);

  // TEST 2: Stale Sensor Data Fallback to Citizen Report Severity
  console.log('2. Testing Stale Sensor Data Fallback...');
  const test2 = calculateSmartPriority({
    fill_percentage: 10, // low stale reading
    sensor_last_ping: new Date(Date.now() - 72 * 3600 * 1000), // 72 hours ago (Stale!)
    citizen_reported_severity: 'CRITICAL',
    location_sensitivity: 'market',
    complaint_count: 3,
  });

  assert(test2.factors.isStaleSensor === true, 'Expected isStaleSensor === true');
  assert(test2.factors.usedSensorData === false, 'Expected usedSensorData === false (fallback)');
  assert(test2.factors.wasteLevelScore === 90, 'Expected fallback wasteLevelScore === 90 from CRITICAL report');
  assert(test2.level === 'HIGH' || test2.level === 'CRITICAL', `Expected HIGH or CRITICAL level, got ${test2.level}`);
  console.log(`   📝 Explanation: "${test2.explanation}"\n`);

  // TEST 3: Null / Missing Values Safeguard & NaN Prevention
  console.log('3. Testing Missing / Null Values & NaN Prevention...');
  const test3 = calculateSmartPriority({
    fill_percentage: null,
    last_collected_at: null,
    complaint_count: null,
    location_sensitivity: null,
  });

  assert(!isNaN(test3.score), 'Expected score to be a valid number (no NaN)');
  assert(test3.score >= 0 && test3.score <= 100, `Expected score between 0 and 100, got ${test3.score}`);
  assert(test3.level === 'LOW' || test3.level === 'MEDIUM', `Expected LOW/MEDIUM for empty inputs, got ${test3.level}`);
  console.log(`   📝 Score: ${test3.score}/100, Level: ${test3.level}\n`);

  // TEST 4: Low Fill Level & Recent Collection
  console.log('4. Testing Low Fill Level & Recently Collected Bin...');
  const test4 = calculateSmartPriority({
    fill_percentage: 15,
    location_sensitivity: 'residential',
    last_collected_at: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
    complaint_count: 0,
  });

  assert(test4.level === 'LOW', `Expected LOW priority, got ${test4.level}`);
  assert(test4.score <= 30, `Expected score <= 30, got ${test4.score}`);
  console.log(`   📝 Explanation: "${test4.explanation}"\n`);

  // TEST 5: Configurable Threshold Overrides
  console.log('5. Testing Configurable Threshold Overrides...');
  const test5 = calculateSmartPriority({
    fill_percentage: 60,
    thresholds: {
      lowMax: 15,
      mediumMax: 25,
      highMax: 35,
    },
  });

  assert(test5.level === 'CRITICAL', `Expected CRITICAL with custom highMax=50, got ${test5.level}`);
  console.log(`   📝 Custom Threshold Result: ${test5.level} (Score ${test5.score})\n`);

  console.log('---------------------------------------------------------');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('---------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

try {
  runPriorityEngineTests();
} catch (err) {
  console.error('❌ Test Execution Error:', err);
  process.exit(1);
}
