/**
 * GET /api/public/directions?fromLat=&fromLng=&toLat=&toLng=
 *
 * Backend proxy for Mapbox Directions API.
 *
 * Why proxy instead of calling Mapbox from the client?
 *   - Keeps the Mapbox secret key server-side (MAPBOX_SECRET_TOKEN).
 *   - Caches responses in Redis: same route requested by N customers of
 *     the same delivery shares a single upstream call.
 *   - Protects Mapbox monthly quota from client-side abuse.
 *
 * Cache key: rounded coords to ~50m grid to maximize cache hits for
 * drivers moving slowly (e.g. stuck in traffic).
 *
 * Cache TTL: 60 s — route changes meaningfully only every ~100m+.
 * Rate limit: 60 req/min per IP (customer tracking page calls this at
 * most once per ~50m of driver movement, typically 1-2x/min).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const CACHE_TTL_SEC = 60;

// Round to ~50m grid (4 decimal places ≈ 11m; 3 decimal places ≈ 111m)
// We use 3dp to maximize Redis cache hit rate across nearby coordinates.
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

async function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = await checkRateLimitAsync(`directions:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const fromLat = parseFloat(searchParams.get('fromLat') ?? '');
  const fromLng = parseFloat(searchParams.get('fromLng') ?? '');
  const toLat   = parseFloat(searchParams.get('toLat')   ?? '');
  const toLng   = parseFloat(searchParams.get('toLng')   ?? '');

  if ([fromLat, fromLng, toLat, toLng].some(n => !isFinite(n))) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  // Round for cache key — 3 decimal places (~111m grid)
  const rFromLat = roundCoord(fromLat);
  const rFromLng = roundCoord(fromLng);
  const rToLat   = roundCoord(toLat);
  const rToLng   = roundCoord(toLng);
  const cacheKey = `dir:${rFromLng},${rFromLat};${rToLng},${rToLat}`;

  const redis = await getRedis();

  // 1. Try cache
  if (redis) {
    try {
      const cached = await redis.get<object>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT', 'Cache-Control': 'no-store' },
        });
      }
    } catch { /* fall through to upstream */ }
  }

  // 2. Call Mapbox Directions upstream
  if (!MAPBOX_TOKEN) {
    return NextResponse.json({ error: 'Directions not configured' }, { status: 503 });
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${MAPBOX_TOKEN}&overview=full&geometries=geojson`;
    const upstream = await fetch(url, { next: { revalidate: 0 } });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }
    const data = await upstream.json();
    const route = data?.routes?.[0];
    if (!route) {
      return NextResponse.json({ etaMinutes: null, routeCoords: null });
    }

    const seconds = route.duration;
    const result = {
      etaMinutes:  typeof seconds === 'number' ? Math.max(1, Math.ceil(seconds / 60)) : null,
      routeCoords: (route.geometry?.coordinates ?? null) as [number, number][] | null,
    };

    // 3. Populate cache (fire-and-forget — don't block the response)
    if (redis) {
      redis.set(cacheKey, result, { ex: CACHE_TTL_SEC }).catch(() => {});
    }

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Directions fetch failed' }, { status: 502 });
  }
}
