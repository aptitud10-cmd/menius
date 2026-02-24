export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

function isProduction() {
  return process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ROUTES;
}

export async function GET() {
  if (isProduction()) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const checks: Record<string, unknown> = {};

  try {
    const supabase = createClient();
    const tenant = await getTenant();
    checks.authenticated = !!tenant;
    checks.restaurantId = tenant?.restaurantId ?? null;

    if (!tenant) {
      return NextResponse.json({ ok: false, checks, error: 'Not authenticated or no restaurant' });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, owner_user_id')
      .eq('id', tenant.restaurantId)
      .maybeSingle();

    checks.restaurant = restaurant ? { id: restaurant.id, name: restaurant.name, owner: restaurant.owner_user_id } : null;
    checks.ownerMatchesUser = restaurant?.owner_user_id === tenant.userId;

    const { count: productCount, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenant.restaurantId);
    checks.productCount = productCount;
    checks.productReadError = countErr?.message ?? null;

    const { count: catCount, error: catErr } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenant.restaurantId);
    checks.categoryCount = catCount;
    checks.categoryReadError = catErr?.message ?? null;

    const { data: buckets } = await supabase.storage.listBuckets();
    checks.storageBuckets = buckets?.map(b => b.name) ?? [];
    checks.hasProductImagesBucket = checks.storageBuckets && (checks.storageBuckets as string[]).includes('product-images');

    const allOk = checks.authenticated
      && checks.ownerMatchesUser
      && !checks.productReadError
      && !checks.categoryReadError;

    return NextResponse.json({ ok: allOk, checks });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      checks,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
