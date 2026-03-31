import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';
import { notFound } from 'next/navigation';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: product }, { data: categories }, { data: restaurant }, { data: modifierGroups }, { data: allProducts }, { data: kdsStations }] =
    await Promise.all([
      supabase
        .from('products')
        .select('*, product_variants(*), product_extras(*), restaurants(slug)')
        .eq('id', id)
        .eq('restaurant_id', rid)
        .maybeSingle(),
      supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
      supabase.from('restaurants').select('id, currency, locale, available_locales, slug').eq('id', rid).maybeSingle(),
      supabase.from('modifier_groups').select('*, modifier_options(*)').eq('product_id', id).order('sort_order'),
      supabase.from('products').select('id, name, image_url, category_id, price, is_active, in_stock').eq('restaurant_id', rid).eq('is_active', true).order('name'),
      supabase.from('kds_stations').select('id, name, color').eq('restaurant_id', rid).order('position'),
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
      slug={restaurant?.slug ?? (product as any)?.restaurants?.slug ?? undefined}
      allProducts={(allProducts ?? []) as any[]}
      restaurantId={rid}
      kdsStations={(kdsStations ?? []) as { id: string; name: string; color: string }[]}
    />
  );
}
