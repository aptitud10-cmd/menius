import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getTenant(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) return null;
  return { userId: user.id, restaurantId: profile.default_restaurant_id };
}

export async function GET() {
  const supabase = createClient();
  const tenant = await getTenant(supabase);
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', tenant.restaurantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ restaurant });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const tenant = await getTenant(supabase);
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();

  // Only allow specific fields to be updated
  const allowed = ['name', 'description', 'address', 'phone', 'email', 'website', 'timezone', 'currency', 'logo_url', 'operating_hours'] as const;
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
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
}
