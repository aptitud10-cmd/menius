export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dev-apply');

const GITHUB_OWNER = 'aptitud10-cmd';
const GITHUB_REPO = 'menius';
const GITHUB_BRANCH = 'main';

interface FileChange {
  path: string;
  content: string;
  action: 'update' | 'create' | 'delete';
}

async function githubFetch(path: string, token: string, method = 'GET', body?: object) {
  const res = await fetch(`https://api.github.com/${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getFileSha(filePath: string, token: string): Promise<string | null> {
  try {
    const data = await githubFetch(
      `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      token
    );
    return data.sha ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) return NextResponse.json({ error: 'Missing GITHUB_TOKEN' }, { status: 500 });

    const body = await request.json();
    const { changes, commitMessage, conversationId } = body as {
      changes: FileChange[];
      commitMessage: string;
      conversationId?: string;
    };

    if (!changes?.length) return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    if (!commitMessage?.trim()) return NextResponse.json({ error: 'Commit message required' }, { status: 400 });

    const results: Array<{ path: string; status: 'ok' | 'error'; error?: string }> = [];

    // Apply each file change via GitHub Contents API
    for (const change of changes) {
      try {
        if (change.action === 'delete') {
          const sha = await getFileSha(change.path, githubToken);
          if (!sha) { results.push({ path: change.path, status: 'ok' }); continue; }
          await githubFetch(
            `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${change.path}`,
            githubToken,
            'DELETE',
            {
              message: commitMessage,
              sha,
              branch: GITHUB_BRANCH,
            }
          );
        } else {
          // Create or update
          const existingSha = await getFileSha(change.path, githubToken);
          const contentBase64 = Buffer.from(change.content, 'utf-8').toString('base64');
          const payload: Record<string, string> = {
            message: commitMessage,
            content: contentBase64,
            branch: GITHUB_BRANCH,
          };
          if (existingSha) payload.sha = existingSha;

          await githubFetch(
            `repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${change.path}`,
            githubToken,
            'PUT',
            payload
          );
        }
        results.push({ path: change.path, status: 'ok' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ path: change.path, status: 'error', error: msg });
        logger.error('Apply file error', { path: change.path, error: msg });
      }
    }

    // Log to conversation history if provided
    if (conversationId) {
      const db = createAdminClient();
      await db
        .from('dev_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    const allOk = results.every(r => r.status === 'ok');

    // Trigger deploy notification in background (fire and forget)
    if (allOk) {
      const adminEmail = process.env.ADMIN_EMAIL?.split(',')[0];
      if (adminEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app';
        // Get latest deployment ID to monitor
        const vercelToken = process.env.VERCEL_TOKEN;
        const vercelProjectId = process.env.VERCEL_PROJECT_ID ?? 'prj_pNFA4PgrneGbcu2KmhzkS6FWBwug';
        if (vercelToken) {
          fetch(`https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&limit=1`, {
            headers: { Authorization: `Bearer ${vercelToken}` },
          }).then(r => r.ok ? r.json() : null).then(json => {
            const deploymentId = json?.deployments?.[0]?.uid;
            if (deploymentId) {
              fetch(`${baseUrl}/api/admin/dev/notify-deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deploymentId, notifyEmail: adminEmail, commitMessage }),
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      ok: allOk,
      results,
      deployUrl: `https://vercel.com/${GITHUB_OWNER}`,
    });
  } catch (err) {
    logger.error('dev apply POST failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
