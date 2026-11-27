'use client';

import { useEffect, useState } from 'react';
import { getTranslations } from '@/lib/translations';
import { SUPPORT_CONTACT } from '@/lib/support-contact';
import { V2LocaleSwitch } from '@/components/landing-v2/V2LocaleSwitch';
import { LV2_MIN_CSS } from '@/components/landing-v2/lv2-min-css';

// Client component on purpose: the root not-found is part of every route's
// tree, and reading cookies() on the server here made every route dynamic
// (killing the menu's ISR). Plain <a> instead of next/link so the 404 does not
// pull the dashboard chunk group into the public menu bundle. Same reason for
// the CSS: it lives in a <style> that only exists while the 404 is shown
// (lv2-min-css.ts), instead of an import that would load on every route.

const SHELL = {
  en: {
    how: 'How it works', pricing: 'Pricing', demo: 'Live demo', signIn: 'Sign in', tryPro: 'Try Pro free',
    openMenu: 'Open menu', closeMenu: 'Close menu', mainNav: 'Main',
    callOr: 'Call or WhatsApp.', product: 'Product', company: 'Company', legal: 'Legal',
    faq: 'FAQ', blog: 'Blog', setup: 'Setup', status: 'Status', contact: 'Contact',
    terms: 'Terms', privacy: 'Privacy', accessibility: 'Accessibility', cookies: 'Cookies', language: 'Language',
  },
  es: {
    how: 'Cómo funciona', pricing: 'Precios', demo: 'Demo en vivo', signIn: 'Iniciar sesión', tryPro: 'Prueba Pro gratis',
    openMenu: 'Abrir menú', closeMenu: 'Cerrar menú', mainNav: 'Principal',
    callOr: 'Llama o escribe por WhatsApp.', product: 'Producto', company: 'Empresa', legal: 'Legal',
    faq: 'Preguntas', blog: 'Blog', setup: 'Configuración', status: 'Estado', contact: 'Contacto',
    terms: 'Términos', privacy: 'Privacidad', accessibility: 'Accesibilidad', cookies: 'Cookies', language: 'Idioma',
  },
} as const;

const TEL = `tel:${SUPPORT_CONTACT.phoneE164}`;

export default function NotFound() {
  // EN por defecto (como la landing); ES si la cookie lo dice.
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (/(?:^|; )menius_locale=es(?:;|$)/.test(document.cookie)) setLocale('es');
  }, []);
  const t = getTranslations(locale);
  const c = SHELL[locale];
  const year = new Date().getFullYear();

  return (
    <div className="lv2 lv2m root-scroll" lang={locale}>
      <style dangerouslySetInnerHTML={{ __html: LV2_MIN_CSS }} />
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="/" aria-label="MENIUS">MENIUS<i aria-hidden="true" /></a>
          <nav className="nav-links" aria-label={c.mainNav}>
            <a href="/#how">{c.how}</a>
            <a href="/#pricing">{c.pricing}</a>
            <a href="/demo">{c.demo}</a>
          </nav>
          <div className="nav-right">
            <a className="nav-phone" href={TEL}>{SUPPORT_CONTACT.phoneDisplay}</a>
            <a className="btn btn-primary btn-sm" href="/signup">{c.tryPro}</a>
            <button
              type="button"
              className="menu-btn"
              aria-expanded={menuOpen}
              aria-controls="lv2-404-menu"
              aria-label={menuOpen ? c.closeMenu : c.openMenu}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
              </svg>
            </button>
          </div>
        </div>
        <div id="lv2-404-menu" className="menu-panel" hidden={!menuOpen}>
          <ul>
            <li><a href="/#how">{c.how}</a></li>
            <li><a href="/#pricing">{c.pricing}</a></li>
            <li><a href="/demo">{c.demo}</a></li>
            <li><a href="/login">{c.signIn}</a></li>
            <li><a href={TEL}>{SUPPORT_CONTACT.phoneDisplay}</a></li>
          </ul>
        </div>
      </header>

      <main id="main-content" className="lost">
        <div className="wrap lost-grid">
          <div className="big" aria-hidden="true">404</div>
          <div>
            <h1>{t.notFoundTitle}</h1>
            <p className="lead">{t.notFoundDesc}</p>
            <div className="row">
              <a className="btn btn-primary" href="/">{t.notFoundGoHome}</a>
              <a className="tlink" href="/demo">{t.notFoundViewDemo}</a>
            </div>
          </div>
        </div>
      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div className="talk">
              <a className="logo" href="/" aria-label="MENIUS">MENIUS<i aria-hidden="true" /></a>
              <a className="tel" href={TEL}>{SUPPORT_CONTACT.phoneDisplay}</a>
              <p>
                {c.callOr} <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
              </p>
            </div>
            <nav aria-labelledby="nf-f-product">
              <h2 id="nf-f-product">{c.product}</h2>
              <ul>
                <li><a href="/#how">{c.how}</a></li>
                <li><a href="/#pricing">{c.pricing}</a></li>
                <li><a href="/demo">{c.demo}</a></li>
                <li><a href="/login">{c.signIn}</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="nf-f-company">
              <h2 id="nf-f-company">{c.company}</h2>
              <ul>
                <li><a href="/faq">{c.faq}</a></li>
                <li><a href="/blog">{c.blog}</a></li>
                <li><a href="/setup-profesional">{c.setup}</a></li>
                <li><a href="/status">{c.status}</a></li>
                <li><a href="/support">{c.contact}</a></li>
              </ul>
            </nav>
            <nav aria-labelledby="nf-f-legal">
              <h2 id="nf-f-legal">{c.legal}</h2>
              <ul>
                <li><a href="/terms">{c.terms}</a></li>
                <li><a href="/privacy">{c.privacy}</a></li>
                <li><a href="/accessibility">{c.accessibility}</a></li>
                <li><a href="/cookies">{c.cookies}</a></li>
              </ul>
            </nav>
          </div>
          <div className="foot-bottom">
            <span>© {year} MENIUS LLC</span>
            <V2LocaleSwitch locale={locale} label={c.language} />
          </div>
        </div>
      </footer>
    </div>
  );
}
