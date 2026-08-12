/**
 * Regenerates both burger categories with nano-banana: the 7 oz. Angus burgers
 * and the 9 oz. specialty steak burgers, nineteen products that currently share
 * ONE Unsplash photo between them.
 *
 * The plating rules here were settled with William over several rounds against
 * real generations, and they are not derivable from the descriptions:
 *
 *   - A regular burger is the sandwich alone. Lettuce and tomato belong to the
 *     Deluxe, and putting them in every photo would sell the upgrade as standard.
 *   - Every burger is served with coleslaw and a pickle, and NEITHER is shown.
 *     They are named as forbidden rather than omitted, because "don't mention it"
 *     is not enough — the model adds a ramekin on its own.
 *   - Fries stand in for "your choice of side" so the plate is not bare.
 *   - The Pizza Burger comes on an English muffin, not a bun, and never carries
 *     lettuce or tomato in either version.
 *
 * Usage: node scripts/regen-burgers.mjs [key ...]
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

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the Maillard crust, the toasted bun, the melting cheese. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;

const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

/**
 * A Regular burger is the sandwich, a monkey dish of coleslaw and a pickle spear.
 * Nothing else — and in particular NO fries: the menu's listed price buys the
 * Regular, while fries are part of the Deluxe upgrade (+$4 on the 7 oz, +$5 on
 * the 9 oz, per the "Style" modifier group). A photograph with a pile of fries
 * shows the $16.95 plate beside the $12.95 price.
 *
 * Lettuce and tomato are Deluxe too, so they stay out for the same reason.
 */
const PLATE = (stack, bun = 'a toasted sesame brioche bun') =>
  `the burger sits closed in the centre-left of the plate on ${bun}, with ONLY ${stack} stacked inside it. Beside it on the same plate: one small white ramekin (a monkey dish) of creamy coleslaw and one whole pickle spear. Nothing else on the plate — NO french fries, NO potatoes of any kind, NO chips, NO lettuce, NO tomato, NO onion rings, NO salad, NO second ramekin, NO sauce cup. ${ANGLE}`;

/**
 * The Deluxe plating, recorded but NOT used. Deluxe is an option inside each
 * product's "Style" modifier group, not a product of its own — the menu shows one
 * photo per product, and that photo has to match the price on the card, which is
 * the Regular's. Kept here so the spec is not lost if a second image per product
 * ever becomes possible:
 *
 *   7 oz. Deluxe  (+$4): burger + french fries + lettuce and tomato
 *   9 oz. Deluxe  (+$5): burger + waffle fries + lettuce and tomato
 *   (coleslaw and pickle come with both, as with the Regular)
 */

