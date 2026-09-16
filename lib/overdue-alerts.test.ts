import assert from 'node:assert';
import { evaluateCollectionOverdueStatus } from './overdue-engine';
import { calculateSmartPriority } from './priority-engine';
import {
  INITIAL_NOTIFICATIONS,
  checkAndCreateOverdueNotification,
} from './notification-service';

export function runOverdueAlertsTests() {
  // Test 1: Scheduled in past + not collected -> OVERDUE status
  const pastScheduled = new Date(Date.now() - 1000 * 60 * 150).toISOString(); // 150 mins ago
  const evalRes = evaluateCollectionOverdueStatus({
    scheduled_at: pastScheduled,
    now: new Date(),
    gracePeriodMinutes: 60,
  });

  assert.strictEqual(evalRes.isOverdue, true);
  assert.strictEqual(evalRes.status, 'OVERDUE');
  assert.ok(evalRes.minutesOverdue >= 80);

  // Test 2: Overdue priority boost (+15 points, capped at 100)
  const normalPriority = calculateSmartPriority({
    fill_percentage: 70,
    current_weight_kg: 700,
    capacity_kg: 1000,
    is_overdue: false,
  });

  const overduePriority = calculateSmartPriority({
    fill_percentage: 70,
    current_weight_kg: 700,
    capacity_kg: 1000,
    is_overdue: true,
  });

  assert.strictEqual(overduePriority.score, Math.min(100, normalPriority.score + 15));
  assert.ok(overduePriority.explanation.includes('Collection is overdue'));
  assert.ok(overduePriority.score <= 100);

  // Test 3: Deduplicated notification creation
  const stopId = 'test-stop-dedup-101';
  const notifs1 = checkAndCreateOverdueNotification({
    stop_id: stopId,
    location_name: 'Main Market Test Bin',
    overdue_mins: 45,
  });

  const countAfterFirst = notifs1.length;

  // Running a second time on the same stop must NOT create duplicate notification
  const notifs2 = checkAndCreateOverdueNotification({
    stop_id: stopId,
    location_name: 'Main Market Test Bin',
    overdue_mins: 45,
  });

  assert.strictEqual(notifs2.length, countAfterFirst);

  // Test 4: Verification completion resolves OVERDUE status to COMPLETED
  const completedEval = evaluateCollectionOverdueStatus({
    scheduled_at: pastScheduled,
    collected_at: new Date().toISOString(),
    gracePeriodMinutes: 60,
  });

  assert.strictEqual(completedEval.isOverdue, false);

  console.log('✅ Overdue Alerts & Detection Engine Unit Tests Passed (4/4 cases verified)!');
}

runOverdueAlertsTests();
