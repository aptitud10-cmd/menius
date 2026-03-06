import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function runFix() {
  const db = createAdminClient();

  // Fix products
  const { data: products, error: fetchError } = await db
    .from('products')
    .select('id, name')
    .ilike('name', '[ejemplo]%');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let fixedProducts = 0;
  const productErrors: string[] = [];

  if (products?.length) {
    for (const p of products) {
      const newName = p.name.replace(/^\[ejemplo\]\s*/i, '');
      const { error } = await db.from('products').update({ name: newName }).eq('id', p.id);
      if (error) productErrors.push(`product ${p.id}: ${error.message}`);
      else fixedProducts++;
    }
  }

  // Fix categories too (just in case)
  const { data: categories, error: catError } = await db
    .from('categories')
    .select('id, name')
    .ilike('name', '[ejemplo]%');

  let fixedCategories = 0;
  const categoryErrors: string[] = [];

  if (!catError && categories?.length) {
    for (const c of categories) {
      const newName = c.name.replace(/^\[ejemplo\]\s*/i, '');
      const { error } = await db.from('categories').update({ name: newName }).eq('id', c.id);
      if (error) categoryErrors.push(`category ${c.id}: ${error.message}`);
      else fixedCategories++;
    }
  }

  return NextResponse.json({
    ok: true,
    fixedProducts,
    totalProducts: products?.length ?? 0,
    fixedCategories,
    totalCategories: categories?.length ?? 0,
    errors: [...productErrors, ...categoryErrors],
  });
}

export async function GET() { return runFix(); }
export async function POST() { return runFix(); }
