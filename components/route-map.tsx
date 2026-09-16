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
          scrollWheelZoom: false,
        });

        const streetTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
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
        const satTile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS',
          maxZoom: 19,
        });
        satTile.addTo(map);
        tileLayerRef.current = satTile;
      } else {
        const streetTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
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
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      const bounds = L.latLngBounds([]);

      // 1. Vehicle Start Location Marker
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

      const vehicleMarker = L.marker([vehicleLat, vehicleLng], { icon: vehicleIcon }).addTo(map);
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
      bounds.extend([vehicleLat, vehicleLng]);

      // 2. Numbered Stop Markers (1, 2, 3...) matching route timeline
      stops.forEach((stop) => {
        let colorHex = '#10b981'; // LOW
        if (stop.priority_level === 'CRITICAL') colorHex = '#ef4444';
        else if (stop.priority_level === 'HIGH') colorHex = '#f59e0b';
        else if (stop.priority_level === 'MEDIUM') colorHex = '#3b82f6';

        const stopIcon = L.divIcon({
          html: `
            <div style="
              background-color: ${colorHex};
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 13px;
              font-family: sans-serif;
            ">
              ${stop.stop_number}
            </div>
          `,
          className: 'route-stop-numbered-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 230px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">
              Stop ${stop.stop_number}: ${tLocation(stop.location_name)}
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
        bounds.extend([stop.latitude, stop.longitude]);
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

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none' : 'h-[400px] rounded-2xl'} overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-900 transition-all`}>
      
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Controls Toolbar */}
      <div className="absolute top-3 left-14 z-[400] flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs">
        <button
          onClick={() => toggleMapMode('street')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-colors ${
            mapMode === 'street'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('mapStreet')}
        </button>
        <button
          onClick={() => toggleMapMode('satellite')}
          className={`px-2.5 py-1 rounded-xl font-bold transition-colors ${
            mapMode === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {t('mapSatellite')}
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="px-2 py-1 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Fullscreen Map"
        >
          {isFullscreen ? t('mapExitFullscreen') : t('mapFullscreen')}
        </button>
      </div>

      {/* Status Overlay Badge */}
      {isFallback && (
        <div className="absolute bottom-3 left-3 z-[400] bg-amber-500/90 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl border border-amber-400 shadow-md backdrop-blur-sm uppercase tracking-wider pointer-events-none">
          Demo Route — Geographic Distance Fallback
        </div>
      )}

      {!isFallback && (
        <div className="absolute bottom-3 left-3 z-[400] bg-emerald-500/90 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-xl border border-emerald-400 shadow-md backdrop-blur-sm uppercase tracking-wider pointer-events-none">
          OSRM Road Driving Route Active
        </div>
      )}

      {/* Route Map Legend */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] space-y-1 font-sans">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1">
          {t('navTodayRoute')} {t('mapLegendKey')}
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">🚛 {t('driverStartDepot')}</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityCritical')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityHigh')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityLow')}</span>
        </div>
      </div>

    </div>
  );
}
