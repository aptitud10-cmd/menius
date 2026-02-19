import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ restaurant });
  } catch (err) {
    console.error('[tenant/restaurant GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const body = await request.json();

    // Only allow specific fields to be updated
    const allowed = ['name', 'description', 'address', 'phone', 'email', 'website', 'timezone', 'currency', 'locale', 'logo_url', 'cover_image_url', 'operating_hours', 'notification_whatsapp', 'notification_email', 'notifications_enabled', 'order_types_enabled', 'payment_methods_enabled', 'custom_domain'] as const;
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (updates.custom_domain !== undefined) {
      const d = (updates.custom_domain as string).trim().toLowerCase();
      updates.custom_domain = d || null;
      if (d && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
        return NextResponse.json({ error: 'Formato de dominio inválido' }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios' }, { status: 400 });
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', tenant.restaurantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ restaurant });
  } catch (err) {
    console.error('[tenant/restaurant PATCH]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
