import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import CrispChat from '@/components/CrispChat';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MENIUS — Menús digitales inteligentes para restaurantes',
    template: '%s | MENIUS',
  },
  description: 'La plataforma #1 de menús digitales con QR. Registra tu restaurante, crea tu menú con fotos IA, genera QRs, recibe pedidos en tiempo real y gestiona tu negocio.',
  keywords: ['menú digital', 'QR restaurante', 'pedidos online', 'SaaS restaurantes', 'menú QR', 'MENIUS', 'menu digital restaurant'],
  authors: [{ name: 'MENIUS' }],
  creator: 'MENIUS',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app'),
  openGraph: {
    type: 'website',
    siteName: 'MENIUS',
    title: 'MENIUS — Menús digitales inteligentes para restaurantes',
    description: 'Crea tu menú digital con QR, recibe pedidos en tiempo real, y gestiona tu restaurante desde un solo lugar.',
    images: [{ url: '/icons/icon-512.svg', width: 512, height: 512, alt: 'MENIUS Logo' }],
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary',
    title: 'MENIUS — Menús digitales para restaurantes',
    description: 'Crea tu menú digital con QR y recibe pedidos en tiempo real.',
    images: ['/icons/icon-512.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MENIUS',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
        <CookieConsent />
        <CrispChat />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                reg.addEventListener('updatefound', function() {
                  var newWorker = reg.installing;
                  if (!newWorker) return;
                  newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                      showUpdateBanner();
                    }
                  });
                });
              }).catch(function(err) { console.error('[Layout] SW registration failed:', err); });

              navigator.serviceWorker.addEventListener('message', function(e) {
                if (e.data && e.data.type === 'SW_UPDATED') showUpdateBanner();
              });
            });

            function showUpdateBanner() {
              if (document.getElementById('sw-update-banner')) return;
              var d = document.createElement('div');
              d.id = 'sw-update-banner';
              d.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:12px;padding:12px 20px;border-radius:14px;background:#111;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:system-ui;';
              d.innerHTML = '<span style="font-size:13px;color:#d1d5db;">Nueva versión disponible</span><button onclick="location.reload()" style="padding:6px 16px;border-radius:8px;background:#7c3aed;color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;">Actualizar</button>';
              document.body.appendChild(d);
            }
          }
        `,
      }}
    />
  );
}
