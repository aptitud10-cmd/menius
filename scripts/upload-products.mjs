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

for (const [i, item] of items.entries()) {
  if (!existsSync(item.file)) {
    console.log(`[${i + 1}/${items.length}] ${item.name}: falta ${item.file} — salteado`);
    continue;
  }
  const objectPath = `ai/${RESTAURANT}/${item.key}-${stamp}.jpg`;
  process.stdout.write(`[${i + 1}/${items.length}] ${item.name}… `);
  try {
    const res = await fetch(FN, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anon}`,
        'x-object-path': objectPath,
        'Content-Type': 'application/octet-stream',
      },
      body: readFileSync(item.file),
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

console.log(`\n${updates.length}/${items.length} subidos.\n`);
console.log('-- SQL para aplicar:');
console.log('update products set image_url = v.url from (values');
console.log(
  updates.map((u) => `  ('${u.id}'::uuid, '${u.url}')`).join(',\n'),
);
console.log(") as v(id, url) where products.id = v.id;");
