import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocalizedBlogPosts, getLocalizedCategories } from '@/lib/blog-data';
import { resolveLandingV2Locale, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { V2Page } from '@/components/landing-v2/V2Page';
import { V2BlogIndex } from '@/components/blog/V2BlogIndex';

export const metadata: Metadata = {
  title: 'Blog — Recursos para restaurantes',
  description: 'Artículos, guías y recursos sobre menús digitales, pedidos online, códigos QR, marketing para restaurantes y más.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog MENIUS — Recursos para restaurantes',
    description: 'Artículos, guías y recursos para digitalizar y hacer crecer tu restaurante.',
    type: 'website',
  },
};

function getPageText(locale: LandingV2Locale) {
  if (locale === 'en') return {
    badge: 'Blog',
    title: 'Restaurant Resources',
    subtitle: 'Guides, strategies, and trends to digitize and grow your restaurant.',
  };
  return {
    badge: 'Blog',
    title: 'Recursos para restaurantes',
    subtitle: 'Guías, estrategias y tendencias para digitalizar y hacer crecer tu restaurante.',
  };
}

export default async function BlogPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  const pt = getPageText(locale);
  const posts = getLocalizedBlogPosts(locale);
  const categories = getLocalizedCategories(locale);

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph ph-split">
          <div className="wrap">
            <div>
              <span className="stamp label">{pt.badge}</span>
              <h1>{pt.title}</h1>
            </div>
            <p className="lead">{pt.subtitle}</p>
          </div>
        </header>
        <V2BlogIndex posts={posts} categories={categories} locale={locale} />
      </main>
    </V2Page>
  );
}
