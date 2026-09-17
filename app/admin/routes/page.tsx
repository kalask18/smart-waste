'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { generateSmartCollectionRoute, saveRouteToSupabase, SmartRouteResult } from '@/lib/route-generator';
import { StatusBadge } from '@/components/ui/status-badge';
import { addNotification } from '@/lib/notification-service';
import { fetchMergedWasteReports, subscribeReportsChange } from '@/lib/report-service';
import { CollectionPoint, WasteReport } from '@/types/database';
import { 
  Navigation, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Calendar,
  X,
  RefreshCw,
  Clock,
  MapPin,
  ArrowDown,
  Info,
  ChevronRight,
  ShieldAlert,
  Send,
} from 'lucide-react';

import RouteMap from '@/components/route-map';

import { DemoSimulationBar } from '@/components/demo-simulation-bar';
import { getDemoState, subscribeDemoStateChange, updateDemoStage } from '@/lib/demo-simulation-service';

const DEFAULT_POINTS: CollectionPoint[] = [
  { id: 'cp1', name: 'Narasipuram Panchayat Main Gate Dumpster', current_fill_percent: 92, current_weight_kg: 350, capacity: 1000, latitude: 11.0003, longitude: 76.7725, status: 'overflowing', created_at: new Date().toISOString() },
  { id: 'cp2', name: 'Primary Health Centre Dumpster', current_fill_percent: 88, current_weight_kg: 410, capacity: 1200, latitude: 10.9980, longitude: 76.7745, status: 'overflowing', created_at: new Date().toISOString() },
  { id: 'cp3', name: 'Govt Higher Sec School Gate Container', current_fill_percent: 78, current_weight_kg: 280, capacity: 1000, latitude: 11.0028, longitude: 76.7705, status: 'active', created_at: new Date().toISOString() },
  { id: 'cp4', name: 'Thondamuthur Weekly Market Yard', current_fill_percent: 71, current_weight_kg: 220, capacity: 1500, latitude: 10.9945, longitude: 76.7810, status: 'active', created_at: new Date().toISOString() },
  { id: 'cp5', name: 'Velliangiri Foothills Bus Stop Bin', current_fill_percent: 48, current_weight_kg: 140, capacity: 800, latitude: 10.9912, longitude: 76.7645, status: 'active', created_at: new Date().toISOString() },
];

import { useLanguage } from '@/lib/i18n/context';

