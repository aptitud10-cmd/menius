export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertSource = 'uptime' | 'orders' | 'sentry' | 'stripe' | 'vercel' | 'cron';

export interface DevAlert {
  id: string;
  severity: AlertSeverity;
  source: AlertSource;
  title: string;
  description?: string;
  store_slug?: string;
  data?: Record<string, unknown>;
  resolved_at?: string;
  auto_diagnosed: boolean;
  created_at: string;
}

// ─── Shared helper — call from internal routes without auth ───────────────────
export async function createAlert(alert: Omit<DevAlert, 'id' | 'created_at' | 'auto_diagnosed'>) {
  const db = createAdminClient();
  const { data, error } = await db.from('dev_alerts').insert(alert).select().single();
  if (error) throw new Error(`dev_alerts insert: ${error.message}`);
  return data as DevAlert;
}

// ─── GET — list unresolved alerts (admin only) ────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const since = url.searchParams.get('since'); // ISO string for polling

  const db = createAdminClient();
  let q = db
    .from('dev_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    q = q.gt('created_at', since);
  } else {
    q = q.is('resolved_at', null); // default: only unresolved
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ alerts: data ?? [] });
}

// ─── POST — create alert (internal: called from crons/webhooks) ───────────────
export async function POST(request: NextRequest) {
  // Allow CRON_SECRET bearer OR admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron) {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const alert = await createAlert(body);
  return NextResponse.json({ ok: true, alert });
}

// ─── PATCH — resolve an alert ─────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id, auto_diagnosed } = await request.json();
  const db = createAdminClient();
  await db.from('dev_alerts').update({
    resolved_at: new Date().toISOString(),
    ...(auto_diagnosed !== undefined ? { auto_diagnosed } : {}),
  }).eq('id', id);

  return NextResponse.json({ ok: true });
}
