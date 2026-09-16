'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AIDemandPrediction } from '@/lib/ai-demand-forecast';
import { useLanguage } from '@/lib/i18n/context';
import { BrainCircuit, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AIDemandForecastCardProps {
  predictions: AIDemandPrediction[];
  onRunForecast?: () => void;
  isLoading?: boolean;
}

export function AIDemandForecastCard({
  predictions,
  onRunForecast,
  isLoading = false,
}: AIDemandForecastCardProps) {
  const { t, tLocation } = useLanguage();
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Just now');
  const [justUpdated, setJustUpdated] = useState<boolean>(false);

  const handleRun = () => {
    if (onRunForecast) {
      onRunForecast();
      setJustUpdated(true);
      setLastUpdatedText('Just now');
      setTimeout(() => setJustUpdated(false), 3000);
    }
  };

  const topRiskPoints = predictions.slice(0, 5);

  return (
    <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-slate-900/60 p-6 shadow-xl space-y-5 backdrop-blur-sm">
      
      {/* Top Header & Disclosures */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-200/30 dark:border-indigo-800/40 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase tracking-wider flex items-center gap-1">
              <BrainCircuit className="w-3 h-3 text-indigo-400" />
              AI-ASSISTED PROTOTYPE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Demo / Simulated Data
            </span>
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-500" />
            {t('aiForecastTitle')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            {t('aiForecastSub')}
          </p>
        </div>

        {/* Run AI Forecast Action Button */}
        <div className="flex items-center space-x-3 shrink-0">
          {justUpdated && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Forecast updated</span>
            </span>
          )}

          <button
            onClick={handleRun}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? t('aiPredicting') : t('aiRunForecast')}</span>
          </button>
        </div>
      </div>

      {/* Top At-Risk Collection Points List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>{t('aiHotspotsDetected')}</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-500">
            Updated {lastUpdatedText}
          </span>
        </div>

        {topRiskPoints.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-100/50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-800">
            No waste predictions available. Click <strong>"{t('aiRunForecast')}"</strong> to analyze telemetry.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {topRiskPoints.map((item, idx) => (
              <div
                key={item.point_id || idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-3 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      Rank #{idx + 1}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.level === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                          : item.level === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      AI Risk: {item.level === 'CRITICAL' ? t('priorityCritical') : item.level === 'HIGH' ? t('priorityHigh') : t('priorityMedium')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1">
                      {tLocation(item.point_name)}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {tLocation(item.area_name)}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Fill</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{item.current_fill_percent}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Risk Score</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400">{item.riskScore} / 100</span>
                    </div>
                  </div>

                  {/* Why Reasoning */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Why High Risk?</span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Actionable Recommendation */}
                  <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 font-semibold">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black block uppercase">{t('aiRecommendedAction')}:</span>
                    {item.recommendedAction}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Link
                    href="/admin/routes"
                    className="inline-flex items-center space-x-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>{t('actionViewDetails')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
