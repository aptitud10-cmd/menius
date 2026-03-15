import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance: capture 20% of transactions in production, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    tracePropagationTargets: ['localhost', /^https:\/\/menius\.app/],

    // Session Replay: capture all sessions that had an error, 5% of normal sessions
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,        // Show text so we can debug layout issues
        maskAllInputs: true,       // But always mask form inputs (passwords, emails)
        blockAllMedia: false,
        // Don't record payment or auth pages
        networkDetailAllowUrls: [window.location.origin],
      }),
      Sentry.browserTracingIntegration(),
    ],

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
}
