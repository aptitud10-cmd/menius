'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll cue at the bottom of the hero. Auto-hides as soon as the user
 * scrolls past 60px so it never feels nagging. CSS handles the desktop
 * gating (`hero-scroll-cue` is `display: none` below 1024px).
 */
export function HeroScrollCue() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="hero-scroll-cue d-fade-up d-delay-4"
      aria-hidden
      style={{ opacity: hidden ? 0 : undefined }}
    >
      <div className="hero-scroll-cue-mouse">
        <div className="hero-scroll-cue-dot" />
      </div>
    </div>
  );
}
