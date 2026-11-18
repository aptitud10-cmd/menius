import { describe, it, expect } from 'vitest';
import { orderToTicketData } from '@/lib/printing/order-to-ticket';
import type { Order } from '@/types';

const order = {
  id: 'o1', restaurant_id: 'r', order_number: 'ORD-261118-007', status: 'preparing', order_type: 'delivery',
  customer_name: 'Maria G.', customer_phone: '+17185550123', payment_method: 'cash', payment_status: 'pending',
  total: 31.5, tax_amount: 2.5, delivery_fee: 0, tip_amount: 0, discount_amount: 0,
  delivery_address: '87-90 30th Ave', delivery_instructions: 'Bell 2', driver_tracking_token: 'tok-123',
  include_utensils: false, created_at: '2026-11-18T14:00:00Z', notes: 'peanut allergy',
  items: [{
    id: 'i1', order_id: 'o1', product_id: 'p', variant_id: null, qty: 2, unit_price: 14.5, line_total: 29, notes: '',
    product: { id: 'p', name: 'Bacon Cheeseburger' }, modifier_lines: [{ text: 'Medium', price: 0, indent: false }],
  }],
} as unknown as Order;

describe('orderToTicketData (Android v2 = mismo diseño que CloudPRNT)', () => {
  const { ticket, ticketText } = orderToTicketData(order, {
    restaurantName: 'Buccaneer Diner', currency: 'USD', locale: 'en', appUrl: 'https://menius.app', timeZone: 'America/New_York',
  });

  it('número corto, pago y QR del repartidor', () => {
    expect(ticket.shortNumber).toBe('007');
    expect(ticket.payment.kind).toBe('collect_cash');
    expect(ticketText.payment).toBe('COLLECT $31.50 CASH');
    expect(ticket.delivery?.driverUrl).toBe('https://menius.app/driver/track/tok-123');
    expect(ticket.allergy).toBeTruthy();
  });

  it('ítems con sus líneas y sin "—" en los textos para ESC/POS', () => {
    expect(ticket.items[0]).toMatchObject({ qty: 2, name: 'Bacon Cheeseburger', lineTotal: 29 });
    expect(ticket.items[0].lines[0].text).toBe('Medium');
    expect(ticketText.itemCount).toBe('2 items');
    expect(ticketText.channelLine).toBe('WEBSITE · DELIVERY');
  });

  it('sin slug no inventa una URL de "Order direct"', () => {
    expect(ticket.restaurant.orderDirectUrl).toBe('');
  });

  it('con el slug del Counter sale "Order direct: menius.app/buccaneer"', () => {
    const withSlug = orderToTicketData(order, {
      restaurantName: 'Buccaneer Diner', currency: 'USD', locale: 'en', appUrl: 'https://menius.app', timeZone: 'America/New_York', slug: 'buccaneer',
    });
    expect(withSlug.ticket.restaurant.orderDirectUrl).toBe('menius.app/buccaneer');
  });
});
