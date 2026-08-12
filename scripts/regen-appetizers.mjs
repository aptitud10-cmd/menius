/**
 * Regenerates the Appetizers category with nano-banana.
 *
 * Method and rationale: see regen-side-orders.mjs. Kontext is not used here for
 * the reason recorded there — it inherits whatever sits on the reference plate.
 *
 * Two hazards specific to this category:
 *   - four quesadillas and a "Mini Taco" pull hard toward Mexican styling:
 *     Talavera pottery, terracotta, cilantro, lime. This is a Queens diner. Every
 *     one of those entries names the diner plate and forbids the pottery, which
 *     is the same fight buildFoodPrompt already lost once (see food-prompt.test.ts).
 *   - flat, spread-out appetisers invite an overhead camera, so the angle is
 *     restated per dish rather than only in the shared body.
 *
 * Usage: node scripts/regen-appetizers.mjs [key ...]
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

const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

/**
 * The quesadillas and the taco drift toward a Mexican restaurant, and William is
 * fine with the food looking Mexican — these ARE Mexican dishes. What cannot
 * drift is the tableware: Talavera and terracotta would break the white-plate,
 * dark-slate frame the other 42 photos share, and the menu reads as one set or
 * it reads as scraped. So the garnishes are allowed and the props are not.
 */
const MEXICAN_FOOD_DINER_PLATE = `The tableware stays diner: one plain WHITE ceramic plate on dark slate. NO Talavera, NO hand-painted or patterned pottery, NO terracotta, NO clay dish, NO molcajete, NO wooden board, NO cast iron, NO woven textiles or Mexican props. Only the garnishes named above appear — nothing is added beyond them.`;

