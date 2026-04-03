import { useEffect } from 'react';

// Global counter so multiple overlays can lock/unlock safely.
// The body stays locked as long as at least one overlay is open.
let lockCount = 0;
let savedScrollY = 0;

function lock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    // On iOS Safari, overflow:hidden alone is not enough — the body still scrolls.
    // Fixing position + top achieves a true scroll freeze without a scroll-position jump.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Locks the body scroll while the component is mounted (active = true).
 * Safe to use in multiple simultaneous overlays — uses a reference counter.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}
