import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { resolveLandingV2Locale } from '@/lib/landing-v2-copy';
import { V2Page } from '@/components/landing-v2/V2Page';
import { StatusClient } from './StatusClient';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
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
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);

  return (
    <V2Page locale={locale}>
      <StatusClient locale={locale} />
    </V2Page>
  );
}