const build = ({ subject, plate, styling, lighting, aperture }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side. NO coleslaw, NO pickles, NO extra dish, NO ramekin unless explicitly named above.

SERVED IN/ON: one single large plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no smears or dots of sauce. NO cilantro, NO Talavera pottery, NO rustic clay or terracotta.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the food is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cup, mug, clay pot or patterned dish. The plate sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO chairs, NO tables, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

/**
 * Corrected 2026-08-12 against photographs of the real dish. The database
 * description says "served with plantain sides", which I read as fried plantain
 * and put on all four — the restaurant serves none. What the plate actually
 * carries is a bed of shredded lettuce under the wedges, with salsa and sour
 * cream in small cups on the side.
 */
const QUESADILLA = (filling, styling) => ({
  subject: `"${filling.name} Quesadillas" — a grilled flour tortilla quesadilla with ${filling.what} and melted cheese, cut into wedges.`,
  plate: `six quesadilla wedges arranged in a ring on a bed of fresh green leaf lettuce that covers the plate, cut sides toward the camera so the melted cheese and filling are visible. In the centre of the ring sit two small white cups: one of red chunky salsa and one of white sour cream. Nothing else at all — NO plantain, NO fried banana, NO rice, NO beans, NO lime, NO lime wedge, NO citrus, NO cilantro sprinkled on top, NO garnish of any kind on the wedges. ${MEXICAN_FOOD_DINER_PLATE} ${ANGLE}`,
  styling,
  lighting: HARD,
  aperture: 'f/4.0 — the filling in the cut edges tack sharp',
});

const ITEMS = {
  'the-sampler': {
    subject: `"The Sampler" — a combination platter of mozzarella sticks, buffalo wings, chicken fingers and potato skins.`,
    plate: `four groups arranged in quadrants on one large plate, each clearly separate: three golden mozzarella sticks, three red buffalo wings, three breaded chicken fingers, and two loaded potato skins. Nothing else. ${ANGLE}`,
    styling: `Each item distinctly different: mozzarella sticks pale golden and cylindrical, wings glossy red-orange, chicken fingers craggy golden strips, potato skins dark with melted cheese and bacon.`,
    lighting: HARD, aperture: 'f/5.0 — all four groups in sharp focus' },
  // Six, not four: counted off a photograph of the real plate.
  'stuffed-clams-app': {
    subject: `"Stuffed Clams" — six clams baked with crab meat stuffing, as an appetizer.`,
    plate: `SIX clam shells arranged in a ring on the plate, each filled with golden browned crabmeat stuffing, with one lemon wedge. Nothing else. ${ANGLE}`,
    styling: `Shells grey-brown and ridged, stuffing golden and crusty on top with visible crab and breadcrumb texture.`,
    lighting: HARD, aperture: 'f/4.0 — the stuffing texture in sharp focus' },
  'stuffed-mushrooms': {
    subject: `"Stuffed Mushrooms" — mushroom caps filled with crab meat stuffing.`,
    plate: `six large mushroom caps arranged in the centre of the plate, each filled with golden browned crabmeat stuffing. Nothing else. ${ANGLE}`,
    styling: `Mushroom caps dark brown and glossy, each holding a mound of golden crusted stuffing with visible crab meat.`,
    lighting: HARD, aperture: 'f/4.0 — the stuffing in sharp focus' },
  // Corrected against a photograph of the real plate: the shells sit on a bed of
  // green leaf lettuce, and the stuffing is a reddish paprika-brown crust, not the
  // classic recipe's diced peppers. My first version put them on bare white china
  // with vegetable confetti — wrong on both counts.
  'clams-casino': {
    subject: `"Clams Casino" — a dozen littleneck clams baked with casino stuffing, served on lettuce.`,
    plate: `TWELVE clam shells arranged in a ring on a bed of fresh green leaf lettuce that covers the plate, each shell filled with a browned reddish stuffing, with two lemon wedges. NO peppers, NO diced vegetables, NO corn, NO peas, NO green or red vegetable flecks in the stuffing itself. ${ANGLE}`,
    styling: `Clams under a deeply browned breadcrumb crust, reddish-brown from paprika, crisp and craggy on top. Uniform in colour — no colourful vegetable specks. The lettuce underneath is fresh, ruffled and bright green.`,
    lighting: HARD, aperture: 'f/4.5 — the shells and the topping in sharp focus' },
  // The chipotle mayo goes ON the cakes, with diced onion, tomato and corn — not
  // in a cup on the side, which is how I first read the description.
  'mini-crab-cakes': {
    subject: `"Mini Crab Cakes" — New Orleans-style mini crab cakes topped with onion, tomato, corn and chipotle mayo.`,
    plate: `five small round crab cakes arranged in the centre of the plate. Each one is TOPPED with a spoonful of finely diced red tomato, diced white onion and yellow corn kernels, and drizzled over with pale orange chipotle mayo. The topping sits ON the crab cakes — NOT in a cup, NOT a ramekin, NOT on the side. Nothing else on the plate. ${ANGLE}`,
    styling: `Crab cakes golden-brown and craggy with visible lumps of white crab meat at the edges, about 6cm across, each crowned with a colourful confetti of red tomato, white onion and yellow corn under a glossy drizzle of orange chipotle mayo.`,
    lighting: HARD, aperture: 'f/4.0 — the crab texture and the topping in sharp focus' },
  'fried-calamari-app': {
    subject: `"Fried Calamari" — golden fried calamari with marinara sauce, as an appetizer.`,
    plate: `a generous pile of golden fried calamari rings and tentacles in the centre of the plate with a small white ramekin of red marinara sauce and one lemon wedge beside it. Nothing else. ${ANGLE}`,
    styling: `Calamari in a light craggy golden batter, rings and tentacles mixed, crisp and irregular.`,
    lighting: HARD, aperture: 'f/4.0 — the pile in sharp focus' },
  // Not an open taco shell: the real item is a sealed, deep-fried corn-masa
  // half-moon — an empanada in shape. The first version generated five standing
  // hard-shell tacos, which is a different product entirely.
  // Twelve, not six, and deep golden rather than pale: counted and colour-matched
  // off a photograph of the real plate.
  'mini-taco': {
    subject: `"Mini Taco" — a dozen small deep-fried sealed corn masa turnovers filled with seasoned ground chicken.`,
    plate: `TWELVE small SEALED half-moon turnovers covering the plate in two overlapping rows, with a small white cup of red taco sauce. Each piece is a CLOSED semicircular pocket of corn masa, crimped shut along its curved edge — NOT an open taco shell, NOT a folded tortilla, NOT a standing taco, NO visible filling, NO lettuce or cheese on top. ${MEXICAN_FOOD_DINER_PLATE} ${ANGLE}`,
    styling: `Each turnover is a flat half-moon about 8cm across, DEEP GOLDEN-YELLOW and well fried — richly coloured, never pale or beige — with a rough grainy corn-masa surface, scattered dark blistered spots and a sealed crimped rim. Rustic and hand-made, slightly irregular in shape.`,
    lighting: HARD, aperture: 'f/4.5 — the masa surface texture in sharp focus' },
  'spinach-pie': {
    subject: `"Mediterranean Style Spinach Pie" — flaky phyllo stuffed with spinach and feta.`,
    plate: `three triangular phyllo spinach pies arranged on the plate, one cut open to show the green spinach and white feta filling. Nothing else. ${ANGLE}`,
    styling: `Phyllo golden, layered and visibly flaky with crisp edges. The cut piece shows dark green spinach flecked with white feta.`,
    lighting: HARD, aperture: 'f/4.0 — the phyllo layers in sharp focus' },
  'potato-skins': {
    subject: `"Potato Skins" — potato skins with cheddar, bacon and sour cream.`,
    plate: `six potato skin halves arranged in the centre of the plate, filled with melted cheddar and chopped bacon, topped with a spoonful of sour cream and sliced scallions. Nothing else. ${ANGLE}`,
    styling: `Potato skins dark and crisp at the edges, cheddar melted and orange, bacon crisp, sour cream white, scallions bright green.`,
    lighting: HARD, aperture: 'f/4.0 — all six skins in sharp focus' },
  'disco-fries': {
    subject: `"Disco Fries" — french fries with melted cheese and brown gravy.`,
    plate: `a pile of golden french fries filling the centre of the plate, covered with melted cheese and brown gravy poured over the top. Nothing else — NO ramekin, NO extra sauce. ${ANGLE}`,
    styling: `Fries golden underneath, smothered in glossy dark brown gravy with melted cheese pooling between them.`,
    lighting: HARD, aperture: 'f/4.0 — the pile in sharp focus' },
  'greek-fries': {
    subject: `"Greek Fries" — french fries with crumbled feta and oregano.`,
    plate: `a pile of golden french fries filling the centre of the plate, scattered with crumbled white feta cheese and dried oregano. Nothing else — NO ramekin, NO sauce. ${ANGLE}`,
    styling: `Fries golden and crisp, generously scattered with white feta crumbles and flecks of green oregano.`,
    lighting: HARD, aperture: 'f/4.0 — the pile in sharp focus' },
  'mozzarella-sticks': {
    subject: `"Mozzarella Sticks" — golden fried mozzarella sticks with marinara sauce.`,
    plate: `a natural pile of golden breaded mozzarella sticks in the centre of the plate, one broken in half with a visible stretch of melted cheese, and a small white ramekin of marinara sauce beside them. Nothing else. ${ANGLE}`,
    styling: `Breading golden and crunchy, one stick pulled apart showing a long strand of melted mozzarella. Marinara glossy and deep red.`,
    lighting: SOFT, aperture: 'f/2.8 — front sticks tack sharp, back of the pile gently defocused' },
  'jalapeno-poppers': {
    subject: `"Jalapeno Poppers" — breaded jalapenos stuffed with cheddar, with marinara sauce.`,
    plate: `six breaded jalapeno poppers piled in the centre of the plate, one broken open showing melted cheddar inside, with a small white ramekin of marinara sauce beside them. Nothing else. ${ANGLE}`,
    styling: `Poppers golden and craggy, the broken one showing bright green jalapeno skin and molten orange cheddar.`,
    lighting: HARD, aperture: 'f/4.0 — the broken popper in sharp focus' },
  'buffalo-wings': {
    subject: `"Buffalo Wings" — hot and spicy buffalo wings with blue cheese dressing.`,
    plate: `eight buffalo wings piled in the centre of the plate, glossy with red-orange hot sauce, with a small white ramekin of white blue cheese dressing and two celery sticks beside them. Nothing else. ${ANGLE}`,
    styling: `Wings coated in glossy red-orange sauce with slightly charred edges, drumettes and flats mixed. Blue cheese dressing thick and white with visible blue flecks.`,
    lighting: HARD, aperture: 'f/4.0 — the wings in sharp focus' },
  'chicken-tenders': {
    subject: `"Chicken Tenders" — crispy chicken tenders with honey mustard.`,
    plate: `five golden breaded chicken tenders fanned across the centre of the plate with a small white ramekin of yellow honey mustard beside them. Nothing else. ${ANGLE}`,
    styling: `Tenders in a craggy golden breadcrumb coating, one broken open to show white chicken inside.`,
    lighting: HARD, aperture: 'f/4.0 — the coating texture in sharp focus' },

  'chicken-quesadillas': QUESADILLA(
    { name: 'Chicken', what: 'grilled chicken' },
    `Flour tortilla pale with scattered dark griddle blisters, cheese stretching at the cut edges with visible pieces of white grilled chicken. Lettuce fresh and bright green underneath.`),
  'pork-quesadillas': QUESADILLA(
    { name: 'Pork', what: 'pulled pork' },
    `Flour tortilla pale with scattered dark griddle blisters, cheese stretching at the cut edges with visible strands of brown pulled pork. Lettuce fresh and bright green underneath.`),
  'shrimp-quesadillas': QUESADILLA(
    { name: 'Shrimp', what: 'shrimp' },
    `Flour tortilla pale with scattered dark griddle blisters, cheese stretching at the cut edges with visible pink shrimp. Lettuce fresh and bright green underneath.`),
  'steak-quesadillas': QUESADILLA(
    { name: 'Steak', what: 'sliced steak' },
    `Flour tortilla pale with scattered dark griddle blisters, cheese stretching at the cut edges with visible strips of seared steak. Lettuce fresh and bright green underneath.`),
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
