export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

// Temporary route — marks top products per category as featured in Buccaneer
// GET /api/admin/feature-buccaneer

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const supabase = createAdminClient();
  const log: string[] = [];

  // Find Buccaneer
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'buccaneer')
    .single();

  if (!restaurant) return NextResponse.json({ error: 'Buccaneer not found' }, { status: 404 });
  const rid = restaurant.id;

  // Fetch all active products with their categories
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, category_id, is_featured')
    .eq('restaurant_id', rid)
    .eq('is_active', true)
    .order('price', { ascending: false });

  if (error || !products) return NextResponse.json({ error: error?.message }, { status: 500 });

  // Group by category, pick top 1 per category (highest price = likely signature item)
  const topByCategory = new Map<string, { id: string; name: string; price: number }>();
  for (const p of products) {
    if (!topByCategory.has(p.category_id)) {
      topByCategory.set(p.category_id, { id: p.id, name: p.name, price: Number(p.price) });
    }
  }

  const toFeature = Array.from(topByCategory.values());
  const ids = toFeature.map(p => p.id);

  // First clear all existing featured flags for this restaurant
  await supabase
    .from('products')
    .update({ is_featured: false })
    .eq('restaurant_id', rid);

  // Mark selected products as featured
  const { error: updateErr } = await supabase
    .from('products')
    .update({ is_featured: true })
    .in('id', ids);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  for (const p of toFeature) {
    log.push(`⭐ ${p.name} — $${p.price}`);
  }

  log.push('');
  log.push(`✅ ${toFeature.length} products marked as featured (1 per category)`);

  return NextResponse.json({ success: true, log });
}
