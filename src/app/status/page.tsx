import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { StatusClient } from './StatusClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value ?? 'es';
  return {
    title: locale === 'en' ? 'System Status — MENIUS' : 'Estado del sistema — MENIUS',
    description: locale === 'en'
      ? 'Real-time monitoring of all MENIUS services: API, database, payments, notifications and more.'
      : 'Monitoreo en tiempo real de todos los servicios de MENIUS: API, base de datos, pagos, notificaciones y más.',
    alternates: { canonical: '/status' },
  };
}

export default async function StatusPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value ?? 'es') as LandingLocale;

  return (
    <>
      <LandingNav locale={locale} />
      <main className="min-h-screen bg-white pt-24 pb-20">
        <StatusClient locale={locale} />
      </main>
      <LandingFooter locale={locale} />
    </>
  );
}
