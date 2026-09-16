'use client';

import React, { useState, useEffect } from 'react';
import { Signal, Play, Square, Send, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface SensorSimulatorProps {
  collectionPoints: Array<{ id: string; name: string; bin_code?: string }>;
  onPingSuccess?: () => void;
}

export default function SensorSimulator({ collectionPoints, onPingSuccess }: SensorSimulatorProps) {
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [fillPercent, setFillPercent] = useState<number>(85);
  const [weightKg, setWeightKg] = useState<number>(340);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastStatus, setLastStatus] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  useEffect(() => {
    if (collectionPoints.length > 0 && !selectedPointId) {
      setSelectedPointId(collectionPoints[0].id);
    }
  }, [collectionPoints, selectedPointId]);

  // Handle single manual sensor reading ping
  const handleSendPing = async (pointId?: string, fill?: number, weight?: number) => {
    const targetPointId = pointId || selectedPointId;
    const targetFill = fill !== undefined ? fill : fillPercent;
    const targetWeight = weight !== undefined ? weight : weightKg;

    if (!targetPointId) {
      setLastStatus({ success: false, message: 'Please select a collection point.' });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/sensors/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_point_id: targetPointId,
          fill_percent: targetFill,
          weight_kg: targetWeight,
          recorded_at: new Date().toISOString(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setLastStatus({
          success: true,
          message: `Sensor Ping Received! Fill: ${targetFill}%, Weight: ${targetWeight}kg`,
          timestamp: new Date().toLocaleTimeString(),
        });
        if (onPingSuccess) onPingSuccess();
      } else {
        setLastStatus({
          success: false,
          message: json.error || 'Failed to submit telemetry ping.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      setLastStatus({
        success: false,
        message: err.message || 'Network error sending ping to backend endpoint.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSending(false);
    }
  };

  // Auto-simulation interval generator
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAutoSimulating && collectionPoints.length > 0) {
      interval = setInterval(() => {
        // Pick a random collection point
        const randomPoint = collectionPoints[Math.floor(Math.random() * collectionPoints.length)];
        // Generate simulated fill level fluctuation (between 40% and 98%)
        const randomFill = Math.floor(Math.random() * 59) + 40;
        const randomWeight = Math.floor(randomFill * 4.2 + (Math.random() * 20 - 10));

        handleSendPing(randomPoint.id, randomFill, Math.max(10, randomWeight));
      }, 6000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoSimulating, collectionPoints]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white space-y-4">
      
      {/* Header Banner - MANDATORY SIMULATED / DEMO DATA LABELING */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Signal className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-white">IoT Sensor Data Generator</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                [DEMO / SIMULATED DATA]
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sends simulated hardware ultrasonic fill & load cell telemetry to <code className="text-emerald-400 font-mono">/api/sensors/readings</code>
            </p>
          </div>
        </div>

        {/* Disclaimer Alert Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 text-[11px] font-semibold text-amber-400/90 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/50">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Simulated for Development</span>
        </div>
      </div>

      {/* Simulator Control Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Collection Point Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Target Collection Point
          </label>
          <select
            value={selectedPointId}
            onChange={(e) => setSelectedPointId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.bin_code ? `${cp.bin_code} - ` : ''}{cp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fill Percent Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-300">Fill Level (%)</label>
            <span className="font-mono font-extrabold text-emerald-400">{fillPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fillPercent}
            onChange={(e) => setFillPercent(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
          />
        </div>

        {/* Weight Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-300">Payload Weight (kg)</label>
            <span className="font-mono font-extrabold text-emerald-400">{weightKg} kg</span>
          </div>
          <input
            type="number"
            min="0"
            max="2000"
            value={weightKg}
            onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

      </div>

      {/* Action Controls & Auto Streamer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => handleSendPing()}
            disabled={isSending}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-md"
          >
            {isSending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Simulated Ping</span>
          </button>

          <button
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 border ${
              isAutoSimulating
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isAutoSimulating ? (
              <>
                <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>Auto Stream (Every 6s)</span>
              </>
            )}
          </button>
        </div>

        {/* Live Status Feedback */}
        {lastStatus && (
          <div
            className={`text-xs font-mono font-medium px-3 py-1.5 rounded-xl border flex items-center space-x-2 ${
              lastStatus.success
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800'
            }`}
          >
            {lastStatus.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>
              {lastStatus.message} {lastStatus.timestamp && `(${lastStatus.timestamp})`}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
