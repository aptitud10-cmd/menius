import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductEditor } from '@/components/menu/ProductEditor';

export default async function NewProductPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order');

  return <ProductEditor product={null} categories={categories ?? []} />;
}
