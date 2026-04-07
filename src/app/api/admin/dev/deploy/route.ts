export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dev-deploy');

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (!vercelToken || !vercelProjectId) {
      return NextResponse.json({ error: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&limit=5&target=production`,
      {
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error('Vercel API error', { status: res.status, text });
      return NextResponse.json({ error: 'Vercel API error', detail: text }, { status: 502 });
    }

    const json = await res.json();
    const deployments = (json.deployments ?? []).map((d: {
      uid: string;
      url: string;
      state: string;
      readyState: string;
      created: number;
      ready: number;
      name: string;
      meta?: { githubCommitMessage?: string; githubCommitRef?: string };
    }) => ({
      id: d.uid,
      url: `https://${d.url}`,
      state: d.readyState ?? d.state,
      createdAt: new Date(d.created).toISOString(),
      readyAt: d.ready ? new Date(d.ready).toISOString() : null,
      name: d.name,
      commitMessage: d.meta?.githubCommitMessage ?? null,
      branch: d.meta?.githubCommitRef ?? null,
    }));

    return NextResponse.json({ deployments });
  } catch (err) {
    logger.error('dev deploy GET failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
