'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ListOrdered, CheckCircle2, MapPin } from 'lucide-react';

interface TaskItem {
  id: string;
  task_code: string;
  location: string;
  category: string;
  fill_percentage: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'arrived' | 'collected';
  scheduled_time: string;
}

const TASKS: TaskItem[] = [
  {
    id: 't1',
    task_code: 'TSK-101',
    location: 'Narasipuram Main Road Bins',
    category: 'overflowing_bin',
    fill_percentage: 95,
    priority: 'CRITICAL',
    status: 'arrived',
    scheduled_time: '09:15 AM',
  },
  {
    id: 't2',
    task_code: 'TSK-102',
    location: 'Vellaimalaipattinam Residential Bin',
    category: 'hazardous',
    fill_percentage: 88,
    priority: 'CRITICAL',
    status: 'pending',
    scheduled_time: '09:45 AM',
  },
  {
    id: 't3',
    task_code: 'TSK-103',
    location: 'Ikkaraibooluvampatti Community Area',
    category: 'organic',
    fill_percentage: 72,
    priority: 'HIGH',
    status: 'pending',
    scheduled_time: '10:30 AM',
  },
  {
    id: 't4',
    task_code: 'TSK-104',
    location: 'Devarayapuram Main Road',
    category: 'general',
    fill_percentage: 60,
    priority: 'MEDIUM',
    status: 'pending',
    scheduled_time: '11:15 AM',
  },
  {
    id: 't5',
    task_code: 'TSK-105',
    location: 'Thennamanallur Residential Area Bins',
    category: 'recyclable',
    fill_percentage: 40,
    priority: 'LOW',
    status: 'collected',
    scheduled_time: '08:30 AM',
  },
];

export default function DriverTasksPage() {
  const columns: Column<TaskItem>[] = [
    {
      header: 'Task Code',
      accessor: (row) => <span className="font-extrabold text-slate-900 dark:text-white">{row.task_code}</span>,
    },
    {
      header: 'Location',
      accessor: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-xs">{row.location}</p>
          <p className="text-[10px] text-slate-400 capitalize">Category: {row.category.replace('_', ' ')}</p>
        </div>
      ),
    },
    {
      header: 'Fill Level',
      accessor: (row) => (
        <span className="font-bold text-xs">
          {row.fill_percentage}%
        </span>
      ),
    },
    {
      header: 'Priority',
      accessor: (row) => <StatusBadge type="priority" value={row.priority} size="sm" />,
    },
    {
      header: 'Scheduled Time',
      accessor: 'scheduled_time',
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge type="stop" value={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Assigned Collection Tasks
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          List of collection tasks assigned to your shift today.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={TASKS}
        searchKey="location"
        searchPlaceholder="Search task location..."
      />
    </div>
  );
}
