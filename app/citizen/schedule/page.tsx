'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CollectionPoint } from '@/types/database';
import { Calendar, Clock, MapPin, CheckCircle2, RefreshCw, Info } from 'lucide-react';

export default function CitizenSchedulePage() {
  const [bins, setBins] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBins = async () => {
      try {
        const { data } = await supabase.from('collection_points').select('*').limit(10);
        if (data) setBins(data as CollectionPoint[]);
      } catch (err) {
        console.error('Error fetching bins:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBins();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          <span>Waste Collection Schedule & Information</span>
        </h1>
        <p className="text-xs text-slate-500">
          Panchayat shift timings, nearby bin status, and waste segregation guidelines.
        </p>
      </div>

      {/* Ward Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Morning Shift</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white">7:00 AM - 10:30 AM</p>
          <p className="text-xs text-slate-500">Door-to-door organic waste collection across Wards 1, 2 & 3.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">Afternoon Shift</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white">2:00 PM - 5:00 PM</p>
          <p className="text-xs text-slate-500">Commercial market sweep & public smart bin emptying.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-600 uppercase tracking-wider">Special Pickup</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white">Demand Driven</p>
          <p className="text-xs text-slate-500">Real-time priority dispatch triggered by citizen overflowing waste reports.</p>
        </div>

      </div>

      {/* Nearby Bins Status */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Live Collection Points Status</span>
        </h2>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading collection points...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bins.map((bin) => (
              <div
                key={bin.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{bin.name}</p>
                  <p className="text-[10px] text-slate-400">Capacity: {bin.capacity}L</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${bin.current_fill_percent >= 80 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {bin.current_fill_percent}% Full
                  </span>
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">
                    {bin.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waste Segregation Guidelines */}
      <div className="bg-emerald-950 text-white p-6 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-emerald-800 pb-3">
          <Info className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold">Waste Segregation Guidelines</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-800 space-y-1.5">
            <span className="font-bold text-emerald-300">🟢 Green Bin (Organic)</span>
            <p className="text-emerald-100 text-[11px]">Food scraps, vegetable peels, garden leaves, tea bags, leftover food.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-800 space-y-1.5">
            <span className="font-bold text-blue-300">🔵 Blue Bin (Recyclable)</span>
            <p className="text-emerald-100 text-[11px]">Plastic bottles, cardboard packaging, paper, glass jars, aluminum cans.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-800 space-y-1.5">
            <span className="font-bold text-red-300">🔴 Red Bin (Hazardous)</span>
            <p className="text-emerald-100 text-[11px]">Expired medicines, batteries, electronics, syringes, chemical containers.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
