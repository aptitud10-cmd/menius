import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost, getRelatedPosts } from '@/lib/blog-data';
import { BlogContent } from '@/components/blog/BlogContent';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return { title: 'Artículo no encontrado' };

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default function BlogPostPage({ params }: PageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const related = getRelatedPosts(params.slug, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'MENIUS' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app'}/blog/${post.slug}` },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-brand-950/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/blog" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">← Blog</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="text-[13px] font-semibold px-5 py-2.5 rounded-xl bg-brand-500 text-brand-950 hover:bg-brand-400 transition-all duration-300 shadow-lg shadow-brand-500/20">
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <section className="relative bg-brand-950 pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/blog" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Blog</Link>
            <span className="text-gray-600">/</span>
            <span className="px-2.5 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-[11px] font-semibold">
              {post.category}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white font-heading leading-tight mb-6">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readTime} min de lectura</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <BlogContent content={post.content} />

        {/* Author + CTA */}
        <div className="mt-16 p-8 rounded-2xl bg-brand-950 relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient" />
          <div className="absolute inset-0 noise" />
          <div className="relative z-10 text-center">
            <h3 className="text-xl font-extrabold text-white font-heading mb-3">
              ¿Listo para empezar?
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Crea tu menú digital en minutos. 14 días gratis, sin tarjeta de crédito.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-brand-500 text-brand-950 font-bold text-sm shadow-lg shadow-brand-500/25 hover:bg-brand-400 transition-all duration-300"
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-7 py-3 rounded-xl glass text-white font-semibold text-sm hover:bg-white/10 transition-all duration-300"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="text-lg font-bold text-gray-900 font-heading mb-6">Artículos relacionados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                  <article className="h-full p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md hover:border-brand-100 transition-all duration-300">
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-semibold">
                      {r.category}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-3 mb-2 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2">
                      {r.title}
                    </h4>
                    <p className="text-xs text-gray-500">{r.readTime} min · {formatDate(r.date)}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-brand-950 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight font-heading">
              <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/blog" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Blog</Link>
              <Link href="/faq" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">FAQ</Link>
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
            </div>
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} MENIUS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}
