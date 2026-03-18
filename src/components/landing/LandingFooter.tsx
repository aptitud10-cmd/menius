import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';
import { LocaleSwitcher } from './LocaleSwitcher';

const SOCIALS = [
  {
    key: 'instagram',
    href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    key: 'twitter',
    href: process.env.NEXT_PUBLIC_SOCIAL_TWITTER,
    label: 'Twitter / X',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'linkedin',
    href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    key: 'tiktok',
    href: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK,
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.67a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
      </svg>
    ),
  },
] as const;

function SocialLinks() {
  const links = SOCIALS.filter((s) => s.href);
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-2 mt-4">
      {links.map((s) => (
        <a
          key={s.key}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all duration-200"
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

export function LandingFooter({ locale }: { locale: LandingLocale }) {
  const f = getLandingT(locale).footer;

  return (
    <footer className="relative bg-black overflow-clip">
      <div className="relative hidden md:flex justify-center pt-12 pb-0 select-none pointer-events-none" aria-hidden="true">
        <span className="text-[19rem] lg:text-[25rem] font-bold text-white/[0.04] tracking-tighter leading-none whitespace-nowrap">
          MENIUS
        </span>
      </div>

      <div className="relative z-10 md:-mt-[7rem] lg:-mt-[9rem] bg-black pt-10 md:pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] md:pb-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          {/* Mobile footer */}
          <div className="md:hidden space-y-6">
            <div>
              <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
              <p className="text-sm text-gray-400 mt-3 leading-relaxed">{f.tagline}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{f.product}</h4>
                <ul className="space-y-2.5">
                  <li><a href="#funciones" className="text-sm text-gray-400 hover:text-white transition-colors">{f.features}</a></li>
                  <li><a href="#precios" className="text-sm text-gray-400 hover:text-white transition-colors">{f.pricing}</a></li>
                  <li><Link href="/demo" className="text-sm text-gray-400 hover:text-white transition-colors">{f.demo}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{f.resources}</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">{f.blog}</Link></li>
                  <li><Link href="/faq" className="text-sm text-gray-400 hover:text-white transition-colors">{f.faq}</Link></li>
                  <li><Link href="/changelog" className="text-sm text-gray-400 hover:text-white transition-colors">Changelog</Link></li>
                  <li><Link href="/status" className="text-sm text-gray-400 hover:text-white transition-colors">{f.status}</Link></li>
                  <li><a href="mailto:soporte@menius.app" className="text-sm text-gray-400 hover:text-white transition-colors">{f.support}</a></li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-white transition-colors">{f.privacy}</Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-white transition-colors">{f.terms}</Link>
              <Link href="/cookies" className="text-xs text-gray-500 hover:text-white transition-colors">{f.cookies}</Link>
            </div>

            <div className="border-t border-white/[0.06] pt-5 flex items-center justify-between">
              <p className="text-xs text-gray-500" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS</p>
              <div className="flex items-center gap-3">
                <LocaleSwitcher locale={locale} />
                <SocialLinks />
              </div>
            </div>
          </div>

          {/* Desktop footer */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-1">
                <Link href="/" className="font-display text-lg font-bold tracking-[-0.04em] text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-500 mt-4 leading-relaxed max-w-[200px]">{f.tagline}</p>
                <div className="flex items-center gap-2 mt-5">
                  {['SSL', 'Stripe', 'CCPA'].map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-[9px] text-gray-500 font-medium tracking-wide">{b}</span>
                  ))}
                </div>
                <SocialLinks />
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">{f.product}</h4>
                <ul className="space-y-2.5">
                  <li><a href="#funciones" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.features}</a></li>
                  <li><a href="#precios" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.pricing}</a></li>
                  <li><Link href="/demo" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.demo}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">{f.resources}</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.blog}</Link></li>
                  <li><Link href="/faq" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.faq}</Link></li>
                  <li><Link href="/changelog" className="text-[13px] text-gray-500 hover:text-white transition-colors">Changelog</Link></li>
                  <li><Link href="/status" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.status}</Link></li>
                  <li><Link href="/setup-profesional" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.professionalSetup}</Link></li>
                  <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.support}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">{f.legal}</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/privacy" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.privacy}</Link></li>
                  <li><Link href="/terms" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.terms}</Link></li>
                  <li><Link href="/cookies" className="text-[13px] text-gray-500 hover:text-white transition-colors">{f.cookies}</Link></li>
                </ul>
              </div>
            </div>

            <div className="separator-gradient mt-12" />
            <div className="pt-6 flex items-center justify-between">
              <p className="text-[11px] text-gray-500" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS LLC</p>
              <LocaleSwitcher locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
