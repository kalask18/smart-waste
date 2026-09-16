import assert from 'node:assert';
import { evaluateCollectionOverdueStatus } from './overdue-engine';

export function runOverdueEngineTests() {
  const baseNow = new Date('2026-09-15T12:00:00Z');
  const gracePeriodMins = 60; // 1 hour grace period

  // Test 1: scheduled future → NORMAL
  const scheduledFuture = new Date('2026-09-15T14:00:00Z').toISOString();
  const res1 = evaluateCollectionOverdueStatus({
    scheduled_at: scheduledFuture,
    now: baseNow,
    gracePeriodMinutes: gracePeriodMins,
  });
  assert.strictEqual(res1.status, 'NORMAL');
  assert.strictEqual(res1.isOverdue, false);
  assert.strictEqual(res1.isCompletedLate, false);

  // Test 2: scheduled past + not collected → OVERDUE
  const scheduledPast = new Date('2026-09-15T09:00:00Z').toISOString();
  const res2 = evaluateCollectionOverdueStatus({
    scheduled_at: scheduledPast,
    now: baseNow,
    gracePeriodMinutes: gracePeriodMins,
  });
  assert.strictEqual(res2.status, 'OVERDUE');
  assert.strictEqual(res2.isOverdue, true);
  assert.strictEqual(res2.minutesOverdue, 120);

  // Test 3: collected before deadline → COMPLETED
  const scheduledOnTime = new Date('2026-09-15T10:00:00Z').toISOString();
  const collectedOnTime = new Date('2026-09-15T10:30:00Z').toISOString();
  const res3 = evaluateCollectionOverdueStatus({
    scheduled_at: scheduledOnTime,
    collected_at: collectedOnTime,
    now: baseNow,
    gracePeriodMinutes: gracePeriodMins,
  });
  assert.strictEqual(res3.status, 'COMPLETED');
  assert.strictEqual(res3.isOverdue, false);
  assert.strictEqual(res3.isCompletedLate, false);

  // Test 4: collected after deadline → COMPLETED_LATE
  const scheduledLate = new Date('2026-09-15T08:00:00Z').toISOString();
  const collectedLate = new Date('2026-09-15T10:00:00Z').toISOString();
  const res4 = evaluateCollectionOverdueStatus({
    scheduled_at: scheduledLate,
    collected_at: collectedLate,
    now: baseNow,
    gracePeriodMinutes: gracePeriodMins,
  });
  assert.strictEqual(res4.status, 'COMPLETED_LATE');
  assert.strictEqual(res4.isOverdue, false);
  assert.strictEqual(res4.isCompletedLate, true);

  console.log('✅ Overdue Engine Unit Tests Passed (4/4 cases verified)!');
}

runOverdueEngineTests();
