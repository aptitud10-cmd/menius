import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function runFix() {
  const db = createAdminClient();

  // Fetch all products whose name starts with [Ejemplo]
  const { data: products, error: fetchError } = await db
    .from('products')
    .select('id, name')
    .like('name', '[Ejemplo]%');

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!products?.length) {
    return NextResponse.json({ message: 'No products with [Ejemplo] found', fixed: 0 });
  }

  // Strip "[Ejemplo] " prefix from each name
  const updates = products.map((p) => ({
    id: p.id,
    name: p.name.replace(/^\[Ejemplo\]\s*/i, ''),
  }));

  let fixed = 0;
  const errors: string[] = [];

  for (const u of updates) {
    const { error } = await db
      .from('products')
      .update({ name: u.name })
      .eq('id', u.id);
    if (error) errors.push(`${u.id}: ${error.message}`);
    else fixed++;
  }

  return NextResponse.json({ fixed, total: products.length, errors });
}

export async function GET() { return runFix(); }
export async function POST() { return runFix(); }
