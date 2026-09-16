'use client';

import React from 'react';
import { Zap, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PriorityLevel } from '@/types/database';
import { useLanguage } from '@/lib/i18n/context';

export interface SmartWastePulseProps {
  fillPercent: number;
  locationName: string;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  recommendedAction?: string;
  onActionClick?: () => void;
  className?: string;
}

export function SmartWastePulse({
  fillPercent,
  locationName,
  priorityLevel,
  priorityScore,
  recommendedAction,
  onActionClick,
  className = '',
}: SmartWastePulseProps) {
  const { t, tLocation } = useLanguage();

  // Determine Risk Level based on fill & score
  const isCritical = priorityLevel === 'CRITICAL' || fillPercent >= 85;
  const isHigh = priorityLevel === 'HIGH' || (fillPercent >= 70 && fillPercent < 85);
  const isMedium = priorityLevel === 'MEDIUM' || (fillPercent >= 45 && fillPercent < 70);

  const riskLabel = isCritical
    ? t('pulseRiskCritical')
    : isHigh
    ? t('pulseRiskHigh')
    : isMedium
    ? t('pulseRiskMedium')
    : t('pulseRiskLow');

  const priorityText = isCritical
    ? t('priorityCritical')
    : isHigh
    ? t('priorityHigh')
    : isMedium
    ? t('priorityMedium')
    : t('priorityLow');

  const levelColor = isCritical
    ? 'text-red-400 bg-red-500/20 border-red-500/40'
    : isHigh
    ? 'text-amber-400 bg-amber-500/20 border-amber-500/40'
    : isMedium
    ? 'text-blue-400 bg-blue-500/20 border-blue-500/40'
    : 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';

  const actionText = recommendedAction || t('pulseDefaultAction');

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-xl shadow-slate-950/20 ${className}`}>
      
      {/* Background eco-tech glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-400">
              {t('pulseTitle')}
            </span>
            <p className="text-xs font-bold text-slate-200 line-clamp-1">
              {tLocation(locationName)}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
          {t('pulseRealtimeTelemetry')}
        </span>
      </div>

      {/* 4-Step Pipeline Flow: Waste Level -> Risk -> Priority -> Action */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        
        {/* Step 1: Waste Level */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('pulseStep1Title')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-white font-mono">
              {fillPercent}%
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{t('pulseStep1Sub')}</p>
          </div>
        </div>

        {/* Step 2: Risk */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('pulseStep2Title')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-100 line-clamp-1">
              {riskLabel}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{t('pulseStep2Sub')}</p>
          </div>
        </div>

        {/* Step 3: Priority */}
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('pulseStep3Title')}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${levelColor}`}>
              {priorityScore}/100
            </span>
          </div>
          <div>
            <div className={`text-base font-black tracking-tight ${isCritical ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-emerald-400'}`}>
              {priorityText}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{t('pulseStep3Sub')}</p>
          </div>
        </div>

        {/* Step 4: Action */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{t('pulseStep4Title')}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <button
              onClick={onActionClick}
              className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all flex items-center justify-center space-x-1"
            >
              <span>{actionText}</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
