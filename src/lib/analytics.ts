/**
 * PostHog analytics, loaded on demand.
 *
 * `import posthog from 'posthog-js'` at module scope put the whole library
 * (~56KB gzip) in the bundle every visitor downloads, even though initAnalytics()
 * runs in an effect and bails out when there's no key. Measured on prod
 * (menius.app/buccaneer, 2026-08-07): the chunk shipped on every menu view while
 * NEXT_PUBLIC_POSTHOG_KEY wasn't configured at all — pure dead weight.
 *
 * Now the library is fetched only when a key exists, after the page is
 * interactive. Events fired before it lands are queued, not dropped.
 */

type PostHog = typeof import('posthog-js').default;

let posthogInstance: PostHog | null = null;
let loadPromise: Promise<PostHog | null> | null = null;

// Calls made before the library resolves. Bounded so a misconfigured build
// can't grow this forever.
const MAX_QUEUED = 50;
const queue: Array<(ph: PostHog) => void> = [];

const POSTHOG_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? '')
  : '';

const POSTHOG_HOST = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
  : '';

function enqueue(fn: (ph: PostHog) => void) {
  if (posthogInstance) {
    fn(posthogInstance);
    return;
  }
  if (!POSTHOG_KEY) return; // analytics disabled — drop silently, as before
  if (queue.length < MAX_QUEUED) queue.push(fn);
}

export function initAnalytics() {
  if (loadPromise || !POSTHOG_KEY || typeof window === 'undefined') return;

  loadPromise = import('posthog-js')
    .then((mod) => {
      const ph = mod.default;
      ph.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        persistence: 'localStorage+cookie',
        loaded: (loaded) => {
          if (process.env.NODE_ENV === 'development') {
            loaded.debug();
          }
        },
      });
      posthogInstance = ph;
      // Replay whatever happened while the chunk was in flight.
      for (const fn of queue.splice(0)) fn(ph);
      return ph;
    })
    .catch(() => {
      // Blocked by an ad blocker or offline — analytics is never worth breaking
      // the page over. Drop the queue so it can't leak.
      queue.length = 0;
      return null;
    });
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  enqueue((ph) => ph.identify(userId, properties));
}

export function resetUser() {
  enqueue((ph) => ph.reset());
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  enqueue((ph) => ph.capture(event, properties));
}

export function trackPageView(url?: string) {
  enqueue((ph) => ph.capture('$pageview', url ? { $current_url: url } : undefined));
}

export function setUserProperties(properties: Record<string, unknown>) {
  enqueue((ph) => ph.setPersonProperties(properties));
}
