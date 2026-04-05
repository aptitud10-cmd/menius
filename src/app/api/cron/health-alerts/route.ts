export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/notifications/email';
import { PLANS } from '@/lib/plans';

const logger = createLogger('health-alerts');

const ALERT_THRESHOLDS = {
  stuckOrdersMin: 1,
  cancellationsMin: 3,
  trialsExpiringMin: 5,
};

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) {
    logger.warn('ADMIN_ALERT_EMAIL not configured — skipping health alerts');
    return NextResponse.json({ skipped: true, reason: 'ADMIN_ALERT_EMAIL not set' });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d7ahead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: stuckOrders, count: stuckCount },
    { data: trialsExpiring },
    { data: cancelledSubs },
    { data: allSubs },
    { data: recentOrders7d },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, restaurant_id, total, created_at', { count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', h24ago)
      .limit(20),

    supabase
      .from('subscriptions')
      .select('restaurant_id, trial_end, plan_id')
      .eq('status', 'trialing')
      .lte('trial_end', d7ahead)
      .gte('trial_end', now.toISOString())
      .order('trial_end'),

    supabase
      .from('subscriptions')
      .select('restaurant_id, canceled_at, plan_id')
      .eq('status', 'canceled')
      .gte('canceled_at', d7ago)
      .order('canceled_at', { ascending: false })
      .limit(20),

    supabase
      .from('subscriptions')
      .select('plan_id, status'),

    supabase
      .from('orders')
      .select('total')
      .in('status', ['completed', 'delivered', 'ready'])
      .gte('created_at', d7ago),
  ]);

  const PLAN_PRICES: Record<string, number> = Object.fromEntries(
    Object.values(PLANS).map(p => [p.id, p.price.monthly])
  );
  const activeSubs = (allSubs ?? []).filter(s => s.status === 'active' || s.status === 'trialing');
  const mrrEstimate = activeSubs.reduce((s, sub) => s + (PLAN_PRICES[sub.plan_id] ?? 0), 0);
  const revenue7d = (recentOrders7d ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);

  const alertsTriggered: string[] = [];

  if ((stuckCount ?? 0) >= ALERT_THRESHOLDS.stuckOrdersMin) {
    alertsTriggered.push('stuck_orders');
  }
  if ((cancelledSubs ?? []).length >= ALERT_THRESHOLDS.cancellationsMin) {
    alertsTriggered.push('high_churn');
  }
  if ((trialsExpiring ?? []).length >= ALERT_THRESHOLDS.trialsExpiringMin) {
    alertsTriggered.push('trials_expiring');
  }

  if (alertsTriggered.length === 0) {
    logger.info('health-alerts cron: no alerts triggered', { mrrEstimate, revenue7d });
    return NextResponse.json({ ok: true, alertsTriggered: [], mrrEstimate, revenue7d });
  }

  const emailHtml = buildAlertEmail({
    checkedAt: now.toISOString(),
    alertsTriggered,
    stuckCount: stuckCount ?? 0,
    stuckOrders: stuckOrders ?? [],
    cancellations: cancelledSubs ?? [],
    trialsExpiring: trialsExpiring ?? [],
    mrrEstimate,
    revenue7d,
  });

  const sent = await sendEmail({
    to: adminEmail,
    subject: `🚨 MENIUS Health Alert — ${alertsTriggered.join(', ')}`,
    html: emailHtml,
  });

  logger.info('health-alerts cron: alerts sent', { alertsTriggered, sent });

  return NextResponse.json({ ok: true, alertsTriggered, sent });
}

interface AlertEmailParams {
  checkedAt: string;
  alertsTriggered: string[];
  stuckCount: number;
  stuckOrders: Array<{ id: string; order_number: string | null; total: number | null; created_at: string }>;
  cancellations: Array<{ restaurant_id: string; canceled_at: string | null; plan_id: string }>;
  trialsExpiring: Array<{ restaurant_id: string; trial_end: string | null; plan_id: string }>;
  mrrEstimate: number;
  revenue7d: number;
}

