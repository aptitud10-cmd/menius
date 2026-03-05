import { cookies } from 'next/headers';
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
  title: 'MENIUS — Menús digitales inteligentes para restaurantes',
  description: 'La plataforma #1 de menús digitales con QR. Registra tu restaurante, crea tu menú con fotos IA, genera QRs y recibe pedidos en tiempo real.',
  alternates: { canonical: APP_URL },
  openGraph: {
    url: APP_URL,
    title: 'MENIUS — Menús digitales inteligentes para restaurantes',
    description: 'Crea tu menú digital con QR, recibe pedidos en tiempo real, y gestiona tu restaurante desde un solo lugar.',
  },
};

export default async function LandingPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;

  return (
    <div className="landing-bg relative w-full max-w-[100vw] overflow-x-hidden overflow-y-auto">
      <LandingNav locale={locale} />
      <main id="main-content">
        <LandingHero locale={locale} />
        <LandingSections locale={locale} />
      </main>
      <LandingFooter locale={locale} />
    </div>
  );
}
