'use client';

import { useEffect } from 'react';

/**
 * Calls `cb` with the current scroll Y on every scroll, reading from the right
 * scroller: <body> on mobile (≤768px, where the body-scroll-container fix in
 * globals.css moves the scroller off the root) and window on desktop.
 *
 * Use this on landing/marketing pages instead of window.scrollY directly —
 * after the iOS fix, the root no longer scrolls on mobile so window.scrollY
 * stays 0 there. Stores/dashboards use their own scroll containers, not this.
 */
export function useScrollPosition(cb: (y: number) => void) {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const target: HTMLElement | Window = mobile ? document.body : window;
    const getY = () => (mobile ? document.body.scrollTop : window.scrollY);
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
