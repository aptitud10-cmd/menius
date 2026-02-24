import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: product }, { data: categories }, { data: restaurant }, { data: modifierGroups }] =
    await Promise.all([
      supabase
        .from('products')
        .select('*, product_variants(*), product_extras(*)')
        .eq('id', id)
        .eq('restaurant_id', rid)
        .maybeSingle(),
      supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
      supabase.from('restaurants').select('id, currency, locale, available_locales').eq('id', rid).maybeSingle(),
      supabase.from('modifier_groups').select('*, modifier_options(*)').eq('product_id', id).order('sort_order'),
    ]);

  if (!product) notFound();

  const mapped = {
    ...product,
    variants: (product.product_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    extras: (product.product_extras ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    modifier_groups: (modifierGroups ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((g: any) => ({
        ...g,
        options: (g.modifier_options ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })),
  };

  return (
    <ProductEditor
      product={mapped}
      categories={categories ?? []}
      currency={restaurant?.currency || 'USD'}
      defaultLocale={restaurant?.locale || 'es'}
      availableLocales={restaurant?.available_locales || [restaurant?.locale || 'es']}
    />
  );
}
