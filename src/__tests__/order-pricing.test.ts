import { describe, it, expect } from 'vitest';
import {
  computeUnitPrice,
  canonicalizeModifiers,
  computeOrderTotals,
  resolveCommission,
  computeApplicationFeeCents,
  internationalCardSurchargeCents,
  feeModelFor,
  tipAllowedFor,
  tipOptions,
  customTipAmount,
  utensilsRequested,
  type ProductRecord,
  type VariantRecord,
  type ExtraRecord,
  type ModOptionRecord,
} from '@/lib/order-pricing';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROD_A: ProductRecord = { id: 'prod-a', price: 100 };

const VAR_L: VariantRecord = { id: 'var-l', product_id: 'prod-a', price_delta: 20 };
const VAR_S: VariantRecord = { id: 'var-s', product_id: 'prod-a', price_delta: 0 };

const EXTRA_QUESO: ExtraRecord = { id: 'ex-queso', product_id: 'prod-a', price: 15 };
const EXTRA_TOCINO: ExtraRecord = { id: 'ex-tocino', product_id: 'prod-a', price: 10 };

const MOD_PICANTE: ModOptionRecord = { id: 'opt-picante', price_delta: 5 };
const MOD_GRATIS: ModOptionRecord = { id: 'opt-gratis', price_delta: 0 };
/** A cheaper option inside a container product — Buccaneer's Seltzer Water sits
 *  at -$1.10 inside a $3.55 "Assorted Sodas" item. */
const MOD_BARATO: ModOptionRecord = { id: 'opt-barato', price_delta: -30 };
/** Absurd negative delta, e.g. a data-entry slip in the dashboard. */
const MOD_ABSURDO: ModOptionRecord = { id: 'opt-absurdo', price_delta: -500 };

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

  it('applies a negative modifier delta', () => {
    // Legitimate: a cheaper choice inside a container product.
    const result = computeUnitPrice(
      { product_id: 'prod-a', qty: 1, extras: [], modifiers: [{ option_id: 'opt-barato' }] },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      makeModMap(MOD_BARATO),
    );
    expect(result.unitPrice).toBe(70); // 100 - 30
  });

  it('never lets a negative delta drive the price below zero', () => {
    // price_delta has no CHECK constraint in the DB, so a bad dashboard entry
    // could otherwise turn an order line into a credit.
    const result = computeUnitPrice(
      { product_id: 'prod-a', qty: 1, extras: [], modifiers: [{ option_id: 'opt-absurdo' }] },
      makeProductMap(PROD_A),
      emptyVariants,
      emptyExtras,
      makeModMap(MOD_ABSURDO),
    );
    expect(result.unitPrice).toBe(0); // 100 - 500, clamped
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

// ── utensilsRequested: NYC "Skip the Stuff" — sin cubiertos salvo pedido ──────

describe('utensilsRequested', () => {
  it('solo `true` explícito pide cubiertos', () => {
    expect(utensilsRequested(true)).toBe(true);
  });

  it('campo ausente, false, null o basura: sin cubiertos', () => {
    expect(utensilsRequested(undefined)).toBe(false);
    expect(utensilsRequested(false)).toBe(false);
    expect(utensilsRequested(null)).toBe(false);
    expect(utensilsRequested('true')).toBe(false);
    expect(utensilsRequested(1)).toBe(false);
  });

  it('ningún camino del server vuelve al default "sí" (guarda de regresión)', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    for (const r of ['src/app/api/orders/route.ts', 'src/lib/orders/validate-order.ts']) {
      const src = fs.readFileSync(path.join(process.cwd(), r), 'utf8');
      expect(src, `${r} no puede asumir cubiertos por defecto`).not.toMatch(/include_utensils\s*!==\s*false/);
    }
  });
});

// ── tipOptions: botones de propina en dólares redondos ───────────────────────

describe('tipOptions', () => {
  const amounts = (s: number) => tipOptions(s).map((o) => o.amount);
  const pcts = (s: number) => tipOptions(s).map((o) => o.pct);

  it('subtotal < $10: $1 / $2 / $3', () => {
    expect(amounts(8)).toEqual([1, 2, 3]);
    expect(pcts(8)).toEqual([13, 25, 38]);
  });

  it('pedido típico de Buccaneer ($17.95): $2 / $3 / $4', () => {
    expect(amounts(17.95)).toEqual([2, 3, 4]);
    expect(pcts(17.95)).toEqual([11, 17, 22]);
  });

  it('$44.40: $5 / $7 / $9', () => {
    expect(amounts(44.4)).toEqual([5, 7, 9]);
    expect(pcts(44.4)).toEqual([11, 16, 20]);
  });

  it('$80: $8 / $12 / $16 (10/15/20 exactos)', () => {
    expect(amounts(80)).toEqual([8, 12, 16]);
    expect(pcts(80)).toEqual([10, 15, 20]);
  });

  it('$30: el 10% es $3, no $4 (sin error de coma flotante)', () => {
    expect(amounts(30)[0]).toBe(3);
  });

  it('$10 justo: $1 / $2 / $3, siempre crecientes', () => {
    expect(amounts(10)).toEqual([1, 2, 3]);
  });

  it('la primera opción siempre es ≥ 10% del subtotal (NYC LL 107/108)', () => {
    for (let s = 10; s <= 300; s += 0.37) {
      const [a] = tipOptions(s);
      expect(a.amount * 100, `subtotal ${s}`).toBeGreaterThanOrEqual(Math.round(s * 100) / 10 - 1e-9);
    }
  });

  it('montos enteros y estrictamente crecientes', () => {
    for (let s = 0; s <= 300; s += 1.13) {
      const [a, b, c] = amounts(s);
      expect(Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c)).toBe(true);
      expect(a < b && b < c, `subtotal ${s}`).toBe(true);
    }
  });

  it('subtotal 0, negativo o NaN: $1 / $2 / $3 con 0%', () => {
    expect(tipOptions(0)).toEqual([{ amount: 1, pct: 0 }, { amount: 2, pct: 0 }, { amount: 3, pct: 0 }]);
    expect(amounts(-5)).toEqual([1, 2, 3]);
    expect(amounts(Number.NaN)).toEqual([1, 2, 3]);
  });
});

