'use client';

import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallButton({ className = '' }: { className?: string }) {
  const { isTamil } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        setIsInstalled(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 ${className}`}>
        <CheckCircle className="w-3.5 h-3.5" />
        <span>{isTamil ? 'செயலி நிறுவப்பட்டது' : 'App Installed'}</span>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm hover:shadow-md transition-all ${className}`}
        title={isTamil ? 'ஸ்மார்ட்வேஸ்ட் செயலியை நிறுவு' : 'Install SmartWaste App'}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isTamil ? 'செயலியை நிறுவு' : 'Install App'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md font-bold text-lg">
                SW
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isTamil ? 'ஸ்மார்ட்வேஸ்ட் செயலியை நிறுவுவது எப்படி?' : 'How to Install SmartWaste'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isTamil ? 'இணைய உலாவி மூலம் எளிதாக நிறுவலாம்' : 'Install directly from your browser'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  💻 {isTamil ? 'கணினி (Chrome / Edge / Brave):' : 'Desktop (Chrome / Edge / Brave):'}
                </p>
                <p>
                  {isTamil
                    ? 'முகவரிப் பட்டியின் (Address Bar) வலது ஓரத்தில் உள்ள நிறுவு ஐகான் (⊕) அல்லது உலாவியின் (⋮) 3 புள்ளிகளை கிளிக் செய்து "Install SmartWaste" என்பதை தேர்வு செய்க.'
                    : 'Click the Install icon (⊕) on the right side of the address bar, or open the browser menu (⋮ 3 dots) and select "Install SmartWaste".'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  📱 {isTamil ? 'ஆண்ட்ராய்டு மொபைல் (Android):' : 'Android Mobile:'}
                </p>
                <p>
                  {isTamil
                    ? 'Chrome உலாவியின் மேல் வலது ஓரத்தில் உள்ள 3 புள்ளிகளை (⋮) தொட்டு, "Add to Home screen" அல்லது "Install app" என்பதை அழுத்தவும்.'
                    : 'Tap the top-right 3 dots (⋮) in Chrome and select "Add to Home screen" or "Install app".'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  🍎 {isTamil ? 'ஐபோன் / ஐபேட் (iOS Safari):' : 'iPhone / iPad (iOS Safari):'}
                </p>
                <p>
                  {isTamil
                    ? 'Safari உலாவியின் கீழே உள்ள Share பட்டனை (⎋) தொட்டு, "Add to Home Screen" (+) என்பதைத் தேர்ந்தெடுக்கவும்.'
                    : 'Tap the Share button (⎋) at the bottom of Safari and select "Add to Home Screen" (+).'}
                </p>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90"
              >
                {isTamil ? 'புரிந்தது' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
