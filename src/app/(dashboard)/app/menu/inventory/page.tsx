import { getDashboardContext } from '@/lib/get-dashboard-context';
import { InventoryManager } from '@/components/menu/InventoryManager';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const { supabase, restaurantId: rid } = await getDashboardContext();

  const [{ data: products }, { data: restaurant }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, in_stock, stock_qty, low_stock_threshold, track_inventory, price, category_id, image_url')
      .eq('restaurant_id', rid)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('restaurants')
      .select('currency, locale')
      .eq('id', rid)
      .maybeSingle(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="dash-heading">{restaurant?.locale === 'en' ? 'Inventory' : 'Inventario'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {restaurant?.locale === 'en'
            ? 'Track stock quantities and receive low-stock alerts.'
            : 'Controla las existencias y recibe alertas de stock bajo.'}
        </p>
      </div>
      <InventoryManager
        initialProducts={products ?? []}
        restaurantId={rid}
        currency={restaurant?.currency ?? 'USD'}
      />
    </div>
  );
}