export default function AdminRoutesPage() {
  const { t, tLocation } = useLanguage();
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>(DEFAULT_POINTS);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [activeRoute, setActiveRoute] = useState<SmartRouteResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSendingRoute, setIsSendingRoute] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Loading Steps Animation State
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // Form selections
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('v1');
  const [routeDate, setRouteDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSendRouteToDriver = async () => {
    if (!activeRoute) return;
    setIsSendingRoute(true);
    try {
      await saveRouteToSupabase(activeRoute);
      await addNotification({
        title: 'New Route Assigned',
        message: `Route ${activeRoute.route_code} with ${activeRoute.total_stops} stops assigned to driver ${activeRoute.assigned_driver} (${activeRoute.assigned_vehicle}).`,
        type: 'task',
        route_id: activeRoute.id,
      });
      setActiveRoute({ ...activeRoute, route_status: 'IN_PROGRESS' });
      setSendSuccessMsg(`Route ${activeRoute.route_code} dispatched to ${activeRoute.assigned_driver} successfully!`);
      setTimeout(() => setSendSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Error dispatching route to driver:', err);
    } finally {
      setIsSendingRoute(false);
    }
  };

  const fetchData = async () => {
    try {
      let dbPoints: CollectionPoint[] = [];
      const { data: cpData } = await supabase.from('collection_points').select('*');
      if (cpData && cpData.length > 0) dbPoints = cpData as CollectionPoint[];

      const mergedReports = await fetchMergedWasteReports();
      setWasteReports(mergedReports);

      const finalCollectionPoints = dbPoints.length > 0 ? dbPoints : DEFAULT_POINTS;
      setCollectionPoints(finalCollectionPoints);

      // Auto-generate active route based on real-time database data
      const driverMap: Record<string, { driver: string; veh: string; cap: number }> = {
        v1: { driver: 'Ramesh Patel', veh: 'TN-37-EV-2024', cap: 2000 },
        v2: { driver: 'Suresh K.', veh: 'TN-37-G-4050', cap: 3500 },
        v3: { driver: 'Manjunath P.', veh: 'TN-37-M-3001', cap: 1200 },
      };
      const vehInfo = driverMap[selectedVehicle] || driverMap['v1'];

      const result = await generateSmartCollectionRoute({
        vehicle_lat: 11.0003,
        vehicle_lng: 76.7725,
        vehicle_capacity_kg: vehInfo.cap,
        collectionPoints: finalCollectionPoints,
        wasteReports: mergedReports,
        route_date: routeDate,
        driver_name: vehInfo.driver,
        vehicle_number: vehInfo.veh,
        selected_area_id: selectedArea,
      });

      setActiveRoute(result);
      await saveRouteToSupabase(result);
    } catch (err) {
      console.error('Error fetching route data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubDemo = subscribeDemoStateChange(() => {
      fetchData();
    });
    const unsubReports = subscribeReportsChange(() => {
      fetchData();
    });
    return () => {
      unsubDemo();
      unsubReports();
    };
  }, []);

  const handleGenerateRoute = async () => {
    setIsGenerating(true);
    setLoadingStep(1); // 1. Analyzing priority...

    try {
      const driverMap: Record<string, { driver: string; veh: string; cap: number }> = {
        v1: { driver: 'Ramesh Patel', veh: 'TN-37-EV-2024 (Electric Tipper)', cap: 2000 },
        v2: { driver: 'Suresh K.', veh: 'TN-37-G-4050 (Compactor)', cap: 3500 },
        v3: { driver: 'Manjunath P.', veh: 'TN-37-M-3001 (Mini Tipper)', cap: 1200 },
      };

      const vehInfo = driverMap[selectedVehicle] || driverMap['v1'];

      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStep(2); // 2. Checking vehicle capacity...

      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStep(3); // 3. Calculating OSRM distances...

      const result = await generateSmartCollectionRoute({
        vehicle_lat: 11.0003,
        vehicle_lng: 76.7725,
        vehicle_capacity_kg: vehInfo.cap,
        collectionPoints,
        wasteReports,
        route_date: routeDate,
        driver_name: vehInfo.driver,
        vehicle_number: vehInfo.veh,
        selected_area_id: selectedArea,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStep(4); // 4. Building route...

      await new Promise((resolve) => setTimeout(resolve, 400));
      setActiveRoute(result);
      setShowModal(false);

      // Update demo simulation stage if in demo mode
      updateDemoStage('SMART_ROUTE', result);

      // Save to Supabase
      await saveRouteToSupabase(result);
    } catch (err) {
      console.error('Route generation error:', err);
    } finally {
      setIsGenerating(false);
      setLoadingStep(0);
    }
  };

  const updateRouteStatus = (newStatus: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED') => {
    if (activeRoute) {
      setActiveRoute({ ...activeRoute, route_status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('routesTitle')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Deterministic Routing
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
            {t('routesSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2 w-fit shrink-0"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>{t('btnGenerateSmartRoute')}</span>
        </button>
      </div>

      {/* Generated Active Route View */}
      {activeRoute ? (
        <div className="space-y-6">
          
          {/* 1. ROUTE SUMMARY HEADER BOX */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-xl">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-extrabold text-xl text-white tracking-tight">
                      {activeRoute.assigned_vehicle}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {activeRoute.route_status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Area: {tLocation(activeRoute.target_area_name || 'All Panchayat Areas')}
                    </span>
                    {activeRoute.is_fallback ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {t('haversineFallbackPath')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {t('osrmRoadPolyline')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Driver: <strong className="text-white">{tLocation(activeRoute.assigned_driver)}</strong> • Scheduled Date: <strong className="text-slate-300">{activeRoute.route_date}</strong> • Code: <code className="font-mono text-emerald-400">{activeRoute.route_code}</code>
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSendRouteToDriver}
                  disabled={isSendingRoute}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-emerald-200" />
                  <span>{isSendingRoute ? t('dispatchedToDriver') : t('btnSendRouteToDriver')}</span>
                </button>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-400 font-bold">{t('routeStatusLabel')}</label>
                  <select
                    value={activeRoute.route_status}
                    onChange={(e) => updateRouteStatus(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="PLANNED">PLANNED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>
            </div>

            {sendSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sendSuccessMsg}</span>
              </div>
            )}

            {/* Metric Metrics & Capacity Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              
              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">{t('totalRouteRange')}</span>
                <p className="text-lg font-extrabold text-emerald-400">
                  {t('stopsCount', { count: activeRoute.total_stops })} • {activeRoute.total_distance_km} km
                </p>
                <p className="text-[11px] text-slate-400">{t('estDurationMins', { mins: activeRoute.estimated_duration_minutes })}</p>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">{t('wastePayload')}</span>
                <p className="text-lg font-extrabold text-amber-400">
                  {activeRoute.total_payload_kg} kg / {activeRoute.vehicle_capacity_kg} kg
                </p>
                <p className="text-[11px] text-slate-400">{t('remainingCapacityLabel', { weight: activeRoute.remaining_capacity_kg })}</p>
              </div>

              <div className="lg:col-span-2 p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">{t('capacityUtilization')}</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {Math.round((activeRoute.total_payload_kg / activeRoute.vehicle_capacity_kg) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                  <div
                    className={`h-full transition-all ${
                      activeRoute.capacity_exceeded ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (activeRoute.total_payload_kg / activeRoute.vehicle_capacity_kg) * 100)}%` }}
                  />
                </div>
                {activeRoute.capacity_exceeded && (
                  <p className="text-[10px] text-rose-400 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>{t('capacityWarning')}</span>
                  </p>
                )}
              </div>

            </div>

          </div>

          {/* 2. MAP & WHY THIS ROUTE EXPLANATION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Leaflet Route Map */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>{t('seqDrivingMap')}</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {activeRoute.is_fallback ? t('haversineFallbackPath') : t('osrmRoadPolyline')}
                </span>
              </div>

              <RouteMap
                geometryCoordinates={activeRoute.geometry_coordinates}
                stops={activeRoute.stops}
                vehicleLat={11.0003}
                vehicleLng={76.7725}
                vehicleNumber={activeRoute.assigned_vehicle}
                isFallback={activeRoute.is_fallback}
              />
            </div>

            {/* Right 1 Col: Why This Route Explanation Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>{t('whyThisRouteTitle')}</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  {activeRoute.route_explanation.map((exp, idx) => (
                    <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{exp}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Product Principle:</p>
                  <p className="leading-snug">
                    This is a <strong>Smart Priority-Aware Collection Route</strong>. Priority scores dictate stop necessity while nearest-neighbour distance minimizes fuel consumption.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* 3. NUMBERED VERTICAL ROUTE TIMELINE */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t('timelineTitle')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('timelineSub')}
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('totalStopsBadge', { count: activeRoute.total_stops })}
              </span>
            </div>

            <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              
              {/* START: Planned Vehicle Start Depot */}
              <div className="relative flex items-start space-x-4">
                <div className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold border-2 border-emerald-500 shadow-md">
                  🚛
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-emerald-400">
                      {t('startDepotTitle')}
                    </h4>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {t('departureTime')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Vehicle: {activeRoute.assigned_vehicle} • Driver: {tLocation(activeRoute.assigned_driver)} • Payload Capacity: {activeRoute.vehicle_capacity_kg} kg
                  </p>
                </div>
              </div>

              {/* TIMELINE STOPS */}
              {activeRoute.stops.map((stop) => (
                <div key={stop.id} className="relative flex items-start space-x-4">
                  
                  {/* Timeline Badge Number */}
                  <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-slate-900 text-emerald-400 font-mono font-black flex items-center justify-center text-xs border border-emerald-500/50 shadow-md">
                    {stop.stop_number < 10 ? `0${stop.stop_number}` : stop.stop_number}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex-1 space-y-3 hover:shadow-md transition-shadow">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                            {t('stopNumberHeader', { num: stop.stop_number })}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {tLocation(stop.location_name)}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {t('proximityLabel', { dist: stop.distance_from_prev_km, time: stop.estimated_arrival_time })}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <StatusBadge type="priority" value={stop.priority_level} size="sm" />
                        <span className="font-extrabold text-xs font-mono">
                          Score {stop.priority_score}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Left: Metrics */}
                      <div className="space-y-1 text-slate-600 dark:text-slate-300">
                        <p><strong>{t('estimatedWasteLabel')}</strong> <span className="font-bold text-slate-900 dark:text-white">{stop.estimated_weight_kg} kg</span></p>
                        <p><strong>{t('collectionStatusLabel')}</strong> <span className="capitalize font-bold text-emerald-600">{stop.status}</span></p>
                        <p className="text-slate-400 line-clamp-1"><em>{stop.explanation}</em></p>
                      </div>

                      {/* Right: Why This Stop Bullets */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <p className="font-bold text-[11px] text-slate-900 dark:text-white">{t('whyThisStopTitle')}</p>
                        <div className="space-y-0.5 text-[11px] text-slate-500">
                          {stop.why_this_stop.map((bullet, idx) => (
                            <p key={idx} className="flex items-center space-x-1.5">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>{bullet}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              ))}

              {/* END: Route Completion */}
              <div className="relative flex items-start space-x-4">
                <div className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-md">
                  ✓
                </div>
                <div className="bg-emerald-950/60 text-emerald-200 p-4 rounded-2xl border border-emerald-800 flex-1 space-y-1">
                  <h4 className="font-extrabold text-sm text-white">
                    {t('endRouteTitle')}
                  </h4>
                  <p className="text-xs text-emerald-300">
                    Total Route Distance: {activeRoute.total_distance_km} km • Total Payload: {activeRoute.total_payload_kg} kg
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <Truck className="w-12 h-12 text-emerald-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Generate Smart Priority-Aware Collection Route
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select vehicle capacity, scheduled date, and click below to run the Smart Route Generator.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Open Route Generator
          </button>
        </div>
      )}

      {/* Generate Route Modal with Step-by-Step Loading Animation */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Smart Route Generator</span>
              </h3>
              {!isGenerating && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-6 space-y-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Generating Smart Collection Route...
                </h4>
                
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2 font-mono">
                  <p className={loadingStep >= 1 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {loadingStep >= 1 ? '✓' : '○'} Analyzing Priority Engine Scores...
                  </p>
                  <p className={loadingStep >= 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {loadingStep >= 2 ? '✓' : '○'} Checking Vehicle Capacity Constraints...
                  </p>
                  <p className={loadingStep >= 3 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {loadingStep >= 3 ? '✓' : '○'} Calculating OSRM Road Distances...
                  </p>
                  <p className={loadingStep >= 4 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {loadingStep >= 4 ? '✓' : '○'} Building Sequential Route Timeline...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 text-xs">
                  
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Select Target Collection Area / Ward Zone *
                    </label>
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="all">All Areas (Entire Panchayat Zone)</option>
                      <option value="a1111111-1111-1111-1111-111111111111">Narasipuram Town Zone</option>
                      <option value="a2222222-2222-2222-2222-222222222222">Vellaimalaipattinam &amp; Ikkaraibooluvampatti Zone</option>
                      <option value="a3333333-3333-3333-3333-333333333333">Devarayapuram &amp; Thondamuthur Zone</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Select Dispatch Vehicle & Capacity *
                    </label>
                    <select
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="v1">Ramesh Patel - TN-37-EV-2024 Electric Tipper (2000 kg capacity)</option>
                      <option value="v2">Suresh K. - TN-37-G-4050 Compactor (3500 kg capacity)</option>
                      <option value="v3">Manjunath P. - TN-37-M-3001 Mini Tipper (1200 kg capacity)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Select Scheduled Date *
                    </label>
                    <input
                      type="date"
                      value={routeDate}
                      onChange={(e) => setRouteDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 space-y-1 text-[11px] text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold">Algorithm Concept:</p>
                    <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      1. Priority determines WHAT needs attention first.<br />
                      2. Proximity determines HOW to visit efficiently.<br />
                      3. Capacity determines HOW MUCH can be collected.
                    </p>
                  </div>

                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateRoute}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Generate & Save Route</span>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
