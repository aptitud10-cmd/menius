import type { Metadata, Viewport } from 'next';
import { DM_Sans, Sora } from 'next/font/google';
import './globals.css';
import CookieConsent from '@/components/CookieConsent';
import CrispChat from '@/components/CrispChat';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700', '800'],
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
  themeColor: '#00332f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${sora.variable}`}>
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
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `,
      }}
    />
  );
}
