import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { StatusClient } from './StatusClient';

export const metadata: Metadata = {
  title: 'Estado del sistema — MENIUS',
  description: 'Monitoreo en tiempo real de todos los servicios de MENIUS: API, base de datos, pagos, notificaciones y más.',
  alternates: { canonical: '/status' },
};

export default async function StatusPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value ?? 'es') as LandingLocale;

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
