'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ml-1.5 mr-0.5 shrink-0" />
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
          language === 'en'
            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ta')}
        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
          language === 'ta'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="தமிழ் (Tamil)"
      >
        தமிழ்
      </button>
    </div>
  );
}
