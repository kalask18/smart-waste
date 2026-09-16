import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shadow-lg shadow-red-500/10">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          403 - Access Denied
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          You do not have permission to view this section. Role boundaries prevent unauthorized portal access.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <Link
          href="/login"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Switch Account</span>
        </Link>
        <Link
          href="/"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
