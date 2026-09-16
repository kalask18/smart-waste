import { PriorityLevel } from '../types/database';

export type LocationSensitivity =
  | 'hospital'
  | 'school'
  | 'transit_hub'
  | 'market'
  | 'commercial'
  | 'residential';

export interface PriorityWeights {
  fillLevel: number;           // Default: 0.40 (40%)
  timeSinceCollection: number; // Default: 0.25 (25%)
  complaints: number;          // Default: 0.20 (20%)
  locationSensitivity: number; // Default: 0.15 (15%)
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  fillLevel: 0.40,
  timeSinceCollection: 0.25,
  complaints: 0.20,
  locationSensitivity: 0.15,
};

export interface PriorityEngineInput {
  // Telemetry & Capacity
  fill_percentage?: number | null;
  current_weight_kg?: number | null;
  capacity_kg?: number | null;
  sensor_last_ping?: string | Date | null;
  sensor_is_online?: boolean | null;

  // Collection History
  last_collected_at?: string | Date | null;
  hours_since_collection?: number | null;

  // Citizen Complaints / Reports
  complaint_count?: number | null;
  citizen_reported_severity?: PriorityLevel | null;

  // Location Context
  location_sensitivity?: LocationSensitivity | string | null;

  // Overdue Collection Factor
  is_overdue?: boolean;
  overdue_minutes?: number;

  // Configurable Weight Overrides
  weights?: Partial<PriorityWeights>;

  // Configurable Threshold Overrides
  thresholds?: {
    lowMax?: number;     // Default 30 (0-30 LOW)
    mediumMax?: number;  // Default 55 (31-55 MEDIUM)
    highMax?: number;    // Default 75 (56-75 HIGH)
  };

  stale_sensor_threshold_hours?: number;
}

export interface PriorityFactors {
  wasteLevelScore: number;
  timeElapsedScore: number;
  complaintScore: number;
  locationSensitivityScore: number;
  usedSensorData: boolean;
  isStaleSensor: boolean;
  hoursSinceLastCollection: number;
}

export interface PriorityEngineResult {
  score: number;
  level: PriorityLevel;
  factors: PriorityFactors;
  weights: PriorityWeights;
  explanation: string;
}

/**
 * Calculates dynamic waste collection priority score (0 - 100) and level based on:
 * - 40% Fill Level & Capacity Weight
 * - 25% Time Since Last Collection
 * - 20% Citizen Complaints / Reports
 * - 15% Location Sensitivity
 *
 * Uses an explainable weighted arithmetic scoring model (No LLM).
 */
