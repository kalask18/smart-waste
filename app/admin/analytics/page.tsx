'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { generateHotspotAnalytics, HotspotAnalysisResult } from '@/lib/hotspot-engine';
import { CollectionPoint, WasteReport } from '@/types/database';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';
import { 
  Flame, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Clock, 
  BarChart3, 
  PieChart as PieIcon, 
  ArrowRight,
  Info,
  Layers,
  RefreshCw
} from 'lucide-react';

const DEFAULT_POINTS: CollectionPoint[] = [
  { id: 'cp1', name: 'Narasipuram Panchayat Main Gate Dumpster', latitude: 11.0003, longitude: 76.7725, capacity: 1000, current_fill_percent: 92, current_weight_kg: 350, status: 'overflowing', created_at: new Date().toISOString() },
  { id: 'cp2', name: 'Primary Health Centre Dumpster', latitude: 10.9980, longitude: 76.7745, capacity: 1200, current_fill_percent: 88, current_weight_kg: 410, status: 'overflowing', created_at: new Date().toISOString() },
  { id: 'cp3', name: 'Govt Higher Sec School Gate Container', latitude: 11.0028, longitude: 76.7705, capacity: 1000, current_fill_percent: 78, current_weight_kg: 280, status: 'active', created_at: new Date().toISOString() },
  { id: 'cp4', name: 'Thondamuthur Weekly Market Yard', latitude: 10.9945, longitude: 76.7810, capacity: 1500, current_fill_percent: 71, current_weight_kg: 220, status: 'active', created_at: new Date().toISOString() },
  { id: 'cp5', name: 'Velliangiri Foothills Bus Stop Bin', latitude: 10.9912, longitude: 76.7645, capacity: 800, current_fill_percent: 48, current_weight_kg: 140, status: 'active', created_at: new Date().toISOString() },
];

const CATEGORY_COLORS: Record<string, string> = {
  organic: '#10b981',
  recyclable: '#3b82f6',
  hazardous: '#f43f5e',
  overflowing_bin: '#f59e0b',
  construction: '#8b5cf6',
  general: '#64748b',
};

