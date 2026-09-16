'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { History, CheckCircle2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  route_code: string;
  date: string;
  total_stops: number;
  total_weight_kg: number;
  distance_km: number;
  duration_mins: number;
  status: string;
}

const ROUTE_HISTORY: HistoryItem[] = [
  {
    id: 'h1',
    route_code: 'RT-NARASIPURAM-01',
    date: '2026-09-14',
    total_stops: 6,
    total_weight_kg: 680,
    distance_km: 8.4,
    duration_mins: 45,
    status: 'completed',
  },
  {
    id: 'h2',
    route_code: 'RT-VELLAIMALAIPATTINAM-02',
    date: '2026-09-13',
    total_stops: 5,
    total_weight_kg: 520,
    distance_km: 6.2,
    duration_mins: 35,
    status: 'completed',
  },
  {
    id: 'h3',
    route_code: 'RT-DEVARAYAPURAM-03',
    date: '2026-09-12',
    total_stops: 8,
    total_weight_kg: 890,
    distance_km: 9.8,
    duration_mins: 55,
    status: 'completed',
  },
];

export default function DriverHistoryPage() {
  const columns: Column<HistoryItem>[] = [
    {
      header: 'Route Code',
      accessor: (row) => <span className="font-extrabold text-slate-900 dark:text-white">{row.route_code}</span>,
    },
    {
      header: 'Date',
      accessor: 'date',
    },
    {
      header: 'Stops',
      accessor: (row) => <span className="font-bold text-xs">{row.total_stops} Stops</span>,
    },
    {
      header: 'Collected Weight',
      accessor: (row) => <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.total_weight_kg} kg</span>,
    },
    {
      header: 'Distance & Duration',
      accessor: (row) => (
        <span className="text-xs text-slate-500">
          {row.distance_km} km ({row.duration_mins} mins)
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Route Collection History
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Past completed collection routes and verification records.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={ROUTE_HISTORY}
        searchKey="route_code"
        searchPlaceholder="Search route code..."
      />
    </div>
  );
}