export function calculateSmartPriority(input: PriorityEngineInput): PriorityEngineResult {
  const staleThresholdHours = input.stale_sensor_threshold_hours || 48;
  const now = Date.now();

  // Merge Configurable Weights
  const weights: PriorityWeights = {
    fillLevel: input.weights?.fillLevel ?? DEFAULT_PRIORITY_WEIGHTS.fillLevel,
    timeSinceCollection: input.weights?.timeSinceCollection ?? DEFAULT_PRIORITY_WEIGHTS.timeSinceCollection,
    complaints: input.weights?.complaints ?? DEFAULT_PRIORITY_WEIGHTS.complaints,
    locationSensitivity: input.weights?.locationSensitivity ?? DEFAULT_PRIORITY_WEIGHTS.locationSensitivity,
  };

  // 1. NORMALIZE FILL LEVEL & CAPACITY COMPONENT (0 - 100)
  let isStaleSensor = false;
  let usedSensorData = false;

  if (input.fill_percentage !== undefined && input.fill_percentage !== null && !isNaN(input.fill_percentage)) {
    if (input.sensor_last_ping) {
      const pingTime = new Date(input.sensor_last_ping).getTime();
      const hoursSincePing = (now - pingTime) / (1000 * 60 * 60);
      if (hoursSincePing > staleThresholdHours || input.sensor_is_online === false) {
        isStaleSensor = true;
      } else {
        usedSensorData = true;
      }
    } else if (input.sensor_is_online !== false) {
      usedSensorData = true;
    }
  }

  let rawFillScore = 30; // Baseline fallback
  if (usedSensorData && input.fill_percentage !== undefined && input.fill_percentage !== null) {
    let fillVal = Math.min(100, Math.max(0, Number(input.fill_percentage)));
    if (input.current_weight_kg && input.capacity_kg && input.capacity_kg > 0) {
      const weightRatio = Math.min(100, Math.max(0, (Number(input.current_weight_kg) / Number(input.capacity_kg)) * 100));
      fillVal = Math.max(fillVal, weightRatio);
    }
    
    // Overflow bin curve (when fill >= 85%, urgency accelerates)
    if (fillVal >= 85) {
      rawFillScore = Math.min(100, 85 + (fillVal - 85) * 1.5);
    } else {
      rawFillScore = fillVal;
    }
  } else if (input.citizen_reported_severity) {
    switch (input.citizen_reported_severity) {
      case 'CRITICAL':
        rawFillScore = 95;
        break;
      case 'HIGH':
        rawFillScore = 75;
        break;
      case 'MEDIUM':
        rawFillScore = 45;
        break;
      case 'LOW':
        rawFillScore = 20;
        break;
      default:
        rawFillScore = 35;
    }
  }

  const wasteLevelScore = Math.min(100, Math.max(0, rawFillScore));

  // 2. NORMALIZE TIME SINCE LAST COLLECTION COMPONENT (0 - 100)
  let hoursSinceLastCollection = 12; // Default 12 hours
  if (input.hours_since_collection !== undefined && input.hours_since_collection !== null) {
    hoursSinceLastCollection = Math.max(0, Number(input.hours_since_collection));
  } else if (input.last_collected_at) {
    const collectedTime = new Date(input.last_collected_at).getTime();
    if (!isNaN(collectedTime)) {
      hoursSinceLastCollection = Math.max(0, (now - collectedTime) / (1000 * 60 * 60));
    }
  }

  // 48 hours elapsed = 100 normalized score
  const timeElapsedScore = Math.min(100, Math.max(0, Math.round((hoursSinceLastCollection / 48) * 100)));

  // 3. NORMALIZE CITIZEN COMPLAINTS COMPONENT (0 - 100)
  const complaintCount = Math.max(0, Number(input.complaint_count) || 0);
  let complaintBase = complaintCount * 25; // 4+ complaints = 100
  if (input.citizen_reported_severity === 'CRITICAL') complaintBase += 30;
  else if (input.citizen_reported_severity === 'HIGH') complaintBase += 15;
  
  const complaintScore = Math.min(100, Math.max(0, Math.round(complaintBase)));

  // 4. NORMALIZE LOCATION SENSITIVITY COMPONENT (0 - 100)
  let locationSensitivityScore = 40; // Default residential
  const sensKey = (input.location_sensitivity || '').toString().toLowerCase();

  if (sensKey.includes('hospital') || sensKey.includes('health') || sensKey.includes('clinic')) {
    locationSensitivityScore = 100;
  } else if (sensKey.includes('school') || sensKey.includes('college') || sensKey.includes('education')) {
    locationSensitivityScore = 90;
  } else if (sensKey.includes('transit') || sensKey.includes('bus') || sensKey.includes('railway') || sensKey.includes('station')) {
    locationSensitivityScore = 80;
  } else if (sensKey.includes('market') || sensKey.includes('bazaar') || sensKey.includes('yard')) {
    locationSensitivityScore = 75;
  } else if (sensKey.includes('commercial') || sensKey.includes('mall') || sensKey.includes('shop')) {
    locationSensitivityScore = 55;
  } else if (sensKey.includes('residential') || sensKey.includes('village') || sensKey.includes('ward')) {
    locationSensitivityScore = 40;
  }

  // 5. CALCULATE WEIGHTED SCORE
  const weightedSum =
    wasteLevelScore * weights.fillLevel +
    timeElapsedScore * weights.timeSinceCollection +
    complaintScore * weights.complaints +
    locationSensitivityScore * weights.locationSensitivity;

  // 5b. OVERDUE COLLECTION FACTOR (+15 pts boost, max 100)
  const overdueBoost = input.is_overdue ? 15 : 0;
  const rawFinalScore = isNaN(weightedSum) ? 30 : weightedSum + overdueBoost;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawFinalScore)));

  // 6. MAP SCORE TO PRIORITY LEVEL
  const lowMax = input.thresholds?.lowMax ?? 30;
  const mediumMax = input.thresholds?.mediumMax ?? 55;
  const highMax = input.thresholds?.highMax ?? 75;

  let level: PriorityLevel = 'LOW';
  if (finalScore > highMax) {
    level = 'CRITICAL';
  } else if (finalScore > mediumMax) {
    level = 'HIGH';
  } else if (finalScore > lowMax) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  // 7. GENERATE EXPLAINABLE NATURAL LANGUAGE REASONING
  const explanation = generateExplanation({
    score: finalScore,
    level,
    wasteLevelScore,
    usedSensorData,
    isStaleSensor,
    fillPercentage: input.fill_percentage,
    hoursSinceLastCollection,
    complaintCount,
    locationSensitivity: input.location_sensitivity || 'residential',
    isOverdue: Boolean(input.is_overdue),
  });

  return {
    score: finalScore,
    level,
    factors: {
      wasteLevelScore: Math.round(wasteLevelScore),
      timeElapsedScore: Math.round(timeElapsedScore),
      complaintScore: Math.round(complaintScore),
      locationSensitivityScore: Math.round(locationSensitivityScore),
      usedSensorData,
      isStaleSensor,
      hoursSinceLastCollection: Math.round(hoursSinceLastCollection * 10) / 10,
    },
    weights,
    explanation,
  };
}

