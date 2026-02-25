import { cookies } from 'next/headers';
import { LocaleProvider } from '@/providers/locale-provider';
import type { LandingLocale } from '@/lib/landing-translations';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  return <LocaleProvider locale={locale}>{children}</LocaleProvider>;
}
