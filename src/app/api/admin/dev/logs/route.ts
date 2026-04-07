export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dev-logs');

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (!vercelToken || !vercelProjectId) {
      return NextResponse.json({ error: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID' }, { status: 500 });
    }

    const deployId = request.nextUrl.searchParams.get('deployId');

    // If no specific deploy requested, return latest deploy ID for polling
    if (!deployId) {
      const res = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&limit=1&target=production`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );
      if (!res.ok) return NextResponse.json({ error: 'Vercel API error' }, { status: 502 });
      const json = await res.json();
      const latest = json.deployments?.[0];
      if (!latest) return NextResponse.json({ logs: [], deployId: null });
      return NextResponse.json({
        deployId: latest.uid,
        state: latest.readyState ?? latest.state,
        url: `https://${latest.url}`,
        createdAt: new Date(latest.created).toISOString(),
        logs: [],
      });
    }

    // Fetch build logs for specific deployment
    const res = await fetch(
      `https://api.vercel.com/v2/deployments/${deployId}/events?builds=1&limit=100`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error('Vercel logs error', { status: res.status, text });
      return NextResponse.json({ error: 'Vercel API error', logs: [] }, { status: 502 });
    }

    const text = await res.text();

    // Vercel returns NDJSON (newline-delimited JSON)
    const logs: Array<{
      type: string;
      created: number;
      text?: string;
      payload?: { text?: string; info?: { type?: string } };
    }> = text
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    const formatted = logs
      .filter(l => l.type === 'stdout' || l.type === 'stderr' || l.type === 'command' || l.type === 'deployment-state')
      .map(l => ({
        type: l.type,
        ts: l.created ? new Date(l.created).toISOString() : null,
        text: l.payload?.text ?? l.text ?? '',
        level: l.type === 'stderr' ? 'error' : 'info',
      }))
      .filter(l => l.text.trim());

    // Also get current deploy state
    const stateRes = await fetch(
      `https://api.vercel.com/v13/deployments/${deployId}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    let state = 'UNKNOWN';
    let deployUrl = '';
    if (stateRes.ok) {
      const stateJson = await stateRes.json();
      state = stateJson.readyState ?? stateJson.status ?? 'UNKNOWN';
      deployUrl = stateJson.url ? `https://${stateJson.url}` : '';
    }

    return NextResponse.json({ logs: formatted, state, deployId, url: deployUrl });
  } catch (err) {
    logger.error('dev logs GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno', logs: [] }, { status: 500 });
  }
}
