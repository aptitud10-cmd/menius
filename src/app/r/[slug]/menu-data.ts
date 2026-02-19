import { createClient } from '@/lib/supabase/server';
import type { Restaurant, Category, Product } from '@/types';

export interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  isOwner: boolean;
  locale: 'es' | 'en';
}

export async function fetchMenuData(slug: string): Promise<MenuData | null> {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!restaurant) return null;

  const [{ data: categories }, { data: products }, { data: { user } }] = await Promise.all([
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
  ]);

  const mappedProducts = (products ?? []).map((p: any) => ({
    ...p,
    variants: p.product_variants ?? [],
    extras: p.product_extras ?? [],
  }));

  return {
    restaurant,
    categories: categories ?? [],
    products: mappedProducts,
    isOwner: !!user && user.id === restaurant.owner_user_id,
    locale: restaurant.locale ?? 'es',
  };
}
