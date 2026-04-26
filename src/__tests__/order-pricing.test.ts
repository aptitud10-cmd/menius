import { describe, it, expect } from 'vitest';
import {
  computeUnitPrice,
  computeOrderTotals,
  resolveCommission,
  type ProductRecord,
  type VariantRecord,
  type ExtraRecord,
  type ModOptionRecord,
} from '@/lib/order-pricing';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROD_A: ProductRecord = { id: 'prod-a', price: 100 };
const PROD_B: ProductRecord = { id: 'prod-b', price: 50 };

const VAR_L: VariantRecord = { id: 'var-l', product_id: 'prod-a', price_delta: 20 };
const VAR_S: VariantRecord = { id: 'var-s', product_id: 'prod-a', price_delta: 0 };

const EXTRA_QUESO: ExtraRecord = { id: 'ex-queso', product_id: 'prod-a', price: 15 };
const EXTRA_TOCINO: ExtraRecord = { id: 'ex-tocino', product_id: 'prod-a', price: 10 };

const MOD_PICANTE: ModOptionRecord = { id: 'opt-picante', price_delta: 5 };
const MOD_GRATIS: ModOptionRecord = { id: 'opt-gratis', price_delta: 0 };

function makeProductMap(...products: ProductRecord[]) {
  return new Map(products.map((p) => [p.id, p]));
}
function makeVariantMap(...variants: VariantRecord[]) {
  return new Map(variants.map((v) => [v.id, v]));
}
function makeExtraMap(...extras: ExtraRecord[]) {
  return new Map(extras.map((e) => [e.id, e]));
}
function makeModMap(...opts: ModOptionRecord[]) {
  return new Map(opts.map((o) => [o.id, o]));
}

const emptyVariants = new Map<string, VariantRecord>();
const emptyExtras = new Map<string, ExtraRecord>();
const emptyMods = new Map<string, ModOptionRecord>();

// ── computeUnitPrice ──────────────────────────────────────────────────────────

