export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { sendEmail } from '@/lib/notifications/email';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? 'prj_pNFA4PgrneGbcu2KmhzkS6FWBwug';

interface VercelDeployment {
  uid: string;
  state: string;
  url: string;
  meta?: { githubCommitMessage?: string };
  createdAt: number;
}

// Poll a specific deployment until READY/ERROR then notify via email
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    if (!VERCEL_TOKEN) return NextResponse.json({ error: 'Missing VERCEL_TOKEN' }, { status: 500 });

    const { deploymentId, notifyEmail, commitMessage } = await request.json() as {
      deploymentId: string;
      notifyEmail?: string;
      commitMessage?: string;
    };

    if (!deploymentId) return NextResponse.json({ error: 'deploymentId required' }, { status: 400 });

    const adminEmail = notifyEmail ?? process.env.ADMIN_EMAIL?.split(',')[0];
    if (!adminEmail) return NextResponse.json({ error: 'No notification email' }, { status: 400 });

    // Poll in background (fire and forget)
    pollAndNotify(deploymentId, adminEmail, commitMessage ?? '').catch(() => {});

    return NextResponse.json({ ok: true, message: 'Monitoring deploy, will notify when done' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

async function pollAndNotify(deploymentId: string, email: string, commitMessage: string) {
  const maxAttempts = 40; // 40 × 15s = 10 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(15000);
    attempts++;

    try {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      if (!res.ok) continue;

      const deploy = await res.json() as VercelDeployment;
      const state = deploy.state;

      if (state === 'READY' || state === 'ERROR' || state === 'CANCELED') {
        const isSuccess = state === 'READY';
        const deployUrl = deploy.url ? `https://${deploy.url}` : 'https://menius.app';

        await sendEmail({
          to: email,
          subject: isSuccess
            ? `✅ Deploy completado — ${commitMessage || 'Menius Dev Tool'}`
            : `❌ Deploy falló — ${commitMessage || 'Menius Dev Tool'}`,
          html: `
            <div style="font-family: monospace; background: #111; color: #e5e7eb; padding: 24px; border-radius: 8px; max-width: 600px;">
              <h2 style="color: ${isSuccess ? '#4ade80' : '#f87171'}; margin: 0 0 16px;">
                ${isSuccess ? '✅ Deploy completado' : '❌ Deploy falló'}
              </h2>
              <p style="color: #9ca3af; margin: 0 0 8px;">
                <strong style="color: #e5e7eb;">Commit:</strong> ${commitMessage || 'Sin mensaje'}
              </p>
              <p style="color: #9ca3af; margin: 0 0 8px;">
                <strong style="color: #e5e7eb;">Estado:</strong> ${state}
              </p>
              <p style="color: #9ca3af; margin: 0 0 16px;">
                <strong style="color: #e5e7eb;">Deploy ID:</strong> ${deploymentId.slice(0, 16)}
              </p>
              ${isSuccess ? `
              <a href="${deployUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Ver en producción →
              </a>
              ` : `
              <a href="https://vercel.com/aptitud10-cmd/menius/deployments/${deploymentId}" style="display: inline-block; background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                Ver logs de error →
              </a>
              `}
              <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
                — Menius Dev Tool
              </p>
            </div>
          `,
        });
        return;
      }
    } catch { /* continue polling */ }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
