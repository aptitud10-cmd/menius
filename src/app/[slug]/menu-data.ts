import { createAdminClient } from '@/lib/supabase/admin';
import type { Restaurant, Category, Product } from '@/types';

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
}

export async function fetchMenuData(slug: string): Promise<MenuData | null> {
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
            id, name, is_required, min_select, max_select, sort_order,
            modifier_options ( id, name, price_delta, sort_order )
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      db
        .from('reviews')
        .select('id, customer_name, rating, comment, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(50),
    ] as const);

    const DAILY_FREE_LIMIT = 3;
    let subscriptionExpired = false;
    let limitedMode: LimitedMode | null = null;

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
          // full access
        } else if (status === 'trialing') {
          const trialOver = subscription.trial_end
            ? new Date(subscription.trial_end) < now
            : subscription.current_period_end
              ? new Date(subscription.current_period_end) < now
              : false;
          if (trialOver) subscriptionExpired = true;
        } else {
          const periodEnded =
            subscription.current_period_end &&
            new Date(subscription.current_period_end) < now;
          if (periodEnded) subscriptionExpired = true;
        }
      }

      // Instead of blocking the menu, switch to limited mode
      if (subscriptionExpired) {
        subscriptionExpired = false;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
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
    if (reviews.length > 0) {
      const avg =
        reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
      reviewStats = { average: Math.round(avg * 10) / 10, total: reviews.length };
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
    };
  } catch (err) {
    console.error('[menu-data] Unexpected error in fetchMenuData', {
      slug,
      error: String(err),
    });
    return null;
  }
}
