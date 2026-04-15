/**
 * Tests for server-side order creation logic.
 *
 * These tests exercise the pure calculation and state-machine functions
 * used in /api/orders without needing a database connection.
 * They cover the critical path: pricing, modifier validation, tax,
 * state transitions, and idempotency guard expectations.
 */

import { describe, it, expect } from 'vitest';
import { canTransition, VALID_TRANSITIONS, type OrderStatus } from '@/lib/order-state';
import { computeTaxAmount } from '@/lib/tax-presets';

// ─── Helpers that mirror the server-side pricing logic ────────────────────────
// These replicate the logic in api/orders/route.ts so we can test it in isolation.

type DbProduct = { id: string; name: string; price: number; in_stock: boolean };
type DbVariant = { id: string; product_id: string; name: string; price_delta: number };
type DbModOption = { id: string; group_id: string; price_delta: number };
type DbExtra   = { id: string; product_id: string; price: number };

type ClientModifier = {
  option_id?: string | null;
  group_id?: string | null;
  group_name?: string;
  option_name?: string;
  price_delta?: number;
};

type ClientItem = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  unit_price: number; // from client — will be overridden
  extras: { extra_id: string; price: number }[];
  modifiers?: ClientModifier[];
};

function computeServerUnitPrice(
  item: ClientItem,
  productMap: Map<string, DbProduct>,
  variantMap: Map<string, DbVariant>,
  extraMap: Map<string, DbExtra>,
  modOptionMap: Map<string, DbModOption>,
): number | null {
  const dbProduct = productMap.get(item.product_id);
  if (!dbProduct || !dbProduct.in_stock) return null;

  let price = dbProduct.price;

  if (item.variant_id) {
    const v = variantMap.get(item.variant_id);
    if (!v || v.product_id !== item.product_id) return null; // invalid variant
    price += v.price_delta;
  }

  for (const ex of item.extras) {
    const dbExtra = extraMap.get(ex.extra_id);
    if (!dbExtra || dbExtra.product_id !== item.product_id) return null; // invalid extra
    price += dbExtra.price;
  }

  for (const mod of (item.modifiers ?? [])) {
    const isLegacy = !mod.option_id || String(mod.option_id).startsWith('__legacy');
    if (isLegacy) {
      price += Number(mod.price_delta ?? 0);
    } else {
      const dbOpt = modOptionMap.get(mod.option_id!);
      if (dbOpt) {
        price += dbOpt.price_delta;
      }
      // unknown option_id → use $0 (do not trust client price_delta)
    }
  }

  return price;
}

// ─── Test data fixtures ───────────────────────────────────────────────────────

const PRODUCT_ID   = '11111111-1111-1111-1111-111111111111';
const VARIANT_ID   = '22222222-2222-2222-2222-222222222222';
const EXTRA_ID     = '33333333-3333-3333-3333-333333333333';
const MOD_OPT_ID   = '44444444-4444-4444-4444-444444444444';
const OTHER_PROD   = '55555555-5555-5555-5555-555555555555';

const baseProduct: DbProduct = { id: PRODUCT_ID, name: 'Hamburguesa', price: 100, in_stock: true };
const baseVariant: DbVariant = { id: VARIANT_ID, product_id: PRODUCT_ID, name: 'Grande', price_delta: 20 };
const baseExtra: DbExtra     = { id: EXTRA_ID, product_id: PRODUCT_ID, price: 15 };
const baseModOpt: DbModOption = { id: MOD_OPT_ID, group_id: 'grp-1', price_delta: 10 };

function makeMaps(overrides: {
  products?: DbProduct[];
  variants?: DbVariant[];
  extras?: DbExtra[];
  modOptions?: DbModOption[];
} = {}) {
  return {
    productMap:  new Map((overrides.products  ?? [baseProduct]).map((p) => [p.id, p])),
    variantMap:  new Map((overrides.variants  ?? [baseVariant]).map((v) => [v.id, v])),
    extraMap:    new Map((overrides.extras    ?? [baseExtra]).map((e) => [e.id, e])),
    modOptionMap:new Map((overrides.modOptions ?? [baseModOpt]).map((o) => [o.id, o])),
  };
}

// ─── Pricing tests ────────────────────────────────────────────────────────────

