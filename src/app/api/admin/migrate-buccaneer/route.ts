export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';

// Temporary one-time migration route — DELETE after use
// GET /api/admin/migrate-buccaneer

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const supabase = createAdminClient();
  const log: string[] = [];

  try {
    // ── Find Buccaneer ──────────────────────────────────────
    const { data: restaurant, error: rErr } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', 'buccaneer')
      .single();

    if (rErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurant "buccaneer" not found', detail: rErr?.message }, { status: 404 });
    }
    const rid = restaurant.id;
    log.push(`✅ Found Buccaneer: ${rid}`);

    // ── Fetch all categories ────────────────────────────────
    const { data: allCats, error: cErr } = await supabase
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', rid);

    if (cErr || !allCats) {
      return NextResponse.json({ error: 'Failed to fetch categories', detail: cErr?.message }, { status: 500 });
    }

    const byName = (name: string) => allCats.find(c => c.name === name)?.id;

    // ── Helper: move products from sourceIds → targetId ────
    async function moveProducts(targetId: string, sourceNames: string[]) {
      const sourceIds = sourceNames.map(n => byName(n)).filter(Boolean) as string[];
      if (sourceIds.length === 0) return;
      const { error } = await supabase
        .from('products')
        .update({ category_id: targetId })
        .eq('restaurant_id', rid)
        .in('category_id', sourceIds);
      if (error) throw new Error(`moveProducts failed: ${error.message}`);
    }

    // ── Helper: delete categories by name ──────────────────
    async function deleteCats(names: string[]) {
      const ids = names.map(n => byName(n)).filter(Boolean) as string[];
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', ids);
      if (error) throw new Error(`deleteCats failed: ${error.message}`);
    }

    // ── Helper: rename + reorder a category ───────────────
    async function renameCat(oldName: string, newName: string, sortOrder: number) {
      const id = byName(oldName);
      if (!id) throw new Error(`Category "${oldName}" not found`);
      const { error } = await supabase
        .from('categories')
        .update({ name: newName, sort_order: sortOrder })
        .eq('id', id);
      if (error) throw new Error(`renameCat "${oldName}" → "${newName}" failed: ${error.message}`);
    }

    // ── Helper: update sort_order only ────────────────────
    async function reorderCat(name: string, sortOrder: number) {
      const id = byName(name);
      if (!id) { log.push(`⚠️  Category "${name}" not found, skipping`); return; }
      const { error } = await supabase
        .from('categories')
        .update({ sort_order: sortOrder })
        .eq('id', id);
      if (error) throw new Error(`reorderCat "${name}" failed: ${error.message}`);
    }

    // ══════════════════════════════════════════════════════
    // 1. BREAKFAST — keep Omelettes, merge 8 others into it
    // ══════════════════════════════════════════════════════
    const breakfastTarget = byName('Omelettes');
    if (!breakfastTarget) throw new Error('Category "Omelettes" not found');
    await moveProducts(breakfastTarget, [
      'Juices & Fruits', 'Farm Fresh Eggs', 'Benedicts & Brunch',
      'Pancakes', 'French Toast', 'Waffles', 'Bagels & Bakery', 'Breakfast Wraps',
    ]);
    await renameCat('Omelettes', 'Breakfast', 1);
    await deleteCats([
      'Juices & Fruits', 'Farm Fresh Eggs', 'Benedicts & Brunch',
      'Pancakes', 'French Toast', 'Waffles', 'Bagels & Bakery', 'Breakfast Wraps',
    ]);
    log.push('1. ✅ Breakfast');

    // ══════════════════════════════════════════════════════
    // 2. SANDWICHES & WRAPS — keep Sandwiches, merge 2 others
    // ══════════════════════════════════════════════════════
    const sandwichTarget = byName('Sandwiches');
    if (!sandwichTarget) throw new Error('Category "Sandwiches" not found');
    await moveProducts(sandwichTarget, ['Chicken Sandwiches', 'Panini & Wraps']);
    await renameCat('Sandwiches', 'Sandwiches & Wraps', 2);
    await deleteCats(['Chicken Sandwiches', 'Panini & Wraps']);
    log.push('2. ✅ Sandwiches & Wraps');

    // ══════════════════════════════════════════════════════
    // 3. BURGERS — sort_order only
    // ══════════════════════════════════════════════════════
    await reorderCat('Burgers', 3);
    log.push('3. ✅ Burgers');

    // ══════════════════════════════════════════════════════
    // 4. SOUPS & SALADS — sort_order only
    // ══════════════════════════════════════════════════════
    await reorderCat('Soups & Salads', 4);
    log.push('4. ✅ Soups & Salads');

    // ══════════════════════════════════════════════════════
    // 5. MAINS & STEAKS — keep Entrees & Steaks, merge 4 others
    // ══════════════════════════════════════════════════════
    const mainsTarget = byName('Entrees & Steaks');
    if (!mainsTarget) throw new Error('Category "Entrees & Steaks" not found');
    await moveProducts(mainsTarget, ['Seafood', 'Italian & Pasta', 'Greek Corner', 'Signature Dishes']);
    await renameCat('Entrees & Steaks', 'Mains & Steaks', 5);
    await deleteCats(['Seafood', 'Italian & Pasta', 'Greek Corner', 'Signature Dishes']);
    log.push('5. ✅ Mains & Steaks');

    // ══════════════════════════════════════════════════════
    // 6. APPETIZERS & SIDES — keep Appetizers, merge Side Orders
    // ══════════════════════════════════════════════════════
    const appetizersTarget = byName('Appetizers');
    if (!appetizersTarget) throw new Error('Category "Appetizers" not found');
    await moveProducts(appetizersTarget, ['Side Orders']);
    await renameCat('Appetizers', 'Appetizers & Sides', 6);
    await deleteCats(['Side Orders']);
    log.push('6. ✅ Appetizers & Sides');

    // ══════════════════════════════════════════════════════
    // 7. COCKTAILS — sort_order only
    // ══════════════════════════════════════════════════════
    await reorderCat('Cocktails', 7);
    log.push('7. ✅ Cocktails');

    // ══════════════════════════════════════════════════════
    // 8. COFFEE & DRINKS — keep Coffee & Hot Drinks, merge Smoothies & Beverages
    // ══════════════════════════════════════════════════════
    const coffeeTarget = byName('Coffee & Hot Drinks');
    if (!coffeeTarget) throw new Error('Category "Coffee & Hot Drinks" not found');
    await moveProducts(coffeeTarget, ['Smoothies & Beverages']);
    await renameCat('Coffee & Hot Drinks', 'Coffee & Drinks', 8);
    await deleteCats(['Smoothies & Beverages']);
    log.push('8. ✅ Coffee & Drinks');

    // ══════════════════════════════════════════════════════
    // 9. DESSERTS — merge Ice Cream & Fountain into Desserts
    // ══════════════════════════════════════════════════════
    const dessertsTarget = byName('Desserts');
    if (!dessertsTarget) throw new Error('Category "Desserts" not found');
    await moveProducts(dessertsTarget, ['Ice Cream & Fountain']);
    await reorderCat('Desserts', 9);
    await deleteCats(['Ice Cream & Fountain']);
    log.push('9. ✅ Desserts');

    // ══════════════════════════════════════════════════════
    // 10. DAILY SPECIALS — new empty category
    // ══════════════════════════════════════════════════════
    const { error: insertErr } = await supabase
      .from('categories')
      .insert({ restaurant_id: rid, name: 'Daily Specials', sort_order: 10, is_active: true });
    if (insertErr) throw new Error(`Failed to create Daily Specials: ${insertErr.message}`);
    log.push('10. ✅ Daily Specials (created)');

    log.push('');
    log.push('🎉 Migration complete! Buccaneer now has 10 categories.');

    return NextResponse.json({ success: true, log });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.push(`❌ Error: ${message}`);
    return NextResponse.json({ success: false, log, error: message }, { status: 500 });
  }
}
