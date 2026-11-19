'use server';

// "Customer here" marcado a mano desde el Counter: el cliente llegó al
// mostrador (o llamó desde afuera) sin tocar "I'm here" en su seguimiento.
// Escribe la misma columna que el botón del cliente (orders.customer_arrived_at,
// migración 20261110c), así la tarjeta y las demás tablets lo ven igual.
//
// Vive en su propio archivo para no tocar restaurant.ts; la autenticación es
// la misma que getAuthenticatedRestaurant({ allowDevice: true }) de allí.

import { createClient } from '@/lib/supabase/server';
import { getDeviceSession } from '@/lib/auth/device-session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE = ['confirmed', 'preparing', 'almost_ready', 'ready'];

export async function markCustomerArrived(orderId: string): Promise<{ ok: true; arrivedAt: string } | { error: string }> {
  if (typeof orderId !== 'string' || !UUID.test(orderId)) return { error: 'Pedido inválido' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const [{ data: profile }, device] = await Promise.all([
    supabase.from('profiles').select('default_restaurant_id').eq('user_id', user.id).maybeSingle(),
    getDeviceSession(supabase),
  ]);
  const restaurantId = device.restaurantId ?? profile?.default_restaurant_id;
  if (!restaurantId) return { error: 'Sin restaurante' };

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_type, status, customer_arrived_at')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (!order) return { error: 'Pedido no encontrado' };
  if (order.order_type !== 'pickup' || !ACTIVE.includes(order.status)) return { error: 'Solo para pedidos de pickup en curso' };
  if (order.customer_arrived_at) return { ok: true, arrivedAt: order.customer_arrived_at };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('orders')
    .update({ customer_arrived_at: now, updated_at: now })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .is('customer_arrived_at', null);
  if (error) return { error: 'No se pudo guardar' };
  return { ok: true, arrivedAt: now };
}
