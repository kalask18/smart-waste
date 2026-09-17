'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { 
  fetchWorkerAssignedRoute, 
  startWorkerRoute, 
  DriverRouteData, 
  DriverStopItem 
} from '@/lib/worker-service';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Navigation, 
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Play,
  Lock,
  Calendar,
  Check
} from 'lucide-react';

import { useLanguage } from '@/lib/i18n/context';

export default function DriverDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t, tLocation } = useLanguage();
  const [routeData, setRouteData] = useState<DriverRouteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDriverData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const driverId = user?.id || 'd1111111-1111-1111-1111-111111111111';
      const data = await fetchWorkerAssignedRoute(driverId, 'TN-37-EV-2024');
      setRouteData(data);
    } catch (err: any) {
      console.error('Error loading driver dashboard:', err);
      setErrorMsg(err?.message || 'Failed to load driver route data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [user]);

  const handleStartRoute = async () => {
    if (!routeData) return;
    const updated = await startWorkerRoute(routeData);
    setRouteData(updated);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const driverDisplayName = profile?.full_name ? tLocation(profile.full_name) : tLocation('Ramesh Patel');

  // NO ROUTE ASSIGNED EMPTY STATE (Section 2 Requirement)
  if (!routeData) {
    return (
      <div className="space-y-6 py-4 max-w-4xl mx-auto">
        
        {/* Driver Profile Header */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('driverPortal')}</div>
            <h1 className="text-2xl font-black text-white mt-1">{driverDisplayName}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{t('driverVehicleLabel')}: <strong className="text-white">Unassigned / Pending</strong></p>
          </div>
          <button
            onClick={loadDriverData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('driverRefreshProgress')}</span>
          </button>
        </div>

        {/* Empty State Banner */}
        <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            {t('driverNoRouteAssigned')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t('driverNoRouteSub')}
          </p>
          <div className="pt-2">
            <button
              onClick={loadDriverData}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('driverRefreshProgress')}</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  const isStarted = routeData.route_status === 'IN_PROGRESS' || routeData.route_status === 'in_progress' || routeData.route_status === 'completed' || routeData.route_status === 'COMPLETED';
  const isCompleted = routeData.route_status === 'COMPLETED' || routeData.route_status === 'completed';
  const currentStopIndex = routeData.stops.findIndex((s) => s.status !== 'collected');

  return (
    <div className="space-y-6">
      
      {/* Driver Header Banner */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              {t('driverDispatch')}
            </span>
            <span className="text-xs text-slate-400">{t('shiftActive')}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            {t('roleWorker')}: {driverDisplayName}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {t('driverVehicleLabel')}: <strong className="text-emerald-400">{routeData.vehicle_number}</strong> ({routeData.vehicle_type}) • {t('capacityLabel', { weight: routeData.vehicle_capacity_kg })}
          </p>
        </div>

        <button
          onClick={loadDriverData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 w-fit shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('syncRoute')}</span>
        </button>
      </div>

      {/* TODAY'S COLLECTION ROUTE MAIN CARD */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-6 shadow-xl border border-emerald-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
              {t('todayCollectionRoute')}
            </div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-extrabold text-white">
                {t('driverVehicleLabel')}: {routeData.vehicle_number}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isStarted
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {routeData.route_status === 'completed' || routeData.route_status === 'COMPLETED' ? t('statusCompleted') : routeData.route_status === 'in_progress' || routeData.route_status === 'IN_PROGRESS' ? t('statusInProgress') : t('statusPending')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{t('totalStops')}</span>
              <strong className="text-base text-white font-bold">{routeData.total_stops} {t('totalStops').toUpperCase()}</strong>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{t('driverDistance')}</span>
              <strong className="text-base text-emerald-400 font-bold">{routeData.total_distance_km} KM</strong>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">{t('estimatedWasteLabel')}</span>
              <strong className="text-base text-white font-bold">{t('minsDuration', { mins: routeData.estimated_duration_minutes })}</strong>
            </div>
          </div>
        </div>

        {/* Start / Navigate Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          <p className="text-xs text-slate-300">
            {isCompleted ? (
              <span className="text-emerald-400 font-bold">🎉 {t('driverRouteCompletedDesc')}</span>
            ) : isStarted ? (
              <span>{t('driverSub')}</span>
            ) : (
              <span>{t('driverSub')}</span>
            )}
          </p>

          {!isStarted ? (
            <button
              onClick={handleStartRoute}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 shrink-0"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{t('driverStartRoute')}</span>
            </button>
          ) : (
            <Link
              href="/driver/route"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{t('driverNavigateViewMap')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('driverVehicleLabel')}
          value={routeData.vehicle_number}
          subtitle={t('capacityLabel', { weight: routeData.vehicle_capacity_kg })}
          icon={Truck}
          variant="emerald"
        />
        <StatCard
          title={t('driverRouteCodeLabel')}
          value={routeData.route_code}
          subtitle={`Date: ${routeData.route_date}`}
          icon={ShieldCheck}
          variant="blue"
        />
        <StatCard
          title={t('driverRouteDistEst')}
          value={`${routeData.total_distance_km} KM`}
          subtitle={t('minsDuration', { mins: routeData.estimated_duration_minutes })}
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title={t('stopsCompleted')}
          value={`${routeData.completed_stops} / ${routeData.total_stops}`}
          subtitle={`${routeData.remaining_stops} ${t('stopsRemaining')}`}
          icon={CheckCircle2}
          variant={routeData.remaining_stops === 0 ? 'emerald' : 'purple'}
        />
      </div>

      {/* ROUTE PROGRESS SEQUENCE LIST (Section 9 Requirement) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            {t('routeProgressSequence')}
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {t('driverDoneCount', { done: routeData.completed_stops, total: routeData.total_stops })}
          </span>
        </div>

        <div className="space-y-3">
          {routeData.stops.map((stop, index) => {
            const isCompletedStop = stop.status === 'collected';
            const isCurrentStop = !isCompletedStop && (index === currentStopIndex || (currentStopIndex === -1 && index === 0));
            const isUpcomingLocked = !isCompletedStop && !isCurrentStop;

            return (
              <div
                key={stop.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompletedStop
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 opacity-90'
                    : isCurrentStop
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-lg ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    isCompletedStop
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrentStop
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isCompletedStop ? <Check className="w-5 h-5 stroke-[3]" /> : `0${stop.sequence_number}`}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {tLocation(stop.location_name)}
                      </h4>
                      {isCurrentStop && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                          {t('driverCurrentStop')}
                        </span>
                      )}
                      {isUpcomingLocked && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>{t('locked')}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('pulseStep3Title')}: <strong>{stop.priority_level === 'CRITICAL' ? t('priorityCritical') : stop.priority_level === 'HIGH' ? t('priorityHigh') : t('priorityMedium')} ({stop.priority_score})</strong> • {t('driverEstWeight')}: <strong>{stop.estimated_weight_kg} kg</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isCompletedStop && (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('driverCompletedVerified')}</span>
                    </span>
                  )}

                  {isCurrentStop && (
                    <Link
                      href="/driver/route"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-colors flex items-center space-x-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{t('executeStop')}</span>
                    </Link>
                  )}

                  {isUpcomingLocked && (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center space-x-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{t('locked')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