describe('customTipAmount', () => {
  it('monto en dólares', () => {
    expect(customTipAmount(5, '$', 40)).toBe(5);
    expect(customTipAmount(2.5, '$', 40)).toBe(2.5);
  });

  it('porcentaje sobre el subtotal, redondeado al centavo', () => {
    expect(customTipAmount(18, '%', 17.95)).toBe(3.23);
  });

  it('nunca mayor al subtotal (el server la recorta igual)', () => {
    expect(customTipAmount(100, '$', 40)).toBe(40);
    expect(customTipAmount(150, '%', 40)).toBe(40);
  });

  it('vacío, cero, negativo o NaN: 0', () => {
    expect(customTipAmount(0, '$', 40)).toBe(0);
    expect(customTipAmount(-3, '$', 40)).toBe(0);
    expect(customTipAmount(Number.NaN, '%', 40)).toBe(0);
    expect(customTipAmount(5, '$', 0)).toBe(0);
  });
});

// ── computeApplicationFeeCents ────────────────────────────────────────────────

describe('computeApplicationFeeCents', () => {
  it('planes de suscripción en USD: traslada el procesamiento de Stripe (2.9% + 30¢)', () => {
    // $30.00 → 87¢ + 30¢
    expect(computeApplicationFeeCents(3000, 0, 'usd', 0)).toBe(117);
    expect(computeApplicationFeeCents(3000, 0, 'USD', 0)).toBe(117);
  });

  it('planes de suscripción: el restaurante paga el Stripe de TODO, propina incluida (MENIUS en $0)', () => {
    // $20 comida + $3 propina = $23 → Stripe le cobra a MENIUS 2.9% de 2300 + 30 = 97
    expect(computeApplicationFeeCents(2300, 300, 'usd', 0)).toBe(97);
    expect(computeApplicationFeeCents(2300, 300, 'usd', 0)).toBe(computeApplicationFeeCents(2300, 0, 'usd', 0));
  });

  it('commission_plan: la comisión nunca se calcula sobre la propina (NY §196-d)', () => {
    // $50 + $5 propina → 4% de 5000 (200) + solo el 2.9% de procesamiento de la propina (15)
    expect(computeApplicationFeeCents(5500, 500, 'usd', 400)).toBe(215);
    expect(computeApplicationFeeCents(3000, 0, 'usd', 400)).toBe(120);
  });

  it('propina inválida (negativa, NaN) o mayor al total: no rompe la cuenta', () => {
    expect(computeApplicationFeeCents(3000, -100, 'usd', 400)).toBe(120);
    expect(computeApplicationFeeCents(3000, Number.NaN, 'usd', 400)).toBe(120);
    expect(computeApplicationFeeCents(300, 500, 'usd', 400)).toBe(9);
  });

  it('otras monedas sin comisión: 0 (no hay tabla de tarifas por país)', () => {
    expect(computeApplicationFeeCents(30000, 0, 'mxn', 0)).toBe(0);
  });

  it('nunca supera el monto cobrado', () => {
    expect(computeApplicationFeeCents(20, 0, 'usd', 0)).toBe(20);
  });

  it('monto cero o negativo: 0', () => {
    expect(computeApplicationFeeCents(0, 0, 'usd', 0)).toBe(0);
    expect(computeApplicationFeeCents(-100, 0, 'usd', 400)).toBe(0);
  });

  it('las 3 rutas que cobran pasan la propina por separado (guarda de regresión)', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const routes = [
      'src/app/api/orders/route.ts',
      'src/app/api/payments/intent/route.ts',
      'src/app/api/payments/checkout/route.ts',
    ];
    for (const r of routes) {
      const src = fs.readFileSync(path.join(process.cwd(), r), 'utf8');
      const calls = src.match(/computeApplicationFeeCents\([^;]*;/g) ?? [];
      expect(calls.length, `${r} debería calcular el application fee`).toBeGreaterThan(0);
      for (const c of calls) expect(c, `${r}: tiene que pasar la propina`).toMatch(/tip/i);
    }
  });
});

