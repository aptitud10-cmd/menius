export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Emails de marketing por comportamiento: "¿repetimos?", "¿lo de siempre?" y
 * "te extrañamos" (reglas en lib/marketing/lifecycle).
 *
 * Corre cada hora: a cada cliente le llega a SU hora (1 h antes de la que
 * suele pedir, en la hora del restaurante). Solo restaurantes que prendieron
 * la automatización en Marketing → Automatizaciones (tag mkt:<tipo>), con
 * dirección física cargada (CAN-SPAM) y avisos activos.
 *
 * Ante la duda, NO se manda: si falla una lectura de control (historial,
 * pedidos), ese cliente o restaurante se saltea. El aviso se registra ANTES
 * de enviar, así un reintento o una corrida superpuesta no lo duplica.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { cleanSenderName } from '@/lib/notifications/customer-email';
import { createLogger, maskEmail } from '@/lib/logger';
import {
  allowedByHistory,
  canReceiveMarketing,
  enabledKinds,
  isSendTime,
  lifecycleEvent,
  localHour,
  MARKETING_EVENTS,
  OPT_IN_TAG,
  pickLifecycle,
  preferredSendHour,
  REVIEW_EVENT,
  WINBACK_DAYS,
  type LifecycleKind,
  type LogEntry,
} from '@/lib/marketing/lifecycle';
import { buildLifecycleEmail } from '@/lib/marketing/emails';
import {
  choosePicks,
  loadPickPool,
  MARKETING_RESTAURANT_SELECT,
  restaurantForEmail,
  summarizeOrder,
  validEmail,
  type MarketingRestaurant,
  type OrderItemRow,
} from '@/lib/marketing/lifecycle-data';
import { listUnsubscribeHeaders, unsubscribeUrl } from '@/lib/marketing/unsubscribe-token';

const logger = createLogger('marketing-emails', { report: true });

/** Tope por restaurante y por corrida: un dominio nuevo no se "calienta" de golpe. */
const MAX_PER_RESTAURANT_RUN = 40;
const CONCURRENCY = 5;
const DAY = 24 * 3600_000;

type Db = ReturnType<typeof createAdminClient>;

interface CustomerRow {
  id: string;
  name: string | null;
  email: string | null;
  tags: string[] | null;
}

interface OrderRow {
  id: string;
  customer_id: string;
  created_at: string;
  customer_locale: string | null;
  customer_name: string | null;
  customer_token: string | null;
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const nowMs = Date.now();
  const results = { restaurants: 0, considered: 0, sent: 0, failed: 0, skipped_no_address: 0, query_errors: 0 };

