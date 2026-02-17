import Link from 'next/link';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingSections } from '@/components/landing/LandingSections';

export default function LandingPage() {
  return (
    <div className="min-h-screen-safe bg-black overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-[#111]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[17px] font-bold tracking-tight">
            <span className="text-white">MENIUS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <a href="#funciones" className="text-[13px] text-[#666] hover:text-white transition-colors">Funciones</a>
            <a href="#precios" className="text-[13px] text-[#666] hover:text-white transition-colors">Precios</a>
            <Link href="/blog" className="text-[13px] text-[#666] hover:text-white transition-colors">Blog</Link>
            <Link href="/faq" className="text-[13px] text-[#666] hover:text-white transition-colors">FAQ</Link>
            <Link href="/r/demo" className="text-[13px] text-[#666] hover:text-white transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px] text-[#666] hover:text-white transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-[13px] font-medium px-4 py-2 rounded-lg bg-white text-black hover:bg-[#e8e8e8] transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <LandingHero />
      <LandingSections />

      {/* ── Footer ── */}
      <footer className="relative bg-black border-t border-[#111] overflow-hidden">
        {/* Large glass logo behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
          <span className="text-[12rem] md:text-[18rem] font-bold text-[#060606] tracking-tight leading-none">
            MENIUS
          </span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="text-[17px] font-bold tracking-tight">
                <span className="text-white">MENIUS</span>
              </Link>
              <p className="text-[14px] text-[#555] mt-4 leading-relaxed max-w-xs">
                Menús digitales, pedidos en línea y analytics para restaurantes modernos.
              </p>
              <div className="flex items-center gap-2.5 mt-6">
                {['SSL', 'Stripe', 'CCPA'].map((b) => (
                  <span key={b} className="px-2.5 py-1 rounded-md border border-[#1a1a1a] bg-[#080808] text-[10px] text-[#444] font-medium tracking-wide">
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-medium text-[#444] uppercase tracking-[0.15em] mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li><a href="#funciones" className="text-[13px] text-[#555] hover:text-white transition-colors">Funciones</a></li>
                <li><a href="#precios" className="text-[13px] text-[#555] hover:text-white transition-colors">Precios</a></li>
                <li><Link href="/r/demo" className="text-[13px] text-[#555] hover:text-white transition-colors">Demo en vivo</Link></li>
                <li><Link href="/r/buccaneer-diner" className="text-[13px] text-[#555] hover:text-white transition-colors">Demo (English)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-medium text-[#444] uppercase tracking-[0.15em] mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><Link href="/blog" className="text-[13px] text-[#555] hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/faq" className="text-[13px] text-[#555] hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/setup-profesional" className="text-[13px] text-[#555] hover:text-white transition-colors">Setup profesional</Link></li>
                <li><a href="mailto:soporte@menius.app" className="text-[13px] text-[#555] hover:text-white transition-colors">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[12px] font-medium text-[#444] uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="text-[13px] text-[#555] hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="/terms" className="text-[13px] text-[#555] hover:text-white transition-colors">Términos</Link></li>
                <li><Link href="/cookies" className="text-[13px] text-[#555] hover:text-white transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="h-px bg-[#111]" />
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#333]">&copy; {new Date().getFullYear()} MENIUS Inc.</p>
            <p className="text-[12px] text-[#333]">Hecho en <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-[#444] hover:text-[#888] transition-colors">Scuart Digital</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
