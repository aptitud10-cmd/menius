import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrdersBoard } from '@/components/orders/OrdersBoard';

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name))')
    .eq('restaurant_id', profile.default_restaurant_id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Órdenes</h1>
      <OrdersBoard initialOrders={orders ?? []} />
    </div>
  );
}
