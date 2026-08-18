/**
 * Recompresses product photos already living in storage.
 *
 * The generated batches were uploaded straight from the model: nano-banana
 * returns PNG, the files were named ".jpg" without converting, so storage holds
 * lossless 1024x1024 PNGs of ~1.2MB each for pictures the menu renders at 640px.
 * upload-products.mjs now compresses on the way in (572df52); this is the
 * one-off pass for everything uploaded before that fix.
 *
 * It uploads to a NEW object path rather than overwriting: a reused URL leaves
 * the CDN serving the old bytes, and keeping the original means a bad batch can
 * be abandoned by simply not applying the SQL.
 *
 * Like its sibling it PRINTS the UPDATE instead of running it — the write that
 * changes what a customer sees stays under human review.
 *
 * Usage: node scripts/recompress-existing.mjs <urls.txt> [--limit N] [--dry]
 *   urls.txt: one public storage URL per line
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const PROJECT = 'hdlhmqvbaxzhmhtablwt';
const FN = `https://${PROJECT}.supabase.co/functions/v1/anchor-upload`;
const RESTAURANT = 'a1f5af6a-1805-49d2-b494-f074ac657357';

function envVar(name) {
  const fromEnv = (process.env[name] ?? '').trim();
  if (fromEnv) return fromEnv;
  try {
    const m = readFileSync('.env.local', 'utf8').match(
      new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'),
    );
    if (m) return m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
  } catch {}
  return null;
}

const anon = envVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!anon) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.');
  process.exit(1);
}

const listPath = process.argv[2];
if (!listPath || !existsSync(listPath)) {
  console.error('Uso: node scripts/recompress-existing.mjs <urls.txt> [--limit N] [--dry]');
  process.exit(1);
}
const dry = process.argv.includes('--dry');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

// Only untransformed originals under /object/public/ are eligible. A list
// scraped from rendered HTML also picks up /render/image/ srcset entries with
// "?width=256&quality=75" still attached: recompressing one of those would
// replace a dish's original with a 256px thumbnail. Two of the first 102 were
// exactly that, and the upload failing for another reason is the only thing
// that kept them out.
const allLines = readFileSync(listPath, 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const rejected = allLines.filter(
  (u) => !/\/storage\/v1\/object\/public\/product-images\/ai\//.test(u),
);
if (rejected.length) {
  console.log(`${rejected.length} URL(s) descartadas por no ser originales:`);
  for (const r of rejected) console.log(`  ${r.slice(0, 90)}…`);
  console.log('');
}

const urls = allLines
  .filter((u) =>
    /\/storage\/v1\/object\/public\/product-images\/ai\//.test(u),
  )
  // A dish can appear more than once in scraped markup; uploading the same
  // original twice would burn a second object for no reason.
  .filter((u, i, all) => all.indexOf(u) === i)
  .slice(0, limit);

// The object key carries the dish slug, which is how each new file is matched
// back to the row it belongs to. A url the regex cannot read is skipped loudly
// rather than guessed at.
function keyOf(url) {
  const m = url.match(/\/ai\/[^/]+\/(.+?)-\d+\.(?:jpg|png|webp)$/i);
  return m ? m[1] : null;
}

const stamp = process.env.STAMP ?? String(Date.now());
const updates = [];
let before = 0;
let after = 0;
let skipped = 0;

console.log(`${urls.length} imágenes${dry ? ' (DRY RUN — no sube nada)' : ''}\n`);

for (const [i, url] of urls.entries()) {
  const key = keyOf(url);
  const label = key ?? url.slice(-40);
  process.stdout.write(`[${i + 1}/${urls.length}] ${label.padEnd(30)} `);

  if (!key) {
    console.log('SIN KEY — salteada');
    skipped++;
    continue;
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.log(`ERROR descarga ${res.status}`);
      skipped++;
      continue;
    }
    const src = Buffer.from(await res.arrayBuffer());

    const out = await sharp(src)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    // Already-small originals are left alone: re-encoding a compressed JPEG
    // only loses quality, and a "recompression" that grows the file is a bug.
    if (out.length >= src.length) {
      console.log(
        `${(src.length / 1024).toFixed(0)}KB ya optimizada — sin cambios`,
      );
      skipped++;
      continue;
    }

    before += src.length;
    after += out.length;
    process.stdout.write(
      `${(src.length / 1024).toFixed(0)}→${(out.length / 1024).toFixed(0)}KB `,
    );

    if (dry) {
      console.log('(dry)');
      continue;
    }

    const objectPath = `ai/${RESTAURANT}/${key}-${stamp}.jpg`;
    const up = await fetch(FN, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anon}`,
        'x-object-path': objectPath,
        'Content-Type': 'application/octet-stream',
      },
      body: out,
      signal: AbortSignal.timeout(60000),
    });
    const text = await up.text();
    if (!up.ok) {
      console.log(`ERROR subida ${up.status}: ${text.slice(0, 100)}`);
      skipped++;
      continue;
    }
    const { url: newUrl } = JSON.parse(text);
    updates.push({ key, oldUrl: url, newUrl });
    console.log('ok');
  } catch (err) {
    console.log(`ERROR: ${err?.message ?? err}`);
    skipped++;
  }
}

const mb = (n) => (n / 1048576).toFixed(1);
console.log(
  `\n${updates.length} recomprimidas · ${skipped} salteadas · ` +
    `${mb(before)}MB → ${mb(after)}MB` +
    (before > 0 ? ` (${(before / after).toFixed(1)}× más chico)` : ''),
);

if (dry || !updates.length) process.exit(0);

// Matched on the OLD url rather than on the slug: two dishes can share a photo,
// and rewriting by slug would silently point only one of them at the new file.
const sql =
  'update products set image_url = v.new_url\n' +
  'from (values\n' +
  updates
    .map((u) => `  ('${u.oldUrl}', '${u.newUrl}')`)
    .join(',\n') +
  '\n) as v(old_url, new_url)\n' +
  "where products.image_url = v.old_url\n" +
  `  and products.restaurant_id = '${RESTAURANT}';`;

writeFileSync('scripts/.recompress-update.sql', sql);
console.log('\nSQL escrito en scripts/.recompress-update.sql');
