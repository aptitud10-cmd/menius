import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';
import { LandingNav } from '@/components/landing/LandingNav';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      <LandingHero />
      <LandingSections />

      {/* ── Footer (Resend style) ── */}
      <footer className="relative bg-black overflow-hidden">

        {/* ── Layer 1: Giant MENIUS watermark — centered, visible top half ── */}
        <div className="relative flex justify-center pt-12 pb-0 select-none pointer-events-none" aria-hidden="true">
          <span className="text-[16rem] sm:text-[22rem] md:text-[28rem] lg:text-[36rem] font-bold text-white/[0.04] tracking-tighter leading-none whitespace-nowrap">
            MENIUS
          </span>
        </div>

        {/* ── Layer 2: CTA buttons — sit on top of the watermark ── */}
        <div className="relative z-10 -mt-[14rem] sm:-mt-[18rem] md:-mt-[22rem] lg:-mt-[28rem] flex items-center justify-center gap-6 pt-8 pb-16">
          <Link
            href="/signup"
            className="group text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 px-7 py-3 rounded-full border border-white/[0.12] hover:border-white/[0.25] hover:bg-white/[0.04] backdrop-blur-sm"
          >
            Empezar gratis
            <span className="group-hover:translate-x-0.5 transition-transform">&rsaquo;</span>
          </Link>
          <Link
            href="mailto:soporte@menius.app"
            className="group text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-7 py-3"
          >
            Contactar
            <span className="group-hover:translate-x-0.5 transition-transform">&rsaquo;</span>
          </Link>
        </div>

        {/* ── Layer 3: Footer columns — solid black bg covers bottom half of watermark ── */}
        <div className="relative z-10 bg-black pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-6">
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
              <p className="text-[11px] text-gray-700">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">
                  Scuart Digital
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
