export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const db = createAdminClient();

  const { data: restaurant } = await db
    .from('restaurants')
    .select('id, name, slug, is_active, created_at, owner_user_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurant) return NextResponse.json({ error: 'restaurant not found', slug });

  const [
    { data: categories },
    { data: allProducts },
    { data: recentProducts },
  ] = await Promise.all([
    db.from('categories')
      .select('id, name, is_active, sort_order, available_from, available_to, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order'),
    db.from('products')
      .select('id, name, is_active, in_stock, category_id, restaurant_id, created_at')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('products')
      .select('id, name, is_active, in_stock, category_id, restaurant_id, created_at')
      .ilike('name', '%fruit%')
      .limit(10),
  ]);

  return NextResponse.json({
    restaurant,
    categories,
    recentProducts: allProducts,
    anyFruitProducts: recentProducts,
    summary: {
      totalCategories: categories?.length ?? 0,
      activeCategories: categories?.filter(c => c.is_active).length ?? 0,
      totalProductsShown: allProducts?.length ?? 0,
      activeProductsShown: allProducts?.filter(p => p.is_active).length ?? 0,
    },
  });
}
