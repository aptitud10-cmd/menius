import Image from 'next/image';
import Link from 'next/link';
import type { LandingV2Copy, LandingV2Locale } from '@/lib/landing-v2-copy';
import { SUPPORT_CONTACT } from '@/lib/support-contact';
import { Logo, talkHref } from './V2Header';
import { Stamp } from './V2Story';
import { V2LocaleSwitch } from './V2LocaleSwitch';

export function V2Closing({ c }: { c: LandingV2Copy }) {
  const k = c.closing;
  return (
    <section className="closing" aria-labelledby="lv2-closing">
      <div className="wrap closing-grid">
        <div>
          <Stamp time="7:02" when={k.when} inv />
          <h2 id="lv2-closing">
            {k.h2} <span className="voice">{k.h2Voice}</span>
          </h2>
          <div className="row">
            <Link className="btn btn-primary" href="/signup">{c.nav.tryPro}</Link>
            <a className="tlink" href={talkHref()} target="_blank" rel="noopener noreferrer">{c.hero.talk}</a>
          </div>
          <p className="small">{k.small}</p>
        </div>
        <div className="shot">
          <div className="tablet">
            <div className="scr">
              <Image src="/landing/v2/counter-next-v1.webp" alt={k.alt} width={1120} height={1380} quality={80} sizes="(max-width: 1100px) 276px, 450px" />
            </div>
          </div>
          <p className="cap">{k.cap}</p>
        </div>
      </div>
    </section>
  );
}

export function V2Footer({ c, locale }: { c: LandingV2Copy; locale: LandingV2Locale }) {
  const f = c.footer;
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="talk">
            <Logo />
            <a className="tel" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
            <p>
              {f.callOr} <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
            </p>
          </div>
          <nav aria-labelledby="lv2-f-product">
            <h2 id="lv2-f-product">{f.product}</h2>
            <ul>
              <li><a href="#how">{c.nav.how}</a></li>
              <li><a href="#pricing">{c.nav.pricing}</a></li>
              <li><Link href="/demo">{c.nav.demo}</Link></li>
              <li><Link href="/login">{c.nav.signIn}</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="lv2-f-company">
            <h2 id="lv2-f-company">{f.company}</h2>
            <ul>
              <li><Link href="/faq">{f.faq}</Link></li>
              <li><Link href="/blog">{f.blog}</Link></li>
              <li><Link href="/setup-profesional">{f.setup}</Link></li>
              <li><Link href="/status">{f.status}</Link></li>
              <li><Link href="/support">{f.contact}</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="lv2-f-legal">
            <h2 id="lv2-f-legal">{f.legal}</h2>
            <ul>
              <li><Link href="/terms">{f.terms}</Link></li>
              <li><Link href="/privacy">{f.privacy}</Link></li>
              <li><Link href="/accessibility">{f.accessibility}</Link></li>
              <li><Link href="/cookies">{f.cookies}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="foot-bottom">
          <span>© {year} MENIUS LLC</span>
          <V2LocaleSwitch locale={locale} label={f.language} />
        </div>
      </div>
    </footer>
  );
}
