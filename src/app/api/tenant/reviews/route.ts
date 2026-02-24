export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id, is_visible } = await request.json();
    if (!id || typeof is_visible !== 'boolean') {
      return NextResponse.json({ error: 'id y is_visible requeridos' }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('reviews')
      .update({ is_visible })
      .eq('id', id)
      .eq('restaurant_id', tenant.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
