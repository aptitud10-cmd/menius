import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';

export default async function NewProductPage() {
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: categories }, { data: restaurant }, { data: allProducts }, { data: kdsStations }] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id, currency, locale, available_locales, slug').eq('id', rid).maybeSingle(),
    supabase.from('products').select('id, name, image_url, category_id, price, is_active, in_stock').eq('restaurant_id', rid).eq('is_active', true).order('name'),
    supabase.from('kds_stations').select('id, name, color').eq('restaurant_id', rid).order('position'),
  ]);

  return (
    <ProductEditor
      product={null}
      categories={categories ?? []}
      currency={restaurant?.currency || 'USD'}
      defaultLocale={restaurant?.locale || 'es'}
      availableLocales={restaurant?.available_locales || [restaurant?.locale || 'es']}
      slug={restaurant?.slug ?? undefined}
      allProducts={(allProducts ?? []) as any[]}
      restaurantId={rid}
      kdsStations={(kdsStations ?? []) as { id: string; name: string; color: string }[]}
    />
  );
}
