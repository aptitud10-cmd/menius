'use client';

import { useEffect } from 'react';

/**
 * Calls `cb` with the current scroll Y on every scroll, reading from the right
 * scroller: on mobile (≤768px) the landing wraps its content in a `.root-scroll`
 * element (body-scroll-container fix in globals.css), so the scroll lives there,
 * not on window. On desktop the page scrolls on window as usual.
 *
 * Use this on landing/marketing pages instead of window.scrollY directly —
 * after the iOS fix, the root no longer scrolls on mobile so window.scrollY
 * stays 0 there. Stores/dashboards use their own scroll containers, not this.
 */
export function useScrollPosition(cb: (y: number) => void) {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const scroller = mobile
      ? (document.querySelector('.landing-bg, .root-scroll') as HTMLElement | null)
      : null;
    // Mobile reads/listens on the .root-scroll element; desktop on window.
    const target: HTMLElement | Window = scroller ?? window;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => cb(getY()));
    };
    onScroll(); // initial
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