function buildAlertEmail(p: AlertEmailParams): string {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const date = new Date(p.checkedAt).toLocaleString('es-MX', { timeZone: 'UTC' });

  const stuckRows = p.stuckOrders.map(o =>
    `<tr><td style="padding:4px 8px">#${o.order_number ?? o.id.slice(0, 8)}</td><td style="padding:4px 8px">${fmt(Number(o.total ?? 0))}</td><td style="padding:4px 8px">${new Date(o.created_at).toLocaleString('es-MX')}</td></tr>`
  ).join('');

  const cancelRows = p.cancellations.map(s =>
    `<tr><td style="padding:4px 8px">${s.restaurant_id}</td><td style="padding:4px 8px">${s.plan_id}</td><td style="padding:4px 8px">${s.canceled_at ? new Date(s.canceled_at).toLocaleDateString('es-MX') : '-'}</td></tr>`
  ).join('');

  const trialRows = p.trialsExpiring.map(s => {
    const daysLeft = s.trial_end ? Math.ceil((new Date(s.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : '?';
    return `<tr><td style="padding:4px 8px">${s.restaurant_id}</td><td style="padding:4px 8px">${s.plan_id}</td><td style="padding:4px 8px">${daysLeft} días</td></tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>MENIUS Health Alert</title></head>
<body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;padding:32px 0">
  <div style="max-width:640px;margin:0 auto;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden">
    <div style="background:#dc2626;padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#fff">🚨 MENIUS — Alerta de Salud</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#fca5a5">${date} UTC</p>
    </div>

    <div style="padding:24px 32px">
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:#1a1a1a;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:12px;color:#666">MRR estimado</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#10b981">${fmt(p.mrrEstimate)}</p>
        </div>
        <div style="flex:1;background:#1a1a1a;border-radius:12px;padding:16px">
          <p style="margin:0;font-size:12px;color:#666">Revenue 7d</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#3b82f6">${fmt(p.revenue7d)}</p>
        </div>
      </div>

      ${p.stuckCount > 0 ? `
      <div style="margin-bottom:24px">
        <h2 style="margin:0 0 12px;font-size:15px;color:#ef4444">⚠️ Órdenes atascadas (${p.stuckCount})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="color:#666;border-bottom:1px solid #222">
            <th style="padding:4px 8px;text-align:left">Orden</th>
            <th style="padding:4px 8px;text-align:left">Total</th>
            <th style="padding:4px 8px;text-align:left">Creada</th>
          </tr></thead>
          <tbody>${stuckRows}</tbody>
        </table>
      </div>` : ''}

      ${p.cancellations.length > 0 ? `
      <div style="margin-bottom:24px">
        <h2 style="margin:0 0 12px;font-size:15px;color:#f59e0b">📉 Cancelaciones recientes (${p.cancellations.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="color:#666;border-bottom:1px solid #222">
            <th style="padding:4px 8px;text-align:left">Restaurant ID</th>
            <th style="padding:4px 8px;text-align:left">Plan</th>
            <th style="padding:4px 8px;text-align:left">Fecha</th>
          </tr></thead>
          <tbody>${cancelRows}</tbody>
        </table>
      </div>` : ''}

      ${p.trialsExpiring.length > 0 ? `
      <div style="margin-bottom:24px">
        <h2 style="margin:0 0 12px;font-size:15px;color:#8b5cf6">⏳ Trials por vencer (${p.trialsExpiring.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="color:#666;border-bottom:1px solid #222">
            <th style="padding:4px 8px;text-align:left">Restaurant ID</th>
            <th style="padding:4px 8px;text-align:left">Plan</th>
            <th style="padding:4px 8px;text-align:left">Tiempo restante</th>
          </tr></thead>
          <tbody>${trialRows}</tbody>
        </table>
      </div>` : ''}

      <div style="margin-top:24px;padding-top:24px;border-top:1px solid #222;text-align:center">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app'}/admin/health"
           style="display:inline-block;padding:10px 24px;background:#fff;color:#000;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none">
          Ver Dashboard de Salud →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