  const { data: rests, error } = await db
    .from('restaurants')
    .select(MARKETING_RESTAURANT_SELECT)
    .eq('is_active', true)
    .limit(1000);
  if (error) {
    logger.error('restaurants query failed', { error: error.message });
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  for (const r of (rests ?? []) as MarketingRestaurant[]) {
    const kinds = enabledKinds(r.tags);
    if (kinds.length === 0 || r.notifications_enabled === false) continue;
    const tz = r.timezone || 'America/New_York';
    const hourNow = localHour(nowMs, tz);
    // Fuera de 10:00–19:59 del restaurante no se escribe a nadie.
    if (!isSendTime(hourNow, 10)) continue;
    if (!r.address?.trim()) {
      results.skipped_no_address++;
      logger.warn('marketing skipped: restaurant without address', { restaurant_id: r.id });
      continue;
    }
    results.restaurants++;
    try {
      const out = await runRestaurant(db, r, kinds, hourNow, nowMs, appUrl);
      results.considered += out.considered;
      results.sent += out.sent;
      results.failed += out.failed;
      results.query_errors += out.queryErrors;
    } catch (err) {
      results.query_errors++;
      logger.error('restaurant run failed', { restaurant_id: r.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  logger.info('marketing run', results);
  return NextResponse.json({ ok: true, ...results });
}

async function runRestaurant(
  db: Db,
  r: MarketingRestaurant,
  kinds: LifecycleKind[],
  hourNow: number,
  nowMs: number,
  appUrl: string,
): Promise<{ considered: number; sent: number; failed: number; queryErrors: number }> {
  const out = { considered: 0, sent: 0, failed: 0, queryErrors: 0 };
  const tz = r.timezone || 'America/New_York';

  // 1. Clientes con consentimiento.
  const { data: custRows, error: custErr } = await db
    .from('customers')
    .select('id, name, email, tags')
    .eq('restaurant_id', r.id)
    .contains('tags', [OPT_IN_TAG])
    .not('email', 'is', null)
    .limit(2000);
  if (custErr) {
    out.queryErrors++;
    logger.error('customers query failed', { restaurant_id: r.id, error: custErr.message });
    return out;
  }
  const customers = ((custRows ?? []) as CustomerRow[]).filter((c) => canReceiveMarketing(c.tags) && validEmail(c.email));
  if (customers.length === 0) return out;

  // 2. Sus pedidos (no cancelados), del más nuevo al más viejo.
  const ordersBy = new Map<string, OrderRow[]>();
  for (const part of chunks(customers.map((c) => c.id), 100)) {
    const { data, error } = await db
      .from('orders')
      .select('id, customer_id, created_at, customer_locale, customer_name, customer_token')
      .eq('restaurant_id', r.id)
      .in('customer_id', part)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) {
      out.queryErrors++;
      logger.error('orders query failed', { restaurant_id: r.id, error: error.message });
      return out;
    }
    for (const o of (data ?? []) as OrderRow[]) {
      const list = ordersBy.get(o.customer_id) ?? [];
      list.push(o);
      ordersBy.set(o.customer_id, list);
    }
  }

  // 3. Candidatos: el email que le toca hoy, si está prendido y es su hora.
  type Candidate = { customer: CustomerRow; orders: OrderRow[]; kind: LifecycleKind; anchor: OrderRow };
  const candidates: Candidate[] = [];
  for (const c of customers) {
    const orders = ordersBy.get(c.id) ?? [];
    const last = orders[0];
    // Pasados 75 días no se le escribe más (sunset): ni se mira.
    if (!last || nowMs - Date.parse(last.created_at) >= WINBACK_DAYS.to * DAY) continue;
    const pick = pickLifecycle(orders.map((o) => ({ id: o.id, createdAt: o.created_at })), nowMs);
    if (!pick || !kinds.includes(pick.kind)) continue;
    const hours = orders.slice(0, 10).map((o) => localHour(Date.parse(o.created_at), tz));
    if (!isSendTime(hourNow, preferredSendHour(hours))) continue;
    candidates.push({ customer: c, orders, kind: pick.kind, anchor: last });
  }
  out.considered = candidates.length;
  if (candidates.length === 0) return out;

  // 4. Historial de avisos (topes y "ya se mandó").
  const allOrderIds = candidates.flatMap((c) => c.orders.map((o) => o.id));
  const logsByOrder = new Map<string, LogEntry[]>();
  for (const part of chunks(allOrderIds, 100)) {
    const { data, error } = await db
      .from('order_notification_log')
      .select('order_id, event, created_at')
      .in('order_id', part)
      .in('event', [...MARKETING_EVENTS, REVIEW_EVENT]);
    if (error) {
      out.queryErrors++;
      logger.error('log query failed', { restaurant_id: r.id, error: error.message });
      return out;
    }
    for (const l of (data ?? []) as { order_id: string; event: string; created_at: string }[]) {
      const list = logsByOrder.get(l.order_id) ?? [];
      list.push({ orderId: l.order_id, event: l.event, createdAt: l.created_at });
      logsByOrder.set(l.order_id, list);
    }
  }
  const ready = candidates
    .filter((c) => {
      const logs = c.orders.flatMap((o) => logsByOrder.get(o.id) ?? []);
      return allowedByHistory({ kind: c.kind, anchorOrderId: c.anchor.id }, logs, nowMs);
    })
    .slice(0, MAX_PER_RESTAURANT_RUN);
  if (ready.length === 0) return out;

  // 5. Platos: líneas del último pedido y todo lo que pidió alguna vez.
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  const orderedBy = new Map<string, Set<string>>();
  const idsForItems = ready.flatMap((c) => c.orders.slice(0, 20).map((o) => o.id));
  for (const part of chunks(idsForItems, 100)) {
    const { data, error } = await db
      .from('order_items')
      .select('order_id, product_id, qty, line_total, product_name, products ( name, image_url, hide_image, price )')
      .in('order_id', part);
    if (error) {
      out.queryErrors++;
      logger.error('items query failed', { restaurant_id: r.id, error: error.message });
      return out;
    }
    for (const it of (data ?? []) as unknown as OrderItemRow[]) {
      const list = itemsByOrder.get(it.order_id) ?? [];
      list.push(it);
      itemsByOrder.set(it.order_id, list);
    }
  }
  for (const c of ready) {
    const set = new Set<string>();
    for (const o of c.orders.slice(0, 20)) for (const it of itemsByOrder.get(o.id) ?? []) set.add(it.product_id);
    orderedBy.set(c.customer.id, set);
  }

  const pool = await loadPickPool(db, r.id);
  const restaurant = restaurantForEmail(r);
  const replyTo = validEmail(r.email) ?? undefined;
  const from = `"${cleanSenderName(r.name)}" <orders@menius.app>`;
  const menuUrl = `${appUrl}/${r.slug}`;

  // 6. Enviar: primero se registra (así nunca sale dos veces), después se manda.
  for (const group of chunks(ready, CONCURRENCY)) {
    await Promise.all(group.map(async (c) => {
      const items = itemsByOrder.get(c.anchor.id) ?? [];
      const { lastItems, heroDish } = summarizeOrder(items);
      if (lastItems.length === 0) return;
      const to = validEmail(c.customer.email);
      if (!to) return;

      const { data: claim, error: claimErr } = await db
        .from('order_notification_log')
        .insert({ order_id: c.anchor.id, restaurant_id: r.id, event: lifecycleEvent(c.kind), channel: 'email', success: false })
        .select('id')
        .single();
      if (claimErr || !claim) {
        out.queryErrors++;
        logger.error('claim insert failed', { restaurant_id: r.id, error: claimErr?.message });
        return;
      }

      const locale = (c.anchor.customer_locale ?? r.locale) === 'en' ? 'en' : 'es';
      const { picks, picksAreNew } = choosePicks(pool, c.kind, orderedBy.get(c.customer.id) ?? new Set(), c.anchor.created_at);
      const token = c.anchor.customer_token ? `&t=${encodeURIComponent(c.anchor.customer_token)}` : '';
      const email = buildLifecycleEmail({
        kind: c.kind,
        locale,
        restaurant,
        customerName: c.customer.name || c.anchor.customer_name || '',
        menuUrl,
        repeatUrl: `${menuUrl}?repeat=${c.anchor.id}${token}`,
        unsubscribeUrl: unsubscribeUrl(appUrl, c.customer.id),
        lastItems,
        heroDish,
        picks,
        picksAreNew,
      });

      const ok = await sendEmail({
        to,
        from,
        replyTo,
        subject: email.subject,
        html: email.html,
        headers: listUnsubscribeHeaders(appUrl, c.customer.id),
        tags: [
          { name: 'category', value: 'marketing' },
          { name: 'kind', value: c.kind },
          { name: 'restaurant_id', value: r.id },
        ],
      });
      if (ok) {
        out.sent++;
        await db.from('order_notification_log').update({ success: true }).eq('id', claim.id);
      } else {
        out.failed++;
        await db.from('order_notification_log').update({ error_code: 'send_failed' }).eq('id', claim.id);
        logger.warn('marketing email failed', { restaurant_id: r.id, kind: c.kind, to: maskEmail(to) });
      }
    }));
  }
  return out;
}
