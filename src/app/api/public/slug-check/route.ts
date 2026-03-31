import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug || slug.length < 2) {
    return NextResponse.json({ available: false, reason: 'too_short' });
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
