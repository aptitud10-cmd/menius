/**
 * Uploads reviewed product photos to storage via the anchor-upload edge function
 * and prints the SQL to point each product at its new image.
 *
 * Kept separate from generation on purpose: generating is cheap and repeatable,
 * but writing image_url is what a customer sees. Nothing reaches this script
 * until a human has looked at the batch in the contact sheet.
 *
 * The upload goes through an edge function rather than the storage API directly
 * because RLS on storage.objects requires an authenticated owner of the
 * restaurant. The function runs inside Supabase with the service role, so no
 * policy is widened and no service key lands on this machine.
 *
 * It prints the UPDATE statements instead of running them — the operator applies
 * them through the Supabase MCP, so the write is reviewed before it happens.
 *
 * Usage: node scripts/upload-products.mjs <manifest.json>
 * Manifest: [{ id, name, file }]
 */
import { readFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';

/**
 * Compresses a generated image before upload.
 *
 * nano-banana returns PNG. The first batches were written straight to disk as
 * ".jpg" and uploaded byte-for-byte, so every product photo in storage is a
 * lossless 1024x1024 PNG of ~1.2MB wearing a JPEG extension — 102 of them,
 * 125MB, for pictures the menu renders at 640px.
 *
 * Nothing downstream was broken by it (next/image re-encodes to ~46KB WebP for
 * the diner) but it costs storage on every batch and the bill only grows: the
 * remaining ~220 dishes would have added another 270MB.
 *
 * mozjpeg at 82 measures 15.6x smaller on a real burger (1228KB -> 79KB) with
 * no artefacts visible at menu size. Kept as JPEG rather than WebP because the
 * object path already says .jpg and Vercel converts to WebP at serve time
 * anyway — the format of the stored original only decides what it costs to keep.
 */
async function compress(file) {
  const original = readFileSync(file);
  try {
    const out = await sharp(original)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    // A "compressed" file that grew is a signal the source was already
    // optimised; keep whichever is smaller rather than trusting the pipeline.
    return out.length < original.length
      ? { buf: out, from: original.length }
      : { buf: original, from: original.length };
  } catch (err) {
    // Never let a re-encode failure cost the batch: upload what we have and
    // say so, rather than dropping a photo that was fine.
    console.log(`(sin comprimir: ${err?.message ?? err}) `);
    return { buf: original, from: original.length };
  }
}

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

const manifestPath = process.argv[2];
if (!manifestPath || !existsSync(manifestPath)) {
  console.error('Uso: node scripts/upload-products.mjs <manifest.json>');
  process.exit(1);
}
const items = JSON.parse(readFileSync(manifestPath, 'utf8'));

// A stamp in the object path so a re-run never collides with a previous upload
// and the CDN is never asked to serve stale bytes from a reused URL.
const stamp = process.env.STAMP ?? String(Date.now());
const updates = [];
let savedBytes = 0;

// A manifest without `key` used to upload every item to "undefined-<stamp>.jpg":
// each file overwrote the last, and the printed SQL pointed all N products at
// one image — the exact defect these batches exist to remove. Fail before the
// first request rather than after the last.
const missingKey = items.filter((it) => !it.key);
if (missingKey.length) {
  console.error(
    `Faltan claves "key" en ${missingKey.length} item(s): ${missingKey
      .map((it) => it.name ?? '(sin nombre)')
      .join(', ')}`,
  );
  process.exit(1);
}
const dupKeys = items
  .map((it) => it.key)
  .filter((k, i, all) => all.indexOf(k) !== i);
if (dupKeys.length) {
  console.error(`Claves "key" repetidas: ${[...new Set(dupKeys)].join(', ')}`);
  process.exit(1);
}

for (const [i, item] of items.entries()) {
  if (!existsSync(item.file)) {
    console.log(`[${i + 1}/${items.length}] ${item.name}: falta ${item.file} — salteado`);
    continue;
  }
  const objectPath = `ai/${RESTAURANT}/${item.key}-${stamp}.jpg`;
  process.stdout.write(`[${i + 1}/${items.length}] ${item.name}… `);
  try {
    const { buf, from } = await compress(item.file);
    savedBytes += from - buf.length;
    process.stdout.write(
      `${(from / 1024).toFixed(0)}→${(buf.length / 1024).toFixed(0)}KB… `,
    );
    const res = await fetch(FN, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anon}`,
        'x-object-path': objectPath,
        'Content-Type': 'application/octet-stream',
      },
      body: buf,
      signal: AbortSignal.timeout(45000),
    });
    const text = await res.text();
    if (!res.ok) {
      console.log(`ERROR ${res.status}: ${text.slice(0, 120)}`);
      continue;
    }
    const { url } = JSON.parse(text);
    updates.push({ id: item.id, name: item.name, url });
    console.log('ok');
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}

if (!updates.length) {
  console.log('\nNada subido.');
  process.exit(1);
}

console.log(
  `\n${updates.length}/${items.length} subidos.` +
    (savedBytes > 0
      ? ` Ahorrados ${(savedBytes / 1048576).toFixed(1)}MB al comprimir.`
      : '') +
    '\n',
);
console.log('-- SQL para aplicar:');
console.log('update products set image_url = v.url from (values');
console.log(
  updates.map((u) => `  ('${u.id}'::uuid, '${u.url}')`).join(',\n'),
);
console.log(") as v(id, url) where products.id = v.id;");
