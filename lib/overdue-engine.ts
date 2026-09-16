export type OverdueStatus = 'NORMAL' | 'OVERDUE' | 'COMPLETED' | 'COMPLETED_LATE';

export interface EvaluateOverdueParams {
  scheduled_at: string | Date;
  collected_at?: string | Date | null;
  now?: string | Date;
  gracePeriodMinutes?: number;
}

export interface OverdueEvaluationResult {
  status: OverdueStatus;
  isOverdue: boolean;
  isCompletedLate: boolean;
  minutesOverdue: number;
  elevatedPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

/**
 * Deterministically evaluates whether a collection is normal, overdue, completed on time, or completed late.
 * Does not mutate historical data; provides audit-clear evaluations.
 */
export function evaluateCollectionOverdueStatus(
  params: EvaluateOverdueParams
): OverdueEvaluationResult {
  const { scheduled_at, collected_at, now = new Date(), gracePeriodMinutes = 60 } = params;

  const scheduledTime = new Date(scheduled_at).getTime();
  const currentTime = new Date(now).getTime();
  const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
  const deadlineTime = scheduledTime + gracePeriodMs;

  // Case 1: Collection has been performed
  if (collected_at) {
    const collectedTime = new Date(collected_at).getTime();
    if (collectedTime <= deadlineTime) {
      return {
        status: 'COMPLETED',
        isOverdue: false,
        isCompletedLate: false,
        minutesOverdue: 0,
        elevatedPriority: 'LOW',
        explanation: `Collection completed on schedule at ${new Date(collectedTime).toLocaleTimeString()}.`,
      };
    } else {
      const lateMins = Math.round((collectedTime - deadlineTime) / (1000 * 60));
      return {
        status: 'COMPLETED_LATE',
        isOverdue: false,
        isCompletedLate: true,
        minutesOverdue: lateMins,
        elevatedPriority: 'MEDIUM',
        explanation: `Collection completed ${lateMins} mins after grace period deadline.`,
      };
    }
  }

  // Case 2: Collection not yet performed - check if past deadline
  if (currentTime > deadlineTime) {
    const overdueMins = Math.round((currentTime - deadlineTime) / (1000 * 60));
    const elevatedPri: 'CRITICAL' | 'HIGH' = overdueMins > 120 ? 'CRITICAL' : 'HIGH';

    return {
      status: 'OVERDUE',
      isOverdue: true,
      isCompletedLate: false,
      minutesOverdue: overdueMins,
      elevatedPriority: elevatedPri,
      explanation: `OVERDUE: Scheduled time passed ${overdueMins} mins ago (Grace Period: ${gracePeriodMinutes} mins).`,
    };
  }

  // Case 3: Scheduled in future or within grace period
  return {
    status: 'NORMAL',
    isOverdue: false,
    isCompletedLate: false,
    minutesOverdue: 0,
    elevatedPriority: 'LOW',
    explanation: 'Scheduled for pickup within normal timeframe.',
  };
}
