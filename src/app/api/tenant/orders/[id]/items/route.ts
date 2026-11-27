export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeTaxAmount } from '@/lib/tax-presets';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('tenant-order-items');

/**
 * Total e impuesto del pedido después de agregar o quitar un plato, con la misma
 * cuenta que /api/orders (order-pricing.ts). Antes se reusaba el tax_amount viejo:
 * un plato de $10 subía el total $10 justos, y con impuesto incluido en el precio
 * se sumaba igual (auditoría Counter 2026-11-21, §2.3).
 * discount_amount ya trae promo + lealtad juntos (loyalty_discount es solo el desglose).
 */
async function recalcOrderTotals(supabase: SupabaseClient, orderId: string, restaurantId: string) {
  const [{ data: allItems }, { data: fees }, { data: rest }] = await Promise.all([
    supabase.from('order_items').select('line_total').eq('order_id', orderId),
    supabase
      .from('orders')
      .select('tip_amount, delivery_fee, discount_amount')
      .eq('id', orderId)
      .maybeSingle(),
    supabase.from('restaurants').select('tax_rate, tax_included').eq('id', restaurantId).maybeSingle(),
  ]);
  const subtotal = (allItems ?? []).reduce((s, i) => s + Number(i.line_total), 0);
  const discount = Number(fees?.discount_amount ?? 0);
  const tip = Number(fees?.tip_amount ?? 0);
  const deliveryFee = Number(fees?.delivery_fee ?? 0);
  const taxIncluded = rest?.tax_included ?? false;
  const base = Math.max(0, subtotal - discount);
  const tax = computeTaxAmount(base, Number(rest?.tax_rate) || 0, taxIncluded);
  const total = Math.round(Math.max(0, base + tip + deliveryFee + (taxIncluded ? 0 : tax)) * 100) / 100;
  // Con service role: la base no deja que una tablet cambie montos del pedido
  // (migración 20261128). El pedido ya se verificó del restaurante arriba.
  const { error } = await createAdminClient()
    .from('orders')
    .update({ total, tax_amount: tax })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);
  // No se lanza: el plato ya se agregó/quitó. Con un error acá la tablet decía "Error",
  // reintentaban y el plato quedaba doble. Se registra y el sondeo trae el total real.
  if (error) {
    logger.error('recalc total failed', { orderId, error: error.message });
    captureError(new Error(error.message), { route: 'tenant/orders/items', orderId });
  }
  return { total, tax };
}

// POST — add a product to an existing order
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { supabase, restaurantId } = await getDashboardContext(true);
    const orderId = params.id;
    const { product_id, qty = 1, notes } = await req.json();

    if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    // Entero 1..99: una cantidad negativa bajaba el total del pedido.
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return NextResponse.json({ error: 'qty must be an integer between 1 and 99' }, { status: 400 });
    }

    // Verify order belongs to this restaurant and is editable
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, total, restaurant_id, payment_method, payment_status')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot modify a completed order' }, { status: 400 });
    }
    // Pagado online: cambiar platos cambiaba el total sin cobrar ni devolver la
    // diferencia (y sin recalcular el impuesto). Se cancela/reembolsa y se rehace.
    if (order.payment_status === 'paid' && ['online', 'wallet'].includes(String(order.payment_method))) {
      return NextResponse.json({ error: 'This order was paid online and cannot be edited. Refund it and create a new one.' }, { status: 409 });
    }

    // Fetch product price
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, in_stock, is_active, image_url')
      .eq('id', product_id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.is_active === false) return NextResponse.json({ error: 'This item is not on the menu' }, { status: 400 });
    if (product.in_stock === false) return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 });
    // Con preguntas obligatorias (cocción, acompañamiento…) entraba "pelado" y la
    // cocina recibía un Steak sin punto ni guarnición. Desde acá no se pueden elegir.
    const { count: requiredGroups } = await supabase
      .from('modifier_groups')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)
      .or('is_required.eq.true,min_select.gt.0')
      .is('depends_on_option_id', null)
      .is('depends_on_option_ids', null);
    if ((requiredGroups ?? 0) > 0) {
      return NextResponse.json(
        { error: `${product.name} has required choices (cooking, sides…) and can't be added here.` },
        { status: 409 },
      );
    }

    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * qty;

    // order_items is read-only for owners (RLS): the write goes through the
    // admin client, only after checking above that the order and the product
    // belong to this restaurant.
    const { data: newItem, error: insertErr } = await createAdminClient()
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id,
        qty,
        unit_price: unitPrice,
        line_total: lineTotal,
        notes: notes || null,
      })
      .select('id, product_id, qty, unit_price, line_total, notes')
      .single();

    if (insertErr) {
      logger.error('add item failed', { orderId, error: insertErr.message });
      captureError(new Error(insertErr.message), { route: 'tenant/orders/items', orderId });
      return NextResponse.json({ error: 'Could not add the item. Try again.' }, { status: 500 });
    }

    const { total, tax } = await recalcOrderTotals(supabase, orderId, restaurantId);

    return NextResponse.json({
      item: { ...newItem, product: { id: product.id, name: product.name, image_url: product.image_url } },
      newTotal: total,
      newTax: tax,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — remove an order_item from an existing order
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { supabase, restaurantId } = await getDashboardContext(true);
    const orderId = params.id;
    const { item_id } = await req.json();

    if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

    // Verify order belongs to this restaurant
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, payment_method, payment_status')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot modify a completed order' }, { status: 400 });
    }
    // Pagado online: cambiar platos cambiaba el total sin cobrar ni devolver la
    // diferencia (y sin recalcular el impuesto). Se cancela/reembolsa y se rehace.
    if (order.payment_status === 'paid' && ['online', 'wallet'].includes(String(order.payment_method))) {
      return NextResponse.json({ error: 'This order was paid online and cannot be edited. Refund it and create a new one.' }, { status: 409 });
    }

    // Must keep at least 1 item
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last item. Cancel the order instead.' }, { status: 400 });
    }

    // Same as POST: admin client after the ownership check above. Counted, so
    // an id from another order is a 404 instead of a silent "success".
    const { error: delErr, count: deleted } = await createAdminClient()
      .from('order_items')
      .delete({ count: 'exact' })
      .eq('id', item_id)
      .eq('order_id', orderId);

    if (delErr) {
      logger.error('remove item failed', { orderId, error: delErr.message });
      captureError(new Error(delErr.message), { route: 'tenant/orders/items', orderId });
      return NextResponse.json({ error: 'Could not remove the item. Try again.' }, { status: 500 });
    }
    if (!deleted) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const { total, tax } = await recalcOrderTotals(supabase, orderId, restaurantId);

    return NextResponse.json({ success: true, newTotal: total, newTax: tax });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
