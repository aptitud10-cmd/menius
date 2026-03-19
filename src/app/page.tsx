import { cookies, headers } from 'next/headers';
import type { Metadata, Viewport } from 'next';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export const viewport: Viewport = {
  themeColor: '#050505',
};

export const metadata: Metadata = {
  title: 'MENIUS — Smart Digital Menus for Restaurants',
  description: 'The #1 digital menu platform with QR codes. Register your restaurant, create your menu with AI photos, generate QR codes and receive orders in real time. La plataforma #1 de menús digitales con QR para restaurantes.',
  alternates: { canonical: APP_URL },
  openGraph: {
    url: APP_URL,
    title: 'MENIUS — Smart Digital Menus for Restaurants',
    description: 'Create your digital menu with QR, receive real-time orders, and manage your restaurant from one place.',
    images: [{ url: `${APP_URL}/opengraph-image`, width: 1200, height: 630, alt: 'MENIUS — Digital menu for restaurants' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MENIUS — Smart Digital Menus for Restaurants',
    description: 'Create your digital menu with QR, receive real-time orders, and manage your restaurant from one place.',
    images: [`${APP_URL}/opengraph-image`],
  },
};

export default async function LandingPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;

  const headerStore = await headers();
  const country = headerStore.get('x-vercel-ip-country') ?? undefined;

  return (
    <div className="landing-bg relative w-full max-w-[100vw] overflow-x-hidden overflow-y-auto">
      <LandingNav locale={locale} />
      <main id="main-content">
        <LandingHero locale={locale} />
        <LandingSections locale={locale} country={country} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  );
}
