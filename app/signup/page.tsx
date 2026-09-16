'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Trash2, UserPlus, AlertCircle, Loader2, User, Truck, ShieldAlert } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'driver'>('citizen');
  const [areaId, setAreaId] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, fullName, selectedRole, phone, areaId);

    if (error) {
      setErrorMsg(error.message || 'Registration failed.');
      setIsSubmitting(false);
    } else {
      if (selectedRole === 'driver') {
        router.push('/driver');
      } else {
        router.push('/citizen');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-2">
          <Trash2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create SmartWaste Account
        </h1>
        <p className="text-xs text-slate-500">
          Register to report waste or join collection routes
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Role Selector (Strictly Citizen or Driver ONLY) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('citizen')}
              className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedRole === 'citizen'
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              <User className="w-4 h-4 text-blue-500" />
              <span>Citizen</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('driver')}
              className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedRole === 'driver'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>Collection Driver</span>
            </button>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-1">
            <ShieldAlert className="w-3 h-3 text-slate-400" />
            <span>Administrator accounts must be assigned via Panchayat Security settings.</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ananya Sharma"
            required
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Password *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
            minLength={6}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Gram Panchayat / Area Zone
          </label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select Zone</option>
            <option value="a1111111-1111-1111-1111-111111111111">Narasipuram Town Zone</option>
            <option value="a2222222-2222-2222-2222-222222222222">Vellaimalaipattinam & Ikkaraibooluvampatti Zone</option>
            <option value="a3333333-3333-3333-3333-333333333333">Devarayapuram & Thondamuthur Zone</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || authLoading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Register Account</span>
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
              Log in here
            </Link>
          </p>
        </div>

      </form>
    </div>
  );
}
