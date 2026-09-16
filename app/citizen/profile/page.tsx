'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Area } from '@/types/database';
import { User, Phone, Mail, MapPin, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CitizenProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAreaId(profile.area_id || '');
    }
  }, [profile]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const { data } = await supabase.from('areas').select('*');
        if (data) setAreas(data as Area[]);
      } catch (err) {
        console.error('Error fetching areas:', err);
      }
    };
    fetchAreas();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          area_id: areaId || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setSuccessMsg('Profile details updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center sm:justify-start space-x-2">
          <User className="w-6 h-6 text-emerald-600" />
          <span>My Profile & Settings</span>
        </h1>
        <p className="text-xs text-slate-500">
          Manage your personal details and assigned Panchayat area zone.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Role Badge Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Account Role</span>
            <span className="font-extrabold text-emerald-600 uppercase tracking-wider">
              {profile?.role || 'CITIZEN'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">Registered Email</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email || 'N/A'}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Full Name</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Phone Number</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Assigned Gram Panchayat / Ward Zone</span>
          </label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select Panchayat Area Zone</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Profile Details</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
