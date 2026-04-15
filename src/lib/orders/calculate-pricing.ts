import { computeTaxAmount } from '@/lib/tax-presets';

export interface PricingContext {
  products: Array<{ id: string; name: string; price: number; in_stock: boolean }>;
  variants: Array<{ id: string; product_id: string; name: string; price_delta: number; sort_order: number }>;
  extras: Array<{ id: string; product_id: string; price: number }>;
  modGroups: Array<{ id: string; product_id: string; name: string; is_required: boolean; min_select: number; max_select: number }>;
  modOptions: Array<{ id: string; group_id: string; price_delta: number }>;
}

interface PricingMaps {
  products: Map<string, PricingContext['products'][number]>;
  variantsByProduct: Map<string, PricingContext['variants']>;
  variantsById: Map<string, PricingContext['variants'][number]>;
  extrasById: Map<string, PricingContext['extras'][number]>;
  extrasByProduct: Map<string, PricingContext['extras']>;
  modGroupsByProduct: Map<string, PricingContext['modGroups']>;
  modOptionsById: Map<string, PricingContext['modOptions'][number]>;
  modOptionsByGroup: Map<string, PricingContext['modOptions']>;
}

export function buildPricingMaps(ctx: PricingContext): PricingMaps {
  const products = new Map(ctx.products.map((p) => [p.id, p]));

  const variantsByProduct = new Map<string, PricingContext['variants']>();
  const variantsById = new Map<string, PricingContext['variants'][number]>();
  for (const v of ctx.variants) {
    variantsById.set(v.id, v);
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const extrasById = new Map<string, PricingContext['extras'][number]>();
  const extrasByProduct = new Map<string, PricingContext['extras']>();
  for (const e of ctx.extras) {
    extrasById.set(e.id, e);
    const list = extrasByProduct.get(e.product_id) ?? [];
    list.push(e);
    extrasByProduct.set(e.product_id, list);
  }

  const modGroupsByProduct = new Map<string, PricingContext['modGroups']>();
  for (const g of ctx.modGroups) {
    const list = modGroupsByProduct.get(g.product_id) ?? [];
    list.push(g);
    modGroupsByProduct.set(g.product_id, list);
  }

  const modOptionsById = new Map<string, PricingContext['modOptions'][number]>();
  const modOptionsByGroup = new Map<string, PricingContext['modOptions']>();
  for (const o of ctx.modOptions) {
    modOptionsById.set(o.id, o);
    const list = modOptionsByGroup.get(o.group_id) ?? [];
    list.push(o);
    modOptionsByGroup.set(o.group_id, list);
  }

  return { products, variantsByProduct, variantsById, extrasById, extrasByProduct, modGroupsByProduct, modOptionsById, modOptionsByGroup };
}

interface InputItem {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  unit_price: number;
  extras: Array<{ extra_id: string; price?: number }>;
  modifiers: Array<{ group_id: string; option_id: string }>;
  notes?: string;
}

interface PricedItem {
  product_id: string;
  variant_id: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
  notes?: string;
  modifiers: Array<{ group_id: string; option_id: string; name?: string; price_delta: number }>;
}

type ValidateResult =
  | { success: true; items: PricedItem[] }
  | { success: false; error: string };

export function validateAndPriceItems(items: InputItem[], maps: PricingMaps): ValidateResult {
  const pricedItems: PricedItem[] = [];

  for (const item of items) {
    const product = maps.products.get(item.product_id);
    if (!product) {
      return { success: false, error: `Producto no encontrado: ${item.product_id}` };
    }
    if (!product.in_stock) {
      return { success: false, error: `"${product.name}" está agotado` };
    }

    let unitPrice = Number(product.price);

    // Auto-assign first variant if product has variants but none provided
    let variantId = item.variant_id ?? null;
    const productVariants = maps.variantsByProduct.get(item.product_id);
    if (productVariants && productVariants.length > 0 && !variantId) {
      const sorted = [...productVariants].sort((a, b) => a.sort_order - b.sort_order);
      variantId = sorted[0].id;
    }

    // Add variant price delta
    if (variantId) {
      const variant = maps.variantsById.get(variantId);
      if (variant) unitPrice += Number(variant.price_delta);
    }

    // Add extras price (always from DB, never trust client)
    for (const extra of item.extras) {
      const dbExtra = maps.extrasById.get(extra.extra_id);
      if (dbExtra) unitPrice += Number(dbExtra.price);
    }

    // Validate required modifier groups
    const modGroups = maps.modGroupsByProduct.get(item.product_id) ?? [];
    const selectedByGroup = new Map<string, string[]>();
    for (const mod of item.modifiers) {
      const list = selectedByGroup.get(mod.group_id) ?? [];
      list.push(mod.option_id);
      selectedByGroup.set(mod.group_id, list);
    }

    for (const group of modGroups) {
      const selected = selectedByGroup.get(group.id) ?? [];
      if (group.is_required && selected.length < group.min_select) {
        return {
          success: false,
          error: `"${group.name}" requiere al menos ${group.min_select} opción${group.min_select !== 1 ? 'es' : ''}`,
        };
      }
      if (selected.length > group.max_select) {
        return {
          success: false,
          error: `"${group.name}" permite máximo ${group.max_select} opción${group.max_select !== 1 ? 'es' : ''}`,
        };
      }
    }

    // Add modifier price deltas
    const pricedModifiers: PricedItem['modifiers'] = [];
    for (const mod of item.modifiers) {
      const option = maps.modOptionsById.get(mod.option_id);
      if (option) {
        unitPrice += Number(option.price_delta);
        pricedModifiers.push({ group_id: mod.group_id, option_id: mod.option_id, price_delta: Number(option.price_delta) });
      }
    }

    const lineTotal = Math.round(unitPrice * item.qty * 100) / 100;
    pricedItems.push({
      product_id: item.product_id,
      variant_id: variantId,
      qty: item.qty,
      unit_price: Math.round(unitPrice * 100) / 100,
      line_total: lineTotal,
      notes: item.notes,
      modifiers: pricedModifiers,
    });
  }

  return { success: true, items: pricedItems };
}

interface TotalsInput {
  items: Array<{ line_total: number }>;
  orderType: string;
  serverDeliveryFee: number;
  rawTip: number;
  discountAmt: number;
  loyaltyDiscountAmt: number;
  taxRate: number;
  taxIncluded: boolean;
}

interface TotalsResult {
  subtotal: number;
  deliveryFeeAmt: number;
  tipAmt: number;
  taxAmt: number;
  total: number;
}

export function calculateTotals(params: TotalsInput): TotalsResult {
  const subtotal = params.items.reduce((s, i) => s + i.line_total, 0);
  const deliveryFeeAmt = params.orderType === 'delivery' ? params.serverDeliveryFee : 0;
  const tipAmt = Math.min(params.rawTip, subtotal);
  const totalDiscount = params.discountAmt + params.loyaltyDiscountAmt;
  const taxableBase = Math.max(0, subtotal - totalDiscount);
  const taxAmt = params.taxIncluded ? 0 : computeTaxAmount(taxableBase, params.taxRate, false);
  const total = Math.max(0, subtotal - totalDiscount + tipAmt + taxAmt + deliveryFeeAmt);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFeeAmt: Math.round(deliveryFeeAmt * 100) / 100,
    tipAmt: Math.round(tipAmt * 100) / 100,
    taxAmt: Math.round(taxAmt * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
