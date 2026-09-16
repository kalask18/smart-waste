'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Trash2, LogIn, AlertCircle, Loader2, User, Truck, ShieldCheck, Zap } from 'lucide-react';
import { UserRole } from '@/types/database';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const { signIn, loginAsDemoRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password.');
      setIsSubmitting(false);
    } else {
      const lower = email.toLowerCase();
      const target = lower.includes('admin') 
        ? '/admin' 
        : lower.includes('driver') || lower.includes('worker') 
        ? '/driver' 
        : '/citizen';
      
      window.location.href = redirectTo || target;
    }
  };

  const handleInstantDemoLogin = (role: UserRole) => {
    loginAsDemoRole(role);
    const target = role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : '/citizen';
    window.location.href = target;
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 space-y-6">
      
      {/* Header & Language Switcher */}
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-2">
          <Trash2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('authLoginTitle')}
        </h1>
        <p className="text-xs text-slate-500">
          {t('authLoginSub')}
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Instant Demo Presets Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-5 rounded-2xl border border-slate-700 shadow-xl space-y-3 text-white">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">{t('authDemoLoginAs')}</span>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md">
            1-Click Login
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          
          <button
            type="button"
            onClick={() => handleInstantDemoLogin('citizen')}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-400 transition-all text-left group"
          >
            <User className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <p className="text-xs font-bold text-white">{t('roleCitizen')}</p>
              <p className="text-[9px] text-slate-400 truncate">citizen@smartwaste.com</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleInstantDemoLogin('driver')}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-400 transition-all text-left group"
          >
            <Truck className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <p className="text-xs font-bold text-white">{t('roleWorker')}</p>
              <p className="text-[9px] text-slate-400 truncate">driver@smartwaste.com</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleInstantDemoLogin('admin')}
            className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-400 transition-all text-left group"
          >
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="truncate">
              <p className="text-xs font-bold text-white">{t('roleAdmin')}</p>
              <p className="text-[9px] text-slate-400 truncate">admin@smartwaste.com</p>
            </div>
          </button>

        </div>
      </div>

      {/* Manual Email Login Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('authEmailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="citizen@smartwaste.com"
            required
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('authPasswordLabel')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="SmartWaste123!"
            required
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || authLoading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>{t('actionLogIn')}</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-slate-500">Loading Login Portal...</p>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
