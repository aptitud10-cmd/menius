export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCCANEER_SLUG } from '@/lib/buccaneer';

/**
 * Marks one product per category as featured (highest price per category) for Buccaneer.
 * POST only — avoids accidental triggers from crawlers or prefetch on GET.
 *
 * Legacy: GET was supported; returns 405 with hint to use POST.
 */

async function runFeatureBuccaneer(): Promise<NextResponse> {
  const supabase = createAdminClient();
  const log: string[] = [];

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', BUCCANEER_SLUG)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: `Restaurant "${BUCCANEER_SLUG}" not found` }, { status: 404 });
  }
  const rid = restaurant.id;

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, category_id, is_featured')
    .eq('restaurant_id', rid)
    .eq('is_active', true)
    .order('price', { ascending: false });

  if (error || !products) {
    return NextResponse.json({ error: error?.message ?? 'Failed to load products' }, { status: 500 });
  }

  const topByCategory = new Map<string, { id: string; name: string; price: number }>();
  for (const p of products) {
    if (!topByCategory.has(p.category_id)) {
      topByCategory.set(p.category_id, { id: p.id, name: p.name, price: Number(p.price) });
    }
  }

  const toFeature = Array.from(topByCategory.values());
  const ids = toFeature.map((p) => p.id);

  await supabase.from('products').update({ is_featured: false }).eq('restaurant_id', rid);

  const { error: updateErr } = await supabase.from('products').update({ is_featured: true }).in('id', ids);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  for (const p of toFeature) {
    log.push(`⭐ ${p.name} — $${p.price}`);
  }
  log.push('');
  log.push(`✅ ${toFeature.length} products marked as featured (1 per category)`);

  return NextResponse.json({ success: true, log });
}

export async function POST(_req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return runFeatureBuccaneer();
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      hint: 'Use POST /api/admin/feature-buccaneer (admin session required). GET is disabled to avoid accidental runs.',
    },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
