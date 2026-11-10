/**
 * Carga, desde la base, todo lo que necesitan los emails al cliente
 * (customer-email.ts) y los envía con el remitente y el reply-to correctos.
 *
 * Columnas verificadas en supabase/schema.sql (regla 11 de CLAUDE.md).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { sendEmail } from './email';
import { cleanSenderName, type CustomerEmailCtx, type CustomerEmailItem, type BuiltEmail } from './customer-email';

const logger = createLogger('customer-email');

export interface CustomerEmailOrder {
  ctx: CustomerEmailCtx;
  orderId: string;
  restaurantId: string;
  status: string;
  customerEmail: string | null;
  customerId: string | null;
  notificationsOn: boolean;
  replyTo: string | null;
  paymentStatus: string | null;
  estimatedReadyMinutes: number | null;
  preparedAt: string | null;
  createdAt: string | null;
  driverName: string | null;
  cancellationReason: string | null;
  restaurantCoords: { lat: number | null; lng: number | null };
  deliveryCoords: { lat: number | null; lng: number | null };
}

const ORDER_SELECT = `
  id, restaurant_id, order_number, status, customer_name, customer_email, customer_locale, customer_token, customer_id,
  order_type, payment_method, payment_status, total, tax_amount, tip_amount, delivery_fee, discount_amount, loyalty_discount,
  delivery_address, delivery_lat, delivery_lng, table_name, estimated_ready_minutes, prepared_at, created_at,
  driver_name, cancellation_reason,
  restaurants ( name, slug, address, phone, logo_url, email, notification_email, notifications_enabled, timezone, currency, locale,
    tax_label, tax_rate, tax_included, latitude, longitude )
`;

interface ItemRow {
  qty: number;
  line_total: number;
  notes: string | null;
  products: { name: string } | null;
  product_variants: { name: string } | null;
  order_item_extras: { price: number; product_extras: { name: string } | null }[];
  order_item_modifiers: { option_name: string }[];
}

async function loadItems(orderId: string): Promise<CustomerEmailItem[]> {
  const { data } = await createAdminClient()
    .from('order_items')
    .select('qty, line_total, notes, products ( name ), product_variants ( name ), order_item_extras ( price, product_extras ( name ) ), order_item_modifiers ( option_name )')
    .eq('order_id', orderId);
  return ((data ?? []) as unknown as ItemRow[]).map((r) => {
    const parts = [
      r.product_variants?.name,
      ...(r.order_item_modifiers ?? []).map((m) => m.option_name),
      ...(r.order_item_extras ?? []).map((e) => e.product_extras?.name).filter(Boolean),
      r.notes ? `"${r.notes}"` : null,
    ].filter(Boolean) as string[];
    return {
      qty: Number(r.qty) || 1,
      name: r.products?.name ?? 'Item',
      detail: parts.length ? parts.join(' · ') : undefined,
      lineTotal: Number(r.line_total) || 0,
    };
  });
}

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const coord = (v: unknown): number | null => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);

export async function loadCustomerEmailOrder(orderId: string): Promise<CustomerEmailOrder | null> {
  const { data, error } = await createAdminClient().from('orders').select(ORDER_SELECT).eq('id', orderId).maybeSingle();
  if (error) {
    logger.error('order load failed', { orderId, code: error.code });
    return null;
  }
  if (!data) return null;
  // El select es dinámico (string) → supabase-js no infiere el tipo.
  const o = data as unknown as Record<string, unknown> & { restaurants: Record<string, unknown> | Record<string, unknown>[] | null };
  const r = (Array.isArray(o.restaurants) ? o.restaurants[0] : o.restaurants) ?? null;
  if (!r) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const slug = String(r.slug ?? '');
  const token = o.customer_token ? `?t=${o.customer_token}` : '';
  const address = (r.address as string | null) ?? null;
  const locale = (o.customer_locale as string | null) ?? (r.locale as string | null) ?? 'es';
  const items = await loadItems(orderId);

  const ctx: CustomerEmailCtx = {
    locale: locale === 'en' ? 'en' : 'es',
    restaurant: {
      name: String(r.name ?? ''),
      address,
      phone: (r.phone as string | null) ?? null,
      logoUrl: (r.logo_url as string | null) ?? null,
      timezone: (r.timezone as string | null) ?? null,
    },
    orderNumber: String(o.order_number ?? ''),
    customerName: String(o.customer_name ?? ''),
    orderType: String(o.order_type ?? 'pickup'),
    trackingUrl: `${appUrl}/${slug}/orden/${o.order_number}${token}`,
    menuUrl: `${appUrl}/${slug}`,
    mapsUrl: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name ?? ''} ${address}`)}` : null,
    paymentMethod: (o.payment_method as string | null) ?? null,
    paid: o.payment_status === 'paid',
    currency: String(r.currency ?? 'USD'),
    items,
    discount: num(o.discount_amount) + num(o.loyalty_discount),
    tax: num(o.tax_amount),
    taxLabel: (r.tax_label as string | null) ?? null,
    taxRate: r.tax_rate != null ? num(r.tax_rate) : null,
    taxIncluded: r.tax_included === true,
    tip: num(o.tip_amount),
    deliveryFee: num(o.delivery_fee),
    total: num(o.total),
    deliveryAddress: (o.delivery_address as string | null) ?? null,
    tableName: (o.table_name as string | null) ?? null,
  };

  return {
    ctx,
    orderId,
    restaurantId: String(o.restaurant_id ?? ''),
    status: String(o.status ?? ''),
    customerEmail: (o.customer_email as string | null) || null,
    customerId: (o.customer_id as string | null) ?? null,
    notificationsOn: r.notifications_enabled !== false,
    replyTo: ((r.email as string | null) || (r.notification_email as string | null)) ?? null,
    paymentStatus: (o.payment_status as string | null) ?? null,
    estimatedReadyMinutes: o.estimated_ready_minutes != null ? num(o.estimated_ready_minutes) : null,
    preparedAt: (o.prepared_at as string | null) ?? null,
    createdAt: (o.created_at as string | null) ?? null,
    driverName: (o.driver_name as string | null) ?? null,
    cancellationReason: (o.cancellation_reason as string | null) ?? null,
    restaurantCoords: { lat: coord(r.latitude), lng: coord(r.longitude) },
    deliveryCoords: { lat: coord(o.delivery_lat), lng: coord(o.delivery_lng) },
  };
}

/** Envía un email al cliente con el restaurante como remitente y reply-to. */
export async function sendCustomerEmail(order: CustomerEmailOrder, email: BuiltEmail): Promise<boolean> {
  if (!order.customerEmail) return false;
  return sendEmail({
    to: order.customerEmail,
    from: `"${cleanSenderName(order.ctx.restaurant.name)}" <orders@menius.app>`,
    replyTo: order.replyTo ?? undefined,
    subject: email.subject,
    html: email.html,
  });
}

