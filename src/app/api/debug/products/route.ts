export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
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

    const testName = `__test_${Date.now()}`;
    const firstCat = await supabase
      .from('categories')
      .select('id')
      .eq('restaurant_id', tenant.restaurantId)
      .limit(1)
      .maybeSingle();

    if (firstCat.data?.id) {
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert({
          restaurant_id: tenant.restaurantId,
          category_id: firstCat.data.id,
          name: testName,
          price: 0,
          is_active: false,
        })
        .select('id')
        .single();

      checks.insertTest = insertErr ? { error: insertErr.message, code: insertErr.code } : { id: inserted?.id };

      if (inserted?.id) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({ name: testName + '_updated' })
          .eq('id', inserted.id)
          .eq('restaurant_id', tenant.restaurantId);

        checks.updateTest = updateErr ? { error: updateErr.message } : 'OK';

        const { error: deleteErr } = await supabase
          .from('products')
          .delete()
          .eq('id', inserted.id);

        checks.deleteTest = deleteErr ? { error: deleteErr.message } : 'OK';
      }
    } else {
      checks.insertTest = 'SKIPPED (no categories)';
    }

    const { data: buckets } = await supabase.storage.listBuckets();
    checks.storageBuckets = buckets?.map(b => b.name) ?? [];
    checks.hasProductImagesBucket = checks.storageBuckets && (checks.storageBuckets as string[]).includes('product-images');

    const allOk = checks.authenticated
      && checks.ownerMatchesUser
      && !checks.productReadError
      && !checks.categoryReadError
      && (checks.insertTest as any)?.id
      && checks.updateTest === 'OK'
      && checks.deleteTest === 'OK';

    return NextResponse.json({ ok: allOk, checks });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      checks,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
