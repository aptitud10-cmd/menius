import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import PublicSupportPage from './PublicSupportPage';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es';
  return locale === 'en'
    ? {
        title: 'Support — MENIUS',
        description: 'Help center and support for MENIUS users. Get answers, contact our team and find resources.',
      }
    : {
        title: 'Soporte — MENIUS',
        description: 'Centro de ayuda y soporte para usuarios de MENIUS. Resuelve dudas, contacta a nuestro equipo y encuentra recursos.',
      };
}

export default async function SupportPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es';
  return <PublicSupportPage locale={locale} />;
}
