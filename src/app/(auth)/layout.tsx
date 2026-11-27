import { cookies, headers } from 'next/headers';
import { LocaleProvider } from '@/providers/locale-provider';
import type { Metadata } from 'next';
import { V2Page } from '@/components/landing-v2/V2Page';
import { V2AuthNavCta } from '@/components/landing-v2/V2AuthNavCta';
import { getLandingV2Copy, resolveLandingV2Locale } from '@/lib/landing-v2-copy';
import { isCounterAppUserAgent } from '@/lib/safe-next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  // Login dentro de la app Counter (WebView): sin links del nav ni pie de
  // marketing desde el primer render (el UA es el mismo que usa el middleware).
  const inApp = isCounterAppUserAgent((await headers()).get('user-agent'));
  const nav = getLandingV2Copy(locale).nav;
  return (
    <LocaleProvider locale={locale}>
      <V2Page
        locale={locale}
        inApp={inApp}
        ctaSlot={<V2AuthNavCta tryLabel={nav.tryPro} signInLabel={nav.signIn} />}
      >
        {children}
      </V2Page>
    </LocaleProvider>
  );
}
