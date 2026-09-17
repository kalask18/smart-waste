'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GeneratedRouteStop } from '@/lib/route-generator';
import { useLanguage } from '@/lib/i18n/context';

interface RouteMapProps {
  geometryCoordinates?: Array<[number, number]>;
  stops: GeneratedRouteStop[];
  vehicleLat?: number;
  vehicleLng?: number;
  vehicleNumber?: string;
  isFallback?: boolean;
}

export default function RouteMap({
  geometryCoordinates,
  stops,
  vehicleLat = 11.0003,
  vehicleLng = 76.7725,
  vehicleNumber = 'TN-37-EV-2024',
  isFallback = false,
}: RouteMapProps) {
  const { t, tLocation } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      setLeafletLoaded(true);

      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        if ((mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [vehicleLat, vehicleLng],
          zoom: 14,
          scrollWheelZoom: true,
          maxZoom: 22,
        });

        const streetTile = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps',
          maxZoom: 22,
          maxNativeZoom: 20,
        });

        streetTile.addTo(map);
        tileLayerRef.current = streetTile;
        mapInstanceRef.current = map;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, [vehicleLat, vehicleLng]);

  // Handle Tile Layer Switch
  const toggleMapMode = (mode: 'street' | 'satellite') => {
    setMapMode(mode);
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      if (mode === 'satellite') {
        const satTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps',
          maxZoom: 22,
          maxNativeZoom: 20,
        });
        satTile.addTo(map);
        tileLayerRef.current = satTile;
      } else {
        const streetTile = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          attribution: '&copy; Google Maps',
          maxZoom: 22,
          maxNativeZoom: 20,
        });
        streetTile.addTo(map);
        tileLayerRef.current = streetTile;
      }
    });
  };

  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear previous layers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline || layer.options?.icon || (layer as any)._icon) {
          map.removeLayer(layer);
        }
      });

      const bounds = L.latLngBounds([]);

      // Map to detect and offset overlapping markers at identical/very close coordinates
      const coordCountMap = new Map<string, number>();
      const getOffsetCoords = (lat: number, lng: number): [number, number] => {
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        const count = coordCountMap.get(key) || 0;
        coordCountMap.set(key, count + 1);
        if (count === 0) return [lat, lng];
        const angle = count * 2.4;
        const radius = 0.00015 * Math.sqrt(count);
        return [lat + radius * Math.cos(angle), lng + radius * Math.sin(angle)];
      };

      // 1. Vehicle Start Location Marker
      const [vLat, vLng] = getOffsetCoords(vehicleLat, vehicleLng);
      const vehicleIcon = L.divIcon({
        html: `
          <div style="
            background-color: #0f172a;
            color: white;
            border: 3px solid #10b981;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border-radius: 12px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: sans-serif;
          ">
            <span>🚛 START</span>
          </div>
        `,
        className: 'vehicle-start-label-marker',
        iconSize: [110, 28],
        iconAnchor: [55, 14],
      });

      const vehicleMarker = L.marker([vLat, vLng], { icon: vehicleIcon }).addTo(map);
      vehicleMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="font-weight: 800; font-size: 12px; color: #0f172a;">
            Planned Vehicle Start Depot
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Vehicle: ${vehicleNumber} | Narasipuram Depot
          </div>
        </div>
      `);
      bounds.extend([vLat, vLng]);

      // 2. Numbered Stop Markers (1, 2, 3...) matching route timeline
      stops.forEach((stop, idx) => {
        const displayStopNum = idx + 1;

        let colorHex = '#10b981'; // LOW
        if (stop.priority_level === 'CRITICAL') colorHex = '#ef4444';
        else if (stop.priority_level === 'HIGH') colorHex = '#f59e0b';
        else if (stop.priority_level === 'MEDIUM') colorHex = '#3b82f6';

        const stopIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${colorHex};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 13px;
              font-family: sans-serif;
            ">
              ${displayStopNum}
            </div>
          `,
          className: 'route-stop-numbered-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const [sLat, sLng] = getOffsetCoords(stop.latitude, stop.longitude);
        const marker = L.marker([sLat, sLng], { icon: stopIcon }).addTo(map);

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 230px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">
              Stop ${displayStopNum}: ${tLocation(stop.location_name)}
            </div>
            <div style="font-size: 11px; margin-top: 4px;">
              <strong>Priority:</strong> <span style="color:${colorHex}; font-weight:bold;">${stop.priority_score}/100 (${stop.priority_level})</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              <strong>Est. Waste:</strong> ${stop.estimated_weight_kg} kg | <strong>Proximity:</strong> ${stop.distance_from_prev_km || 1.2} km
            </div>
            <div style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.3;">
              <em>${stop.explanation}</em>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        bounds.extend([sLat, sLng]);
      });

      // 3. Render Route Polyline Path
      const polylineCoords = geometryCoordinates && geometryCoordinates.length > 0
        ? geometryCoordinates
        : [
            [vehicleLat, vehicleLng] as [number, number],
            ...stops.map((s) => [s.latitude, s.longitude] as [number, number]),
          ];

      if (polylineCoords.length >= 2) {
        L.polyline(polylineCoords, {
          color: '#10b981',
          weight: 5,
          opacity: 0.9,
          dashArray: isFallback ? '8, 8' : undefined,
        }).addTo(map);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });
  }, [leafletLoaded, geometryCoordinates, stops, vehicleLat, vehicleLng, vehicleNumber, isFallback, tLocation]);

  const [showLegendMobile, setShowLegendMobile] = useState(false);

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen rounded-none isolate' : 'h-[400px] rounded-2xl z-10 isolate'} overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900 transition-all`}>
      
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Controls Toolbar */}
      <div className="absolute top-3 left-12 sm:left-14 z-20 flex items-center space-x-1.5 sm:space-x-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs max-w-[calc(100%-60px)] sm:max-w-none overflow-x-auto no-scrollbar">
        <button
          onClick={() => toggleMapMode('street')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
            mapMode === 'street'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('mapStreet')}
        </button>
        <button
          onClick={() => toggleMapMode('satellite')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-colors whitespace-nowrap ${
            mapMode === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('mapSatellite')}
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="px-2 py-1 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          title="Toggle Fullscreen Map"
        >
          {isFullscreen ? t('mapExitFullscreen') : t('mapFullscreen')}
        </button>
      </div>

      {/* Status Overlay Badge */}
      {isFallback && (
        <div className="hidden sm:block absolute bottom-3 left-3 z-20 bg-amber-500/90 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl border border-amber-400 shadow-md backdrop-blur-sm uppercase tracking-wider pointer-events-none">
          Demo Route — Geographic Distance Fallback
        </div>
      )}

      {!isFallback && (
        <div className="hidden sm:block absolute bottom-3 left-3 z-20 bg-emerald-500/90 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl border border-emerald-400 shadow-md backdrop-blur-sm uppercase tracking-wider pointer-events-none">
          OSRM Road Driving Route Active
        </div>
      )}

      {/* Route Map Legend — Desktop View */}
      <div className="hidden md:block absolute top-3 right-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] space-y-1 font-sans">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1">
          {t('navTodayRoute')} {t('mapLegendKey')}
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">🚛 {t('driverStartDepot')}</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityCritical')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityHigh')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityLow')}</span>
        </div>
      </div>

      {/* Route Map Legend — Mobile View Collapsible */}
      <div className="md:hidden absolute bottom-3 right-3 z-20 flex flex-col items-end">
        {showLegendMobile && (
          <div className="mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-[11px] space-y-1 font-sans animate-in fade-in max-w-[210px]">
            <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1 border-b border-slate-200 dark:border-slate-800 pb-1">
              {t('mapLegendKey')}
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">🚛 {t('driverStartDepot')}</span>
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="w-3 h-3 rounded-full bg-red-500 border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityCritical')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityHigh')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityLow')}</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowLegendMobile(!showLegendMobile)}
          className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs shadow-lg flex items-center space-x-1 active:scale-95"
        >
          <span>📍</span>
          <span>{t('mapLegendKey')}</span>
        </button>
      </div>

    </div>
  );
}
