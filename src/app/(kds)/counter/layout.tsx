import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';

export const viewport: Viewport = {
  themeColor: '#06C167',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Counter — MENIUS',
  manifest: '/manifest-counter.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MENIUS Counter',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function CounterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#F2F2F2] flex flex-col">
      {children}
    </div>
  );
}
