import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import PublicSupportPage from './PublicSupportPage';

async function resolveLocale(searchParams?: Record<string, string>): Promise<'en' | 'es'> {
  const lang = searchParams?.lang;
  if (lang === 'en') return 'en';
  if (lang === 'es') return 'es';
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('menius_locale')?.value;
  if (cookieLocale === 'en') return 'en';
  if (cookieLocale === 'es') return 'es';
  const acceptLang = (await headers()).get('accept-language') ?? '';
  return acceptLang.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string>> }): Promise<Metadata> {
  const locale = await resolveLocale(await searchParams);
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

export default async function SupportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const locale = await resolveLocale(await searchParams);
  return <PublicSupportPage locale={locale} />;
}
