'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { AppShell } from '@/components/app-shell';
import { LayoutDashboard, PlusCircle, AlertTriangle, FileText, Calendar, User } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/context';

export default function CitizenLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/citizen', label: t('navDashboard'), icon: LayoutDashboard },
    { href: '/citizen/report', label: t('navReportWaste'), icon: PlusCircle },
    { href: '/citizen/missed-collection', label: t('navMissedCollection'), icon: AlertTriangle },
    { href: '/citizen/reports', label: t('navMyReports'), icon: FileText },
    { href: '/citizen/schedule', label: t('navSchedule'), icon: Calendar },
    { href: '/citizen/profile', label: t('navProfile'), icon: User },
  ];

  return (
    <AuthGuard allowedRoles={['citizen', 'admin']}>
      <AppShell>
        <div className="space-y-6">
          
          {/* Citizen Sub-Navbar Pills */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex items-center overflow-x-auto no-scrollbar shadow-sm">
            <div className="flex items-center space-x-1 min-w-full sm:min-w-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Page Content */}
          <div className="min-h-[70vh]">
            {children}
          </div>

        </div>
      </AppShell>
    </AuthGuard>
  );
}
