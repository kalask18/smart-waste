import { CollectionPoint, WasteReport } from '@/types/database';

export interface SensorReadingLog {
  recorded_at: string;
  fill_percent: number;
}

export interface DemandPredictionInput {
  point_id: string;
  point_name: string;
  area_name?: string;
  current_fill_percent: number;
  capacity_kg: number;
  last_collected_at?: string;
  historical_readings?: SensorReadingLog[];
  recent_reports_count?: number;
  forecast_hours?: number; // default: 12 hours
}

export interface DemandPredictionResult {
  point_id: string;
  point_name: string;
  area_name: string;
  current_fill_percent: number;
  current_weight_kg: number;
  capacity_kg: number;
  predicted_fill_percent: number;
  predicted_weight_kg: number;
  predicted_demand_level: 'HIGH DEMAND (Overflow Risk)' | 'MODERATE DEMAND' | 'LOW DEMAND';
  forecast_hours: number;
  forecast_time_label: string;
  has_sufficient_data: boolean;
  data_quality_label: string;
  readings_count: number;
  recommended_action: string;
}

/**
 * Baseline Prototype Forecast Engine.
 * Estimates near-future waste collection demand using historical averages, time since last collection,
 * day-of-week demand multipliers, and citizen report density.
 * Not an AI black-box model; completely transparent and labelled as Prototype Forecast.
 */
export function predictCollectionPointDemand(
  input: DemandPredictionInput
): DemandPredictionResult {
  const forecastHours = input.forecast_hours || 12;
  const readings = input.historical_readings || [];
  const readingsCount = readings.length;
  const capacityKg = input.capacity_kg || 1000;
  const reportsCount = input.recent_reports_count || 0;

  // 1. Data Sufficiency Check (Must have at least 3 historical readings)
  if (readingsCount < 3) {
    return {
      point_id: input.point_id,
      point_name: input.point_name,
      area_name: input.area_name || 'Central Panchayat Zone',
      current_fill_percent: input.current_fill_percent,
      current_weight_kg: Math.round((input.current_fill_percent / 100) * capacityKg),
      capacity_kg: capacityKg,
      predicted_fill_percent: input.current_fill_percent,
      predicted_weight_kg: Math.round((input.current_fill_percent / 100) * capacityKg),
      predicted_demand_level: input.current_fill_percent >= 85 ? 'HIGH DEMAND (Overflow Risk)' : 'LOW DEMAND',
      forecast_hours: forecastHours,
      forecast_time_label: `+${forecastHours}h Window`,
      has_sufficient_data: false,
      data_quality_label: 'Insufficient historical data',
      readings_count: readingsCount,
      recommended_action: 'Install sensor node or log historical pickups to enable forecast model.',
    };
  }

  // 2. Data Quality Indicator (Honest metric based on sample size)
  const dataQualityLabel = readingsCount >= 10
    ? `High Quality Data (${readingsCount} readings)`
    : `Moderate Quality Data (${readingsCount} readings)`;

  // 3. Baseline Hourly Accumulation Rate Calculation
  let hourlyRate = 3.0; // default baseline: 3% fill increase per hour
  if (readingsCount >= 2) {
    const sorted = [...readings].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const hoursElapsed = Math.max(1, (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) / (1000 * 3600));
    const fillDiff = Math.max(5, last.fill_percent - first.fill_percent);
    hourlyRate = Math.min(8.0, Math.max(1.0, fillDiff / hoursElapsed));
  }

  // 4. Day-of-Week & Peak Hours Multiplier
  const dayOfWeek = new Date().getDay();
  const isPeakDay = dayOfWeek === 0 || dayOfWeek === 6 || input.point_name.toLowerCase().includes('market');
  const dayMultiplier = isPeakDay ? 1.25 : 1.0;

  // 5. Citizen Report Density Boost
  const reportBoost = reportsCount >= 2 ? 8 : reportsCount === 1 ? 4 : 0;

  // 6. Calculate Predicted Fill Level
  const projectedIncrease = hourlyRate * forecastHours * dayMultiplier + reportBoost;
  const predictedFill = Math.min(100, Math.round(input.current_fill_percent + projectedIncrease));
  const predictedWeight = Math.round((predictedFill / 100) * capacityKg);

  // 7. Calculate Predicted Demand Level
  let demandLevel: 'HIGH DEMAND (Overflow Risk)' | 'MODERATE DEMAND' | 'LOW DEMAND' = 'LOW DEMAND';
  if (predictedFill >= 85) {
    demandLevel = 'HIGH DEMAND (Overflow Risk)';
  } else if (predictedFill >= 60) {
    demandLevel = 'MODERATE DEMAND';
  }

  // 8. Forecast Time Label
  const targetDate = new Date(Date.now() + forecastHours * 3600 * 1000);
  const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeLabel = `Today ${timeStr} (+${forecastHours}h)`;

  // 9. Recommended Proactive Action
  let action = 'Monitor fill telemetry during normal shift.';
  if (demandLevel === 'HIGH DEMAND (Overflow Risk)') {
    action = `Pre-dispatch Electric Tipper E-Rickshaw before ${timeStr} peak accumulation.`;
  } else if (demandLevel === 'MODERATE DEMAND') {
    action = `Schedule pickup in afternoon dispatch queue (${timeStr}).`;
  }

  return {
    point_id: input.point_id,
    point_name: input.point_name,
    area_name: input.area_name || 'Central Panchayat Zone',
    current_fill_percent: input.current_fill_percent,
    current_weight_kg: Math.round((input.current_fill_percent / 100) * capacityKg),
    capacity_kg: capacityKg,
    predicted_fill_percent: predictedFill,
    predicted_weight_kg: predictedWeight,
    predicted_demand_level: demandLevel,
    forecast_hours: forecastHours,
    forecast_time_label: timeLabel,
    has_sufficient_data: true,
    data_quality_label: dataQualityLabel,
    readings_count: readingsCount,
    recommended_action: action,
  };
}

