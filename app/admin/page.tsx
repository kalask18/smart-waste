'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { calculateSmartPriority, PriorityEngineResult } from '@/lib/priority-engine';
import { evaluateCollectionOverdueStatus } from '@/lib/overdue-engine';
import { CollectionPoint, WasteReport, Vehicle } from '@/types/database';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { 
  Shield, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  Zap,
  Radio,
  RefreshCw,
  CheckCircle2,
  Clock,
  Camera,
  X,
  ExternalLink,
  Bell,
  Check,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  getNotifications, 
  subscribeNotificationsChange, 
  markNotificationAsRead, 
  clearNotification,
  checkAndCreateOverdueNotification,
  createMissedNotification
} from '@/lib/notification-service';
import { fetchMergedWasteReports, subscribeReportsChange } from '@/lib/report-service';
import { Notification } from '@/types/database';

const AdminMap = dynamic(() => import('@/components/admin-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400 font-mono">
      Loading OpenStreetMap Leaflet Layers...
    </div>
  ),
});

const INITIAL_POINTS: CollectionPoint[] = [
  {
    id: 'cp1',
    name: 'Narasipuram Panchayat Main Gate Dumpster',
    latitude: 11.0003,
    longitude: 76.7725,
    capacity: 1000,
    current_fill_percent: 85,
    current_weight_kg: 340,
    status: 'overflowing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp2',
    name: 'Primary Health Centre Dumpster',
    latitude: 10.9980,
    longitude: 76.7745,
    capacity: 1200,
    current_fill_percent: 90,
    current_weight_kg: 410,
    status: 'overflowing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp3',
    name: 'Govt Higher Sec School Gate Container',
    latitude: 11.0028,
    longitude: 76.7705,
    capacity: 800,
    current_fill_percent: 65,
    current_weight_kg: 210,
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cp4',
    name: 'Thondamuthur Weekly Market Yard Bin',
    latitude: 10.9945,
    longitude: 76.7810,
    capacity: 1500,
    current_fill_percent: 95,
    current_weight_kg: 520,
    status: 'overflowing',
    created_at: new Date().toISOString(),
  },
];

export interface VerificationEvidenceItem {
  id: string;
  collection_point_name: string;
  worker_name: string;
  vehicle_number: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  gps_verified: boolean;
  location_status: string;
  image_url: string;
  notes?: string;
}

export interface OverdueTaskItem {
  id: string;
  location_name: string;
  vehicle_number: string;
  scheduled_at: string;
  overdue_mins: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
}

import { useRouter } from 'next/navigation';
import { DemoSimulationBar } from '@/components/demo-simulation-bar';
import { getDemoState, subscribeDemoStateChange } from '@/lib/demo-simulation-service';
import { AIDemandForecastCard } from '@/components/ai-demand-forecast-card';
import { generateAllDemandPredictions, AIDemandPrediction } from '@/lib/ai-demand-forecast';
import { SmartWastePulse } from '@/components/ui/smartwaste-pulse';
import { useLanguage } from '@/lib/i18n/context';

