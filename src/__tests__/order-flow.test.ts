import { describe, it, expect } from 'vitest';
import { publicOrderSchema } from '@/lib/validations';

const validItem = {
  product_id: '123e4567-e89b-12d3-a456-426614174000',
  variant_id: null,
  qty: 1,
  unit_price: 10,
  line_total: 10,
  notes: '',
  extras: [],
  modifiers: [],
};

const validOrder = {
  customer_name: 'Juan Pérez',
  customer_phone: '+18095551234',
  notes: '',
  items: [validItem],
};

describe('Order Flow — publicOrderSchema', () => {
  it('accepts a minimal valid order', () => {
    const result = publicOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('accepts order with multiple items', () => {
    const order = {
      ...validOrder,
      items: [
        { ...validItem, qty: 2, line_total: 20 },
        { ...validItem, product_id: '223e4567-e89b-12d3-a456-426614174000', qty: 1, line_total: 15, unit_price: 15 },
      ],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
    }
  });

  it('accepts order with extras', () => {
    const order = {
      ...validOrder,
      items: [{
        ...validItem,
        extras: [
          { extra_id: '323e4567-e89b-12d3-a456-426614174000', price: 2.5 },
          { extra_id: '423e4567-e89b-12d3-a456-426614174000', price: 1.0 },
        ],
      }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].extras).toHaveLength(2);
    }
  });

  it('accepts order with modifiers', () => {
    const order = {
      ...validOrder,
      items: [{
        ...validItem,
        modifiers: [
          {
            group_id: 'grp-1',
            group_name: 'Tamaño',
            option_id: 'opt-1',
            option_name: 'Grande',
            price_delta: 3,
          },
          {
            group_id: 'grp-2',
            group_name: 'Salsa',
            option_id: 'opt-2',
            option_name: 'Picante',
            price_delta: 0,
          },
        ],
      }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].modifiers).toHaveLength(2);
      expect(result.data.items[0].modifiers[0].price_delta).toBe(3);
    }
  });

  it('accepts order with variant', () => {
    const order = {
      ...validOrder,
      items: [{
        ...validItem,
        variant_id: '523e4567-e89b-12d3-a456-426614174000',
      }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].variant_id).toBe('523e4567-e89b-12d3-a456-426614174000');
    }
  });

  it('accepts order with notes on item and order level', () => {
    const order = {
      ...validOrder,
      notes: 'Mesa cerca de la ventana',
      items: [{ ...validItem, notes: 'Sin cebolla' }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('Mesa cerca de la ventana');
      expect(result.data.items[0].notes).toBe('Sin cebolla');
    }
  });

  it('rejects qty of 0', () => {
    const order = {
      ...validOrder,
      items: [{ ...validItem, qty: 0 }],
    };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects negative qty', () => {
    const order = {
      ...validOrder,
      items: [{ ...validItem, qty: -1 }],
    };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects invalid product_id (not UUID)', () => {
    const order = {
      ...validOrder,
      items: [{ ...validItem, product_id: 'not-a-uuid' }],
    };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects invalid extra_id (not UUID)', () => {
    const order = {
      ...validOrder,
      items: [{
        ...validItem,
        extras: [{ extra_id: 'bad', price: 1 }],
      }],
    };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects missing customer_name', () => {
    const order = { ...validOrder, customer_name: '' };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects missing customer_phone', () => {
    const order = { ...validOrder, customer_phone: '' };
    expect(publicOrderSchema.safeParse(order).success).toBe(false);
  });

  it('rejects order with no items array', () => {
    const { items, ...noItems } = validOrder;
    expect(publicOrderSchema.safeParse(noItems).success).toBe(false);
  });

  it('defaults extras to empty array when not provided', () => {
    const order = {
      ...validOrder,
      items: [{
        product_id: validItem.product_id,
        variant_id: null,
        qty: 1,
        unit_price: 10,
        line_total: 10,
        notes: '',
      }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].extras).toEqual([]);
    }
  });

  it('defaults modifiers to empty array when not provided', () => {
    const order = {
      ...validOrder,
      items: [{
        product_id: validItem.product_id,
        variant_id: null,
        qty: 1,
        unit_price: 10,
        line_total: 10,
        notes: '',
      }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].modifiers).toEqual([]);
    }
  });

  it('coerces undefined notes to empty string', () => {
    const order = {
      customer_name: 'Test',
      customer_phone: '+18095551234',
      items: [validItem],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('');
    }
  });
});

describe('Order Flow — price integrity', () => {
  it('line_total should match qty * unit_price for simple items', () => {
    const qty = 3;
    const unitPrice = 12.5;
    const lineTotal = qty * unitPrice;

    const order = {
      ...validOrder,
      items: [{ ...validItem, qty, unit_price: unitPrice, line_total: lineTotal }],
    };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].line_total).toBe(37.5);
    }
  });

  it('total order value can be computed from items', () => {
    const items = [
      { ...validItem, qty: 2, unit_price: 10, line_total: 20 },
      { ...validItem, product_id: '223e4567-e89b-12d3-a456-426614174000', qty: 1, unit_price: 15, line_total: 15 },
    ];
    const order = { ...validOrder, items };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      const total = result.data.items.reduce((s, i) => s + i.line_total, 0);
      expect(total).toBe(35);
    }
  });
});
