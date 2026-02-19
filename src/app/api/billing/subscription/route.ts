import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