describe('Server-side unit price calculation', () => {
  it('returns base product price for a simple item', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 999, // client lies — should be ignored
      extras: [],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(100);
  });

  it('adds variant price_delta', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      variant_id: VARIANT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(120); // 100 + 20
  });

  it('adds extra price', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [{ extra_id: EXTRA_ID, price: 999 }], // client price ignored
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(115); // 100 + 15
  });

  it('adds modifier option price_delta from DB (ignores client price_delta)', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
      modifiers: [{ option_id: MOD_OPT_ID, price_delta: 999 }], // client sends 999, DB says 10
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(110); // 100 + 10
  });

  it('uses $0 for unknown modifier option_id — does NOT trust client price_delta', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
      modifiers: [{ option_id: 'aaaaaaaa-dead-beef-dead-beefdeadbeef', price_delta: 999 }],
    };
    // Unknown option → treated as $0
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(100);
  });

  it('adds legacy modifier price from client when option_id is __legacy', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
      modifiers: [{ option_id: '__legacy_size', price_delta: 5 }],
    };
    // Legacy path: trusts client price (no DB record)
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(105);
  });

  it('returns null for product not in productMap', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      qty: 1,
      unit_price: 0,
      extras: [],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBeNull();
  });

  it('returns null for out-of-stock product', () => {
    const outOfStock: DbProduct = { ...baseProduct, in_stock: false };
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps({ products: [outOfStock] });
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBeNull();
  });

  it('returns null for variant that belongs to a different product', () => {
    const wrongVariant: DbVariant = { ...baseVariant, product_id: OTHER_PROD };
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps({ variants: [wrongVariant] });
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      variant_id: VARIANT_ID,
      qty: 1,
      unit_price: 0,
      extras: [],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBeNull();
  });

  it('returns null for extra that belongs to a different product', () => {
    const wrongExtra: DbExtra = { ...baseExtra, product_id: OTHER_PROD };
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps({ extras: [wrongExtra] });
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      qty: 1,
      unit_price: 0,
      extras: [{ extra_id: EXTRA_ID, price: 0 }],
    };
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBeNull();
  });

  it('stacks variant + extra + modifier correctly', () => {
    const { productMap, variantMap, extraMap, modOptionMap } = makeMaps();
    const item: ClientItem = {
      product_id: PRODUCT_ID,
      variant_id: VARIANT_ID, // +20
      qty: 1,
      unit_price: 0,
      extras: [{ extra_id: EXTRA_ID, price: 0 }], // +15
      modifiers: [{ option_id: MOD_OPT_ID, price_delta: 0 }], // +10
    };
    // 100 + 20 + 15 + 10 = 145
    expect(computeServerUnitPrice(item, productMap, variantMap, extraMap, modOptionMap)).toBe(145);
  });
});

// ─── Tax calculation tests ────────────────────────────────────────────────────

describe('computeTaxAmount', () => {
  it('returns 0 when tax rate is 0', () => {
    expect(computeTaxAmount(100, 0, false)).toBe(0);
  });

  it('calculates exclusive tax correctly (e.g. Colombia 19%)', () => {
    // 100 * 0.19 = 19
    expect(computeTaxAmount(100, 19, false)).toBe(19);
  });

  it('calculates inclusive tax correctly (e.g. Mexico 16%)', () => {
    // tax = 100 - 100/1.16 ≈ 13.79
    const result = computeTaxAmount(100, 16, true);
    expect(result).toBeCloseTo(13.79, 1);
  });

  it('is additive with delivery fee and tip in totals', () => {
    const subtotal = 200;
    const taxAmt = computeTaxAmount(subtotal, 16, false); // 32
    const deliveryFee = 50;
    const tip = 20;
    const total = subtotal + taxAmt + deliveryFee + tip;
    expect(total).toBe(302);
  });
});

// ─── State machine tests ──────────────────────────────────────────────────────

describe('Order state machine — canTransition', () => {
  it('allows pending → confirmed', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
  });

  it('allows pending → preparing (skip confirmed for speed)', () => {
    expect(canTransition('pending', 'preparing')).toBe(true);
  });

  it('allows confirmed → preparing', () => {
    expect(canTransition('confirmed', 'preparing')).toBe(true);
  });

  it('allows preparing → ready', () => {
    expect(canTransition('preparing', 'ready')).toBe(true);
  });

  it('allows ready → delivered', () => {
    expect(canTransition('ready', 'delivered')).toBe(true);
  });

  it('allows cancellation from any active state', () => {
    const cancellable: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];
    for (const s of cancellable) {
      expect(canTransition(s, 'cancelled')).toBe(true);
    }
  });

  it('delivered is a terminal state — no further transitions allowed', () => {
    const allStatuses = Object.keys(VALID_TRANSITIONS) as OrderStatus[];
    for (const to of allStatuses) {
      expect(canTransition('delivered', to)).toBe(false);
    }
  });

  it('prevents cancelled → any other status', () => {
    const allStatuses = Object.keys(VALID_TRANSITIONS) as OrderStatus[];
    for (const to of allStatuses) {
      expect(canTransition('cancelled', to)).toBe(false);
    }
  });

  it('prevents going backwards: preparing → pending', () => {
    expect(canTransition('preparing', 'pending')).toBe(false);
  });

  it('prevents illegal jump: pending → delivered', () => {
    expect(canTransition('pending', 'delivered')).toBe(false);
  });

  it('returns false for unknown from-status', () => {
    expect(canTransition('ghost_status', 'pending')).toBe(false);
  });

  it('returns false for unknown to-status', () => {
    expect(canTransition('pending', 'ghost_status')).toBe(false);
  });
});

// ─── Idempotency key format ───────────────────────────────────────────────────

describe('Idempotency key format', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('crypto.randomUUID produces a valid UUIDv4', () => {
    const key = crypto.randomUUID();
    expect(key).toMatch(UUID_RE);
  });

  it('two consecutive UUIDs are different', () => {
    expect(crypto.randomUUID()).not.toBe(crypto.randomUUID());
  });
});
