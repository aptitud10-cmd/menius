import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  try {
    const adminDb = createAdminClient();

    // Simple query
    const { data, error } = await adminDb
      .from('restaurants')
      .select('id, name, slug, currency')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        error: 'Query error',
        details: { message: error.message, code: error.code }
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'Restaurant not found',
        slug,
        query: 'eq(slug) AND eq(is_active, true)'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      restaurant: data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}
