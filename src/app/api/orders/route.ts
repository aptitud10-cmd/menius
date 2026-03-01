export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { publicOrderSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/notifications/order-notifications';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

const logger = createLogger('orders');

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(`order:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();

    // Sanitize all user-facing text inputs
    const restaurant_id = body.restaurant_id;
    const customer_name = sanitizeText(body.customer_name, 100);
    const customer_email = sanitizeEmail(body.customer_email);
    const customer_phone = sanitizeText(body.customer_phone, 20);
    const notes = sanitizeMultiline(body.notes, 500);
    const items = body.items;
    const promo_code = sanitizeText(body.promo_code, 50);
    const discount_amount = body.discount_amount;
    const order_type = sanitizeText(body.order_type, 20);
    const payment_method = sanitizeText(body.payment_method, 20);
    const delivery_address = sanitizeMultiline(body.delivery_address, 300);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!restaurant_id || (!String(restaurant_id).startsWith('demo') && !UUID_RE.test(String(restaurant_id)))) {
      return NextResponse.json({ error: 'restaurant_id inválido' }, { status: 400 });
    }

    if (String(restaurant_id).startsWith('demo')) {
      if (!customer_name || !customer_phone) {
        return NextResponse.json({ error: 'Nombre y teléfono requeridos' }, { status: 400 });
      }
      const demoNum = `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return NextResponse.json({ order_id: `demo-order-${Date.now()}`, order_number: demoNum });
    }

    const parsed = publicOrderSchema.safeParse({
      customer_name, customer_phone, customer_email, order_type, payment_method, notes, items,
      tip_amount: body.tip_amount !== undefined ? Number(body.tip_amount) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug, delivery_fee')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const productIds = parsed.data.items.map((i) => i.product_id);

    const [{ data: dbProducts }, { data: dbVariants }, { data: dbExtras }, { data: dbModGroups }] = await Promise.all([
      supabase.from('products').select('id, price, in_stock').in('id', productIds).eq('restaurant_id', restaurant_id),
      supabase.from('product_variants').select('id, product_id, price_delta').in('product_id', productIds),
      supabase.from('product_extras').select('id, product_id, price').in('product_id', productIds),
      supabase.from('modifier_groups').select('id, product_id, name, is_required, min_select, max_select').in('product_id', productIds),
    ]);

    const modGroupIds = (dbModGroups ?? []).map((g) => g.id);
    const { data: dbModOptions } = modGroupIds.length > 0
      ? await supabase.from('modifier_options').select('id, group_id, price_delta').in('group_id', modGroupIds)
      : { data: [] };

    const productMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));
    const variantMap = new Map((dbVariants ?? []).map((v) => [v.id, v]));
    const extraMap = new Map((dbExtras ?? []).map((e) => [e.id, e]));
    const modOptionMap = new Map((dbModOptions ?? []).map((o) => [o.id, o]));
    const productsRequiringVariant = new Set((dbVariants ?? []).map((v) => v.product_id));

    const modGroupsByProduct = new Map<string, typeof dbModGroups>();
    for (const g of dbModGroups ?? []) {
      const list = modGroupsByProduct.get(g.product_id) ?? [];
      list.push(g);
      modGroupsByProduct.set(g.product_id, list);
    }

    for (const item of parsed.data.items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ error: 'Producto no encontrado o no pertenece a este restaurante.' }, { status: 400 });
      }
      if (dbProduct.in_stock === false) {
        return NextResponse.json({ error: 'Uno de los productos está agotado.' }, { status: 400 });
      }
      if (productsRequiringVariant.has(item.product_id) && !item.variant_id) {
        return NextResponse.json(
          { error: 'Selecciona una variante para todos los productos que lo requieran.' },
          { status: 400 }
        );
      }

      let expectedUnitPrice = Number(dbProduct.price);
      if (item.variant_id) {
        const v = variantMap.get(item.variant_id);
        if (!v || v.product_id !== item.product_id) {
          return NextResponse.json({ error: 'Variante inválida.' }, { status: 400 });
        }
        expectedUnitPrice += Number(v.price_delta);
      }
      for (const ex of item.extras) {
        const dbExtra = extraMap.get(ex.extra_id);
        if (!dbExtra || dbExtra.product_id !== item.product_id) {
          return NextResponse.json({ error: 'Extra inválido.' }, { status: 400 });
        }
        expectedUnitPrice += Number(dbExtra.price);
      }
      for (const mod of (item.modifiers ?? [])) {
        const isLegacy = !mod.option_id || String(mod.option_id).startsWith('__legacy');
        if (isLegacy) {
          expectedUnitPrice += Number(mod.price_delta);
        } else {
          const dbOpt = modOptionMap.get(mod.option_id);
          if (!dbOpt) {
            return NextResponse.json({ error: 'Opción de modificador inválida.' }, { status: 400 });
          }
          expectedUnitPrice += Number(dbOpt.price_delta);
        }
      }

      const groups = modGroupsByProduct.get(item.product_id) ?? [];
      for (const grp of groups) {
        if (!grp.is_required) continue;
        const selected = (item.modifiers ?? []).filter((m: any) => m.group_name === grp.name).length;
        if (selected < grp.min_select) {
          return NextResponse.json({ error: `Selecciona al menos ${grp.min_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
        if (grp.max_select > 0 && selected > grp.max_select) {
          return NextResponse.json({ error: `Máximo ${grp.max_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
      }

      const tolerance = 0.02;
      if (Math.abs(item.unit_price - expectedUnitPrice) > tolerance) {
        logger.warn('Price mismatch', { product: item.product_id, sent: item.unit_price, expected: expectedUnitPrice });
        item.unit_price = expectedUnitPrice;
        item.line_total = expectedUnitPrice * item.qty;
      }

      const expectedLineTotal = item.unit_price * item.qty;
      if (Math.abs(item.line_total - expectedLineTotal) > tolerance) {
        item.line_total = expectedLineTotal;
      }
    }

    const { data: orderNum } = await supabase.rpc('generate_order_number', { rest_id: restaurant_id });
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}`;

    const tipAmt = Math.max(0, Number(parsed.data.tip_amount) || 0);
    const serverDeliveryFee = Number(restaurant.delivery_fee) || 0;
    const deliveryFeeAmt = parsed.data.order_type === 'delivery' ? serverDeliveryFee : 0;
    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.line_total, 0);

    let discountAmt = 0;
    if (promo_code) {
      const { data: promo } = await supabase
        .from('promotions')
        .select('discount_type, discount_value, min_order, expires_at, max_uses, current_uses, is_active')
        .eq('restaurant_id', restaurant_id)
        .eq('code', promo_code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (promo && !(promo.expires_at && new Date(promo.expires_at) < new Date()) && !(promo.max_uses && promo.current_uses >= promo.max_uses) && !(promo.min_order && subtotal < Number(promo.min_order))) {
        discountAmt = promo.discount_type === 'percentage'
          ? subtotal * (Number(promo.discount_value) / 100)
          : Number(promo.discount_value);
        discountAmt = Math.min(discountAmt, subtotal);
      }
    }

    const total = Math.max(0, subtotal - discountAmt + tipAmt + deliveryFeeAmt);

    const orderInsert: Record<string, any> = {
      restaurant_id,
      order_number: orderNumber,
      customer_name: parsed.data.customer_name,
      customer_email: customer_email || null,
      customer_phone: parsed.data.customer_phone || null,
      notes: parsed.data.notes,
      total,
      status: 'pending',
      order_type: parsed.data.order_type,
      payment_method: parsed.data.payment_method,
      delivery_address: delivery_address || null,
      promo_code: promo_code || '',
      discount_amount: discountAmt,
    };
    if (tipAmt > 0) orderInsert.tip_amount = tipAmt;
    if (deliveryFeeAmt > 0) orderInsert.delivery_fee = deliveryFeeAmt;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(
        parsed.data.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: item.notes,
        }))
      )
      .select('id');

    if (itemsError) {
      logger.error('order_items insert failed', { error: itemsError.message });
      const { error: rollbackErr } = await supabase.from('orders').delete().eq('id', order.id);
      if (rollbackErr) logger.error('rollback delete failed', { order_id: order.id, error: rollbackErr.message });
      return NextResponse.json({ error: 'Error guardando items' }, { status: 500 });
    }

    const orderedItems = insertedItems ?? [];
    const extrasToInsert: any[] = [];
    const modifiersToInsert: any[] = [];

    parsed.data.items.forEach((item, idx) => {
      const orderItemId = orderedItems[idx]?.id;
      if (!orderItemId) return;

      for (const ex of item.extras) {
        extrasToInsert.push({ order_item_id: orderItemId, extra_id: ex.extra_id, price: ex.price });
      }
      for (const mod of (item.modifiers ?? [])) {
        modifiersToInsert.push({
          order_item_id: orderItemId,
          group_id: mod.group_id.startsWith('__legacy') ? null : mod.group_id,
          option_id: mod.option_id.startsWith('__legacy') ? null : mod.option_id,
          group_name: mod.group_name,
          option_name: mod.option_name,
          price_delta: mod.price_delta,
        });
      }
    });

    if (extrasToInsert.length > 0 || modifiersToInsert.length > 0) {
      const insertJobs: Promise<any>[] = [];
      if (extrasToInsert.length > 0) insertJobs.push(supabase.from('order_item_extras').insert(extrasToInsert));
      if (modifiersToInsert.length > 0) insertJobs.push(supabase.from('order_item_modifiers').insert(modifiersToInsert));
      const results = await Promise.all(insertJobs);
      const extrasErr = results[0]?.error;
      const modsErr = results[1]?.error ?? (extrasToInsert.length === 0 ? results[0]?.error : undefined);
      const detailErr = extrasErr ?? modsErr;
      if (detailErr) {
        logger.error('order detail insert failed', { order_id: order.id, error: detailErr.message });
        const { error: rollbackErr } = await supabase.from('orders').delete().eq('id', order.id);
        if (rollbackErr) logger.error('rollback delete failed', { order_id: order.id, error: rollbackErr.message });
        return NextResponse.json({ error: 'Error guardando detalles del pedido' }, { status: 500 });
      }
    }

    if (promo_code) {
      try {
        await supabase.rpc('increment_promo_usage', { p_code: promo_code.toUpperCase().trim(), p_restaurant_id: restaurant_id });
      } catch (err) {
        logger.error('increment_promo_usage failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Upsert customer record (non-blocking)
    supabase.rpc('upsert_customer_from_order', {
      p_restaurant_id: restaurant_id,
      p_name: parsed.data.customer_name,
      p_email: customer_email || '',
      p_phone: parsed.data.customer_phone || '',
      p_address: delivery_address || '',
      p_order_total: total,
    }).then(({ error: custErr }) => {
      if (custErr) logger.error('upsert_customer failed', { error: custErr.message });
    });

    // Fetch product names for notification (non-blocking)
    const notifProductIds = parsed.data.items.map((i) => i.product_id);
    (async () => {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', notifProductIds);

        const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));
        const notifItems = parsed.data.items.map((i) => ({
          name: productMap.get(i.product_id) ?? 'Producto',
          qty: i.qty,
          price: i.line_total,
        }));

        await notifyNewOrder({
          orderId: order.id,
          orderNumber: order.order_number,
          restaurantId: restaurant_id,
          customerName: parsed.data.customer_name,
          customerEmail: customer_email || undefined,
          customerPhone: parsed.data.customer_phone || undefined,
          orderType: order_type || 'dine_in',
          total,
          items: notifItems,
        });
      } catch (err) {
        logger.error('notifyNewOrder failed', { error: err instanceof Error ? err.message : String(err) });
      }
    })();

    return NextResponse.json({
      order_number: order.order_number,
      order_id: order.id,
      slug: restaurant.slug,
    });
  } catch (err) {
    captureError(err, { route: '/api/orders' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
