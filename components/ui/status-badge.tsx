'use client';

import React from 'react';
import { 
  PriorityLevel, 
  ReportStatus, 
  StopStatus, 
  VehicleStatus, 
  CollectionPointStatus 
} from '@/types/database';
import { useLanguage } from '@/lib/i18n/context';

interface StatusBadgeProps {
  type: 'priority' | 'report' | 'stop' | 'vehicle' | 'point';
  value: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ type, value, size = 'md', className = '' }: StatusBadgeProps) {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold tracking-wide',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wide',
    lg: 'px-3 py-1.5 text-sm font-semibold tracking-wide',
  };

  const baseStyle = `inline-flex items-center rounded-full border ${sizeClasses[size]} ${className}`;

  if (type === 'priority') {
    const priority = value as PriorityLevel;
    switch (priority) {
      case 'CRITICAL':
        return (
          <span className={`${baseStyle} bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-950 font-bold`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
            ● {t('priorityCritical')}
          </span>
        );
      case 'HIGH':
        return (
          <span className={`${baseStyle} bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-950 font-bold`}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5" />
            ● {t('priorityHigh')}
          </span>
        );
      case 'MEDIUM':
        return (
          <span className={`${baseStyle} bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-950 font-semibold`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            ● {t('priorityMedium')}
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className={`${baseStyle} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-950 font-semibold`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            ● {t('priorityLow')}
          </span>
        );
    }
  }

  if (type === 'report') {
    const status = value as ReportStatus;
    switch (status) {
      case 'Submitted':
        return (
          <span className={`${baseStyle} bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`}>
            {t('statusSubmitted')}
          </span>
        );
      case 'Under Review':
        return (
          <span className={`${baseStyle} bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800`}>
            {t('statusUnderReview')}
          </span>
        );
      case 'Assigned':
        return (
          <span className={`${baseStyle} bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800`}>
            {t('statusAssigned')}
          </span>
        );
      case 'In Progress':
        return (
          <span className={`${baseStyle} bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800`}>
            {t('statusInProgress')}
          </span>
        );
      case 'Collected':
      case 'Resolved':
        return (
          <span className={`${baseStyle} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800`}>
            {t('statusCollected')}
          </span>
        );
      default:
        return (
          <span className={`${baseStyle} bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800`}>
            {value}
          </span>
        );
    }
  }

  if (type === 'stop') {
    const status = value as StopStatus;
    switch (status) {
      case 'arrived':
        return (
          <span className={`${baseStyle} bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800`}>
            {t('driverArrive')}
          </span>
        );
      case 'collected':
        return (
          <span className={`${baseStyle} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800`}>
            {t('statusCollected')}
          </span>
        );
      case 'skipped':
        return (
          <span className={`${baseStyle} bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800`}>
            {t('statusMissed')}
          </span>
        );
      case 'pending':
      default:
        return (
          <span className={`${baseStyle} bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`}>
            {t('statusPending')}
          </span>
        );
    }
  }

  if (type === 'point') {
    const status = value as CollectionPointStatus;
    switch (status) {
      case 'overflowing':
        return (
          <span className={`${baseStyle} bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-ping" />
            {t('statusOverflowing')}
          </span>
        );
      case 'active':
        return (
          <span className={`${baseStyle} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800`}>
            {t('statusActive')}
          </span>
        );
      default:
        return (
          <span className={`${baseStyle} bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800`}>
            {value}
          </span>
        );
    }
  }

  return (
    <span className={`${baseStyle} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700`}>
      {value}
    </span>
  );
}