describe('computeUnitPrice', () => {
  it('returns base product price with no extras or modifiers', () => {
    const result = computeUnitPrice(
      { product_id: 'prod-a', qty: 1, extras: [] },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      emptyMods,
    );
    expect(result.error).toBeUndefined();
    expect(result.unitPrice).toBe(100);
  });

  it('adds variant price_delta', () => {
    const result = computeUnitPrice(
      { product_id: 'prod-a', variant_id: 'var-l', qty: 1, extras: [] },
      makeProductMap(PROD_A),
      makeVariantMap(VAR_L),
      emptyExtras,
      emptyMods,
    );
    expect(result.unitPrice).toBe(120); // 100 + 20
  });

  it('variant with zero delta does not change price', () => {
    const result = computeUnitPrice(
      { product_id: 'prod-a', variant_id: 'var-s', qty: 1, extras: [] },
      makeProductMap(PROD_A),
      makeVariantMap(VAR_S),
      emptyExtras,
      emptyMods,
    );
    expect(result.unitPrice).toBe(100);
  });

  it('adds multiple extras', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', qty: 1,
        extras: [{ extra_id: 'ex-queso', price: 0 }, { extra_id: 'ex-tocino', price: 0 }],
      },
      makeProductMap(PROD_A),
      emptyVariants,
      makeExtraMap(EXTRA_QUESO, EXTRA_TOCINO),
      emptyMods,
    );
    expect(result.unitPrice).toBe(125); // 100 + 15 + 10
  });

  it('adds modifier price_delta from DB (ignores client value)', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', qty: 1, extras: [],
        modifiers: [{ option_id: 'opt-picante', price_delta: 999 }], // client sends wrong price
      },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      makeModMap(MOD_PICANTE),
    );
    expect(result.unitPrice).toBe(105); // 100 + 5 (DB value, not 999)
  });

  it('modifier with zero price_delta does not change price', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', qty: 1, extras: [],
        modifiers: [{ option_id: 'opt-gratis', price_delta: 50 }],
      },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      makeModMap(MOD_GRATIS),
    );
    expect(result.unitPrice).toBe(100);
  });

  it('legacy modifier (option_id starts with __legacy) uses $0', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', qty: 1, extras: [],
        modifiers: [{ option_id: '__legacy-extra-picante', price_delta: 30 }],
      },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      emptyMods,
    );
    expect(result.unitPrice).toBe(100); // legacy → $0, not $30
  });

  it('unknown option_id (deleted from DB) uses $0, not client price', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', qty: 1, extras: [],
        modifiers: [{ option_id: 'opt-doesnt-exist', price_delta: 50 }],
      },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      emptyMods, // opt-doesnt-exist not in map
    );
    expect(result.unitPrice).toBe(100); // unknown → $0
  });

  it('combines variant + extra + modifier', () => {
    const result = computeUnitPrice(
      {
        product_id: 'prod-a', variant_id: 'var-l', qty: 1,
        extras: [{ extra_id: 'ex-queso', price: 0 }],
        modifiers: [{ option_id: 'opt-picante', price_delta: 0 }],
      },
      makeProductMap(PROD_A),
      makeVariantMap(VAR_L),
      makeExtraMap(EXTRA_QUESO),
      makeModMap(MOD_PICANTE),
    );
    expect(result.unitPrice).toBe(140); // 100 + 20 + 15 + 5
  });

  it('returns error when product not found', () => {
    const result = computeUnitPrice(
      { product_id: 'prod-z', qty: 1, extras: [] },
      makeProductMap(PROD_A),
      emptyVariants, emptyExtras, emptyMods,
    );
    expect(result.error).toBe('product_not_found');
  });

  it('returns error when variant belongs to different product', () => {
    const wrongVariant: VariantRecord = { id: 'var-l', product_id: 'prod-b', price_delta: 20 };
    const result = computeUnitPrice(
      { product_id: 'prod-a', variant_id: 'var-l', qty: 1, extras: [] },
      makeProductMap(PROD_A),
      makeVariantMap(wrongVariant),
      emptyExtras, emptyMods,
    );
    expect(result.error).toBe('invalid_variant');
  });

  it('returns error when extra belongs to different product', () => {
    const wrongExtra: ExtraRecord = { id: 'ex-queso', product_id: 'prod-b', price: 15 };
    const result = computeUnitPrice(
      { product_id: 'prod-a', qty: 1, extras: [{ extra_id: 'ex-queso', price: 0 }] },
      makeProductMap(PROD_A),
      emptyVariants,
      makeExtraMap(wrongExtra),
      emptyMods,
    );
    expect(result.error).toBe('invalid_extra');
  });
});

// ── computeOrderTotals ────────────────────────────────────────────────────────

