import { computeTaxAmount } from './tax-presets';

export interface PricedItem {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  extras: { extra_id: string; price: number }[];
  modifiers?: { option_id?: string | null; price_delta?: number }[];
}

export interface ProductRecord {
  id: string;
  price: number;
}
export interface VariantRecord {
  id: string;
  product_id: string;
  price_delta: number;
}
export interface ExtraRecord {
  id: string;
  product_id: string;
  price: number;
}
export interface ModOptionRecord {
  id: string;
  price_delta: number;
}

export interface UnitPriceResult {
  unitPrice: number;
  error?: string;
}

export function computeUnitPrice(
  item: PricedItem,
  productMap: Map<string, ProductRecord>,
  variantMap: Map<string, VariantRecord>,
  extraMap: Map<string, ExtraRecord>,
  modOptionMap: Map<string, ModOptionRecord>,
): UnitPriceResult {
  const dbProduct = productMap.get(item.product_id);
  if (!dbProduct) return { unitPrice: 0, error: 'product_not_found' };

  let unitPrice = Number(dbProduct.price);

  if (item.variant_id) {
    const v = variantMap.get(item.variant_id);
    if (!v || v.product_id !== item.product_id) return { unitPrice: 0, error: 'invalid_variant' };
    unitPrice += Number(v.price_delta);
  }

  for (const ex of item.extras) {
    const dbExtra = extraMap.get(ex.extra_id);
    if (!dbExtra || dbExtra.product_id !== item.product_id) return { unitPrice: 0, error: 'invalid_extra' };
    unitPrice += Number(dbExtra.price);
  }

  for (const mod of (item.modifiers ?? [])) {
    const oid = mod.option_id ?? '';
    const isLegacy = !oid || oid.startsWith('__legacy');
    if (!isLegacy) {
      const dbOpt = modOptionMap.get(oid);
      if (dbOpt) unitPrice += Number(dbOpt.price_delta);
      // unknown option_id → $0 (security: never trust client price)
    }
    // legacy → $0 (intentional)
  }

  return { unitPrice };
}

export interface OrderTotalsInput {
  items: Array<{ unit_price: number; qty: number }>;
  deliveryFee: number;
  isDelivery: boolean;
  rawTip: number;
  discountAmt: number;
  loyaltyDiscountAmt: number;
  taxRate: number;
  taxIncluded: boolean;
}

export interface OrderTotals {
  subtotal: number;
  tipAmt: number;
  deliveryFeeAmt: number;
  totalDiscountAmt: number;
  taxAmt: number;
  total: number;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = input.items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);

  // Tip clamped to 100% of subtotal
  const tipAmt = Math.min(Math.max(0, input.rawTip), subtotal);

  const deliveryFeeAmt = input.isDelivery ? input.deliveryFee : 0;

  const totalDiscountAmt = input.discountAmt + input.loyaltyDiscountAmt;
  const taxableBase = Math.max(0, subtotal - totalDiscountAmt);
  const taxAmt = computeTaxAmount(taxableBase, input.taxRate, input.taxIncluded);

  const total = Math.max(
    0,
    subtotal - totalDiscountAmt + tipAmt + deliveryFeeAmt + (input.taxIncluded ? 0 : taxAmt),
  );

  return { subtotal, tipAmt, deliveryFeeAmt, totalDiscountAmt, taxAmt, total };
}

export type CommissionPlanResult =
  | { allowed: true; commissionBps: number; isFreeTier: false }
  | { allowed: false; commissionBps: 0; isFreeTier: true };

export interface SubscriptionSnapshot {
  status: string;
  trial_end?: string | null;
  plan_id?: string | null;
}

export function resolveCommission(
  commissionPlan: boolean,
  sub: SubscriptionSnapshot | null,
  now: Date = new Date(),
): { commissionBps: number; isFreeTier: boolean } {
  if (commissionPlan) return { commissionBps: 400, isFreeTier: false };

  if (!sub) return { commissionBps: 0, isFreeTier: true };

  const { status } = sub;
  const trialStillValid = sub.trial_end && new Date(sub.trial_end) > now;

  if (status === 'active' || status === 'past_due') return { commissionBps: 0, isFreeTier: false };
  if (trialStillValid) return { commissionBps: 0, isFreeTier: false };

  return { commissionBps: 0, isFreeTier: true };
}
