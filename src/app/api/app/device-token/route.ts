export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app:device-token');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Register / deactivate an Expo push token for a mobile device.
 *
 * Replaces the app's direct anon-key writes to `app_device_tokens` (which held
 * raw expo_push_tokens under an open RLS policy). The device is identified by its
 * app-generated `device_uuid`; the server resolves the internal `device_id` so a
 * device can only manage its own tokens.
 *
 * Body: { device_uuid, expo_push_token, platform?, is_active }
 *   is_active=true  → upsert (register)
 *   is_active=false → deactivate the matching token
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await checkRateLimitAsync(`app-device-token:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { device_uuid, expo_push_token, platform, is_active } = body as {
      device_uuid?: string;
      expo_push_token?: string;
      platform?: string;
      is_active?: boolean;
    };

    if (!device_uuid || !UUID_RE.test(String(device_uuid))) {
      return NextResponse.json({ error: 'device_uuid must be a valid UUID' }, { status: 400 });
    }
    if (!expo_push_token || typeof expo_push_token !== 'string') {
      return NextResponse.json({ error: 'expo_push_token required' }, { status: 400 });
    }

    const adminDb = createAdminClient();

    // Resolve the internal device id from the public device_uuid.
    const { data: device } = await adminDb
      .from('app_devices')
      .select('id')
      .eq('device_uuid', device_uuid)
      .maybeSingle();

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    if (is_active === false) {
      // Deactivate the matching token.
      const { error } = await adminDb
        .from('app_device_tokens')
        .update({ is_active: false })
        .eq('device_id', device.id)
        .eq('expo_push_token', expo_push_token);
      if (error) {
        logger.error('token deactivate failed', { error: error.message });
        return NextResponse.json({ error: 'Could not deactivate token' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Register / refresh the token.
    const { error } = await adminDb
      .from('app_device_tokens')
      .upsert(
        {
          device_id: device.id,
          expo_push_token,
          ...(platform ? { platform } : {}),
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'device_id,expo_push_token' },
      );

    if (error) {
      logger.error('token upsert failed', { error: error.message });
      return NextResponse.json({ error: 'Could not save token' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('POST /api/app/device-token failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
