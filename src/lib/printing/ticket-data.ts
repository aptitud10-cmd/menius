/**
 * TicketData: TODO lo que se imprime en un ticket, ya resuelto (SPEC impresión §6, API §3).
 *
 * `toTicketData` es PURA: la usan el renderer PNG de CloudPRNT (server) y, en el
 * Sprint 4, el bridge Bluetooth de Android (cliente). Así hay UN solo diseño:
 * ningún camino de impresión decide por su cuenta qué texto sale.
 *
 * Reglas de plata (F9 / F10):
 *  - "pagado" SOLO si payment_status = 'paid'. Nunca se infiere del método.
 *  - Los totales salen de los campos guardados en orders; no se recalculan.
 *    (El subtotal es la suma de line_total, igual que el email al cliente.)
 *  - La propina se imprime como línea "Tip" (orders.total ya la incluye: sin la
 *    línea la suma no cierra y el COLLECT cobraría una propina invisible).
 */
import { shortOrderNumber } from '@/lib/orders/short-number';
import { orderItemModLines, withTitle } from '@/lib/modifier-lines';
import { detectAllergy } from './allergy';
import { channelOf } from './channel';
import type { TicketLocale } from './ticket-i18n';

export type TicketKind = 'order' | 'reprint' | 'test';
export type TicketOrderType = 'delivery' | 'pickup' | 'dine_in';

export interface TicketLine {
  text: string;
  /** Recargo por unidad; 0 = sin precio. */
  price: number;
  indent: boolean;
}

export interface TicketItem {
  qty: number;
  name: string;
  lineTotal: number;
  lines: TicketLine[];
  notes?: string;
}

export interface TicketData {
  kind: TicketKind;
  /** Hora de la reimpresión ya formateada ("3:10 AM"). */
  reprintedAt?: string;
  locale: TicketLocale;
  restaurant: { name: string; currency: string; taxLabel: string; orderDirectUrl: string };
  channel: ReturnType<typeof channelOf>;
  orderType: TicketOrderType;
  /** "003" (sin "#"). */
  shortNumber: string;
  /** "ORD-261113-003". */
  orderNumber: string;
  customerName?: string;
  /** Hora estimada de listo, en la zona del restaurante ("2:55 AM"). */
  readyAt?: string;
  /** "Sat 11/15 7:30 PM". */
  scheduledFor?: string;
  tableName?: string;
  includeUtensils: boolean;
  /** Fragmento de la nota que menciona la alergia. */
  allergy?: string;
  items: TicketItem[];
  itemCount: number;
  orderNotes?: string;
  totals: { subtotal: number; tax: number; deliveryFee: number; discount: number; tip: number; total: number };
  payment: { kind: 'paid' | 'collect_cash' | 'verify'; amount: number };
  delivery?: { address: string; phone?: string; instructions?: string };
  /** Hora en que entró el pedido ("2:43 AM"). */
  placedAt: string;
}

// ── Entradas crudas (filas de la base, con nombres de columna reales) ──────────
export interface TicketOrderRow {
  order_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  order_type?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  total?: number | string | null;
  tax_amount?: number | string | null;
  delivery_fee?: number | string | null;
  discount_amount?: number | string | null;
  tip_amount?: number | string | null;
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  table_name?: string | null;
  include_utensils?: boolean | null;
  scheduled_for?: string | null;
  estimated_ready_minutes?: number | null;
  prepared_at?: string | null;
  created_at?: string | null;
  notes?: string | null;
}

export interface TicketItemRow {
  qty: number | string;
  line_total: number | string;
  notes?: string | null;
  modifier_lines?: unknown;
  products?: { name?: string | null } | null;
  product_variants?: { name?: string | null } | null;
  order_item_extras?: { price?: number | string | null; product_extras?: { name?: string | null } | null }[] | null;
  order_item_modifiers?: { option_name?: string | null; price_delta?: number | string | null }[] | null;
}

export interface TicketRestaurantRow {
  name: string;
  slug: string;
  timezone?: string | null;
  currency?: string | null;
  locale?: string | null;
  tax_label?: string | null;
  custom_domain?: string | null;
  domain_verified?: boolean | null;
}

export interface ToTicketDataInput {
  kind: TicketKind;
  order: TicketOrderRow;
  items: TicketItemRow[];
  restaurant: TicketRestaurantRow;
  /** NEXT_PUBLIC_APP_URL (o https://menius.app). */
  appUrl: string;
  /** Para kind = 'reprint': cuándo se pidió. */
  reprintedAt?: Date;
}

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clean = (v: string | null | undefined): string | undefined => {
  const s = (v ?? '').trim();
  return s || undefined;
};

