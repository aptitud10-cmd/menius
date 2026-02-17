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

      {/* ── Footer (Resend style) ── */}
      <footer className="relative bg-black overflow-hidden">
        {/* Giant MENIUS watermark — positioned low so columns sit ON TOP of it */}
        <div className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 select-none pointer-events-none">
          <span className="text-[18rem] sm:text-[24rem] md:text-[30rem] lg:text-[38rem] font-bold text-white/[0.035] tracking-tighter leading-none whitespace-nowrap block">
            MENIUS
          </span>
        </div>
        {/* Dark gradient overlay on top half — creates the "behind glass" effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none z-[1]" />

        {/* CTA buttons above footer links */}
        <div className="relative z-10 flex items-center justify-center gap-6 pt-20 pb-16">
          <Link
            href="/signup"
            className="group text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-6 py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
          >
            Empezar gratis
            <span className="group-hover:translate-x-0.5 transition-transform">&rsaquo;</span>
          </Link>
          <Link
            href="mailto:soporte@menius.app"
            className="group text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            Contactar
            <span className="group-hover:translate-x-0.5 transition-transform">&rsaquo;</span>
          </Link>
        </div>

        {/* Footer columns */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
            {/* Col 1: Brand info */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="text-lg font-bold tracking-tight text-white">
                MENIUS
              </Link>
              <p className="text-[13px] text-gray-600 mt-4 leading-relaxed max-w-[200px]">
                Menús digitales y pedidos en línea para restaurantes.
              </p>
              <div className="flex items-center gap-2 mt-5">
                {['SSL', 'Stripe', 'CCPA'].map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-[9px] text-gray-600 font-medium tracking-wide">
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-700 mt-5">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Scuart Digital
                </a>
              </p>
            </div>

            {/* Col 2: Producto */}
            <div>
              <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li><a href="#funciones" className="text-[13px] text-gray-600 hover:text-white transition-colors">Funciones</a></li>
                <li><a href="#precios" className="text-[13px] text-gray-600 hover:text-white transition-colors">Precios</a></li>
                <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo en vivo</Link></li>
                <li><Link href="/r/buccaneer-diner" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo (English)</Link></li>
              </ul>
            </div>

            {/* Col 3: Recursos */}
            <div>
              <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/setup-profesional" className="text-[13px] text-gray-600 hover:text-white transition-colors">Setup profesional</Link></li>
                <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div>
              <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-white transition-colors">Términos</Link></li>
                <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="separator-gradient mt-12" />
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-700" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
