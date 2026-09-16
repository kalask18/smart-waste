'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { fetchMergedWasteReports, subscribeReportsChange } from '@/lib/report-service';
import { WasteReport } from '@/types/database';
import { INITIAL_REPORTS } from '@/lib/demo-data';
import { FileText, Search, Clock, ArrowRight, Radio } from 'lucide-react';

export default function MyReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const merged = await fetchMergedWasteReports();
        setReports(merged);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setReports(INITIAL_REPORTS as any);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
    const unsub = subscribeReportsChange((updated) => {
      setReports(updated);
      setIsRealtimeActive(true);
    });
    return () => unsub();
  }, [user]);

  // Filter Reports
  const filteredReports = reports.filter((r) => {
    const matchesTab =
      activeTab === 'All' ||
      (r.status || 'Submitted').toLowerCase() === activeTab.toLowerCase();

    const matchesSearch =
      (r.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    const s = status || 'Submitted';
    switch (s) {
      case 'Submitted':
        return 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-400';
      case 'Under Review':
        return 'bg-amber-500/15 text-amber-800 border-amber-300 dark:text-amber-400';
      case 'Assigned':
        return 'bg-purple-500/15 text-purple-700 border-purple-300 dark:text-purple-400';
      case 'In Progress':
        return 'bg-indigo-500/15 text-indigo-700 border-indigo-300 dark:text-indigo-400';
      case 'Collected':
      case 'Resolved':
        return 'bg-emerald-500/15 text-emerald-800 border-emerald-300 dark:text-emerald-400';
      case 'Rejected':
        return 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              <span>My Waste Reports</span>
            </h1>
            {isRealtimeActive && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <Radio className="w-3 h-3 mr-1 animate-pulse" /> Realtime Sync
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track status, priority scores, and driver verification proofs in real time.
          </p>
        </div>

        <Link
          href="/citizen/report"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors w-fit"
        >
          + New Report
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by location name or description..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
          {['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Collected', 'Resolved', 'Rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading reports from database...</div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">No reports found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {report.location_name || 'Report Location'}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(report.created_at).toLocaleString()}</span>
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(report.status)}`}>
                    {report.status || 'Submitted'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {report.description}
                </p>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold uppercase text-slate-700 dark:text-slate-300">
                    {report.category || (report as any).waste_category || 'general'}
                  </span>
                  {report.severity && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                      {report.severity}
                    </span>
                  )}
                  {report.priority_score !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      Score {report.priority_score}/100
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">ID: {report.id.slice(0, 8)}...</span>
                <Link
                  href={`/citizen/reports/${report.id}`}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <span>Track Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
