import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';

export default async function NewProductPage() {
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: categories }, { data: restaurant }] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id, currency, locale, available_locales, slug').eq('id', rid).maybeSingle(),
  ]);

  return (
    <ProductEditor
      product={null}
      categories={categories ?? []}
      currency={restaurant?.currency || 'USD'}
      defaultLocale={restaurant?.locale || 'es'}
      availableLocales={restaurant?.available_locales || [restaurant?.locale || 'es']}
      slug={restaurant?.slug ?? undefined}
    />
  );
}
