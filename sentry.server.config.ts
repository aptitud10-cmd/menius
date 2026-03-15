import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Higher sample rate on server — less traffic, more critical
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,

    // Don't report Next.js navigation errors (not real errors)
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],

    beforeSend(event) {
      if (process.env.NODE_ENV === 'development') return null;

      // Mark payment webhook errors as critical
      if (event.request?.url?.includes('/api/billing/webhook') ||
          event.request?.url?.includes('/api/payments/webhook') ||
          event.request?.url?.includes('/api/connect/webhook')) {
        event.level = 'fatal';
        event.tags = { ...event.tags, critical: 'webhook' };
      }

      // Mark order-related server errors as high priority
      if (event.request?.url?.includes('/api/orders')) {
        event.tags = { ...event.tags, priority: 'high' };
      }

      return event;
    },
  });
}
