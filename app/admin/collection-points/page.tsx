'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { calculateSmartPriority } from '@/lib/priority-engine';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import SensorSimulator from '@/components/sensor-simulator';
import { CollectionPointStatus } from '@/types/database';
import { MapPin, Signal, Radio, RefreshCw, Cpu, Sparkles } from 'lucide-react';

interface AdminCollectionPoint {
  id: string;
  bin_code?: string;
  name: string;
  ward?: string;
  capacity_l?: number;
  current_fill_percent: number;
  current_weight_kg: number;
  status: CollectionPointStatus;
  sensitivity?: string;
  last_ping?: string;
}

const INITIAL_POINTS: AdminCollectionPoint[] = [
  {
    id: 'cp1',
    bin_code: 'CP-101',
    name: 'Narasipuram Main Road',
    ward: 'Narasipuram Zone',
    capacity_l: 1000,
    current_fill_percent: 85,
    current_weight_kg: 340,
    status: 'overflowing',
    sensitivity: 'commercial',
    last_ping: 'Just now',
  },
  {
    id: 'cp2',
    bin_code: 'CP-102',
    name: 'Vellaimalaipattinam Residential Area',
    ward: 'Vellaimalaipattinam Zone',
    capacity_l: 1200,
    current_fill_percent: 90,
    current_weight_kg: 410,
    status: 'overflowing',
    sensitivity: 'residential',
    last_ping: '2 mins ago',
  },
  {
    id: 'cp3',
    bin_code: 'CP-103',
    name: 'Ikkaraibooluvampatti Community Area',
    ward: 'Ikkaraibooluvampatti Zone',
    capacity_l: 800,
    current_fill_percent: 65,
    current_weight_kg: 210,
    status: 'active',
    sensitivity: 'community',
    last_ping: '10 mins ago',
  },
  {
    id: 'cp4',
    bin_code: 'CP-104',
    name: 'Devarayapuram Main Road',
    ward: 'Devarayapuram Zone',
    capacity_l: 1500,
    current_fill_percent: 95,
    current_weight_kg: 520,
    status: 'overflowing',
    sensitivity: 'commercial',
    last_ping: '1 min ago',
  },
  {
    id: 'cp5',
    bin_code: 'CP-105',
    name: 'Thennamanallur Residential Area',
    ward: 'Thennamanallur Zone',
    capacity_l: 600,
    current_fill_percent: 30,
    current_weight_kg: 85,
    status: 'active',
    sensitivity: 'residential',
    last_ping: '1 hour ago',
  },
];

export default function AdminCollectionPointsPage() {
  const [points, setPoints] = useState<AdminCollectionPoint[]>(INITIAL_POINTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(true);

  const fetchCollectionPoints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('collection_points')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        const formatted: AdminCollectionPoint[] = data.map((item: any) => ({
          id: item.id,
          bin_code: item.bin_code || `CP-${item.id.slice(0, 4).toUpperCase()}`,
          name: item.name,
          ward: item.ward || 'Ward Central',
          capacity_l: item.capacity || 1000,
          current_fill_percent: item.current_fill_percent ?? item.current_fill ?? 50,
          current_weight_kg: item.current_weight_kg ?? item.weight_kg ?? 100,
          status: (item.status as CollectionPointStatus) || (item.current_fill_percent >= 85 ? 'overflowing' : 'active'),
          sensitivity: item.sensitivity || 'residential',
          last_ping: 'Just now',
        }));

        const dbIds = new Set(formatted.map((p) => p.id));
        const filteredInitial = INITIAL_POINTS.filter((p) => !dbIds.has(p.id));
        setPoints([...formatted, ...filteredInitial]);
      } else {
        setPoints(INITIAL_POINTS);
      }
    } catch (err) {
      console.error('Error fetching collection points:', err);
      setPoints(INITIAL_POINTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionPoints();

    const channelId = `admin_cp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collection_points' },
        (payload) => {
          setIsRealtimeActive(true);
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setPoints((prev) =>
              prev.map((p) =>
                p.id === updated.id
                  ? {
                      ...p,
                      current_fill_percent: updated.current_fill_percent ?? p.current_fill_percent,
                      current_weight_kg: updated.current_weight_kg ?? p.current_weight_kg,
                      status: updated.status || (updated.current_fill_percent >= 85 ? 'overflowing' : 'active'),
                      last_ping: 'Just now',
                    }
                  : p
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          setIsRealtimeActive(true);
          const reading = payload.new as any;
          setPoints((prev) =>
            prev.map((p) =>
              p.id === reading.collection_point_id
                ? {
                    ...p,
                    current_fill_percent: reading.fill_percent,
                    current_weight_kg: reading.weight_kg,
                    status: reading.fill_percent >= 85 ? 'overflowing' : 'active',
                    last_ping: 'Just now',
                  }
                : p
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const columns: Column<AdminCollectionPoint>[] = [
    {
      header: 'Bin Code',
      accessor: (row) => (
        <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
          {row.bin_code || `CP-${row.id.slice(0, 4).toUpperCase()}`}
        </span>
      ),
    },
    {
      header: 'Collection Point Name',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-xs">{row.name}</p>
          <p className="text-[10px] text-slate-400">{row.ward || 'General Zone'}</p>
        </div>
      ),
    },
    {
      header: 'Priority Engine Score',
      accessor: (row) => {
        const pRes = calculateSmartPriority({
          fill_percentage: row.current_fill_percent,
          current_weight_kg: row.current_weight_kg,
          capacity_kg: row.capacity_l || 1000,
          location_sensitivity: row.sensitivity || 'residential',
        });
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <StatusBadge type="priority" value={pRes.level} size="sm" />
              <span className="font-black text-xs font-mono">({pRes.score}/100)</span>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs line-clamp-1">
              {pRes.explanation}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Fill % & Weight Telemetry',
      accessor: (row) => {
        const fill = row.current_fill_percent;
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                <div
                  className={`h-full transition-all duration-500 ${
                    fill >= 85 ? 'bg-rose-500' : fill >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                />
              </div>
              <span className="font-black text-xs font-mono">{fill}%</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {row.current_weight_kg} kg payload / {row.capacity_l || 1000}L bin
            </p>
          </div>
        );
      },
    },
    {
      header: 'Sensitivity',
      accessor: (row) => (
        <span className="capitalize text-xs font-semibold text-slate-700 dark:text-slate-300">
          {(row.sensitivity || 'residential').replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge type="point" value={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Collection Points & Smart Bins Directory
            </h1>
            {isRealtimeActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-500" /> Realtime Telemetry
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor IoT sensor telemetry, Priority Engine scores (40% fill, 25% time, 20% complaints, 15% location), and explainable reasoning.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-3.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center space-x-1.5"
          >
            <Cpu className="w-4 h-4" />
            <span>{showSimulator ? 'Hide IoT Simulator' : 'Show IoT Simulator'}</span>
          </button>

          <button
            onClick={fetchCollectionPoints}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* IoT Sensor Simulator Component (Clearly Labeled DEMO/SIMULATED) */}
      {showSimulator && (
        <SensorSimulator
          collectionPoints={points.map((p) => ({
            id: p.id,
            name: p.name,
            bin_code: p.bin_code,
          }))}
          onPingSuccess={fetchCollectionPoints}
        />
      )}

      {/* Collection Points Table */}
      <DataTable
        columns={columns}
        data={points}
        searchKey="name"
        searchPlaceholder="Search collection points by name..."
      />

    </div>
  );
}
