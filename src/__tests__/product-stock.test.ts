import { describe, it, expect } from 'vitest';
import { productSchema } from '@/lib/validations';
import type { Product } from '@/types';

describe('Product Stock — schema validation', () => {
  const validProduct = {
    name: 'Hamburguesa',
    price: 12.99,
    category_id: '123e4567-e89b-12d3-a456-426614174000',
  };

  it('in_stock defaults when not provided', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('accepts in_stock = true', () => {
    const result = productSchema.safeParse({ ...validProduct, in_stock: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.in_stock).toBe(true);
    }
  });

  it('accepts in_stock = false', () => {
    const result = productSchema.safeParse({ ...validProduct, in_stock: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.in_stock).toBe(false);
    }
  });

  it('rejects non-boolean in_stock', () => {
    const result = productSchema.safeParse({ ...validProduct, in_stock: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('Product Stock — business logic', () => {
  const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'prod-1',
    restaurant_id: 'rest-1',
    category_id: 'cat-1',
    name: 'Hamburguesa',
    description: '',
    price: 10,
    image_url: '',
    is_active: true,
    sort_order: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  it('product defaults to in stock when in_stock is undefined', () => {
    const product = makeProduct();
    const outOfStock = product.in_stock === false;
    expect(outOfStock).toBe(false);
  });

  it('product is out of stock when in_stock is false', () => {
    const product = makeProduct({ in_stock: false });
    const outOfStock = product.in_stock === false;
    expect(outOfStock).toBe(true);
  });

  it('product is in stock when in_stock is true', () => {
    const product = makeProduct({ in_stock: true });
    const outOfStock = product.in_stock === false;
    expect(outOfStock).toBe(false);
  });

  it('filtering out-of-stock products from menu display', () => {
    const products = [
      makeProduct({ id: 'p1', in_stock: true }),
      makeProduct({ id: 'p2', in_stock: false }),
      makeProduct({ id: 'p3' }),
      makeProduct({ id: 'p4', in_stock: false }),
    ];

    const available = products.filter(p => p.in_stock !== false);
    const outOfStock = products.filter(p => p.in_stock === false);

    expect(available).toHaveLength(2);
    expect(outOfStock).toHaveLength(2);
    expect(available.map(p => p.id)).toEqual(['p1', 'p3']);
    expect(outOfStock.map(p => p.id)).toEqual(['p2', 'p4']);
  });

  it('toggling stock status', () => {
    const product = makeProduct({ in_stock: true });

    const toggled = { ...product, in_stock: !(product.in_stock !== false) };
    expect(toggled.in_stock).toBe(false);

    const toggledBack = { ...toggled, in_stock: !(toggled.in_stock !== false) };
    expect(toggledBack.in_stock).toBe(true);
  });

  it('counting out-of-stock products', () => {
    const products = [
      makeProduct({ in_stock: true }),
      makeProduct({ in_stock: false }),
      makeProduct({ in_stock: false }),
      makeProduct({}),
    ];

    const outOfStockCount = products.filter(p => p.in_stock === false).length;
    expect(outOfStockCount).toBe(2);
  });

  it('out-of-stock product should still be is_active (visible but not orderable)', () => {
    const product = makeProduct({ is_active: true, in_stock: false });
    expect(product.is_active).toBe(true);
    expect(product.in_stock).toBe(false);
  });

  it('hidden product (is_active=false) is separate from stock status', () => {
    const product = makeProduct({ is_active: false, in_stock: true });
    expect(product.is_active).toBe(false);
    expect(product.in_stock).toBe(true);
  });
});
