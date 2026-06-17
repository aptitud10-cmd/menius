'use client';

import { useState } from 'react';
import { useScrollPosition } from '@/hooks/use-scroll-position';

/**
 * Scroll cue at the bottom of the hero. Auto-hides as soon as the user
 * scrolls past 60px so it never feels nagging. CSS handles the desktop
 * gating (`hero-scroll-cue` is `display: none` below 1024px).
 */
export function HeroScrollCue() {
  const [hidden, setHidden] = useState(false);

  useScrollPosition((y) => setHidden(y > 60));

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
