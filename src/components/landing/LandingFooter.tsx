import Link from 'next/link';
import { getLandingT, type LandingLocale } from '@/lib/landing-translations';

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
              <div className="flex items-center gap-2">
                {['SSL', 'Stripe'].map((b) => (
                  <span key={b} className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-[9px] text-gray-500 font-medium tracking-wide">{b}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop footer */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-1">
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-500 mt-4 leading-relaxed max-w-[200px]">{f.tagline}</p>
                <div className="flex items-center gap-2 mt-5">
                  {['SSL', 'Stripe', 'CCPA'].map((b) => (
                    <span key={b} className="px-2 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-[9px] text-gray-500 font-medium tracking-wide">{b}</span>
                  ))}
                </div>
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
            <div className="pt-6 flex items-center justify-center">
              <p className="text-[11px] text-gray-500" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
