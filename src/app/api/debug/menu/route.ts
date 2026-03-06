import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') ?? 'los-paisas';

  const steps: Record<string, unknown> = {};

  try {
    const db = createAdminClient();

    // Step 1a: simple query (basic columns)
    const { data: restaurantSimple, error: simpleError } = await db
      .from('restaurants')
      .select('id, name, slug, is_active')
      .eq('slug', slug)
      .single();

    steps.step1a_simple = restaurantSimple ?? null;
    steps.step1a_error = simpleError ? { message: simpleError.message, code: simpleError.code } : null;

    // Step 1b: FULL query — same exact SELECT as fetchMenuData (this is the real test)
    const { data: restaurant, error: restaurantError } = await db
      .from('restaurants')
      .select('id, name, slug, owner_user_id, timezone, currency, locale, available_locales, logo_url, cover_image_url, description, address, phone, email, website, custom_domain, operating_hours, notification_whatsapp, notification_email, notifications_enabled, order_types_enabled, payment_methods_enabled, estimated_delivery_minutes, delivery_fee, latitude, longitude, stripe_account_id, stripe_onboarding_complete, is_active, created_at')
      .eq('slug', slug)
      .single();

    steps.step1b_full_query = restaurant ? 'OK' : null;
    steps.step1b_error = restaurantError ? { message: restaurantError.message, code: restaurantError.code } : null;

    if (simpleError || !restaurantSimple) {
      return NextResponse.json({ ok: false, steps, reason: 'restaurant not found even with simple query' });
    }

    const rid = restaurantSimple.id;

    // Step 2: categories with sort_order (same as fetchMenuData)
    const { data: categories, error: catError } = await db
      .from('categories')
      .select('*')
      .eq('restaurant_id', rid)
      .eq('is_active', true)
      .order('sort_order');

    steps.step2_categories_count = categories?.length ?? 0;
    steps.step2_error = catError ? catError.message : null;
    steps.step2_columns = categories?.[0] ? Object.keys(categories[0]) : [];

    // Step 3: products with sort_order (same as fetchMenuData)
    const { data: products, error: prodError } = await db
      .from('products')
      .select('*')
      .eq('restaurant_id', rid)
      .eq('is_active', true)
      .order('sort_order');

    steps.step3_products_count = products?.length ?? 0;
    steps.step3_error = prodError ? prodError.message : null;
    steps.step3_columns = products?.[0] ? Object.keys(products[0]) : [];

    // Step 4: reviews table (check if it exists)
    const { data: reviews, error: revError } = await db
      .from('reviews')
      .select('id')
      .eq('restaurant_id', rid)
      .limit(1);

    steps.step4_reviews_ok = !revError;
    steps.step4_reviews_error = revError ? revError.message : null;

    // Step 5: subscriptions table
    const { data: sub, error: subError } = await db
      .from('subscriptions')
      .select('status')
      .eq('restaurant_id', rid)
      .maybeSingle();

    steps.step5_subscription = sub ?? null;
    steps.step5_error = subError ? subError.message : null;

    return NextResponse.json({
      ok: true,
      slug,
      restaurant: { id: restaurantSimple.id, name: restaurantSimple.name, is_active: restaurantSimple.is_active },
      steps,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, fatal: msg, steps }, { status: 500 });
  }
}
