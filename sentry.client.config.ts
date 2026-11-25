import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Share of normal sessions that get a full Session Replay recording.
const REPLAY_SESSION_RATE = 0.05;

// Staff surfaces (panel, Counter, KDS, admin, driver and the auth pages that
// lead into them) keep replay in every session so an error always comes with
// its recording. Public pages (store menus, landing, client sites) roll the
// 5% here instead: replay takes a full DOM snapshot when it attaches (~0.5 s
// of main thread on a mid-range phone for a long page), and buffering for
// on-error replay pays that cost in 100% of visits. Errors on public pages
// still report with stack trace and breadcrumbs, just without the video.
const STAFF_PATH =
  /^\/(app|counter|kds|admin|driver|login|signup|onboarding|auth|forgot-password|reset-password|preview-counter|preview-kds)(\/|$)/;
const isStaffPage = STAFF_PATH.test(window.location.pathname);
const publicReplaySampled = !isStaffPage && Math.random() < REPLAY_SESSION_RATE;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance: capture 20% of transactions in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    tracePropagationTargets: ['localhost', /^https:\/\/menius\.app/],

    // Session Replay: on staff pages, 5% of sessions plus every session with an
    // error. On public pages the 5% roll already happened above, so a session
    // that loads replay at all records in full.
    replaysSessionSampleRate: isStaffPage ? REPLAY_SESSION_RATE : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Session Replay is added below via a dynamic import, NOT here. Listing
    // replayIntegration() statically pulls @sentry-internal/replay (~60KB gzip)
    // into the bundle every visitor downloads, to record 5% of sessions.
    // Tracing stays inline — it's small and it measures the initial page load,
    // so deferring it would defeat its purpose.
    integrations: [Sentry.browserTracingIntegration()],

    // Filter out known noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'AbortError',
      'Load failed',
      'ChunkLoadError',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      // Safari-specific
      'webkit-masked-url',
    ],

    beforeSend(event, hint) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') return null;

      const err = hint?.originalException;

      // Ignore cancelled requests
      if (err instanceof Error && err.name === 'AbortError') return null;

      // Tag checkout errors as critical
      if (event.request?.url?.includes('/checkout') || event.request?.url?.includes('/api/payments')) {
        event.level = 'fatal';
        event.tags = { ...event.tags, critical: 'checkout' };
      }

      // Tag order creation errors as high priority
      if (event.request?.url?.includes('/api/orders')) {
        event.tags = { ...event.tags, critical: 'orders' };
      }

      return event;
    },
  });

  // Session Replay, fetched separately so its ~60KB never lands in the initial
  // bundle. Waits for the page to go idle: replay records what happens *after*
  // it attaches, so arriving a moment late costs nothing, while competing with
  // the menu's first render costs real LCP on a mid-range phone.
  const loadReplay = () => {
    import('@sentry/browser')
      .then(({ replayIntegration, getClient }) => {
        // The client is gone if Sentry was closed (e.g. fast navigation away).
        const client = getClient();
        if (!client) return;
        client.addIntegration(
          replayIntegration({
            maskAllText: false,      // Show text so we can debug layout issues
            maskAllInputs: true,     // But always mask form inputs (passwords, emails)
            blockAllMedia: false,
            // Don't record payment or auth pages
            networkDetailAllowUrls: [window.location.origin],
          }),
        );
      })
      .catch(() => {
        // Blocked or offline — errors still report, just without replay.
      });
  };

  // Safari has no requestIdleCallback. Checked via typeof rather than `in` so
  // TypeScript doesn't narrow `window` to never in the fallback branch (lib.dom
  // declares the method as always present).
  if (isStaffPage || publicReplaySampled) {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(loadReplay, { timeout: 5000 });
    } else {
      window.setTimeout(loadReplay, 3000);
    }
  }
}
