import * as Sentry from '@sentry/nextjs';
import { sendTelegramAlert } from '@/lib/notifications/telegram';
import { maskEmail } from '@/lib/logger';

interface ErrorContext {
  route?: string;
  restaurantId?: string;
  userId?: string;
  [key: string]: unknown;
}

// Defense-in-depth: callers shouldn't pass raw PII in the context, but with 40+
// call-sites it's easy to slip. Mask anything that looks like an email before it
// reaches Sentry, so customer/owner addresses don't end up in telemetry.
function sanitizeContext(context: ErrorContext): ErrorContext {
  const out: ErrorContext = {};
  for (const [k, v] of Object.entries(context)) {
    out[k] = typeof v === 'string' && v.includes('@') && v.includes('.') ? maskEmail(v) : v;
  }
  return out;
}

// Mask any email-looking substring inside free text (e.g. a DB/Stripe error
// message that embeds a customer address) before it goes to the Telegram alert.
function maskEmailsInText(text: string): string {
  return text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => maskEmail(m) ?? '[redacted]');
}

export function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    if (context) {
      if (context.route) scope.setTag('route', context.route);
      if (context.restaurantId) scope.setTag('restaurant_id', context.restaurantId);
      if (context.userId) scope.setUser({ id: context.userId });
      scope.setExtras(sanitizeContext(context));
    }
    Sentry.captureException(err);
  });

  // Phone push to the operator. Fire-and-forget — telegram.ts never throws and
  // logs its own failures (it does NOT call captureError, so there's no loop).
  const where = context?.route ? ` <code>${context.route}</code>` : '';
  void sendTelegramAlert(`<b>Error</b>${where}\n${maskEmailsInText(err.message)}`, 'error');
}

export function captureWarning(message: string, context?: ErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    if (context) {
      if (context.route) scope.setTag('route', context.route);
      if (context.restaurantId) scope.setTag('restaurant_id', context.restaurantId);
      if (context.userId) scope.setUser({ id: context.userId });
      scope.setExtras(sanitizeContext(context));
    }
    Sentry.captureMessage(message);
  });
}
