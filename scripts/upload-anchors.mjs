/**
 * Uploads the reviewed anchor images to Supabase storage and registers each one
 * as its category's style anchor.
 *
 * Kept separate from generate-anchors.mjs on purpose: generation is cheap and
 * repeatable, but writing style_anchors is what makes an image propagate to
 * every dish in its category. Nothing should reach this script until a human has
 * looked at the picture.
 *
 * Usage: node scripts/upload-anchors.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SLUG = 'buccaneer';
const DIR = 'scripts/.anchor-output';
const BUCKET = 'product-images';

// file key → the category_name style_anchors is keyed by. These must match the
// category names in the database exactly; a typo silently creates an anchor that
// no product will ever read.
const MAP = {
  'side-orders': 'Side Orders',
  'appetizers': 'Appetizers',
  'seafood': 'Seafood',
  'salads': 'Gourmet Salads',
  'burgers-7oz': '7 oz. Certified Angus Beef Burgers',
  'sandwiches': 'Signature Sandwiches',
};

function envVar(name) {
  const fromEnv = (process.env[name] ?? '').trim();
  if (fromEnv) return fromEnv;
  try {
    const m = readFileSync('.env.local', 'utf8').match(
      new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'),
    );
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return null;
}

const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = envVar('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  console.error(
    'Faltan credenciales en .env.local:\n' +
      `  NEXT_PUBLIC_SUPABASE_URL   ${url ? 'ok' : 'AUSENTE'}\n` +
      `  SUPABASE_SERVICE_ROLE_KEY  ${serviceKey ? 'ok' : 'AUSENTE'}`,
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: restaurant, error: rErr } = await db
  .from('restaurants')
  .select('id')
  .eq('slug', SLUG)
  .single();
if (rErr || !restaurant) {
  console.error('No se encontró el restaurante:', rErr?.message);
  process.exit(1);
}

// Real category names, to catch a mismatch before it becomes a dead anchor.
const { data: cats } = await db
  .from('categories')
  .select('name')
  .eq('restaurant_id', restaurant.id);
const known = new Set((cats ?? []).map((c) => c.name));

for (const [key, category] of Object.entries(MAP)) {
  const path = `${DIR}/${key}.jpg`;
  if (!existsSync(path)) {
    console.log(`[${key}] falta ${path} — salteado`);
    continue;
  }
  if (!known.has(category)) {
    console.log(`[${key}] la categoría "${category}" NO existe en la base — salteado`);
    continue;
  }

  const objectPath = `anchors/${restaurant.id}/${key}-${process.env.STAMP ?? 'v1'}.jpg`;
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(objectPath, readFileSync(path), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (upErr) {
    console.log(`[${key}] error subiendo:`, upErr.message);
    continue;
  }

  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(objectPath);

  const { error: anchorErr } = await db.from('style_anchors').upsert(
    {
      restaurant_id: restaurant.id,
      category_name: category,
      anchor_url: publicUrl,
      style: null,
    },
    { onConflict: 'restaurant_id,category_name' },
  );
  if (anchorErr) {
    console.log(`[${key}] error registrando anchor:`, anchorErr.message);
    continue;
  }
  console.log(`[${key}] ok → "${category}"`);
}

console.log('\nListo.');
