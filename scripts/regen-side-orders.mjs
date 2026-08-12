/**
 * Regenerates every Side Orders product with nano-banana, from scratch.
 *
 * Not Kontext. Kontext edits the category anchor instead of composing a new
 * photograph, which means it inherits whatever is already on that plate: every
 * dish came back carrying the anchor's ramekin of ketchup — including the two
 * green salads — and it refused to change a base ingredient's colour, so sweet
 * potato fries arrived as ordinary potato. Prohibiting those in the prompt did
 * not remove them; removal is the operation Kontext does worst.
 *
 * nano-banana composes from the text alone, so the ketchup is simply never
 * placed. Consistency across the category comes from the shared prompt body —
 * white plate, dark slate, fixed angle and lighting — which is what produced the
 * 15 coherent style anchors.
 *
 * Writes to scripts/.product-output/. Touches nothing in the database.
 * Usage: node scripts/regen-side-orders.mjs [key ...]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output';

const key = (() => {
  const m = readFileSync('.env.local', 'utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '') : null;
})();
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;
const SOFT = `Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill.`;

const build = ({ subject, plate, styling, lighting, aperture }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side. NO coleslaw, NO pickles, NO extra dish, NO ramekin unless explicitly named above.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce. NO cilantro, NO lime wedges, NO Talavera pottery, NO rustic clay or terracotta.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cup, mug, clay pot or patterned dish. The plate sits on a dark matte slate stone surface. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO chairs, NO tables, NO windows, NO wall, NO wood, NO objects of any kind behind the food. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface anywhere in the background. NO studio softbox, NO reflector, NO light stand, NO camera gear anywhere in frame.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black in the FOOD itself. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

const FRIES_PLATE = (what) =>
  `a tall natural pile of ${what} filling the centre of the plate. NOTHING else on the plate — NO ramekin, NO sauce, NO dip, NO ketchup.`;

const ITEMS = {
  'french-fries': {
    subject: `"French Fries" — a generous portion of golden crispy french fries.`,
    plate: FRIES_PLATE('golden french fries'),
    styling: `Straight-cut batons, golden and crisp with visible salt crystals and slightly darker crunchy tips, piled naturally rather than arranged.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'loaded-french-fries': {
    subject: `"Loaded French Fries" — french fries smothered in melted mozzarella and American cheese with chopped bacon.`,
    plate: `a pile of golden french fries filling the centre of the plate, generously covered with melted cheese and scattered chopped bacon. NOTHING else on the plate — NO ramekin, NO extra sauce, NO ketchup.`,
    styling: `Cheese molten and glossy, pooling down between the fries in golden ribbons. Crisp chopped bacon scattered across the top. Fries golden underneath, still visible at the edges of the pile.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'waffle-fries': {
    subject: `"Waffle Fries" — a generous portion of crispy waffle-cut potato fries.`,
    plate: FRIES_PLATE('waffle-cut fries'),
    styling: `Each piece is a flat ROUND potato disc about 6cm across with a distinctive CRISS-CROSS LATTICE of square holes cut right through it — the classic waffle cut. They are NOT straight batons, NOT shoestring fries, NOT solid discs, NOT waffles or pastry. Deep golden and crisp with darker caramelised ridges, piled naturally so the lattice pattern and the holes through each piece are clearly visible. Visible salt crystals.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'onion-rings': {
    subject: `"Onion Rings" — a generous portion of thick steak-cut battered onion rings.`,
    plate: FRIES_PLATE('golden battered onion rings'),
    styling: `Thick O-shaped rings, hollow in the centre, in a craggy golden batter. Every piece is clearly a ring with a visible hole. Piled naturally, some leaning against others. NOT fries, NOT solid discs.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },

  'bacon-sausage-ham': {
    subject: `"Bacon, Sausage or Ham" — a diner side of breakfast meats.`,
    plate: `three strips of crisp streaky bacon, two browned breakfast sausage links and one thick slice of grilled ham arranged side by side across the centre of the plate. NOTHING else on the plate.`,
    styling: `Bacon crisp and wavy with rendered fat glistening, sausages deeply browned with taut skins, ham with caramelised grilled edges.`,
    lighting: HARD, aperture: 'f/4.0 — all three meats in sharp focus' },
  'turkey-canadian-bacon': {
    subject: `"Turkey Bacon or Canadian Bacon" — a diner side of turkey bacon and Canadian bacon.`,
    plate: `four strips of turkey bacon on the left of the plate and three thick round slices of Canadian bacon on the right. NOTHING else on the plate.`,
    styling: `Turkey bacon leaner and paler than pork bacon with browned edges. Canadian bacon in thick pink-brown rounds with seared faces.`,
    lighting: HARD, aperture: 'f/4.0 — everything in sharp focus' },
  'corned-beef-hash': {
    subject: `"Corned Beef Hash" — a diner side of homemade corned beef hash.`,
    plate: `a generous mound of corned beef hash in the centre of the plate. NOTHING else on the plate — NO egg, NO toast, NO ramekin.`,
    styling: `Shredded pink corned beef and diced potato griddled together until deeply browned and crisp at the edges, with soft steaming interior visible where the mound breaks open.`,
    lighting: HARD, aperture: 'f/4.0 — the whole mound in sharp focus' },
  'baked-potato': {
    subject: `"Baked Potato" — a whole baked potato with butter.`,
    plate: `one whole baked potato in the centre of the plate, split open lengthwise with a pat of butter melting into the fluffy interior. NOTHING else on the plate.`,
    styling: `Skin dark, wrinkled and crisp with visible salt. Interior white, fluffy and steaming, fork-broken. Butter half melted into a glossy pool.`,
    lighting: HARD, aperture: 'f/4.0 — the whole potato in sharp focus' },
  // Shot from overhead, a split potato reads as a whole one with topping sitting on
  // it — the split, which is the entire dish, disappears. Both of these need the
  // camera across the plate, not above it.
  'stuffed-potato-broccoli': {
    subject: `"Stuffed Baked Potato with Broccoli & Cheese".`,
    plate: `one baked potato in the centre of the plate, cut wide open along its length and pushed open at the ends so the split gapes, overflowing with broccoli florets under melted cheese. NOTHING else on the plate. The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark slate surface behind it are visible.`,
    styling: `Potato skin dark, wrinkled and crisp. The cut faces of the split show fluffy white interior. Bright green broccoli florets heaped into the open split, smothered in molten golden cheese pooling down over the skin.`,
    lighting: HARD, aperture: 'f/4.0 — the whole potato in sharp focus' },
  'stuffed-potato-bacon': {
    subject: `"Stuffed Baked Potato with Bacon & Cheese".`,
    plate: `one baked potato in the centre of the plate, cut wide open along its length and pushed open at the ends so the split gapes, filled with melted cheese and chopped bacon. NOTHING else on the plate. The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark slate surface behind it are visible.`,
    styling: `Potato skin dark, wrinkled and crisp. The cut faces of the split show fluffy white interior. Molten golden cheese filling the open split with crisp chopped bacon scattered over it.`,
    lighting: HARD, aperture: 'f/4.0 — the whole potato in sharp focus' },

  'sweet-potato-fries': {
    subject: `"Sweet Potato Fries" — a generous portion of crispy sweet potato fries.`,
    plate: FRIES_PLATE('sweet potato fries'),
    styling: `The fries are cut from SWEET POTATO: deep vivid ORANGE flesh, clearly orange-amber throughout, never pale yellow like regular potato. Crisp darker caramelised edges, soft orange interior visible where a fry is broken. Visible salt crystals.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },
  'fried-plantains-tostones': {
    subject: `"Tostones" — twice-fried green plantain discs, a Caribbean side dish.`,
    plate: FRIES_PLATE('flat round tostones'),
    styling: `These are GREEN PLANTAIN, not potato: each piece is a flat disc about 6cm across and 1.5cm thick, smashed flat after the first fry so the edges are rough, cracked and irregular, showing the plantain's straight longitudinal fibres. They have been fried TWICE and are DEEP GOLDEN-BROWN and glossy all over — richly fried, crisp and well coloured, NOT pale, NOT beige, NOT raw-looking. The surface is crunchy and blistered with darker caramelised edges. Visible salt crystals.`,
    lighting: HARD, aperture: 'f/4.0 — the whole pile in sharp focus' },

  'lettuce-tomato-salad': {
    subject: `"Lettuce & Tomato Salad" — a simple fresh side salad of lettuce and tomato.`,
    plate: `a mound of crisp green lettuce leaves in the centre of the plate with thick slices of ripe red tomato arranged over them. NOTHING else on the plate — NO ramekin, NO sauce, NO ketchup, NO dressing cup, NO fried food.`,
    styling: `Lettuce crisp and vividly green with water droplets, tomato slices thick, deep red and juicy with visible seeds.`,
    lighting: SOFT, aperture: 'f/5.6 — all ingredients in sharp focus' },
  'tossed-salad': {
    subject: `"Tossed Salad" — a fresh mixed green salad.`,
    plate: `a generous mound of mixed green leaves in the centre of the plate, tossed with sliced cucumber, wedges of red tomato and thin red onion rings. NOTHING else on the plate — NO ramekin, NO sauce, NO ketchup, NO dressing cup, NO fried food.`,
    styling: `Mixed greens crisp and glossy, cucumber slices fresh, tomato wedges deep red, red onion in thin translucent rings.`,
    lighting: SOFT, aperture: 'f/5.6 — all ingredients in sharp focus' },
  'cole-slaw': {
    subject: `"Cole Slaw" — a diner side of creamy coleslaw.`,
    plate: `a neat mound of creamy coleslaw in the centre of the plate. NOTHING else on the plate.`,
    styling: `Finely shredded white cabbage and orange carrot threads bound in a glossy creamy dressing, freshly made and slightly heaped.`,
    lighting: SOFT, aperture: 'f/5.6 — the whole mound in sharp focus' },
  'potato-salad': {
    subject: `"Potato Salad" — a diner side of homemade potato salad.`,
    plate: `a neat mound of potato salad in the centre of the plate. NOTHING else on the plate.`,
    styling: `Chunks of soft white potato in a creamy dressing with flecks of celery and red onion, dusted with paprika.`,
    lighting: SOFT, aperture: 'f/5.6 — the whole mound in sharp focus' },
  'cottage-cheese': {
    subject: `"Cottage Cheese" — a diner side of cottage cheese.`,
    plate: `a neat scoop of cottage cheese in the centre of the plate. NOTHING else on the plate — NO fruit, NO garnish, NO ramekin.`,
    styling: `Soft white curds, moist and loose, holding the shape of the scoop.`,
    lighting: SOFT, aperture: 'f/5.6 — the curds in sharp focus' },
  'apple-sauce': {
    subject: `"Apple Sauce" — a diner side of apple sauce.`,
    plate: `a shallow pool of apple sauce spooned into the centre of the plate. NOTHING else on the plate — NO ramekin, NO cinnamon stick, NO garnish.`,
    styling: `Pale golden apple sauce, softly textured rather than perfectly smooth, with a gentle sheen.`,
    lighting: SOFT, aperture: 'f/5.6 — the surface texture in sharp focus' },

  'vegetable-of-the-day': {
    subject: `"Vegetable of the Day" — a diner side of fresh seasonal vegetables.`,
    plate: `a portion of steamed green beans, carrot slices and broccoli florets arranged together in the centre of the plate. NOTHING else on the plate.`,
    styling: `Vegetables bright and just-cooked, still firm, with a light butter sheen. Green beans vivid green, carrots deep orange, broccoli bright.`,
    lighting: SOFT, aperture: 'f/5.6 — all vegetables in sharp focus' },
  'broccoli-with-cheese': {
    subject: `"Broccoli with Cheese" — steamed broccoli under melted cheese.`,
    plate: `a portion of steamed broccoli florets in the centre of the plate, covered with melted cheese. NOTHING else on the plate.`,
    styling: `Broccoli bright green and just-cooked, smothered in molten golden cheese running down between the florets.`,
    lighting: SOFT, aperture: 'f/5.6 — the florets in sharp focus' },
  'feta-cheese': {
    subject: `"Feta Cheese" — a diner side of Greek feta cheese.`,
    plate: `a thick slab of white feta cheese in the centre of the plate, with a light drizzle of olive oil and a sprinkle of dried oregano. NOTHING else on the plate — NO olives, NO tomato, NO bread.`,
    styling: `Feta bright white, dense and crumbly at the edges, with olive oil glistening on its surface.`,
    lighting: SOFT, aperture: 'f/5.6 — the crumbly texture in sharp focus' },
  // The softbox and reflector that poisoned ten of the original anchors came back
  // here. The global "no studio gear" rule is not enough — the ban only holds when
  // it names the frame edges, which is where the panels actually intrude.
  'tzatziki-pita': {
    subject: `"Tzatziki Dip with Toasted Pita Wedges".`,
    plate: `a small white ramekin of tzatziki on the plate with six toasted pita wedges fanned beside it on the same plate. NOTHING else. The frame contains the plate and the dark surface it sits on and NOTHING ELSE — every edge and every corner of the image is pure dark background. NO softbox, NO reflector panel, NO light stand, NO white or silver rectangle, NO bright panel at the top, sides or corners of the image. The dark surface is one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a slate board, NOT a serving tray, NOT a tile or slab with visible edges or corners under the plate.`,
    styling: `Tzatziki thick, white and glossy with visible grated cucumber and a drizzle of olive oil. Pita wedges well TOASTED — golden brown with dark charred blisters and grill spots across their surfaces, not pale or raw-looking — warm and puffed.`,
    lighting: SOFT, aperture: 'f/4.0 — dip and pita both in sharp focus' },
  // A flat dish photographed flat invites the camera overhead: this one came back
  // top-down while the other 23 sat at 35 degrees, and the tabletop vanished with
  // it. Stating the angle again here, as height rather than degrees, holds it.
  'guacamole': {
    subject: `"Guacamole" — a diner side of fresh made guacamole.`,
    plate: `a mound of freshly made guacamole heaped in the centre of the plate, tall enough to cast a shadow. NOTHING else on the plate — NO tortilla chips, NO cilantro, NO lime wedge, NO ramekin. The camera is at a 35-degree THREE-QUARTER angle, level with the food and looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark slate surface behind it are both clearly visible.`,
    styling: `Guacamole coarsely mashed with visible chunks of avocado and flecks of red onion and tomato, vivid fresh green, never brown or grey. Heaped high so its depth and surface texture read in profile.`,
    lighting: SOFT, aperture: 'f/5.6 — the chunky texture in sharp focus' },
  'sliced-avocado': {
    subject: `"Sliced Avocado" — a diner side of fresh sliced avocado.`,
    plate: `slices of ripe avocado fanned across the centre of the plate. NOTHING else on the plate — NO lime wedge, NO seasoning bowl, NO garnish.`,
    styling: `Avocado slices even and fanned, vivid green at the edge fading to pale yellow-green at the centre, with a soft natural sheen.`,
    lighting: SOFT, aperture: 'f/5.6 — the slices in sharp focus' },
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const picked = process.argv.slice(2).filter((a) => ITEMS[a]);
const keys = picked.length ? picked : Object.keys(ITEMS);

let ok = 0;
for (const [i, k] of keys.entries()) {
  process.stdout.write(`[${i + 1}/${keys.length}] ${k}… `);
  try {
    const res = await fal.subscribe('fal-ai/nano-banana-2', {
      input: { prompt: build(ITEMS[k]), aspect_ratio: '1:1', output_resolution: '2K', num_images: 1 },
    });
    const url = res?.data?.images?.[0]?.url ?? res?.images?.[0]?.url;
    if (!url) { console.log('sin imagen'); continue; }
    writeFileSync(`${OUT_DIR}/${k}.jpg`, Buffer.from(await (await fetch(url)).arrayBuffer()));
    ok++;
    console.log('ok');
  } catch (err) {
    console.log('ERROR:', err?.message ?? String(err));
  }
}
console.log(`\n${ok}/${keys.length} generados en ${OUT_DIR}.`);
