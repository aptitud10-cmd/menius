import { getDashboardContext } from '@/lib/get-dashboard-context';
import { CategoriesManager } from '@/components/menu/CategoriesManager';

export default async function CategoriesPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order');

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900">Categorías</h1>
      <CategoriesManager initialCategories={categories ?? []} />
    </div>
  );
}
