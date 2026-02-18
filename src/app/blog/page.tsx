import Link from 'next/link';
import type { Metadata } from 'next';
import { blogPosts } from '@/lib/blog-data';
import { LandingNav } from '@/components/landing/LandingNav';

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
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Blog</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">
            Recursos para restaurantes
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto font-light">
            Guías, estrategias y tendencias para digitalizar y hacer crecer tu restaurante.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            <span className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black">
              Todos ({blogPosts.length})
            </span>
            {categories.map((cat) => (
              <span key={cat} className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                {cat}
              </span>
            ))}
          </nav>
        </div>
      </section>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-20">
        {/* Featured */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-16">
          <div className="relative rounded-2xl card-premium p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 left-0 w-[400px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                  {featured.category}
                </span>
                <span className="text-xs text-gray-500">{featured.readTime} min de lectura</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4 group-hover:text-purple-300 transition-colors duration-300 leading-tight tracking-tight">
                {featured.title}
              </h2>
              <p className="text-gray-400 leading-relaxed max-w-2xl mb-6 font-light">
                {featured.description}
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
                Leer artículo
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </span>
            </div>
          </div>
        </Link>

        <div className="separator-gradient max-w-3xl mx-auto mb-16" />

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article className="h-full flex flex-col p-6 rounded-2xl card-premium hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-semibold">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-gray-600">{post.readTime} min</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-3 leading-snug group-hover:text-purple-300 transition-colors duration-300 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">
                  {post.description}
                </p>
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-gray-600">{formatDate(post.date)}</span>
                  <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                    Leer →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 relative text-center rounded-2xl overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              ¿Listo para digitalizar tu restaurante?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-light">
              Crea tu menú digital en minutos. Sin tarjeta de crédito. 14 días de prueba gratis.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all"
              >
                Ver demo en vivo
              </Link>
            </div>
          </div>
        </div>
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
                  <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
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
