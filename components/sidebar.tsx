'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Trash2, 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Calendar, 
  User, 
  Truck, 
  ListOrdered, 
  History, 
  MapPin, 
  BarChart3, 
  TrendingUp, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/lib/i18n/context';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const { t } = useLanguage();

  // Determine active portal mode based on current URL path
  const currentRole = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/driver')
    ? 'driver'
    : 'citizen';

  // Navigation Links Definition by Role
  const navItems = {
    citizen: [
      { label: t('navDashboard'), href: '/citizen', icon: LayoutDashboard },
      { label: t('navReportWaste'), href: '/citizen/report', icon: PlusCircle },
      { label: t('navMyReports'), href: '/citizen/reports', icon: FileText },
      { label: t('navSchedule'), href: '/citizen/schedule', icon: Calendar },
      { label: t('navProfile'), href: '/citizen/profile', icon: User },
    ],
    driver: [
      { label: t('navDashboard'), href: '/driver', icon: LayoutDashboard },
      { label: t('navTodayRoute'), href: '/driver/route', icon: Truck },
      { label: t('navTasks'), href: '/driver/tasks', icon: ListOrdered },
      { label: t('navHistory'), href: '/driver/history', icon: History },
    ],
    admin: [
      { label: t('navDashboard'), href: '/admin', icon: LayoutDashboard },
      { label: t('citizenRecentReports'), href: '/admin/reports', icon: FileText },
      { label: t('navCollectionPoints'), href: '/admin/collection-points', icon: MapPin },
      { label: t('navVehicles'), href: '/admin/vehicles', icon: Truck },
      { label: t('navRoutes'), href: '/admin/routes', icon: Layers },
      { label: t('navAnalytics'), href: '/admin/analytics', icon: BarChart3 },
      { label: t('navPredictions'), href: '/admin/predictions', icon: TrendingUp },
    ],
  };

  const currentNav = navItems[currentRole];
  const roleLabel = currentRole === 'admin' ? t('roleAdmin') : currentRole === 'driver' ? t('roleWorker') : t('roleCitizen');

  const content = (
    <div className="h-full flex flex-col justify-between bg-emerald-950 text-white w-64 border-r border-emerald-900/40 shadow-2xl">
      
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-emerald-900/30">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-emerald-950 font-black shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white font-sans">{t('appName')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CIVIC
                </span>
              </div>
              <p className="text-[10px] text-emerald-300/60 font-medium">Panchayat Eco-Tech</p>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-emerald-300/70 hover:text-white hover:bg-emerald-900/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Portal Selection Header Banner */}
        <div className="p-3.5 mx-3 mt-4 rounded-2xl bg-emerald-900/30 border border-emerald-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300/60">
              Active Portal
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 capitalize">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 mt-3 space-y-1">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 font-bold border border-emerald-400/30 translate-x-1'
                    : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-400/80'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/90" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: System Status */}
      <div className="p-4 m-3 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 text-emerald-200/60 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-white font-bold">
          <span>{t('appName')} V1.0</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
        </div>
        <p className="text-[10px] leading-tight text-emerald-300/50">
          Eco-Tech Municipal Collection Engine for Smart Panchayats.
        </p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
}
