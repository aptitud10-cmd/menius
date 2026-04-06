import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimitAsync(`slug-check:${ip}`, { limit: 30, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ available: false, reason: 'rate_limited' }, { status: 429 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, reason: 'too_short' });
  }
  if (slug.length > 60) {
    return NextResponse.json({ available: false, reason: 'too_long' });
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid_chars' });
  }

  const reserved = ['app', 'api', 'admin', 'www', 'mail', 'help', 'support', 'menius', 'demo', 'test'];
  if (reserved.includes(slug)) {
    return NextResponse.json({ available: false, reason: 'reserved' });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
