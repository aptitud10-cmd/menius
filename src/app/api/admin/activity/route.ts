export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export interface ActivityEvent {
  id: string;
  type: 'order' | 'signup' | 'payment_failed' | 'trial_ending' | 'cancellation' | 'churn_risk';
  title: string;
  subtitle: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  restaurant_slug: string | null;
  amount: number | null;
  created_at: string;
  severity: 'info' | 'warning' | 'danger';
}

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const db = createAdminClient();
  const now = new Date();
  const h6ago = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d3ahead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: recentOrders },
    { data: recentSignups },
    { data: cancelledSubs },
    { data: trialsExpiring },
    { data: pastDueSubs },
    { data: allRests },
  ] = await Promise.all([
    // New orders last 6h
    db.from('orders')
      .select('id, order_number, restaurant_id, total, customer_name, created_at')
      .gte('created_at', h6ago)
      .order('created_at', { ascending: false })
      .limit(20),

    // New signups last 7d
    db.from('restaurants')
      .select('id, name, slug, created_at')
      .gte('created_at', d7ago)
      .order('created_at', { ascending: false })
      .limit(10),

    // Cancellations last 7d
    db.from('subscriptions')
      .select('restaurant_id, canceled_at, plan_id')
      .eq('status', 'canceled')
      .gte('canceled_at', d7ago)
      .order('canceled_at', { ascending: false })
      .limit(10),

    // Trials ending in 3 days
    db.from('subscriptions')
      .select('restaurant_id, trial_end, plan_id')
      .eq('status', 'trialing')
      .lte('trial_end', d3ahead)
      .gte('trial_end', now.toISOString())
      .order('trial_end')
      .limit(10),

    // Past due subs
    db.from('subscriptions')
      .select('restaurant_id, plan_id, updated_at')
      .eq('status', 'past_due')
      .limit(10),

    // Restaurant names for lookups
    db.from('restaurants')
      .select('id, name, slug')
      .limit(5000),
  ]);

  const restMap = new Map((allRests ?? []).map(r => [r.id, r]));

  const events: ActivityEvent[] = [];

  // Orders
  for (const o of recentOrders ?? []) {
    const rest = restMap.get(o.restaurant_id);
    events.push({
      id: `order-${o.id}`,
      type: 'order',
      title: `Nueva orden #${o.order_number}`,
      subtitle: o.customer_name ? `${o.customer_name} · $${Number(o.total ?? 0).toFixed(0)}` : `$${Number(o.total ?? 0).toFixed(0)}`,
      restaurant_id: o.restaurant_id,
      restaurant_name: rest?.name ?? null,
      restaurant_slug: rest?.slug ?? null,
      amount: Number(o.total ?? 0),
      created_at: o.created_at,
      severity: 'info',
    });
  }

  // Signups
  for (const r of recentSignups ?? []) {
    events.push({
      id: `signup-${r.id}`,
      type: 'signup',
      title: `Nuevo registro: ${r.name}`,
      subtitle: `/${r.slug}`,
      restaurant_id: r.id,
      restaurant_name: r.name,
      restaurant_slug: r.slug,
      amount: null,
      created_at: r.created_at,
      severity: 'info',
    });
  }

  // Cancellations
  for (const s of cancelledSubs ?? []) {
    const rest = restMap.get(s.restaurant_id);
    events.push({
      id: `cancel-${s.restaurant_id}`,
      type: 'cancellation',
      title: `Cancelación: ${rest?.name ?? s.restaurant_id.slice(0, 8)}`,
      subtitle: `Plan ${s.plan_id} · ${new Date(s.canceled_at ?? '').toLocaleDateString('es', { day: 'numeric', month: 'short' })}`,
      restaurant_id: s.restaurant_id,
      restaurant_name: rest?.name ?? null,
      restaurant_slug: rest?.slug ?? null,
      amount: null,
      created_at: s.canceled_at ?? now.toISOString(),
      severity: 'danger',
    });
  }

  // Trials ending soon
  for (const s of trialsExpiring ?? []) {
    const rest = restMap.get(s.restaurant_id);
    const daysLeft = Math.ceil((new Date(s.trial_end!).getTime() - now.getTime()) / 86400000);
    events.push({
      id: `trial-${s.restaurant_id}`,
      type: 'trial_ending',
      title: `Trial vence en ${daysLeft}d: ${rest?.name ?? s.restaurant_id.slice(0, 8)}`,
      subtitle: `Plan ${s.plan_id} · ${new Date(s.trial_end!).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`,
      restaurant_id: s.restaurant_id,
      restaurant_name: rest?.name ?? null,
      restaurant_slug: rest?.slug ?? null,
      amount: null,
      created_at: now.toISOString(),
      severity: daysLeft <= 1 ? 'danger' : 'warning',
    });
  }

  // Past due
  for (const s of pastDueSubs ?? []) {
    const rest = restMap.get(s.restaurant_id);
    events.push({
      id: `pastdue-${s.restaurant_id}`,
      type: 'payment_failed',
      title: `Pago vencido: ${rest?.name ?? s.restaurant_id.slice(0, 8)}`,
      subtitle: `Plan ${s.plan_id} — revisar en Stripe`,
      restaurant_id: s.restaurant_id,
      restaurant_name: rest?.name ?? null,
      restaurant_slug: rest?.slug ?? null,
      amount: null,
      created_at: s.updated_at ?? now.toISOString(),
      severity: 'danger',
    });
  }

  // Sort: dangers first, then by date desc
  events.sort((a, b) => {
    const sev = { danger: 0, warning: 1, info: 2 };
    const sd = sev[a.severity] - sev[b.severity];
    if (sd !== 0) return sd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ events: events.slice(0, 40), generatedAt: now.toISOString() });
}