export default function AdminDashboard() {
  const router = useRouter();
  const { t, tLocation } = useLanguage();
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>(INITIAL_POINTS);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [todayCompletedCount, setTodayCompletedCount] = useState<number>(4);
  const [verifications, setVerifications] = useState<VerificationEvidenceItem[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTaskItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications());
  const [aiPredictions, setAiPredictions] = useState<AIDemandPrediction[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [selectedProofModal, setSelectedProofModal] = useState<VerificationEvidenceItem | null>(null);
  const [selectedMissedModal, setSelectedMissedModal] = useState<OverdueTaskItem | null>(null);
  const [missedReasonInput, setMissedReasonInput] = useState<string>('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Load current demo simulation state
      const demoState = getDemoState();
      const demoPointsAsCollectionPoints: CollectionPoint[] = demoState.points.map((dp) => ({
        id: dp.id,
        name: dp.name,
        latitude: dp.latitude,
        longitude: dp.longitude,
        capacity: dp.capacity,
        current_fill_percent: dp.current_fill_percent,
        current_weight_kg: dp.current_weight_kg,
        status: dp.status,
        created_at: new Date().toISOString(),
        is_demo: true,
        ward: dp.ward,
        sensitivity: dp.sensitivity,
      } as any));

      // 1. Query collection points
      let dbPoints: CollectionPoint[] = [];
      const { data: cpData } = await supabase.from('collection_points').select('*');
      if (cpData && cpData.length > 0) {
        dbPoints = cpData as CollectionPoint[];
      }

      let pointsToUse = dbPoints.length > 0 ? [...dbPoints, ...demoPointsAsCollectionPoints] : demoPointsAsCollectionPoints;

      // Check persistent saved driver route state for live demo sync
      let localCompletedCount = 0;
      const localVerifications: VerificationEvidenceItem[] = [];
      const localOverdues: OverdueTaskItem[] = [];

      if (typeof window !== 'undefined') {
        const storedStr = localStorage.getItem('smartwaste_saved_driver_route');
        if (storedStr) {
          try {
            const routeObj = JSON.parse(storedStr);
            const collectedCpIds = new Set<string>();

            (routeObj.stops || []).forEach((s: any, idx: number) => {
              if (s.status === 'collected') {
                localCompletedCount++;
                if (s.collection_point_id || s.bin_id) {
                  collectedCpIds.add(s.collection_point_id || s.bin_id);
                }

                localVerifications.push({
                  id: s.id || `v-${idx}`,
                  collection_point_name: s.location_name,
                  worker_name: routeObj.driver_name || 'Ramesh Patel',
                  vehicle_number: routeObj.vehicle_number || 'TN-37-EV-2024',
                  timestamp: s.collected_at || new Date().toISOString(),
                  latitude: s.verification_latitude || null,
                  longitude: s.verification_longitude || null,
                  gps_verified: Boolean(s.gps_verified),
                  location_status: s.location_status || (s.gps_verified ? 'verified' : 'unavailable'),
                  image_url: s.verification_image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
                  notes: s.issue_description,
                });
              } else if (s.status !== 'missed') {
                const mockScheduled = new Date(Date.now() - 1000 * 60 * (120 + idx * 30)).toISOString();
                const evalRes = evaluateCollectionOverdueStatus({
                  scheduled_at: mockScheduled,
                  now: new Date(),
                  gracePeriodMinutes: 60,
                });

                if (evalRes.isOverdue) {
                  const ovItem: OverdueTaskItem = {
                    id: s.id || `ov-${idx}`,
                    location_name: s.location_name,
                    vehicle_number: routeObj.vehicle_number || 'TN-37-EV-2024',
                    scheduled_at: mockScheduled,
                    overdue_mins: evalRes.minutesOverdue,
                    priority: evalRes.elevatedPriority,
                    explanation: evalRes.explanation,
                  };
                  localOverdues.push(ovItem);

                  // Deduplicated Overdue Notification Creation
                  checkAndCreateOverdueNotification({
                    stop_id: s.id || `ov-${idx}`,
                    location_name: s.location_name,
                    route_id: routeObj.id,
                    overdue_mins: evalRes.minutesOverdue,
                  });
                }
              }
            });

            if (collectedCpIds.size > 0) {
              pointsToUse = pointsToUse.map((p) =>
                collectedCpIds.has(p.id)
                  ? { ...p, current_fill_percent: 0, current_weight_kg: 0, status: 'active' }
                  : p
              );
            }
          } catch (e) {
            console.warn('Error reading stored driver route:', e);
          }
        }
      }

      // Overdue flags on collection points for priority engine calculation & map rendering
      const overdueLocationNames = new Set(localOverdues.map((o) => o.location_name.toLowerCase()));
      pointsToUse = pointsToUse.map((p) => {
        const isOv = overdueLocationNames.has(p.name.toLowerCase());
        return isOv ? { ...p, is_overdue: true, status: 'overflowing' as any } : p;
      });

      // 2. Query waste reports (merged DB, local cache & initial seed)
      const currentReports = await fetchMergedWasteReports();
      setWasteReports(currentReports);

      setCollectionPoints(pointsToUse);
      setVerifications(localVerifications);
      setOverdueTasks(localOverdues);
      setNotifications(getNotifications());

      // 3. Query vehicles
      const { data: vehData } = await supabase.from('vehicles').select('*');
      if (vehData) setVehicles(vehData as Vehicle[]);

      // 4. Compute AI Demand Forecast Predictions
      const preds = generateAllDemandPredictions(pointsToUse, currentReports);
      setAiPredictions(preds);

      // 5. Query today's completed collections from Supabase
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: colData } = await supabase
        .from('collections')
        .select('id')
        .eq('status', 'completed')
        .gte('collected_at', todayStart.toISOString());

      const dbCompletedCount = colData ? colData.length : 0;
      setTodayCompletedCount(Math.max(4 + localCompletedCount, dbCompletedCount + localCompletedCount));
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIForecast = () => {
    setAiLoading(true);
    setTimeout(() => {
      const preds = generateAllDemandPredictions(collectionPoints, wasteReports);
      setAiPredictions(preds);
      setAiLoading(false);
    }, 450);
  };

  useEffect(() => {
    fetchDashboardData();

    const unsubDemo = subscribeDemoStateChange(() => {
      fetchDashboardData();
    });

    const unsubNotif = subscribeNotificationsChange((newList) => {
      setNotifications(newList);
    });

    const unsubReports = subscribeReportsChange((newList) => {
      setWasteReports(newList);
      setIsRealtimeActive(true);
    });

    const channelId = `admin_dash_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_points' }, () => {
        setIsRealtimeActive(true);
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        setIsRealtimeActive(true);
        fetchDashboardData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsRealtimeActive(true);
      });

    return () => {
      unsubDemo();
      unsubNotif();
      unsubReports();
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConfirmMarkMissed = () => {
    if (!selectedMissedModal) return;
    createMissedNotification({
      stop_id: selectedMissedModal.id,
      location_name: selectedMissedModal.location_name,
      reason: missedReasonInput || 'Driver failed to reach location within grace period.',
    });

    if (typeof window !== 'undefined') {
      const storedStr = localStorage.getItem('smartwaste_saved_driver_route');
      if (storedStr) {
        try {
          const routeObj = JSON.parse(storedStr);
          const updatedStops = (routeObj.stops || []).map((s: any) =>
            s.id === selectedMissedModal.id || s.location_name === selectedMissedModal.location_name
              ? { ...s, status: 'missed', missed_at: new Date().toISOString(), overdue_reason: missedReasonInput }
              : s
          );
          localStorage.setItem('smartwaste_saved_driver_route', JSON.stringify({ ...routeObj, stops: updatedStops }));
        } catch (e) {
          console.warn('Error updating route stop to missed:', e);
        }
      }
    }

    setSelectedMissedModal(null);
    setMissedReasonInput('');
    fetchDashboardData();
  };

  const totalCollectionPoints = collectionPoints.length;
  const criticalPointsCount = collectionPoints.filter((cp) => cp.current_fill_percent >= 85).length;
  const highPriorityPointsCount = collectionPoints.filter((cp) => cp.current_fill_percent >= 60 && cp.current_fill_percent < 85).length;
  const activeVehiclesCount = vehicles.length > 0 ? vehicles.filter((v) => v.status === 'available' || v.status === 'on_route').length : 3;
  const pendingReportsCount = wasteReports.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;

  const pointsWithPriority = collectionPoints.map((cp) => {
    const priorityRes = calculateSmartPriority({
      fill_percentage: cp.current_fill_percent,
      current_weight_kg: cp.current_weight_kg,
      capacity_kg: cp.capacity || 1000,
      location_sensitivity: (cp as any).sensitivity || 'residential',
      last_collected_at: cp.last_collected_at,
    });
    return { ...cp, priorityRes };
  });

  const sortedPoints = [...pointsWithPriority].sort((a, b) => b.priorityRes.score - a.priorityRes.score);

  const columns: Column<any>[] = [
    {
      header: 'Collection Point Name',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-xs">{row.name}</p>
          <p className="text-[10px] text-slate-400">{row.ward || 'Central Panchayat Zone'}</p>
        </div>
      ),
    },
    {
      header: 'Fill % & Weight',
      accessor: (row) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className={`h-full ${
                  row.current_fill_percent >= 85 ? 'bg-rose-500' : row.current_fill_percent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, row.current_fill_percent))}%` }}
              />
            </div>
            <span className="font-bold text-xs">{row.current_fill_percent}%</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">{row.current_weight_kg} kg</p>
        </div>
      ),
    },
    {
      header: 'Priority Score',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <StatusBadge type="priority" value={row.priorityRes.level} size="sm" />
          <span className="font-extrabold text-xs">({row.priorityRes.score}/100)</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge type="point" value={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Demo Simulation Hackathon Bar */}
      <DemoSimulationBar />

      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
              {t('roleAdmin')} Realtime Operations
            </span>
            {isRealtimeActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-500" /> {t('liveDbActive')}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            {t('adminTitle')}
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-xl">
            {t('adminSubtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('actionRefresh')}</span>
          </button>
          <Link
            href="/admin/routes"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>{t('actionDispatch')}</span>
          </Link>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard title={t('adminStatTotalPoints')} value={`${totalCollectionPoints}`} subtitle="Narasipuram" icon={MapPin} variant="blue" />
        <StatCard title={t('adminStatCriticalPoints')} value={`${criticalPointsCount}`} subtitle={t('priorityCritical')} icon={AlertTriangle} variant="rose" />
        <StatCard title={t('adminStatHighPriority')} value={`${highPriorityPointsCount}`} subtitle={t('priorityHigh')} icon={TrendingUp} variant="amber" />
        <StatCard title={t('adminStatActiveVehicles')} value={`${activeVehiclesCount}`} subtitle={t('roleWorker')} icon={Truck} variant="emerald" />
        <StatCard title={t('adminStatTodayCollections')} value={`${todayCompletedCount}`} subtitle={t('statusCompleted')} icon={CheckCircle2} variant="emerald" />
        <StatCard title={t('adminStatPendingReports')} value={`${pendingReportsCount}`} subtitle={t('statusPending')} icon={FileText} variant="purple" />
      </div>

      {/* Signature Component: SmartWaste Pulse */}
      {sortedPoints.length > 0 && (
        <SmartWastePulse
          fillPercent={sortedPoints[0].current_fill_percent}
          locationName={sortedPoints[0].name}
          priorityLevel={sortedPoints[0].priorityRes.level}
          priorityScore={sortedPoints[0].priorityRes.score}
          recommendedAction={t('actionDispatch')}
          onActionClick={() => router.push('/admin/routes')}
        />
      )}

      {/* PHASE 10: AI WASTE DEMAND FORECAST & RECOMMENDATIONS */}
      <AIDemandForecastCard
        predictions={aiPredictions}
        onRunForecast={handleRunAIForecast}
        isLoading={aiLoading}
      />

      {/* ATTENTION REQUIRED SUMMARY CARD */}
      <div className="rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-slate-900/30 p-5 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/40 dark:border-rose-800/40 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500 text-white shadow-md">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                ⚠ ATTENTION REQUIRED
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Operational summary of critical waste accumulations, overdue collections, and urgent dispatches.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm">
              {overdueTasks.length + criticalPointsCount} Urgent Alerts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Critical Locations</span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">🔴 {criticalPointsCount} Bins (&gt;85% Fill)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Overdue Collections</span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">⚠ {overdueTasks.length} Overdue Stops</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 shadow-sm flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">High Priority Bins</span>
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">🟠 {highPriorityPointsCount} Locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* OVERDUE COLLECTION ALERTS & CARDS */}
      {overdueTasks.length > 0 && (
        <div className="rounded-3xl border-2 border-rose-500/50 bg-rose-50/60 dark:bg-rose-950/30 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-rose-600 text-white">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  OVERDUE COLLECTION ALERTS ({overdueTasks.length})
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Collection deadline passed without completion. Overdue factor (+15 pts) applied to priority score.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {overdueTasks.map((ov) => (
              <div key={ov.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 shadow-md flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> OVERDUE
                    </span>
                    <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                      {ov.overdue_mins} mins past deadline
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{ov.location_name}</h4>
                  
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 font-medium">
                    <p>Vehicle: <strong>{ov.vehicle_number}</strong></p>
                    <p>Driver: <strong>Ramesh Patel</strong></p>
                    <p>Scheduled Time: <strong>{new Date(ov.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></p>
                  </div>

                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold italic bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                    {ov.explanation}
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <button
                    onClick={() => setSelectedMissedModal(ov)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    Mark as Missed
                  </button>

                  <Link
                    href="/admin/routes"
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center space-x-1"
                  >
                    <span>VIEW ROUTE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPERATIONAL NOTIFICATIONS FEED */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Operational Notifications Feed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deduplicated real-time alert logs for overdue collections, citizen report spikes, and driver completions.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            {notifications.filter((n) => !n.read).length} Unread
          </span>
        </div>

        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                !n.read
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-80'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 shrink-0">
                  {n.type === 'OVERDUE_COLLECTION' ? (
                    <span className="p-1.5 rounded-lg bg-rose-500 text-white block">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  ) : n.type === 'MISSED_COLLECTION' ? (
                    <span className="p-1.5 rounded-lg bg-amber-500 text-white block">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-lg bg-indigo-500 text-white block">
                      <Bell className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                {!n.read && (
                  <button
                    onClick={() => markNotificationAsRead(n.id)}
                    title="Mark as Read"
                    className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center space-x-1 px-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Read</span>
                  </button>
                )}
                <button
                  onClick={() => clearNotification(n.id)}
                  title="Clear Notification"
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLLECTION VERIFICATION EVIDENCE VIEWER */}
      {verifications.length > 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Worker Collection Verification Evidence Logs
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect proof photos, exact timestamps, and honest GPS location tags submitted by field workers.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {verifications.length} Verifications
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifications.map((v) => (
              <div key={v.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{v.collection_point_name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Worker: <strong>{v.worker_name}</strong> ({v.vehicle_number})</p>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Photo Thumbnail */}
                <div 
                  onClick={() => setSelectedProofModal(v)}
                  className="relative h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-700 cursor-pointer group"
                >
                  <img src={v.image_url} alt="Verification" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs space-x-1">
                    <ExternalLink className="w-4 h-4" />
                    <span>Expand Photo</span>
                  </div>
                </div>

                {/* GPS Status Badge (Truthful) */}
                <div className="flex items-center justify-between text-[11px] border-t border-slate-200 dark:border-slate-700/60 pt-2">
                  {v.gps_verified && v.latitude && v.longitude ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>GPS Verified ({v.latitude.toFixed(4)}, {v.longitude.toFixed(4)})</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Location Unavailable (GPS Denied)</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WORKER ATTENDANCE & ACCOUNTABILITY AUDIT SECTION */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Worker Attendance &amp; Accountability Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track field worker clock-in status, assigned route execution progress, and geotagged collection proof verification.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
            100% Verified Accountability
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Worker / Driver</th>
                <th className="py-2.5 px-3">Vehicle &amp; Route</th>
                <th className="py-2.5 px-3">Clock-In Time</th>
                <th className="py-2.5 px-3">Shift Status</th>
                <th className="py-2.5 px-3">Stops Serviced</th>
                <th className="py-2.5 px-3">Geotag Proof Status</th>
                <th className="py-2.5 px-3">On-Time Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      R
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white">Ramesh Patel</p>
                      <p className="text-[10px] text-slate-400">ID: W-101 • Narasipuram</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <p className="font-bold text-slate-900 dark:text-white">TN-37-EV-2024</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">RT-ASSIGNED-01</p>
                </td>
                <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                  07:30 AM Today
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] uppercase">
                    ON ROUTE (ACTIVE)
                  </span>
                </td>
                <td className="py-3 px-3 font-bold">
                  {todayCompletedCount} / 4 Stops
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 w-fit">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>{verifications.length} Geotags Verified</span>
                  </span>
                </td>
                <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400">
                  98% On-Time
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="py-3 px-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      S
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white">Selvam Kumar</p>
                      <p className="text-[10px] text-slate-400">ID: W-102 • Thondamuthur</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <p className="font-bold text-slate-900 dark:text-white">TN-38-SW-8891</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">RT-THOND-02</p>
                </td>
                <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                  08:00 AM Today
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] uppercase">
                    SHIFT COMPLETED
                  </span>
                </td>
                <td className="py-3 px-3 font-bold">
                  5 / 5 Stops
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 w-fit">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>5 Geotags Verified</span>
                  </span>
                </td>
                <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400">
                  100% On-Time
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Map View */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>OpenStreetMap Real-time Priority Telemetry Map</span>
          </h3>
        </div>

        <AdminMap
          collectionPoints={collectionPoints}
          wasteReports={wasteReports}
          vehicles={vehicles}
        />
      </div>

      {/* Directory Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Collection Points Priority Directory (Sorted Highest Urgency First)
          </h3>
          <Link href="/admin/collection-points" className="text-xs font-bold text-emerald-600 hover:underline flex items-center space-x-1">
            <span>Full Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={sortedPoints}
          searchKey="name"
          searchPlaceholder="Search collection points..."
        />
      </div>

      {/* Photo Verification Expand Modal */}
      {selectedProofModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Verification Evidence: {selectedProofModal.collection_point_name}
                </h3>
                <p className="text-xs text-slate-500">Worker: {selectedProofModal.worker_name} ({selectedProofModal.vehicle_number})</p>
              </div>
              <button onClick={() => setSelectedProofModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <img src={selectedProofModal.image_url} alt="Proof" className="max-h-80 object-contain w-full" />
            </div>

            <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div><strong>Timestamp:</strong> {new Date(selectedProofModal.timestamp).toLocaleString()}</div>
              <div><strong>GPS Coordinates:</strong> {selectedProofModal.gps_verified ? `${selectedProofModal.latitude}, ${selectedProofModal.longitude}` : 'Location unavailable (GPS permission denied)'}</div>
              {selectedProofModal.notes && <div><strong>Notes:</strong> {selectedProofModal.notes}</div>}
            </div>

            <button onClick={() => setSelectedProofModal(null)} className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs">Close Preview</button>
          </div>
        </div>
      )}

      {/* Mark Collection as Missed Modal */}
      {selectedMissedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Classify Collection as Missed
                </h3>
              </div>
              <button onClick={() => setSelectedMissedModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>Location: <strong>{selectedMissedModal.location_name}</strong></p>
              <p>Vehicle: <strong>{selectedMissedModal.vehicle_number}</strong></p>
              <p>Overdue By: <strong className="text-rose-600">{selectedMissedModal.overdue_mins} mins</strong></p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Classification Reason (Optional)</label>
              <textarea
                value={missedReasonInput}
                onChange={(e) => setMissedReasonInput(e.target.value)}
                placeholder="e.g. Driver route delay due to traffic, container blocked by construction..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedMissedModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Keep Active
              </button>

              <button
                onClick={handleConfirmMarkMissed}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
              >
                Mark as MISSED
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
