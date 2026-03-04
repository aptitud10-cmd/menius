import { createClient } from '@/lib/supabase/server';
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
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!restaurant) return null;

  // Parallelize all data fetching: subscription, categories, products, auth, reviews
  const [subResult, { data: categories }, { data: products }, { data: { user } }, { data: reviewRows }] = await Promise.all([
    Promise.resolve(
      supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle()
    ).then((r) => r.data).catch(() => null),
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('products')
      .select('*, product_variants(*), product_extras(*)')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase.auth.getUser(),
    supabase
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('restaurant_id', restaurant.id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const DAILY_FREE_LIMIT = 3;
  let subscriptionExpired = false;
  let limitedMode: LimitedMode | null = null;

  try {
    const subscription = subResult;
    const now = new Date();

    if (!subscription) {
      const createdAt = new Date(restaurant.created_at);
      const graceEnds = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (now > graceEnds) subscriptionExpired = true;
    } else {
      const { status } = subscription;
      if (status === 'active' || status === 'past_due') {
        // OK — full access
      } else if (status === 'trialing') {
        const trialOver = subscription.trial_end
          ? new Date(subscription.trial_end) < now
          : (subscription.current_period_end ? new Date(subscription.current_period_end) < now : false);
        if (trialOver) subscriptionExpired = true;
      } else {
        const periodEnded = subscription.current_period_end && new Date(subscription.current_period_end) < now;
        if (periodEnded) subscriptionExpired = true;
      }
    }

    // Instead of blocking the menu, switch to limited mode
    if (subscriptionExpired) {
      subscriptionExpired = false;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', todayStart.toISOString());
      limitedMode = { ordersToday: count ?? 0, dailyLimit: DAILY_FREE_LIMIT };
    }
  } catch {
    console.error('[menu-data] Subscription check failed — showing menu', { restaurantId: restaurant.id });
  }

  const productIds = (products ?? []).map((p: any) => p.id as string);
  const { data: modifierGroups } = productIds.length > 0
    ? await supabase.from('modifier_groups').select('*, modifier_options(*)').in('product_id', productIds).order('sort_order')
    : { data: [] as any[] };

  const groupsByProduct = new Map<string, any[]>();
  for (const g of (modifierGroups ?? [])) {
    const pid = g.product_id;
    if (!groupsByProduct.has(pid)) groupsByProduct.set(pid, []);
    groupsByProduct.get(pid)!.push({
      ...g,
      options: (g.modifier_options ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    });
  }

  const mappedProducts = (products ?? []).map((p: any) => ({
    ...p,
    variants: p.product_variants ?? [],
    extras: p.product_extras ?? [],
    modifier_groups: (groupsByProduct.get(p.id) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  let reviewStats: ReviewStats | null = null;
  if (reviewRows && reviewRows.length > 0) {
    const avg = reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length;
    reviewStats = { average: Math.round(avg * 10) / 10, total: reviewRows.length };
  }

  const recentReviews: ReviewItem[] = (reviewRows ?? [])
    .filter((r) => r.comment && r.comment.trim().length > 0)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      customer_name: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }));

  return {
    restaurant,
    categories: categories ?? [],
    products: mappedProducts,
    isOwner: !!user && user.id === restaurant.owner_user_id,
    locale: restaurant.locale ?? 'es',
    availableLocales: restaurant.available_locales ?? [restaurant.locale ?? 'es'],
    reviewStats,
    recentReviews,
    subscriptionExpired,
    limitedMode,
  };
}
