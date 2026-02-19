/**
 * Rate limiter with optional Redis backend (Upstash).
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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

// ── Redis rate limiter (singleton) ──

let redisLimiter: Ratelimit | null = null;

function getRedisLimiter(): Ratelimit | null {
  if (redisLimiter) return redisLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    redisLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: false,
      prefix: 'menius-rl',
    });
    return redisLimiter;
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
  const limiter = getRedisLimiter();
  if (!limiter) return memoryRateLimit(identifier, config);

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

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
