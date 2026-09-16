'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { subscribeNotificationsChange, addNotification } from '@/lib/notification-service';
import { 
  fetchWorkerAssignedRoute, 
  startWorkerRoute,
  updateWorkerStopStatus, 
  DriverRouteData, 
  DriverStopItem 
} from '@/lib/worker-service';
import { completeDemoStop } from '@/lib/demo-simulation-service';
import { StatusBadge } from '@/components/ui/status-badge';
import { GeotagCamera, GeotagData } from '@/components/geotag-camera';
import { 
  AlertCircle,
  Truck, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  Upload, 
  AlertTriangle, 
  Check, 
  Navigation,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Loader2,
  X,
  Play,
  Lock,
  Sparkles,
  Award
} from 'lucide-react';

const RouteMap = dynamic(() => import('@/components/route-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400 font-mono">
      Loading OpenStreetMap Route Navigation...
    </div>
  ),
});

import { useLanguage } from '@/lib/i18n/context';

export default function DriverRoutePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { t, tLocation } = useLanguage();
  const [routeData, setRouteData] = useState<DriverRouteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Collection completion modal state
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);
  const [selectedStopToCollect, setSelectedStopToCollect] = useState<DriverStopItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proofPhotoPreview, setProofPhotoPreview] = useState<string | null>(null);
  const [issueNotes, setIssueNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [verificationLocation, setVerificationLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsVerified, setGpsVerified] = useState<boolean>(false);
  const [locationStatusText, setLocationStatusText] = useState<string>('Requesting GPS location...');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const driverId = user?.id || 'd1111111-1111-1111-1111-111111111111';
      const data = await fetchWorkerAssignedRoute(driverId, 'TN-37-EV-2024');
      setRouteData(data);
    } catch (err: any) {
      console.error('Error loading route execution page:', err);
      setErrorMsg(err?.message || 'Failed to fetch assigned route execution.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime channel for assigned routes
    const routeChannelId = `driver_routes_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const routeChannel = supabase
      .channel(routeChannelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'routes' },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Realtime subscription for operational notifications
    const unsubNotifs = subscribeNotificationsChange(() => {
      loadData();
    });

    return () => {
      supabase.removeChannel(routeChannel);
      unsubNotifs();
    };
  }, [user]);

  // Handle Start Route
  const handleStartRoute = async () => {
    if (!routeData) return;
    const updated = await startWorkerRoute(routeData);
    setRouteData(updated);
    setActionSuccessMsg('Route status updated to IN_PROGRESS. Stop 1 is now CURRENT STOP.');
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Handle Mark Arrived
  const handleMarkArrived = async (stop: DriverStopItem) => {
    if (!routeData) return;
    const workerId = user?.id || 'd1111111-1111-1111-1111-111111111111';
    
    setErrorMsg(null);
    setActionSuccessMsg(null);

    const res = await updateWorkerStopStatus({
      routeData,
      stopId: stop.id,
      workerId,
      newStatus: 'arrived',
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update stop status.');
    } else {
      setRouteData(res.updatedRouteData);
      setActionSuccessMsg(`Arrived at stop #${stop.sequence_number}: ${stop.location_name}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // Open Collection Verification Modal
  const openCollectModal = (stop: DriverStopItem) => {
    setSelectedStopToCollect(stop);
    setSelectedFile(null);
    setProofPhotoPreview(null);
    setIssueNotes('');
    setGpsVerified(false);
    setVerificationLocation(null);
    setLocationStatusText('Requesting GPS location...');
    setShowCollectModal(true);

    // Capture location permission honestly (non-blocking)
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setVerificationLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsVerified(true);
          setLocationStatusText(`GPS Verified (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
        },
        (err) => {
          console.warn('Geolocation denied/error:', err.message);
          setVerificationLocation(null);
          setGpsVerified(false);
          setLocationStatusText('Location unavailable (GPS permission denied / unavailable)');
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setGpsVerified(false);
      setLocationStatusText('Location unavailable (Geolocation unsupported)');
    }
  };

  // Handle Geotag Camera Capture
  const handleGeotagCapture = (data: GeotagData) => {
    setProofPhotoPreview(data.dataUrl);
    setVerificationLocation({ lat: data.latitude, lng: data.longitude });
    setGpsVerified(data.isGpsVerified);
    if (data.file) {
      setSelectedFile(data.file);
    }
  };

  const handleGeotagClear = () => {
    setProofPhotoPreview(null);
    setSelectedFile(null);
    setGpsVerified(false);
    setVerificationLocation(null);
  };

  // Submit Final Verification & Complete Stop
  const handleSubmitCollection = async () => {
    if (!routeData || !selectedStopToCollect) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const workerId = user?.id || 'd1111111-1111-1111-1111-111111111111';

    const res = await updateWorkerStopStatus({
      routeData,
      stopId: selectedStopToCollect.id,
      workerId,
      newStatus: 'collected',
      verificationFile: selectedFile || undefined,
      verificationImageUrl: proofPhotoPreview || undefined,
      issueDescription: issueNotes || undefined,
      latitude: verificationLocation?.lat,
      longitude: verificationLocation?.lng,
      gpsVerified,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to complete collection.');
    } else {
      setRouteData(res.updatedRouteData);
      setActionSuccessMsg(`Stop "${selectedStopToCollect.location_name}" marked as COLLECTED & Verified.`);
      setShowCollectModal(false);
      setSelectedStopToCollect(null);
      setSelectedFile(null);
      setProofPhotoPreview(null);
      setIssueNotes('');

      // Update isolated Demo Simulation state if in hackathon demo mode
      completeDemoStop(selectedStopToCollect.id, {
        verification_image_url: proofPhotoPreview || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=800',
        verification_latitude: verificationLocation?.lat || null,
        verification_longitude: verificationLocation?.lng || null,
        gps_verified: gpsVerified,
      });

      // Broadcast real-time completion notification to Admin
      await addNotification({
        title: 'Collection Stop Verified',
        message: `Stop "${selectedStopToCollect.location_name}" completed & verified by driver ${routeData.driver_name}.`,
        type: 'info',
        stop_id: selectedStopToCollect.id,
        route_id: routeData.route_id,
      });
    }
    setIsSubmitting(false);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[450px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="lg:col-span-2 h-[450px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!routeData) {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6 text-center">
        <div className="p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
            NO ROUTE ASSIGNED
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You currently have no collection route assigned for today.<br />
            Please wait for the Admin to assign a route to your vehicle.
          </p>
          <Link
            href="/driver"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Driver Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isStarted = routeData.route_status === 'IN_PROGRESS' || routeData.route_status === 'in_progress' || routeData.route_status === 'completed' || routeData.route_status === 'COMPLETED';
  const isCompleted = routeData.route_status === 'COMPLETED' || routeData.route_status === 'completed';

  const currentStopIndex = routeData.stops.findIndex((s) => s.status !== 'collected');
  const currentStop = currentStopIndex !== -1 ? routeData.stops[currentStopIndex] : routeData.stops[routeData.stops.length - 1];

  const mapStops = routeData.stops.map((s) => ({
    id: s.id,
    stop_number: s.sequence_number,
    location_name: s.location_name,
    latitude: s.latitude,
    longitude: s.longitude,
    priority_level: s.priority_level,
    fill_percent: s.fill_percentage,
    estimated_weight_kg: s.estimated_weight_kg,
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <Link
            href="/driver"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Today's Route Execution
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Route Code: <strong className="text-slate-700 dark:text-slate-200">{routeData.route_code}</strong> • Vehicle: <strong className="text-slate-700 dark:text-slate-200">{routeData.vehicle_number}</strong> • Status: <strong className="text-emerald-600 dark:text-emerald-400 uppercase">{routeData.route_status}</strong>
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1.5 w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Progress</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* OVERDUE STOP ALERT CARD FOR DRIVER */}
      {isStarted && !isCompleted && currentStop && currentStop.status !== 'collected' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/60 text-slate-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                ⚠ OVERDUE STOP
              </span>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">
                Stop #{currentStop.sequence_number} — {currentStop.location_name}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                Scheduled Time: <strong>5:00 PM</strong> • Status: <strong className="text-amber-600 dark:text-amber-400 uppercase">OVERDUE</strong>
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-1">
                Please complete this collection as soon as possible. Priority elevated automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedStopToCollect(currentStop);
              setShowCollectModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shrink-0 flex items-center space-x-1.5 self-end sm:self-center"
          >
            <Camera className="w-4 h-4" />
            <span>VIEW STOP &amp; VERIFY</span>
          </button>
        </div>
      )}

      {/* ROUTE COMPLETED BANNER */}
      {isCompleted ? (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-8 shadow-2xl text-center space-y-4 border border-emerald-500/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-1">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            🎉 COLLECTION ROUTE COMPLETED
          </h2>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            All <strong>{routeData.total_stops} / {routeData.total_stops}</strong> assigned collection points have been serviced, verified, and reset to 0% fill level.<br />
            Total Distance Covered: <strong>{routeData.total_distance_km} KM</strong> • Est. Duration: <strong>{routeData.estimated_duration_minutes} MINS</strong>.
          </p>
          <div className="pt-2">
            <Link
              href="/driver"
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all inline-flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Return to Driver Portal</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Enforced Sequential Stop List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ROUTE STOPS SEQUENCE ({routeData.completed_stops}/{routeData.total_stops} Done)
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {routeData.stops.map((stop, index) => {
                const isCompletedStop = stop.status === 'collected';
                const isCurrentStop = !isCompletedStop && (index === currentStopIndex || (currentStopIndex === -1 && index === 0));
                const isUpcomingLocked = !isCompletedStop && !isCurrentStop;

                return (
                  <div
                    key={stop.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCompletedStop
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 opacity-90'
                        : isCurrentStop
                        ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-7 h-7 rounded-full font-extrabold flex items-center justify-center text-xs shrink-0 ${
                          isCompletedStop
                            ? 'bg-emerald-500 text-slate-950'
                            : isCurrentStop
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {isCompletedStop ? '✓' : stop.sequence_number}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                            {stop.location_name}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Est. Waste: <strong>{stop.estimated_weight_kg} kg</strong>
                          </p>
                        </div>
                      </div>
                      <StatusBadge type="priority" value={stop.priority_level} size="sm" />
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      {isCompletedStop && (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>COMPLETED & VERIFIED</span>
                        </span>
                      )}

                      {isCurrentStop && (
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>CURRENT STOP</span>
                        </span>
                      )}

                      {isUpcomingLocked && (
                        <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>UPCOMING (LOCKED)</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: CURRENT STOP ACTION CARD & ROUTE MAP */}
          <div className="lg:col-span-2 space-y-4">
            
            {!isStarted && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t('navTodayRoute')}</div>
                  <h3 className="text-lg font-black text-white">{routeData.route_code}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Click Start Route to begin pickup dispatch for Stop 1.</p>
                </div>
                <button
                  onClick={handleStartRoute}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 shrink-0"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{t('driverStartRoute')}</span>
                </button>
              </div>
            )}

            {isStarted && currentStop && (
              <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-md">
                      #{currentStop.sequence_number}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          CURRENT STOP
                        </span>
                        <StatusBadge type="priority" value={currentStop.priority_level} size="sm" />
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {tLocation(currentStop.location_name)}
                      </h2>
                    </div>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.latitude},${currentStop.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span>NAVIGATE / VIEW ON MAP</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Priority &amp; Score</span>
                    <strong className="text-slate-900 dark:text-white font-extrabold">{currentStop.priority_level} ({currentStop.priority_score})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Waste</span>
                    <strong className="text-slate-900 dark:text-white font-extrabold">{currentStop.estimated_weight_kg} kg</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Bin Fill Level</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{currentStop.fill_percentage}% Full</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  {currentStop.status === 'pending' && (
                    <button
                      onClick={() => handleMarkArrived(currentStop)}
                      className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>{t('driverArrive')}</span>
                    </button>
                  )}

                  {currentStop.status === 'arrived' && (
                    <button
                      onClick={() => openCollectModal(currentStop)}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('driverCollect')}</span>
                    </button>
                  )}

                  {currentStop.status === 'collected' && (
                    <button
                      onClick={() => openCollectModal(currentStop)}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t('driverVerify')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 shadow-sm">
              <RouteMap
                stops={mapStops as any}
                vehicleLat={11.0003}
                vehicleLng={76.7725}
                vehicleNumber={routeData.vehicle_number}
                isFallback={routeData.is_fallback}
              />
            </div>

          </div>

        </div>
      )}

      {/* Mobile Sticky Quick Action Bar */}
      {isStarted && !isCompleted && currentStop && (
        <div className="fixed bottom-3 left-3 right-3 z-40 lg:hidden p-3 rounded-2xl bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-white">
            <span className="font-bold truncate max-w-[200px]">Stop #{currentStop.sequence_number}: {currentStop.location_name}</span>
            <span className="font-extrabold text-emerald-400">{currentStop.estimated_weight_kg} kg</span>
          </div>
          {currentStop.status === 'pending' && (
            <button
              onClick={() => handleMarkArrived(currentStop)}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
            >
              <MapPin className="w-4 h-4" />
              <span>{t('driverArrive')}</span>
            </button>
          )}
          {currentStop.status === 'arrived' && (
            <button
              onClick={() => openCollectModal(currentStop)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{t('driverCollect')}</span>
            </button>
          )}
          {currentStop.status === 'collected' && (
            <button
              onClick={() => openCollectModal(currentStop)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>{t('driverVerify')}</span>
            </button>
          )}
        </div>
      )}

      {/* COLLECTION VERIFICATION MODAL */}
      {showCollectModal && selectedStopToCollect && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    VERIFY COLLECTION — Stop #{selectedStopToCollect.sequence_number}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{selectedStopToCollect.location_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Geotagged Proof Camera */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Worker Geotagged Collection Proof
              </label>
              <GeotagCamera
                roleLabel="WORKER COLLECTION PROOF"
                defaultLandmark={selectedStopToCollect.location_name}
                defaultLat={selectedStopToCollect.latitude}
                defaultLng={selectedStopToCollect.longitude}
                onCapture={handleGeotagCapture}
                onClear={handleGeotagClear}
                required={true}
              />
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Optional Incident Description / Notes
              </label>
              <textarea
                rows={2}
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="Notes regarding waste condition or site access..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCollection}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center space-x-1.5"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>VERIFY & COMPLETE STOP</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
