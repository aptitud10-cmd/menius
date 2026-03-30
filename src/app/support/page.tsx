import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import PublicSupportPage from './PublicSupportPage';

async function resolveLocale(): Promise<'en' | 'es'> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('menius_locale')?.value;
  if (cookieLocale === 'en') return 'en';
  if (cookieLocale === 'es') return 'es';
  const acceptLang = (await headers()).get('accept-language') ?? '';
  return acceptLang.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
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
  const locale = await resolveLocale();
  return <PublicSupportPage locale={locale} />;
}
