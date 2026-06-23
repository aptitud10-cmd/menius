/**
 * GET /api/driver/me
 * Devuelve el perfil del driver autenticado por JWT de Supabase.
 * Usado por la app nativa para saber qué driver es el usuario logueado.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDriverAuthUser } from '@/lib/auth/driver-auth';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('api/driver/me');

export async function GET(req: NextRequest) {
  // Leer usuario desde el JWT (header Bearer en la app, cookie en web)
  const user = await getDriverAuthUser(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar el driver vinculado al usuario autenticado
  const adminClient = createAdminClient();
  const { data: driver, error: dbError } = await adminClient
    .from('drivers')
    .select('id, restaurant_id, name, phone, phone_e164, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (dbError) {
    logger.error('Error al buscar driver por auth_user_id', { userId: user.id, message: dbError.message });
    captureError(dbError, { route: 'GET /api/driver/me', userId: user.id });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  if (!driver.is_active) {
    return NextResponse.json({ error: 'Driver account is inactive' }, { status: 403 });
  }

  return NextResponse.json({
    driverId: driver.id,
    restaurantId: driver.restaurant_id,
    name: driver.name,
    // phone_e164 es la fuente de verdad del login OTP; phone (legacy POS) de fallback.
    phone: driver.phone_e164 ?? driver.phone ?? null,
  });
}
