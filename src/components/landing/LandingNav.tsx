'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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

        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">
            Iniciar sesión
          </Link>
          <Link href="/signup" className="text-xs sm:text-sm font-medium px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-all btn-glow">
            Empezar gratis
          </Link>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden relative w-8 h-8 flex items-center justify-center"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            <span className={`block absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? 'rotate-45' : '-translate-y-1.5'}`} />
            <span className={`block absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`block absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? '-rotate-45' : 'translate-y-1.5'}`} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[#050505]/95 backdrop-blur-2xl border-b border-white/[0.04] animate-fade-in">
          <nav className="flex flex-col px-6 py-6 gap-1">
            <Link href="/#funciones" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">Funciones</Link>
            <Link href="/#precios" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">Precios</Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">Blog</Link>
            <Link href="/faq" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">FAQ</Link>
            <Link href="/r/demo" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">Demo</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors border-b border-white/[0.04]">Iniciar sesión</Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-4 text-center py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
