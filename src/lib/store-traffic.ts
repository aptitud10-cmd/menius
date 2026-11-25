/**
 * Store traffic for the owner's Analytics ("Tu tienda online"): visits, the
 * funnel (cart → checkout → order) and dish views, counted per day and per
 * source in our own database (migration 20261126_store_traffic).
 *
 * Nothing personal is sent: restaurant id, event kind, source and, for a dish
 * view, the product id. Each event is sent once per browser tab
 * (sessionStorage), so a reload does not count twice. No cookies.
 */

export type TrafficSource = 'table_qr' | 'google' | 'social' | 'direct' | 'other';
export type StoreEventKind = 'visit' | 'cart' | 'checkout' | 'order' | 'product_view';

const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.com|ecosia\.org)$/;
const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|fb\.com|fb\.me|messenger\.com|tiktok\.com|t\.co|x\.com|twitter\.com|linktr\.ee|threads\.net|whatsapp\.com|wa\.me)$/;
const SEARCH_UTM = /google|gmb|gbp|maps|bing|yelp/;
const SOCIAL_UTM = /instagram|facebook|^fb$|^ig$|meta|tiktok|twitter|^x$|linktree|threads|whatsapp/;

/**
 * Where the visit came from. `null` = navigation inside the same site (keep
 * the source the tab already has).
 */
export function detectSource(url: URL, referrer: string): TrafficSource | null {
  if (url.searchParams.has('table')) return 'table_qr';

  const utm = (url.searchParams.get('utm_source') ?? '').trim().toLowerCase();
  if (utm) {
    if (/qr|table|mesa/.test(utm)) return 'table_qr';
    if (SEARCH_UTM.test(utm)) return 'google';
    if (SOCIAL_UTM.test(utm)) return 'social';
    return 'other';
  }

  if (!referrer) return 'direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'other';
  }
  if (host === url.hostname.toLowerCase()) return null;
  if (SEARCH_HOSTS.test(host)) return 'google';
  if (SOCIAL_HOSTS.test(host)) return 'social';
  return 'other';
}

const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp/i;

interface TabState {
  source: TrafficSource;
  sent: string[];
}

const MAX_SENT = 400;
const stateKey = (restaurantId: string) => `menius:traffic:${restaurantId}`;

function loadState(restaurantId: string): TabState | null {
  try {
    const raw = sessionStorage.getItem(stateKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TabState;
    return parsed && typeof parsed.source === 'string' && Array.isArray(parsed.sent) ? parsed : null;
  } catch {
    return null;
  }
}

function saveState(restaurantId: string, state: TabState) {
  try {
    sessionStorage.setItem(stateKey(restaurantId), JSON.stringify({ ...state, sent: state.sent.slice(-MAX_SENT) }));
  } catch {
    /* private mode / quota: the event is still sent, only dedupe is lost */
  }
}

function eventKey(kind: StoreEventKind, extra?: { productId?: string; orderId?: string }): string {
  if (kind === 'product_view') return `v:${extra?.productId ?? ''}`;
  if (kind === 'order') return `o:${extra?.orderId ?? ''}`;
  return kind;
}

/** Counts one store event for the owner's Analytics. Never throws. */
export function trackStoreEvent(
  restaurantId: string | null | undefined,
  kind: StoreEventKind,
  extra?: { productId?: string; orderId?: string },
): void {
  try {
    if (typeof window === 'undefined' || !restaurantId || restaurantId.startsWith('demo')) return;
    if (navigator.webdriver || BOT_UA.test(navigator.userAgent)) return;
    if (kind === 'product_view' && !extra?.productId) return;

    // Landing straight on the checkout or the order page still counts as a visit.
    if (kind !== 'visit' && !loadState(restaurantId)) trackStoreEvent(restaurantId, 'visit');

    let state = loadState(restaurantId);
    const detected = detectSource(new URL(window.location.href), document.referrer);
    if (!state) state = { source: detected ?? 'direct', sent: [] };

    const key = eventKey(kind, extra);
    if (state.sent.includes(key)) return;
    state.sent.push(key);
    saveState(restaurantId, state);

    const body = JSON.stringify({ r: restaurantId, k: kind, s: state.source, p: extra?.productId ?? null });
    const blob = new Blob([body], { type: 'text/plain' });
    if (!navigator.sendBeacon?.('/api/public/track', blob)) {
      void fetch('/api/public/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    }
  } catch {
    /* analytics never breaks the store */
  }
}
