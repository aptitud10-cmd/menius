import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost, getRelatedPosts } from '@/lib/blog-data';
import { BlogContent } from '@/components/blog/BlogContent';
import { LandingNav } from '@/components/landing/LandingNav';

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
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <LandingNav />

      {/* Article Header */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/blog" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Blog</Link>
            <span className="text-gray-700">/</span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
              {post.category}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight mb-6 tracking-tight">
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

      <div className="separator-gradient max-w-3xl mx-auto" />

      {/* Article Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-16">
        <BlogContent content={post.content} />

        {/* CTA */}
        <div className="mt-16 relative rounded-2xl card-premium p-8 md:p-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />
          <div className="relative z-10 text-center">
            <h3 className="text-xl font-semibold text-white mb-3">
              ¿Listo para empezar?
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm leading-relaxed font-light">
              Crea tu menú digital en minutos. 14 días gratis, sin tarjeta de crédito.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-all btn-glow"
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-3 rounded-xl border border-white/10 text-gray-400 font-medium text-sm hover:text-white hover:border-white/20 transition-all"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h3 className="text-lg font-semibold text-white mb-6">Artículos relacionados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                  <article className="h-full p-5 rounded-2xl card-premium hover:-translate-y-1 transition-all duration-300">
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-semibold">
                      {r.category}
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-3 mb-2 leading-snug group-hover:text-purple-300 transition-colors line-clamp-2">
                      {r.title}
                    </h4>
                    <p className="text-xs text-gray-600">{r.readTime} min · {formatDate(r.date)}</p>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative bg-black overflow-hidden">
        <div className="separator-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 bg-black pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-600 mt-4 leading-relaxed max-w-[200px]">Menús digitales y pedidos en línea para restaurantes.</p>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/#funciones" className="text-[13px] text-gray-600 hover:text-white transition-colors">Funciones</Link></li>
                  <li><Link href="/#precios" className="text-[13px] text-gray-600 hover:text-white transition-colors">Precios</Link></li>
                  <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo en vivo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-white transition-colors">FAQ</Link></li>
                  <li><a href="mailto:soportemenius@gmail.com" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-white transition-colors">Privacidad</Link></li>
                  <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-white transition-colors">Términos</Link></li>
                  <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-white transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
            <div className="separator-gradient mt-12" />
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-700" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
              <p className="text-[11px] text-gray-700">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">Scuart Digital</a>
              </p>
            </div>
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