export default function AdminAnalyticsPage() {
  const [hotspots, setHotspots] = useState<HotspotAnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotAnalysisResult | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let pointsToUse = DEFAULT_POINTS;
      const { data: cpData } = await supabase.from('collection_points').select('*');
      if (cpData && cpData.length > 0) pointsToUse = cpData as CollectionPoint[];

      let reportsToUse: WasteReport[] = [];
      const { data: repData } = await supabase.from('waste_reports').select('*');
      if (repData) reportsToUse = repData as WasteReport[];

      const results = generateHotspotAnalytics(pointsToUse, reportsToUse);
      setHotspots(results);
      if (results.length > 0) setSelectedHotspot(results[0]);
    } catch (err) {
      console.error('Error loading hotspot analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalHotspots = hotspots.length;
  const criticalCount = hotspots.filter((h) => h.severity === 'CRITICAL').length;
  const highestScore = hotspots.length > 0 ? Math.max(...hotspots.map((h) => h.hotspot_score)) : 94;
  const totalReports = hotspots.reduce((acc, h) => acc + h.num_reports, 0);

  // Recharts Chart Data Formats
  const barChartData = hotspots.slice(0, 5).map((h) => ({
    name: h.point_name.split(' ')[0] + '...',
    fullName: h.point_name,
    'Hotspot Score': h.hotspot_score,
    'Pickups / Week': h.collection_frequency_per_week * 10, // scaled for chart display
    'Citizen Reports': h.num_reports * 10,
  }));

  const categoryDistributionData = [
    { name: 'Organic Market Waste', value: 42, color: '#10b981' },
    { name: 'Overflowing Bins', value: 28, color: '#f59e0b' },
    { name: 'Recyclables & Dry', value: 18, color: '#3b82f6' },
    { name: 'Hazardous / Medical', value: 12, color: '#f43f5e' },
  ];

  const trendData = selectedHotspot ? selectedHotspot.trend_data : [
    { month: 'May', avg_fill: 45, reports: 1, score: 50 },
    { month: 'Jun', avg_fill: 60, reports: 2, score: 65 },
    { month: 'Jul', avg_fill: 75, reports: 3, score: 78 },
    { month: 'Aug', avg_fill: 88, reports: 4, score: 86 },
    { month: 'Sep', avg_fill: 92, reports: 5, score: 94 },
  ];

  const columns: Column<HotspotAnalysisResult>[] = [
    {
      header: 'Collection Point Name & Ward',
      accessor: (row) => (
        <div>
          <p className="font-extrabold text-slate-900 dark:text-white text-xs">{row.point_name}</p>
          <p className="text-[10px] text-slate-400">{row.area_name}</p>
        </div>
      ),
    },
    {
      header: 'Hotspot Score',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center text-white ${
            row.severity === 'CRITICAL' ? 'bg-rose-500' : row.severity === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'
          }`}>
            {row.hotspot_score}
          </span>
          <StatusBadge type="priority" value={row.severity} size="sm" />
        </div>
      ),
    },
    {
      header: 'Reports / Fill %',
      accessor: (row) => (
        <div className="space-y-1 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            {row.num_reports} Reports • {row.average_fill_percent}% Avg Fill
          </div>
          <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${row.average_fill_percent >= 85 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${row.average_fill_percent}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Collection Frequency',
      accessor: (row) => (
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>{row.collection_frequency_per_week} Pickups / Wk</span>
          {row.overdue_count > 0 && (
            <span className="block text-[10px] text-rose-500 font-bold">
              {row.overdue_count} Overdue Pickup(s)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Transparent Score Breakdown',
      accessor: (row) => (
        <button
          onClick={() => setSelectedHotspot(row)}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center space-x-1"
        >
          <Info className="w-3 h-3 text-emerald-500" />
          <span>Inspect Factors</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/30 text-rose-300 border border-rose-500/40 uppercase tracking-wider flex items-center space-x-1">
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Hotspot Analytics Engine</span>
            </span>
            <span className="text-xs text-slate-300 font-medium">Explainable Multi-Factor Scoring</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Waste Hotspot Analytics & Predictive Intelligence
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-2xl">
            Identifies collection points with repeated waste accumulation based on historical citizen reports, sensor fill frequencies, overdue collections, and pickup demand.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadAnalytics}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Hotspots</span>
          </button>
          <Link
            href="/admin/routes"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Dispatch Priority Route</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Identified Hotspots" value={`${totalHotspots} Locations`} subtitle={`${criticalCount} Critical Urgency`} icon={Flame} variant="rose" />
        <StatCard title="Highest Hotspot Score" value={`${highestScore} / 100`} subtitle="Panchayat Peak Risk" icon={AlertTriangle} variant="amber" />
        <StatCard title="Citizen Reports Evaluated" value={`${totalReports} Reports`} subtitle="Historical Complaints" icon={FileText} variant="purple" />
        <StatCard title="Avg Fill Rate Across Hotspots" value="84.2%" subtitle="High Accumulation" icon={TrendingUp} variant="emerald" />
      </div>

      {/* RECHARTS DATA VISUALIZATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Hotspot Score vs Collection Frequency Bar Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Top Hotspot Scores vs Collection Demand</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Comparative analysis of Hotspot Scores, weekly pickup frequency, and citizen reports.
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  labelFormatter={(name) => barChartData.find((b) => b.name === name)?.fullName || name}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Hotspot Score" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Pickups / Week" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Citizen Reports" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Hotspot Distribution by Waste Category Pie Chart */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-rose-500" />
              <span>Hotspot Waste Category Breakdown</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Proportion of waste types causing repeated hotspot accumulation.
            </p>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-1">
            {categoryDistributionData.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                </div>
                <span className="font-bold">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart 2: Hotspot Trend Over Time (Area Chart) & Score Breakdown */}
      {selectedHotspot && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  <span>Historical Trend Over Time: {selectedHotspot.point_name}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Monthly progression of average fill levels, reports, and Hotspot Scores.
                </p>
              </div>
            </div>

            <div className="h-[240px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="score" name="Hotspot Score" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="avg_fill" name="Avg Fill %" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transparent Score Breakdown Box */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white p-6 shadow-xl space-y-4">
            <div>
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                TRANSPARENT SCORE CALCULATION
              </div>
              <h3 className="text-base font-extrabold text-white">
                {selectedHotspot.point_name}
              </h3>
              <p className="text-xs text-slate-400">
                Hotspot Score: <strong className="text-rose-400 font-extrabold">{selectedHotspot.hotspot_score} / 100</strong> ({selectedHotspot.severity})
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {selectedHotspot.score_breakdown.map((b, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-200">{b.factor}</span>
                    <span className="text-emerald-400 font-mono">+{b.points} pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{b.explanation}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Top Hotspots Directory Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Identified Waste Hotspots Directory (Sorted Highest Hotspot Score First)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated based on citizen reports, sensor high fill frequencies, overdue pickups, and weekly demand.
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={hotspots}
          searchKey="point_name"
          searchPlaceholder="Search hotspot collection points..."
        />
      </div>

    </div>
  );
}
