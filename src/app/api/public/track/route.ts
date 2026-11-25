export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('store-traffic');

/**
 * Store traffic counters for the owner's Analytics (lib/store-traffic.ts).
 * Sent with navigator.sendBeacon (text/plain). Always answers 204: the
 * browser does not read the answer and a failure must never show in the store.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(['visit', 'cart', 'checkout', 'order', 'product_view']);
const SOURCES = new Set(['table_qr', 'google', 'social', 'direct', 'other']);
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless/i;

const done = () => new Response(null, { status: 204 });

// Missing migration (table/function not created yet): log once per instance.
let warnedMissing = false;

export async function POST(request: NextRequest) {
  try {
    if (BOT_UA.test(request.headers.get('user-agent') ?? '')) return done();

    const raw = await request.text();
    if (raw.length > 1024) return done();
    const body = JSON.parse(raw) as { r?: unknown; k?: unknown; s?: unknown; p?: unknown };

    const restaurantId = typeof body.r === 'string' && UUID_RE.test(body.r) ? body.r : null;
    const kind = typeof body.k === 'string' && KINDS.has(body.k) ? body.k : null;
    if (!restaurantId || !kind) return done();
    const source = typeof body.s === 'string' && SOURCES.has(body.s) ? body.s : 'other';
    const productId = typeof body.p === 'string' && UUID_RE.test(body.p) ? body.p : null;
    if (kind === 'product_view' && !productId) return done();

    // One visitor sends a handful per visit; a menu browse can open many dishes.
    const { allowed } = await checkRateLimitAsync(`store-track:${getClientIP(request)}`, { limit: 120, windowSec: 60 });
    if (!allowed) return done();

    const { error } = await createAdminClient().rpc('track_store_event', {
      p_restaurant_id: restaurantId,
      p_kind: kind,
      p_source: source,
      p_product_id: productId,
    });
    if (error) {
      const missing = error.code === '42883' || error.code === 'PGRST202' || /does not exist|could not find/i.test(error.message);
      if (!missing) logger.warn('track_store_event failed', { code: error.code, error: error.message });
      else if (!warnedMissing) {
        warnedMissing = true;
        logger.warn('track_store_event not installed yet (migration 20261126_store_traffic)');
      }
    }
  } catch {
    /* malformed body: ignore */
  }
  return done();
}