// ── internationalCardSurchargeCents ───────────────────────────────────────────

describe('internationalCardSurchargeCents', () => {
  it('tarjeta extranjera en USD con passthrough: 1.5%', () => {
    expect(internationalCardSurchargeCents(3000, 'usd', 'MX', 'passthrough')).toBe(45);
    expect(internationalCardSurchargeCents(3000, 'USD', 'gb', 'passthrough')).toBe(45);
  });

  it('tarjeta de EE.UU. o sin país: 0', () => {
    expect(internationalCardSurchargeCents(3000, 'usd', 'US', 'passthrough')).toBe(0);
    expect(internationalCardSurchargeCents(3000, 'usd', null, 'passthrough')).toBe(0);
  });

  it('commission_plan, otra moneda o pagos viejos sin fee_model: 0', () => {
    expect(internationalCardSurchargeCents(3000, 'usd', 'MX', 'commission')).toBe(0);
    expect(internationalCardSurchargeCents(3000, 'mxn', 'US', 'passthrough')).toBe(0);
    expect(internationalCardSurchargeCents(3000, 'usd', 'MX', undefined)).toBe(0);
  });

  it('feeModelFor: 4% es commission, 0% es passthrough', () => {
    expect(feeModelFor(400)).toBe('commission');
    expect(feeModelFor(0)).toBe('passthrough');
  });
});

describe('canonicalizeModifiers', () => {
  const groups = [
    { id: 'g-sauce', name: 'Sauces on the Side' },
    { id: 'g-extra', name: 'Extra Sauce' },
  ];
  const opts = new Map([
    ['o-ranch', { id: 'o-ranch', group_id: 'g-sauce', name: 'Ranch', price_delta: 0 }],
    ['o-xbbq', { id: 'o-xbbq', group_id: 'g-extra', name: 'BBQ', price_delta: '0.75' }],
    // Opción real, pero de un grupo de OTRO producto
    ['o-large', { id: 'o-large', group_id: 'g-other-product', name: 'Large', price_delta: 3 }],
  ]);

  it('keeps real options with DB names and prices, ignoring client names', () => {
    const r = canonicalizeModifiers(
      [{ option_id: 'o-xbbq', option_name: 'FREE', group_name: 'whatever', price_delta: 0 } as never],
      groups,
      opts,
    );
    expect(r.dropped).toBe(0);
    expect(r.modifiers).toEqual([
      { group_id: 'g-extra', group_name: 'Extra Sauce', option_id: 'o-xbbq', option_name: 'BBQ', price_delta: 0.75 },
    ]);
  });

  it('drops legacy, unknown, foreign-product and duplicate options', () => {
    const r = canonicalizeModifiers(
      [
        { option_id: '__legacy1' },
        { option_id: 'nope' },
        { option_id: 'o-large' },
        { option_id: 'o-ranch' },
        { option_id: 'o-ranch' },
        { option_id: '' },
      ],
      groups,
      opts,
    );
    expect(r.modifiers.map((m) => m.option_id)).toEqual(['o-ranch']);
    expect(r.dropped).toBe(5);
  });
});

describe('tipAllowedFor', () => {
  it('propina solo si se cobra con tarjeta; en efectivo se da en mano', () => {
    expect(tipAllowedFor('online')).toBe(true);
    expect(tipAllowedFor('wallet')).toBe(true);
    expect(tipAllowedFor('cash')).toBe(false);
    expect(tipAllowedFor(null)).toBe(false);
    expect(tipAllowedFor(undefined)).toBe(false);
  });
});
