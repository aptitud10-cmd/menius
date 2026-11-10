import { describe, it, expect } from 'vitest';
import {
  buildReceiptEmail, buildEtaEmail, buildReadyEmail, buildOnTheWayEmail, buildCancelledEmail, buildReviewEmail,
  customerEmailKind, shortOrderNumber, cleanSenderName, windowLabel, prettyPhone, type CustomerEmailCtx,
} from '@/lib/notifications/customer-email';

const base: CustomerEmailCtx = {
  locale: 'en',
  restaurant: { name: 'Buccaneer Diner', address: '9301 Astoria Blvd', phone: '+17184295188', logoUrl: null, timezone: 'America/New_York' },
  orderNumber: 'ORD-261110-014',
  customerName: 'María López',
  orderType: 'pickup',
  trackingUrl: 'https://menius.app/buccaneer/orden/ORD-261110-014?t=tok',
  menuUrl: 'https://menius.app/buccaneer',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=x',
  paymentMethod: 'cash',
  paid: false,
  currency: 'USD',
  items: [
    { qty: 2, name: 'Banana Pecan Pancakes', lineTotal: 31.9 },
    { qty: 1, name: 'Bacon Cheeseburger', detail: 'Medium well · Fries', lineTotal: 13.95 },
    { qty: 2, name: 'Coffee (Free Refill)', lineTotal: 6.3 },
  ],
  discount: 0, tax: 4.63, taxLabel: 'Tax', taxRate: 8.875, taxIncluded: false, tip: 0, deliveryFee: 0,
  total: 56.78,
  deliveryAddress: null, tableName: null,
};

// 12:31 PM en Nueva York del 10-nov-2026 (UTC-5).
const T0 = Date.UTC(2026, 10, 10, 17, 31);

describe('customer emails', () => {
  it('maps statuses to at most 3 emails per order', () => {
    expect(customerEmailKind('confirmed', 'pickup')).toBe('eta');
    expect(customerEmailKind('preparing', 'delivery')).toBe('eta');
    expect(customerEmailKind('ready', 'pickup')).toBe('ready');
    expect(customerEmailKind('ready', 'delivery')).toBeNull();
    expect(customerEmailKind('ready', 'dine_in')).toBeNull();
    expect(customerEmailKind('out_for_delivery', 'delivery')).toBe('on_the_way');
    expect(customerEmailKind('delivered', 'delivery')).toBeNull();
    expect(customerEmailKind('completed', 'dine_in')).toBeNull();
    expect(customerEmailKind('cancelled', 'pickup')).toBe('cancelled');
  });

  it('receipt shows subtotal + tax that add up to the total, short number and payment', () => {
    const e = buildReceiptEmail(base);
    expect(e.subject).toBe('Order #014 received — Buccaneer Diner');
    expect(e.preheader).toBe('Pickup · Pay at pickup · Cash · $56.78');
    expect(e.html).toContain('$52.15'); // subtotal = 31.90 + 13.95 + 6.30
    expect(e.html).toContain('Tax (8.875%)');
    expect(e.html).toContain('$56.78');
    expect(e.html).toContain('#014');
    expect(e.html).toContain('Thanks, María.');
    expect(e.html).toContain('name="color-scheme"');
    expect(e.html).toContain('prefers-color-scheme: dark');
    for (const emoji of ['✅', '🎉', '⭐', '📦']) expect(e.html).not.toContain(emoji);
  });

  it('paid receipt says Paid', () => {
    const e = buildReceiptEmail({ ...base, paid: true });
    expect(e.subject).toBe('Order #014 paid — Buccaneer Diner');
    expect(e.html).toContain('Paid online');
  });

  it('eta email uses the clock time in the restaurant timezone', () => {
    const e = buildEtaEmail(base, { readyAtMs: T0 + 14 * 60_000 });
    expect(e.subject).toBe('Ready around 12:45 PM — order #014');
    const upd = buildEtaEmail(base, { readyAtMs: T0 + 24 * 60_000, isUpdate: true });
    expect(upd.subject).toBe('New pickup time: 12:55 PM — order #014');
  });

  it('delivery eta and on-the-way use a 10-minute window', () => {
    const d = { ...base, orderType: 'delivery', deliveryAddress: '37-15 99th St, Apt 3B' };
    const arrival = Date.UTC(2026, 10, 10, 18, 15); // 1:15 PM NY
    expect(windowLabel(arrival, 'en', 'America/New_York')).toBe('1:10–1:20 PM');
    const eta = buildEtaEmail(d, { readyAtMs: arrival - 15 * 60_000, arrivalMs: arrival });
    expect(eta.subject).toBe('Arrives 1:10–1:20 PM — order #014');
    const otw = buildOnTheWayEmail(d, { arrivalMs: arrival, driverName: 'Carlos Pérez' });
    expect(otw.subject).toBe('Carlos is on the way — arrives 1:10–1:20 PM');
    expect(otw.html).toContain('Have $56.78 in cash ready.');
    expect(otw.html).toContain('37-15 99th St, Apt 3B');
  });

  it('spanish copy', () => {
    const es = { ...base, locale: 'es', orderType: 'delivery' };
    const arrival = Date.UTC(2026, 10, 10, 18, 15);
    const otw = buildOnTheWayEmail(es, { arrivalMs: arrival, driverName: null });
    expect(otw.subject).toMatch(/^Tu pedido viene en camino — llega entre 1:10 y 1:20/);
    expect(buildReceiptEmail(es).subject).toBe('Pedido #014 recibido — Buccaneer Diner');
  });

  it('ready email tells what to show at the counter', () => {
    const e = buildReadyEmail(base);
    expect(e.subject).toBe('Your order #014 is ready — Buccaneer Diner');
    expect(e.html).toContain('Show this number at the counter.');
  });

  it('cancelled email shows the reason and the refund only when refunded', () => {
    const a = buildCancelledEmail(base, { reason: 'Out of stock', refunded: false });
    expect(a.html).toContain('Out of stock');
    expect(a.html).not.toContain('Refund');
    expect(a.html).toContain('tel:+17184295188');
    const b = buildCancelledEmail({ ...base, paid: true }, { reason: 'auto_closed', refunded: true });
    expect(b.subject).toBe('Order #014 was cancelled — refund on the way');
    expect(b.html).not.toContain('auto_closed');
  });

  it('review email links each star with its rating and has unsubscribe', () => {
    const e = buildReviewEmail(base, { reviewUrl: 'https://menius.app/buccaneer/review/abc', unsubscribeUrl: 'https://menius.app/api/unsubscribe?id=c1' });
    for (let r = 1; r <= 5; r++) expect(e.html).toContain(`review/abc?r=${r}`);
    expect(e.html).toContain('Unsubscribe');
  });

  it('escapes user text', () => {
    const e = buildReceiptEmail({ ...base, customerName: '<script>x</script>', items: [{ qty: 1, name: '<b>Pie</b>', lineTotal: 1 }] });
    expect(e.html).not.toContain('<script>x');
    expect(e.html).not.toContain('<b>Pie</b>');
  });

  it('helpers', () => {
    expect(shortOrderNumber('ORD-261110-014')).toBe('014');
    expect(cleanSenderName('Taquería "El, Güero"\n')).toBe('Taquería El Güero');
    expect(prettyPhone('+17184295188')).toBe('(718) 429-5188');
  });
});
