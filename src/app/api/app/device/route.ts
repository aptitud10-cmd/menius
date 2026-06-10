export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app:device');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Columns the mobile app reads back after an upsert.
const RETURN_COLS = 'id, device_uuid, display_name, phone, email, favorites, addresses, preferences';

/**
 * Guest-first device upsert for the Menius mobile app.
 *
 * Replaces the app's direct anon-key writes to `app_devices`. The table holds
 * customer PII (phone, email, addresses), so anon RLS on it was closed; all
 * writes now flow through this server endpoint with the admin client, keyed by
 * the app-generated `device_uuid`. A device can only ever touch its own row.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await checkRateLimitAsync(`app-device:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { device_uuid, platform, profile } = body as {
      device_uuid?: string;
      platform?: string;
      profile?: Record<string, unknown>;
    };

    if (!device_uuid || !UUID_RE.test(String(device_uuid))) {
      return NextResponse.json({ error: 'device_uuid must be a valid UUID' }, { status: 400 });
    }

    // Allowlist the columns the app may set — never trust arbitrary keys from the client.
    const ALLOWED = ['display_name', 'phone', 'email', 'favorites', 'addresses', 'preferences'] as const;
    const patch: Record<string, unknown> = {};
    if (profile && typeof profile === 'object') {
      for (const key of ALLOWED) {
        if (key in profile) patch[key] = (profile as Record<string, unknown>)[key];
      }
    }

    const adminDb = createAdminClient();

    const { data, error } = await adminDb
      .from('app_devices')
      .upsert(
        {
          device_uuid,
          ...(platform ? { platform } : {}),
          ...patch,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'device_uuid' },
      )
      .select(RETURN_COLS)
      .single();

    if (error) {
      logger.error('device upsert failed', { error: error.message });
      return NextResponse.json({ error: 'Could not save device' }, { status: 500 });
    }

    return NextResponse.json({ device: data });
  } catch (err) {
    logger.error('POST /api/app/device failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
