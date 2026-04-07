export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAlert } from '@/app/api/admin/dev/alerts/route';
import { createLogger } from '@/lib/logger';

const logger = createLogger('webhook-sentry');

// Sentry sends a webhook signature in the header sentry-hook-signature
// We verify it using SENTRY_WEBHOOK_SECRET
async function verifySentrySignature(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret) return true; // if no secret configured, allow (set secret in Sentry dashboard)

  const signature = request.headers.get('sentry-hook-signature');
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sigBytes = Buffer.from(signature, 'hex');
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
  return valid;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const valid = await verifySentrySignature(request, rawBody);
  if (!valid) {
    logger.warn('Sentry webhook signature invalid');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = request.headers.get('sentry-hook-resource') ?? (payload.action as string);
  const data = payload.data as Record<string, unknown> ?? {};

  // Handle issue alerts
  if (action === 'issue' || action === 'event_alert') {
    const issue = (data.issue ?? data) as Record<string, unknown>;
    const title = (issue.title ?? issue.message ?? 'Unknown error') as string;
    const level = (issue.level ?? 'error') as string;
    const culprit = (issue.culprit ?? '') as string;
    const url = (issue.permalink ?? '') as string;
    const count = Number(issue.times_seen ?? 1);

    // Determine severity
    const severity = level === 'fatal' || level === 'critical' ? 'critical'
      : level === 'error' ? (count > 10 ? 'critical' : 'warning')
      : 'info';

    // Try to identify which store this affects from culprit
    const slugMatch = culprit.match(/\/([a-z0-9-]+)\//);
    const storeSlug = slugMatch?.[1] ?? undefined;

    await createAlert({
      severity,
      source: 'sentry',
      title: `[Sentry] ${title}`,
      description: `${culprit ? `En: ${culprit}\n` : ''}${count} ocurrencia(s). Nivel: ${level}.${url ? ` [Ver en Sentry](${url})` : ''}`,
      store_slug: storeSlug,
      data: { sentryUrl: url, level, count, culprit },
    });

    logger.info('Sentry alert created', { title, level, count });
  }

  return NextResponse.json({ ok: true });
}
