import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe landing-bg overflow-x-hidden relative noise-overlay">
      {/* ── Nav ── */}
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            MENIUS
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funciones" className="text-sm text-gray-500 hover:text-white transition-colors">Funciones</a>
            <a href="#precios" className="text-sm text-gray-500 hover:text-white transition-colors">Precios</a>
            <Link href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors">Blog</Link>
            <Link href="/faq" className="text-sm text-gray-500 hover:text-white transition-colors">FAQ</Link>
            <Link href="/r/demo" className="text-sm text-gray-500 hover:text-white transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm text-gray-500 hover:text-white transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-sm font-medium px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-all btn-glow">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/[0.04] overflow-hidden">
        {/* Large faded logo watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
          <span className="text-[12rem] md:text-[18rem] font-bold text-white/[0.015] tracking-tight leading-none">
            MENIUS
          </span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="text-lg font-bold tracking-tight text-white">
                MENIUS
              </Link>
              <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-xs">
                Menús digitales, pedidos en línea y analytics para restaurantes modernos.
              </p>
              <div className="flex items-center gap-2.5 mt-6">
                {['SSL', 'Stripe', 'CCPA'].map((b) => (
                  <span key={b} className="px-3 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] text-gray-600 font-medium tracking-wide">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-[0.15em] mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li><a href="#funciones" className="text-sm text-gray-500 hover:text-white transition-colors">Funciones</a></li>
                <li><a href="#precios" className="text-sm text-gray-500 hover:text-white transition-colors">Precios</a></li>
                <li><Link href="/r/demo" className="text-sm text-gray-500 hover:text-white transition-colors">Demo en vivo</Link></li>
                <li><Link href="/r/buccaneer-diner" className="text-sm text-gray-500 hover:text-white transition-colors">Demo (English)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-[0.15em] mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="text-sm text-gray-500 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/setup-profesional" className="text-sm text-gray-500 hover:text-white transition-colors">Setup profesional</Link></li>
                <li><a href="mailto:soporte@menius.app" className="text-sm text-gray-500 hover:text-white transition-colors">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-500 hover:text-white transition-colors">Términos</Link></li>
                <li><Link href="/cookies" className="text-sm text-gray-500 hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="separator-gradient" />
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-700">&copy; {new Date().getFullYear()} MENIUS Inc.</p>
            <p className="text-xs text-gray-700">Hecho en <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">Scuart Digital</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
