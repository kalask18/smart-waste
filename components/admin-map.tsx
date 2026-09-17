'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CollectionPoint, WasteReport, Vehicle } from '@/types/database';
import { calculateSmartPriority } from '@/lib/priority-engine';

import { useLanguage } from '@/lib/i18n/context';

interface AdminMapProps {
  collectionPoints: CollectionPoint[];
  wasteReports: WasteReport[];
  vehicles: Vehicle[];
}

export default function AdminMap({ collectionPoints, wasteReports, vehicles }: AdminMapProps) {
  const { t, isTamil, tLocation } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAboutMap, setShowAboutMap] = useState(false);

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

        // Center on Narasipuram, Coimbatore, Tamil Nadu
        const map = L.map(mapContainerRef.current, {
          center: [11.0003, 76.7725],
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
  }, []);

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

  // Update Markers when props or Leaflet instance change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer.options?.icon || (layer as any)._icon) {
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

      // 1. Render Collection Points with Priority-Colored Custom Markers
      collectionPoints.forEach((cp, idx) => {
        if (!cp.latitude || !cp.longitude) return;

        const displayNum = idx + 1;

        const pRes = calculateSmartPriority({
          fill_percentage: cp.current_fill_percent,
          current_weight_kg: cp.current_weight_kg,
          capacity_kg: cp.capacity || 1000,
          location_sensitivity: (cp as any).sensitivity || 'residential',
          last_collected_at: cp.last_collected_at,
        });

        // Priority colors
        let colorHex = '#10b981'; // LOW = Green
        if (pRes.level === 'CRITICAL') {
          colorHex = '#ef4444'; // Red
        } else if (pRes.level === 'HIGH') {
          colorHex = '#f59e0b'; // Amber
        } else if (pRes.level === 'MEDIUM') {
          colorHex = '#3b82f6'; // Blue
        }

        const isDemoPoint = Boolean((cp as any).is_demo);
        const isOverdue = Boolean((cp as any).is_overdue || cp.status === ('overdue' as any));
        const isSurgePoint = isDemoPoint && cp.current_fill_percent >= 85;

        const iconHtml = `
          <div style="position: relative;">
            ${
              isOverdue
                ? `<div style="
                    position: absolute;
                    top: -18px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #ef4444;
                    color: white;
                    font-size: 8px;
                    font-weight: 900;
                    padding: 1px 4px;
                    border-radius: 4px;
                    white-space: nowrap;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    border: 1px solid white;
                  ">⚠ OVERDUE</div>`
                : ''
            }
            <div style="
              background-color: ${isOverdue ? '#dc2626' : colorHex};
              width: ${isSurgePoint ? '36px' : '32px'};
              height: ${isSurgePoint ? '36px' : '32px'};
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: ${isSurgePoint || isOverdue ? '0 0 15px #ef4444, 0 4px 10px rgba(0,0,0,0.5)' : '0 4px 10px rgba(0,0,0,0.35)'};
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: ${isSurgePoint ? '13px' : '12px'};
              font-family: sans-serif;
            ">
              ${displayNum}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: isSurgePoint || isOverdue ? 'custom-bin-marker surge-pulsing-marker' : 'custom-bin-marker',
          iconSize: isSurgePoint ? [36, 36] : [32, 32],
          iconAnchor: isSurgePoint ? [18, 18] : [16, 16],
        });

        const [cpLat, cpLng] = getOffsetCoords(cp.latitude, cp.longitude);
        const marker = L.marker([cpLat, cpLng], { icon: customIcon }).addTo(map);

        const lastColText = cp.last_collected_at
          ? new Date(cp.last_collected_at).toLocaleString()
          : 'Never / Pending';

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 240px;">
            ${isOverdue ? '<div style="font-weight: 900; font-size: 9px; color: #ef4444; text-transform: uppercase; background: #fef2f2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">⚠ OVERDUE COLLECTION</div>' : ''}
            ${isDemoPoint && !isOverdue ? '<div style="font-weight: 900; font-size: 9px; color: #a855f7; text-transform: uppercase; background: #f3e8ff; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">DEMO SURGE NODE</div>' : ''}
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${cp.name}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">
              Area: ${(cp as any).ward || 'Narasipuram Panchayat'}
            </div>
            
            <div style="background-color: #f8fafc; padding: 6px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px; margin-bottom: 8px;">
              <div><strong>Fill:</strong> ${cp.current_fill_percent}%</div>
              <div><strong>Weight:</strong> ${cp.current_weight_kg} kg</div>
              <div><strong>Priority:</strong> <span style="color:${isOverdue ? '#ef4444' : colorHex}; font-weight:bold;">${pRes.level} — ${pRes.score}/100</span></div>
              ${isOverdue ? '<div style="color: #ef4444; font-weight: bold; margin-top: 4px;">Collection: ⚠ OVERDUE</div>' : ''}
              <div style="font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.3;">
                <em>${pRes.explanation}</em>
              </div>
            </div>

            <div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">
              <strong>Last Collection:</strong> ${lastColText}
            </div>
            <div style="font-size: 10px; color: #64748b;">
              <strong>Status:</strong> <span style="text-transform: capitalize; font-weight: bold; color: ${isOverdue ? '#ef4444' : '#0284c7'};">${cp.status}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        bounds.extend([cpLat, cpLng]);
      });

      // 2. Citizen Waste Reports (Vibrant Pulsing Pin with High Z-Index)
      wasteReports.forEach((rep) => {
        if (!rep.latitude || !rep.longitude) return;

        const isCritical = rep.severity === 'CRITICAL' || rep.severity === 'HIGH';
        const badgeColor = isCritical ? '#dc2626' : '#9333ea';

        const iconHtml = `
          <div style="position: relative; z-index: 1000;">
            <div style="
              position: absolute;
              top: -16px;
              left: 50%;
              transform: translateX(-50%);
              background-color: ${badgeColor};
              color: white;
              font-size: 8px;
              font-weight: 900;
              padding: 1px 4px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              border: 1px solid white;
            ">
              📢 ${rep.report_code || 'REPORT'}
            </div>
            <div style="
              background: linear-gradient(135deg, ${badgeColor}, #4f46e5);
              width: 30px;
              height: 30px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 12px ${badgeColor}, 0 4px 10px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 13px;
            ">
              📍
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-report-marker surge-pulsing-marker',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const [rLat, rLng] = getOffsetCoords(rep.latitude, rep.longitude);
        const marker = L.marker([rLat, rLng], { icon: customIcon, zIndexOffset: 1000 }).addTo(map);

        const photoUrl = rep.photo_url || rep.image_url;

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 240px;">
            <div style="display: flex; items-center; justify-between; margin-bottom: 4px;">
              <span style="font-weight: 900; font-size: 9px; color: white; background: ${badgeColor}; padding: 2px 6px; border-radius: 4px;">
                ${rep.report_code || 'CITIZEN REPORT'}
              </span>
              <span style="font-size: 10px; font-weight: bold; color: #64748b;">
                ${rep.status || 'Submitted'}
              </span>
            </div>
            
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${rep.location_name || 'Narasipuram Reported Incident'}
            </div>

            ${photoUrl ? `<img src="${photoUrl}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin: 4px 0; border: 1px solid #e2e8f0;" alt="Report evidence" />` : ''}

            <div style="font-size: 11px; color: #334155; margin-bottom: 6px; line-height: 1.3;">
              ${rep.description || 'Reported waste accumulation.'}
            </div>

            <div style="background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10px; color: #475569;">
              <div><strong>Category:</strong> <span style="text-transform: capitalize;">${(rep.category || 'general').replace('_', ' ')}</span></div>
              <div><strong>Severity:</strong> <span style="font-weight: bold; color: ${badgeColor};">${rep.severity || 'MEDIUM'} (${rep.priority_score || 75}/100)</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        bounds.extend([rLat, rLng]);
      });

      // 3. Vehicles
      vehicles.forEach((veh) => {
        if (!veh.current_latitude || !veh.current_longitude) return;

        const iconHtml = `
          <div style="
            background-color: #0284c7;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
          ">
            🚛
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-vehicle-marker',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const [vLat, vLng] = getOffsetCoords(veh.current_latitude, veh.current_longitude);
        const marker = L.marker([vLat, vLng], { icon: customIcon }).addTo(map);

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a;">
              Vehicle: ${veh.vehicle_number}
            </div>
            <div style="font-size: 10px; color: #64748b;">
              Type: ${veh.vehicle_type} | Status: ${veh.status}
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
        bounds.extend([vLat, vLng]);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });
  }, [leafletLoaded, collectionPoints, wasteReports, vehicles]);

  const [showLegendMobile, setShowLegendMobile] = useState(false);

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-[9999] h-screen rounded-none isolate' : 'h-[400px] rounded-3xl z-10 isolate'} overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-900 transition-all`}>
      
      {/* Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Toolbar */}
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
        <button
          onClick={() => setShowAboutMap(true)}
          className="px-2 py-1 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors whitespace-nowrap"
          title="About Geography"
        >
          {t('mapAbout')}
        </button>
      </div>

      {/* Map Legend — Desktop View */}
      <div className="hidden md:block absolute top-3 right-3 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-[11px] space-y-1.5 font-sans">
        <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1 flex items-center justify-between gap-2">
          <span>{tLocation('Narasipuram / நரசீபுரம்')} {t('mapLegendKey')}</span>
          <span className="text-[9px] text-emerald-600 font-mono bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
            {mapMode === 'street' ? 'OpenStreetMap' : 'Esri World Imagery'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityCritical')} (76-100)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityHigh')} (56-75)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityMedium')} (31-55)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityLow')} (0-30)</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs">📍</span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">{t('mapLegendCitizenReport')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs">🚛</span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">{t('mapLegendActiveVehicle')}</span>
        </div>
      </div>

      {/* Map Legend — Mobile View Collapsible */}
      <div className="md:hidden absolute bottom-3 right-3 z-20 flex flex-col items-end">
        {showLegendMobile && (
          <div className="mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-[11px] space-y-1.5 font-sans animate-in fade-in max-w-[220px]">
            <div className="font-extrabold text-slate-900 dark:text-white text-xs mb-1 border-b border-slate-200 dark:border-slate-800 pb-1">
              {t('mapLegendKey')}
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityCritical')} (76-100)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityHigh')} (56-75)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityMedium')} (31-55)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t('priorityLow')} (0-30)</span>
            </div>
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs">📍</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">{t('mapLegendCitizenReport')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs">🚛</span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">{t('mapLegendActiveVehicle')}</span>
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

      {/* About Map Info Modal */}
      {showAboutMap && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>{t('mapAboutTitle')}</span>
              </h3>
              <button
                onClick={() => setShowAboutMap(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                <strong>Central Region:</strong> {t('mapCentralRegion')}
              </p>
              <p>
                <strong>Covered Panchayats:</strong> {t('mapCoveredPanchayats')}
              </p>
              <p className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300">
                100% Free Open-Source Mapping powered by Leaflet, OpenStreetMap, and Esri World Imagery Satellite Tiles.
              </p>
            </div>
            <button
              onClick={() => setShowAboutMap(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {t('actionClose')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
