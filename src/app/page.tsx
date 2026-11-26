import { cookies } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { LandingV2 } from '@/components/landing-v2/LandingV2';
import CrispChat from '@/components/CrispChat';
import { getLandingV2Copy, resolveLandingV2Locale, PRO_MONTHLY, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { TRIAL_DAYS } from '@/lib/plans';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export const viewport: Viewport = {
  themeColor: '#F6F1E7',
};

async function getLocale(): Promise<LandingV2Locale> {
  const cookieStore = await cookies();
  return resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isEs = locale === 'es';
  const m = getLandingV2Copy(locale).meta;
  // El layout raíz agrega " | MENIUS" (title.template).
  const ogTitle = `${m.title} | MENIUS`;

  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: APP_URL },
    openGraph: {
      type: 'website',
      siteName: 'MENIUS',
      url: APP_URL,
      title: ogTitle,
      description: m.description,
      locale: isEs ? 'es_MX' : 'en_US',
      images: [{ url: `${APP_URL}/opengraph-image`, width: 1200, height: 630, alt: m.ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: m.description,
      images: [`${APP_URL}/opengraph-image`],
    },
  };
}

export default async function LandingPage() {
  const locale = await getLocale();
  const isEs = locale === 'es';
  const m = getLandingV2Copy(locale).meta;

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MENIUS',
    url: APP_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android',
    description: m.schemaDescription,
    offers: {
      '@type': 'Offer',
      name: 'MENIUS Pro',
      price: String(PRO_MONTHLY),
      priceCurrency: 'USD',
      description: isEs
        ? `Plan Pro, $${PRO_MONTHLY} al mes, 0% de comisión. Prueba gratis de ${TRIAL_DAYS} días.`
        : `Pro plan, $${PRO_MONTHLY} a month, 0% commission. ${TRIAL_DAYS}-day free trial.`,
    },
    author: { '@type': 'Organization', name: 'MENIUS' },
  };

  const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MENIUS',
    url: APP_URL,
    description: m.siteDescription,
  };

  return (
    <LandingV2 locale={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }} />
      <CrispChat desktopOnly />
    </LandingV2>
  );
}
