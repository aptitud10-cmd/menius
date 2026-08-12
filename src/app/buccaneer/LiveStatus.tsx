'use client';

import { useEffect, useState } from 'react';

/**
 * The diner's own clock, in New York time.
 *
 * This is the piece that turns "open 24 hours" from a claim into something the
 * visitor can check: it reads the local time where the diner actually is, not
 * where the visitor is. Someone browsing from Bogotá at 6pm sees that it is
 * 7pm on Astoria Boulevard and the light is on.
 *
 * Rendered empty on the server and filled on mount — the server's clock is UTC
 * and would hydrate a different string than the browser produces, so there is
 * nothing to match until we are client-side.
 */
export default function LiveStatus() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      setTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(new Date()),
      );

    read();
    // Tick on the minute boundary rather than every 60s from mount, so the
    // displayed minute never lags the real one by up to 59 seconds.
    const toNextMinute = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      read();
      interval = setInterval(read, 60_000);
    }, toNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <p className="bd-status" aria-live="off">
      <span className="bd-status__dot" aria-hidden="true" />
      <span className="bd-status__label">Open now</span>
      {/* The separator is decorative; a screen reader should not read "middot". */}
      <span className="bd-status__sep" aria-hidden="true">·</span>
      <span className="bd-status__time">
        {time ?? ' '}
        {time && <span className="sr-only"> New York time</span>}
      </span>
    </p>
  );
}
