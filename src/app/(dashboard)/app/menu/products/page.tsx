import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductsManager } from '@/components/menu/ProductsManager';

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const rid = profile.default_restaurant_id;

  const [{ data: products }, { data: categories }, { data: restaurant }] = await Promise.all([
    supabase.from('products').select('*, product_variants(*), product_extras(*)').eq('restaurant_id', rid).order('sort_order'),
    supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id, currency').eq('id', rid).single(),
  ]);

  const mappedProducts = (products ?? []).map((p: any) => ({
    ...p,
    variants: (p.product_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    extras: (p.product_extras ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Productos</h1>
      <ProductsManager
        initialProducts={mappedProducts}
        categories={categories ?? []}
        restaurantId={rid}
        currency={restaurant?.currency || 'USD'}
      />
    </div>
  );
}
