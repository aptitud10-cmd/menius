export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { encryptSecret } from '@/lib/crypto/secrets';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api:wompi-keys');

/**
 * Per-restaurant Wompi credentials (Colombia). Wompi has no Stripe Connect
 * equivalent, so each restaurant pastes its OWN keys and charges land directly
 * in its account. Secrets are encrypted at rest (aes-256-gcm) and NEVER
 * returned to the client — GET only reports connection status.
 */

export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from('restaurants')
    .select('wompi_connected, wompi_public_key')
    .eq('id', tenant.restaurantId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    connected: !!data?.wompi_connected,
    // The public key is not a secret (it ships to the browser at checkout).
    public_key: data?.wompi_public_key ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const publicKey = typeof body?.public_key === 'string' ? body.public_key.trim() : '';
    const integritySecret = typeof body?.integrity_secret === 'string' ? body.integrity_secret.trim() : '';
    const eventsSecret = typeof body?.events_secret === 'string' ? body.events_secret.trim() : '';

    if (!/^pub_(test|prod)_[A-Za-z0-9_]{8,}$/.test(publicKey)) {
      return NextResponse.json(
        { error: 'Llave pública inválida (debe empezar con pub_test_ o pub_prod_)' },
        { status: 400 },
      );
    }
    if (integritySecret.length < 10 || eventsSecret.length < 10) {
      return NextResponse.json(
        { error: 'Secreto de integridad y secreto de eventos son requeridos' },
        { status: 400 },
      );
    }

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from('restaurants')
      .update({
        wompi_public_key: publicKey,
        wompi_integrity_secret_enc: encryptSecret(integritySecret),
        wompi_events_secret_enc: encryptSecret(eventsSecret),
        wompi_connected: true,
      })
      .eq('id', tenant.restaurantId);

    if (error) {
      logger.error('wompi keys save failed', { restaurant: tenant.restaurantId, error: error.message });
      return NextResponse.json({ error: 'No se pudieron guardar las llaves' }, { status: 500 });
    }

    return NextResponse.json({ connected: true });
  } catch (err) {
    logger.error('wompi keys error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from('restaurants')
    .update({
      wompi_public_key: null,
      wompi_integrity_secret_enc: null,
      wompi_events_secret_enc: null,
      wompi_connected: false,
    })
    .eq('id', tenant.restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: false });
}
