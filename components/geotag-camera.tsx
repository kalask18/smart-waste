'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, X, Upload } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface GeotagData {
  dataUrl: string;
  file?: File;
  latitude: number;
  longitude: number;
  landmark: string;
  timestamp: string;
  isGpsVerified: boolean;
}

interface GeotagCameraProps {
  onCapture: (data: GeotagData) => void;
  onClear?: () => void;
  defaultLandmark?: string;
  defaultLat?: number;
  defaultLng?: number;
  roleLabel?: string;
  required?: boolean;
}

export type GpsState = 'idle' | 'requesting' | 'success' | 'denied' | 'unavailable' | 'timeout' | 'manual';

export function GeotagCamera({
  onCapture,
  onClear,
  defaultLandmark = 'Narasipuram Main Road, Coimbatore',
  defaultLat = 11.0003,
  defaultLng = 76.7725,
  roleLabel = 'CITIZEN REPORT',
  required = false,
}: GeotagCameraProps) {
  const { isTamil } = useLanguage();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // GPS State
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [landmark, setLandmark] = useState<string>(defaultLandmark);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Captured Result
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-request GPS position on mount
  useEffect(() => {
    requestGpsLocation();
    return () => {
      stopCamera();
    };
  }, []);

  const requestGpsLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsState('unavailable');
      setGpsErrorMsg(isTamil ? 'GPS சேவை கிடைக்கவில்லை' : 'Geolocation is not supported by your browser.');
      return;
    }

    setGpsState('requesting');
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGpsState('success');
      },
      (err) => {
        console.warn('GPS position notice:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState('denied');
          setGpsErrorMsg(isTamil ? 'GPS அனுமதி மறுக்கப்பட்டது. கைமுறையாக ஆயங்களை பதிவு செய்யலாம்.' : 'GPS permission denied. You can manually enter coordinates.');
        } else if (err.code === err.TIMEOUT) {
          setGpsState('timeout');
          setGpsErrorMsg(isTamil ? 'GPS நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும்.' : 'GPS request timed out. Please retry or enter coordinates.');
        } else {
          setGpsState('unavailable');
          setGpsErrorMsg(isTamil ? 'GPS இருப்பிடம் பெற முடியவில்லை.' : 'Location unavailable. Using fallback default coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(isTamil ? 'உலாவியில் கேமரா வசதி இல்லை.' : 'Camera API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access notice:', err);
      setCameraError(err.message || (isTamil ? 'கேமரா அனுமதி மறுக்கப்பட்டது.' : 'Camera access denied or unavailable. You can upload a photo or use demo proof.'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const drawGeotagWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, timeStr: string) => {
    // Semi-transparent dark banner at bottom
    const bannerHeight = 85;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Accent line
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, height - bannerHeight, width, 4);

    // Watermark Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`📍 GEOTAG PROOF: Lat ${lat.toFixed(4)}° N, Lng ${lng.toFixed(4)}° E`, 15, height - 58);

    ctx.fillStyle = '#34d399';
    ctx.font = '12px sans-serif';
    ctx.fillText(`🕒 ${timeStr} | 🏢 ${landmark}`, 15, height - 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`🛡️ VERIFIED BY SMARTWASTE PWA [${roleLabel}]`, 15, height - 18);
  };

  const snapCameraPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw camera frame
    ctx.drawImage(video, 0, 0, width, height);

    // Watermark
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    drawGeotagWatermark(ctx, width, height, timeStr);

    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(finalDataUrl);
    stopCamera();
    setIsCapturing(false);

    onCapture({
      dataUrl: finalDataUrl,
      latitude: lat,
      longitude: lng,
      landmark,
      timestamp: timeStr,
      isGpsVerified: gpsState === 'success',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const width = img.width || 640;
        const height = img.height || 480;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
          drawGeotagWatermark(ctx, width, height, timeStr);
          const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setCapturedDataUrl(finalDataUrl);

          onCapture({
            dataUrl: finalDataUrl,
            file,
            latitude: lat,
            longitude: lng,
            landmark,
            timestamp: timeStr,
            isGpsVerified: gpsState === 'success',
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const generateDemoPhoto = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient for simulated waste site photo
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#022c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Simulated Waste Bin shape
    ctx.fillStyle = '#10b981';
    ctx.fillRect(220, 140, 200, 240);
    ctx.fillStyle = '#059669';
    ctx.fillRect(200, 110, 240, 30);
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SMARTWASTE BIN', 230, 250);

    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    drawGeotagWatermark(ctx, 640, 480, timeStr);

    const finalDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(finalDataUrl);

    onCapture({
      dataUrl: finalDataUrl,
      latitude: lat,
      longitude: lng,
      landmark,
      timestamp: timeStr,
      isGpsVerified: gpsState === 'success',
    });
  };

  const clearPhoto = () => {
    setCapturedDataUrl(null);
    if (onClear) onClear();
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. GPS STATUS & COORDINATE CONTROLS */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className={`w-4 h-4 ${gpsState === 'success' ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {isTamil ? 'ஜிபிஎஸ் புவிசார் இருப்பிடம் (Geotag)' : 'GPS Geotag Location'}
            </span>
          </div>

          <button
            type="button"
            onClick={requestGpsLocation}
            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <RefreshCw className={`w-3 h-3 ${gpsState === 'requesting' ? 'animate-spin' : ''}`} />
            <span>{isTamil ? 'மீண்டும் முயற்சி' : 'Refresh GPS'}</span>
          </button>
        </div>

        {/* GPS State Badges */}
        <div className="flex items-center space-x-2 text-xs">
          {gpsState === 'requesting' && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
              ⏳ {isTamil ? 'இருப்பிடம் பெறப்படுகிறது...' : 'Obtaining GPS location...'}
            </span>
          )}
          {gpsState === 'success' && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Lat: {lat.toFixed(4)}°, Lng: {lng.toFixed(4)}° (Verified)</span>
            </span>
          )}
          {(gpsState === 'denied' || gpsState === 'unavailable' || gpsState === 'timeout') && (
            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>{gpsErrorMsg || (isTamil ? 'கைமுறை இருப்பிடம் பயன்படுத்தப்படுகிறது' : 'Manual GPS fallback active')}</span>
            </span>
          )}
        </div>

        {/* Manual Coordinate Override Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 11.0003)}
              className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Longitude</label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value) || 76.7725)}
              className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-semibold"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{isTamil ? 'அடையாள எல்லை' : 'Landmark / Ward'}</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold"
              placeholder="e.g. Narasipuram Main Gate"
            />
          </div>
        </div>
      </div>

      {/* 2. GEOTAG CAMERA CAPTURE / PREVIEW */}
      <div className="space-y-3">
        {capturedDataUrl ? (
          /* Captured Photo Preview with Geotag Badge */
          <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
            <img src={capturedDataUrl} alt="Geotagged Proof" className="w-full h-56 object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
              title={isTamil ? 'புகைப்படத்தை அகற்று' : 'Retake / Remove Photo'}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center space-x-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isTamil ? 'புவிசார் முத்திரை இணைக்கப்பட்டது' : 'Geotag Watermark Embedded'}</span>
            </div>
          </div>
        ) : isCameraActive ? (
          /* Live Camera Stream Viewfinder */
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500">
            <video ref={videoRef} playsInline autoPlay className="w-full h-56 object-cover" />
            
            {/* Viewfinder Overlay Frame */}
            <div className="absolute inset-0 border-2 border-dashed border-emerald-400/50 m-4 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-white/60 text-xs font-bold bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-sm">
                {isTamil ? 'கேமராவை கழிவுப் புள்ளி மீது பிடி' : 'Align waste point inside frame'}
              </span>
            </div>

            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-3 px-4">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                {isTamil ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={snapCameraPhoto}
                disabled={isCapturing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-transform flex items-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>{isTamil ? 'புகைப்படம் எடு (Snap Geotag)' : 'Snap Geotag Photo'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Capture Option Buttons */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center space-y-1 shadow-sm transition-all active:scale-95"
            >
              <Camera className="w-5 h-5" />
              <span>{isTamil ? 'நேரடி கேமரா' : 'Open Live Camera'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition-all active:scale-95"
            >
              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isTamil ? 'புகைப்படம் பதிவேற்று' : 'Upload Photo File'}</span>
            </button>

            <button
              type="button"
              onClick={generateDemoPhoto}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold text-xs flex flex-col items-center justify-center space-y-1 border border-slate-200 dark:border-slate-700"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>{isTamil ? 'மாதிரி புவிசார் படம்' : 'Generate Demo Proof'}</span>
            </button>
          </div>
        )}

        {cameraError && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800">
            ⚠️ {cameraError}
          </p>
        )}
      </div>
    </div>
  );
}
