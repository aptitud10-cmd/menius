export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-anchors');

// GET /api/ai/anchors — list all anchors for current restaurant
export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('style_anchors')
      .select('id, category_name, anchor_url, style, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .order('category_name');

    if (error) {
      logger.error('Error fetching anchors', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ anchors: data ?? [] });
  } catch (err) {
    logger.error('GET anchors error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/ai/anchors — upsert anchor for a category
export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { category_name, anchor_url, style } = body;

    if (!category_name?.trim() || !anchor_url?.trim()) {
      return NextResponse.json(
        { error: 'category_name y anchor_url son requeridos' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('style_anchors')
      .upsert(
        {
          restaurant_id: tenant.restaurantId,
          category_name: category_name.trim(),
          anchor_url: anchor_url.trim(),
          style: style ?? null,
        },
        { onConflict: 'restaurant_id,category_name' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Error upserting anchor', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('Anchor upserted', { restaurantId: tenant.restaurantId, category: category_name });
    return NextResponse.json({ anchor: data });
  } catch (err) {
    logger.error('POST anchor error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/ai/anchors?category=Beverages — remove anchor for a category
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category_name = searchParams.get('category');

    if (!category_name) {
      return NextResponse.json({ error: 'Parámetro category requerido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('style_anchors')
      .delete()
      .eq('restaurant_id', tenant.restaurantId)
      .eq('category_name', category_name);

    if (error) {
      logger.error('Error deleting anchor', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('Anchor deleted', { restaurantId: tenant.restaurantId, category: category_name });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE anchor error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
