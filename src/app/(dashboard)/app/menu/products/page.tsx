import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductsManager } from '@/components/menu/ProductsManager';

export default async function ProductsPage() {
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: products }, { data: categories }, { data: restaurant }, { data: modifierGroups }] = await Promise.all([
    supabase.from('products').select('*, product_variants(*), product_extras(*)').eq('restaurant_id', rid).order('sort_order'),
    supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id, currency').eq('id', rid).maybeSingle(),
    supabase.from('modifier_groups').select('*, modifier_options(*)').order('sort_order'),
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
    variants: (p.product_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    extras: (p.product_extras ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    modifier_groups: (groupsByProduct.get(p.id) ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return (
    <div>
      <h1 className="dash-heading mb-6">Productos</h1>
      <ProductsManager
        initialProducts={mappedProducts}
        categories={categories ?? []}
        restaurantId={rid}
        currency={restaurant?.currency || 'USD'}
      />
    </div>
  );
}
