import { describe, it, expect } from 'vitest';
import {
  signupSchema,
  loginSchema,
  createRestaurantSchema,
  publicOrderSchema,
  categorySchema,
  productSchema,
} from '@/lib/validations';

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({ full_name: 'Juan Garcia', email: 'juan@test.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = signupSchema.safeParse({ full_name: 'J', email: 'juan@test.com', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({ full_name: 'Juan', email: 'not-email', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = signupSchema.safeParse({ full_name: 'Juan', email: 'juan@test.com', password: '123' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: 'password' });
    expect(result.success).toBe(true);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@test.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('createRestaurantSchema', () => {
  it('accepts valid restaurant data', () => {
    const result = createRestaurantSchema.safeParse({ name: 'Mi Restaurante', slug: 'mi-restaurante' });
    expect(result.success).toBe(true);
  });

  it('rejects email as name', () => {
    const result = createRestaurantSchema.safeParse({ name: 'test@email.com', slug: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug characters', () => {
    const result = createRestaurantSchema.safeParse({ name: 'Test', slug: 'Mi Restaurante!' });
    expect(result.success).toBe(false);
  });

  it('rejects slug with uppercase', () => {
    const result = createRestaurantSchema.safeParse({ name: 'Test', slug: 'MiRest' });
    expect(result.success).toBe(false);
  });

  it('provides default timezone and currency', () => {
    const result = createRestaurantSchema.safeParse({ name: 'Test', slug: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('America/Mexico_City');
      expect(result.data.currency).toBe('MXN');
    }
  });
});

describe('categorySchema', () => {
  it('accepts valid category', () => {
    const result = categorySchema.safeParse({ name: 'Entradas' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = categorySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('provides defaults', () => {
    const result = categorySchema.safeParse({ name: 'Bebidas' });
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
      expect(result.data.is_active).toBe(true);
    }
  });
});

describe('productSchema', () => {
  it('accepts valid product', () => {
    const result = productSchema.safeParse({
      name: 'Hamburguesa',
      price: 12.99,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = productSchema.safeParse({
      name: 'Hamburguesa',
      price: -5,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category UUID', () => {
    const result = productSchema.safeParse({ name: 'Test', price: 10, category_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('publicOrderSchema', () => {
  const validOrder = {
    customer_name: 'Juan',
    customer_phone: '+18095551234',
    notes: '',
    items: [{
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      variant_id: null,
      qty: 2,
      unit_price: 10,
      line_total: 20,
      notes: '',
      extras: [],
    }],
  };

  it('accepts valid order', () => {
    const result = publicOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('rejects empty customer name', () => {
    const result = publicOrderSchema.safeParse({ ...validOrder, customer_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects short phone', () => {
    const result = publicOrderSchema.safeParse({ ...validOrder, customer_phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty items', () => {
    const result = publicOrderSchema.safeParse({ ...validOrder, items: [] });
    expect(result.success).toBe(false);
  });

  it('transforms undefined variant_id to null', () => {
    const order = { ...validOrder, items: [{ ...validOrder.items[0], variant_id: undefined }] };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].variant_id).toBeNull();
    }
  });

  it('transforms empty string variant_id to null', () => {
    const order = { ...validOrder, items: [{ ...validOrder.items[0], variant_id: '' }] };
    const result = publicOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].variant_id).toBeNull();
    }
  });
});
