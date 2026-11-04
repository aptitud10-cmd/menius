import { cookies, headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import dynamic from 'next/dynamic';
import type { Metadata, Viewport } from 'next';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingStickyCta } from '@/components/landing/LandingStickyCta';
import CrispChat from '@/components/CrispChat';
import type { LandingLocale } from '@/lib/landing-translations';
import { createAdminClient } from '@/lib/supabase/admin';

// Lazy-load below-the-fold sections — splits the heavy interactive bundle
// (pricing, calculator, features, FAQ) into a separate chunk so the hero LCP
// is not blocked by it. SSR stays true → SEO and crawlers see the full page.
const LandingSections = dynamic(
  () => import('@/components/landing/LandingSections').then((m) => m.LandingSections),
  { ssr: true }
);

const getPublicStats = unstable_cache(
  async () => {
    try {
      const supabase = createAdminClient();
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'cancelled');
      return { ordersCount: count ?? 0 };
    } catch {
      return { ordersCount: 0 };
    }
  },
  ['landing-public-stats'],
  { revalidate: 3600 }
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export const viewport: Viewport = {
  themeColor: '#050505',
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const isEs = locale === 'es';

  const title = isEs
    ? 'MENIUS — Menú Digital y Pedidos para Restaurantes'
    : 'MENIUS — Smart Digital Menus for Restaurants';

  const description = isEs
    ? 'Menú digital con QR y pedidos online para restaurantes. Recibe pedidos en tiempo real y vende sin la comisión de las apps de delivery: 0% de comisión de MENIUS.'
    : 'QR digital menu and online ordering for restaurants. Get orders in real time and sell without delivery app commissions: 0% MENIUS commission.';

  const ogDescription = isEs
    ? 'Crea tu menú digital con QR, recibe pedidos en tiempo real y gestiona tu restaurante desde un solo lugar. 0% de comisión de MENIUS.'
    : 'Create your digital menu with QR, receive real-time orders, and manage your restaurant from one place. 0% MENIUS commission.';

  return {
    title,
    description,
    alternates: { canonical: APP_URL },
    openGraph: {
      type: 'website',
      siteName: 'MENIUS',
      url: APP_URL,
      title,
      description: ogDescription,
      locale: isEs ? 'es_MX' : 'en_US',
      images: [{ url: `${APP_URL}/opengraph-image`, width: 1200, height: 630, alt: 'MENIUS — Menú digital para restaurantes' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: ogDescription,
      images: [`${APP_URL}/opengraph-image`],
    },
  };
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const isEs = locale === 'es';

  const headerStore = await headers();
  const country = headerStore.get('x-vercel-ip-country') ?? undefined;

  const { ordersCount } = await getPublicStats();

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MENIUS',
    url: APP_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: isEs
      ? 'Menú digital con QR y pedidos online para restaurantes independientes. Pedidos en tiempo real, asistente IA y 0% de comisión de MENIUS.'
      : 'QR digital menu and online ordering for independent restaurants. Real-time orders, AI assistant and 0% MENIUS commission.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: isEs ? 'Plan gratuito disponible' : 'Free plan available',
    },
    author: { '@type': 'Organization', name: 'MENIUS' },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MENIUS',
    url: APP_URL,
    description: isEs
      ? 'Menús digitales y pedidos en línea para restaurantes'
      : 'Digital menus and online ordering for restaurants',
  };

  return (
    <div className="landing-bg relative w-full max-w-[100vw] overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <LandingNav locale={locale} />
      <main id="main-content">
        <LandingHero locale={locale} ordersCount={ordersCount} />
        <LandingSections locale={locale} country={country} />
      </main>
      <LandingStickyCta locale={locale} />
      <LandingFooter locale={locale} />
      <CrispChat desktopOnly />
    </div>
  );
}
