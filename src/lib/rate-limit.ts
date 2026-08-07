/**
 * Rate limiter with optional Redis backend (Upstash).
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set.
 * For multi-instance deployments (Vercel), Redis is required for accuracy.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redisWarningLogged = false;

// ── In-memory fallback ──

const rateMap = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  rateMap.forEach((val, key) => {
    if (val.resetAt < now) rateMap.delete(key);
  });
}

function memoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const existing = rateMap.get(identifier);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowSec * 1000;
    rateMap.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  existing.count++;
  const remaining = Math.max(0, config.limit - existing.count);
  const allowed = existing.count <= config.limit;
  return { allowed, remaining, resetAt: existing.resetAt };
}

// ── Redis rate limiter (per-config cache) ──

let redisClient: Redis | null = null;
const redisLimiterCache = new Map<string, Ratelimit>();

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}

function getRedisLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedisClient();
  if (!redis) return null;

  const key = `${config.limit}:${config.windowSec}`;
  const cached = redisLimiterCache.get(key);
  if (cached) return cached;

  try {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSec} s`),
      analytics: false,
      prefix: 'menius-rl',
    });
    redisLimiterCache.set(key, limiter);
    return limiter;
  } catch {
    return null;
  }
}

// ── Public API ──

export interface RateLimitConfig {
  limit: number;
  windowSec: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 30, windowSec: 60 }
): { allowed: boolean; remaining: number; resetAt: number } {
  return memoryRateLimit(identifier, config);
}

/**
 * Async rate limiter that uses Redis when available, falls back to memory.
 * Preferred for API routes that can await.
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig = { limit: 30, windowSec: 60 }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limiter = getRedisLimiter(config);
  if (!limiter) {
    if (!redisWarningLogged && process.env.NODE_ENV === 'production') {
      console.warn('[rate-limit] Upstash Redis not configured — using in-memory fallback (not shared across instances)');
      redisWarningLogged = true;
    }
    return memoryRateLimit(identifier, config);
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch {
    return memoryRateLimit(identifier, config);
  }
}

/**
 * Resolve the client IP from a Headers bag.
 *
 * Takes Headers (not Request) so server actions — which only have
 * `await headers()` — share this exact implementation. There must be ONE:
 * a second copy in src/lib/actions/auth.ts kept the spoofable
 * `x-forwarded-for[0]` long after this one was fixed, which silently made the
 * login/signup/reset rate limits useless.
 */
export function getClientIPFromHeaders(headers: Headers): string {
  // x-vercel-forwarded-for is set by Vercel's edge network itself, so it can't
  // be spoofed by the client. Prefer it when present.
  const vercelForwarded = headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim();

  // x-forwarded-for is attacker-controllable: a client can prepend arbitrary
  // values, so the FIRST entry is spoofable. The trusted entry is the LAST
  // one — appended by our own edge/proxy right before reaching the app.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const real = headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

export function getClientIP(request: Request): string {
  return getClientIPFromHeaders(request.headers);
}
