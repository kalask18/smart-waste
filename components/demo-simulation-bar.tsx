'use client';

import React, { useState, useEffect } from 'react';
import {
  getDemoState,
  simulateWasteSurge,
  resetDemo,
  subscribeDemoStateChange,
  DemoSimulationState,
  DemoStage,
} from '@/lib/demo-simulation-service';
import { useLanguage } from '@/lib/i18n/context';
import { Zap, RefreshCw, Radio, CheckCircle2, ShieldCheck, Play } from 'lucide-react';

export function DemoSimulationBar() {
  const { t } = useLanguage();
  const [demoState, setDemoState] = useState<DemoSimulationState>(getDemoState());
  const [isSurging, setIsSurging] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    setDemoState(getDemoState());
    const unsubscribe = subscribeDemoStateChange((newState) => {
      setDemoState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleSimulateSurge = () => {
    setIsSurging(true);
    setTimeout(() => {
      simulateWasteSurge();
      setIsSurging(false);
    }, 400);
  };

  const handleResetDemo = () => {
    setIsResetting(true);
    setTimeout(() => {
      resetDemo();
      setIsResetting(false);
    }, 300);
  };

  const stages: { id: DemoStage; label: string }[] = [
    { id: 'NORMAL', label: '1. Normal State' },
    { id: 'WASTE_SURGE', label: '2. Waste Surge' },
    { id: 'CRITICAL_PRIORITIES', label: '3. Critical Priorities' },
    { id: 'SMART_ROUTE', label: '4. Smart Route' },
    { id: 'DRIVER_COLLECTION', label: '5. Driver Collection' },
    { id: 'VERIFIED_COMPLETION', label: '6. Verified Completion' },
  ];

  const activeIndex = stages.findIndex((s) => s.id === demoState.stage);

  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-5 text-white shadow-2xl border-2 border-purple-500/40 space-y-4">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/30 text-purple-300 border border-purple-400/40">
            <Radio className="w-5 h-5 animate-pulse text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white uppercase tracking-wider">
                DEMO SIMULATION (HACKATHON MODE)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Isolated Sandbox
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
              Controlled simulation for presentation. Operates exclusively on isolated demo points &amp; simulated readings (<span className="font-mono text-purple-300">is_simulated: true</span>).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSimulateSurge}
            disabled={isSurging}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center space-x-2 transition-all ${
              demoState.stage === 'CRITICAL_PRIORITIES' || demoState.stage === 'WASTE_SURGE'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-rose-500/30 animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSurging ? 'animate-bounce' : ''}`} />
            <span>{isSurging ? 'Simulating Surge...' : 'Simulate Waste Surge'}</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Stepper Workflow Progress Bar */}
      <div className="pt-2 border-t border-purple-800/50">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {stages.map((s, idx) => {
            const isPassed = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div
                key={s.id}
                className={`p-2 rounded-xl text-center text-[11px] font-bold border transition-all ${
                  isCurrent
                    ? 'bg-purple-500 text-white border-purple-300 shadow-md scale-[1.02]'
                    : isPassed
                    ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                    : 'bg-slate-900/40 text-slate-500 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  {isPassed ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Play className="w-3 h-3 text-amber-300 animate-pulse shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  )}
                  <span className="truncate">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
