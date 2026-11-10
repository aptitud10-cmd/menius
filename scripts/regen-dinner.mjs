/**
 * Regenerates the dinner plates that still sit on shared Unsplash stock:
 * Steaks & Ribs, Entrees and Signature Dishes (21). Same photographic recipe as
 * the breakfast batches Pedro approved: one white plate, continuous dark slate,
 * black backdrop, hard key from the left, 35-degree three-quarter angle.
 *
 * Plating decisions that are NOT in the database (Pedro, 2026-11-10):
 *   - "Potato and vegetable" has many combinations in the kitchen; the classic
 *     one is MASHED POTATOES + CORN, so that is what every such plate shows.
 *   - In the restaurant the sides come on a separate plate; for the photo they
 *     go on the same plate as the main.
 *   - Soup or salad comes with every dinner and is NOT shown.
 *
 * Usage:
 *   node scripts/regen-dinner.mjs --batch 1        # one batch
 *   node scripts/regen-dinner.mjs key1 key2        # specific products
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output/dinner';

const key = (() => {
  const m = readFileSync('.env.local', 'utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '') : null;
})();
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the dark seared crust, the glistening juices, the crisp golden coating, the glossy sauce. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;

const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

const VESSELS = {
  plate: 'one single large plain white ceramic dinner plate',
  oval: 'one single large plain white ceramic OVAL platter',
  bowl: 'one single wide shallow plain white ceramic pasta bowl',
};

const build = ({ subject, plate, styling, vessel = 'plate' }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands, NO cutlery in use.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate} ${ANGLE}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish, herb sprig, side or drink. NO soup, NO salad, NO bread, NO roll, NO lemon wedge, NO parsley sprig unless named. NO wine glass, NO drink.

SERVED IN/ON: ${VESSELS[vessel]}. Nothing else in frame.
PLATING IDENTITY: Classic American New York diner dinner plate. Generous, honest, abundant portions that fill the plate — no fine-dining tweezer plating, no microgreens, no edible flowers, no smears or dots of sauce, no wooden board, no skillet, no cast iron.
CAMERA: 50mm or 85mm prime lens, f/4.0 — the whole dish sharp, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The dish is CENTERED. The PLATE itself (not just the food) spans about 80% of the frame width, so a clear band of dark slate shows on the left and on the right of the rim. SAFE ZONE: all food within the central 80%. DO NOT shift the dish left or right. The WHOLE plate, including its entire rim, is inside the frame with dark slate visible between the rim and ALL FOUR edges of the image — the plate never touches or crosses any edge (pull the camera back rather than crop the plate).

SURFACE & SETTING: the dish sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${HARD}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling} Everything looks hot, juicy and freshly served — the kind of plate that makes you hungry on sight.`;

// ── Shared sides ─────────────────────────────────────────────────────────────
// "Potato and vegetable" → mashed + corn (Pedro: the classic combination).
// Mashed is rustic with gravy pooling, as on a real Buccaneer short-ribs plate.
const MASHED = 'a generous rustic mound of homestyle mashed potatoes — creamy, fluffy and irregular with visible soft lumps and peaks, NOT piped, NOT perfectly smooth — with a ladle of glossy brown gravy pooling at its base';
const CORN = 'a generous heap of buttered sweet yellow corn KERNELS glistening with melted butter (loose kernels, NOT on the cob)';
const SIDES = `${MASHED}, and ${CORN}`;

const ITEMS = {
  // ── Batch 1 — Steaks & Ribs, Entrees (12) ──────────────────────────────────
  'ribeye': { batch: 1, name: 'Ribeye Steak',
    subject: '"Ribeye Steak" — a 20 oz ribeye with potato and vegetable.',
    plate: `one huge thick 20 oz bone-in RIBEYE steak, chargrilled with a dark seared crust and crosshatch grill marks, generous marbling glistening with juices, filling half the plate; beside it ${SIDES}.`,
    styling: 'The steak is the hero and clearly oversized. Grill marks dark and crisp. NO herb butter, NO rosemary, NO garlic cloves.' },
  'porterhouse': { batch: 1, name: 'Porterhouse',
    subject: '"Porterhouse" — an 18-20 oz porterhouse with potato and vegetable.',
    plate: `one huge thick 18-20 oz PORTERHOUSE steak with its T-shaped bone clearly visible between the strip and the tenderloin, chargrilled with a dark seared crust and crosshatch grill marks, glistening with juices, filling half the plate; beside it ${SIDES}.`,
    styling: 'The T-bone must be clearly readable. NO herb butter, NO rosemary, NO garlic cloves.' },
  'romanian-tenderloin': { batch: 1, name: 'Romanian Tenderloin Steak',
    subject: '"Romanian Tenderloin Steak" — a New York diner Romanian steak (long, thin, chargrilled skirt steak) with potato and vegetable.',
    plate: `one long, thin, wide chargrilled ROMANIAN SKIRT STEAK, folded over itself once on the plate, dark seared surface with grill marks, juicy and glistening; beside it ${SIDES}.`,
    styling: 'Skirt steak grain visible. NO chimichurri, NO herb butter, NO garlic.' },
  'chopped-sirloin': { batch: 1, name: 'Chopped Sirloin Steak',
    subject: '"Chopped Sirloin Steak" — chopped sirloin with fried onions and potato and vegetable.',
    plate: `one large thick OVAL chopped-sirloin steak (a big chargrilled ground-beef steak, NOT a burger, NO bun) smothered with a generous pile of soft golden caramelised fried onions; beside it ${SIDES}.`,
    styling: 'Onions sweet, soft and golden-brown. NO bun, NO cheese, NO mushrooms.' },
  'pork-chops': { batch: 1, name: '2 Thick Cut Jersey Pork Chops',
    subject: '"2 Thick Cut Jersey Pork Chops" with applesauce, potato and vegetable.',
    plate: `TWO thick bone-in grilled PORK CHOPS overlapping, golden-brown seared with grill marks, juicy; one small white ramekin of chunky applesauce beside them; and ${SIDES}.`,
    styling: 'Exactly two chops, bone visible. NO apple slices, NO herbs.' },
  'bbq-ribs': { batch: 1, name: 'St. Louis BBQ Spare Ribs',
    subject: '"St. Louis BBQ Spare Ribs" with cole slaw and steak-cut onion rings.',
    plate: 'a full rack of St. Louis-style pork SPARE RIBS lacquered with sticky glossy dark-red BBQ sauce with caramelised charred edges, bones visible; beside it four THICK steak-cut golden battered ONION RINGS laid FLAT and overlapping on the plate (NOT stacked in a tower) and one white ramekin of creamy cole slaw.',
    styling: 'The whole rack fits well inside the plate, with plate rim and dark slate visible on the right side. Ribs glossy and sticky. NO fries, NO mashed potatoes, NO corn, NO cornbread.' },
  'roast-beef': { batch: 1, name: 'Sliced Prime Roast Beef',
    subject: '"Sliced Prime Roast Beef" au jus with potato and vegetable.',
    plate: `several thick slices of PRIME ROAST BEEF, rosy pink in the centre with a browned seasoned edge, fanned and overlapping, moistened with a shallow pool of clear dark au jus; beside them ${SIDES}.`,
    styling: 'Pink centre clearly visible. NO horseradish, NO bread.' },
  'virginia-ham': { batch: 1, name: 'Roast Virginia Ham',
    subject: '"Roast Virginia Ham" with brown gravy, potato and vegetable.',
    plate: `several thick slices of glazed ROAST VIRGINIA HAM, rosy pink with a caramelised golden edge, overlapping, with brown gravy spooned over them; beside them ${SIDES}.`,
    styling: 'Ham pink and juicy. NO pineapple rings, NO cloves, NO cherries.' },
  'fried-chicken': { batch: 1, name: 'Fried Chicken',
    subject: '"Fried Chicken" — four-piece dinner with French fries.',
    plate: 'EXACTLY FOUR pieces of golden crispy southern-style FRIED CHICKEN (a breast, a thigh, a drumstick and a wing) with a craggy, crunchy, deep golden-brown crust; beside them a generous pile of hot golden crispy FRENCH FRIES (classic straight-cut diner fries).',
    styling: 'Crust shatteringly crisp and golden, not greasy. NO mashed potatoes, NO gravy, NO corn, NO biscuit, NO honey, NO coleslaw, NO ketchup.' },
  'mac-cheese': { batch: 1, name: "Mac N' Cheese", vessel: 'bowl',
    subject: '"Mac N\' Cheese" — cavatappi pasta with four-cheese sauce.',
    plate: 'the bowl filled with CAVATAPPI (corkscrew spiral) pasta generously coated in a rich, thick, glossy, deep golden-orange four-cheese sauce pooling between the spirals, with a few bubbling lightly browned cheesy spots on top and a stretchy cheese pull lifted at one edge.',
    styling: 'Cavatappi spirals clearly visible. Sauce creamy, not dry. NO breadcrumbs, NO bacon, NO herbs.' },
  'mac-cheese-chicken': { batch: 1, name: "Mac N' Cheese with Chicken", vessel: 'bowl',
    subject: '"Mac N\' Cheese with Chicken" — cavatappi with four-cheese sauce and grilled chicken.',
    plate: 'the bowl filled with CAVATAPPI (corkscrew spiral) pasta coated in a rich, thick, creamy golden four-cheese sauce, topped with slices of juicy GRILLED CHICKEN BREAST with grill marks fanned across the top.',
    styling: 'Chicken clearly grilled with marks. NO breadcrumbs, NO bacon, NO herbs.' },
  'mac-cheese-shrimp': { batch: 1, name: "Mac N' Cheese with Shrimp", vessel: 'bowl',
    subject: '"Mac N\' Cheese with Shrimp" — cavatappi with four-cheese sauce and sauteed shrimp.',
    plate: 'the bowl filled with CAVATAPPI (corkscrew spiral) pasta coated in a rich, thick, creamy golden four-cheese sauce, topped with six plump pink-orange SAUTEED SHRIMP, tails off, lightly golden.',
    styling: 'Shrimp plump and glossy. NO breadcrumbs, NO bacon, NO herbs.' },

  // ── Batch 2 — Signature Dishes (9) ─────────────────────────────────────────
  'fishermans-platter': { batch: 2, name: "Fisherman's Platter",
    subject: "\"Fisherman's Platter\" — Buccaneer's broiled seafood platter with garlic sauce, plated the way the kitchen serves it (Pedro, 2026-11-10).",
    plate: `in the CENTRE a whole baked red TOMATO with a golden crumb top sitting on a slice of toasted bread, with a broiled LOBSTER TAIL — its meat lifted piggyback-style, curled and paprika-orange — perched on top of the tomato; arranged in a radial ring around it on the plate: TWO STUFFED CLAMS (clam shells heaped with golden crab-and-breadcrumb stuffing), two large butterflied STUFFED SHRIMP broiled golden with paprika, one domed rolled FLOUNDER FILLET stuffed with crabmeat, broiled golden-orange, and three golden seared SEA SCALLOPS served inside an open clam shell; between them FOUR triangular TOAST POINTS (white bread, toasted with grill marks) standing upright at an angle, each with a small sprig of fresh oregano, and THREE fresh LEMON WEDGES; everything glistening with an orange paprika-garlic butter sauce pooling on the plate.`,
    styling: 'Tall, abundant, generous centrepiece. NO mashed potatoes, NO corn, NO fries, NO rice. Lemon wedges and toast points ARE part of the dish.' },
  'mariners-combo': { batch: 2, name: "Mariner's Combo",
    subject: "\"Mariner's Combo\" — broiled seafood combo with garlic sauce, plated the way the kitchen serves it (Pedro, 2026-11-10).",
    plate: `in the CENTRE a whole baked red TOMATO with a golden crumb top sitting on a slice of toasted bread; arranged in a radial ring around it on the plate: TWO STUFFED CLAMS (clam shells heaped with golden crab-and-breadcrumb stuffing), two large butterflied STUFFED SHRIMP broiled golden with paprika, one domed rolled FLOUNDER FILLET stuffed with crabmeat, broiled golden-orange, and three golden seared SEA SCALLOPS served inside an open clam shell; between them FOUR triangular TOAST POINTS (white bread, toasted with grill marks) standing upright at an angle, each with a small sprig of fresh oregano, and THREE fresh LEMON WEDGES; everything glistening with an orange paprika-garlic butter sauce pooling on the plate.`,
    styling: 'NO lobster tail anywhere. NO mashed potatoes, NO corn, NO fries, NO rice. Lemon wedges and toast points ARE part of the dish.' },
  'sea-and-land': { batch: 2, name: 'Sea & Land',
    subject: '"Sea & Land" — skirt steak, two shrimp and two stuffed clams scampi style, potato and vegetable.',
    plate: `one long chargrilled SKIRT STEAK folded on the plate, a PAIR of large peeled SHRIMP scampi-style glistening in garlic butter, resting ON TOP of the steak and crossed over each other in an X (only these two shrimp exist on the whole plate), TWO STUFFED CLAMS (clam shells filled with golden breadcrumb stuffing); plus ${SIDES}.`,
    styling: 'EXACTLY two shrimp — not one, not three — and exactly two clams. NO lobster. NO lemon, NO parsley.' },
  'beef-and-reef': { batch: 2, name: 'Beef & Reef',
    subject: '"Beef & Reef" — Romanian steak, one 5 oz lobster tail and two stuffed clams, potato and vegetable.',
    plate: `one long chargrilled ROMANIAN SKIRT STEAK folded on the plate, one split broiled 5 oz LOBSTER TAIL with white meat raised over its red shell, TWO STUFFED CLAMS (clam shells filled with golden breadcrumb stuffing); plus ${SIDES}.`,
    styling: 'Exactly one lobster tail and two clams. NO shrimp. NO lemon, NO parsley.' },
  'surf-and-turf': { batch: 2, name: 'Surf & Turf',
    subject: '"Surf & Turf" — NY cut steak and one 5 oz lobster tail, potato and vegetable.',
    plate: `one thick chargrilled NEW YORK STRIP steak with a dark seared crust and grill marks, one split broiled 5 oz LOBSTER TAIL with white meat raised over its bright red shell, one small white ramekin of melted butter; plus ${SIDES}.`,
    styling: 'Steak and lobster equally prominent. NO shrimp, NO lemon, NO parsley.' },
  'steak-and-shrimp': { batch: 2, name: 'Steak & Shrimp Combination',
    subject: '"Steak & Shrimp Combination" — rib steak and three fried shrimp, potato and vegetable.',
    plate: `one thick chargrilled bone-in RIB STEAK with a dark seared crust and grill marks, EXACTLY THREE large golden breaded FRIED SHRIMP with tails on, laid apart so each one is countable (count them: one, two, three — NOT four); plus ${SIDES}.`,
    styling: 'EXACTLY three shrimp — not two, not four. NO lobster, NO cocktail sauce, NO lemon.' },
  'skirt-steak-tips': { batch: 2, name: 'Skirt Steak Tips',
    subject: '"Skirt Steak Tips" — steak tips and mushrooms in marsala wine sauce over yellow rice.',
    plate: 'a bed of fluffy saffron-YELLOW RICE topped with a generous heap of seared, juicy SKIRT STEAK TIPS (bite-size chunks) and sliced button MUSHROOMS in a glossy dark-brown marsala wine sauce.',
    styling: 'Rice clearly golden-yellow. Sauce glossy and rich. NO salad, NO mashed potatoes, NO corn, NO peas, NO parsley.' },
  'frutti-di-mare': { batch: 2, name: 'Frutti Di Mare', vessel: 'bowl',
    subject: '"Frutti Di Mare" — linguine with mixed seafood in marinara sauce.',
    plate: 'a generous nest of LINGUINE in a bright red marinara sauce, loaded with mixed seafood: black MUSSELS in their open shells, tender CALAMARI rings, pink SHRIMP, golden seared SCALLOPS, pieces of OCTOPUS tentacle and flakes of CRABMEAT.',
    styling: 'Seafood abundant and clearly identifiable. NO parsley, NO lemon, NO bread.' },
  'crispy-salmon': { batch: 2, name: 'Crispy Salmon',
    subject: '"Crispy Salmon" — crispy-skinned salmon with wild mushrooms and chive mashed potato.',
    plate: 'one thick SALMON FILLET, skin side up with crackling golden-brown crispy skin, moist coral flesh visible at the side, resting on a rustic mound of creamy green-flecked CHIVE MASHED POTATOES, with sauteed WILD MUSHROOMS around it.',
    styling: 'Skin crisp and blistered. Mash visibly green-flecked with chives. NO corn, NO other vegetable, NO lemon, NO dill, NO gravy.' },
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const batchIdx = args.indexOf('--batch');
const batch = batchIdx >= 0 ? Number(args[batchIdx + 1]) : null;
const picked = args.filter((a) => ITEMS[a]);
const keys = picked.length
  ? picked
  : Object.keys(ITEMS).filter((k) => batch === null || ITEMS[k].batch === batch);

// Written next to the images so the upload step maps file → product by exact
// database name, and so a reviewer can tell which run produced each file.
const manifestPath = `${OUT_DIR}/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

// fal.ai rate-limits long sessions (429s after ~180 generations, 422s before).
const GAP_MS = Number(process.env.GAP_MS ?? 8000);

let ok = 0;
for (const [i, k] of keys.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
  process.stdout.write(`[${i + 1}/${keys.length}] ${k}… `);
  try {
    const res = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt: build(ITEMS[k]), aspect_ratio: '1:1', output_resolution: '1K', num_images: 1 },
    });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    // nano-banana returns PNG; the extension says so. upload-products.mjs
    // compresses to JPEG before upload.
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
