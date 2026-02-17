import Link from 'next/link';
import type { Metadata } from 'next';
import { blogPosts } from '@/lib/blog-data';

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

const categories = Array.from(new Set(blogPosts.map((p) => p.category)));

export default function BlogPage() {
  const featured = blogPosts[0];
  const rest = blogPosts.slice(1);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-brand-950/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#funciones" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">Funciones</Link>
            <Link href="/#precios" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">Precios</Link>
            <Link href="/blog" className="text-[13px] text-white font-medium">Blog</Link>
            <Link href="/r/demo" className="text-[13px] text-brand-400 font-medium hover:text-brand-300 transition-colors duration-300">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors duration-300 hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-[13px] font-semibold px-5 py-2.5 rounded-xl bg-brand-500 text-brand-950 hover:bg-brand-400 transition-all duration-300 shadow-lg shadow-brand-500/20">
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-brand-950 pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.15em] mb-4">Blog</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white font-heading mb-5">
            Recursos para restaurantes
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
            Guías, estrategias y tendencias para digitalizar y hacer crecer tu restaurante.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            <span className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-brand-700 bg-brand-50">
              Todos ({blogPosts.length})
            </span>
            {categories.map((cat) => (
              <span key={cat} className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-gray-500">
                {cat}
              </span>
            ))}
          </nav>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-16 md:py-20">
        {/* Featured */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-16">
          <div className="relative rounded-3xl bg-brand-950 p-8 md:p-12 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute inset-0 mesh-gradient" />
            <div className="absolute inset-0 noise" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold">
                  {featured.category}
                </span>
                <span className="text-xs text-gray-500">{featured.readTime} min de lectura</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-heading mb-4 group-hover:text-brand-300 transition-colors duration-300 leading-tight">
                {featured.title}
              </h2>
              <p className="text-gray-400 leading-relaxed max-w-2xl mb-6">
                {featured.description}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 group-hover:text-brand-300 transition-colors duration-300">
                Leer artículo
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </span>
            </div>
          </div>
        </Link>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article className="h-full flex flex-col p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg hover:border-brand-100 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-[11px] font-semibold">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-gray-400">{post.readTime} min</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug group-hover:text-brand-700 transition-colors duration-300 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">
                  {post.description}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
                  <span className="text-xs font-semibold text-brand-600 group-hover:text-brand-700 transition-colors">
                    Leer →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center rounded-2xl bg-gray-50 border border-gray-200 p-10 md:p-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 font-heading mb-4">
            ¿Listo para digitalizar tu restaurante?
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            Crea tu menú digital en minutos. Sin tarjeta de crédito. 14 días de prueba gratis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-500 text-brand-950 font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-all duration-300"
            >
              Crear cuenta gratis →
            </Link>
            <Link
              href="/r/demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:border-brand-200 hover:text-brand-700 transition-all duration-300"
            >
              Ver demo en vivo
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-950 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight font-heading">
              <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
              <Link href="/faq" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">FAQ</Link>
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
