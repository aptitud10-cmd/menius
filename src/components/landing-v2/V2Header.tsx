import type { ReactNode } from 'react';
import Image, { getImageProps } from 'next/image';
import Link from 'next/link';
import type { LandingV2Copy, LandingV2Locale } from '@/lib/landing-v2-copy';
import { SUPPORT_CONTACT, supportWhatsAppUrl } from '@/lib/support-contact';
import { V2MobileMenu } from './V2MobileMenu';

/**
 * Foto real del mostrador (pendiente: la trae Pedro). Con null se ve la versión
 * sin foto, la aprobada. Para activarla: guardar la foto en public/landing/v2/
 * (4:5, 1600×2000 o más; ver NOTAS.md de la maqueta) y poner acá su ruta,
 * p. ej. '/landing/v2/photo-counter-v1.webp'.
 */
export const HERO_PHOTO: string | null = null;
const HERO_PHOTO_SIZE = { width: 1600, height: 2000 };

const IMG = '/landing/v2';
const TEL = `tel:${SUPPORT_CONTACT.phoneE164}`;

export function talkHref(): string {
  return supportWhatsAppUrl() ?? TEL;
}

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="MENIUS">
      MENIUS<i aria-hidden="true" />
    </Link>
  );
}

/**
 * Nav de la landing. En las demás páginas (V2Page) los anclajes apuntan a la
 * landing (`base="/"`), y el CTA puede cambiar: en /signup el formulario ya es
 * el CTA, así que el nav muestra "Sign in" (`ctaSlot`).
 */
export function V2Nav({
  c,
  locale,
  base = '',
  ctaSlot,
}: {
  c: LandingV2Copy;
  locale: LandingV2Locale;
  base?: '' | '/';
  ctaSlot?: ReactNode;
}) {
  const how = `${base}#how`;
  const pricing = `${base}#pricing`;
  return (
    <header className="nav">
      <div className="wrap">
        <Logo />
        <nav className="nav-links" aria-label={c.nav.mainNav}>
          {base ? <Link href={how}>{c.nav.how}</Link> : <a href={how}>{c.nav.how}</a>}
          {base ? <Link href={pricing}>{c.nav.pricing}</Link> : <a href={pricing}>{c.nav.pricing}</a>}
          <Link href="/demo">{c.nav.demo}</Link>
        </nav>
        <div className="nav-right">
          <a className="nav-phone" href={TEL}>{SUPPORT_CONTACT.phoneDisplay}</a>
          {ctaSlot ?? <Link className="btn btn-primary btn-sm" href="/signup">{c.nav.tryPro}</Link>}
          <V2MobileMenu
            locale={locale}
            openLabel={c.nav.openMenu}
            closeLabel={c.nav.closeMenu}
            languageLabel={c.footer.language}
            links={[
              { href: how, label: c.nav.how },
              { href: pricing, label: c.nav.pricing },
              { href: '/demo', label: c.nav.demo },
              { href: '/login', label: c.nav.signIn },
              { href: TEL, label: SUPPORT_CONTACT.phoneDisplay, className: 'menu-phone' },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

/** Captura del Counter con el #021: una imagen distinta por corte (celular / tablet / desktop). */
function HeroCounter({ alt }: { alt: string }) {
  const common = { alt, quality: 80 } as const;
  const phone = getImageProps({
    ...common,
    src: `${IMG}/counter-hero-phone-v1.webp`,
    width: 780,
    height: 1132,
    sizes: 'calc(100vw - 48px)',
  }).props;
  const tablet = getImageProps({
    ...common,
    src: `${IMG}/counter-hero-tablet-v1.webp`,
    width: 1120,
    height: 1120,
    sizes: 'calc(100vw - 88px)',
  }).props;
  const desktop = getImageProps({
    ...common,
    src: `${IMG}/counter-hero-desktop-v1.webp`,
    width: 2360,
    height: 854,
    sizes: '(min-width: 1281px) 1176px, calc(100vw - 104px)',
    priority: true,
  }).props;
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={phone.srcSet} sizes={phone.sizes} width={780} height={1132} />
      <source media="(max-width: 1100px)" srcSet={tablet.srcSet} sizes={tablet.sizes} width={1120} height={1120} />
      {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
      <img {...desktop} />
    </picture>
  );
}

export function V2Hero({ c }: { c: LandingV2Copy }) {
  const h = c.hero;
  return (
    <section className={HERO_PHOTO ? 'hero has-photo' : 'hero'} aria-labelledby="lv2-h1">
      <div className="wrap">
        <div className="hero-head">
          <h1 id="lv2-h1">
            {h.h1} <span className="voice">{h.h1Voice}</span>
          </h1>
        </div>
        <div className="hero-row">
          <div className="hero-copy">
            <p className="lead">
              <span className="no-m">{h.leadWide}</span>
              <span className="only-mi">{h.leadPhone}</span>
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/signup">{c.nav.tryPro}</Link>
              <a className="tlink" href={talkHref()} target="_blank" rel="noopener noreferrer">{h.talk}</a>
            </div>
          </div>
          <div className="hero-cue">
            <span className="stamp">7:02<small>PM</small></span>
            <p>{h.cue}</p>
            <span className="arrow" aria-hidden="true">↓</span>
          </div>
        </div>
        {HERO_PHOTO ? (
          <div className="hero-photo">
            <Image
              src={HERO_PHOTO}
              alt={h.photoAlt}
              {...HERO_PHOTO_SIZE}
              sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1100px) 50vw, 576px"
              priority
            />
            <div className="tablet">
              <div className="scr">
                <Image src={`${IMG}/counter-hero-tablet-v1.webp`} alt={h.counterAlt} width={1120} height={1120} quality={80} sizes="(max-width: 640px) calc(100vw - 48px), 312px" />
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-shot">
            <div className="tablet">
              <div className="scr">
                <HeroCounter alt={h.counterAlt} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
