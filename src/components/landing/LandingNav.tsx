'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';

export function LandingNav({ locale }: { locale: LandingLocale }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
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
    // On mobile the scroller is .landing-bg (body-scroll-container fix in
    // globals.css), on desktop it's window. Read + listen on the right one so
    // the nav shrink still fires after the scroll moved off the root.
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const scroller = mobile ? (document.querySelector('.landing-bg, .root-scroll') as HTMLElement | null) : null;
    const target: HTMLElement | Window = scroller ?? window;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);
    let rafId = 0;
    const onScroll = () => {
      // rAF batches scroll events during Safari momentum scrolling,
      // preventing the header from flickering during deceleration
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setScrolled(getY() > 16));
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => { target.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId); };
  }, []);

  const switchLocale = (l: LandingLocale) => {
    if (l === locale) return;
    document.cookie = `menius_locale=${l};path=/;max-age=${365 * 86400};SameSite=Lax`;
    window.location.reload();
  };

  const Logo = (
    <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-bold tracking-[-0.04em] text-white">
      MENIUS
      <span className="h-1.5 w-1.5 rounded-full bg-[#05c8a7] shadow-[0_0_8px_var(--brand-40)]" aria-hidden />
    </Link>
  );

  const MenuToggle = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="relative z-[130] flex items-center text-[15px] font-semibold tracking-tight text-white py-2 -mr-1 pl-1"
      aria-label={open ? n.closeLabel : n.menuLabel}
      aria-expanded={open}
    >
      {open ? n.closeLabel : n.menuLabel}
    </button>
  );

  return (
    <>
      {/* ── DESKTOP: barra fija full-width (sin cambios) ─────────────────── */}
      <header
        className={`hidden md:block fixed top-0 w-full z-[120] bg-[#050505]/80 backdrop-blur-2xl border-b transition-colors duration-300 ${scrolled ? 'border-white/[0.09] shadow-[0_1px_0_rgba(255,255,255,0.04)]' : 'border-white/[0.04]'}`}
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 grid grid-cols-[auto_1fr_auto] items-center">
          <Link href="/" className="flex items-center gap-1.5 pr-3 font-display text-lg font-bold tracking-[-0.04em] text-white">
            MENIUS
            <span className="h-1.5 w-1.5 rounded-full bg-[#05c8a7] shadow-[0_0_8px_var(--brand-40)]" aria-hidden />
          </Link>
          <nav className="flex items-center justify-center gap-8">
            <Link href="/#funciones" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.features}</Link>
            <Link href="/#precios" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.pricing}</Link>
            <Link href="/demo" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">{n.demo}</Link>
          </nav>
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-1 text-xs">
              <button onClick={() => switchLocale('es')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'es' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>ES</button>
              <span className="text-gray-600">|</span>
              <button onClick={() => switchLocale('en')} className={`px-1.5 py-0.5 rounded transition-colors ${locale === 'en' ? 'text-white font-semibold' : 'text-gray-500 hover:text-gray-300'}`}>EN</button>
            </div>
            <Link href="/login" className="flex items-center text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap">{n.login}</Link>
            <Link
              href="/signup"
              className="flex items-center text-sm font-semibold px-5 py-2.5 rounded-xl bg-[#05c8a7] text-black hover:bg-[#04b396] active:scale-[0.97] transition-[transform,background-color] duration-150 whitespace-nowrap"
            >
              {n.startFree}
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE: pill flotante con blur que se encoge al scrollear ────── */}
      <div className="md:hidden" ref={navRef}>
        {/* Barra full-width arriba de todo; al scrollear se despega de los
            bordes (px) y se convierte en una píldora flotante con blur. */}
        <header
          className={`fixed top-0 left-0 right-0 z-[120] transition-[padding] duration-300 ${scrolled ? 'pt-2.5 px-3' : 'pt-0 px-0'}`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              scrolled
                ? 'h-12 px-4 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                : 'h-14 px-5 rounded-none bg-[#050505]/95 border-b border-white/[0.04]'
            }`}
          >
            {Logo}
            {MenuToggle}
          </div>
        </header>

        {/* Panel full-screen del menú — CTA grande verde vive acá adentro. */}
        {open && (
          <div
            className="fixed top-0 left-0 right-0 bottom-0 z-[110] flex flex-col bg-[#050505] animate-fade-in"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <nav className="flex flex-col items-start px-6 pt-24 gap-1">
              {[
                { href: '/#funciones', label: n.features },
                { href: '/#precios', label: n.pricing },
                { href: '/demo', label: n.demo },
              ].map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="animate-fade-in-up py-1.5 font-display text-[3.25rem] leading-[1.05] font-bold tracking-[-0.035em] text-white hover:text-[#05c8a7] active:text-[#05c8a7] transition-colors"
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="animate-fade-in-up mt-6 py-1.5 font-display text-[3.25rem] leading-[1.05] font-bold tracking-[-0.035em] text-[#05c8a7] active:opacity-70 transition-opacity"
                style={{ animationDelay: `${120 + 3 * 70}ms` }}
              >
                {n.login}
              </Link>
            </nav>

            {/* CTA grande + idioma al pie del panel */}
            <div
              className="animate-fade-in-up mt-auto px-6 pt-6"
              style={{ animationDelay: `${120 + 4 * 70}ms`, paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
            >
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full py-4 rounded-2xl bg-[#05c8a7] text-black text-base font-bold tracking-tight hover:bg-[#04b396] active:scale-[0.98] transition-[transform,background-color] duration-150"
              >
                {n.startFree}
              </Link>
              <div className="flex items-center gap-3 border-t border-white/[0.06] mt-6 pt-6">
                <button type="button" onClick={() => switchLocale('es')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'es' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>ES</button>
                <button type="button" onClick={() => switchLocale('en')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${locale === 'en' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>EN</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
