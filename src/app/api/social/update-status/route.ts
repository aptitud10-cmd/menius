export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { post_db_id, success, external_post_id } = await request.json();

    if (!post_db_id) {
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
