import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';
import { LandingNav } from '@/components/landing/LandingNav';

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#050505] overflow-x-hidden w-full max-w-[100vw]">
      <LandingNav />

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="bg-[#050505] border-t border-white/[0.06]">
        <div className="max-w-[1140px] mx-auto px-5 py-10 md:py-14">
          {/* Mobile footer */}
          <div className="md:hidden space-y-8">
            <div>
              <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
                <span className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">M</span>
                MENIUS
              </Link>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                Menús digitales y pedidos directos para restaurantes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Producto</h4>
                <ul className="space-y-2.5">
                  <li><a href="#producto" className="text-sm text-gray-500 hover:text-white transition-colors">Funciones</a></li>
                  <li><a href="#precios" className="text-sm text-gray-500 hover:text-white transition-colors">Precios</a></li>
                  <li><Link href="/r/demo" className="text-sm text-gray-500 hover:text-white transition-colors">Demo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recursos</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/faq" className="text-sm text-gray-500 hover:text-white transition-colors">FAQ</Link></li>
                  <li><a href="mailto:soportemenius@gmail.com" className="text-sm text-gray-500 hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/privacy" className="text-xs text-gray-600 hover:text-white transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-xs text-gray-600 hover:text-white transition-colors">Términos</Link>
              <Link href="/cookies" className="text-xs text-gray-600 hover:text-white transition-colors">Cookies</Link>
            </div>

            <div className="border-t border-white/[0.06] pt-5">
              <p className="text-xs text-gray-600" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS</p>
            </div>
          </div>

          {/* Desktop footer */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-1">
                <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
                  <span className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">M</span>
                  MENIUS
                </Link>
                <p className="text-[13px] text-gray-500 mt-4 leading-relaxed max-w-[200px]">
                  Menús digitales y pedidos directos para restaurantes.
                </p>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                <ul className="space-y-2.5">
                  <li><a href="#producto" className="text-[13px] text-gray-500 hover:text-white transition-colors">Funciones</a></li>
                  <li><a href="#precios" className="text-[13px] text-gray-500 hover:text-white transition-colors">Precios</a></li>
                  <li><Link href="/r/demo" className="text-[13px] text-gray-500 hover:text-white transition-colors">Demo en vivo</Link></li>
                  <li><Link href="/r/buccaneer-diner" className="text-[13px] text-gray-500 hover:text-white transition-colors">Demo (English)</Link></li>
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

            <div className="h-px bg-white/[0.06] mt-10 mb-6" />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-600" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
              <p className="text-[11px] text-gray-600">
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
