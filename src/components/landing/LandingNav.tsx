'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';

export function LandingNav({ locale }: { locale: LandingLocale }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const n = getLandingT(locale).nav;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  const switchLocale = (l: LandingLocale) => {
    if (l === locale) return;
    document.cookie = `menius_locale=${l};path=/;max-age=${365 * 86400};SameSite=Lax`;
    window.location.reload();
  };

  return (
    <header ref={navRef} className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-5 h-14 md:h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#funciones" className="text-sm text-gray-400 hover:text-white transition-colors">{n.features}</Link>
          <Link href="/#precios" className="text-sm text-gray-400 hover:text-white transition-colors">{n.pricing}</Link>
          <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">{n.blog}</Link>
          <Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">{n.faq}</Link>
          <Link href="/demo" className="text-sm text-gray-400 hover:text-white transition-colors">{n.demo}</Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs">
            <button onClick={() => switchLocale('es')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'es' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>ES</button>
            <span className="text-gray-600">|</span>
            <button onClick={() => switchLocale('en')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'en' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>EN</button>
          </div>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">{n.login}</Link>
          <Link href="/signup" className="text-sm font-medium px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-colors">{n.startFree}</Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col items-center justify-center w-11 h-11 gap-[5px]"
          aria-label={n.menuLabel}
        >
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-gray-300 transition-all duration-300 ${open ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#050505]/95 backdrop-blur-xl">
          <nav className="flex flex-col px-5 py-4 gap-1">
            <Link href="/#funciones" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">{n.features}</Link>
            <Link href="/#precios" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">{n.pricing}</Link>
            <Link href="/demo" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">{n.demo}</Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">{n.blog}</Link>
            <Link href="/faq" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-300 hover:text-white transition-colors">{n.faq}</Link>
            <div className="h-px bg-white/[0.06] my-2" />
            <div className="flex items-center gap-3 py-3">
              <button onClick={() => switchLocale('es')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'es' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>ES</button>
              <button onClick={() => switchLocale('en')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'en' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>EN</button>
            </div>
            <div className="h-px bg-white/[0.06] my-2" />
            <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-[15px] text-gray-400 hover:text-white transition-colors">{n.login}</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="mt-2 block text-center py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] hover:bg-gray-100 transition-all">{n.startFree}</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
