/**
 * Carga desde la base lo que necesita toTicketData (API impresión §3).
 * Lo usan el preview del panel y, en el Sprint 3, el GET de CloudPRNT.
 *
 * Columnas verificadas en supabase/schema.sql (regla 11 de CLAUDE.md).
 * Admin client + filtro explícito por restaurant_id: el pedido solo sale si es
 * de ESE restaurante (el que llama ya validó que el restaurante es suyo).
 */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import {
  toTicketData, type TicketData, type TicketKind, type TicketItemRow,
  type TicketOrderRow, type TicketRestaurantRow,
} from './ticket-data';

const logger = createLogger('printing');

const ORDER_COLUMNS =
  'order_number, customer_name, customer_phone, order_type, payment_method, payment_status, total, ' +
  'tax_amount, delivery_fee, discount_amount, tip_amount, delivery_address, delivery_instructions, table_name, ' +
  'include_utensils, scheduled_for, estimated_ready_minutes, prepared_at, created_at, notes';

const RESTAURANT_COLUMNS = 'name, slug, timezone, currency, locale, tax_label, custom_domain, domain_verified';

const ITEM_COLUMNS =
  'qty, line_total, notes, modifier_lines, products ( name ), product_variants ( name ), ' +
  'order_item_extras ( price, product_extras ( name ) ), order_item_modifiers ( option_name, price_delta )';

export async function loadTicketData(args: {
  orderId: string;
  restaurantId: string;
  kind: Exclude<TicketKind, 'test'>;
  reprintedAt?: Date;
}): Promise<TicketData | null> {
  const db = createAdminClient();
  const [orderRes, restaurantRes, itemsRes] = await Promise.all([
    db.from('orders').select(ORDER_COLUMNS).eq('id', args.orderId).eq('restaurant_id', args.restaurantId).maybeSingle(),
    db.from('restaurants').select(RESTAURANT_COLUMNS).eq('id', args.restaurantId).maybeSingle(),
    db.from('order_items').select(ITEM_COLUMNS).eq('order_id', args.orderId),
  ]);

  if (orderRes.error || restaurantRes.error || itemsRes.error) {
    logger.error('ticket load failed', {
      orderId: args.orderId,
      code: orderRes.error?.code ?? restaurantRes.error?.code ?? itemsRes.error?.code,
    });
    return null;
  }
  if (!orderRes.data || !restaurantRes.data) return null;

  return toTicketData({
    kind: args.kind,
    order: orderRes.data as unknown as TicketOrderRow,
    restaurant: restaurantRes.data as unknown as TicketRestaurantRow,
    items: (itemsRes.data ?? []) as unknown as TicketItemRow[],
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app',
    reprintedAt: args.reprintedAt,
  });
}