describe('computeOrderTotals', () => {
  const baseItems = [{ unit_price: 100, qty: 2 }, { unit_price: 50, qty: 1 }]; // subtotal = 250

  it('computes subtotal correctly', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.subtotal).toBe(250);
  });

  it('adds delivery fee only for delivery orders', () => {
    const delivery = computeOrderTotals({ items: baseItems, deliveryFee: 30, isDelivery: true, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    const pickup = computeOrderTotals({ items: baseItems, deliveryFee: 30, isDelivery: false, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(delivery.deliveryFeeAmt).toBe(30);
    expect(delivery.total).toBe(280);
    expect(pickup.deliveryFeeAmt).toBe(0);
    expect(pickup.total).toBe(250);
  });

  it('clamps tip to 100% of subtotal', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: 999, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.tipAmt).toBe(250); // clamped to subtotal
    expect(r.total).toBe(500);  // subtotal + tip (= subtotal * 2)
  });

  it('rejects negative tip (clamps to 0)', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: -50, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.tipAmt).toBe(0);
  });

  it('applies discount correctly', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 50, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.totalDiscountAmt).toBe(50);
    expect(r.total).toBe(200);
  });

  it('combines promo + loyalty discounts', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 30, loyaltyDiscountAmt: 20, taxRate: 0, taxIncluded: false });
    expect(r.totalDiscountAmt).toBe(50);
    expect(r.total).toBe(200);
  });

  it('adds tax when not included (taxIncluded=false)', () => {
    const r = computeOrderTotals({ items: [{ unit_price: 100, qty: 1 }], deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 16, taxIncluded: false });
    expect(r.taxAmt).toBe(16);
    expect(r.total).toBe(116);
  });

  it('does not add tax to total when tax is included in price', () => {
    const r = computeOrderTotals({ items: [{ unit_price: 116, qty: 1 }], deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 16, taxIncluded: true });
    expect(r.taxAmt).toBeCloseTo(16, 1); // tax extracted from price
    expect(r.total).toBe(116);           // total unchanged — tax is already inside
  });

  it('total is never negative even with large discount', () => {
    const r = computeOrderTotals({ items: [{ unit_price: 10, qty: 1 }], deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 1000, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.total).toBe(0);
  });

  it('zero tip allowed', () => {
    const r = computeOrderTotals({ items: baseItems, deliveryFee: 0, isDelivery: false, rawTip: 0, discountAmt: 0, loyaltyDiscountAmt: 0, taxRate: 0, taxIncluded: false });
    expect(r.tipAmt).toBe(0);
  });

  it('full order: subtotal + variant + extra + tip + delivery + tax', () => {
    // 1 item: price 100, variant +20, extra +15 → unit_price = 135, qty = 2 → subtotal = 270
    const r = computeOrderTotals({
      items: [{ unit_price: 135, qty: 2 }],
      deliveryFee: 30, isDelivery: true,
      rawTip: 27,       // 10% of subtotal
      discountAmt: 0, loyaltyDiscountAmt: 0,
      taxRate: 16, taxIncluded: false,
    });
    expect(r.subtotal).toBe(270);
    expect(r.tipAmt).toBe(27);
    expect(r.deliveryFeeAmt).toBe(30);
    expect(r.taxAmt).toBeCloseTo(43.2, 1); // 270 * 0.16
    expect(r.total).toBeCloseTo(370.2, 1); // 270 + 27 + 30 + 43.2
  });
});

// ── resolveCommission ─────────────────────────────────────────────────────────

describe('resolveCommission', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  it('commission_plan=true → 4% (400 bps), not free tier', () => {
    const r = resolveCommission(true, null, now);
    expect(r.commissionBps).toBe(400);
    expect(r.isFreeTier).toBe(false);
  });

  it('no subscription → free tier', () => {
    const r = resolveCommission(false, null, now);
    expect(r.isFreeTier).toBe(true);
    expect(r.commissionBps).toBe(0);
  });

  it('active subscription → 0% commission, not free tier', () => {
    const r = resolveCommission(false, { status: 'active' }, now);
    expect(r.commissionBps).toBe(0);
    expect(r.isFreeTier).toBe(false);
  });

  it('past_due subscription → 0% commission, not free tier', () => {
    const r = resolveCommission(false, { status: 'past_due' }, now);
    expect(r.commissionBps).toBe(0);
    expect(r.isFreeTier).toBe(false);
  });

  it('valid trial → 0% commission, not free tier', () => {
    const trialEnd = '2024-06-20T00:00:00Z'; // future
    const r = resolveCommission(false, { status: 'trialing', trial_end: trialEnd }, now);
    expect(r.commissionBps).toBe(0);
    expect(r.isFreeTier).toBe(false);
  });

  it('expired trial → free tier', () => {
    const trialEnd = '2024-06-10T00:00:00Z'; // past
    const r = resolveCommission(false, { status: 'trialing', trial_end: trialEnd }, now);
    expect(r.isFreeTier).toBe(true);
  });

  it('cancelled subscription with no trial → free tier', () => {
    const r = resolveCommission(false, { status: 'cancelled', trial_end: null }, now);
    expect(r.isFreeTier).toBe(true);
  });

  it('commission_plan takes priority over subscription status', () => {
    // Even with no subscription, commission_plan=true means 4%
    const r = resolveCommission(true, null, now);
    expect(r.commissionBps).toBe(400);
    expect(r.isFreeTier).toBe(false);
  });

  it('free tier blocks online payments (integration guard)', () => {
    const { isFreeTier } = resolveCommission(false, null, now);
    // The route uses isFreeTier to block payment_method='online'
    expect(isFreeTier).toBe(true);
  });
});
