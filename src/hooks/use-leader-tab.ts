'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Cross-tab leader election via the Web Locks API. Exactly ONE tab per lock
 * name is leader at any time; when it closes, the browser hands the lock to
 * the next waiting tab automatically.
 *
 * Used to dedupe side effects that must happen once per event, not once per
 * open tab (Counter: new-order sound, push notification, auto-print — two
 * open tabs used to print two tickets per order).
 *
 * Fail-open: browsers without navigator.locks (or errors) report leader=true,
 * which restores the previous single-tab behavior.
 */
export function useLeaderTab(lockName: string): boolean {
  const [isLeader, setIsLeader] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    type LocksNavigator = Navigator & {
      locks?: { request: (name: string, cb: () => Promise<void>) => Promise<void> };
    };
    const locks = (navigator as LocksNavigator).locks;
    if (!locks) {
      setIsLeader(true);
      return;
    }

    let cancelled = false;
    const held = new Promise<void>((resolve) => {
      releaseRef.current = resolve;
    });

    locks
      .request(lockName, () => {
        if (!cancelled) setIsLeader(true);
        return held; // hold the lock until this tab unmounts/closes
      })
      .catch(() => {
        if (!cancelled) setIsLeader(true);
      });

    return () => {
      cancelled = true;
      releaseRef.current?.();
      releaseRef.current = null;
      setIsLeader(false);
    };
  }, [lockName]);

  return isLeader;
}
