'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { WasteReport } from '@/types/database';
import { INITIAL_REPORTS } from '@/lib/demo-data';
import { ArrowLeft, Clock, MapPin, CheckCircle2, Shield, Truck, AlertCircle, FileImage, Sparkles } from 'lucide-react';

export default function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;
  const router = useRouter();

  const [report, setReport] = useState<WasteReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('waste_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (!error && data) {
          setReport(data as WasteReport);
        } else {
          // Fallback to demo item matching ID or first report
          const demoItem = INITIAL_REPORTS.find(r => r.id === reportId) || INITIAL_REPORTS[0];
          setReport(demoItem as any);
        }
      } catch (err) {
        console.error('Error fetching report details:', err);
        const demoItem = INITIAL_REPORTS.find(r => r.id === reportId) || INITIAL_REPORTS[0];
        setReport(demoItem as any);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [reportId]);

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading report details...</div>;
  }

  if (!report) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-xs text-slate-500">Report not found.</p>
        <Link href="/citizen/reports" className="text-xs font-semibold text-emerald-600 hover:underline">
          Return to My Reports
        </Link>
      </div>
    );
  }

  // Define Status Progress Steps
  const statusSteps = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Collected', 'Resolved'];
  const currentStatusIndex = statusSteps.findIndex(
    s => s.toLowerCase() === (report.status || 'Submitted').toLowerCase()
  );
  const activeStep = currentStatusIndex !== -1 ? currentStatusIndex : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Back Button */}
      <Link
        href="/citizen/reports"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Reports</span>
      </Link>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Report #{report.id}</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {report.location_name || 'Report Point'}
            </h1>
            <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Logged on {new Date(report.created_at).toLocaleString()}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
              {report.status || 'Submitted'}
            </span>
          </div>
        </div>

        {/* Status Progress Stepper */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Collection Status Progress</p>
          <div className="grid grid-cols-6 gap-1.5 text-center">
            {statusSteps.map((step, idx) => {
              const isCompleted = idx <= activeStep;
              return (
                <div key={step} className="space-y-1.5">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-500 shadow-sm' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                  <span
                    className={`block text-[10px] font-semibold truncate ${
                      isCompleted ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Metadata & Priority */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Report Information
          </h2>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Category:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{report.category || (report as any).waste_category}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Severity Level:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{report.severity || 'HIGH'}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Description:</span>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 leading-relaxed mt-1">
                {report.description}
              </p>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 block font-medium">GPS Coordinates:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lat: {report.latitude}, Lng: {report.longitude}</span>
              </span>
            </div>
          </div>

          {/* Priority Score Box */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between pt-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">System Priority Score</span>
            </div>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              {report.priority_score || 85} / 100
            </span>
          </div>
        </div>

        {/* Right: Photos & Proof */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            Uploaded Photos & Verification
          </h2>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-1.5 flex items-center space-x-1">
                <FileImage className="w-3.5 h-3.5 text-slate-400" />
                <span>Submitted Waste Photo</span>
              </span>
              {report.image_url || (report as any).photo_url ? (
                <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  {/* eslint-disable-next-html-loader */}
                  <img
                    src={report.image_url || (report as any).photo_url}
                    alt="Submitted Waste"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                  No photo attached
                </div>
              )}
            </div>

            {report.status === 'Collected' || report.status === 'Resolved' ? (
              <div className="pt-2">
                <span className="text-xs font-semibold text-emerald-600 block mb-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Driver Verification Proof</span>
                </span>
                <p className="text-[11px] text-slate-500">Collection completed and verified by driver.</p>
              </div>
            ) : null}
          </div>

        </div>

      </div>

    </div>
  );
}
