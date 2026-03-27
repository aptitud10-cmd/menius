import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/public/restaurant-menu?slug=X
 *
 * Returns complete restaurant data for mobile/external integrations.
 * All DB queries run in parallel via Promise.all for maximum performance.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimitAsync(`restaurant-menu:${ip}`, { limit: 120, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  try {
    const adminDb = createAdminClient();

    // Step 1: Fetch restaurant (required — fail fast if not found)
    // Exclude sensitive/internal fields: owner_user_id
    const { data: restaurant, error: restaurantError } = await adminDb
      .from('restaurants')
      .select('id, name, slug, description, logo_url, cover_image_url, address, phone, email, currency, timezone, is_active, rating, delivery_time_minutes, estimated_delivery_minutes, delivery_fee, min_order_amount, max_order_amount, accepts_delivery, accepts_pickup, accepts_dine_in, table_ordering_enabled, custom_domain, primary_color, secondary_color, pause_orders, pause_message, locale, country_code, tax_rate, tax_included, tax_label, tip_enabled, tip_percentages, whatsapp_number, instagram_url, facebook_url, website_url, created_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found', slug }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    // Step 2: All remaining queries in PARALLEL — ~8x faster than sequential
    const [
      { data: categoriesData },
      { data: productsData },
      { data: reviewsData },
      { data: promotionsData },
      { data: reservationsData },
      { data: staffData },
      { data: tablesData },
      { data: ordersData },
    ] = await Promise.all([
      adminDb
        .from('categories')
        .select('id, restaurant_id, name, name_en, description, description_en, image_url, sort_order, is_active, available_from, available_to')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      adminDb
        .from('products')
        .select('id, restaurant_id, category_id, name, name_en, description, description_en, price, image_url, sort_order, is_active, in_stock, is_featured, dietary_tags, calories, preparation_time_minutes, allergens')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      adminDb
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at, is_approved')
        .eq('restaurant_id', restaurantId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(30),

      adminDb
        .from('promotions')
        .select('id, restaurant_id, title, title_en, description, description_en, discount_type, discount_value, code, is_active, start_date, end_date, min_order_amount, image_url')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true),

      adminDb
        .from('reservations')
        .select('id, status, party_size, reserved_at, notes')
        .eq('restaurant_id', restaurantId)
        .gte('reserved_at', new Date().toISOString())
        .order('reserved_at', { ascending: true })
        .limit(20),

      adminDb
        .from('staff_members')
        .select('id, name, role, photo_url')
        .eq('restaurant_id', restaurantId)
        .limit(10),

      adminDb
        .from('tables')
        .select('id, restaurant_id, table_number, name, capacity, qr_code_url, is_active')
        .eq('restaurant_id', restaurantId),

      // Limit orders to last 500 for stats — avoids loading entire history
      adminDb
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const categories = categoriesData ?? [];
    const products = productsData ?? [];
    const reviews = reviewsData ?? [];
    const promotions = promotionsData ?? [];
    const reservations = reservationsData ?? [];
    const staff = staffData ?? [];
    const tables = tablesData ?? [];
    const completedOrders = ordersData ?? [];

    // Step 3: Product-level queries in parallel (need productIds first)
    const productIds = products.map(p => p.id);
    const safeIds = productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'];

    const [
      { data: variantsData },
      { data: extrasData },
      { data: modifierGroupsData },
      { data: orderItemsData },
    ] = await Promise.all([
      adminDb.from('product_variants').select('id, product_id, name, name_en, price, is_active, sort_order').in('product_id', safeIds),
      adminDb.from('product_extras').select('id, product_id, name, name_en, price, is_active, sort_order').in('product_id', safeIds),
      adminDb.from('modifier_groups').select('id, product_id, name, name_en, is_required, min_selections, max_selections, sort_order, display_type').in('product_id', safeIds),
      adminDb
        .from('order_items')
        .select('product_id')
        .eq('restaurant_id', restaurantId)
        .limit(1000),
    ]);

    const variants = variantsData ?? [];
    const extras = extrasData ?? [];
    const modifierGroups = modifierGroupsData ?? [];
    const orderItems = orderItemsData ?? [];

    // Step 4: Modifier options (needs modifierGroupIds)
    const modGroupIds = modifierGroups.map(mg => mg.id);
    const safeMgIds = modGroupIds.length > 0 ? modGroupIds : ['00000000-0000-0000-0000-000000000000'];

    const { data: modifierOptionsData } = await adminDb
      .from('modifier_options')
      .select('id, modifier_group_id, name, name_en, price, is_active, sort_order')
      .in('modifier_group_id', safeMgIds);

    const modifierOptions = modifierOptionsData ?? [];

    // Calculate statistics
    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const averageRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
          )
        : restaurant.rating || 0;

    const statistics = {
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageRating,
      totalReviews: reviews.length,
      averagePreparationTime: restaurant.delivery_time_minutes || 30,
    };

    // Calculate bestsellers from order_items
    const productCounts: Record<string, number> = {};
    orderItems.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });

    const bestsellers = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => products.find(p => p.id === productId))
      .filter(Boolean);

    const responseData = {
      success: true,
      data: {
        // Core menu
        restaurant,
        categories,
        products,
        variants,
        extras,
        modifierGroups,
        modifierOptions,

        // Reviews & analytics
        reviews,
        statistics,
        bestsellers,

        // Offers
        promotions,

        // Operations
        reservations,
        tables,
        staff,

        // Metadata
        timestamp: new Date().toISOString(),
        version: '2.1.0',
      },
    };

    return NextResponse.json(responseData, {
      headers: {
        // Cache for 60s on CDN, serve stale for up to 5 min while revalidating
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
