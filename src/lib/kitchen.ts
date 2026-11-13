/**
 * Lo que ve la cocina de un pedido (pantalla KDS y ticket de cocina).
 *
 * La cocina ve SOLO lo que cocina: cada categoría dice si va a cocina
 * (categories.send_to_kitchen); bebidas, postres y panadería se arman en el mostrador
 * y en el ticket queda una línea "+ 2 Pepsi · 1 Cheesecake en mostrador" para que
 * nadie cierre el pedido sin ellas. Si el dato no vino (pedido viejo, select sin la
 * categoría), el ítem va a cocina: es preferible de más que perder un plato.
 */
import { orderItemModLines, withTitle } from '@/lib/modifier-lines';

export interface KitchenRawItem {
  qty: number;
  notes?: string | null;
  product?: {
    id?: string | null;
    name?: string | null;
    station_id?: string | null;
    category?: { send_to_kitchen?: boolean | null } | null;
  } | null;
  variant?: { name?: string | null } | null;
  modifier_lines?: unknown;
  order_item_modifiers?: { group_name?: string | null; option_name?: string | null; price_delta?: number | string | null }[];
  order_item_extras?: { product_extras?: { name?: string | null } | null }[];
}

export type KitchenLineKind = 'no' | 'side' | 'normal';

export interface KitchenLine {
  text: string;
  indent: boolean;
  kind: KitchenLineKind;
}

export interface KitchenItem {
  index: number;
  productId: string | null;
  stationId: string | null;
  qty: number;
  /** "Cheeseburger Deluxe" (el estilo va pegado al nombre, como en el ticket). */
  name: string;
  lines: KitchenLine[];
  note: string | null;
}

export function isKitchenItem(item: KitchenRawItem): boolean {
  return item.product?.category?.send_to_kitchen !== false;
}

/** "No Lettuce" se grita; "Ranch on the side" va aparte, no en el plato. */
export function lineKind(text: string): KitchenLineKind {
  if (/^(no|sin)\s/i.test(text.trim())) return 'no';
  if (/\bon the side\b|\baparte\b/i.test(text)) return 'side';
  return 'normal';
}

function itemName(item: KitchenRawItem) {
  const base = item.product?.name?.trim() || '—';
  const { name, lines } = withTitle(base, orderItemModLines(item));
  const variant = item.variant?.name?.trim();
  return { name: variant ? `${name} · ${variant}` : name, lines };
}

/** Los platos que cocina esta pantalla (todas las estaciones o una). */
export function kitchenItems(items: KitchenRawItem[] | undefined, stationId: string | 'all' = 'all'): KitchenItem[] {
  const out: KitchenItem[] = [];
  (items ?? []).forEach((item, index) => {
    if (!isKitchenItem(item)) return;
    if (stationId !== 'all' && item.product?.station_id !== stationId) return;
    const { name, lines } = itemName(item);
    const extras = (item.order_item_extras ?? [])
      .map((e) => e.product_extras?.name?.trim())
      .filter((n): n is string => !!n)
      .map((n) => ({ text: `+ ${n}`, indent: false, kind: 'normal' as const }));
    out.push({
      index,
      productId: item.product?.id ?? null,
      stationId: item.product?.station_id ?? null,
      qty: item.qty,
      name,
      lines: [
        ...lines.map((l) => ({ text: l.text, indent: l.indent, kind: lineKind(l.text) })),
        ...extras,
      ],
      note: item.notes?.trim() ? item.notes.trim() : null,
    });
  });
  return out;
}

/** Lo que se arma en el mostrador ("2 Assorted Sodas", "1 Cheesecake"). El detalle va en el ticket del Counter. */
export function counterItems(items: KitchenRawItem[] | undefined): { qty: number; name: string }[] {
  return (items ?? [])
    .filter((item) => !isKitchenItem(item))
    .map((item) => ({ qty: item.qty, name: itemName(item).name }));
}

/** "ORD-261113-021" → "021". */
export function shortOrderNumber(orderNumber: string | null | undefined): string {
  if (!orderNumber) return '—';
  const parts = orderNumber.split('-');
  return parts[parts.length - 1] || orderNumber;
}

/** "Maria Gonzalez" → "Maria G." */
export function shortCustomerName(name: string | null | undefined): string | null {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * Estado de tiempo contra lo prometido (no minutos fijos): ámbar al 75% del tiempo
 * que aceptó el Counter, rojo al pasarlo.
 */
export function kitchenTiming(startIso: string, etaMinutes: number, now = Date.now()) {
  const start = new Date(startIso).getTime();
  const elapsedSec = Math.max(0, Math.floor((now - start) / 1000));
  const dueAt = start + etaMinutes * 60_000;
  const ratio = etaMinutes > 0 ? elapsedSec / (etaMinutes * 60) : 0;
  const state: 'ok' | 'warn' | 'late' = ratio >= 1 ? 'late' : ratio >= 0.75 ? 'warn' : 'ok';
  const m = Math.floor(elapsedSec / 60), s = elapsedSec % 60;
  const timer = m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const lateMin = Math.max(0, Math.floor((now - dueAt) / 60_000));
  return { timer, state, dueAt, lateMin };
}
