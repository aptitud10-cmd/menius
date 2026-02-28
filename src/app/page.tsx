import { cookies } from 'next/headers';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';

export default function LandingPage() {
  const cookieStore = cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;

  return (
    <div className="landing-bg relative w-full max-w-[100vw] overflow-x-hidden overflow-y-auto">
      <LandingNav locale={locale} />
      <LandingHero locale={locale} />
      <LandingSections locale={locale} />
      <LandingFooter locale={locale} />
    </div>
  );
}
