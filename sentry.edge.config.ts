import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') return null;
      // Middleware errors affecting payments/auth are critical
      if (event.request?.url?.includes('/api/billing') || event.request?.url?.includes('/api/payments')) {
        event.level = 'fatal';
      }
      return event;
    },
  });
}
