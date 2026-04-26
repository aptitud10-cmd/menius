export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { publicOrderSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/notifications/order-notifications';
import { sendEmail } from '@/lib/notifications/email';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { verifyOrderToken } from '@/lib/order-token';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import { getStripe } from '@/lib/stripe';
import { computeUnitPrice, computeOrderTotals, resolveCommission } from '@/lib/order-pricing';

const logger = createLogger('orders');

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const { allowed } = await checkRateLimitAsync(`order:${ip}`, { limit: 10, windowSec: 60 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
      );
    }

    // Idempotency key — prevent duplicate orders on network retry
    const rawIdempotencyKey = request.headers.get('Idempotency-Key')?.trim() || null;
    // Reject suspiciously long keys before touching the DB (max 128 chars is generous for UUIDs)
    if (rawIdempotencyKey && rawIdempotencyKey.length > 128) {
      return NextResponse.json({ error: 'Idempotency-Key too long (max 128 chars)' }, { status: 400 });
    }
    const idempotencyKey = rawIdempotencyKey;
    if (idempotencyKey) {
      const adminDb = createAdminClient();
      const { data: existing } = await adminDb
        .from('orders')
        .select('id, order_number, total, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { order_id: existing.id, order_number: existing.order_number, total: existing.total, idempotent: true },
          { status: 200 }
        );
      }
    }

    const body = await request.json();
    const bodyLocale: string = body.locale ?? 'es';
    const bodyEn = bodyLocale === 'en';

    // Honeypot — bots typically fill hidden fields; real users never see this field
    if (body._hp && String(body._hp).length > 0) {
      // Silently discard — return a fake success so bots don't retry
      logger.warn('Honeypot triggered', { ip });
      return NextResponse.json({ order_id: `blocked-${Date.now()}`, order_number: 'SPAM' });
    }

    // Page token — verify the request originated from a real browser session
    const restaurant_id_raw: string = String(body.restaurant_id ?? '');
    if (!verifyOrderToken(body._ot, restaurant_id_raw)) {
      logger.warn('Invalid order token', { ip, restaurant_id: restaurant_id_raw });
      return NextResponse.json(
        { error: bodyEn ? 'Session expired. Please reload the page.' : 'Sesión expirada. Recarga la página.' },
        { status: 403 }
      );
    }

    // Sanitize all user-facing text inputs
    const restaurant_id = body.restaurant_id;
    const customer_name = sanitizeText(body.customer_name, 100);
    const customer_email = sanitizeEmail(body.customer_email);
    const customer_phone = sanitizeText(body.customer_phone, 20);
    const notes = sanitizeMultiline(body.notes, 500);
    const items = body.items;
    const promo_code = sanitizeText(body.promo_code, 50);
    const discount_amount = body.discount_amount;
    const loyalty_points_redeemed = Number(body.loyalty_points_redeemed) || 0;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const loyalty_account_id =
      typeof body.loyalty_account_id === 'string' && UUID_RE.test(body.loyalty_account_id)
        ? body.loyalty_account_id
        : null;
    const order_type = sanitizeText(body.order_type, 20);
    const payment_method = sanitizeText(body.payment_method, 20);
    const delivery_address = sanitizeMultiline(body.delivery_address, 300);
    const table_name = sanitizeText(body.table_name, 50);

    if (!restaurant_id || (!String(restaurant_id).startsWith('demo') && !UUID_RE.test(String(restaurant_id)))) {
      return NextResponse.json({ error: 'Invalid restaurant_id' }, { status: 400 });
    }

    if (String(restaurant_id).startsWith('demo')) {
      if (!customer_name || !customer_phone) {
        return NextResponse.json({ error: bodyEn ? 'Name and phone required' : 'Nombre y teléfono requeridos' }, { status: 400 });
      }
      const demoNum = `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return NextResponse.json({ order_id: `demo-order-${Date.now()}`, order_number: demoNum });
    }

    const parsed = publicOrderSchema.safeParse({
      customer_name, customer_phone, customer_email, order_type, payment_method, notes, items,
      tip_amount: body.tip_amount !== undefined ? Number(body.tip_amount) : undefined,
    });
    if (!parsed.success) {
      logger.warn('Order validation failed', { errors: parsed.error.errors, restaurant_id });
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const supabase = await createClient();
    const adminDb = createAdminClient();

    const { data: restaurant, error: restaurantDbError } = await adminDb
      .from('restaurants')
      .select('id, slug, delivery_fee, name, currency, locale, notification_email, notification_whatsapp, notifications_enabled, orders_paused_until, operating_hours, timezone, tax_rate, tax_included, tax_label, commission_plan, order_types_enabled, payment_methods_enabled')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantDbError) {
      logger.error('Restaurant DB query failed', { restaurant_id, error: restaurantDbError.message });
    }
    if (!restaurant) {
      return NextResponse.json({ error: bodyEn ? 'Restaurant not found' : 'Restaurante no encontrado' }, { status: 404 });
    }

    const en = restaurant.locale === 'en';

    // Validate order_type is enabled for this restaurant
    const orderTypesEnabled = (restaurant as any).order_types_enabled as string[] | null;
    if (orderTypesEnabled && orderTypesEnabled.length > 0 && !orderTypesEnabled.includes(order_type)) {
      return NextResponse.json(
        { error: en
            ? 'This order type is not available at this restaurant.'
            : 'Este tipo de pedido no está disponible en este restaurante.' },
        { status: 400 }
      );
    }

    // Validate required fields per order type
    // Use the already-sanitized variable, not body.delivery_address
    if (parsed.data.order_type === 'delivery') {
      const addr = (delivery_address ?? '').trim();
      if (!addr || addr.length < 5) {
        return NextResponse.json(
          { error: en ? 'A delivery address is required.' : 'Se requiere una dirección de entrega.' },
          { status: 400 }
        );
      }
    }

    if (parsed.data.order_type === 'dine_in' && !(table_name ?? '').trim()) {
      return NextResponse.json(
        { error: en ? 'A table number is required for dine-in orders.' : 'Se requiere el número de mesa para órdenes en mesa.' },
        { status: 400 }
      );
    }

    // Pause guard — if the restaurant paused orders, reject new ones
    const pausedUntil = (restaurant as any).orders_paused_until;
    if (pausedUntil && new Date(pausedUntil) > new Date()) {
      return NextResponse.json(
        { error: en
            ? 'This restaurant is not accepting orders right now. Please try again later.'
            : 'El restaurante no está aceptando órdenes en este momento. Intenta más tarde.' },
        { status: 503 }
      );
    }

    // Business hours check — reject orders outside opening hours
    const opHours = (restaurant as any).operating_hours as Record<string, { open: string; close: string; closed?: boolean }> | null;
    if (opHours && Object.keys(opHours).length > 0 && !body.scheduled_for) {
      const tz = (restaurant as any).timezone ?? 'UTC';
      const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const day = days[nowInTz.getDay()];
      const dayHours = opHours[day];
      let isOpen = true;
      if (!dayHours || dayHours.closed) {
        isOpen = false;
      } else if (dayHours.open && dayHours.close) {
        const [oh, om] = dayHours.open.split(':').map(Number);
        const [ch, cm] = dayHours.close.split(':').map(Number);
        const nowMins = nowInTz.getHours() * 60 + nowInTz.getMinutes();
        isOpen = nowMins >= oh * 60 + om && nowMins < ch * 60 + cm;
      }
      if (!isOpen) {
        return NextResponse.json(
          { error: en
              ? 'This restaurant is currently closed. You can schedule an order for later.'
              : 'El restaurante está cerrado en este momento. Puedes programar tu pedido para más tarde.' },
          { status: 503 }
        );
      }
    }

    // Commission rate in basis points (bps). Applied as Stripe application_fee_amount
    // on online payments where the restaurant uses Stripe Connect.
    // commission_plan: 4% | all subscription plans: 0% | trial: 0% | free: no online payments
    let commissionBps = 0;
    let isFreeTier = false; // hoisted so it's accessible in the Stripe Connect block below

    // Check subscription — enforce monthly limit for FREE-tier restaurants
    try {
      let sub: { status: string; trial_end?: string | null } | null = null;
      if ((restaurant as any).commission_plan !== true) {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, trial_end, current_period_end, plan_id')
          .eq('restaurant_id', restaurant_id)
          .maybeSingle();
        sub = data;
      }
      ({ commissionBps, isFreeTier } = resolveCommission(
        (restaurant as any).commission_plan === true,
        sub,
      ));
    } catch (subErr) {
      logger.warn('Subscription check failed during order creation — proceeding without plan enforcement', { error: subErr });
      // On subscription check failure: treat as non-free (don't block), 0% commission
      isFreeTier = false;
      commissionBps = 0;
    }

    const productIds = parsed.data.items.map((i) => i.product_id);

    const [{ data: dbProducts }, { data: dbVariants }, { data: dbExtras }, { data: dbModGroups }] = await Promise.all([
      supabase.from('products').select('id, name, price, in_stock').in('id', productIds).eq('restaurant_id', restaurant_id),
      supabase.from('product_variants').select('id, product_id, name, price_delta, sort_order').in('product_id', productIds).order('sort_order', { ascending: true }),
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
    const modGroupIdSet = new Set((dbModGroups ?? []).map((g) => g.id));
    const productsRequiringVariant = new Set((dbVariants ?? []).map((v) => v.product_id));
    // First variant per product (sort_order ASC) — used as fallback when client sends no variant_id
    const firstVariantByProduct = new Map<string, { id: string; price_delta: number }>();
    for (const v of dbVariants ?? []) {
      if (!firstVariantByProduct.has(v.product_id)) firstVariantByProduct.set(v.product_id, v);
    }

    const modGroupsByProduct = new Map<string, typeof dbModGroups>();
    for (const g of dbModGroups ?? []) {
      const list = modGroupsByProduct.get(g.product_id) ?? [];
      list.push(g);
      modGroupsByProduct.set(g.product_id, list);
    }

    // Build a set of group IDs that have at least one option — used to skip
    // required validation for groups with no options (avoids blocking orders)
    const groupsWithOptions = new Set((dbModOptions ?? []).map((o) => o.group_id));

    for (const item of parsed.data.items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) {
        return NextResponse.json({ error: 'Producto no encontrado o no pertenece a este restaurante.' }, { status: 400 });
      }
      if (dbProduct.in_stock === false) {
        return NextResponse.json({ error: 'Uno de los productos está agotado.' }, { status: 400 });
      }
      // If product requires a variant but client sent none, auto-assign the first (base) variant
      if (productsRequiringVariant.has(item.product_id) && !item.variant_id) {
        const fallback = firstVariantByProduct.get(item.product_id);
        if (fallback) {
          (item as Record<string, unknown>).variant_id = fallback.id;
        }
      }

      const priceResult = computeUnitPrice(item, productMap, variantMap, extraMap, modOptionMap);
      if (priceResult.error === 'invalid_variant') {
        return NextResponse.json({ error: 'Variante inválida.' }, { status: 400 });
      }
      if (priceResult.error === 'invalid_extra') {
        return NextResponse.json({ error: 'Extra inválido.' }, { status: 400 });
      }
      const expectedUnitPrice = priceResult.unitPrice;

      // Log legacy/unknown modifiers for visibility (computeUnitPrice already uses $0 for both)
      for (const mod of (item.modifiers ?? [])) {
        const isLegacy = !mod.option_id || String(mod.option_id).startsWith('__legacy');
        if (isLegacy) {
          logger.warn('legacy modifier — using $0 for security (migrate to modifier_options)', {
            restaurant_id,
            product: item.product_id,
            option_id: mod.option_id,
          });
        } else if (mod.option_id && !modOptionMap.has(mod.option_id)) {
          logger.error('modifier option not found in DB — possible forged request, using $0', { restaurant_id, option_id: mod.option_id, product: item.product_id });
          captureError(new Error('modifier option not found in DB'), { restaurant_id, option_id: mod.option_id, product: item.product_id });
        }
      }

      const groups = modGroupsByProduct.get(item.product_id) ?? [];
      for (const grp of groups) {
        if (!grp.is_required) continue;
        // Skip validation if the group has no options — avoids blocking orders
        // when a required modifier group was created but has no options yet
        if (!groupsWithOptions.has(grp.id)) continue;
        // Match by group_id (preferred) OR group_name (fallback for legacy/stale cart items).
        // Using both avoids failures when the client has stale cart data or when group
        // names differ by case/whitespace from the database value.
        const selected = (item.modifiers ?? []).filter((m: any) =>
          m.group_id === grp.id || m.group_name === grp.name
        ).length;
        if (selected < grp.min_select) {
          return NextResponse.json({ error: `Selecciona al menos ${grp.min_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
        if (grp.max_select > 0 && selected > grp.max_select) {
          return NextResponse.json({ error: `Máximo ${grp.max_select} opción(es) en "${grp.name}".` }, { status: 400 });
        }
      }

      // Always assign server-calculated price — never trust the client value
      if (item.unit_price !== 0 && Math.abs(item.unit_price - expectedUnitPrice) > 0.02) {
        logger.error('Price mismatch (client vs server) — server value applied', { restaurant_id, product: item.product_id, sent: item.unit_price, expected: expectedUnitPrice });
        captureError(new Error('Price mismatch: client sent different price than server calculated'), { restaurant_id, product: item.product_id, sent: item.unit_price, expected: expectedUnitPrice });
      }
      item.unit_price = expectedUnitPrice;
      item.line_total = expectedUnitPrice * item.qty;
    }

    const { data: orderNum } = await supabase.rpc('generate_order_number', { rest_id: restaurant_id });
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}`;

    const serverDeliveryFee = Number(restaurant.delivery_fee) || 0;
    const rawTip = Math.max(0, Number(parsed.data.tip_amount) || 0);
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

    // Validate and apply loyalty points redemption
    let loyaltyDiscountAmt = 0;
    let validatedLoyaltyPoints = 0;
    let loyaltyPesoPerPoint = 0;
    if (loyalty_points_redeemed > 0 && loyalty_account_id) {
      const { data: loyaltyConfig } = await adminDb
        .from('loyalty_config')
        .select('enabled, min_redeem_points, peso_per_point')
        .eq('restaurant_id', restaurant_id)
        .maybeSingle();
      loyaltyPesoPerPoint = loyaltyConfig?.peso_per_point ?? 0;

      if (loyaltyConfig?.enabled) {
        const normalizedOrderPhone = parsed.data.customer_phone?.replace(/\D/g, '') ?? '';
        const { data: account } = await adminDb
          .from('loyalty_accounts')
          .select('id, points, customer_phone')
          .eq('id', loyalty_account_id)
          .eq('restaurant_id', restaurant_id)
          .maybeSingle();

        // Verify the account belongs to the phone number on this order
        // — prevents someone using a known account_id to steal another customer's points
        const accountPhone = account?.customer_phone?.replace(/\D/g, '') ?? '';
        const phoneMatches = !normalizedOrderPhone || !accountPhone || accountPhone === normalizedOrderPhone;
        if (account && !phoneMatches) {
          logger.warn('Loyalty account phone mismatch — skipping redemption', {
            account_id: loyalty_account_id,
            restaurant_id,
          });
        }

        if (account && phoneMatches && account.points >= loyaltyConfig.min_redeem_points) {
          // Clamp to what the customer actually has
          const pointsToRedeem = Math.min(loyalty_points_redeemed, account.points);
          loyaltyDiscountAmt = Math.min(
            Math.floor(pointsToRedeem * loyaltyConfig.peso_per_point * 100) / 100,
            subtotal - discountAmt // cannot exceed remaining subtotal
          );
          validatedLoyaltyPoints = pointsToRedeem;
        }
      }
    }

    const taxRate = Number((restaurant as any).tax_rate) || 0;
    const taxIncluded = (restaurant as any).tax_included ?? false;
    const { tipAmt, deliveryFeeAmt, totalDiscountAmt, taxAmt, total } = computeOrderTotals({
      items: parsed.data.items.map((i) => ({ unit_price: i.unit_price, qty: i.qty })),
      deliveryFee: serverDeliveryFee,
      isDelivery: parsed.data.order_type === 'delivery',
      rawTip,
      discountAmt,
      loyaltyDiscountAmt,
      taxRate,
      taxIncluded,
    });

    // scheduled_for: parse ISO string from body, validate, reject if in the past
    let scheduledFor: string | null = null;
    if (body.scheduled_for) {
      const sf = new Date(body.scheduled_for);
      if (!isNaN(sf.getTime()) && sf.getTime() > Date.now() + 5 * 60_000) {
        scheduledFor = sf.toISOString();
      }
    }

    // Pre-generate tracking token for delivery orders so QR can be printed on initial ticket
    const isDelivery = parsed.data.order_type === 'delivery';
    const preToken = isDelivery ? crypto.randomUUID() : null;
    // Token expires 24 h after order creation
    const preTokenExpiresAt = preToken
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Resolve table_name → table_id FK for dine_in orders
    let resolvedTableId: string | null = null;
    if (table_name && parsed.data.order_type === 'dine_in') {
      const { data: tableRow } = await adminDb
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurant_id)
        .eq('name', table_name)
        .eq('is_active', true)
        .maybeSingle();
      resolvedTableId = tableRow?.id ?? null;
    }

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
      table_name: table_name || null,
      table_id: resolvedTableId,
      promo_code: promo_code || '',
      discount_amount: totalDiscountAmt,
      idempotency_key: idempotencyKey || null,
      scheduled_for: scheduledFor,
      include_utensils: body.include_utensils !== false,
      driver_tracking_token: preToken,
      driver_token_expires_at: preTokenExpiresAt,
      customer_locale: bodyLocale,
    };
    if (tipAmt > 0) orderInsert.tip_amount = tipAmt;
    if (deliveryFeeAmt > 0) orderInsert.delivery_fee = deliveryFeeAmt;
    if (taxAmt > 0) orderInsert.tax_amount = taxAmt;
    if (loyaltyDiscountAmt > 0) {
      orderInsert.loyalty_discount = loyaltyDiscountAmt;
      orderInsert.loyalty_points_redeemed = validatedLoyaltyPoints;
    }

    // Reject free-tier online payments BEFORE inserting the order to avoid ghost records.
    if (parsed.data.payment_method === 'online' && isFreeTier) {
      return NextResponse.json(
        { error: en
            ? 'Online payment requires a paid plan. Please pay in person or ask the restaurant to upgrade.'
            : 'Los pagos en línea requieren un plan de pago. Paga en persona o pide al restaurante que actualice su plan.' },
        { status: 403 }
      );
    }

    // Atomically increment promo usage BEFORE inserting the order.
    // The RPC re-checks max_uses with a row-level lock so concurrent orders can't both pass.
    let promoIncremented = false;
    if (promo_code && discountAmt > 0) {
      const { data: promoOk } = await adminDb.rpc('increment_promo_usage', {
        p_code: promo_code.toUpperCase().trim(),
        p_restaurant_id: restaurant_id,
      });
      if (!promoOk) {
        return NextResponse.json(
          { error: en
              ? 'This promo code is no longer valid or has reached its usage limit.'
              : 'Este código promocional ya no es válido o alcanzó su límite de usos.' },
          { status: 400 }
        );
      }
      promoIncremented = true;
    }

    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .insert(orderInsert)
      .select()
      .single();

    if (orderError) {
      if (orderError.code === '23505' && idempotencyKey) {
        // Race condition: two concurrent requests with same key — return the winner's order.
        // Do NOT roll back the promo: the winning insert already committed it.
        const { data: raceWinner } = await adminDb
          .from('orders')
          .select('id, order_number, total')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        if (raceWinner) {
          return NextResponse.json(
            { order_id: raceWinner.id, order_number: raceWinner.order_number, total: raceWinner.total, idempotent: true },
            { status: 200 }
          );
        }
      }
      logger.error('Failed to insert order', { error: orderError.message, restaurantId: restaurant.id });
      if (promoIncremented && orderError.code !== '23505') {
        adminDb.rpc('decrement_promo_usage', {
          p_code: promo_code!.toUpperCase().trim(),
          p_restaurant_id: restaurant_id,
        }).then(({ error: e }) => {
          if (e) logger.error('Failed to rollback promo usage', { error: e.message });
        });
      }
      return NextResponse.json({ error: 'No se pudo crear la orden. Intenta de nuevo.' }, { status: 500 });
    }

    const { data: insertedItems, error: itemsError } = await adminDb
      .from('order_items')
      .insert(
        parsed.data.items.map((item) => {
          const dbProd = productMap.get(item.product_id);
          const dbVar = item.variant_id ? variantMap.get(item.variant_id) : undefined;
          return {
            order_id: order.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            qty: item.qty,
            unit_price: item.unit_price,
            line_total: item.line_total,
            notes: item.notes,
            // Snapshot current names so historical orders are not affected by future menu edits
            product_name: (dbProd as any)?.name ?? '',
            variant_name: (dbVar as any)?.name ?? '',
          };
        })
      )
      .select('id');

    if (itemsError) {
      logger.error('order_items insert failed — attempting rollback', { order_id: order.id, error: itemsError.message });
      const { error: rollbackErr } = await adminDb.from('orders').delete().eq('id', order.id);
      if (rollbackErr) {
        // Delete failed — mark cancelled so this ghost order doesn't appear as actionable
        // in the dashboard. A cancelled order is visible but clearly not pending action.
        logger.error('rollback delete failed — marking order cancelled to prevent ghost', {
          order_id: order.id,
          delete_error: rollbackErr.message,
        });
        await adminDb
          .from('orders')
          .update({ status: 'cancelled', notes: '[auto-cancelled: items insert failed]' })
          .eq('id', order.id);
      }
      return NextResponse.json({ error: 'Error guardando items' }, { status: 500 });
    }

    // Deduct loyalty points atomically using PostgreSQL RPC with FOR UPDATE lock.
    // This prevents the double-spend race condition where two concurrent orders
    // could both read the same balance and both succeed in spending the same points.
    if (validatedLoyaltyPoints > 0 && loyalty_account_id) {
      try {
        const { data: redemptionResult, error: rpcError } = await adminDb.rpc('redeem_loyalty_points', {
          p_account_id: loyalty_account_id,
          p_restaurant_id: restaurant_id,
          p_order_id: order.id,
          p_order_number: order.order_number,
          p_points_to_redeem: validatedLoyaltyPoints,
          p_peso_per_point: loyaltyPesoPerPoint,
        });

        if (rpcError) {
          logger.error('Loyalty redemption RPC failed', {
            error: rpcError.message,
            account_id: loyalty_account_id,
            order_id: order.id,
          });
        } else if (redemptionResult?.[0]?.redeemed_points === 0) {
          logger.warn('Loyalty redemption returned 0 — insufficient points or account not found', {
            account_id: loyalty_account_id,
            requested: validatedLoyaltyPoints,
          });
        }
      } catch (err) {
        // Non-critical — order already saved, points just weren't deducted
        logger.error('Loyalty redemption RPC exception', {
          error: err instanceof Error ? err.message : String(err),
          account_id: loyalty_account_id,
          order_id: order.id,
        });
      }
    }

    const orderedItems = insertedItems ?? [];
    const extrasToInsert: any[] = [];
    const modifiersToInsert: any[] = [];

    parsed.data.items.forEach((item, idx) => {
      const orderItemId = orderedItems[idx]?.id;
      if (!orderItemId) return;

      for (const ex of item.extras) {
        // Always use the server-side DB price — never trust the client-supplied value.
        // The billing already uses extraMap (line ~283), this keeps the stored record consistent.
        const serverExtraPrice = extraMap.get(ex.extra_id)?.price ?? ex.price;
        extrasToInsert.push({ order_item_id: orderItemId, extra_id: ex.extra_id, price: serverExtraPrice });
      }
      for (const mod of (item.modifiers ?? [])) {
        const gid = mod.group_id ?? '';
        const oid = mod.option_id ?? '';
        const isLegacyMod = !oid || oid.startsWith('__legacy');
        // Use server-side price_delta from modOptionMap — never trust the client value.
        // Legacy modifiers have no DB record; $0 is correct (matches billing logic above).
        const serverPriceDelta = isLegacyMod ? 0 : (modOptionMap.get(oid)?.price_delta ?? 0);
        // Only pass group_id/option_id if they actually exist in the DB.
        // Sending a UUID that was deleted or never existed causes a FK constraint
        // violation on insert — the root cause of "Error saving order details".
        const safeGroupId = (!gid || gid.startsWith('__legacy') || !modGroupIdSet.has(gid)) ? null : gid;
        const safeOptionId = isLegacyMod || !modOptionMap.has(oid) ? null : oid;
        modifiersToInsert.push({
          order_item_id: orderItemId,
          group_id: safeGroupId,
          option_id: safeOptionId,
          group_name: mod.group_name ?? '',
          option_name: mod.option_name ?? '',
          price_delta: serverPriceDelta,
        });
      }
    });

    if (extrasToInsert.length > 0 || modifiersToInsert.length > 0) {
      const insertJobs: Promise<any>[] = [];
      if (extrasToInsert.length > 0) insertJobs.push(Promise.resolve(adminDb.from('order_item_extras').insert(extrasToInsert)));
      if (modifiersToInsert.length > 0) insertJobs.push(Promise.resolve(adminDb.from('order_item_modifiers').insert(modifiersToInsert)));
      const detailResults = await Promise.all(insertJobs);
      const detailErrors = detailResults.filter((r) => r?.error);
      if (detailErrors.length > 0) {
        // Extras/modifiers are part of the order contract (e.g. "sin gluten", size selection).
        // A partial order without them would silently misrepresent the customer's request.
        // Roll back the full order so the customer can retry cleanly.
        logger.error('order_item detail insert failed — rolling back order', {
          order_id: order.id,
          errors: detailErrors.map((r) => ({ message: r.error.message, code: r.error.code })),
        });
        const { error: rollbackErr } = await adminDb.from('orders').delete().eq('id', order.id);
        if (rollbackErr) {
          logger.error('rollback delete failed — marking order cancelled', {
            order_id: order.id,
            delete_error: rollbackErr.message,
          });
          await adminDb
            .from('orders')
            .update({ status: 'cancelled', notes: '[auto-cancelled: detail insert failed]' })
            .eq('id', order.id);
        }
        return NextResponse.json(
          { error: en ? 'Error saving order details. Please try again.' : 'Error guardando detalles del pedido. Intenta de nuevo.' },
          { status: 500 }
        );
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
      if (custErr) { logger.error('upsert_customer failed', { error: custErr.message }); return; }
      // Remove reactivation_sent tag now that the customer ordered again, so they can
      // receive future reactivation emails if they become inactive again.
      if (customer_email) {
        adminDb
          .from('customers')
          .select('id, tags')
          .eq('restaurant_id', restaurant_id)
          .ilike('email', customer_email)
          .maybeSingle()
          .then(({ data: cust }) => {
            if (cust && (cust.tags ?? []).includes('reactivation_sent')) {
              const newTags = (cust.tags as string[]).filter((t) => t !== 'reactivation_sent');
              adminDb.from('customers').update({ tags: newTags }).eq('id', cust.id);
            }
          });
      }
    });

    // First order "wow" email — fire-and-forget to restaurant owner
    if (restaurant.notification_email) {
      Promise.resolve(
        adminDb
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant_id)
      ).then(({ count }) => {
        if (count === 1 && restaurant.notification_email) {
          const en = restaurant.locale === 'en';
          const dashUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app'}/app`;
          sendEmail({
            to: restaurant.notification_email,
            subject: en
              ? `🎉 ${restaurant.name} just received its first order!`
              : `🎉 ¡${restaurant.name} acaba de recibir su primer pedido!`,
            html: buildFirstOrderWowEmail(restaurant.name, dashUrl, en),
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // For online payments via Stripe Checkout: create session BEFORE sending notifications
    // so that if Stripe rejects (no connected account), we can roll back and return early
    // without the restaurant already having received a phantom order notification.
    // 'wallet' payments (Apple Pay / Google Pay) use a PaymentIntent directly — no Checkout Session needed.
    const isColombianCurrency = (restaurant.currency ?? '').toUpperCase() === 'COP';
    let stripeUrl: string | null = null;
    if (parsed.data.payment_method === 'online' && !isColombianCurrency) {
      try {
        const stripe = getStripe();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
        const { data: restStripe } = await adminDb
          .from('restaurants')
          .select('stripe_account_id, stripe_onboarding_complete')
          .eq('id', restaurant_id)
          .maybeSingle();

        const connectedAccount = restStripe?.stripe_onboarding_complete ? restStripe?.stripe_account_id : null;

        if (!connectedAccount) {
          // Stripe Connect not configured for this restaurant.
          // Refuse instead of silently collecting funds into the platform account.
          await adminDb.from('orders').delete().eq('id', order.id);
          return NextResponse.json(
            { error: en
                ? 'Online payment is not available for this restaurant yet. Please pay in person.'
                : 'El pago en línea no está disponible para este restaurante aún. Por favor paga en persona.' },
            { status: 400 }
          );
        }

        // Online payments require at least Starter plan. Free-tier restaurants
        // cannot accept card payments even if they have a connected account.
        if (isFreeTier) {
          await adminDb.from('orders').delete().eq('id', order.id);
          return NextResponse.json(
            { error: en
                ? 'Online payment requires a paid plan. Please pay in person or ask the restaurant to upgrade.'
                : 'El pago en línea requiere un plan de pago. Por favor paga en persona o pide al restaurante que actualice su plan.' },
            { status: 403 }
          );
        }

        const stripeProductIds = parsed.data.items.map((i) => i.product_id);
        const { data: stripeProducts } = await adminDb
          .from('products')
          .select('id, name, variants:product_variants(id, name)')
          .in('id', stripeProductIds);

        const stripeProductMap = new Map((stripeProducts ?? []).map((p) => [p.id, p]));

        const lineItems = parsed.data.items.map((item) => {
          const prod = stripeProductMap.get(item.product_id);
          const prodName = prod?.name ?? 'Item';
          const variantName = item.variant_id
            ? (prod?.variants as { id: string; name: string }[] | undefined)?.find((v) => v.id === item.variant_id)?.name
            : undefined;
          return {
            price_data: {
              currency: (restaurant.currency || 'usd').toLowerCase(),
              product_data: {
                name: [prodName, variantName].filter(Boolean).join(' – ').slice(0, 500),
              },
              unit_amount: Math.round(Number(item.unit_price) * 100),
            },
            quantity: item.qty,
          };
        });

        // Menius platform commission: collected as a Stripe application fee on the payment.
        // Calculated on the gross order total (after discounts, before Stripe fees).
        // Only applied when commissionBps > 0 — Pro/Business restaurants pay 0%.
        const applicationFeeAmount = commissionBps > 0
          ? Math.round(total * 100 * commissionBps / 10000) // total is in currency units
          : undefined;

        const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
          line_items: lineItems,
          mode: 'payment',
          success_url: `${appUrl}/${restaurant.slug}/orden/${order.order_number}?paid=true`,
          cancel_url: `${appUrl}/${restaurant.slug}/orden/${order.order_number}?paid=false`,
          metadata: { order_id: order.id, order_number: order.order_number },
          payment_intent_data: {
            transfer_data: { destination: connectedAccount },
            ...(applicationFeeAmount !== undefined && applicationFeeAmount > 0 && {
              application_fee_amount: applicationFeeAmount,
            }),
          },
        };
        const session = await stripe.checkout.sessions.create(sessionParams);
        stripeUrl = session.url;
      } catch (stripeErr) {
        const errMsg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        logger.error('stripe session creation failed — rolling back order', { order_id: order.id, error: errMsg });

        // Roll back: delete the order so the customer doesn't see a pending order
        // with no payment URL. They can retry cleanly from the cart.
        const { error: rbErr } = await adminDb.from('orders').delete().eq('id', order.id);
        if (rbErr) {
          logger.error('rollback delete failed after Stripe error — marking cancelled', {
            order_id: order.id,
            delete_error: rbErr.message,
          });
          await adminDb
            .from('orders')
            .update({ status: 'cancelled', notes: '[auto-cancelled: stripe session creation failed]' })
            .eq('id', order.id);
        }

        return NextResponse.json(
          {
            error: en
              ? 'Payment could not be initialized. Please try again or choose a different payment method.'
              : 'No se pudo iniciar el pago. Intenta de nuevo o elige otro método de pago.',
          },
          { status: 502 }
        );
      }
    }

    // Send notifications — awaited so Vercel doesn't freeze the process before emails are sent
    try {
      const notifItems = parsed.data.items.map((i) => ({
        name: productMap.get(i.product_id)?.name ?? 'Producto',
        qty: i.qty,
        price: i.line_total,
      }));

      await notifyNewOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        restaurantId: restaurant_id,
        restaurantData: {
          name: restaurant.name,
          slug: restaurant.slug,
          currency: restaurant.currency,
          locale: restaurant.locale,
          notification_email: restaurant.notification_email,
          notification_whatsapp: restaurant.notification_whatsapp,
          notifications_enabled: restaurant.notifications_enabled,
        },
        customerName: parsed.data.customer_name,
        customerEmail: customer_email || undefined,
        customerPhone: parsed.data.customer_phone || undefined,
        customerLocale: bodyLocale,
        orderType: order_type || 'dine_in',
        deliveryAddress: delivery_address || null,
        paymentMethod: parsed.data.payment_method || undefined,
        tableNumber: table_name || undefined,
        notes: parsed.data.notes || null,
        includeUtensils: body.include_utensils !== false,
        total,
        items: notifItems,
      });
    } catch (err) {
      logger.error('notifyNewOrder failed', { error: err instanceof Error ? err.message : String(err) });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const driverTrackingUrl = preToken
      ? `${appUrl}/driver/track/${preToken}`
      : null;

    return NextResponse.json({
      order_number: order.order_number,
      order_id: order.id,
      total,
      slug: restaurant.slug,
      stripe_url: stripeUrl,
      driver_tracking_url: driverTrackingUrl,
    });
  } catch (err) {
    captureError(err, { route: '/api/orders' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildFirstOrderWowEmail(restaurantName: string, dashUrl: string, en = false): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#10b981;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid rgba(16,185,129,0.2);box-shadow:0 0 60px rgba(16,185,129,0.08);">
      <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:40px 32px;text-align:center;">
        <div style="font-size:56px;margin-bottom:12px;">🎉</div>
        <h2 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;line-height:1.2;">
          ${en ? 'Your first order!' : '¡Tu primer pedido!'}
        </h2>
        <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
          ${en ? `${restaurantName} is officially open for business` : `${restaurantName} está oficialmente en marcha`}
        </p>
      </div>
      <div style="padding:32px 28px;">
        <p style="margin:0 0 20px;font-size:16px;color:#f3f4f6;line-height:1.7;font-weight:500;">
          ${en
            ? 'This is a big moment. 🏆 Your first customer just placed an order through your digital menu — the same one you set up on MENIUS.'
            : 'Este es un gran momento. 🏆 Tu primer cliente acaba de hacer un pedido a través de tu menú digital — el mismo que configuraste en MENIUS.'}
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
          ${en
            ? 'Go to your dashboard to see the order and mark it as in preparation. From here, every order adds up.'
            : 'Ve a tu dashboard para ver el pedido y marcarlo en preparación. A partir de aquí, cada pedido suma.'}
        </p>
        <a href="${dashUrl}/orders" style="display:block;padding:16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-align:center;border-radius:14px;font-weight:700;font-size:16px;text-decoration:none;letter-spacing:-0.01em;">
          ${en ? 'See my first order →' : 'Ver mi primer pedido →'}
        </a>
        <div style="margin-top:24px;padding:16px;background:rgba(16,185,129,0.06);border-radius:12px;border:1px solid rgba(16,185,129,0.12);">
          <p style="margin:0;font-size:13px;color:#6ee7b7;line-height:1.6;text-align:center;">
            💡 ${en
              ? 'Tip: enable WhatsApp notifications in Settings so you never miss an order.'
              : 'Tip: activa notificaciones de WhatsApp en Ajustes para no perder ningún pedido.'}
          </p>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#374151;margin-top:20px;">
      MENIUS — ${en ? 'Digital menu for restaurants' : 'Menú digital para restaurantes'}
    </p>
  </div>
</body>
</html>`;
}
