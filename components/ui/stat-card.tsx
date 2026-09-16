'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'emerald',
  className = '',
}: StatCardProps) {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      border: 'border-emerald-200/60 dark:border-emerald-900/40',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      border: 'border-amber-200/60 dark:border-amber-900/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    rose: {
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      border: 'border-rose-200/60 dark:border-rose-900/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    blue: {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      border: 'border-blue-200/60 dark:border-blue-900/40',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    purple: {
      bg: 'bg-purple-50/50 dark:bg-purple-950/20',
      border: 'border-purple-200/60 dark:border-purple-900/40',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      border: 'border-slate-200 dark:border-slate-800',
      iconBg: 'bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-md ${style.bg} ${style.border} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {title}
          </p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  trend.isPositive !== false
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${style.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
