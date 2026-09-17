'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { 
  Trash2, 
  User, 
  Truck, 
  Shield, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Cpu, 
  MapPin, 
  BarChart3,
  LogIn,
  LayoutDashboard
} from 'lucide-react';

import { useLanguage } from '@/lib/i18n/context';

export default function Home() {
  const { user, role } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      
      {/* Top Header Bar for Landing Page */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">SmartWaste</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                GOV MVP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Demand-Driven Municipal System</p>
          </div>
        </Link>

        <div className="flex items-center space-x-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('actionLogIn')}</span>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-12 my-6">
        
        {/* Hero Banner */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Smart Demand-Driven Waste Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Smart Waste Collection for <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Villages & Towns</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Replacing fixed schedule collection with real-time priority-driven dispatching. Select a role portal below to explore the responsive dashboard applications.
          </p>
        </section>

        {/* Role Portal Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Citizen Portal Card */}
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl hover:border-blue-500/50 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">1. Citizen Portal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Report waste, pin location coordinates, upload photos to Supabase Storage, and track collection progress.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800/80">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Report waste & missed pickups</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Live Priority Engine score preview</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Interactive status timeline (6 steps)</span>
                </li>
              </ul>
            </div>
            <Link
              href="/citizen"
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-600/20"
            >
              <span>Launch Citizen Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2. Worker / Driver Card */}
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">2. Worker / Driver App</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mobile-responsive portal for collection drivers to navigate sequential route stops, mark arrivals, and upload proof.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800/80">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Today's sequential route stops</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark arrived & upload collection proof</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Electric tipper payload tracking</span>
                </li>
              </ul>
            </div>
            <Link
              href="/driver"
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20"
            >
              <span>Open Worker App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3. Admin Control Room Card */}
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl hover:border-purple-500/50 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">3. Admin Command Center</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Panchayat & municipal control room for monitoring smart bins, assigning driver routes, fleet tracking, and AI hotspot predictions.
              </p>
              <ul className="text-xs text-slate-400 space-y-2 pt-2 border-t border-slate-800/80">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Smart bin & dumping points telemetry</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Driver route dispatch manager</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Analytics & hotspot risk forecasting</span>
                </li>
              </ul>
            </div>
            <Link
              href="/admin"
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-lg shadow-purple-600/20"
            >
              <span>Launch Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </section>

        {/* Workflow Architecture Card */}
        <section className="bg-slate-900/60 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold">End-to-End Smart Workflow Architecture</h2>
              <p className="text-xs text-slate-400">Demand-driven waste collection sequence</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit">
              System Active & Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-emerald-400 font-extrabold flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>1. Citizen Report</span>
              </div>
              <p className="text-slate-300">Citizen pinpoints waste overflow with photo and category.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-cyan-400 font-extrabold flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>2. Priority Engine</span>
              </div>
              <p className="text-slate-300">Backend engine calculates score (40% level, 25% time, 20% complaints, 15% sensitivity).</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-extrabold flex items-center space-x-2">
                <Truck className="w-4 h-4" />
                <span>3. Driver Dispatch</span>
              </div>
              <p className="text-slate-300">Admin dispatches vehicle & driver receives sequential stop navigation.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="text-purple-400 font-extrabold flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>4. Verified Resolution</span>
              </div>
              <p className="text-slate-300">Driver uploads verification proof, closing the loop live for citizens & admins.</p>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-400">
        <p>© 2026 SmartWaste System • Demand-Driven Municipal Waste Management</p>
      </footer>
    </div>
  );
}
