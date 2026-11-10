/**
 * Regenerates the lunch plates that still sit on shared Unsplash stock
 * (sandwiches, clubs, wraps, salads...). Same photographic recipe as the
 * breakfast and dinner batches Pedro approved: one white plate, continuous
 * dark slate, black backdrop, hard key from the left, 35-degree angle.
 *
 * Plating decisions that are NOT in the database (Pedro, 2026-11-10, with a
 * real photo of Buccaneer's Grilled Chicken & Bacon Club):
 *   - Triple decker club = white toast, three slices, cut into FOUR triangles
 *     standing on their cut edge around the plate, each held by a toothpick
 *     with red cellophane frill; straight-cut fries piled in the middle.
 *   - Cole slaw + pickle are in the description, so they show like on the
 *     burgers: one small ramekin of slaw and one pickle spear.
 *
 * Usage:
 *   node scripts/regen-lunch.mjs --batch 1        # one batch
 *   node scripts/regen-lunch.mjs key1 key2        # specific products
 * NEVER validate with `node -e "import(...)"` — without args it generates ALL.
 * Use `node --check`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output/lunch';

const key = (() => {
  const m = readFileSync('.env.local', 'utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '') : null;
})();
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the toasted bread crumb, the crisp bacon, the glistening juices, the crisp golden fries. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;

const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

const VESSELS = {
  plate: 'one single large plain white ceramic dinner plate',
  bowl: 'one single wide shallow plain white ceramic bowl',
};

// Clubs need a higher camera: two rows running back-to-front collapse into a
// left-to-right line at 35 degrees (four failed rounds, 2026-11-10).
const HIGH_ANGLE = `The camera is HIGH, at about 65 degrees looking DOWN onto the plate (a high three-quarter view, almost overhead but not flat), so the two rows of sandwiches are seen running from the top of the frame to the bottom of the frame, side by side.`;

const build = ({ subject, plate, styling, vessel = 'plate', angle = ANGLE }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands, NO cutlery in use.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate} ${angle}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish, herb sprig, side or drink. NO soup, NO salad, NO lemon wedge, NO parsley sprig unless named. NO drink, NO glass.

SERVED IN/ON: ${VESSELS[vessel]}. Nothing else in frame.
PLATING IDENTITY: Classic American New York diner lunch plate. Generous, honest, abundant portions that fill the plate — no fine-dining tweezer plating, no microgreens, no edible flowers, no smears or dots of sauce, no wooden board, no skillet, no basket, no parchment paper.
CAMERA: 50mm or 85mm prime lens, f/4.0 — the whole dish sharp, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: ${angle === ANGLE ? '35-degree hero angle — the universal professional food photography standard.' : 'high 65-degree angle as described above.'}
COMPOSITION: Square 1:1 frame. The dish is CENTERED. The PLATE itself (not just the food) spans about 80% of the frame width, so a clear band of dark slate shows on the left and on the right of the rim. SAFE ZONE: all food within the central 80%. DO NOT shift the dish left or right. The WHOLE plate, including its entire rim, is inside the frame with dark slate visible between the rim and ALL FOUR edges of the image — the plate never touches or crosses any edge (pull the camera back rather than crop the plate).

SURFACE & SETTING: the dish sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${HARD}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling} Everything looks fresh, generous and freshly served — the kind of plate that makes you hungry on sight.`;

// ── Shared pieces ────────────────────────────────────────────────────────────
const FRIES = 'a generous pile of hot THICK straight-cut diner FRENCH FRIES (about 1 cm wide, NOT thin shoestring), LIGHT golden-yellow with smooth surfaces — plain, unseasoned, not dark, not browned, no spices or herbs on them';
const SLAW_PICKLE = 'one small white ramekin of creamy cole slaw and one whole dill PICKLE SPEAR';

// Layout confirmed by Pedro (2026-11-10) with a reference photo + two answers:
// EIGHT triangles in TWO PARALLEL ROWS of four, each row running from the back
// of the plate to the front, the triangles leaning one against the next like
// fallen dominoes; fries thrown OVER the sandwiches. No slaw, no pickle.
// Earlier readings that were wrong: one ring, one long row, an L.
const club = (filling) => `A TRIPLE DECKER CLUB SANDWICH platter: EXACTLY EIGHT club-sandwich TRIANGLES in total, each triangle made of THREE slices of lightly toasted soft white bread. LAYOUT (critical): the eight triangles form TWO PARALLEL ROWS of FOUR, side by side — a LEFT row and a RIGHT row — and each row runs from the BACK of the plate toward the FRONT (front-to-back lines, NOT left-to-right). Within each row the four triangles lean one against the next like fallen dominoes, overlapping, each tilted so its layered CUT FACE looks toward the camera. Inside each cut face the layers are clearly readable: ${filling}, crisp shredded lettuce and red tomato, between three slices of toast. A few long wooden toothpicks with RED cellophane frills stick out of the triangles. ON TOP: ${FRIES} scattered loosely OVER both rows of sandwiches and spilling down between them, partly covering the sandwiches but leaving most cut faces visible.`;

const CLUB_STYLING = 'Three layers of toast clearly visible in every cut face. The fillings generous and stacked high. Fries golden, not greasy. NO cole slaw, NO pickle, NO ramekin, NO ketchup, NO chips, NO onion rings — only the sandwich and the fries.';

const ITEMS = {
  // ── Batch 1 — Triple Decker Clubs (5) ──────────────────────────────────────
  'club-grilled-chicken-bacon': { batch: 1, name: 'Grilled Chicken & Bacon Club',
    subject: '"Grilled Chicken & Bacon Club" — triple decker club with grilled chicken and bacon, served with fries, cole slaw and pickle.',
    plate: club('sliced GRILLED CHICKEN BREAST with dark grill marks and crisp strips of BACON'),
    styling: CLUB_STYLING, angle: HIGH_ANGLE },
  'club-turkey-bacon': { batch: 1, name: 'Turkey & Bacon Club',
    subject: '"Turkey & Bacon Club" — triple decker club with roast turkey and bacon, served with fries, cole slaw and pickle.',
    plate: club('thin folded slices of white-meat ROAST TURKEY and crisp strips of BACON'),
    styling: CLUB_STYLING, angle: HIGH_ANGLE },
  'club-roast-beef-swiss': { batch: 1, name: 'Roast Beef & Swiss Club',
    subject: '"Roast Beef & Swiss Club" — triple decker club with roast beef and Swiss cheese, served with fries, cole slaw and pickle.',
    plate: club('thin folded slices of rosy-pink ROAST BEEF and pale SWISS CHEESE with holes'),
    styling: `${CLUB_STYLING} NO bacon.`, angle: HIGH_ANGLE },
  'club-chicken-salad-bacon': { batch: 1, name: 'Chicken Salad & Bacon Club',
    subject: '"Chicken Salad & Bacon Club" — triple decker club with creamy chicken salad and bacon, served with fries, cole slaw and pickle.',
    plate: club('a thick generous layer of homemade diner CHICKEN SALAD — visible chunky pieces of tender roasted chicken breast, lightly bound in mayonnaise with flecks of celery, golden and appetising, NOT a smooth white paste — and crisp dark-red strips of BACON'),
    styling: CLUB_STYLING, angle: HIGH_ANGLE },
  'club-tuna-egg': { batch: 1, name: 'Tuna Salad & Sliced Egg Club',
    subject: '"Tuna Salad & Sliced Egg Club" — triple decker club with tuna salad and sliced hard-boiled egg, served with fries, cole slaw and pickle.',
    plate: club('a thick layer of creamy TUNA SALAD and round slices of HARD-BOILED EGG with visible yellow yolk'),
    styling: `${CLUB_STYLING} NO bacon.`, angle: HIGH_ANGLE },
};

// Pedro approved ONE club photo (Grilled Chicken & Bacon, 2026-11-10) and asked
// for the same look on all five. Text alone never reproduced a layout reliably,
// so the other four are EDITS of that approved image that swap only the filling.
// The mold is our own generated image — no third-party photo is involved.
const CLUB_MOLD = `${OUT_DIR}/APROBADA-club-molde.png`;
const clubSwap = (filling, extra = '') => `Keep this EXACT photograph unchanged: the same camera angle, the same white plate in the same position, the same dark slate surface and black background, the same lighting, the same arrangement of every sandwich triangle, the same fries lying on top, the same red-frilled toothpicks, the same toasted white bread. Change ONLY what is visible inside the cut faces of the sandwich triangles: replace the grilled chicken and bacon with ${filling}, keeping the green lettuce and red tomato. ${extra} Apply the same change to EVERY triangle on the plate so they all match. Do not add or remove any object.`;
const EDITS = {
  'club-turkey-bacon': clubSwap('thin folded slices of white-meat ROAST TURKEY and crisp strips of BACON'),
  'club-roast-beef-swiss': clubSwap('thin folded slices of rosy-pink ROAST BEEF and slices of pale SWISS CHEESE', 'There is NO bacon in these sandwiches.'),
  'club-chicken-salad-bacon': clubSwap('a thick layer of creamy white CHICKEN SALAD (diced chicken in mayonnaise) and crisp strips of BACON'),
  'club-tuna-egg': clubSwap('a thick layer of creamy TUNA SALAD and round slices of HARD-BOILED EGG with visible yellow yolk', 'There is NO bacon in these sandwiches.'),
};
let moldUrl = null;
async function editFromMold(prompt) {
  if (!moldUrl) {
    moldUrl = await fal.storage.upload(new Blob([readFileSync(CLUB_MOLD)], { type: 'image/png' }));
  }
  return fal.subscribe('fal-ai/nano-banana-2/edit', {
    input: { prompt, image_urls: [moldUrl], aspect_ratio: '1:1', output_resolution: '1K', num_images: 1 },
  });
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const batchIdx = args.indexOf('--batch');
const batch = batchIdx >= 0 ? Number(args[batchIdx + 1]) : null;
const picked = args.filter((a) => ITEMS[a]);
if (!picked.length && batch === null) {
  // Safety: running with no args used to generate everything (cost + rate limit).
  console.error('Indicá --batch N o claves concretas. Claves: ' + Object.keys(ITEMS).join(', '));
  process.exit(1);
}
const keys = picked.length
  ? picked
  : Object.keys(ITEMS).filter((k) => ITEMS[k].batch === batch);

const manifestPath = `${OUT_DIR}/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const GAP_MS = Number(process.env.GAP_MS ?? 8000);

let ok = 0;
for (const [i, k] of keys.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
  process.stdout.write(`[${i + 1}/${keys.length}] ${k}… `);
  try {
    // FROM_TEXT=1 skips the mold: same prompt, natural variation between clubs
    // (Pedro, 2026-11-10: five identical layouts read as the same photo).
    // OPTIONS=N: N text candidates into opciones/ for Pedro to pick from;
    // nothing in the main folder or the manifest is touched.
    const options = Number(process.env.OPTIONS ?? 0);
    if (options > 0) {
      const res = await fal.subscribe('fal-ai/nano-banana-2', {
        input: { prompt: build(ITEMS[k]), aspect_ratio: '1:1', output_resolution: '1K', num_images: options },
      });
      const imgs = res?.data?.images ?? [];
      mkdirSync(`${OUT_DIR}/opciones`, { recursive: true });
      for (const [j, img] of imgs.entries()) {
        writeFileSync(`${OUT_DIR}/opciones/${k}-${j + 1}.png`, Buffer.from(await (await fetch(img.url)).arrayBuffer()));
      }
      ok++;
      console.log(`${imgs.length} opciones`);
      continue;
    }
    const res = EDITS[k] && existsSync(CLUB_MOLD) && !process.env.FROM_TEXT
      ? await editFromMold(EDITS[k])
      : await fal.subscribe('fal-ai/nano-banana-2', {
          input: { prompt: build(ITEMS[k]), aspect_ratio: '1:1', output_resolution: '1K', num_images: 1 },
        });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    writeFileSync(`${OUT_DIR}/${k}.png`, Buffer.from(await (await fetch(url)).arrayBuffer()));
    manifest[k] = { key: k, name: ITEMS[k].name, file: `${OUT_DIR}/${k}.png`, generatedAt: new Date().toISOString() };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    ok++;
    console.log('ok');
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}
console.log(`\n${ok}/${keys.length} generados en ${OUT_DIR}.`);
