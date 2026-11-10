import { notFound } from 'next/navigation';
import { CounterView } from '@/components/orders/CounterView';
import type { Order } from '@/types';

// Vista previa SOLO para desarrollo: el Counter con pedidos de ejemplo, sin
// login ni datos reales, para sacar capturas al rediseñar. En producción → 404.
export const dynamic = 'force-dynamic';

const RID = '00000000-0000-0000-0000-000000000000';

function ago(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

function item(id: string, qty: number, name: string, price: number, opts: {
  mods?: [string, string, number?][];
  notes?: string;
  variant?: string;
} = {}) {
  return {
    id, order_id: '', product_id: id, variant_id: null, qty,
    unit_price: price, line_total: price * qty, notes: opts.notes ?? '',
    product: { id, name },
    variant: opts.variant ? { name: opts.variant } : null,
    order_item_extras: [],
    order_item_modifiers: (opts.mods ?? []).map(([g, o, d]) => ({ group_name: g, option_name: o, price_delta: d ?? 0 })),
  };
}

function order(o: Omit<Partial<Order>, 'items'> & { id: string; order_number: string; items: unknown[] }): Order {
  return {
    restaurant_id: RID, table_id: null, status: 'pending', customer_name: 'Cliente',
    notes: '', total: 0, order_type: 'pickup', payment_method: 'cash', created_at: ago(2),
    payment_status: 'pending', include_utensils: true,
    ...o,
  } as unknown as Order;
}

const ORDERS: Order[] = [
  order({
    id: 'o1', order_number: 'ORD-261110-014', status: 'pending', customer_name: 'Maria Gonzalez',
    customer_phone: '+1 718 555 0142', order_type: 'delivery', delivery_address: '32-15 94th St, East Elmhurst, NY',
    payment_method: 'cash', total: 38.4, created_at: ago(1),
    items: [
      item('p1', 2, 'Deluxe Cheeseburger 7oz', 14.5, { mods: [['Style', 'Deluxe'], ['Side', 'French Fries'], ['Sauces on the Side', 'Ranch'], ['Extra Sauce', 'BBQ', 0.75]] }),
      item('p2', 1, 'Coke', 2.5, { notes: 'No ice please' }),
    ],
  }),
  order({
    id: 'o2', order_number: 'ORD-261110-015', status: 'pending', customer_name: 'James Lee',
    order_type: 'pickup', payment_method: 'cash', total: 22.1, created_at: ago(0.5),
    items: [
      item('p3', 1, 'Chicken Parm Hero', 13.95, { notes: 'ALLERGY: no nuts' }),
      item('p4', 2, 'Mozzarella Sticks', 4.0),
    ],
  }),
  order({
    id: 'o3', order_number: 'ORD-261110-011', status: 'preparing', customer_name: 'Ana Ruiz',
    order_type: 'dine_in', table_name: 'Mesa 4', total: 41.75, created_at: ago(12), estimated_ready_minutes: 15,
    items: [
      item('p5', 1, 'Porterhouse Steak', 32.95, { mods: [['Temperature', 'Medium rare'], ['Side', 'Mashed Potatoes']] }),
      item('p6', 1, 'Caesar Salad', 8.8),
    ],
  }),
  order({
    id: 'o4', order_number: 'ORD-261110-009', status: 'ready', customer_name: 'Tom Baker',
    order_type: 'pickup', total: 17.5, created_at: ago(24),
    items: [item('p7', 1, 'Western Omelette', 12.5), item('p8', 1, 'Coffee', 2.5)],
  }),
  order({
    id: 'o6', order_number: 'ORD-261110-010', status: 'out_for_delivery', customer_name: 'Rosa Diaz',
    order_type: 'delivery', delivery_address: '31-20 82nd St', total: 29.4, created_at: ago(35),
    driver_name: 'Carlos Mendez', driver_picked_up_at: ago(4),
    items: [item('p10', 2, 'Chicken Wings', 11.0), item('p11', 1, 'Lemonade', 3.5)],
  } as Parameters<typeof order>[0]),
  order({
    id: 'o5', order_number: 'ORD-261110-016', status: 'pending', customer_name: 'Luis Perez',
    order_type: 'delivery', delivery_address: '25-10 Astoria Blvd', total: 56.0, created_at: ago(5),
    scheduled_for: new Date(Date.now() + 3 * 3600_000).toISOString(),
    items: [item('p9', 4, 'Philly Cheesesteak', 14.0)],
  }),
];

export default function PreviewCounterPage({ searchParams }: { searchParams: { empty?: string; lang?: string; alert?: string } }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <CounterView
      initialOrders={searchParams.empty ? [] : ORDERS}
      restaurantId={RID}
      restaurantName="Buccaneer Diner"
      currency="USD"
      locale={searchParams.lang === 'es' ? 'es' : 'en'}
      restaurantLat={null}
      restaurantLng={null}
      isDevice
      previewAlertIds={searchParams.alert ? ['o1', 'o2'] : undefined}
    />
  );
}