function formatTime(d: Date, locale: TicketLocale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-MX', {
    timeZone, hour: 'numeric', minute: '2-digit',
  }).format(d);
}

function formatDayTime(d: Date, locale: TicketLocale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-MX', {
    timeZone, weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(d).replace(/,/g, '');
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Order direct": dominio propio verificado, o la página de MENIUS del restaurante. */
export function orderDirectUrl(r: Pick<TicketRestaurantRow, 'slug' | 'custom_domain' | 'domain_verified'>, appUrl: string): string {
  const domain = clean(r.custom_domain);
  if (domain && r.domain_verified) return domain;
  return `${appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}/${r.slug}`;
}

export function toTicketData(input: ToTicketDataInput): TicketData {
  const { order: o, restaurant: r } = input;
  const locale: TicketLocale = r.locale === 'en' ? 'en' : 'es';
  const timeZone = r.timezone || 'America/New_York';
  const orderType: TicketOrderType =
    o.order_type === 'delivery' || o.order_type === 'pickup' ? o.order_type : 'dine_in';

  const items: TicketItem[] = input.items.map((row) => {
    const { name, lines } = withTitle(row.products?.name || 'Item', orderItemModLines({
      modifier_lines: row.modifier_lines,
      order_item_modifiers: (row.order_item_modifiers ?? []).map((m) => ({
        option_name: m.option_name ?? null, price_delta: m.price_delta ?? null,
      })),
    }));
    const variant = clean(row.product_variants?.name);
    const extras = (row.order_item_extras ?? [])
      .filter((e) => clean(e.product_extras?.name))
      .map((e) => ({ text: String(e.product_extras?.name).trim(), price: num(e.price), indent: false }));
    return {
      qty: Math.max(1, num(row.qty)),
      name,
      lineTotal: num(row.line_total),
      lines: [
        ...(variant ? [{ text: variant, price: 0, indent: false }] : []),
        ...lines.map((l) => ({ text: l.text, price: l.price, indent: l.indent })),
        ...extras,
      ],
      notes: clean(row.notes),
    };
  });

  const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  const total = num(o.total);

  const payment: TicketData['payment'] =
    o.payment_status === 'paid' ? { kind: 'paid', amount: total }
    : o.payment_method === 'cash' ? { kind: 'collect_cash', amount: total }
    : { kind: 'verify', amount: total };

  const created = parseDate(o.created_at) ?? new Date();
  const readyBase = parseDate(o.prepared_at) ?? created;
  const readyAt = o.estimated_ready_minutes
    ? formatTime(new Date(readyBase.getTime() + o.estimated_ready_minutes * 60_000), locale, timeZone)
    : undefined;
  const scheduled = parseDate(o.scheduled_for);

  const orderNotes = clean(o.notes);
  const allergy = detectAllergy([orderNotes, ...items.map((i) => i.notes)]) ?? undefined;

  return {
    kind: input.kind,
    ...(input.kind === 'reprint' ? { reprintedAt: formatTime(input.reprintedAt ?? new Date(), locale, timeZone) } : {}),
    locale,
    restaurant: {
      name: r.name,
      currency: r.currency || 'USD',
      taxLabel: clean(r.tax_label) ?? 'Tax',
      orderDirectUrl: orderDirectUrl(r, input.appUrl),
    },
    channel: channelOf(o),
    orderType,
    shortNumber: shortOrderNumber(o.order_number),
    orderNumber: o.order_number,
    customerName: clean(o.customer_name),
    readyAt,
    scheduledFor: scheduled ? formatDayTime(scheduled, locale, timeZone) : undefined,
    tableName: orderType === 'dine_in' ? clean(o.table_name) : undefined,
    includeUtensils: o.include_utensils !== false,
    allergy,
    items,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    orderNotes,
    totals: {
      subtotal,
      tax: num(o.tax_amount),
      deliveryFee: num(o.delivery_fee),
      discount: num(o.discount_amount),
      tip: num(o.tip_amount),
      total,
    },
    payment,
    delivery: orderType === 'delivery' && clean(o.delivery_address)
      ? {
          address: String(o.delivery_address).trim(),
          phone: clean(o.customer_phone),
          instructions: clean(o.delivery_instructions),
        }
      : undefined,
    placedAt: formatTime(created, locale, timeZone),
  };
}
