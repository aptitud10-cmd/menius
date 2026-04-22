import { cookies } from 'next/headers';
import { LocaleProvider } from '@/providers/locale-provider';
import type { Metadata } from 'next';
import type { LandingLocale } from '@/lib/landing-translations';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
