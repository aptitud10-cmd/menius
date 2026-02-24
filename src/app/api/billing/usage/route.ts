export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';

export async function GET() {
  try {
    const supabase = createClient();
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const rid = tenant.restaurantId;

    const [products, categories, tables] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid),
      supabase.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid),
      supabase.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid),
    ]);

    return NextResponse.json({
      products: products.count ?? 0,
      categories: categories.count ?? 0,
      tables: tables.count ?? 0,
    });
  } catch {
    return NextResponse.json({ products: 0, categories: 0, tables: 0 });
  }
}
