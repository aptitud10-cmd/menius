'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PHONE_QUERY } from './use-is-phone';

const DISMISS_KEY = 'menius_sticky_cta_dismissed';

/**
 * CTA fijo del celular (≤640). Aparece tras pasar el hero, se esconde al llegar
 * al pie y se puede cerrar (vuelve en la próxima visita: sessionStorage).
 * En celular el scroll NO vive en window: lo tiene el contenedor .root-scroll
 * (body scroll container, globals.css, ≤768px), así que se lee su scrollTop.
 */
export function V2StickyCta({ b, t, cta, closeLabel }: { b: string; t: string; cta: string; closeLabel: string }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      /* sin storage: se muestra igual */
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    const scroller = document.querySelector<HTMLElement>('.lv2.root-scroll');
    const container = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : null;
    const target: HTMLElement | Window = container ?? window;
    const getY = () => (container ? container.scrollTop : window.scrollY);
    const footer = document.querySelector('.lv2 .foot');

    let pastHero = false;
    let atFooter = false;
    const update = () => setShow(pastHero && !atFooter);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        pastHero = getY() > 600;
        update();
      });
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    let obs: IntersectionObserver | null = null;
    if (footer) {
      obs = new IntersectionObserver(([e]) => {
        atFooter = e.isIntersecting;
        update();
      });
      obs.observe(footer);
    }
    return () => {
      target.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      obs?.disconnect();
    };
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sin storage: se cierra solo en esta vista */
    }
    setDismissed(true);
  };

  return (
    <div className="sticky-cta" data-show={show ? 'true' : 'false'}>
      <p><b>{b}</b>{t}</p>
      <div className="sticky-r">
        <Link className="btn btn-primary btn-sm" href="/signup">{cta}</Link>
        <button type="button" className="sticky-x" aria-label={closeLabel} onClick={dismiss}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
