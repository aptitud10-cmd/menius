// @vitest-environment node
/**
 * Ticket impreso (SPEC impresión §6, TASKS Sprint 2): datos + render.
 *
 * Para mirar los PNG: TICKET_PREVIEW_DIR=/alguna/carpeta npx vitest run printing-ticket
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { toTicketData, orderDirectUrl, type ToTicketDataInput, type TicketItemRow } from '@/lib/printing/ticket-data';
import { renderTicketPng } from '@/lib/printing/render-ticket';
import { detectAllergy } from '@/lib/printing/allergy';
import { shortOrderNumber } from '@/lib/orders/short-number';
import { shortOrderNumber as kitchenShort } from '@/lib/kitchen';
import { shortOrderNumber as emailShort } from '@/lib/notifications/customer-email';

const BUCCANEER = {
  name: 'Buccaneer Diner', slug: 'buccaneer', timezone: 'America/New_York', currency: 'USD',
  locale: 'en', tax_label: 'Tax', custom_domain: null, domain_verified: false,
};

const BURGER: TicketItemRow = {
  qty: 1, line_total: 23.34, notes: null,
  products: { name: 'Bacon Cheeseburger' },
  modifier_lines: [
    { text: 'Deluxe', price: 0, indent: false, title: true },
    { text: 'Medium', price: 0, indent: false },
    { text: 'Sub Sweet Potato Fries', price: 1.8, indent: false },
    { text: 'with Swiss cheese', price: 1.5, indent: true },
  ],
};
const WINGS: TicketItemRow = { qty: 2, line_total: 33.48, products: { name: 'Buffalo Wings' }, modifier_lines: [{ text: 'Hot', price: 0, indent: false }] };
const SODA: TicketItemRow = { qty: 3, line_total: 8.97, products: { name: 'Coke' }, modifier_lines: [] };

// 2026-11-14 14:43 NY = 19:43 UTC
const CREATED = '2026-11-14T19:43:00Z';

function input(over: Partial<ToTicketDataInput['order']> = {}, extra: Partial<ToTicketDataInput> = {}): ToTicketDataInput {
  return {
    kind: 'order',
    appUrl: 'https://menius.app',
    restaurant: BUCCANEER,
    items: [BURGER, WINGS],
    order: {
      order_number: 'ORD-261114-003', customer_name: 'Stephen S.', order_type: 'pickup',
      payment_method: 'cash', payment_status: 'pending', total: 61.86, tax_amount: 5.04,
      delivery_fee: 0, discount_amount: 0, include_utensils: false, estimated_ready_minutes: 12,
      prepared_at: CREATED, created_at: CREATED, notes: '',
      ...over,
    },
    ...extra,
  };
}

const CASES: Record<string, ToTicketDataInput> = {
  'pickup-cash': input(),
  'delivery-cash': input({
    order_type: 'delivery', delivery_fee: 3.99, tip_amount: 5, total: 70.85, customer_phone: '+17185550123',
    delivery_address: '45-12 102nd St, Apt 3B, East Elmhurst, NY 11369', delivery_instructions: 'Ring bell 2, leave at door',
  }),
  'delivery-paid': input({ order_type: 'delivery', payment_method: 'online', payment_status: 'paid', delivery_address: '45-12 102nd St', customer_phone: '7185550123' }),
  'online-unpaid-verify': input({ payment_method: 'online', payment_status: 'pending' }),
  'dine-in': input({ order_type: 'dine_in', table_name: '7', customer_name: '' }),
  'scheduled': input({ scheduled_for: '2026-11-15T00:30:00Z' }),
  'reprint': input({}, { kind: 'reprint', reprintedAt: new Date('2026-11-14T20:10:00Z') }),
  'allergy': input({ notes: 'Please hurry. Peanut allergy, no nuts at all!' }),
  'spanish-accents': input({ customer_name: 'Ñoño Pérez' }, {
    restaurant: { ...BUCCANEER, name: 'Taquería El Niño', locale: 'es', currency: 'MXN', timezone: 'America/Mexico_City' },
    items: [{ qty: 1, line_total: 120, products: { name: 'Jalapeños rellenos de camarón' }, modifier_lines: [{ text: 'Salsa de piña', price: 0, indent: false }] }],
  }),
  'long-note': input({}, {
    items: [{ ...BURGER, notes: 'No onions, no pickles, extra crispy bacon, sauce on the side, cut in half and wrap each half separately please — it is for two kids' }, SODA],
  }),
};

describe('toTicketData', () => {
  it('pago (F9): pagado solo con payment_status = paid', () => {
    expect(toTicketData(CASES['pickup-cash']).payment).toEqual({ kind: 'collect_cash', amount: 61.86 });
    expect(toTicketData(CASES['delivery-paid']).payment.kind).toBe('paid');
    expect(toTicketData(CASES['online-unpaid-verify']).payment.kind).toBe('verify');
    // Efectivo marcado pagado (raro, pero manda payment_status) → PAID.
    expect(toTicketData(input({ payment_status: 'paid' })).payment.kind).toBe('paid');
  });

  it('número corto idéntico al de email, KDS y seguimiento (CA-12)', () => {
    const d = toTicketData(CASES['pickup-cash']);
    expect(d.shortNumber).toBe('003');
    expect(d.shortNumber).toBe(emailShort('ORD-261114-003'));
    expect(d.shortNumber).toBe(kitchenShort('ORD-261114-003'));
  });

  it('título del plato, variante y líneas de modificadores', () => {
    const d = toTicketData(CASES['pickup-cash']);
    expect(d.items[0].name).toBe('Bacon Cheeseburger Deluxe');
    expect(d.items[0].lines.map((l) => l.text)).toEqual(['Medium', 'Sub Sweet Potato Fries', 'with Swiss cheese']);
    expect(d.itemCount).toBe(3);
  });

  it('sin modifier_lines cae a order_item_modifiers', () => {
    const d = toTicketData(input({}, { items: [{ qty: 1, line_total: 10, products: { name: 'Eggs' }, order_item_modifiers: [{ option_name: 'Over Easy', price_delta: 0 }] }] }));
    expect(d.items[0].lines.map((l) => l.text)).toEqual(['Over Easy']);
  });

  it('totales de orders; con propina la suma cierra (CA-15)', () => {
    const d = toTicketData(CASES['delivery-cash']);
    expect(d.totals).toEqual({ subtotal: 56.82, tax: 5.04, deliveryFee: 3.99, discount: 0, tip: 5, total: 70.85 });
    const { subtotal, tax, deliveryFee, discount, tip, total } = d.totals;
    expect(Math.round((subtotal + tax + deliveryFee - discount + tip) * 100) / 100).toBe(total);
    expect(d.payment).toEqual({ kind: 'collect_cash', amount: 70.85 });
    expect(toTicketData(CASES['pickup-cash']).totals.tip).toBe(0);
    expect(d.includeUtensils).toBe(false);
  });

  it('horas en la zona del restaurante', () => {
    const d = toTicketData(CASES['pickup-cash']);
    expect(d.placedAt).toBe('2:43 PM');
    expect(d.readyAt).toBe('2:55 PM');
    expect(toTicketData(CASES['reprint']).reprintedAt).toBe('3:10 PM');
    expect(toTicketData(CASES['scheduled']).scheduledFor).toBe('Sat 11/14 7:30 PM');
  });

  it('mesa solo en dine-in; delivery solo en delivery', () => {
    expect(toTicketData(CASES['dine-in']).tableName).toBe('7');
    expect(toTicketData(CASES['pickup-cash']).delivery).toBeUndefined();
    expect(toTicketData(CASES['delivery-cash']).delivery?.instructions).toBe('Ring bell 2, leave at door');
  });

  it('Order direct: dominio verificado o menius.app/<slug>', () => {
    expect(orderDirectUrl(BUCCANEER, 'https://menius.app')).toBe('menius.app/buccaneer');
    expect(orderDirectUrl({ ...BUCCANEER, custom_domain: 'buccaneerdiner.com', domain_verified: true }, 'https://menius.app')).toBe('buccaneerdiner.com');
    expect(orderDirectUrl({ ...BUCCANEER, custom_domain: 'buccaneerdiner.com', domain_verified: false }, 'https://menius.app')).toBe('menius.app/buccaneer');
  });
});

describe('detectAllergy (CA-16)', () => {
  it('detecta y devuelve la frase', () => {
    expect(detectAllergy(['Please hurry. Peanut allergy, no nuts at all!'])).toBe('Peanut allergy, no nuts at all!');
    expect(detectAllergy(['Soy alérgico al maní'])).toBe('Soy alérgico al maní');
    expect(detectAllergy([null, 'celiac — gluten free bun'])).toBe('celiac — gluten free bun');
  });
  it('no confunde palabras que contienen "nut"', () => {
    expect(detectAllergy(['Donut and coconut water, ready in a minute'])).toBeNull();
    expect(detectAllergy(['', null, undefined])).toBeNull();
  });
});

describe('shortOrderNumber', () => {
  it('una sola fuente con fallback', () => {
    expect(shortOrderNumber('ORD-261114-003')).toBe('003');
    expect(shortOrderNumber(null)).toBe('');
    expect(shortOrderNumber(undefined, '—')).toBe('—');
    expect(kitchenShort(null)).toBe('—');
  });
});

describe('renderTicketPng', () => {
  const outDir = process.env.TICKET_PREVIEW_DIR;
  if (outDir) mkdirSync(outDir, { recursive: true });

  for (const [name, c] of Object.entries(CASES)) {
    it(`render: ${name}`, async () => {
      const png = await renderTicketPng(toTicketData(c));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(576);   // ancho
      expect(png[24]).toBe(1);                   // 1 bit por pixel
      if (outDir) writeFileSync(path.join(outDir, `${name}.png`), png);
    }, 20_000);
  }

  it('render: test', async () => {
    const png = await renderTicketPng({ ...toTicketData(CASES['pickup-cash']), kind: 'test' });
    expect(png.readUInt32BE(16)).toBe(576);
    if (outDir) writeFileSync(path.join(outDir, 'test-print.png'), png);
  });
});
