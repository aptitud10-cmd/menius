export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import {
  enabledKinds,
  LIFECYCLE_KINDS,
  lifecycleTag,
  MARKETING_EVENTS,
  OPT_IN_TAG,
  UNSUBSCRIBED_TAG,
  type LifecycleKind,
} from '@/lib/marketing/lifecycle';

const logger = createLogger('tenant-marketing-automations');

/** Un email "trajo" un pedido si el cliente pidió dentro de los 7 días siguientes. */
const ATTRIBUTION_DAYS = 7;
const DAY = 24 * 3600_000;

/**
 * GET  → qué automatizaciones están prendidas + números de los últimos 30 días.
 * POST { kind, enabled } → prende/apaga una (tag mkt:<kind> en restaurants.tags).
 *
 * Admin client con restaurant_id del tenant: order_notification_log no es
 * legible por RLS para el dueño, y todo se filtra por SU restaurante.
 */
export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rid = tenant.restaurantId;
  const db = createAdminClient();

  try {
    const since = new Date(Date.now() - 30 * DAY).toISOString();
    const [{ data: rest }, withEmail, optedIn, unsubscribed, { data: logs, error: logErr }] = await Promise.all([
      db.from('restaurants').select('tags, address, currency').eq('id', rid).maybeSingle(),
      db.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).not('email', 'is', null).neq('email', ''),
      db.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).contains('tags', [OPT_IN_TAG]).not('tags', 'cs', `{"${UNSUBSCRIBED_TAG}"}`),
      db.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).contains('tags', [UNSUBSCRIBED_TAG]),
      db.from('order_notification_log')
        .select('order_id, event, created_at')
        .eq('restaurant_id', rid)
        .in('event', MARKETING_EVENTS)
        .eq('success', true)
        .gte('created_at', since)
        .limit(5000),
    ]);
    if (logErr) throw new Error(logErr.message);

    const sentByKind: Record<LifecycleKind, number> = { second_visit: 0, usual: 0, winback: 0 };
    const sends = (logs ?? []) as { order_id: string; event: string; created_at: string }[];
    for (const l of sends) {
      const kind = l.event.replace(/^mkt_/, '') as LifecycleKind;
      if (kind in sentByKind) sentByKind[kind]++;
    }

    // Pedidos que volvieron: del mismo cliente, hasta 7 días después del email.
    let returnedOrders = 0;
    let returnedRevenue = 0;
    if (sends.length > 0) {
      const anchorIds = Array.from(new Set(sends.map((s) => s.order_id)));
      const { data: anchors } = await db.from('orders').select('id, customer_id').in('id', anchorIds.slice(0, 1000));
      const customerOf = new Map(((anchors ?? []) as { id: string; customer_id: string | null }[]).map((a) => [a.id, a.customer_id]));
      const sentAt = new Map<string, number[]>();
      for (const s of sends) {
        const c = customerOf.get(s.order_id);
        if (!c) continue;
        const list = sentAt.get(c) ?? [];
        list.push(Date.parse(s.created_at));
        sentAt.set(c, list);
      }
      const customerIds = Array.from(sentAt.keys());
      if (customerIds.length > 0) {
        const { data: after } = await db
          .from('orders')
          .select('id, customer_id, created_at, total')
          .eq('restaurant_id', rid)
          .in('customer_id', customerIds.slice(0, 1000))
          .neq('status', 'cancelled')
          .gte('created_at', since)
          .limit(5000);
        for (const o of (after ?? []) as { customer_id: string; created_at: string; total: number | string | null }[]) {
          const t = Date.parse(o.created_at);
          const hit = (sentAt.get(o.customer_id) ?? []).some((s) => t > s && t - s <= ATTRIBUTION_DAYS * DAY);
          if (hit) {
            returnedOrders++;
            returnedRevenue += Number(o.total) || 0;
          }
        }
      }
    }

    return NextResponse.json({
      enabled: enabledKinds(rest?.tags),
      hasAddress: !!(rest?.address as string | null | undefined)?.trim(),
      currency: (rest?.currency as string | null | undefined) || 'USD',
      audience: { withEmail: withEmail.count ?? 0, optedIn: optedIn.count ?? 0, unsubscribed: unsubscribed.count ?? 0 },
      last30: { sent: sends.length, sentByKind, returnedOrders, returnedRevenue: Math.round(returnedRevenue * 100) / 100 },
    });
  } catch (err) {
    logger.error('GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { kind, enabled } = (body ?? {}) as { kind?: unknown; enabled?: unknown };
  if (typeof kind !== 'string' || !(LIFECYCLE_KINDS as string[]).includes(kind) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  if (enabled && !(await hasPlanAccess(tenant.restaurantId, 'pro'))) {
    return NextResponse.json({ error: 'Plan required' }, { status: 403 });
  }

  const db = createAdminClient();
  try {
    const { data: rest, error } = await db.from('restaurants').select('tags, address').eq('id', tenant.restaurantId).maybeSingle();
    if (error || !rest) throw new Error(error?.message ?? 'restaurant not found');
    if (enabled && !(rest.address as string | null)?.trim()) {
      return NextResponse.json({ error: 'address_required' }, { status: 409 });
    }
    const tag = lifecycleTag(kind as LifecycleKind);
    const tags = Array.isArray(rest.tags) ? (rest.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [];
    const next = enabled ? Array.from(new Set([...tags, tag])) : tags.filter((t) => t !== tag);
    const { error: upErr } = await db.from('restaurants').update({ tags: next }).eq('id', tenant.restaurantId);
    if (upErr) throw new Error(upErr.message);
    logger.info('automation toggled', { restaurant_id: tenant.restaurantId, kind, enabled });
    return NextResponse.json({ enabled: enabledKinds(next) });
  } catch (err) {
    logger.error('POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
