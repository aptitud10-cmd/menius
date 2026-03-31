export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardContext } from '@/lib/get-dashboard-context';

// POST — add a product to an existing order
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const orderId = params.id;
    const { product_id, qty = 1, notes } = await req.json();

    if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

    // Verify order belongs to this restaurant and is editable
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, total, restaurant_id')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot modify a completed order' }, { status: 400 });
    }

    // Fetch product price
    const { data: product } = await supabase
      .from('products')
      .select('id, name, price, in_stock, image_url')
      .eq('id', product_id)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.in_stock === false) return NextResponse.json({ error: 'Product is out of stock' }, { status: 400 });

    const unitPrice = Number(product.price);
    const lineTotal = unitPrice * qty;

    const { data: newItem, error: insertErr } = await supabase
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

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Recalculate order total
    const { data: allItems } = await supabase
      .from('order_items')
      .select('line_total')
      .eq('order_id', orderId);

    const newSubtotal = (allItems ?? []).reduce((s, i) => s + Number(i.line_total), 0);
    await supabase
      .from('orders')
      .update({ total: newSubtotal })
      .eq('id', orderId);

    return NextResponse.json({
      item: { ...newItem, product: { id: product.id, name: product.name, image_url: product.image_url } },
      newTotal: newSubtotal,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — remove an order_item from an existing order
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, restaurantId } = await getDashboardContext();
    const orderId = params.id;
    const { item_id } = await req.json();

    if (!item_id) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

    // Verify order belongs to this restaurant
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot modify a completed order' }, { status: 400 });
    }

    // Must keep at least 1 item
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId);

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last item. Cancel the order instead.' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('order_items')
      .delete()
      .eq('id', item_id)
      .eq('order_id', orderId);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Recalculate total
    const { data: allItems } = await supabase
      .from('order_items')
      .select('line_total')
      .eq('order_id', orderId);

    const newTotal = (allItems ?? []).reduce((s, i) => s + Number(i.line_total), 0);
    await supabase.from('orders').update({ total: newTotal }).eq('id', orderId);

    return NextResponse.json({ success: true, newTotal });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
