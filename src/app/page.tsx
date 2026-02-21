import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';
import { LandingNav } from '@/components/landing/LandingNav';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe landing-bg overflow-x-hidden overflow-y-auto relative noise-overlay w-full max-w-[100vw]">
      <LandingNav />

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="relative bg-black overflow-hidden">

        {/* Giant MENIUS watermark -- hidden on mobile, visible on md+ */}
        <div className="relative hidden md:flex justify-center pt-12 pb-0 select-none pointer-events-none" aria-hidden="true">
          <span className="text-[19rem] lg:text-[25rem] font-bold text-white/[0.04] tracking-tighter leading-none whitespace-nowrap">
            MENIUS
          </span>
        </div>

        <div className="relative z-10 md:-mt-[7rem] lg:-mt-[9rem] bg-black pt-10 md:pt-10 pb-10 md:pb-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-6">

            {/* Mobile footer: simplified stacked layout */}
            <div className="md:hidden space-y-6">
              <div>
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">
                  Menús digitales y pedidos en línea para restaurantes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Producto</h4>
                  <ul className="space-y-2.5">
                    <li><a href="#funciones" className="text-sm text-gray-400 hover:text-white transition-colors">Funciones</a></li>
                    <li><a href="#precios" className="text-sm text-gray-400 hover:text-white transition-colors">Precios</a></li>
                    <li><Link href="/r/demo" className="text-sm text-gray-400 hover:text-white transition-colors">Demo</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recursos</h4>
                  <ul className="space-y-2.5">
                    <li><Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                    <li><Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
                    <li><a href="mailto:soportemenius@gmail.com" className="text-sm text-gray-400 hover:text-white transition-colors">Soporte</a></li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <Link href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors">Privacidad</Link>
                <Link href="/terms" className="text-xs text-gray-500 hover:text-white transition-colors">Términos</Link>
                <Link href="/cookies" className="text-xs text-gray-500 hover:text-white transition-colors">Cookies</Link>
              </div>

              <div className="border-t border-white/[0.06] pt-5 flex items-center justify-between">
                <p className="text-xs text-gray-500" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS</p>
                <div className="flex items-center gap-2">
                  {['SSL', 'Stripe'].map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-[9px] text-gray-500 font-medium tracking-wide">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop footer: full columns */}
            <div className="hidden md:block">
              <div className="grid grid-cols-5 gap-x-8 gap-y-10">
                <div className="col-span-1">
                  <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                  <p className="text-[13px] text-gray-500 mt-4 leading-relaxed max-w-[200px]">
                    Menús digitales y pedidos en línea para restaurantes.
                  </p>
                  <div className="flex items-center gap-2 mt-5">
                    {['SSL', 'Stripe', 'CCPA'].map((b) => (
                      <span key={b} className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-[9px] text-gray-500 font-medium tracking-wide">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                  <ul className="space-y-2.5">
                    <li><a href="#funciones" className="text-[13px] text-gray-500 hover:text-white transition-colors">Funciones</a></li>
                    <li><a href="#precios" className="text-[13px] text-gray-500 hover:text-white transition-colors">Precios</a></li>
                    <li><Link href="/r/demo" className="text-[13px] text-gray-500 hover:text-white transition-colors">Demo en vivo</Link></li>
                    <li><Link href="/r/the-grill-house" className="text-[13px] text-gray-500 hover:text-white transition-colors">Demo (English)</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
                  <ul className="space-y-2.5">
                    <li><Link href="/blog" className="text-[13px] text-gray-500 hover:text-white transition-colors">Blog</Link></li>
                    <li><Link href="/faq" className="text-[13px] text-gray-500 hover:text-white transition-colors">FAQ</Link></li>
                    <li><Link href="/setup-profesional" className="text-[13px] text-gray-500 hover:text-white transition-colors">Setup profesional</Link></li>
                    <li><a href="mailto:soportemenius@gmail.com" className="text-[13px] text-gray-500 hover:text-white transition-colors">Soporte</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
                  <ul className="space-y-2.5">
                    <li><Link href="/privacy" className="text-[13px] text-gray-500 hover:text-white transition-colors">Privacidad</Link></li>
                    <li><Link href="/terms" className="text-[13px] text-gray-500 hover:text-white transition-colors">Términos</Link></li>
                    <li><Link href="/cookies" className="text-[13px] text-gray-500 hover:text-white transition-colors">Cookies</Link></li>
                  </ul>
                </div>
              </div>

              <div className="separator-gradient mt-12" />
              <div className="pt-6 flex items-center justify-between gap-3">
                <p className="text-[11px] text-gray-500" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
                <p className="text-[11px] text-gray-500">
                  Hecho en{' '}
                  <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-200 transition-colors">
                    Scuart Digital
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
