import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe bg-white overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="fixed top-0 w-full z-50 bg-brand-950/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funciones" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">Funciones</a>
            <a href="#precios" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">Precios</a>
            <Link href="/blog" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">Blog</Link>
            <Link href="/faq" className="text-[13px] text-gray-400 hover:text-white transition-colors duration-300">FAQ</Link>
            <Link href="/r/demo" className="text-[13px] text-brand-400 font-medium hover:text-brand-300 transition-colors duration-300">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors duration-300 hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-[13px] font-semibold px-5 py-2.5 rounded-xl bg-brand-500 text-brand-950 hover:bg-brand-400 transition-all duration-300 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30">
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="bg-brand-950 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="text-xl font-bold tracking-tight font-heading">
                <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
              </Link>
              <p className="text-sm text-gray-500 mt-4 leading-relaxed max-w-xs">
                La plataforma de menús digitales y pedidos en línea para restaurantes modernos.
              </p>
              <div className="flex items-center gap-3 mt-6">
                {[
                  { icon: '🔒', text: 'SSL' },
                  { icon: '💳', text: 'Stripe' },
                  { icon: '📋', text: 'CCPA' },
                ].map((b) => (
                  <span key={b.text} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-gray-500">
                    {b.icon} {b.text}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Producto</h4>
              <ul className="space-y-3">
                <li><a href="#funciones" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Funciones</a></li>
                <li><a href="#precios" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Precios</a></li>
                <li><Link href="/r/demo" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Demo en vivo</Link></li>
                <li><Link href="/r/buccaneer-diner" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Demo (English)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Recursos</h4>
              <ul className="space-y-3">
                <li><Link href="/blog" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">FAQ</Link></li>
                <li><Link href="/setup-profesional" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Setup profesional</Link></li>
                <li><a href="mailto:soporte@menius.app" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">soporte@menius.app</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Términos</Link></li>
                <li><Link href="/cookies" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} MENIUS Inc. All rights reserved.</p>
            <p className="text-xs text-gray-600">Hecho con ♥ en New York</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
