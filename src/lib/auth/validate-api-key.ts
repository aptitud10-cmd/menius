import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest } from 'next/server';

export interface ApiKeyInfo {
  restaurantId: string;
  keyId: string;
}

/**
 * Validate an API key from a request.
 * Accepts the key via:
 *   - Authorization: Bearer mk_live_...
 *   - x-api-key: mk_live_...
 *
 * Returns ApiKeyInfo if valid, null otherwise.
 * Updates last_used_at on the key (fire-and-forget).
 */
export async function validateApiKey(req: NextRequest): Promise<ApiKeyInfo | null> {
  // Extract key from headers
  let raw: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer mk_live_')) {
    raw = authHeader.slice('Bearer '.length).trim();
  } else {
    const xApiKey = req.headers.get('x-api-key');
    if (xApiKey?.startsWith('mk_live_')) {
      raw = xApiKey.trim();
    }
  }

  if (!raw) return null;

  // Basic format check before hitting DB
  if (!/^mk_live_[0-9a-f]{48}$/.test(raw)) return null;

  const hash = createHash('sha256').update(raw).digest('hex');

  const admin = createAdminClient();
  const { data: key } = await admin
    .from('api_keys')
    .select('id, restaurant_id')
    .eq('key_hash', hash)
    .eq('is_active', true)
    .maybeSingle();

  if (!key) return null;

  // Update last_used_at — fire-and-forget, never block the response
  void Promise.resolve(
    admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id),
  ).catch(() => {});

  return { restaurantId: key.restaurant_id, keyId: key.id };
}
