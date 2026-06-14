'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';

export function LandingNav({ locale }: { locale: LandingLocale }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      // rAF batches scroll events during Safari momentum scrolling,
      // preventing the header from flickering during deceleration
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setScrolled(window.scrollY > 16));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId); };
  }, []);

  const switchLocale = (l: LandingLocale) => {
    if (l === locale) return;
    document.cookie = `menius_locale=${l};path=/;max-age=${365 * 86400};SameSite=Lax`;
    window.location.reload();
  };

  return (
    <header
      ref={navRef}
      className={`fixed top-0 w-full z-[120] bg-[#050505]/95 md:bg-[#050505]/80 md:backdrop-blur-2xl border-b transition-colors duration-300 ${scrolled ? 'border-white/[0.09] shadow-[0_1px_0_rgba(255,255,255,0.04)]' : 'border-white/[0.04]'}`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-14 md:h-16 grid grid-cols-[auto_1fr_auto]">
        <Link href="/" className="flex items-center pr-3 font-display text-lg font-bold tracking-[-0.04em] text-white">MENIUS</Link>

        <nav className="hidden md:flex items-center justify-center gap-8">
          <Link href="/#funciones" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.features}</Link>
          <Link href="/#precios" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.pricing}</Link>
          <Link href="/demo" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.demo}</Link>
        </nav>

        <div className="flex items-center justify-end gap-2.5 md:gap-4">
          <div className="hidden md:flex items-center gap-1 text-xs">
            <button onClick={() => switchLocale('es')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'es' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>ES</button>
            <span className="text-gray-600">|</span>
            <button onClick={() => switchLocale('en')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'en' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>EN</button>
          </div>
          <Link href="/login" className="flex items-center text-[13px] md:text-sm text-gray-300 md:text-gray-400 hover:text-white transition-colors whitespace-nowrap">{n.login}</Link>
          <Link href="/signup" className="flex items-center text-[13px] md:text-sm font-medium px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl bg-white text-black hover:bg-gray-100 transition-colors whitespace-nowrap">{n.startFree}</Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`md:hidden relative z-[130] flex flex-col items-center justify-center w-10 h-10 gap-[5px] rounded-lg border transition-colors duration-300 ${open ? 'border-[#05c8a7]/40 bg-[#05c8a7]/[0.06]' : 'border-[#05c8a7]/20 hover:border-[#05c8a7]/40'}`}
            aria-label={n.menuLabel}
            aria-expanded={open ? 'true' : 'false'}
          >
            <span className={`block w-[18px] h-[1.5px] bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
            <span className={`block w-[18px] h-[1.5px] bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-[18px] h-[1.5px] bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="md:hidden fixed top-14 left-0 right-0 bottom-0 z-[110] flex flex-col bg-[#050505] animate-fade-in"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Navegación — items oversized centrados con entrada escalonada */}
          <nav className="flex flex-1 flex-col items-center justify-center px-6 gap-2 text-center">
            {[
              { href: '/#funciones', label: n.features },
              { href: '/#precios', label: n.pricing },
              { href: '/demo', label: n.demo },
            ].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="animate-fade-in-up py-2 font-display text-[2.75rem] leading-tight font-bold tracking-[-0.03em] text-white hover:text-[#05c8a7] active:text-[#05c8a7] transition-colors"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer del panel — idioma (Sign in / Start free quedan siempre visibles en el header) */}
          <div
            className="animate-fade-in-up mt-auto px-6 pb-8 pt-6"
            style={{ animationDelay: `${120 + 3 * 70}ms` }}
          >
            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-6">
              <button onClick={() => switchLocale('es')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'es' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>ES</button>
              <button onClick={() => switchLocale('en')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'en' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>EN</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
