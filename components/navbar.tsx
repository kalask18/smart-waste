'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';
import { Trash2, Shield, Truck, User, LogOut, LogIn, Signal, Bell } from 'lucide-react';
import { NotificationDrawer } from '@/components/notification-drawer';
import { LanguageSwitcher } from '@/components/language-switcher';
import { getNotifications, subscribeNotificationsChange } from '@/lib/notification-service';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateCount = (list?: any[]) => {
      const items = list || getNotifications();
      setUnreadCount(items.filter((n: any) => !n.read).length);
    };
    updateCount();
    const unsub = subscribeNotificationsChange((updated) => updateCount(updated));
    return () => unsub();
  }, []);

  const handleRoleNavigate = (targetRole: 'citizen' | 'driver' | 'admin') => {
    if (targetRole === 'citizen') router.push('/citizen');
    else if (targetRole === 'driver') router.push('/driver');
    else if (targetRole === 'admin') router.push('/admin');
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">{t('appName')}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {t('mvpBadge')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('appTagline')}</p>
          </div>
        </Link>

        {/* Portal Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <button
            onClick={() => handleRoleNavigate('citizen')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              pathname.startsWith('/citizen')
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t('portalCitizen')}</span>
          </button>

          <button
            onClick={() => handleRoleNavigate('driver')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              pathname.startsWith('/driver')
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{t('portalWorker')}</span>
          </button>

          <button
            onClick={() => handleRoleNavigate('admin')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              pathname.startsWith('/admin')
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('portalAdmin')}</span>
          </button>
        </nav>

        {/* User Auth Controls & Language Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          <LanguageSwitcher />

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Signal className="w-3 h-3 ml-1" />
            <span>{t('liveDb')}</span>
          </div>

          {/* Notifications Drawer Toggle */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title={t('notifTitle')}
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

          {!loading && (
            user ? (
              <div className="flex items-center space-x-2">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {role === 'admin' ? t('roleAdmin') : role === 'driver' ? t('roleWorker') : t('roleCitizen')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title={t('actionLogOut')}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('actionLogIn')}</span>
                </Link>
              </div>
            )
          )}

        </div>

      </div>
    </header>
  );
}
