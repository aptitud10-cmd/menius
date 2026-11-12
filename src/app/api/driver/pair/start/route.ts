export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { captureError } from '@/lib/error-reporting';
import {
  generatePairingCode,
  generateDeviceSecret,
  hashDeviceSecret,
  PAIRING_TTL_MS,
} from '@/lib/device-pairing';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST /api/driver/pair/start — la app del repartidor pide un código para mostrar.
 * Sin auth (todavía no tiene sesión). Devuelve el secreto UNA vez: la app lo guarda
 * en memoria y lo prueba en /api/driver/pair/poll. Ver migración 20261112_driver_pairings.
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimitAsync(`driver-pair-start:${ip}`, { limit: 20, windowSec: 600 });
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: NO_STORE });

  const db = createAdminClient();

  // Limpieza: los códigos abandonados no sirven después de un día.
  await db
    .from('driver_pairings')
    .delete()
    .neq('status', 'consumed')
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const secret = generateDeviceSecret();
  const secretHash = hashDeviceSecret(secret);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

  // El índice único parcial rechaza un código vivo repetido: reintentar con otro.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairingCode();
    const { error } = await db
      .from('driver_pairings')
      .insert({ code, secret_hash: secretHash, expires_at: expiresAt });

    if (!error) return NextResponse.json({ code, secret, expiresAt }, { headers: NO_STORE });
    if (error.code !== '23505') {
      captureError(error, { route: '/api/driver/pair/start' });
      return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
    }
  }
  return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
}
