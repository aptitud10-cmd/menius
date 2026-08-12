/**
 * Regenerates the Desserts category with nano-banana.
 *
 * Method: see regen-side-orders.mjs. Kontext is not used, for the reason recorded
 * there — it inherits whatever sits on the reference plate.
 *
 * Hazard specific to this category: a slice of cake is the single easiest subject
 * to shoot flat, so almost every entry restates the camera position. A cheesecake
 * photographed from above is a beige circle; the layers are the product.
 *
 * The diner also sells these by the slice from a display case, so each prompt says
 * "one slice", never a whole cake.
 *
 * Usage: node scripts/regen-desserts.mjs [key ...]
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

/** For anything cut from a cake: the cross-section IS the product. */
const SLICE = (what, extra = '') =>
  `ONE single wedge-shaped slice of ${what} standing upright on the plate with its CUT FACE turned toward the camera so every layer is clearly visible in cross-section. Only one slice — NOT a whole cake, NOT multiple slices.${extra ? ' ' + extra : ''} Nothing else on the plate — NO ice cream, NO extra sauce, NO mint sprig, NO powdered sugar, NO fork, NO ramekin. ${ANGLE}`;

const build = ({ subject, plate, styling, lighting, aperture }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish or side.

SERVED IN/ON: one single plain white ceramic plate. Nothing else in frame.
PLATING IDENTITY: Classic American diner presentation — a generous slice cut from a tall display-case cake, served plainly. No fine-dining plating, no smears or dots of sauce, no microgreens, no edible flowers, no artistic drizzle patterns.
CAMERA: 50mm or 85mm prime lens, ${aperture}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The plate is CENTERED and fills 75-80% of the frame. SAFE ZONE: all food within the central 80%. DO NOT shift the plate left or right.

SURFACE & SETTING: the dessert is served on a CLEAN PLAIN WHITE ceramic plate — NEVER a cake stand, NEVER a patterned or coloured dish. The plate sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm undertones. Highlights soft, never blown out. High micro-contrast revealing crumb structure and frosting texture. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

const ITEMS = {
  'chocolate-layer-cake': {
    subject: `"Chocolate Layer Cake" — a slice of rich chocolate layer cake.`,
    plate: SLICE('chocolate layer cake', 'The slice is tall, with four dark sponge layers separated by chocolate frosting.'),
    styling: `Dark chocolate sponge with thick glossy chocolate frosting between every layer and coating the top and sides. Moist crumb clearly visible on the cut face.`,
    lighting: SOFT, aperture: 'f/4.0 — the layers tack sharp' },
  'coconut-lemon-cake': {
    subject: `"Coconut Lemon Layer Cake" — a slice of coconut lemon layer cake.`,
    plate: SLICE('coconut lemon layer cake', 'The slice is tall, with pale yellow sponge layers and white frosting, the outside covered in shredded coconut.'),
    styling: `Pale yellow sponge with bright lemon curd between the layers, white buttercream, the whole outside thickly coated in flakes of white shredded coconut.`,
    lighting: SOFT, aperture: 'f/4.0 — the layers and the coconut texture tack sharp' },
  'strawberry-shortcake': {
    subject: `"Strawberry Short Cake" — a slice of classic strawberry shortcake.`,
    plate: SLICE('strawberry shortcake', 'The slice shows white sponge layered with whipped cream and sliced fresh strawberries, with more strawberries and cream on top.'),
    styling: `White sponge, thick whipped cream, vivid red sliced strawberries visible in the layers and piled on top. Cream soft-peaked and glossy.`,
    lighting: SOFT, aperture: 'f/4.0 — the strawberries and cream tack sharp' },
  'carrot-cake': {
    subject: `"Carrot Cake" — a slice of homemade carrot cake.`,
    plate: SLICE('carrot cake', 'The slice is tall, with three orange-brown sponge layers and thick white cream cheese frosting.'),
    styling: `Dense orange-brown sponge flecked with shredded carrot and chopped walnut, thick white cream cheese frosting between the layers and on top.`,
    lighting: SOFT, aperture: 'f/4.0 — the crumb and frosting tack sharp' },
  'plain-cheesecake': {
    subject: `"Plain Cheesecake - NY Style" — a slice of New York-style plain cheesecake.`,
    plate: SLICE('New York cheesecake', 'The slice is tall and dense with a golden graham cracker crust at the base.'),
    styling: `Dense pale ivory cheesecake, smooth on top with a faintly browned surface, tall and straight-sided, on a golden-brown crumb crust. The cut face is smooth and creamy.`,
    lighting: SOFT, aperture: 'f/4.0 — the cut face and crust tack sharp' },
  'fruit-cheesecake': {
    subject: `"Fruit Cheesecake" — a slice of cheesecake topped with fruit.`,
    plate: SLICE('cheesecake topped with glossy strawberry topping', 'The slice is tall and dense with a golden graham cracker crust, crowned with red glazed strawberries.'),
    styling: `Dense pale cheesecake on a golden crumb crust, topped with whole glazed strawberries in a glossy red glaze that runs slightly down the cut face.`,
    lighting: SOFT, aperture: 'f/4.0 — the fruit topping and cut face tack sharp' },
  'chocolate-cheesecake': {
    subject: `"Chocolate Cheesecake" — a slice of rich chocolate cheesecake.`,
    plate: SLICE('chocolate cheesecake', 'The slice is tall and dense with a dark chocolate crumb crust at the base.'),
    styling: `Deep brown chocolate cheesecake, dense and smooth on the cut face, on a dark chocolate crumb crust, with a glossy chocolate ganache top.`,
    lighting: SOFT, aperture: 'f/4.0 — the cut face tack sharp' },
  'lemon-meringue-pie': {
    subject: `"Lemon Meringue Pie" — a slice of classic lemon meringue pie.`,
    plate: SLICE('lemon meringue pie', 'The slice shows a pastry base, a thick layer of bright yellow lemon filling, and tall peaked meringue on top, browned at the tips.'),
    styling: `Flaky pastry crust, vivid yellow lemon curd filling holding its shape, and a tall crown of white meringue swirled into peaks that are toasted golden-brown at the tips.`,
    lighting: SOFT, aperture: 'f/4.0 — the meringue peaks and filling tack sharp' },
  'apple-pie': {
    subject: `"Apple Pie" — a slice of classic double-crust apple pie.`,
    plate: SLICE('apple pie', 'The slice shows a golden top and bottom crust with sliced apple filling visible between them.'),
    styling: `Golden flaky pastry top and bottom, filling of soft cinnamon-brown apple slices clearly visible on the cut face, slightly spilling.`,
    lighting: HARD, aperture: 'f/4.0 — the crust and filling tack sharp' },
  'apple-crumb-pie': {
    subject: `"Apple Crumb Pie" — a slice of apple pie with streusel crumb topping.`,
    plate: SLICE('apple crumb pie', 'The slice shows a pastry base, apple filling, and a thick craggy streusel crumb topping instead of a top crust.'),
    styling: `Pastry base with cinnamon-brown apple filling, crowned with a thick uneven layer of golden buttery streusel crumbs. NO smooth top crust — the top is loose crumb.`,
    lighting: HARD, aperture: 'f/4.0 — the crumb topping tack sharp' },

  'brownie-all-the-way': {
    subject: `"Brownie All The Way" — a hot fudge brownie with ice cream, walnuts and whipped cream.`,
    plate: `one thick square chocolate brownie in the centre of the plate with a scoop of vanilla ice cream on top, hot fudge sauce poured over, scattered chopped walnuts, and a swirl of whipped cream. ${ANGLE}`,
    styling: `Dark fudgy brownie, a round scoop of vanilla ice cream just starting to melt, glossy dark hot fudge running down the sides, chopped walnuts and a piped swirl of whipped cream.`,
    lighting: SOFT, aperture: 'f/4.0 — the ice cream and fudge tack sharp' },
  'chocolate-mousse': {
    subject: `"Chocolate Mousse" — a serving of silky chocolate mousse.`,
    plate: `a tall clear glass dessert cup filled with dark chocolate mousse, topped with a swirl of whipped cream, standing on a plain white plate. Nothing else. ${ANGLE}`,
    styling: `Dark glossy mousse with a soft airy texture visible through the glass, crowned with a piped swirl of white whipped cream.`,
    lighting: SOFT, aperture: 'f/4.0 — the mousse texture through the glass tack sharp' },
  'rice-pudding': {
    subject: `"Rice Pudding" — a serving of creamy homemade rice pudding.`,
    plate: `a shallow white bowl of creamy rice pudding dusted with ground cinnamon, standing on a plain white plate. Nothing else — NO raisins visible on top, NO whipped cream, NO garnish. ${ANGLE}`,
    styling: `Thick creamy white rice pudding with individual grains of rice visible, dusted evenly with reddish-brown cinnamon.`,
    lighting: SOFT, aperture: 'f/4.5 — the rice grains and cinnamon tack sharp' },
  'jello-fruit-cocktail': {
    subject: `"Jello with Fruit Cocktail" — a serving of jello with fruit cocktail.`,
    plate: `a clear glass dessert cup of translucent red jello with pieces of fruit cocktail suspended in it, topped with a swirl of whipped cream, standing on a plain white plate. Nothing else. ${ANGLE}`,
    styling: `Bright translucent red jello, glossy and wobbling, with visible chunks of peach, pear and cherry suspended inside. A swirl of white whipped cream on top.`,
    lighting: SOFT, aperture: 'f/4.0 — the suspended fruit tack sharp' },
  'brownies': {
    subject: `"Brownies" — plain rich chocolate brownies.`,
    plate: `three thick square chocolate brownies stacked and fanned in the centre of the plate, one showing its fudgy cut face. Nothing else — NO ice cream, NO sauce, NO whipped cream, NO powdered sugar. ${ANGLE}`,
    styling: `Dark dense brownies with a crackled shiny top and a moist fudgy interior visible on the cut face.`,
    lighting: HARD, aperture: 'f/4.0 — the crackled top and cut face tack sharp' },
  'chocolate-chip-cookies': {
    subject: `"Chocolate Chip Cookies" — fresh-baked chocolate chip cookies.`,
    plate: `four chocolate chip cookies arranged in the centre of the plate, one leaning against the others, one broken in half showing melted chocolate inside. Nothing else. ${ANGLE}`,
    styling: `Golden cookies with slightly crisp edges and soft centres, studded with dark chocolate chips, the broken one showing a strand of melted chocolate.`,
    lighting: HARD, aperture: 'f/4.0 — the chips and the broken edge tack sharp' },
  'pound-cakes': {
    subject: `"All Pound Cakes" — slices of assorted pound cake.`,
    plate: `three thick rectangular slices of pound cake fanned across the centre of the plate, showing their dense golden crumb. Nothing else — NO cream, NO fruit, NO sauce. ${ANGLE}`,
    styling: `Dense golden-yellow crumb with a slightly darker baked crust on the top and edges of each slice, fine and buttery in texture.`,
    lighting: SOFT, aperture: 'f/4.0 — the crumb structure tack sharp' },
  'greek-pastries': {
    subject: `"Greek Pastries" — assorted Greek phyllo pastries including baklava.`,
    plate: `four diamond-shaped pieces of baklava arranged in the centre of the plate, glistening with honey syrup. Nothing else — NO ice cream, NO cream, NO extra syrup pool. ${ANGLE}`,
    styling: `Layered golden phyllo with visible chopped pistachio and walnut between the sheets, glossy with honey syrup, cut into neat diamonds.`,
    lighting: HARD, aperture: 'f/4.0 — the phyllo layers tack sharp' },
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
