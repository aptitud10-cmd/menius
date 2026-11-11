'use client';

import { useEffect } from 'react';
import { stateForHour } from './data';

/**
 * All the page's client behavior in one place, driven by data attributes on
 * `.b2-root` so the markup stays server-rendered and the CSS does the rest.
 *
 * - data-filled   : header paints its ground (desktop; mobile/tablet are always opaque)
 * - data-bar      : mobile sticky bar visible (hero CTA is above the viewport and
 *                   the Close CTA is not on screen — AD 24.7)
 * - data-ready    : clocks are populated
 * - data-bd-state : re-evaluated when the tab becomes visible again (AD 3.3.4)
 *
 * Observers use the viewport as root, so it does not matter whether the scroller
 * is the document (desktop) or `.b2-scroll` (touch / <=767px). No scroll listeners.
 */

const NY_HOUR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  hourCycle: 'h23',
});
const NY_MIN = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  minute: '2-digit',
});

function parseAt(search: string): { h: number; m: number } | null {
  const raw = new URLSearchParams(search).get('at');
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const h = Number(raw.slice(0, 2));
  const m = Number(raw.slice(2));
  return h < 24 && m < 60 ? { h, m } : null;
}

function nyNow(at: { h: number; m: number } | null): { h: number; m: number } {
  if (at) return at;
  const d = new Date();
  return { h: Number(NY_HOUR.format(d)) % 24, m: Number(NY_MIN.format(d)) };
}

/** "2:14" + "a.m." — lowercase with dots (AD 10.3). */
function fmt({ h, m }: { h: number; m: number }) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { digits: `${h12}:${String(m).padStart(2, '0')}`, suffix: h < 12 ? 'a.m.' : 'p.m.' };
}

export default function Behavior() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.b2-root');
    if (!root) return;
    const at = parseAt(window.location.search);

    const paint = () => {
      const t = nyNow(at);
      const { digits, suffix } = fmt(t);
      root.querySelectorAll('[data-b2-digits]').forEach((el) => (el.textContent = digits));
      root.querySelectorAll('[data-b2-suffix]').forEach((el) => (el.textContent = suffix));
      root.querySelectorAll('[data-b2-time]').forEach((el) => (el.textContent = `${digits} ${suffix}`));
      root
        .querySelectorAll('[data-b2-aria]')
        .forEach((el) => el.setAttribute('aria-label', `${digits} ${suffix} in New York`));
      root.setAttribute('data-ready', '');
    };
    paint();

    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (!at) {
      timeout = setTimeout(() => {
        paint();
        interval = setInterval(paint, 60_000);
      }, 60_000 - (Date.now() % 60_000));
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible' || at) return;
      const s = stateForHour(nyNow(null).h);
      if (root.getAttribute('data-bd-state') !== s) root.setAttribute('data-bd-state', s);
      paint();
    };
    document.addEventListener('visibilitychange', onVisible);

    const observers: IntersectionObserver[] = [];
    let heroGone = false;
    let closeVisible = false;
    const syncBar = () => root.toggleAttribute('data-bar', heroGone && !closeVisible);

    const watch = (id: string, cb: (e: IntersectionObserverEntry) => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      const io = new IntersectionObserver(([e]) => cb(e));
      io.observe(el);
      observers.push(io);
    };
    watch('b2-top-sentinel', (e) => root.toggleAttribute('data-filled', !e.isIntersecting));
    watch('b2-hero-cta', (e) => {
      heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
      syncBar();
    });
    watch('b2-close-cta', (e) => {
      closeVisible = e.isIntersecting;
      syncBar();
    });

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      observers.forEach((io) => io.disconnect());
    };
  }, []);

  return null;
}
