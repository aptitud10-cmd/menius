import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KitchenDisplay } from '@/components/orders/KitchenDisplay';

export default async function KDSPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const restaurantId = profile.default_restaurant_id;

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('currency, name')
    .eq('id', restaurantId)
    .single();

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name))')
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
    .limit(100);

  return (
    <KitchenDisplay
      initialOrders={orders ?? []}
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? ''}
      currency={restaurant?.currency ?? 'USD'}
    />
  );
}
