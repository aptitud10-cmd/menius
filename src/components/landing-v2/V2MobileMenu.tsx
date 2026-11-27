'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { LandingV2Locale } from '@/lib/landing-v2-copy';
import { V2LocaleSwitch } from './V2LocaleSwitch';

interface MenuLink {
  href: string;
  label: string;
}

interface MenuContact {
  label: string;
  phoneDisplay: string;
  tel: string;
  whatsapp: string | null;
}

function MenuAnchor({ href, className, onClick, children }: { href: string; className?: string; onClick: () => void; children: React.ReactNode }) {
  // Rutas internas con Link; anclas (#how) y tel:/https: con <a>.
  return href.startsWith('/') ? (
    <Link href={href} className={className} onClick={onClick}>{children}</Link>
  ) : (
    <a href={href} className={className} onClick={onClick}>{children}</a>
  );
}

/**
 * Menú del celular (≤640): botón de dos líneas y una hoja a pantalla completa
 * con los links grandes en serif, la persona real (teléfono/WhatsApp), el CTA
 * y el idioma. Mientras está abierta, el scroll de la página se bloquea: en
 * celular el scroller es el contenedor .root-scroll, no window.
 */
export function V2MobileMenu({
  locale,
  links,
  signIn,
  cta,
  contact,
  openLabel,
  closeLabel,
  languageLabel,
}: {
  locale: LandingV2Locale;
  links: MenuLink[];
  signIn: MenuLink;
  cta: MenuLink | null;
  contact: MenuContact;
  openLabel: string;
  closeLabel: string;
  languageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const scroller = document.querySelector<HTMLElement>('.lv2.root-scroll');
    const html = document.documentElement;
    const prev = { scroller: scroller?.style.overflow ?? '', html: html.style.overflow };
    if (scroller) scroller.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Si la pantalla pasa a tablet/desktop con el menú abierto, se cierra.
    const mq = window.matchMedia('(max-width: 640px)');
    const onMq = () => { if (!mq.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      if (scroller) scroller.style.overflow = prev.scroller;
      html.style.overflow = prev.html;
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
      openBtnRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={openBtnRef}
        type="button"
        className="menu-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={openLabel}
        onClick={() => setOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 9h16M4 15h16" />
        </svg>
      </button>

      <div
        id={panelId}
        className="menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={openLabel}
        hidden={!open}
      >
        <div className="menu-top">
          <Link className="logo" href="/" aria-label="MENIUS" onClick={close}>
            MENIUS<i aria-hidden="true" />
          </Link>
          <button ref={closeBtnRef} type="button" className="menu-btn menu-close" aria-label={closeLabel} onClick={close}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="menu-links" aria-label={openLabel}>
          <ul>
            {links.map((l, i) => (
              <li key={l.href} style={{ ['--i' as string]: i }}>
                <MenuAnchor href={l.href} onClick={close}>
                  <span>{l.label}</span>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </MenuAnchor>
              </li>
            ))}
          </ul>
          <MenuAnchor href={signIn.href} className="menu-signin" onClick={close}>{signIn.label}</MenuAnchor>
        </nav>

        <div className="menu-foot">
          <div className="menu-contact">
            <span className="menu-k">{contact.label}</span>
            <a className="menu-phone" href={contact.tel}>{contact.phoneDisplay}</a>
            {contact.whatsapp && (
              <a className="menu-wa" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            )}
          </div>
          {cta && (
            <MenuAnchor href={cta.href} className="btn btn-primary menu-cta" onClick={close}>{cta.label}</MenuAnchor>
          )}
          <div className="menu-lang">
            <span>{languageLabel}</span>
            <V2LocaleSwitch locale={locale} label={languageLabel} />
          </div>
        </div>
      </div>
    </>
  );
}
