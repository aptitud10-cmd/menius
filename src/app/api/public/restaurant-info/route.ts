import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimitAsync(`restaurant-info:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ locale: 'es' });

  try {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from('restaurants')
      .select('locale, name, currency')
      .eq('slug', slug)
      .maybeSingle();
    return NextResponse.json({
      locale: data?.locale ?? 'es',
      name: data?.name ?? '',
      currency: data?.currency ?? 'MXN',
    });
  } catch {
    return NextResponse.json({ locale: 'es' });
  }
}
