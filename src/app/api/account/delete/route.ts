export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const logger = createLogger('account-delete');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();
    const { confirmation } = body;

    if (confirmation !== 'ELIMINAR') {
      return NextResponse.json({ error: 'Confirmación incorrecta. Escribe ELIMINAR para confirmar.' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rid = tenant.restaurantId;

    // Delete restaurant (cascades: categories, products, orders, customers, tables, subscriptions)
    const { error: deleteErr } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', rid)
      .eq('owner_user_id', user.id);

    if (deleteErr) {
      logger.error('Failed to delete restaurant', { error: deleteErr.message, restaurantId: rid });
      return NextResponse.json({ error: 'No se pudo eliminar el restaurante. Contacta soporte.' }, { status: 500 });
    }

    // Delete profile
    await supabase.from('profiles').delete().eq('user_id', user.id);

    // Delete Supabase Auth user (requires service role key)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await adminClient.auth.admin.deleteUser(user.id);
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Delete account failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
