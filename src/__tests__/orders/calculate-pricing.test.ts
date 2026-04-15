/**
 * P1: Unit tests for order pricing logic
 * 
 * WHAT: Tests the most critical business logic — price calculation.
 * WHY:  The order route has ZERO unit tests. Any price bug = revenue loss.
 * 
 * RUN:  vitest run src/__tests__/orders/calculate-pricing.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildPricingMaps, validateAndPriceItems, calculateTotals } from '@/lib/orders/calculate-pricing';
import type { PricingContext } from '@/lib/orders/calculate-pricing';

const baseProduct = {
  id: 'prod-1', name: 'Tacos', price: 10.00, in_stock: true,
};

const baseVariant = {
  id: 'var-1', product_id: 'prod-1', name: 'Grande', price_delta: 3.00, sort_order: 0,
};

const baseExtra = {
  id: 'ext-1', product_id: 'prod-1', price: 1.50,
};

const baseModGroup = {
  id: 'grp-1', product_id: 'prod-1', name: 'Salsa',
  is_required: true, min_select: 1, max_select: 3,
};

const baseModOption = {
  id: 'opt-1', group_id: 'grp-1', price_delta: 0.50,
};

function makeContext(overrides?: Partial<PricingContext>): PricingContext {
  return {
    products: [baseProduct],
    variants: [],
    extras: [],
    modGroups: [],
    modOptions: [],
    ...overrides,
  };
}

describe('calculateTotals', () => {
  it('calculates basic subtotal correctly', () => {
    const result = calculateTotals({
      items: [{ line_total: 10 }, { line_total: 15 }],
      orderType: 'dine_in',
      serverDeliveryFee: 5,
      rawTip: 0,
      discountAmt: 0,
      loyaltyDiscountAmt: 0,
      taxRate: 0,
      taxIncluded: false,
    });
    expect(result.subtotal).toBe(25);
    expect(result.total).toBe(25);
    expect(result.deliveryFeeAmt).toBe(0);
  });

  it('adds delivery fee only for delivery orders', () => {
    const result = calculateTotals({
      items: [{ line_total: 20 }],
      orderType: 'delivery',
      serverDeliveryFee: 5,
      rawTip: 0,
      discountAmt: 0,
      loyaltyDiscountAmt: 0,
      taxRate: 0,
      taxIncluded: false,
    });
    expect(result.deliveryFeeAmt).toBe(5);
    expect(result.total).toBe(25);
  });

  it('clamps tip to 100% of subtotal', () => {
    const result = calculateTotals({
      items: [{ line_total: 10 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 500,
      discountAmt: 0,
      loyaltyDiscountAmt: 0,
      taxRate: 0,
      taxIncluded: false,
    });
    expect(result.tipAmt).toBe(10);
  });

  it('calculates tax correctly when not included', () => {
    const result = calculateTotals({
      items: [{ line_total: 100 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 0,
      discountAmt: 0,
      loyaltyDiscountAmt: 0,
      taxRate: 16,
      taxIncluded: false,
    });
    expect(result.taxAmt).toBe(16);
    expect(result.total).toBe(116);
  });

  it('does not add tax to total when included', () => {
    const result = calculateTotals({
      items: [{ line_total: 100 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 0,
      discountAmt: 0,
      loyaltyDiscountAmt: 0,
      taxRate: 16,
      taxIncluded: true,
    });
    expect(result.total).toBe(100);
  });

  it('applies discount before calculating tax', () => {
    const result = calculateTotals({
      items: [{ line_total: 100 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 0,
      discountAmt: 20,
      loyaltyDiscountAmt: 0,
      taxRate: 10,
      taxIncluded: false,
    });
    expect(result.taxAmt).toBe(8);
    expect(result.total).toBe(88);
  });

  it('handles combined loyalty + promo discount', () => {
    const result = calculateTotals({
      items: [{ line_total: 100 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 5,
      discountAmt: 10,
      loyaltyDiscountAmt: 15,
      taxRate: 0,
      taxIncluded: false,
    });
    expect(result.total).toBe(80);
  });

  it('total never goes below 0', () => {
    const result = calculateTotals({
      items: [{ line_total: 10 }],
      orderType: 'dine_in',
      serverDeliveryFee: 0,
      rawTip: 0,
      discountAmt: 50,
      loyaltyDiscountAmt: 0,
      taxRate: 0,
      taxIncluded: false,
    });
    expect(result.total).toBe(0);
  });
});

describe('validateAndPriceItems', () => {
  it('rejects item with unknown product', () => {
    const ctx = makeContext();
    const maps = buildPricingMaps(ctx);
    const result = validateAndPriceItems(
      [{ product_id: 'unknown', qty: 1, unit_price: 10, extras: [], modifiers: [] }],
      maps
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('no encontrado');
  });

  it('rejects out-of-stock product', () => {
    const ctx = makeContext({ products: [{ ...baseProduct, in_stock: false }] });
    const maps = buildPricingMaps(ctx);
    const result = validateAndPriceItems(
      [{ product_id: 'prod-1', qty: 1, unit_price: 10, extras: [], modifiers: [] }],
      maps
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('agotado');
  });

  it('recalculates unit_price from DB (ignores client price)', () => {
    const ctx = makeContext();
    const maps = buildPricingMaps(ctx);
    const items = [{ product_id: 'prod-1', qty: 2, unit_price: 999, extras: [], modifiers: [] }];
    const result = validateAndPriceItems(items, maps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items[0].unit_price).toBe(10.00);
      expect(result.items[0].line_total).toBe(20.00);
    }
  });

  it('adds variant price_delta correctly', () => {
    const ctx = makeContext({ variants: [baseVariant] });
    const maps = buildPricingMaps(ctx);
    const items = [{
      product_id: 'prod-1', variant_id: 'var-1', qty: 1, unit_price: 0, extras: [], modifiers: [],
    }];
    const result = validateAndPriceItems(items, maps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items[0].unit_price).toBe(13.00);
    }
  });

  it('adds extra price correctly', () => {
    const ctx = makeContext({ extras: [baseExtra] });
    const maps = buildPricingMaps(ctx);
    const items = [{
      product_id: 'prod-1', qty: 1, unit_price: 0,
      extras: [{ extra_id: 'ext-1', price: 999 }],
      modifiers: [],
    }];
    const result = validateAndPriceItems(items, maps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items[0].unit_price).toBe(11.50);
    }
  });

  it('validates required modifier groups', () => {
    const ctx = makeContext({
      modGroups: [baseModGroup],
      modOptions: [baseModOption],
    });
    const maps = buildPricingMaps(ctx);
    const items = [{
      product_id: 'prod-1', qty: 1, unit_price: 0, extras: [], modifiers: [],
    }];
    const result = validateAndPriceItems(items, maps);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('al menos 1');
  });

  it('auto-assigns first variant when product requires one but client sends none', () => {
    const ctx = makeContext({ variants: [baseVariant] });
    const maps = buildPricingMaps(ctx);
    const items = [{
      product_id: 'prod-1', qty: 1, unit_price: 0, extras: [], modifiers: [],
    }];
    const result = validateAndPriceItems(items, maps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items[0].variant_id).toBe('var-1');
      expect(result.items[0].unit_price).toBe(13.00);
    }
  });
});
