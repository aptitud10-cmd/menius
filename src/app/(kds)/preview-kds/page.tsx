import { notFound } from 'next/navigation';
import { KDSView } from '@/components/orders/KDSView';
import type { Order } from '@/types';

// Vista previa SOLO para desarrollo: la pantalla de cocina con pedidos de ejemplo de un
// diner (Buccaneer), sin login ni datos reales, para sacar capturas al rediseñar.
// En producción → 404.
export const dynamic = 'force-dynamic';

const RID = '00000000-0000-0000-0000-000000000000';

function ago(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

type Line = [string, number?, boolean?, boolean?];

/** kitchen=false: bebida/postre (no va a cocina). Las líneas son la foto de /api/orders. */
function item(id: string, qty: number, name: string, price: number, lines: Line[] = [], notes = '', kitchen = true) {
  return {
    id, order_id: '', product_id: id, variant_id: null, qty,
    unit_price: price, line_total: price * qty, notes,
    product: { id, name, image_url: null, dietary_tags: [], station_id: null, category: { send_to_kitchen: kitchen } },
    variant: null,
    order_item_extras: [],
    // Formato viejo (lo que lee el KDS hoy): nombre de grupo + opción.
    order_item_modifiers: lines.map(([text, p]) => ({ group_name: 'Option', option_name: text, price_delta: p ?? 0 })),
    modifier_lines: lines.map(([text, p, indent, title]) => ({ text, price: p ?? 0, indent: !!indent, ...(title ? { title: true } : {}) })),
  };
}

function order(o: Omit<Partial<Order>, 'items'> & { id: string; order_number: string; items: unknown[] }): Order {
  return {
    prepared_at: o.created_at,
    restaurant_id: RID, table_id: null, status: 'confirmed', customer_name: 'Cliente',
    customer_phone: '+1 718 555 0100', notes: '', total: 0, order_type: 'pickup', payment_method: 'cash',
    created_at: ago(2), payment_status: 'pending', include_utensils: true,
    ...o,
  } as unknown as Order;

}

const ORDERS: Order[] = [
  order({
    id: 'k1', order_number: 'ORD-261113-021', status: 'confirmed', customer_name: 'Maria Gonzalez',
    order_type: 'delivery', delivery_address: '32-15 94th St, East Elmhurst, NY', total: 52.15, created_at: ago(1),
    estimated_ready_minutes: 20,
    items: [
      item('a1', 2, 'Cheeseburger', 16.95, [
        ['Deluxe', 4, false, true], ['French Fries'], ['No Lettuce'], ['Medium'], ['Cheese: American'],
        ['Ranch on the side'], ['Extra BBQ on the side', 0.75],
      ]),
      item('a2', 1, 'Two Eggs, Any Style', 19.6, [
        ['Eggs: Over Hard'], ['with Swiss cheese', 1.5, true], ['Add 2 Eggs', 2.5],
        ['Sweet Potato Fries', 1.5], ['with Mozzarella cheese', 1.5, true], ['Rye Toast'],
        ['Side Bacon / Crispy', 7.95],
      ]),
      item('a3', 2, 'Assorted Sodas & Diet Sodas', 3.55, [['Pepsi']], 'No ice please', false),
      item('a4', 1, 'Cheesecake', 7.5, [], '', false),
    ],
  }),
  order({
    id: 'k2', order_number: 'ORD-261113-019', status: 'preparing', customer_name: 'James Lee',
    order_type: 'pickup', total: 31.4, created_at: ago(9), estimated_ready_minutes: 15,
    items: [
      item('b1', 1, 'Chicken Parm Hero', 13.95, [], 'ALLERGY: no nuts'),
      item('b2', 1, 'Western Omelette', 12.5, [['Home Fries'], ['Whole Wheat Toast'], ['Extra Cheese', 1.5]]),
      item('b3', 1, 'Coffee', 2.5, [['Regular']], '', false),
    ],
  }),
  order({
    id: 'k3', order_number: 'ORD-261113-017', status: 'preparing', customer_name: 'Ana Ruiz',
    order_type: 'dine_in', table_name: 'Mesa 4', total: 48.9, created_at: ago(17), estimated_ready_minutes: 15,
    items: [
      item('c1', 1, 'Porterhouse Steak', 32.95, [['Medium Rare'], ['Mashed Potatoes'], ['Broccoli'], ['Caesar Salad']]),
      item('c2', 1, 'Buttermilk Pancakes', 10.95, [['Add Blueberries', 2]]),
      item('c3', 1, 'Chocolate Shake', 7.25, [], '', false),
    ],
  }),
  order({
    id: 'k5', order_number: 'ORD-261113-024', status: 'preparing', customer_name: 'Luis Perez',
    order_type: 'pickup', total: 28, created_at: ago(3), estimated_ready_minutes: 15,
    scheduled_for: new Date(Date.now() + 2 * 3600_000).toISOString(),
    items: [item('e1', 2, 'Philly Cheesesteak', 14, [['Peppers & Onions']])],
  }),
  order({
    id: 'k4', order_number: 'ORD-261113-022', status: 'confirmed', customer_name: 'Kevin Park',
    order_type: 'pickup', total: 9.75, created_at: ago(0.5), estimated_ready_minutes: 10,
    items: [
      item('d1', 1, 'Fresh Orange Juice', 5.25, [['Large']], '', false),
      item('d2', 1, 'Coffee', 2.5, [], '', false),
    ],
  }),
];

export default function PreviewKdsPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <KDSView
      initialOrders={ORDERS}
      restaurantId={RID}
      restaurantName="Buccaneer Diner"
      currency="USD"
      restaurantSlug="buccaneer"
      kdsStations={[]}
    />
  );
}
