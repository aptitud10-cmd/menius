import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/public/restaurant-menu?slug=X
 * 
 * Fetch COMPLETE restaurant data including:
 * - Restaurant info, categories, products, variants, extras, modifiers
 * - Reviews, ratings, statistics
 * - Delivery zones, special hours, restrictions
 * - Payment methods, promo codes, bundles
 * - Gallery, location, contact methods, policies
 * - AI settings, WhatsApp, social media, loyalty program
 * - Team, events, certifications, allergens, dietary options
 * - Nutritional info, price history, integrations
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

    // 1. Fetch restaurant
    const { data: restaurantData, error: restaurantError } = await adminDb
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: 'Restaurant not found', slug },
        { status: 404 }
      );
    }

    const restaurantId = restaurantData.id;

    // 2. Fetch categories
    const { data: categories = [] } = await adminDb
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 3. Fetch products
    const { data: productsData = [] } = await adminDb
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const products = productsData ?? [];

    // 4. Fetch product variants
    const productIds = products.map(p => p.id);
    const { data: variants = [] } = await adminDb
      .from('product_variants')
      .select('*')
      .in('product_id', productIds.length > 0 ? productIds : ['null']);

    // 5. Fetch product extras
    const { data: extras = [] } = await adminDb
      .from('product_extras')
      .select('*')
      .in('product_id', productIds.length > 0 ? productIds : ['null']);

    // 6. Fetch modifier groups
    const { data: modifierGroups = [] } = await adminDb
      .from('modifier_groups')
      .select('*')
      .in('product_id', productIds.length > 0 ? productIds : ['null']);

    // 7. Fetch modifier options
    const modGroupIds = modifierGroups.map(mg => mg.id);
    const { data: modifierOptions = [] } = await adminDb
      .from('modifier_options')
      .select('*')
      .in('modifier_group_id', modGroupIds.length > 0 ? modGroupIds : ['null']);

    // 8. Fetch reviews
    const { data: reviews = [] } = await adminDb
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50);

    // 9. Fetch delivery zones
    const { data: deliveryZones = [] } = await adminDb
      .from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 10. Fetch payment methods
    const { data: paymentMethods = [] } = await adminDb
      .from('payment_methods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true);

    // 11. Fetch promo codes
    const { data: promoCodes = [] } = await adminDb
      .from('promo_codes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gt('valid_until', new Date().toISOString());

    // 12. Fetch bundles
    const { data: bundles = [] } = await adminDb
      .from('bundles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 13. Fetch gallery
    const { data: gallery = [] } = await adminDb
      .from('gallery')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    // 14. Fetch special hours
    const { data: specialHours = [] } = await adminDb
      .from('special_hours')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('date', new Date().toISOString().split('T')[0]);

    // 15. Fetch delivery restrictions
    const { data: deliveryRestrictions = [] } = await adminDb
      .from('delivery_restrictions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 16. Fetch contact methods
    const { data: contactMethods = [] } = await adminDb
      .from('contact_methods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 17. Fetch policies
    const { data: policies = [] } = await adminDb
      .from('policies')
      .select('*')
      .eq('restaurant_id', restaurantId);

    // 18. Fetch certifications
    const { data: certifications = [] } = await adminDb
      .from('certifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 19. Fetch allergens
    const { data: allergens = [] } = await adminDb
      .from('allergens')
      .select('*')
      .eq('restaurant_id', restaurantId);

    // 20. Fetch dietary options
    const { data: dietaryOptions = [] } = await adminDb
      .from('dietary_options')
      .select('*')
      .eq('restaurant_id', restaurantId);

    // 21. Fetch team members
    const { data: team = [] } = await adminDb
      .from('team_members')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_featured', true)
      .limit(5);

    // 22. Fetch events
    const { data: events = [] } = await adminDb
      .from('events')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10);

    // 23. Fetch social media
    const { data: socialMedia = [] } = await adminDb
      .from('social_media')
      .select('*')
      .eq('restaurant_id', restaurantId);

    // 24. Fetch AI settings
    const { data: aiSettings } = await adminDb
      .from('ai_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 25. Fetch WhatsApp settings
    const { data: whatsappSettings } = await adminDb
      .from('whatsapp_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 26. Fetch loyalty program
    const { data: loyaltyProgram } = await adminDb
      .from('loyalty_programs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .maybeSingle();

    // 27. Fetch customization settings
    const { data: customization } = await adminDb
      .from('customization_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 28. Fetch location
    const { data: location } = await adminDb
      .from('locations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 29. Fetch tax settings
    const { data: taxInfo = [] } = await adminDb
      .from('tax_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 30. Fetch integrations
    const { data: integrations = [] } = await adminDb
      .from('integrations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true);

    // 31. Fetch price history
    const { data: priceHistory = [] } = await adminDb
      .from('price_history')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('changed_at', { ascending: false })
      .limit(50);

    // Calculate statistics
    const { data: completedOrders = [] } = await adminDb
      .from('orders')
      .select('id, total_amount, rating')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed');

    const totalOrders = completedOrders?.length ?? 0;
    const totalRevenue = completedOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0;
    const averageRating = completedOrders && completedOrders.length > 0
      ? parseFloat((completedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / completedOrders.length).toFixed(1))
      : restaurantData.rating || 0;

    const statistics = {
      totalOrders,
      averageRating,
      totalReviews: reviews.length,
      totalRevenue,
      responseRate: 95,
      averagePreparationTime: restaurantData.delivery_time_minutes || 30
    };

    // Calculate bestsellers
    const { data: orderItems = [] } = await adminDb
      .from('order_items')
      .select('product_id')
      .eq('restaurant_id', restaurantId)
      .limit(1000);

    const productCounts: Record<string, number> = {};
    orderItems?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });

    const bestsellers = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => products.find(p => p.id === productId))
      .filter(Boolean);

    // Return complete restaurant data
    return NextResponse.json({
      success: true,
      data: {
        // Core data
        restaurant: restaurantData,
        categories,
        products,
        variants,
        extras,
        modifierGroups,
        modifierOptions,

        // Reviews and ratings
        reviews,
        statistics,
        bestsellers,

        // Delivery and logistics
        deliveryZones,
        specialHours,
        deliveryRestrictions,

        // Bundles and offers
        bundles,
        promoCodes,

        // Gallery and media
        gallery,

        // Location and contact
        location,
        contactMethods,

        // Payment and financial
        paymentMethods,
        taxInfo,

        // Policies and compliance
        policies,
        certifications,

        // Personalization
        customization,

        // AI and automation
        aiSettings,
        whatsappSettings,

        // Community and engagement
        socialMedia,
        loyaltyProgram,
        team,
        events,

        // Integrations
        integrations,

        // Health and nutrition
        allergens,
        dietaryOptions,

        // Analytics
        priceHistory,

        // Metadata
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
