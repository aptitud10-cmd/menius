'use client';

import { useState } from 'react';
import Link from 'next/link';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col items-center justify-center w-9 h-9 gap-[5px]"
          aria-label="Menú"
        >
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#050505]/95 backdrop-blur-xl">
          <nav className="flex flex-col px-5 py-4 gap-1">
            <Link href="/#funciones" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">Funciones</Link>
            <Link href="/#precios" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">Precios</Link>
            <Link href="/r/demo" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">Demo</Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">Blog</Link>
            <Link href="/faq" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">FAQ</Link>
            <div className="h-px bg-white/[0.06] my-2" />
            <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="mt-2 block text-center py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-gray-100 transition-all">
              Empezar gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
