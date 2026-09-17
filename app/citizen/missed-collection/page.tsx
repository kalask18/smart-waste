'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { CollectionPoint } from '@/types/database';
import { AlertTriangle, Loader2, CheckCircle2, MapPin, Calendar, Clock } from 'lucide-react';

export default function ReportMissedCollectionPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [collectionPointId, setCollectionPointId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const { data } = await supabase.from('collection_points').select('*');
        if (data) setCollectionPoints(data as CollectionPoint[]);
      } catch (err) {
        console.error('Error fetching collection points:', err);
      }
    };
    fetchPoints();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!collectionPointId) {
      setErrorMsg('Please select the collection point where pickup was missed.');
      return;
    }

    setIsSubmitting(true);
    try {
      let validCpId: string | null = null;
      if (collectionPointId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collectionPointId)) {
        validCpId = collectionPointId;
      }

      let validUserId: string | null = null;
      if (user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        validUserId = user.id;
      }

      const point = collectionPoints.find(p => p.id === collectionPointId);
      const locName = point?.name || 'Missed Collection Spot';
      const fullDesc = `${locName}: MISSED COLLECTION ALERT (Scheduled: ${scheduledDate}) - ${description || 'Scheduled waste pickup was missed by driver.'}`;

      const { error } = await supabase
        .from('waste_reports')
        .insert({
          user_id: validUserId,
          collection_point_id: validCpId,
          category: 'overflowing_bin',
          severity: 'HIGH',
          description: fullDesc,
          latitude: point?.latitude || 11.0003,
          longitude: point?.longitude || 76.7725,
          status: 'pending',
        });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log missed collection alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center sm:justify-start space-x-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <span>Report Missed Waste Collection</span>
        </h1>
        <p className="text-xs text-slate-500">
          Notify municipal control room if scheduled morning/afternoon pickup was missed.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {submitted ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Missed Collection Alert Logged!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your report has been flagged HIGH priority for the admin route dispatcher to re-assign a vehicle.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => router.push('/citizen/reports')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors"
            >
              View My Reports
            </button>
            <button
              onClick={() => setSubmitted(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
            >
              Log Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Collection Point / Dump *
            </label>
            <select
              value={collectionPointId}
              onChange={(e) => setCollectionPointId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select Missed Collection Spot</option>
              {collectionPoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Missed Pickup Date *</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Additional Notes / Observations
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tipper truck did not arrive during morning shift (8:00 AM - 10:00 AM)..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Logging Alert...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Missed Collection Alert</span>
              </>
            )}
          </button>

        </form>
      )}

    </div>
  );
}
