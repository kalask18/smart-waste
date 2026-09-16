'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@/types/database';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Verifying security credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Authentication Required</h2>
          <p className="text-xs text-slate-500">Please log in to access this portal.</p>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            Your account ({role.toUpperCase()}) does not have permission to view this section.
          </p>
        </div>
        <Link
          href={role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : '/citizen'}
          className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors"
        >
          Return to My Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
