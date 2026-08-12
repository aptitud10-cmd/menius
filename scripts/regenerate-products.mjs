/**
 * Regenerates the product photos that are still generic Unsplash stock.
 *
 * Buccaneer's catalogue looks fully photographed — 422 of 423 products have an
 * image_url — but the coverage is an illusion: one Unsplash URL is shared by 66
 * products, so "Corona" showed a panini. This walks a category, sends each dish
 * through Kontext using that category's style anchor, and writes the results to
 * disk for review.
 *
 * It does NOT touch the database. Nothing reaches a customer until a human has
 * looked at the batch; upload-products.mjs is the separate step that writes.
 *
 * Kontext (rather than nano-banana) because the anchor is the whole point: it
 * keeps the plate, surface, background and lighting fixed and swaps only the
 * food, so a category comes out looking like one photographer shot it in one
 * sitting. A category with no anchor is skipped rather than generated freehand —
 * 20 dishes on 20 different backgrounds is worse than the stock photo.
 *
 * Input comes from scripts/.product-output/worklist.json, written separately
 * from the database. The script does not query Supabase itself: the anon key is
 * denied on `restaurants` by RLS (as it should be — public menus resolve the
 * slug server-side), and the service role key is not on this machine. Feeding it
 * a plain file keeps the credential surface at zero.
 *
 * Usage:
 *   node scripts/regenerate-products.mjs "Side Orders"
 *   node scripts/regenerate-products.mjs "Side Orders" --limit 5
 *   node scripts/regenerate-products.mjs --list
 *
 * Reads FAL_API_KEY from .env.local.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output';
const WORKLIST = `${OUT_DIR}/worklist.json`;

function envVar(name) {
  const fromEnv = (process.env[name] ?? '').trim();
  if (fromEnv) return fromEnv;
  try {
    const m = readFileSync('.env.local', 'utf8').match(
      new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm'),
    );
    // Windows checkouts leave a \r that survives the newline anchor and turns a
    // valid key into a 401 that looks like a wrong key.
    if (m) return m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
  } catch {}
  return null;
}

// ── prompt ──────────────────────────────────────────────────────────────────
// Deliberately shorter than the anchor prompt: with a reference image, the
// plate, surface, background and lighting are already decided. Restating them
// only gives the model a chance to contradict the anchor. What remains is the
// dish itself plus the prohibitions that were repeatedly violated in testing.
// `restate` carries a physical description of the dish — shape and colour, not
// its name. Kontext happily ADDS ingredients (cheese and bacon onto fries) but
// ignores an instruction to change the shape or colour of what is already there:
// "Waffle Fries" and "Sweet Potato Fries" both came back as the anchor's plain
// straight-cut fries. Naming the geometry is what forces the edit.
const buildPrompt = ({ name, description, restate }) => {
  const dish = description?.trim() ? `${name} — ${description.trim()}` : name;
  const forced = restate
    ? `\n\nCRITICAL — the food must be VISIBLY DIFFERENT from the reference image. ${restate} Do not reproduce the reference's food. If the result looks like the reference dish, it is wrong.`
    : '';
  return `Replace the food on the plate with: ${dish}${forced}

Keep EVERYTHING else exactly as in the reference image: the same white ceramic plate, the same dark slate surface, the same empty dark background, the same lighting direction and quality, the same camera angle and framing.

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any topping, sauce, garnish or side that is not named. NO coleslaw, NO pickles, NO cilantro, NO lime wedges, NO microgreens, NO extra ramekin, NO second dish.

Classic American diner presentation: generous, honest, unpretentious portions. No fine-dining tweezer plating, no smears or dots of sauce.

The frame contains the plate and the dark surface it sits on and NOTHING ELSE — no softbox, no reflector panel, no light stand, no camera gear, no hands, no text, no logos. Square 1:1 frame, plate centered, filling 75-80% of the frame.

This is a REAL photograph, not CGI, not a 3D render, not an illustration.`;
};

// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const wantList = args.includes('--list');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
const category = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--limit');

if (!existsSync(WORKLIST)) {
  console.error(
    `Falta ${WORKLIST}.\n` +
      'Es un JSON: [{ category, anchor_url, products: [{ id, name, description }] }]',
  );
  process.exit(1);
}
const worklist = JSON.parse(readFileSync(WORKLIST, 'utf8'));

// ── --list: what is left to do ──────────────────────────────────────────────
if (wantList || !category) {
  console.log('\nCategoría                                  a regenerar   anchor');
  let total = 0;
  for (const group of worklist) {
    total += group.products.length;
    console.log(
      `${group.category.padEnd(42)} ${String(group.products.length).padStart(11)}   ` +
        `${group.anchor_url ? 'sí' : 'FALTA'}`,
    );
  }
  console.log(`\n${total} productos en la lista de trabajo.`);
  process.exit(0);
}

// ── generate one category ───────────────────────────────────────────────────
const group = worklist.find((g) => g.category === category);
if (!group) {
  console.error(`"${category}" no está en ${WORKLIST}.`);
  process.exit(1);
}
const anchorUrl = group.anchor_url;
if (!anchorUrl) {
  console.error(
    `La categoría "${category}" no tiene anchor.\n` +
      'Generá y subí su anchor primero — sin referencia cada plato sale con otro fondo.',
  );
  process.exit(1);
}

const todo = group.products.slice(0, limit);
if (!todo.length) {
  console.log(`No hay nada que regenerar en "${category}".`);
  process.exit(0);
}

const key = envVar('FAL_API_KEY');
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

console.log(`\n${category} — ${todo.length} productos\nanchor: ${anchorUrl}\n`);

const manifest = [];
for (const [i, p] of todo.entries()) {
  const fileKey = slugify(p.name);
  process.stdout.write(`[${i + 1}/${todo.length}] ${p.name}… `);
  try {
    const res = await fal.subscribe('fal-ai/flux-pro/kontext', {
      input: {
        prompt: buildPrompt(p),
        image_url: anchorUrl,
        aspect_ratio: '1:1',
        output_format: 'jpeg',
        safety_tolerance: '5',
      },
    });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) {
      console.log('sin imagen');
      continue;
    }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const file = `${OUT_DIR}/${fileKey}.jpg`;
    writeFileSync(file, buf);
    // The id is what upload-products.mjs writes against — matching by name later
    // would break on the duplicates this menu is full of.
    manifest.push({ id: p.id, name: p.name, category, file });
    console.log(`ok → ${file}`);
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}

const manifestPath = `${OUT_DIR}/manifest-${slugify(category)}.json`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n${manifest.length}/${todo.length} generados.`);
console.log(`Manifest: ${manifestPath}`);
console.log('Mirá las imágenes ANTES de subirlas. Ninguna llegó a la base todavía.');
