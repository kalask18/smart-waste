'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { UserRole } from '@/types/database';
import { 
  Bell, 
  Menu, 
  LogOut, 
  Signal, 
  ChevronRight, 
} from 'lucide-react';
import { NotificationDrawer } from './notification-drawer';
import { LanguageSwitcher } from './language-switcher';
import { PWAInstallButton } from './pwa-install-button';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, signOut, loginAsDemoRole, loading } = useAuth();
  const { t, isTamil } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Breadcrumb generator
  const getBreadcrumb = () => {
    if (pathname.startsWith('/citizen')) {
      if (pathname.includes('/report')) return t('navReportWaste');
      if (pathname.includes('/reports')) return t('navMyReports');
      if (pathname.includes('/schedule')) return t('navSchedule');
      if (pathname.includes('/profile')) return t('navProfile');
      if (pathname.includes('/missed-collection')) return t('navMissedCollection');
      return t('portalCitizen');
    }
    if (pathname.startsWith('/driver')) {
      if (pathname.includes('/route')) return t('navTodayRoute');
      if (pathname.includes('/tasks')) return t('navTasks');
      if (pathname.includes('/history')) return t('navHistory');
      return t('portalWorker');
    }
    if (pathname.startsWith('/admin')) {
      if (pathname.includes('/reports')) return t('citizenRecentReports');
      if (pathname.includes('/collection-points')) return t('navCollectionPoints');
      if (pathname.includes('/vehicles')) return t('navVehicles');
      if (pathname.includes('/routes')) return t('navRoutes');
      if (pathname.includes('/analytics')) return t('navAnalytics');
      if (pathname.includes('/predictions')) return t('navPredictions');
      return t('adminTitle');
    }
    return t('appName');
  };

  const currentRoleLabel = role === 'admin' ? t('roleAdmin') : role === 'driver' ? t('roleWorker') : t('roleCitizen');

  const handleRoleSwitch = (targetRole: UserRole, targetHref: string) => {
    loginAsDemoRole(targetRole);
    router.push(targetHref);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2 text-xs font-medium">
            <span className="text-slate-400 capitalize hidden sm:inline-block">
              {currentRoleLabel}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
            <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
              {getBreadcrumb()}
            </span>
          </div>
        </div>

        {/* Right Side: Language Switcher, Quick Role Switchers, Notifications & Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Bilingual Language Switcher (EN | தமிழ்) */}
          <LanguageSwitcher />

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Live DB Signal Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Signal className="w-3 h-3 ml-0.5" />
            <span className="text-[11px]">{t('liveDb')}</span>
          </div>

          {/* Quick Portal Switcher Pills */}
          <div className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => handleRoleSwitch('citizen', '/citizen')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                pathname.startsWith('/citizen')
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('roleCitizen')}
            </button>
            <button
              onClick={() => handleRoleSwitch('driver', '/driver')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                pathname.startsWith('/driver')
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('roleWorker')}
            </button>
            <button
              onClick={() => handleRoleSwitch('admin', '/admin')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('roleAdmin')}
            </button>
          </div>

          {/* Notifications Trigger */}
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('notifTitle')}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>

          {/* User Profile Badge */}
          {!loading && (
            user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {currentRoleLabel}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title={t('actionLogOut')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {t('actionLogIn')}
              </Link>
            )
          )}

        </div>
      </header>

      {/* Slide-over Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </>
  );
}
