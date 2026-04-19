import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Restaurant, Category, Product } from '@/types';

/**
 * Fetch all active restaurant slugs for generateStaticParams.
 * Called once at build time — no caching needed.
 */
export async function fetchAllSlugs(): Promise<string[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.from('restaurants').select('slug');
    return (data ?? []).map((r: { slug: string }) => r.slug).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Lightweight fetch — only the fields needed for <head> metadata.
 * One single DB query so generateMetadata resolves fast and streaming can begin.
 */
export const fetchRestaurantMeta = cache(async function fetchRestaurantMeta(slug: string) {
  try {
    const db = createAdminClient();
    const { data: restaurant } = await db
      .from('restaurants')
      .select('id, name, description, cover_image_url, logo_url, slug, locale, available_locales, cuisine_type, address, country_code')
      .eq('slug', slug)
      .single();
    if (!restaurant) return null;

    // Fetch top category names for auto-generated SEO description when the restaurant hasn't filled one
    const { data: topCategories } = await db
      .from('categories')
      .select('name')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(4);

    return { ...restaurant, topCategoryNames: (topCategories ?? []).map((c: { name: string }) => c.name) };
  } catch {
    return null;
  }
});

export interface ReviewStats {
  average: number;
  total: number;
}

export interface ReviewItem {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface LimitedMode {
  ordersToday: number;
  dailyLimit: number;
}

export interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  isOwner: boolean;
  locale: 'es' | 'en';
  availableLocales: string[];
  reviewStats: ReviewStats | null;
  recentReviews: ReviewItem[];
  subscriptionExpired?: boolean;
  limitedMode?: LimitedMode | null;
  isFreePlan?: boolean;
}

/**
 * Core database fetch — no cache layer here, called by the cached wrappers below.
 */
async function fetchMenuDataFromDB(slug: string): Promise<MenuData | null> {
  try {
    // Admin client bypasses RLS for public menu reads (server-side only, never exposed to client)
    const db = createAdminClient();

    const { data: restaurant, error: restaurantError } = await db
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (restaurantError || !restaurant) {
      console.error('[menu-data] Restaurant not found', {
        slug,
        error: restaurantError?.message,
        code: restaurantError?.code,
      });
      return null;
    }

    // Parallelize all data fetching: subscription, categories, products, reviews
    const [
      subData,
      { data: categories },
      { data: products },
      { data: reviewRows },
      reviewAggResult,
    ] = await Promise.all([
      Promise.resolve(
        db
          .from('subscriptions')
          .select('status, trial_end, current_period_end')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle()
      ).then((r) => r.data, () => null),
      db
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db
        .from('products')
        .select(`
          *,
          product_variants ( id, name, price_delta, sort_order ),
          product_extras   ( id, name, price, sort_order ),
          modifier_groups  (
            id, name, selection_type, is_required, min_select, max_select, sort_order, display_type,
            modifier_options ( id, name, price_delta, is_default, sort_order )
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      // Most recent 10 reviews for display cards
      db
        .from('reviews')
        .select('id, customer_name, rating, comment, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10),
      // Aggregate query for accurate review stats across ALL visible reviews
      db
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('restaurant_id', restaurant.id)
        .eq('is_visible', true),
    ] as const);

    const DAILY_FREE_LIMIT = 3;
    let subscriptionExpired = false;
    let limitedMode: LimitedMode | null = null;
    let isFreePlan = true;

    try {
      const subscription = subData as {
        status: string;
        trial_end?: string | null;
        current_period_end?: string | null;
      } | null;
      const now = new Date();

      if (!subscription) {
        const createdAt = new Date(restaurant.created_at);
        const graceEnds = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (now > graceEnds) subscriptionExpired = true;
      } else {
        const { status } = subscription;
        if (status === 'active' || status === 'past_due') {
          isFreePlan = false; // paid plan
        } else if (subscription.trial_end && new Date(subscription.trial_end) > now) {
          isFreePlan = false; // active trial
        } else {
          subscriptionExpired = true;
        }
      }

      // Instead of blocking the menu, switch to limited mode
      if (subscriptionExpired) {
        subscriptionExpired = false;
        // Use the restaurant's timezone so the daily window resets at local midnight,
        // not server UTC midnight (which is wrong for restaurants in UTC-5, UTC+8, etc.)
        const tz = (restaurant as Record<string, unknown>).timezone as string | undefined ?? 'UTC';
        const now = new Date();
        // sv-SE gives "YYYY-MM-DD HH:mm:ss" — parsing it as UTC lets us derive the tz offset
        const localTimeStr = now.toLocaleString('sv-SE', { timeZone: tz });
        const localMs = new Date(localTimeStr.replace(' ', 'T') + 'Z').getTime();
        const offsetMs = now.getTime() - localMs;
        const localDateStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
        const todayStart = new Date(localDateStr + 'T00:00:00Z');
        todayStart.setTime(todayStart.getTime() + offsetMs);

        const { count } = await db
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', todayStart.toISOString());
        limitedMode = { ordersToday: count ?? 0, dailyLimit: DAILY_FREE_LIMIT };
      }
    } catch {
      console.error('[menu-data] Subscription check failed — showing menu', {
        restaurantId: restaurant.id,
      });
    }

    const mappedProducts = ((products ?? []) as any[]).map((p: any) => ({
      ...p,
      variants: ((p.product_variants ?? []) as any[]).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      ),
      extras: ((p.product_extras ?? []) as any[]).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      ),
      modifier_groups: ((p.modifier_groups ?? []) as any[])
        .map((g: any) => ({
          ...g,
          options: ((g.modifier_options ?? []) as any[]).sort(
            (a: any, b: any) => a.sort_order - b.sort_order
          ),
        }))
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

    let reviewStats: ReviewStats | null = null;
    const reviews = (reviewRows ?? []) as any[];
    // Use all visible reviews for accurate aggregate stats
    const allRatingRows = (reviewAggResult.data ?? []) as { rating: number }[];
    const totalReviews = reviewAggResult.count ?? allRatingRows.length;
    if (totalReviews > 0) {
      const sum = allRatingRows.reduce((s, r) => s + (r.rating ?? 0), 0);
      const avg = sum / allRatingRows.length;
      reviewStats = { average: Math.round(avg * 10) / 10, total: totalReviews };
    }

    const recentReviews: ReviewItem[] = reviews
      .filter((r: any) => r.comment && r.comment.trim().length > 0)
      .slice(0, 10)
      .map((r: any) => ({
        id: r.id,
        customer_name: r.customer_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }));

    return {
      restaurant: restaurant as unknown as Restaurant,
      categories: (categories ?? []) as unknown as Category[],
      products: mappedProducts as unknown as Product[],
      isOwner: false,
      locale: (restaurant.locale ?? 'es') as 'es' | 'en',
      availableLocales:
        (restaurant as any).available_locales ??
        [(restaurant as any).locale ?? 'es'],
      reviewStats,
      recentReviews,
      subscriptionExpired,
      limitedMode,
      isFreePlan,
    };
  } catch (err) {
    console.error('[menu-data] Unexpected error in fetchMenuData', {
      slug,
      error: String(err),
    });
    return null;
  }
}

/**
 * Load public menu data.
 * React.cache() deduplicates calls within the same render pass (page + metadata).
 * ISR (`export const revalidate` on the page) controls cross-request caching.
 * On-demand: revalidatePath() in revalidatePublicMenu() purges the page cache immediately.
 */
export const fetchMenuData = cache(async function fetchMenuData(slug: string) {
  return fetchMenuDataFromDB(slug);
});
