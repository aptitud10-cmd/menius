import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';
import { redirect } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: product }, { data: categories }, { data: modifierGroups }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_variants(*), product_extras(*)')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single(),
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('modifier_groups')
      .select('*, modifier_options(*)')
      .eq('product_id', id)
      .order('sort_order'),
  ]);

  if (!product) redirect('/app/menu/products');

  const mappedProduct = {
    ...product,
    variants: (product.product_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    extras: (product.product_extras ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    modifier_groups: (modifierGroups ?? []).map((g: any) => ({
      ...g,
      options: (g.modifier_options ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    })).sort((a: any, b: any) => a.sort_order - b.sort_order),
  };

  return <ProductEditor product={mappedProduct} categories={categories ?? []} />;
}
