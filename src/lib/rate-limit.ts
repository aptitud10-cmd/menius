/**
 * Simple in-memory rate limiter for serverless API routes.
 * Uses a sliding window approach per IP.
 * 
 * Note: In production with multiple instances, use Redis or Upstash instead.
 */

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

export interface RateLimitConfig {
  /** Max number of requests in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 30, windowSec: 60 }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const key = identifier;
  const existing = rateMap.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowSec * 1000;
    rateMap.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  existing.count++;
  const remaining = Math.max(0, config.limit - existing.count);
  const allowed = existing.count <= config.limit;

  return { allowed, remaining, resetAt: existing.resetAt };
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}
