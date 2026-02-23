import { getDashboardContext } from '@/lib/get-dashboard-context';
import { CategoriesManager } from '@/components/menu/CategoriesManager';

export default async function CategoriesPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: categories }, { data: restaurant }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
    supabase
      .from('restaurants')
      .select('locale, available_locales')
      .eq('id', restaurantId)
      .maybeSingle(),
  ]);

  return (
    <div>
      <h1 className="dash-heading mb-6">Categorías</h1>
      <CategoriesManager
        initialCategories={categories ?? []}
        defaultLocale={restaurant?.locale ?? 'es'}
        availableLocales={restaurant?.available_locales ?? []}
      />
    </div>
  );
}