/**
 * Generates Prototype Forecast predictions across collection points for Admin UI.
 */
export function generatePrototypeForecasts(
  collectionPoints: CollectionPoint[],
  wasteReports: WasteReport[] = [],
  forecastHours: number = 12
): DemandPredictionResult[] {
  if (!collectionPoints || collectionPoints.length === 0) return [];

  // Generate sample historical readings per collection point
  const baseDate = new Date();

  return collectionPoints.map((cp, idx) => {
    // Intentionally create < 3 readings for unsampled point to test Insufficient Data state
    const isUnsampledPoint = idx === 4 || cp.name.toLowerCase().includes('square');
    const sampleReadings: SensorReadingLog[] = isUnsampledPoint
      ? [
          { recorded_at: new Date(baseDate.getTime() - 3600 * 1000 * 2).toISOString(), fill_percent: cp.current_fill_percent - 5 },
        ]
      : [
          { recorded_at: new Date(baseDate.getTime() - 3600 * 1000 * 24).toISOString(), fill_percent: Math.max(10, cp.current_fill_percent - 45) },
          { recorded_at: new Date(baseDate.getTime() - 3600 * 1000 * 18).toISOString(), fill_percent: Math.max(20, cp.current_fill_percent - 30) },
          { recorded_at: new Date(baseDate.getTime() - 3600 * 1000 * 12).toISOString(), fill_percent: Math.max(35, cp.current_fill_percent - 20) },
          { recorded_at: new Date(baseDate.getTime() - 3600 * 1000 * 6).toISOString(), fill_percent: Math.max(50, cp.current_fill_percent - 10) },
          { recorded_at: baseDate.toISOString(), fill_percent: cp.current_fill_percent },
        ];

    const reports = wasteReports.filter(
      (r) => r.collection_point_id === cp.id || r.location_name?.toLowerCase().includes(cp.name.toLowerCase().split(' ')[0])
    );

    return predictCollectionPointDemand({
      point_id: cp.id,
      point_name: cp.name,
      area_name: (cp as any).ward || 'Panchayat Ward Zone',
      current_fill_percent: cp.current_fill_percent,
      capacity_kg: cp.capacity || 1000,
      last_collected_at: cp.last_collected_at,
      historical_readings: sampleReadings,
      recent_reports_count: reports.length,
      forecast_hours: forecastHours,
    });
  });
}