/**
 * Builds human-readable explainable reason for score.
 */
function generateExplanation(params: {
  score: number;
  level: PriorityLevel;
  wasteLevelScore: number;
  usedSensorData: boolean;
  isStaleSensor: boolean;
  fillPercentage?: number | null;
  hoursSinceLastCollection: number;
  complaintCount: number;
  locationSensitivity: string;
  isOverdue?: boolean;
}): string {
  const reasons: string[] = [];

  if (params.isOverdue) {
    reasons.push('Collection is overdue');
  }

  if (params.usedSensorData && params.fillPercentage !== undefined && params.fillPercentage !== null) {
    if (params.fillPercentage >= 85) {
      reasons.push(`critical fill level (${params.fillPercentage}%)`);
    } else if (params.fillPercentage >= 60) {
      reasons.push(`high fill level (${params.fillPercentage}%)`);
    }
  } else if (params.isStaleSensor) {
    reasons.push(`stale sensor telemetry`);
  } else if (params.wasteLevelScore >= 70) {
    reasons.push(`high waste volume reported`);
  }

  if (params.hoursSinceLastCollection >= 36) {
    reasons.push(`collection is ${Math.round(params.hoursSinceLastCollection)}h overdue`);
  } else if (params.hoursSinceLastCollection >= 24) {
    reasons.push(`last collection was ${Math.round(params.hoursSinceLastCollection)}h ago`);
  }

  if (params.complaintCount >= 3) {
    reasons.push(`${params.complaintCount} recent citizen complaints`);
  } else if (params.complaintCount >= 1) {
    reasons.push(`active citizen complaint`);
  }

  const locLower = (params.locationSensitivity || '').toString().toLowerCase();
  if (locLower.includes('school') || locLower.includes('hospital')) {
    reasons.push(`high-sensitivity zone (${params.locationSensitivity})`);
  }

  if (reasons.length === 0) {
    return `${params.level} priority (Score ${params.score}/100): normal fill levels and standard routine schedule.`;
  }

  const capitalizedLevel = params.level.charAt(0).toUpperCase() + params.level.slice(1).toLowerCase();
  return `${capitalizedLevel} priority (Score ${params.score}/100) due to ${reasons.join(', ')}.`;
}

// Backward compatibility helper
export function calculateWastePriority(input: {
  location_type: any;
  estimated_volume?: any;
  fill_percentage?: number;
  waste_category?: any;
}) {
  const result = calculateSmartPriority({
    location_sensitivity: input.location_type,
    fill_percentage: input.fill_percentage,
    citizen_reported_severity: input.estimated_volume === 'massive' ? 'CRITICAL' : input.estimated_volume === 'large' ? 'HIGH' : input.estimated_volume === 'medium' ? 'MEDIUM' : 'LOW',
  });

  return {
    score: result.score,
    level: result.level,
    explanation: result.explanation,
    breakdown: {
      baseScore: result.factors.wasteLevelScore,
      locationMultiplier: result.factors.locationSensitivityScore / 50,
      timeBonus: result.factors.timeElapsedScore,
      upvoteBonus: result.factors.complaintScore,
    },
  };
}

export function getPriorityBadgeColor(level: PriorityLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400';
    case 'HIGH':
      return 'bg-amber-500/15 text-amber-800 border-amber-300 dark:text-amber-400';
    case 'MEDIUM':
      return 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400';
    case 'LOW':
      return 'bg-emerald-500/15 text-emerald-800 border-emerald-300 dark:text-emerald-400';
    default:
      return 'bg-slate-500/15 text-slate-700 border-slate-300';
  }
}
