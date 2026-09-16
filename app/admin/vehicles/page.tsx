'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Truck, Shield } from 'lucide-react';
import { VehicleStatus } from '@/types/database';

interface VehicleItem {
  id: string;
  vehicle_number: string;
  type: string;
  capacity_kg: number;
  driver_name: string;
  status: VehicleStatus;
  current_location: string;
  fuel_battery: string;
}

const VEHICLES: VehicleItem[] = [
  {
    id: 'v1',
    vehicle_number: 'TN-37-EV-1020',
    type: 'Electric Tipper E-Rickshaw',
    capacity_kg: 500,
    driver_name: 'Ramesh Patel',
    status: 'on_route',
    current_location: 'Narasipuram Main Road',
    fuel_battery: '84% Battery',
  },
  {
    id: 'v2',
    vehicle_number: 'TN-37-G-4050',
    type: 'Hydraulic Compactor Truck',
    capacity_kg: 3500,
    driver_name: 'Suresh K.',
    status: 'on_route',
    current_location: 'Vellaimalaipattinam Area',
    fuel_battery: '65% Diesel',
  },
  {
    id: 'v3',
    vehicle_number: 'TN-37-M-3001',
    type: 'Mini Tipper Vehicle',
    capacity_kg: 1200,
    driver_name: 'Manjunath P.',
    status: 'available',
    current_location: 'Narasipuram Depot Yard',
    fuel_battery: '92% Battery',
  },
  {
    id: 'v4',
    vehicle_number: 'TN-37-E-8821',
    type: 'Electric Tipper E-Rickshaw',
    capacity_kg: 500,
    driver_name: 'Unassigned',
    status: 'maintenance',
    current_location: 'Narasipuram Workshop',
    fuel_battery: '40% Battery',
  },
];

export default function AdminVehiclesPage() {
  const columns: Column<VehicleItem>[] = [
    {
      header: 'Vehicle Number',
      accessor: (row) => <span className="font-extrabold text-slate-900 dark:text-white">{row.vehicle_number}</span>,
    },
    {
      header: 'Vehicle Type',
      accessor: 'type',
    },
    {
      header: 'Assigned Driver',
      accessor: (row) => (
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
          {row.driver_name}
        </span>
      ),
    },
    {
      header: 'Payload Capacity',
      accessor: (row) => <span className="font-bold text-xs">{row.capacity_kg} kg</span>,
    },
    {
      header: 'Location & Power',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{row.current_location}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{row.fuel_battery}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge type="vehicle" value={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Municipal Collection Fleet Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Track electric tippers, compactors, battery health, driver assignments, and vehicle statuses.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={VEHICLES}
        searchKey="vehicle_number"
        searchPlaceholder="Search vehicle number..."
      />
    </div>
  );
}
