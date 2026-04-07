export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── GET — list unresolved alerts (admin only) ────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const since = url.searchParams.get('since');

  const db = createAdminClient();
  let q = db
    .from('dev_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    q = q.gt('created_at', since);
  } else {
    q = q.is('resolved_at', null);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ alerts: data ?? [] });
}

// ─── POST — create alert (internal: called from crons/webhooks via CRON_SECRET) ─
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron) {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const db = createAdminClient();
  const { data, error } = await db.from('dev_alerts').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, alert: data });
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
