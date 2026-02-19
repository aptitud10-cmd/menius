import Link from 'next/link';
import type { Metadata } from 'next';
import { blogPosts } from '@/lib/blog-data';
import { LandingNav } from '@/components/landing/LandingNav';
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

const categories = Array.from(new Set(blogPosts.map((p) => p.category)));

export default function BlogPage() {
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

      <BlogGrid posts={blogPosts} categories={categories} />

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
