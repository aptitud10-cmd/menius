import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * DEBUG endpoint to test restaurant fetching
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  try {
    const adminDb = createAdminClient();

    // Test 1: Simple query
    const { data, error } = await adminDb
      .from('restaurants')
      .select('id, name, slug, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    return NextResponse.json({
      debug: true,
      slug,
      query: {
        data,
        error: error ? { message: error.message, code: error.code } : null,
      },
      env: {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
