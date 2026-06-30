export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UUID_RE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // Called by the n8n social workflow (service-to-service). Uses the same
    // shared secret as the crons — without it, anyone could flip the publish
    // state of any post via this service-role write. Fail closed if unset.
    // Accept either CRON_SECRET (the platform-wide cron secret) or
    // MENIUS_CRON_SECRET — the n8n social workflow has historically used the
    // latter name, so allowing both avoids a silent 401 from a naming mismatch.
    const accepted = [process.env.CRON_SECRET, process.env.MENIUS_CRON_SECRET]
      .filter(Boolean)
      .map((s) => `Bearer ${s}`);
    const auth = request.headers.get('authorization');
    if (accepted.length === 0 || !auth || !accepted.includes(auth)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { post_db_id, success, external_post_id } = await request.json();

    if (!post_db_id || typeof post_db_id !== 'string' || !UUID_RE.test(post_db_id)) {
      return NextResponse.json({ error: 'post_db_id required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase
      .from('menius_posts')
      .update({
        status: success ? 'published' : 'sent',
        ...(external_post_id ? { external_post_id } : {}),
        published_at: success ? new Date().toISOString() : null,
      })
      .eq('id', post_db_id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
