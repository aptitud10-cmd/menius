'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LandingNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Top bar ── */}
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-5 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            MENIUS
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#funciones" className="text-sm text-gray-400 hover:text-white transition-colors">Funciones</Link>
            <Link href="/#precios" className="text-sm text-gray-400 hover:text-white transition-colors">Precios</Link>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
            <Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link>
            <Link href="/r/demo" className="text-sm text-gray-400 hover:text-white transition-colors">Demo</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-sm font-medium px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-all btn-glow">
              Empezar gratis
            </Link>
          </div>

          {/* Mobile: only login link */}
          <Link href="/login" className="md:hidden text-[13px] font-medium text-gray-400 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/[0.06] safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          <MobileTab href="/" label="Inicio" active={pathname === '/'}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </MobileTab>
          <MobileTab href="/r/demo" label="Demo" active={pathname === '/r/demo'}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </MobileTab>
          <MobileTab href="/#precios" label="Precios" active={false}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </MobileTab>
          <MobileTab href="/signup" label="Registrar" active={pathname === '/signup'} accent>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </MobileTab>
        </div>
      </nav>
    </>
  );
}

function MobileTab({ href, label, active, accent, children }: { href: string; label: string; active: boolean; accent?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1 transition-colors ${
        accent
          ? 'text-purple-400'
          : active
            ? 'text-white'
            : 'text-gray-500 active:text-gray-300'
      }`}
    >
      {children}
      <span className={`text-[10px] font-medium ${accent ? 'text-purple-400' : ''}`}>{label}</span>
    </Link>
  );
}
