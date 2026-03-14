import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocalizedBlogPosts, getLocalizedCategories } from '@/lib/blog-data';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { LandingLocale } from '@/lib/landing-translations';
import { BlogGrid } from '@/components/blog/BlogGrid';

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

function getPageText(locale: LandingLocale) {
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
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as LandingLocale;
  const pt = getPageText(locale);
  const posts = getLocalizedBlogPosts(locale);
  const categories = getLocalizedCategories(locale);

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav locale={locale} />

      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] font-medium mb-5">{pt.badge}</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">{pt.title}</h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto font-light">{pt.subtitle}</p>
        </div>
      </section>

      <BlogGrid posts={posts} categories={categories} locale={locale} />

      <LandingFooter locale={locale} />
    </div>
  );
}
