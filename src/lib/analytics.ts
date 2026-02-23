import posthog from 'posthog-js';

let initialized = false;

const POSTHOG_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '')
  : '';

const POSTHOG_HOST = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  : '';

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });

  initialized = true;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackPageView(url?: string) {
  if (!initialized) return;
  posthog.capture('$pageview', url ? { $current_url: url } : undefined);
}

export function setUserProperties(properties: Record<string, unknown>) {
  if (!initialized) return;
  posthog.setPersonProperties(properties);
}

export { posthog };
