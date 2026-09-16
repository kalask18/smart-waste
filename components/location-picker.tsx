'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  locationName?: string;
  onLocationNameChange?: (name: string) => void;
}

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  locationName,
  onLocationNameChange,
}: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        setIsLocating(false);
      },
      (error) => {
        setGeoError(`Location error: ${error.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Location & GPS Coordinates</span>
        </label>
        
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-200 transition-colors disabled:opacity-50"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>{isLocating ? 'Detecting GPS...' : 'Use My GPS Location'}</span>
        </button>
      </div>

      {geoError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          {geoError}
        </p>
      )}

      {onLocationNameChange && (
        <div className="space-y-1">
          <input
            type="text"
            value={locationName || ''}
            onChange={(e) => onLocationNameChange(e.target.value)}
            placeholder="Landmark / Spot name (e.g. Near Narasipuram Main Road)"
            required
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}

      {/* Coordinate Preview Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Latitude
          </span>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0, longitude)}
            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
          />
        </div>

        <div>
          <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Longitude
          </span>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => onChange(latitude, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
          />
        </div>
      </div>
    </div>
  );
}
