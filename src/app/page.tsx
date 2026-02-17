import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe bg-black overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <a href="#funciones" className="text-[13px] text-gray-500 hover:text-white transition-colors">Funciones</a>
            <a href="#precios" className="text-[13px] text-gray-500 hover:text-white transition-colors">Precios</a>
            <Link href="/blog" className="text-[13px] text-gray-500 hover:text-white transition-colors">Blog</Link>
            <Link href="/faq" className="text-[13px] text-gray-500 hover:text-white transition-colors">FAQ</Link>
            <Link href="/r/demo" className="text-[13px] text-brand-400 hover:text-brand-300 transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px] text-gray-500 hover:text-white transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-100 transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="bg-black border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="text-lg font-bold tracking-tight font-heading">
                <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
              </Link>
              <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-xs">
                Menús digitales, pedidos en línea y analytics para restaurantes modernos.
              </p>
              <div className="flex items-center gap-2.5 mt-6">
                {['SSL', 'Stripe', 'CCPA'].map((b) => (
                  <span key={b} className="px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] text-gray-600 font-medium tracking-wide">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li><a href="#funciones" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Funciones</a></li>
                <li><a href="#precios" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Precios</a></li>
                <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Demo en vivo</Link></li>
                <li><Link href="/r/buccaneer-diner" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Demo (English)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">FAQ</Link></li>
                <li><Link href="/setup-profesional" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Setup profesional</Link></li>
                <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Términos</Link></li>
                <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-gray-300 transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="line-gradient" />
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-gray-700">&copy; {new Date().getFullYear()} MENIUS Inc.</p>
            <p className="text-[11px] text-gray-700">Hecho en New York</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