const build = ({ subject, plate, styling }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce, no skewer through the bun, no wooden board.
CAMERA: 50mm or 85mm prime lens, f/4.0 — burger sharp from bottom bun to crown, coleslaw and pickle clearly resolved, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a basket, NEVER a wooden board, NEVER a patterned dish. The plate sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${HARD}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

const PATTY_7 = `The patty is a 7 oz. Angus beef patty with a deep Maillard crust and visible char, slightly wider than the bun. Bun glossy and toasted.`;
const PATTY_9 = `The patty is a thick 9 oz. steak burger with a deep Maillard crust and visible char, noticeably tall and wider than the bun. Bun glossy and toasted.`;

const ITEMS = {
  // ── 7 oz. Certified Angus Beef Burgers ─────────────────────────────────────
  'beef-burger': {
    subject: `"Beef Burger" — a plain 7 oz. Angus beef burger with french fries.`,
    plate: PLATE('the beef patty, with no cheese and no toppings at all'),
    styling: `${PATTY_7} The burger is plain — just the patty in the bun.` },
  'cheeseburger': {
    subject: `"Cheeseburger" — a 7 oz. Angus burger with melted American cheese and french fries.`,
    plate: PLATE('the beef patty and a slice of melted American cheese'),
    styling: `${PATTY_7} Orange American cheese melting in soft ribbons over the edges of the patty.` },
  'bacon-burger': {
    subject: `"Bacon Burger" — a 7 oz. Angus burger topped with crispy bacon, with french fries.`,
    plate: PLATE('the beef patty and three strips of crisp bacon'),
    styling: `${PATTY_7} Crisp wavy bacon strips laid across the patty, edges visible past the bun.` },
  'bacon-cheeseburger': {
    subject: `"Bacon Cheeseburger" — a 7 oz. Angus burger with bacon and melted cheese, with french fries.`,
    plate: PLATE('the beef patty, melted American cheese and three strips of crisp bacon'),
    styling: `${PATTY_7} Cheese melting in golden ribbons with crisp bacon visible on top of it.` },
  'pizza-burger': {
    subject: `"Pizza Burger" — a 7 oz. Angus burger with melted mozzarella and marinara on an English muffin, with french fries.`,
    plate: PLATE(
      'the beef patty, melted white mozzarella and red marinara sauce',
      'a split toasted ENGLISH MUFFIN — a flat round griddled muffin with a rough craggy surface, NOT a sesame bun, NOT a brioche bun'),
    styling: `${PATTY_7.replace('Bun glossy and toasted.', '')} The English muffin is flat, pale and griddled with a visibly rough, porous split face. Mozzarella melted white and stringy with glossy red marinara sauce spilling at the edges.` },
  'mushroom-burger': {
    subject: `"Mushroom Burger" — a 7 oz. Angus burger with sauteed mushrooms, with french fries.`,
    plate: PLATE('the beef patty and a heap of sauteed sliced mushrooms'),
    styling: `${PATTY_7} Dark glossy sauteed mushroom slices piled on the patty, spilling slightly from the bun.` },
  'ranch-burger': {
    subject: `"Ranch Burger" — a 7 oz. Angus burger with bacon, cheddar and ranch dressing, with french fries.`,
    plate: PLATE('the beef patty, melted cheddar, crisp bacon and a drizzle of white ranch dressing'),
    styling: `${PATTY_7} Orange cheddar melted over the patty, crisp bacon on top, white ranch dressing visible at the edge of the bun.` },
  'texas-burger': {
    subject: `"Texas Burger" — a 7 oz. Angus burger topped with a fried egg, with french fries.`,
    plate: PLATE('the beef patty and one fried egg with an intact runny yolk sitting on top'),
    styling: `${PATTY_7} A fried egg with a bright orange runny yolk and set white edges resting on the patty, the yolk clearly visible under the bun crown which sits slightly tilted.` },
  'turkey-burger': {
    subject: `"Turkey Burger" — a lean turkey burger with french fries.`,
    plate: PLATE('the turkey patty, with no cheese and no toppings at all'),
    styling: `The patty is a lean TURKEY burger — paler than beef, a light greyish-tan with a golden seared crust, slightly thicker and less dense than a beef patty. Bun glossy and toasted.` },
  'veggie-burger': {
    subject: `"Veggie Burger" — a plant-based veggie burger with french fries.`,
    plate: PLATE('the veggie patty, with no cheese and no toppings at all'),
    styling: `The patty is a PLANT-BASED veggie burger — visibly textured with flecks of grain, bean and vegetable, browner and coarser than a beef patty, with a seared crust. Bun glossy and toasted.` },

  // ── 9 oz. Specialty Steak Burgers ──────────────────────────────────────────
  'western-burger': {
    subject: `"Western Burger" — a 9 oz. steak burger with avocado, raw onion and ranch dressing, with french fries.`,
    plate: PLATE('the steak patty, slices of green avocado, rings of raw white onion and a drizzle of white ranch dressing'),
    styling: `${PATTY_9} Fanned green avocado slices and translucent raw onion rings visible at the edge of the bun, white ranch dressing glossy.` },
  'mexican-burger': {
    subject: `"Mexican Burger" — a 9 oz. steak burger with cheddar, grilled jalapenos and guacamole, with french fries.`,
    plate: PLATE('the steak patty, melted cheddar, grilled green jalapeno slices and a spoonful of guacamole'),
    styling: `${PATTY_9} Orange cheddar melted over the patty, charred green jalapeno rings and a scoop of vivid green guacamole visible at the bun edge.` },
  'portobello-burger': {
    subject: `"Portobello Burger" — a 9 oz. steak burger with grilled portobello and caramelized onions, with french fries.`,
    plate: PLATE('the steak patty, one whole grilled portobello mushroom cap and a heap of caramelized onions'),
    styling: `${PATTY_9} A large dark grilled portobello cap sitting on the patty with glistening golden-brown caramelized onions spilling over the edge.` },
  'alpine-burger': {
    subject: `"Alpine Burger" — a 9 oz. steak burger with Swiss cheese, fried peppers and onions, with french fries.`,
    plate: PLATE('the steak patty, melted Swiss cheese, strips of fried red and green bell pepper and fried onions'),
    styling: `${PATTY_9} Pale Swiss cheese melting over the patty with colourful strips of fried red and green pepper and softened onion visible at the bun edge.` },
  'reuben-pastrami-burger': {
    subject: `"Reuben Pastrami Burger" — a 9 oz. steak burger with pastrami, sauerkraut, Russian dressing and Swiss, with french fries.`,
    plate: PLATE('the steak patty, a pile of sliced pink pastrami, pale sauerkraut, melted Swiss cheese and pink Russian dressing'),
    styling: `${PATTY_9} Thick pink pastrami slices piled on the patty under melting Swiss, with pale shredded sauerkraut and pink Russian dressing visible at the bun edge.` },
  'roadhouse-burger': {
    subject: `"Roadhouse Burger" — a 9 oz. steak burger with pepper jack, bacon, avocado, grilled onions and chipotle sauce, with french fries.`,
    plate: PLATE('the steak patty, melted pepper jack cheese, crisp bacon, green avocado slices, grilled onions and a drizzle of orange chipotle sauce'),
    styling: `${PATTY_9} Pepper jack melting over the patty, crisp bacon and fanned avocado slices on top, glistening grilled onions and a glossy orange chipotle drizzle at the bun edge.` },
  'bbq-burger': {
    subject: `"BBQ Burger" — a 9 oz. steak burger with bacon, fried onions, barbecue sauce and cheddar, with french fries.`,
    plate: PLATE('the steak patty, melted cheddar, crisp bacon, crisp fried onions and glossy dark barbecue sauce'),
    styling: `${PATTY_9} Dark glossy barbecue sauce running down the patty over melted cheddar, with crisp bacon and a tangle of golden fried onions on top.` },
  'cowboy-burger': {
    subject: `"Cowboy Burger" — a 9 oz. steak burger with wild mushrooms, grilled onions and pepper jack, with french fries.`,
    plate: PLATE('the steak patty, melted pepper jack cheese, grilled wild mushrooms and grilled onions'),
    styling: `${PATTY_9} Pepper jack melting over the patty under a heap of dark grilled wild mushrooms and glistening grilled onions.` },
  'chili-cheeseburger': {
    subject: `"Chili Cheeseburger" — a 9 oz. steak burger topped with house chili and jack cheese, with french fries.`,
    plate: PLATE('the steak patty, melted jack cheese and a generous spoonful of thick meat chili spooned over the top of the bun crown'),
    styling: `${PATTY_9} Thick dark-red meat chili spooned over the crown of the bun and running down the sides, with melted pale jack cheese visible underneath.` },
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const picked = process.argv.slice(2).filter((a) => ITEMS[a]);
const keys = picked.length ? picked : Object.keys(ITEMS);

// fal.ai rate-limits a long session: after ~180 generations it stopped returning
// images and started returning 429, with 422s appearing as an earlier symptom of
// the same pressure. Spacing the calls keeps a batch from burning its whole retry
// budget in the first few seconds.
const GAP_MS = Number(process.env.GAP_MS ?? 8000);

let ok = 0;
for (const [i, k] of keys.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
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
