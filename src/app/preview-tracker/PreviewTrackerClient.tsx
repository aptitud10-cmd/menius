'use client';

import { useState } from 'react';
import { OrderTracker } from '@/components/public/OrderTracker';

const RID = '00000000-0000-0000-0000-000000000000';
const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function mock(state: string, type: string) {
  const base: Record<string, unknown> = {
    id: '11111111-1111-4111-8111-111111111111',
    order_number: 'ORD-261110-042',
    status: 'preparing',
    order_type: type,
    total: 24.5, tax_amount: 1.8, tip_amount: 0, delivery_fee: 0, discount_amount: 0,
    payment_method: 'cash', payment_status: 'pending',
    notes: 'Apt 3B · tocar timbre 2', created_at: ago(14), updated_at: ago(10),
    customer_name: 'Ana', customer_phone: '+17185550123', customer_email: 'ana@example.com',
    delivery_address: type === 'delivery' ? '39-15 111th St, Corona, NY 11368' : null,
    estimated_ready_minutes: 15, prepared_at: ago(10),
    delivery_lat: type === 'delivery' ? 40.7488 : null, delivery_lng: type === 'delivery' ? -73.8605 : null,
    driver_name: null, driver_phone: null, driver_assigned_at: null,
    driver_lat: null, driver_lng: null, driver_picked_up_at: null, driver_at_door_at: null, driver_delivered_at: null,
    delivery_photo_url: null, authorized: true, auto_closed: false, live_topic: null,
    table_name: type === 'dine_in' ? 'Mesa 5' : null,
    order_items: [
      { id: 'a', qty: 2, unit_price: 9.5, line_total: 19, notes: 'sin cebolla', product_name: 'Cheeseburger Deluxe', variant_name: null },
      { id: 'b', qty: 1, unit_price: 5.5, line_total: 5.5, notes: null, product_name: 'Chocolate Shake', variant_name: null },
    ],
  };
  const s: Record<string, Record<string, unknown>> = {
    pending: { status: 'pending', prepared_at: null, estimated_ready_minutes: null, created_at: ago(1), updated_at: ago(1) },
    preparing: {},
    late: { prepared_at: ago(22) },
    ready: { status: 'ready', updated_at: ago(1) },
    on_the_way: { status: 'out_for_delivery', driver_name: 'Carlos', driver_phone: '+17185550100', driver_assigned_at: ago(6), driver_picked_up_at: ago(5), driver_lat: 40.7570, driver_lng: -73.8700, driver_updated_at: ago(0.1) },
    at_door: { status: 'out_for_delivery', driver_name: 'Carlos', driver_picked_up_at: ago(9), driver_at_door_at: ago(0.5), driver_lat: 40.7489, driver_lng: -73.8606 },
    delivered: { status: 'delivered', driver_name: 'Carlos', driver_picked_up_at: ago(14), driver_at_door_at: ago(5), driver_delivered_at: ago(4), updated_at: ago(4) },
    picked_up: { status: 'delivered', updated_at: ago(2) },
    cancelled: { status: 'cancelled', updated_at: ago(2) },
    scheduled: { status: 'pending', scheduled_for: new Date(Date.now() + 3 * 3600_000).toISOString(), prepared_at: null },
    unpaid: { status: 'pending', payment_method: 'online', payment_status: 'pending', prepared_at: null, estimated_ready_minutes: null },
    refunded: { status: 'cancelled', payment_method: 'online', payment_status: 'refunded' },
    arrived: { status: 'ready', customer_arrived_at: ago(0.5) },
    salio: { status: 'out_for_delivery', updated_at: ago(3) },
    // Ruta: el repartidor entrega 1 pedido antes del tuyo.
    route: { status: 'out_for_delivery', driver_name: 'Carlos', driver_phone: '+17185550100', driver_assigned_at: ago(6), driver_picked_up_at: ago(5), driver_lat: 40.7570, driver_lng: -73.8700, driver_updated_at: ago(0.1), stops_ahead: 1 },
  };
  return { ...base, ...(s[state] ?? {}) };
}

export function PreviewTrackerClient({ state, type, lang }: { state: string; type: string; lang: 'es' | 'en' }) {
  // Se instala ANTES de que los efectos del tracker corran (los efectos de los
  // hijos van primero): el sondeo recibe el mismo pedido de ejemplo.
  const [order] = useState(() => {
    const o = mock(state, type);
    if (typeof window === 'undefined') return o;
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/public/order-track')) {
        return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return orig(input, init);
    };
    return o;
  });
  return (
    <OrderTracker
      restaurantId={RID}
      restaurantName="Buccaneer Diner"
      restaurantSlug="buccaneer"
      restaurantAddress="37-15 Junction Blvd, Corona, NY 11368"
      restaurantLat={40.76322}
      restaurantLng={-73.87624}
      restaurantPhone="+17185550199"
      restaurantLogo="https://hdlhmqvbaxzhmhtablwt.supabase.co/storage/v1/object/public/product-images/6f18a1cf-991c-4855-ba4b-d10a6a501cc8/buccaneer-logo-bd-1794340258855.webp"
      orderNumber="ORD-261110-042"
      trackingToken="preview"
      currency="USD"
      locale={lang}
      initialOrder={order}
    />
  );
}
