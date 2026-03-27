import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/public/restaurant/[slug]/menu
 * 
 * Fetch COMPLETE restaurant data including menu, reviews, delivery zones,
 * payment methods, promo codes, AI settings, WhatsApp, statistics, special hours,
 * delivery restrictions, bundles, gallery, location, policies, contact methods,
 * bestsellers, nutritional info, certifications, and more.
 * 
 * This is the primary endpoint for mobile apps and external integrations.
 * 
 * Returns comprehensive restaurant data with 20+ data categories.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimitAsync(`restaurant-menu:${ip}`, { limit: 120, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = params.slug;
  if (!slug) {
    return NextResponse.json(
      { error: 'Restaurant slug is required' },
      { status: 400 }
    );
  }

  try {
    const adminDb = createAdminClient();

    // 1. Fetch restaurant (complete info)
    const { data: restaurantData, error: restaurantError } = await adminDb
      .from('restaurants')
      .select(
        `id, name, slug, currency, locale, description, image_url, 
         phone, email, address, website, instagram, facebook, tiktok,
         operating_hours, orders_paused_until, is_active, created_at,
         payment_methods_enabled, order_types_enabled, dietary_tags,
         translations, timezone, rating, review_count, min_order_value,
         delivery_fee, delivery_time_minutes, whatsapp_number,
         whatsapp_enabled, ai_enabled, ai_model, ai_settings,
         custom_domain, logo_url, banner_url, theme_color,
         seo_title, seo_description, seo_keywords,
         analytics_enabled, google_analytics_id, facebook_pixel_id,
         latitude, longitude`
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const restaurantId = restaurantData.id;

    // 2. Fetch categories
    const { data: categoriesData } = await adminDb
      .from('categories')
      .select('id, name, icon, sort_order, is_active, translations, description')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 3. Fetch products
    const { data: productsData } = await adminDb
      .from('products')
      .select(
        `id, name, description, price, price_delta, category_id, 
         image_url, is_active, is_featured, in_stock, dietary_tags, 
         translations, sort_order, created_at, sku, barcode,
         preparation_time_minutes, calories, allergens, protein, fat, carbs`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 4. Fetch product variants
    const { data: variantsData } = await adminDb
      .from('product_variants')
      .select('id, product_id, name, price_delta, is_default, sort_order')
      .in('product_id', productsData?.map((p) => p.id) ?? []);

    // 5. Fetch product extras
    const { data: extrasData } = await adminDb
      .from('product_extras')
      .select('id, product_id, name, price, sort_order')
      .in('product_id', productsData?.map((p) => p.id) ?? []);

    // 6. Fetch modifier groups and options
    const { data: modGroupsData } = await adminDb
      .from('modifier_groups')
      .select('id, product_id, name, selection_type, is_required, min_select, max_select, sort_order, display_type')
      .in('product_id', productsData?.map((p) => p.id) ?? []);

    const { data: modOptionsData } = await adminDb
      .from('modifier_options')
      .select('id, group_id, name, price_delta, is_default, sort_order')
      .in('group_id', modGroupsData?.map((mg) => mg.id) ?? []);

    // 7. Fetch reviews
    const { data: reviewsData } = await adminDb
      .from('reviews')
      .select('id, rating, comment, customer_name, created_at, order_id')
      .eq('restaurant_id', restaurantId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50);

    // 8. Fetch delivery zones
    const { data: deliveryZonesData } = await adminDb
      .from('delivery_zones')
      .select(
        `id, name, coordinates, delivery_fee, delivery_time_minutes, 
         is_active, min_order_value, max_orders_per_day`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 9. Fetch payment methods
    const { data: paymentMethodsData } = await adminDb
      .from('payment_methods')
      .select(
        `id, type, name, is_enabled, icon_url, 
         settings, fee_percentage, processing_time_minutes`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true);

    // 10. Fetch active promo codes
    const { data: promoCodesData } = await adminDb
      .from('promo_codes')
      .select(
        `id, code, type, value, max_uses, used_count, 
         min_order_value, valid_from, valid_until, is_active`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gt('valid_until', new Date().toISOString());

    // 11. Fetch AI settings and capabilities
    const { data: aiSettingsData } = await adminDb
      .from('ai_settings')
      .select(
        `id, model, is_enabled, features, temperature, 
         max_tokens, system_prompt, voice_enabled, voice_language`
      )
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 12. Fetch WhatsApp settings
    const { data: whatsappSettingsData } = await adminDb
      .from('whatsapp_settings')
      .select(
        `id, phone_number, is_enabled, auto_reply_enabled, 
         auto_reply_message, webhook_url, api_key_masked`
      )
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 13. Fetch social media links
    const { data: socialMediaData } = await adminDb
      .from('social_media')
      .select('id, platform, url, handle, follower_count')
      .eq('restaurant_id', restaurantId);

    // 14. Fetch customization settings
    const { data: customizationData } = await adminDb
      .from('customization_settings')
      .select(
        `id, primary_color, secondary_color, font_family, 
         logo_url, banner_url, favicon_url, custom_css,
         show_ratings, show_delivery_time, show_preparation_time`
      )
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // 15. Fetch loyalty program settings
    const { data: loyaltyData } = await adminDb
      .from('loyalty_programs')
      .select(
        `id, name, is_enabled, points_per_purchase, 
         points_multiplier, redemption_rules, tier_benefits`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true)
      .maybeSingle();

    // 16. Fetch integrations
    const { data: integrationsData } = await adminDb
      .from('integrations')
      .select(
        `id, type, is_enabled, api_key_masked, 
         webhook_url, settings, last_sync_at`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_enabled', true);

    // 17. Fetch allergen information
    const { data: allergensData } = await adminDb
      .from('allergens')
      .select('id, name, icon_url, is_common')
      .eq('restaurant_id', restaurantId);

    // 18. Fetch dietary options
    const { data: dietaryOptionsData } = await adminDb
      .from('dietary_options')
      .select('id, name, icon_url, description')
      .eq('restaurant_id', restaurantId);

    // 19. Fetch restaurant statistics
    const { data: ordersData } = await adminDb
      .from('orders')
      .select('id, total_amount, rating')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'completed');

    const totalOrders = ordersData?.length ?? 0;
    const averageRating = ordersData && ordersData.length > 0
      ? (ordersData.reduce((sum, o) => sum + (o.rating || 0), 0) / ordersData.length).toFixed(1)
      : restaurantData.rating || 0;
    const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0;

    const statistics = {
      totalOrders,
      averageRating: parseFloat(averageRating),
      totalReviews: reviewsData?.length ?? 0,
      totalRevenue,
      responseRate: 95, // Placeholder - calculate from actual data if available
      averagePreparationTime: restaurantData.delivery_time_minutes || 30
    };

    // 20. Fetch special hours (holidays, temporary closures)
    const { data: specialHoursData } = await adminDb
      .from('special_hours')
      .select(
        `id, date, is_closed, opening_time, closing_time, 
         reason, created_at`
      )
      .eq('restaurant_id', restaurantId)
      .gte('date', new Date().toISOString().split('T')[0]);

    // 21. Fetch delivery restrictions
    const { data: deliveryRestrictionsData } = await adminDb
      .from('delivery_restrictions')
      .select(
        `id, min_order_value, max_orders_per_hour, 
         delivery_hours_start, delivery_hours_end, 
         max_delivery_distance_km, is_active`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    const deliveryRestrictions = deliveryRestrictionsData || {
      minOrder: restaurantData.min_order_value || 0,
      maxOrdersPerHour: 999,
      deliveryHoursStart: '09:00',
      deliveryHoursEnd: '23:00',
      maxDeliveryDistanceKm: 50,
      isActive: true
    };

    // 22. Fetch bundles/combos
    const { data: bundlesData } = await adminDb
      .from('bundles')
      .select(
        `id, name, description, price, discount_percentage, 
         items, image_url, is_active, sort_order`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 23. Fetch gallery (restaurant photos)
    const { data: galleryData } = await adminDb
      .from('gallery')
      .select(
        `id, image_url, title, description, category, 
         sort_order, created_at`
      )
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    // 24. Fetch location details
    const { data: locationData } = await adminDb
      .from('locations')
      .select(
        `id, address, latitude, longitude, city, state, 
         postal_code, country, map_url, directions_url`
      )
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    const location = locationData || {
      address: restaurantData.address,
      latitude: restaurantData.latitude,
      longitude: restaurantData.longitude,
      city: null,
      state: null,
      postalCode: null,
      country: null
    };

    // 25. Fetch policies
    const { data: policiesData } = await adminDb
      .from('policies')
      .select(
        `id, type, content, updated_at`
      )
      .eq('restaurant_id', restaurantId);

    const policies = {
      termsOfService: policiesData?.find(p => p.type === 'terms')?.content || '',
      privacyPolicy: policiesData?.find(p => p.type === 'privacy')?.content || '',
      returnPolicy: policiesData?.find(p => p.type === 'return')?.content || '',
      cancellationPolicy: policiesData?.find(p => p.type === 'cancellation')?.content || ''
    };

    // 26. Fetch contact methods
    const { data: contactMethodsData } = await adminDb
      .from('contact_methods')
      .select(
        `id, type, value, is_primary, response_hours_start, 
         response_hours_end, is_active`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 27. Fetch bestsellers (most ordered products)
    const { data: bestsellersData } = await adminDb
      .from('order_items')
      .select('product_id')
      .eq('restaurant_id', restaurantId)
      .limit(1000);

    const productCounts: Record<string, number> = {};
    bestsellersData?.forEach(item => {
      productCounts[item.product_id] = (productCounts[item.product_id] || 0) + 1;
    });

    const bestsellers = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([productId]) => 
        productsData?.find(p => p.id === productId)
      )
      .filter(Boolean);

    // 28. Fetch certifications
    const { data: certificationsData } = await adminDb
      .from('certifications')
      .select(
        `id, name, icon_url, issuer, issue_date, 
         expiry_date, certificate_url, is_active`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 29. Fetch team members (staff highlights)
    const { data: teamData } = await adminDb
      .from('team_members')
      .select(
        `id, name, role, bio, image_url, 
         specialty, years_experience, is_featured`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_featured', true)
      .limit(5);

    // 30. Fetch events
    const { data: eventsData } = await adminDb
      .from('events')
      .select(
        `id, title, description, date, time, 
         image_url, is_active, registration_url`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10);

    // 31. Fetch tax information
    const { data: taxData } = await adminDb
      .from('tax_settings')
      .select(
        `id, tax_name, tax_percentage, tax_type, 
         is_included_in_price, is_active`
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 32. Fetch price history (for trending/changes)
    const { data: priceHistoryData } = await adminDb
      .from('price_history')
      .select(
        `id, product_id, old_price, new_price, 
         changed_at, reason`
      )
      .eq('restaurant_id', restaurantId)
      .order('changed_at', { ascending: false })
      .limit(50);

    // Return COMPLETE restaurant data with all 30+ categories
    return NextResponse.json({
      // Core data
      restaurant: restaurantData,
      categories: categoriesData ?? [],
      products: productsData ?? [],
      variants: variantsData ?? [],
      extras: extrasData ?? [],
      modifierGroups: modGroupsData ?? [],
      modifierOptions: modOptionsData ?? [],

      // Reviews and ratings
      reviews: reviewsData ?? [],
      statistics,

      // Delivery and logistics
      deliveryZones: deliveryZonesData ?? [],
      specialHours: specialHoursData ?? [],
      deliveryRestrictions,

      // Bundles and offers
      bundles: bundlesData ?? [],
      promoCodes: promoCodesData ?? [],

      // Gallery and media
      gallery: galleryData ?? [],

      // Location and contact
      location,
      contactMethods: contactMethodsData ?? [],

      // Payment and financial
      paymentMethods: paymentMethodsData ?? [],
      taxInfo: taxData ?? [],

      // Policies and compliance
      policies,
      certifications: certificationsData ?? [],

      // Personalization
      bestsellers: bestsellers ?? [],
      customization: customizationData ?? null,

      // AI and automation
      aiSettings: aiSettingsData ?? null,
      whatsappSettings: whatsappSettingsData ?? null,

      // Community and engagement
      socialMedia: socialMediaData ?? [],
      loyaltyProgram: loyaltyData ?? null,
      team: teamData ?? [],
      events: eventsData ?? [],

      // Integrations
      integrations: integrationsData ?? [],

      // Health and nutrition
      allergens: allergensData ?? [],
      dietaryOptions: dietaryOptionsData ?? [],
      nutritionalInfo: productsData?.map(p => ({
        productId: p.id,
        calories: p.calories,
        protein: p.protein,
        fat: p.fat,
        carbs: p.carbs
      })) ?? [],

      // Analytics
      priceHistory: priceHistoryData ?? [],

      // Metadata
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  } catch (error) {
    console.error('Error fetching restaurant menu:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// Redeploy trigger
