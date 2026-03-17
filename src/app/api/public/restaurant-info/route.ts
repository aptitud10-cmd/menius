import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
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
