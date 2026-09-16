'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { WasteReport } from '@/types/database';
import { INITIAL_REPORTS } from '@/lib/demo-data';
import { PlusCircle, AlertTriangle, Calendar, FileText, CheckCircle2, Clock, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { SmartWastePulse } from '@/components/ui/smartwaste-pulse';

export default function CitizenDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t, tLocation } = useLanguage();
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserReports = async () => {
      setLoading(true);
      try {
        let query = supabase.from('waste_reports').select('*').order('created_at', { ascending: false });

        if (user?.id) {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          setReports(data as WasteReport[]);
        } else {
          setReports(INITIAL_REPORTS as any);
        }
      } catch (err) {
        console.error('Error fetching citizen reports:', err);
        setReports(INITIAL_REPORTS as any);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReports();
  }, [user]);

  const totalReports = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length;
  const activeCount = reports.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Collected' || r.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 sm:p-8 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {t('citizenWelcome', { name: profile?.full_name || t('roleCitizen') })}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">
              {t('citizenSubtitle')}
            </p>
          </div>
          <Link
            href="/citizen/report"
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-md w-fit"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>{t('citizenReportNow')}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('citizenTotalSubmissions')}</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalReports}</p>
          <p className="text-[11px] text-slate-400">{t('citizenTotalSubmissions')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('citizenPendingReview')}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-[11px] text-slate-400">{t('statusPending')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('citizenInProgress')}</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{activeCount}</p>
          <p className="text-[11px] text-slate-400">{t('statusInProgress')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('citizenCollectedVerified')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
          <p className="text-[11px] text-slate-400">{t('statusCollected')}</p>
        </div>

      </div>

      {/* Signature Component: SmartWaste Pulse */}
      <SmartWastePulse
        fillPercent={85}
        locationName="Narasipuram Panchayat Main Gate Dumpster"
        priorityLevel="CRITICAL"
        priorityScore={92}
        recommendedAction={t('citizenReportNow')}
        onActionClick={() => router.push('/citizen/report')}
      />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <Link
          href="/citizen/report"
          className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              {t('citizenReportOverflowing')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('citizenReportOverflowingSub')}
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
            <span>{t('citizenReportNow')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <Link
          href="/citizen/missed-collection"
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:from-amber-500/20 hover:to-orange-500/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
              {t('citizenReportMissed')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('citizenReportMissedSub')}
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
            <span>{t('actionSubmit')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <Link
          href="/citizen/schedule"
          className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20 hover:to-indigo-500/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/60 transition-all group space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              {t('citizenViewSchedule')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('citizenViewScheduleSub')}
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
            <span>{t('actionViewDetails')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

      </div>

      {/* Recent Submissions Feed */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('citizenRecentReports')}</h2>
          <Link href="/citizen/reports" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            {t('actionViewDetails')} ({totalReports})
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">{t('citizenNoReports')}</p>
            <Link
              href="/citizen/report"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              <span>{t('citizenSubmitFirst')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {tLocation(report.location_name || 'Narasipuram Main Dumpster')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {report.status || t('statusSubmitted')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{report.description}</p>
                  <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Lat: {report.latitude}, Lng: {report.longitude}</span>
                  </p>
                </div>

                <Link
                  href={`/citizen/reports/${report.id}`}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 w-fit text-center"
                >
                  {t('actionViewDetails')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
