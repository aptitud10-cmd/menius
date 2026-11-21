// Crea la versión intermedia (≤1200 px, WebP) de cada foto optimizada del bucket product-images.
//
//   opt/…-lg.jpg  → opt/…-md.webp      (lote de Buccaneer)
//   …__lg.jpg     → …__md.webp         (subidas del dashboard / IA)
//
// supabaseLoader pide: ≤640 px la -sm.webp, ≤1200 px la -md.webp, más grande el -lg.jpg.
// Sin la intermedia, una pantalla con zoom 150 % o retina bajaba el JPEG grande en
// cada tarjeta (1,4–1,9 MB por categoría).
//
// Seguro de re-correr: saltea las que ya tienen -md, sube con x-upsert:false (nunca
// pisa nada), una por vez con pausa (en paralelo Storage devuelve 429) y verifica
// cada archivo subido con un GET.
//
// Uso: node scripts/backfill-md-webp.mjs [--dry-run] [--limit=N]
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const env = readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const BASE = get('NEXT_PUBLIC_SUPABASE_URL');
const KEY = get('SUPABASE_SERVICE_ROLE_KEY');
if (!BASE || !KEY) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local');
const BUCKET = 'product-images';
const DRY = process.argv.includes('--dry-run');
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.slice(8) ?? Infinity);
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lista recursiva del bucket (la API devuelve carpetas con id null). */
async function list(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${BASE}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!r.ok) throw new Error(`list ${prefix}: ${r.status} ${await r.text()}`);
    const page = await r.json();
    for (const f of page) {
      const path = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.id === null) out.push(...(await list(path)));
      else out.push(path);
    }
    if (page.length < 1000) return out;
  }
}

const mdOf = (p) => (p.endsWith('__lg.jpg') ? p.replace(/__lg\.jpg$/, '__md.webp') : p.replace(/-lg\.jpg$/, '-md.webp'));
const isLg = (p) => /^opt\/.+-lg\.jpg$/.test(p) || /__lg\.jpg$/.test(p);

const all = await list('');
const have = new Set(all);
const todo = all.filter(isLg).filter((p) => !have.has(mdOf(p))).slice(0, LIMIT);
console.log(`${all.filter(isLg).length} fotos grandes; ${todo.length} sin -md${DRY ? ' (dry-run)' : ''}`);

let ok = 0, fail = 0, lgKB = 0, mdKB = 0;
for (const p of todo) {
  try {
    const src = await fetch(`${BASE}/storage/v1/object/public/${BUCKET}/${p}`);
    if (!src.ok) throw new Error(`descarga ${src.status}`);
    const buf = Buffer.from(await src.arrayBuffer());
    const md = await sharp(buf)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 72, effort: 6 })
      .toBuffer();
    lgKB += buf.length / 1024; mdKB += md.length / 1024;
    if (DRY) { console.log('dry', p, `${Math.round(buf.length / 1024)}KB → ${Math.round(md.length / 1024)}KB`); ok++; continue; }
    const up = await fetch(`${BASE}/storage/v1/object/${BUCKET}/${mdOf(p)}`, {
      method: 'POST', body: md,
      headers: { ...H, 'Content-Type': 'image/webp', 'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
    });
    if (!up.ok && up.status !== 409) throw new Error(`subida ${up.status} ${await up.text()}`);
    await sleep(250);
    const check = await fetch(`${BASE}/storage/v1/object/public/${BUCKET}/${mdOf(p)}`);
    const got = Buffer.from(await check.arrayBuffer());
    if (!check.ok || !(check.headers.get('content-type') ?? '').includes('webp')) throw new Error(`verificación ${check.status}`);
    const meta = await sharp(got).metadata();
    if (!meta.width) throw new Error('verificación: no es imagen');
    ok++;
    if (ok % 25 === 0 || ok <= 5) console.log(`ok ${ok}/${todo.length}`, mdOf(p).split('/').pop(), `${meta.width}x${meta.height}`, `${Math.round(buf.length / 1024)}KB → ${Math.round(got.length / 1024)}KB`);
  } catch (e) {
    fail++;
    console.error('FALLÓ', p, e instanceof Error ? e.message : e);
  }
  await sleep(300);
}
console.log(`listo: ${ok} ok, ${fail} fallidas. JPEG grande ${Math.round(lgKB)} KB → intermedia ${Math.round(mdKB)} KB`);
if (fail) process.exit(1);
