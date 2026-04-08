import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Opt out of caching for all route segments

export async function POST(req: Request) {
  const { deploymentId } = await req.json();

  if (!deploymentId) {
    return NextResponse.json({ ok: false, error: 'Missing deploymentId' }, { status: 400 });
  }

  const VERCEL_DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!VERCEL_DEPLOY_HOOK_URL) {
    return NextResponse.json({ ok: false, error: 'VERCEL_DEPLOY_HOOK_URL not set' }, { status: 500 });
  }

  try {
    // Trigger a new deployment for the specific project
    const response = await fetch(VERCEL_DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deployHook: VERCEL_DEPLOY_HOOK_URL }), // Vercel deploy hooks don't typically require a body, but some CI setups might expect it
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vercel API error: ${response.status} ${errorText}`);
    }

    // Vercel deploy hooks usually return a 200/202 status without a body for successful triggers.
    // If a specific response is expected, adjust accordingly.
    return NextResponse.json({ ok: true, message: 'Deployment re-triggered successfully.' });
  } catch (error) {
    console.error('Error re-triggering Vercel deployment:', error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
