import type { Metadata, Viewport } from 'next';
import { Inter, DM_Sans, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import CookieConsent from '@/components/CookieConsent';
import CrispChat from '@/components/CrispChat';
import { PostHogProvider } from '@/components/PostHogProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'MENIUS — Smart Digital Menus for Restaurants',
    template: '%s | MENIUS',
  },
  description: 'The #1 digital menu & ordering platform for restaurants. QR codes, AI-powered menu builder, real-time orders, analytics and more. La plataforma #1 de menús digitales con QR para restaurantes.',
  keywords: [
    'digital menu', 'restaurant QR menu', 'online ordering', 'restaurant SaaS', 'QR menu', 'MENIUS',
    'menú digital', 'QR restaurante', 'pedidos online', 'SaaS restaurantes', 'menú QR', 'menu digital restaurante',
    'digital menu restaurant', 'restaurant ordering system', 'restaurant management',
  ],
  authors: [{ name: 'MENIUS' }],
  creator: 'MENIUS',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app'),
  openGraph: {
    type: 'website',
    siteName: 'MENIUS',
    title: 'MENIUS — Smart Digital Menus for Restaurants',
    description: 'Create your digital menu with QR codes, receive real-time orders, and manage your restaurant from one place.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'MENIUS — Digital menus for restaurants' }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MENIUS — Menús digitales para restaurantes',
    description: 'Crea tu menú digital con QR y recibe pedidos en tiempo real.',
    images: ['/opengraph-image'],
  },
  alternates: {
    languages: {
      'es': 'https://menius.app/',
      'en': 'https://menius.app/',
      'x-default': 'https://menius.app/',
    },
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
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es';

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app';
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MENIUS',
    url: APP_URL,
    logo: `${APP_URL}/icons/icon-512.svg`,
    sameAs: [
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
      process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
      process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
      process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    ].filter(Boolean),
    description: locale === 'en'
      ? 'The #1 digital QR menu platform for restaurants.'
      : 'La plataforma #1 de menús digitales con QR para restaurantes.',
  };

  return (
    <html lang={locale} className={`${inter.variable} ${dmSans.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-icon" />
      </head>
      <body className="bg-black text-gray-900 antialiased font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-black focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
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
