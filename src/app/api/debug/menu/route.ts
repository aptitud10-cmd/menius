import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') ?? 'los-paisas';

  try {
    const db = createAdminClient();

    // Test 1: basic connection
    const { data: restaurant, error } = await db
      .from('restaurants')
      .select('id, name, slug, is_active')
      .eq('slug', slug)
      .single();

    // Test 2: count all restaurants
    const { count } = await db
      .from('restaurants')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      slug,
      restaurant,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
      totalRestaurants: count,
      usingServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 40) ?? 'NOT SET',
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 40) ?? 'NOT SET',
    });
  } catch (e: any) {
    return NextResponse.json({ fatal: e?.message }, { status: 500 });
  }
}
