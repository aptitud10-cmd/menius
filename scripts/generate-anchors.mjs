/**
 * One-off generator for Buccaneer's style anchors.
 *
 * An anchor is just a good photo of one dish per category: bulk regeneration
 * feeds it to Kontext, which keeps its plate, background and lighting and swaps
 * only the food. That is why a bad anchor is not one bad photo but N — the
 * "Appetizers" anchor was Mexican nachos with a whiskey glass, and every
 * appetiser would have inherited the guacamole and the glass.
 *
 * Generates one image per category listed below, writes them to disk for review,
 * and stops. It does NOT touch the database: nothing becomes an anchor until a
 * human has looked at it.
 *
 * Usage:  node scripts/generate-anchors.mjs [category-key ...]
 * Reads FAL_API_KEY from .env.local.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.anchor-output';

// ── key ─────────────────────────────────────────────────────────────────────
function readKey() {
  const fromEnv = (process.env.FAL_API_KEY ?? '').trim();
  if (fromEnv) return fromEnv;
  try {
    const env = readFileSync('.env.local', 'utf8');
    const m = env.match(/^FAL_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return null;
}

// ── prompt ──────────────────────────────────────────────────────────────────
// Mirrors what buildFoodPrompt produces for this restaurant (cuisine "Diner"),
// with the three fixes validated by hand against real generations:
//   - plate composition stated up front, not buried at the end, or it is ignored
//   - unwanted items forbidden by name; omitting them is not enough
//   - the background declared explicitly empty, or a chair drifts into frame
const build = ({ subject, plate, styling, lighting, aperture }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side. NO coleslaw, NO pickles, NO extra dish, NO ramekin unless explicitly named above.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce. NO cilantro, NO lime wedges, NO Talavera pottery, NO rustic clay or terracotta.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80% — outer 10% may be cropped by UI. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cup, mug, clay pot, molcajete, Talavera, terracotta or patterned dish. The plate sits on a dark matte slate stone surface. The background is a COMPLETELY PLAIN, EMPTY, deep dark backdrop, heavily out of focus — NO furniture, NO chairs, NO tables, NO windows, NO room detail, NO objects of any kind behind the food. NO studio softbox, NO reflector, NO light stand, NO camera gear anywhere in frame. NO bright washed-out corners — every corner filled with the dark slate/background.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black. Highlights slightly golden, never blown out. High micro-contrast revealing every individual texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

const HARD_LIGHT = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the Maillard crust, the crisp edges, the glossy sauce. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;
const SOFT_LIGHT = `Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill. Subtle warm rim backlight separates the subject from the background naturally.`;

// Categories ordered by how many products each anchor covers.
const ANCHORS = {
  'side-orders': {
    category: 'Side Orders', covers: 24,
    subject: `"French Fries" — a generous portion of golden crispy french fries.`,
    plate: `a tall natural pile of golden french fries filling the centre of the plate, with a small white ramekin of ketchup at the edge of the same plate. Nothing else.`,
    styling: `Fries golden and crisp with visible salt crystals and slightly darker crunchy tips, piled naturally rather than arranged.`,
    lighting: HARD_LIGHT, aperture: 'f/4.0 — the whole pile in sharp focus',
  },
  'seafood': {
    category: 'Seafood', covers: 20,
    subject: `"Fried Jumbo Shrimp" — six golden breaded jumbo shrimp with a lemon wedge and cocktail sauce.`,
    plate: `six large breaded shrimp arranged naturally in the centre of the plate, one lemon wedge and a small white ramekin of red cocktail sauce beside them on the same plate. Nothing else.`,
    styling: `Breading golden and craggy, shrimp plump and generous, lemon fresh and bright.`,
    lighting: HARD_LIGHT, aperture: 'f/4.0 — every shrimp in sharp focus',
  },
  'burgers-7oz': {
    category: '7 oz. Certified Angus Beef Burgers', covers: 10,
    subject: `"Bacon Cheeseburger" — a 7 oz. Angus beef burger on a toasted sesame bun with melted American cheese and crisp bacon, served diner style with french fries.`,
    plate: `the burger sits on the left of the plate, closed, with ONLY the melted cheese and bacon stacked inside the bun. A generous pile of golden french fries fills the right side. A crisp green lettuce leaf and two thick slices of ripe red tomato rest at the back of the SAME plate, beside the burger — never inside it. Nothing else on the plate.`,
    styling: `Glossy toasted sesame bun, Maillard-crusted patty with visible char, cheese melting in golden ribbons down the sides, crisp wavy bacon. Lettuce fresh, tomato slices thick and juicy.`,
    lighting: HARD_LIGHT, aperture: 'f/4.0 — burger sharp from bottom bun to crown and the fries clearly resolved',
  },
  'salads': {
    category: 'Gourmet Salads', covers: 13,
    subject: `"Caesar Salad" — crisp romaine lettuce with shaved parmesan, croutons and caesar dressing.`,
    plate: `a generous mound of chopped romaine in the centre of the plate, tossed with dressing, topped with shaved parmesan and golden croutons. Nothing else.`,
    styling: `Romaine crisp and vividly green with visible dressing sheen, parmesan in wide thin shavings, croutons golden and rustic.`,
    lighting: SOFT_LIGHT, aperture: 'f/5.6 — all ingredients in sharp focus',
  },
  'sandwiches': {
    category: 'Signature Sandwiches', covers: 9,
    subject: `"Reuben" — corned beef, sauerkraut, Swiss cheese and Russian dressing on grilled rye bread, cut in half.`,
    plate: `the sandwich cut in half on the diagonal, both halves standing cut-side toward the camera on the left of the plate so the filling layers are fully visible, a pile of golden french fries on the right. Nothing else.`,
    styling: `Rye bread deeply griddled with visible grill marks, corned beef piled thick and pink, Swiss cheese melting at the edges, sauerkraut visible in the layers.`,
    lighting: HARD_LIGHT, aperture: 'f/3.5 — all layers sharp in cross-section',
  },
  'appetizers': {
    category: 'Appetizers', covers: 21,
    subject: `"Mozzarella Sticks" — golden fried mozzarella sticks served with marinara sauce.`,
    plate: `a natural pile of golden breaded mozzarella sticks in the centre of the plate, one of them broken in half with a visible stretch of melted cheese, and a small white ramekin of marinara sauce at the edge of the same plate. Nothing else.`,
    styling: `Breading golden and crunchy, one stick pulled apart showing a long strand of melted mozzarella. Marinara glossy and deep red.`,
    lighting: SOFT_LIGHT, aperture: 'f/2.8 — front sticks tack sharp, back of the pile gently defocused',
  },
};

// ── run ─────────────────────────────────────────────────────────────────────
const key = readKey();
if (!key) {
  console.error('FAL_API_KEY no encontrada. Escribila en .env.local:\n  FAL_API_KEY=fal-...');
  process.exit(1);
}
fal.config({ credentials: key });

const picked = process.argv.slice(2).filter((a) => ANCHORS[a]);
const keys = picked.length ? picked : Object.keys(ANCHORS);
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const k of keys) {
  const a = ANCHORS[k];
  process.stdout.write(`[${k}] ${a.category} (${a.covers} productos)… `);
  try {
    const res = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt: build(a), aspect_ratio: '1:1', output_resolution: '2K', num_images: 1 },
    });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(`${OUT_DIR}/${k}.jpg`, buf);
    console.log(`ok → ${OUT_DIR}/${k}.jpg`);
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}
console.log('\nRevisá las imágenes antes de marcar ninguna como anchor.');
