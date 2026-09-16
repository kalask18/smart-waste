'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { generatePrototypeForecasts, DemandPredictionResult } from '@/lib/prediction-engine';
import { fetchMergedWasteReports, subscribeReportsChange } from '@/lib/report-service';
import { CollectionPoint, WasteReport } from '@/types/database';
import { DataTable, Column } from '@/components/ui/data-table';
import { TrendingUp, AlertTriangle, Clock, Database, Info, Sparkles, CheckCircle2 } from 'lucide-react';

const FALLBACK_COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: 'cp-101',
    name: 'Narasipuram Panchayat Main Gate Dumpster',
    latitude: 11.0003,
    longitude: 76.7725,
    capacity: 1000,
    current_fill_percent: 75,
    current_weight_kg: 300,
    status: 'overflowing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp-102',
    name: 'Primary Health Centre Dumpster',
    latitude: 10.9980,
    longitude: 76.7745,
    capacity: 1200,
    current_fill_percent: 88,
    current_weight_kg: 440,
    status: 'overflowing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp-103',
    name: 'Thondamuthur Weekly Market Yard Bin',
    latitude: 10.9945,
    longitude: 76.7810,
    capacity: 1500,
    current_fill_percent: 55,
    current_weight_kg: 330,
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp-104',
    name: 'Govt Higher Sec School Gate Container',
    latitude: 11.0028,
    longitude: 76.7705,
    capacity: 800,
    current_fill_percent: 40,
    current_weight_kg: 160,
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp-105',
    name: 'Unsampled Thennamanallur Area Bin',
    latitude: 10.9780,
    longitude: 76.7920,
    capacity: 600,
    current_fill_percent: 30,
    current_weight_kg: 90,
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

export default function AdminPredictionsPage() {
  const [forecastHours, setForecastHours] = useState<number>(12);
  const [forecasts, setForecasts] = useState<DemandPredictionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDataAndPredict() {
      setLoading(true);
      try {
        const { data: cpData } = await supabase.from('collection_points').select('*');
        const points: CollectionPoint[] = (cpData && cpData.length > 0)
          ? cpData
          : FALLBACK_COLLECTION_POINTS;

        const reports = await fetchMergedWasteReports();
        const results = generatePrototypeForecasts(points, reports, forecastHours);
        setForecasts(results);
      } catch (err) {
        console.error('Error generating forecasts:', err);
        const results = generatePrototypeForecasts(FALLBACK_COLLECTION_POINTS, [], forecastHours);
        setForecasts(results);
      } finally {
        setLoading(false);
      }
    }

    loadDataAndPredict();
    const unsub = subscribeReportsChange(() => loadDataAndPredict());
    return () => unsub();
  }, [forecastHours]);

  const highDemandCount = forecasts.filter((f) => f.predicted_demand_level === 'HIGH DEMAND (Overflow Risk)').length;
  const sufficientDataCount = forecasts.filter((f) => f.has_sufficient_data).length;
  const insufficientDataCount = forecasts.filter((f) => !f.has_sufficient_data).length;
  const avgProjectedFill = forecasts.length > 0
    ? Math.round(forecasts.reduce((acc, f) => acc + f.predicted_fill_percent, 0) / forecasts.length)
    : 0;

  const columns: Column<DemandPredictionResult>[] = [
    {
      header: 'Collection Point & Zone',
      accessor: (row) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white block">{row.point_name}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{row.area_name}</span>
        </div>
      ),
    },
    {
      header: 'Current -> Projected Fill',
      accessor: (row) => (
        <div className="w-36 space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-400">{row.current_fill_percent}%</span>
            <span className={row.predicted_fill_percent >= 85 ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}>
              &rarr; {row.predicted_fill_percent}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-slate-400 h-full transition-all"
              style={{ width: `${row.current_fill_percent}%` }}
            />
            <div
              className={`h-full transition-all ${
                row.predicted_fill_percent >= 85
                  ? 'bg-red-500 animate-pulse'
                  : row.predicted_fill_percent >= 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(0, row.predicted_fill_percent - row.current_fill_percent)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Est. Waste Weight',
      accessor: (row) => (
        <div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{row.predicted_weight_kg} kg</span>
          <span className="text-[10px] text-slate-500 block">/ {row.capacity_kg} kg cap</span>
        </div>
      ),
    },
    {
      header: 'Predicted Demand Status',
      accessor: (row) => {
        if (row.predicted_demand_level === 'HIGH DEMAND (Overflow Risk)') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
              <AlertTriangle className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" />
              HIGH DEMAND (Overflow Risk)
            </span>
          );
        }
        if (row.predicted_demand_level === 'MODERATE DEMAND') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              MODERATE DEMAND
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            LOW DEMAND
          </span>
        );
      },
    },
    {
      header: 'Data Quality / Sufficiency',
      accessor: (row) => {
        if (!row.has_sufficient_data) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
              <Info className="w-3 h-3 mr-1 text-amber-600" />
              {row.data_quality_label}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
            {row.data_quality_label}
          </span>
        );
      },
    },
    {
      header: 'Recommended Proactive Action',
      accessor: (row) => (
        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium max-w-xs">
          {row.recommended_action}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase tracking-wide border border-teal-200 dark:border-teal-800">
            PROTOTYPE FORECAST (BASELINE ESTIMATION MODEL)
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          Waste Accumulation & Demand Forecast
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Deterministic linear accumulation model based on historical telemetry intervals, day-of-week demand multipliers, and citizen report density. Enables proactive dispatch of electric tippers prior to container overflow.
        </p>
      </div>

      {/* Prototype Model Disclosure Alert */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Prototype Forecast Model Transparency</p>
          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            This feature uses a baseline mathematical accumulation formula incorporating telemetry trends and citizen reports. It does not claim AI neural accuracy. Collection points with fewer than 3 historical telemetry logs are explicitly marked as <span className="font-semibold text-amber-800 dark:text-amber-300 font-mono">Insufficient historical data</span>.
          </p>
        </div>
      </div>

      {/* Horizon Selector & Overview Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Forecast Horizon:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg space-x-1">
            <button
              onClick={() => setForecastHours(4)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                forecastHours === 4
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +4h (Immediate Shift)
            </button>
            <button
              onClick={() => setForecastHours(12)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                forecastHours === 12
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +12h (Next Shift)
            </button>
            <button
              onClick={() => setForecastHours(24)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                forecastHours === 24
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              +24h (Tomorrow)
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-6 text-xs border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">High Demand Risks</span>
            <span className="font-extrabold text-red-600 dark:text-red-400 text-sm">{highDemandCount} points</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Avg Projected Fill</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{avgProjectedFill}%</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sufficient Telemetry</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              {sufficientDataCount} / {forecasts.length} nodes
            </span>
          </div>
        </div>
      </div>

      {/* Main Predictions Data Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Computing baseline accumulation forecasts...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={forecasts}
          searchKey="point_name"
          searchPlaceholder="Search collection point or area..."
        />
      )}
    </div>
  );
}
