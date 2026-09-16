'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { WasteReport, ReportStatus, PriorityLevel } from '@/types/database';
import { INITIAL_REPORTS } from '@/lib/demo-data';
import { addNotification } from '@/lib/notification-service';
import { fetchMergedWasteReports, subscribeReportsChange } from '@/lib/report-service';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { FileText, User, MapPin, Truck, Check, Eye, Radio, RefreshCw, X, ExternalLink } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [assignModalReport, setAssignModalReport] = useState<any | null>(null);
  const [previewImageReport, setPreviewImageReport] = useState<any | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('d1');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const merged = await fetchMergedWasteReports();
      setReports(merged);
    } catch (err) {
      console.error('Error fetching admin reports:', err);
      setReports(INITIAL_REPORTS as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const unsub = subscribeReportsChange((updatedReports) => {
      setReports(updatedReports);
      setIsRealtimeActive(true);
    });
    return () => unsub();
  }, []);

  const handleAssignDriver = async () => {
    if (!assignModalReport) return;
    setUpdating(true);

    try {
      // Map UI status 'Assigned' to lowercase DB check constraint 'assigned'
      const { data: updateData, error } = await supabase
        .from('waste_reports')
        .update({
          status: 'assigned',
        })
        .eq('id', assignModalReport.id)
        .select('*');

      if (error) {
        console.error('[Admin Assign Driver] Supabase error:', error);
      } else {
        console.log('[Admin Assign Driver] Updated DB report:', updateData);
      }

      // Optimistically update state
      setReports((prev) =>
        prev.map((r) =>
          r.id === assignModalReport.id ? { ...r, status: 'Assigned' } : r
        )
      );

      const driverNames: Record<string, string> = {
        d1: 'Ramesh Patel (E-Rickshaw #TN-37-EV-2024)',
        d2: 'Suresh K. (Compactor #TN-37-G-4050)',
        d3: 'Manjunath (Tipper #TN-37-M-3001)',
      };

      await addNotification({
        title: 'Report Driver Assigned',
        message: `Report ${assignModalReport.location_name || assignModalReport.id.slice(0, 8)} assigned to ${driverNames[selectedDriver] || 'driver'}.`,
        type: 'task',
        user_id: assignModalReport.user_id,
        report_id: assignModalReport.id,
      });

      setAssignModalReport(null);
    } catch (err) {
      console.error('[Admin Assign Driver] Exception:', err);
      setAssignModalReport(null);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );

    // Map UI status to DB status
    const statusMap: Record<string, string> = {
      'Submitted': 'pending',
      'Under Review': 'pending',
      'Assigned': 'assigned',
      'In Progress': 'in_progress',
      'Collected': 'resolved',
      'Resolved': 'resolved',
      'Rejected': 'rejected',
    };

    const dbStatus = statusMap[newStatus] || 'pending';

    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ status: dbStatus })
        .eq('id', reportId);

      if (error) {
        console.error('[Admin Status Update] Error updating status in DB:', error);
      }

      await addNotification({
        title: `Report Status Updated: ${newStatus}`,
        message: `Waste report ${reportId.slice(0, 8)} status was updated to ${newStatus}.`,
        type: (newStatus as string) === 'Collected' || (newStatus as string) === 'Resolved' ? 'info' : 'warning',
        report_id: reportId,
      });
    } catch (e) {
      console.error('[Admin Status Update] Exception:', e);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Report ID',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
          {row.report_code || `WR-${row.id.slice(0, 6).toUpperCase()}`}
        </span>
      ),
    },
    {
      header: 'Location & Photo',
      accessor: (row) => {
        const photoUrl = row.photo_url || row.image_url;
        return (
          <div className="flex items-center space-x-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Waste report evidence"
                className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
                onClick={() => setPreviewImageReport(row)}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                No Photo
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                {row.location_name || row.location || 'Report Location'}
              </p>
              <p className="text-[10px] text-slate-400 line-clamp-1">
                {row.description || 'No description provided'}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessor: (row) => (
        <span className="capitalize text-xs font-semibold text-slate-700 dark:text-slate-300">
          {(row.category || row.waste_category || 'general').replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Priority Score',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <StatusBadge type="priority" value={row.severity || row.priority_level || 'MEDIUM'} size="sm" />
          <span className="font-extrabold text-xs">({row.priority_score ?? 50})</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <select
          value={row.status || 'Submitted'}
          onChange={(e) => handleStatusChange(row.id, e.target.value as ReportStatus)}
          className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          {['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Collected', 'Resolved', 'Rejected'].map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAssignModalReport(row)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
          >
            Assign Driver
          </button>
          {(row.photo_url || row.image_url) && (
            <button
              onClick={() => setPreviewImageReport(row)}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              title="View Photo Evidence"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Citizen Waste Reports Management
            </h1>
            {isRealtimeActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <Radio className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-500" /> Realtime Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review live incoming reports, inspect submitted photos, and dispatch collection drivers.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={reports}
        searchKey="location_name"
        searchPlaceholder="Search reports by location name..."
      />

      {/* Driver Assignment Modal */}
      {assignModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assign Route Driver
              </h3>
              <button
                onClick={() => setAssignModalReport(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Report: {assignModalReport.report_code || `WR-${assignModalReport.id.slice(0, 6).toUpperCase()}`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Location: {assignModalReport.location_name || assignModalReport.location || 'Report Location'}
              </p>
              <p className="text-[11px] text-slate-400">
                Category: {(assignModalReport.category || assignModalReport.waste_category || 'general').replace('_', ' ')} • Priority: {assignModalReport.severity || 'MEDIUM'} ({assignModalReport.priority_score ?? 50})
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Driver & Vehicle
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
              >
                <option value="d1">Ramesh Patel (E-Rickshaw #TN-37-EV-1020)</option>
                <option value="d2">Suresh K. (Compactor #TN-37-G-4050)</option>
                <option value="d3">Manjunath (Tipper #TN-37-M-3001)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAssignModalReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={updating}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>{updating ? 'Assigning...' : 'Confirm Dispatch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Photo Evidence - {previewImageReport.location_name || 'Report Photo'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Uploaded by citizen • Lat: {previewImageReport.latitude || 11.0003}, Lng: {previewImageReport.longitude || 76.7725}
                </p>
              </div>
              <button
                onClick={() => setPreviewImageReport(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black max-h-[360px] flex items-center justify-center">
              <img
                src={previewImageReport.photo_url || previewImageReport.image_url}
                alt="Full report evidence"
                className="max-h-[360px] w-auto object-contain"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">Description:</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {previewImageReport.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewImageReport.photo_url || previewImageReport.image_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center space-x-1"
              >
                <span>Open Full Image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setPreviewImageReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
