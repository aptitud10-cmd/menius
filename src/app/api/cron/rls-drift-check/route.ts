export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/notifications/email';

const logger = createLogger('rls-drift-check');

/**
 * RLS drift detector.
 *
 * Three separate incidents this codebase has hit: someone opens a permissive RLS
 * policy (USING(true) / WITH CHECK(true)) for anon/public in the Supabase dashboard
 * to unblock a feature, it never makes it into a migration, and it silently exposes
 * data (orders PII, push keys, device PII, billing history). This cron scans prod
 * for exactly that shape and alerts so the next one is caught in days, not by an audit.
 *
 * It flags any policy that is permissive (true) AND reaches anon/public/authenticated,
 * minus an explicit allowlist of policies we've reviewed and accepted.
 */

// Policies known to be permissive on purpose, after review. Keep this list short and
// justified — every entry is a decision to expose that data publicly.
const ACCEPTED: ReadonlyArray<{ table: string; policy: string; why: string }> = [
  { table: 'restaurants', policy: 'public_read_restaurant_by_slug', why: 'the public menu must read the restaurant by slug' },
  { table: 'product_pairings', policy: 'public_read_pairings', why: 'non-sensitive menu metadata, read by the public menu via anon' },
  { table: 'master_style_anchors', policy: 'Anyone can read master style anchors', why: 'design metadata, no customer/business data (audit: LOW)' },
];

const isAccepted = (table: string, policy: string) =>
  ACCEPTED.some((a) => a.table === table && a.policy === policy);

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;

  const db = createAdminClient();

  // Find permissive policies reachable by untrusted roles. `qual`/`with_check` of
  // 'true' means no row filtering. service_role is fine (it's server-only).
  const { data, error } = await db.rpc('exec_readonly_sql', {
    sql_query: `
      SELECT
        schemaname,
        tablename,
        policyname,
        cmd,
        roles::text AS roles,
        COALESCE(qual, '') AS using_expr,
        COALESCE(with_check, '') AS check_expr
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (roles::text LIKE '%anon%' OR roles::text LIKE '%authenticated%' OR roles::text = '{public}')
        -- Only READ exposure matters: SELECT/ALL with an unfiltered USING(true).
        -- INSERT ... WITH CHECK(true) is the normal public-form pattern (create-only,
        -- no read) and is not a data leak, so it's deliberately excluded.
        AND cmd IN ('SELECT', 'ALL')
        AND btrim(COALESCE(qual, '')) = 'true'
      ORDER BY tablename, policyname
    `,
  });

  if (error) {
    logger.error('rls-drift-check: query failed', { error: error.message });
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    tablename: string;
    policyname: string;
    cmd: string;
    roles: string;
    using_expr: string;
    check_expr: string;
  }>;

  const flagged = rows.filter((r) => !isAccepted(r.tablename, r.policyname));

  if (flagged.length === 0) {
    logger.info('rls-drift-check: clean', { scanned: rows.length });
    return NextResponse.json({ ok: true, flagged: [] });
  }

  logger.warn('rls-drift-check: permissive policies found', {
    count: flagged.length,
    policies: flagged.map((f) => `${f.tablename}.${f.policyname}`),
  });

  if (adminEmail) {
    const list = flagged
      .map(
        (f) =>
          `<li><b>${f.tablename}</b> — policy <code>${f.policyname}</code> (${f.cmd}, roles ${f.roles})` +
          `${f.using_expr === 'true' ? ' USING(true)' : ''}${f.check_expr === 'true' ? ' WITH CHECK(true)' : ''}</li>`,
      )
      .join('');
    await sendEmail({
      to: adminEmail,
      subject: `🔓 MENIUS RLS drift — ${flagged.length} permissive ${flagged.length === 1 ? 'policy' : 'policies'}`,
      html: `
        <p>The RLS drift check found permissive policies (no row filtering) reachable by anon/public/authenticated in prod.</p>
        <p>These expose every row of the table to untrusted clients. Review each: either scope it, drop it (writes can go through the admin client server-side), or add it to the ACCEPTED allowlist in <code>rls-drift-check/route.ts</code> if it's intentional.</p>
        <ul>${list}</ul>
      `,
    });
  }

  return NextResponse.json({
    ok: true,
    flagged: flagged.map((f) => ({ table: f.tablename, policy: f.policyname, cmd: f.cmd, roles: f.roles })),
  });
}
