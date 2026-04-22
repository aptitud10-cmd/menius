export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { computeTaxAmount } from '@/lib/tax-presets';
import { z } from 'zod';

const quoteItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  qty: z.number().int().min(1).max(99),
  extras: z.array(z.object({ extra_id: z.string().uuid() })).default([]),
  modifiers: z.array(z.object({
    group_id: z.string(),
    option_id: z.string(),
  })).default([]),
});

const quoteSchema = z.object({
  restaurant_id: z.string().uuid(),
  order_type: z.enum(['dine_in', 'pickup', 'delivery']).default('dine_in'),
  items: z.array(quoteItemSchema).min(1).max(50),
  promo_code: z.string().max(50).optional(),
  loyalty_account_id: z.string().uuid().nullable().optional(),
  loyalty_points_redeemed: z.number().min(0).default(0),
  tip_amount: z.number().min(0).max(1000).default(0),
});

export interface CartQuoteResponse {
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  loyalty_discount: number;
  tip_amount: number;
  tax_amount: number;
  tax_included: boolean;
  tax_rate: number;
  tax_label: string;
  total: number;
  currency: string;
  items: Array<{
    product_id: string;
    unit_price: number;
    line_total: number;
    qty: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { restaurant_id, order_type, items, promo_code, loyalty_account_id, loyalty_points_redeemed, tip_amount } = parsed.data;

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, delivery_fee, currency, tax_rate, tax_included, tax_label')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const productIds = items.map((i) => i.product_id);
    // Only fetch the specific modifier option IDs sent by the client — avoids loading the full
    // modifier tree (which can be 1000+ rows) when only a handful are actually in the cart.
    const requestedOptionIds = items
      .flatMap((i) => i.modifiers.map((m) => m.option_id))
      .filter((id) => id && !id.startsWith('__legacy'));

    const [{ data: dbProducts }, { data: dbVariants }, { data: dbExtras }, { data: dbModOptions }] = await Promise.all([
      supabase.from('products').select('id, price, in_stock').in('id', productIds).eq('restaurant_id', restaurant_id),
      supabase.from('product_variants').select('id, product_id, price_delta').in('product_id', productIds),
      supabase.from('product_extras').select('id, product_id, price').in('product_id', productIds),
      requestedOptionIds.length > 0
        ? supabase.from('modifier_options').select('id, price_delta').in('id', requestedOptionIds)
        : Promise.resolve({ data: [] as { id: string; price_delta: number }[] }),
    ]);

    const productMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));
    const variantMap = new Map((dbVariants ?? []).map((v) => [v.id, v]));
    const extraMap = new Map((dbExtras ?? []).map((e) => [e.id, e]));
    const modOptionMap = new Map((dbModOptions ?? []).map((o) => [o.id, o]));

    const quotedItems: CartQuoteResponse['items'] = [];

    for (const item of items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) continue;

      let unitPrice = Number(dbProduct.price);

      if (item.variant_id) {
        const v = variantMap.get(item.variant_id);
        if (v && (v as { product_id: string }).product_id === item.product_id) {
          unitPrice += Number(v.price_delta);
        }
      }

      for (const ex of item.extras) {
        const dbExtra = extraMap.get(ex.extra_id);
        if (dbExtra && (dbExtra as { product_id: string }).product_id === item.product_id) {
          unitPrice += Number(dbExtra.price);
        }
      }

      for (const mod of item.modifiers) {
        const isLegacy = !mod.option_id || mod.option_id.startsWith('__legacy');
        if (!isLegacy) {
          const dbOpt = modOptionMap.get(mod.option_id);
          if (dbOpt) unitPrice += Number(dbOpt.price_delta);
        }
      }

      quotedItems.push({
        product_id: item.product_id,
        unit_price: unitPrice,
        line_total: unitPrice * item.qty,
        qty: item.qty,
      });
    }

    const subtotal = quotedItems.reduce((sum, i) => sum + i.line_total, 0);
    const serverDeliveryFee = Number(restaurant.delivery_fee) || 0;
    const deliveryFeeAmt = order_type === 'delivery' ? serverDeliveryFee : 0;
    const rawTip = Math.max(0, Number(tip_amount) || 0);
    const tipAmt = Math.min(rawTip, subtotal);

    let discountAmt = 0;
    if (promo_code?.trim()) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('discount_type, discount_value, min_order, expires_at, max_uses, current_uses, is_active')
        .eq('restaurant_id', restaurant_id)
        .eq('code', promo_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (
        promo &&
        !(promo.expires_at && new Date(promo.expires_at) < new Date()) &&
        !(promo.max_uses && promo.current_uses >= promo.max_uses) &&
        !(promo.min_order && subtotal < Number(promo.min_order))
      ) {
        discountAmt = promo.discount_type === 'percentage'
          ? subtotal * (Number(promo.discount_value) / 100)
          : Number(promo.discount_value);
        discountAmt = Math.min(discountAmt, subtotal);
      }
    }

    let loyaltyDiscountAmt = 0;
    if (loyalty_points_redeemed > 0 && loyalty_account_id) {
      const { data: loyaltyConfig } = await supabase
        .from('loyalty_config')
        .select('enabled, min_redeem_points, peso_per_point')
        .eq('restaurant_id', restaurant_id)
        .maybeSingle();

      if (loyaltyConfig?.enabled) {
        const { data: account } = await supabase
          .from('loyalty_accounts')
          .select('points')
          .eq('id', loyalty_account_id)
          .eq('restaurant_id', restaurant_id)
          .maybeSingle();

        if (account && account.points >= loyaltyConfig.min_redeem_points) {
          const pointsToRedeem = Math.min(loyalty_points_redeemed, account.points);
          loyaltyDiscountAmt = Math.min(
            Math.floor(pointsToRedeem * loyaltyConfig.peso_per_point * 100) / 100,
            subtotal - discountAmt
          );
        }
      }
    }

    const taxRate = Number(restaurant.tax_rate) || 0;
    const taxIncluded = (restaurant.tax_included as boolean | null) ?? false;
    const taxLabel = (restaurant.tax_label as string | null) ?? 'Tax';
    const totalDiscountAmt = discountAmt + loyaltyDiscountAmt;
    const taxableBase = Math.max(0, subtotal - totalDiscountAmt);
    const taxAmt = computeTaxAmount(taxableBase, taxRate, taxIncluded);
    const total = Math.max(0, subtotal - totalDiscountAmt + tipAmt + deliveryFeeAmt + (taxIncluded ? 0 : taxAmt));

    const response: CartQuoteResponse = {
      subtotal,
      delivery_fee: deliveryFeeAmt,
      discount_amount: discountAmt,
      loyalty_discount: loyaltyDiscountAmt,
      tip_amount: tipAmt,
      tax_amount: taxAmt,
      tax_included: taxIncluded,
      tax_rate: taxRate,
      tax_label: taxLabel,
      total,
      currency: (restaurant.currency as string | null) || 'MXN',
      items: quotedItems,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
