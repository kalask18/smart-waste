import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { LanguageProvider } from '@/lib/i18n/context';
import { PWARegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'SmartWaste',
  description: 'Smart Waste Collection and Route Optimization Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartWaste',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SmartWaste" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans touch-manipulation">
        <LanguageProvider>
          <AuthProvider>
            <PWARegister />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
