import { useEffect } from 'react';

// Global counter so multiple overlays can lock/unlock safely.
// The body stays locked as long as at least one overlay is open.
let lockCount = 0;

function lock() {
  if (lockCount === 0) {
    // overflow:hidden on body is sufficient here because MENIUS uses a custom
    // scroll container (mainRef div), not document.body — window.scrollY is always 0.
    // DO NOT use position:fixed on body: it shifts the iOS visual viewport and breaks
    // getBoundingClientRect() in any scroll-spy or sheet underneath.
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

/**
 * Locks the body scroll while the component is mounted (active = true).
 * Safe to use in multiple simultaneous overlays — uses a reference counter.
 * NOTE: Only correct when the real scroll container is NOT document.body.
 * MenuShell and CustomizationSheet do NOT use this hook — they manage scroll
 * directly on mainRef to avoid iOS viewport shift.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}
