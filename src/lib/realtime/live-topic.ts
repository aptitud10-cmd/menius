import { createHmac } from 'crypto';

/**
 * Canal secreto para el GPS en vivo del repartidor de un pedido.
 *
 * Los canales broadcast de Supabase no tienen RLS: cualquiera con la anon key
 * puede suscribirse a cualquier nombre. `order-track:{orderId}` sirve para los
 * cambios de estado (no llevan datos privados), pero el id del pedido se
 * devuelve también sin token, así que la ubicación en vivo NO puede ir ahí.
 * Este nombre es un HMAC del id con una clave del servidor: solo se entrega a
 * quien presenta el token del pedido (order-track / página del pedido).
 */
export function liveLocationTopic(orderId: string): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const sig = createHmac('sha256', key).update(`driver-loc:${orderId}`).digest('hex').slice(0, 40);
  return `order-loc:${sig}`;
}
