import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import CookieConsent from "@/components/CookieConsent";
import { PostHogProvider } from "@/components/PostHogProvider";
import { validateEnv } from "@/lib/env";
import { SITE_URL, url } from "@/lib/site-url";

validateEnv();
// Inter ESTÁTICA (un archivo por peso, @fontsource/inter 5.1.0, OFL-1.1, solo
// "latin": español e inglés viven ahí). La variable de Google (un archivo
// 100–900 con ejes wght+opsz) se dibujaba con un solo grosor en iPhone: todo
// el sitio salía en 400 aunque el código pidiera semibold/bold (visto en el
// iPhone de Pedro y reproducido en WebKit; Chrome de escritorio sí variaba,
// por eso las capturas se veían bien). Pesos: 300 cae en 400 y 900 en 800.
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/inter-latin-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

// Bricolage ESTÁTICA por la misma razón que Inter (la variable de Google se
// dibuja con un solo grosor en iPhone). Sin precarga: solo la usan la landing,
// el repartidor, las pantallas de tablet y los sitios de Buccaneer; el menú,
// el checkout y el seguimiento no la bajan. 900 cae en 800.
const bricolage = localFont({
  src: [
    { path: "./fonts/bricolage-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/bricolage-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/bricolage-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/bricolage-latin-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/bricolage-latin-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// Instrument Serif NORMAL: la usa la tienda (`font-menu`: nombre del
// restaurante en la portada, reseñas, mis pedidos). La CURSIVA solo la usa el
// título de la landing y se carga allá (LandingHero.tsx): así el menú no
// precarga un archivo que nunca dibuja (Lighthouse 2026-11-19).
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MENIUS — Smart Digital Menus for Restaurants",
    template: "%s | MENIUS",
  },
  description:
    "Digital menu and online ordering for restaurants. QR codes, AI-powered menu builder, real-time orders, analytics and more. Menú digital con QR y pedidos online para restaurantes.",
  keywords: [
    "digital menu",
    "restaurant QR menu",
    "online ordering",
    "restaurant SaaS",
    "QR menu",
    "MENIUS",
    "menú digital",
    "QR restaurante",
    "pedidos online",
    "SaaS restaurantes",
    "menú QR",
    "menu digital restaurante",
    "digital menu restaurant",
    "restaurant ordering system",
    "restaurant management",
  ],
  authors: [{ name: "MENIUS" }],
  creator: "MENIUS",
  manifest: "/manifest.json",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: "MENIUS",
    title: "MENIUS — Smart Digital Menus for Restaurants",
    description:
      "Create your digital menu with QR codes, receive real-time orders, and manage your restaurant from one place.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "MENIUS — Digital menus for restaurants",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MENIUS — Menús digitales para restaurantes",
    description: "Crea tu menú digital con QR y recibe pedidos en tiempo real.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MENIUS",
  },
  icons: {
    icon: "/favicon.svg",
    // In metadata (not a hand-written <link> in <head>) so a store's own
    // apple icon replaces it instead of shipping two.
    apple: "/apple-icon",
  },
  // Search Console — prueba de propiedad de menius.app (requisito de Google Play
  // para pasar la cuenta de desarrollador a organización). No borrar: si
  // desaparece, Google des-verifica el sitio.
  verification: {
    google: "osDbcIfHrMawx_urBPTNu2I-fXuM7kp6zjh5UJ-0BYk",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No cookies() here: reading a request header in the ROOT layout opts every
  // route into dynamic rendering, which silently disabled the menu's ISR
  // (revalidate=300) — each visit re-rendered 400 products, ~1 s TTFB. The
  // <html lang> is corrected from the menius_locale cookie by the inline
  // script below, before first paint.
  const locale = "es";

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MENIUS",
    url: SITE_URL,
    logo: url("icons/icon-512.svg"),
    sameAs: [
      process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
      process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
      process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
      process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    ].filter(Boolean),
    description:
      "Menú digital con QR y pedidos online para restaurantes independientes.",
  };

  return (
    <html
      lang={locale}
      // globals.css pone scroll-behavior: smooth en <html>: con esto Next lo
      // apaga durante la navegación entre páginas (salto instantáneo arriba),
      // como hacía solo hasta Next 15.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${bricolage.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-white text-gray-900 antialiased font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(/(?:^|; )menius_locale=en(?:;|$)/.test(document.cookie))document.documentElement.lang='en'}catch(e){}`,
          }}
        />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
/* Blocks the iOS root rubber-band at the very top/bottom of the page.
   Two things this must get right:

   1. WHICH element scrolls. On store and dashboard pages the scroller is <body>
      (see globals.css → body[data-store-scroll]/[data-dashboard-scroll]), not
      <html>. Reading documentElement.scrollTop there always returns 0, so the
      old version thought "we're at the top" on every single move and called
      preventDefault() mid-scroll.

   2. Cost per event. This is on the hot path of every touch scroll, so the old
      getComputedStyle() walk up the DOM — a forced style recalc per move — is
      replaced by scrollHeight/clientHeight checks, which read cached layout.

   3. iOS only. A non-passive touchmove on document makes the browser wait for
      the main thread before every scroll. Android/desktop don't need it
      (overscroll-behavior in globals.css already works there) and paid that
      cost anyway: the Counter on a Galaxy Tab A11 scrolled sluggishly. iPadOS
      reports itself as "Macintosh", hence the maxTouchPoints check. */
(function(){
  var ua=navigator.userAgent;
  if(!/iP(hone|ad|od)/.test(ua)&&!(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))return;
  var startY=0;
  function scroller(){
    var b=document.body;
    /* The data attrs are set by StoreScrollFix/DashboardScrollFix while those
       pages are mounted; anywhere else the root is still the scroller. */
    return (b&&(b.hasAttribute('data-store-scroll')||b.hasAttribute('data-dashboard-scroll')))
      ? b : document.documentElement;
  }
  document.addEventListener('touchstart',function(e){startY=e.touches[0].pageY;},{passive:true});
  document.addEventListener('touchmove',function(e){
    var root=scroller();
    /* Inside a nested scrollable (category rail, bottom sheet, modal) let iOS
       handle it — only the page-level scroller gets clamped. */
    var el=e.target;
    while(el&&el!==root&&el!==document.documentElement){
      if(el.scrollHeight>el.clientHeight+1)return;
      el=el.parentElement;
    }
    var st=root.scrollTop;
    var dy=e.touches[0].pageY-startY;
    if((st<=1&&dy>0)||(st+root.clientHeight>=root.scrollHeight-1&&dy<0))e.preventDefault();
  },{passive:false});
})();
        `,
          }}
        />
        {children}
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        <CookieConsent />
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
            // Captured BEFORE register: on a first visit the fresh SW's
            // clients.claim() fires controllerchange on this same page — that
            // is not a deploy, so it must not trigger a reload.
            var hadController = !!navigator.serviceWorker.controller;
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
            // Auto-reload when a new SW takes control (deploy happened): the SW
            // does skipWaiting + clients.claim, so open tabs would keep serving
            // stale HTML whose /_next chunks no longer exist (chunk-load errors
            // on all-day KDS/Counter tablets). Guard avoids reload loops.
            var reloaded = false;
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              if (!hadController || reloaded) return;
              reloaded = true;
              window.location.reload();
            });
          }
        `,
      }}
    />
  );
}
