import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') ?? 'los-paisas';

  const steps: Record<string, unknown> = {};

  try {
    const db = createAdminClient();

    // Step 1: basic restaurant query (same as fetchMenuData)
    const { data: restaurant, error: restaurantError } = await db
      .from('restaurants')
      .select('id, name, slug, owner_user_id, is_active, locale, created_at')
      .eq('slug', slug)
      .single();

    steps.step1_restaurant = restaurant ?? null;
    steps.step1_error = restaurantError ? { message: restaurantError.message, code: restaurantError.code } : null;

    if (restaurantError || !restaurant) {
      return NextResponse.json({ ok: false, steps, reason: 'restaurant not found' });
    }

    // Step 2: categories
    const { data: categories, error: catError } = await db
      .from('categories')
      .select('id, name, is_active')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .limit(5);

    steps.step2_categories_count = categories?.length ?? 0;
    steps.step2_error = catError ? catError.message : null;

    // Step 3: products
    const { data: products, error: prodError } = await db
      .from('products')
      .select('id, name, is_active')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .limit(5);

    steps.step3_products_count = products?.length ?? 0;
    steps.step3_error = prodError ? prodError.message : null;

    // Step 4: reviews table (check if it exists)
    const { data: reviews, error: revError } = await db
      .from('reviews')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .limit(1);

    steps.step4_reviews_ok = !revError;
    steps.step4_reviews_error = revError ? revError.message : null;

    // Step 5: subscriptions table
    const { data: sub, error: subError } = await db
      .from('subscriptions')
      .select('status')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    steps.step5_subscription = sub ?? null;
    steps.step5_error = subError ? subError.message : null;

    return NextResponse.json({
      ok: true,
      slug,
      restaurant: { id: restaurant.id, name: restaurant.name, is_active: restaurant.is_active },
      steps,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, fatal: msg, steps }, { status: 500 });
  }
}
