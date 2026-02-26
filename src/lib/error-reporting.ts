import * as Sentry from '@sentry/nextjs';

interface ErrorContext {
  route?: string;
  restaurantId?: string;
  userId?: string;
  [key: string]: unknown;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  Sentry.withScope((scope) => {
    if (context) {
      if (context.route) scope.setTag('route', context.route);
      if (context.restaurantId) scope.setTag('restaurant_id', context.restaurantId);
      if (context.userId) scope.setUser({ id: context.userId });
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}

export function captureWarning(message: string, context?: ErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    if (context) {
      if (context.route) scope.setTag('route', context.route);
      if (context.restaurantId) scope.setTag('restaurant_id', context.restaurantId);
      if (context.userId) scope.setUser({ id: context.userId });
      scope.setExtras(context);
    }
    Sentry.captureMessage(message);
  });
}
