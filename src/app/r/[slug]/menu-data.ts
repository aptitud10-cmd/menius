import { createClient } from '@/lib/supabase/server';
import type { Restaurant, Category, Product } from '@/types';

export interface ReviewStats {
  average: number;
  total: number;
}

export interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  isOwner: boolean;
  locale: 'es' | 'en';
  reviewStats: ReviewStats | null;
}

export async function fetchMenuData(slug: string): Promise<MenuData | null> {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!restaurant) return null;

  const [{ data: categories }, { data: products }, { data: { user } }, { data: modifierGroups }, { data: reviewRows }] = await Promise.all([
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
      .from('modifier_groups')
      .select('*, modifier_options(*)')
      .order('sort_order'),
    supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', restaurant.id)
      .eq('is_visible', true),
  ]);

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

  return {
    restaurant,
    categories: categories ?? [],
    products: mappedProducts,
    isOwner: !!user && user.id === restaurant.owner_user_id,
    locale: restaurant.locale ?? 'es',
    reviewStats,
  };
}
