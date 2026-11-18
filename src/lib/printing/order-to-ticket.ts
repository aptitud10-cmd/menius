/**
 * TicketData desde el pedido que ya tiene la tablet (camino Bluetooth / red de
 * la app Android, SPEC impresión §1b opción b). Puro: la tablet no vuelve a
 * consultar la base para imprimir. Mismo toTicketData que el PNG de CloudPRNT:
 * un solo diseño, dos caminos.
 */
import type { Order, OrderItem } from '@/types';
import { formatPrice } from '@/lib/utils';
import { toTicketData, type TicketData, type TicketItemRow, type TicketOrderRow } from './ticket-data';
import { ticketTextFor, type TicketText } from './ticket-i18n';

export interface OrderToTicketOpts {
  restaurantName: string;
  currency: string;
  locale?: string;
  taxLabel?: string;
  /** Si no viene, el ticket sale sin la línea "Order direct". */
  slug?: string;
  /** Zona del restaurante; por defecto la de la tablet (está en el local). */
  timeZone?: string;
  appUrl: string;
  kind?: 'order' | 'reprint';
  /** Minutos que eligió el cajero al aceptar. Al imprimir en ese momento el
   *  pedido todavía no los tiene guardados: sin esto, el ticket sale sin "LISTO". */
  etaMinutes?: number;
}

export function orderToTicketData(order: Order, opts: OrderToTicketOpts): { ticket: TicketData; ticketText: TicketText } {
  const raw = order as unknown as Record<string, unknown> & TicketOrderRow;
  const fillEta = !raw.estimated_ready_minutes && opts.etaMinutes != null && opts.etaMinutes > 0;
  const items: TicketItemRow[] = (order.items ?? []).map((it: OrderItem) => {
    const r = it as unknown as Record<string, unknown>;
    const extras = (it.extras ?? (r.order_item_extras as unknown[]) ?? []) as Array<{ price?: number | string | null; extra?: { name?: string | null } | null; product_extras?: { name?: string | null } | null }>;
    return {
      qty: it.qty,
      line_total: it.line_total ?? Number(it.unit_price) * it.qty,
      notes: it.notes ?? null,
      modifier_lines: it.modifier_lines,
      products: it.product ? { name: it.product.name } : null,
      product_variants: it.variant ? { name: it.variant.name } : null,
      order_item_extras: extras.map((e) => ({ price: e.price ?? 0, product_extras: { name: e.product_extras?.name ?? e.extra?.name ?? null } })),
      order_item_modifiers: (r.order_item_modifiers as TicketItemRow['order_item_modifiers']) ?? [],
    };
  });

  const ticket = toTicketData({
    kind: opts.kind ?? 'order',
    order: {
      ...raw,
      order_number: order.order_number,
      ...(fillEta ? { estimated_ready_minutes: opts.etaMinutes, prepared_at: raw.prepared_at ?? new Date().toISOString() } : {}),
    },
    items,
    restaurant: {
      name: opts.restaurantName,
      slug: opts.slug ?? '',
      currency: opts.currency,
      locale: opts.locale === 'en' ? 'en' : 'es',
      tax_label: opts.taxLabel ?? null,
      timezone: opts.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    appUrl: opts.appUrl,
  });
  const ticketText = ticketTextFor(ticket, formatPrice(ticket.payment.amount, ticket.restaurant.currency));
  return { ticket, ticketText };
}
