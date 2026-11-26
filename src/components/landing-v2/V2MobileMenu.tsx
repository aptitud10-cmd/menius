'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { LandingV2Locale } from '@/lib/landing-v2-copy';
import { V2LocaleSwitch } from './V2LocaleSwitch';

interface MenuLink {
  href: string;
  label: string;
  className?: string;
}

/** Botón ☰ del nav en celular (≤640) y su panel. */
export function V2MobileMenu({
  locale,
  links,
  openLabel,
  closeLabel,
  languageLabel,
}: {
  locale: LandingV2Locale;
  links: MenuLink[];
  openLabel: string;
  closeLabel: string;
  languageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="menu-btn"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        )}
      </button>
      <div id={panelId} className="menu-panel" hidden={!open}>
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              {l.href.startsWith('/') ? (
                <Link href={l.href} className={l.className} onClick={() => setOpen(false)}>{l.label}</Link>
              ) : (
                <a href={l.href} className={l.className} onClick={() => setOpen(false)}>{l.label}</a>
              )}
            </li>
          ))}
        </ul>
        <div className="menu-lang">
          <span>{languageLabel}</span>
          <V2LocaleSwitch locale={locale} label={languageLabel} />
        </div>
      </div>
    </>
  );
}
