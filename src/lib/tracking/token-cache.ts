/**
 * Redis cache for driver tracking tokens.
 * token_prefix (first 16 chars) → { orderId, expiresAt }
 *
 * Eliminates 1 Postgres SELECT per GPS ping on cache hit.
 * Falls back silently to DB when Redis is unavailable.
 */

interface TokenCacheEntry { orderId: string; expiresAt: string | null }

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

export async function getCachedToken(tokenPrefix: string): Promise<TokenCacheEntry | null> {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    return await redis.get<TokenCacheEntry>(`dtoken:${tokenPrefix}`) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedToken(tokenPrefix: string, entry: TokenCacheEntry): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.set(`dtoken:${tokenPrefix}`, entry, { ex: 7_200 });
  } catch { /* silent — falls back to DB on next request */ }
}

export async function evictTokenCache(tokenPrefix: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.del(`dtoken:${tokenPrefix}`);
  } catch { /* silent */ }
}
