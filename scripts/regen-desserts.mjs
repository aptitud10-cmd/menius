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
  // Buccaneer bakes this one in a sheet pan and cuts it into squares, so it is
  // never the wedge the rest of the case is cut into.
  'apple-crumb-pie': {
    subject: `"Apple Crumb Pie" — a square-cut piece of apple crumb pie.`,
    plate: `ONE single SQUARE piece of apple crumb pie standing on the plate with a straight CUT SIDE turned toward the camera so the layers are visible. It is a RECTANGULAR square-cut piece with four straight sides and sharp corners — NOT a wedge, NOT a triangle, NOT a slice from a round pie. Only one piece. Nothing else on the plate — NO ice cream, NO sauce, NO cream, NO powdered sugar, NO fork. ${ANGLE}`,
    styling: `A square slab with a pastry base, a thick layer of cinnamon-brown apple filling, and a craggy golden streusel crumb topping. The cut sides are straight and clean, showing all three layers. NO smooth top crust — the top is loose crumb.`,
    lighting: HARD, aperture: 'f/4.0 — the crumb topping and the cut side tack sharp' },

  'brownie-all-the-way': {
    subject: `"Brownie All The Way" — a hot fudge brownie with ice cream, walnuts and whipped cream.`,
    plate: `one thick square chocolate brownie in the centre of the plate with a scoop of vanilla ice cream on top, hot fudge sauce poured over, scattered chopped walnuts, and a swirl of whipped cream. ${ANGLE}`,
    styling: `Dark fudgy brownie, a round scoop of vanilla ice cream just starting to melt, glossy dark hot fudge running down the sides, chopped walnuts and a piped swirl of whipped cream.`,
    lighting: SOFT, aperture: 'f/4.0 — the ice cream and fudge tack sharp' },
  // Not a dessert cup: this is a CAKE, cut from the display case like the others.
  // The description ("Silky chocolate mousse") reads like a pot de crème, which is
  // what I first built. The price settles it — $7.25, the same as Strawberry
  // Shortcake and Carrot Cake, while the cup desserts (rice pudding $5.85, jello
  // $5.65) sit a dollar below. Buccaneer sells a chocolate mousse cake.
  'chocolate-mousse': {
    subject: `"Chocolate Mousse Cake" — a slice of chocolate mousse cake.`,
    plate: SLICE('chocolate mousse cake', 'The slice is tall, with a thin dark chocolate sponge base and a deep layer of set chocolate mousse above it, finished with a dark chocolate glaze on top.'),
    styling: `A thin dark chocolate sponge at the base under a tall, pale milk-chocolate mousse layer that is visibly AERATED — soft, matte and full of tiny air bubbles on the cut face, clearly lighter in colour than a dense chocolate cake — topped with a thin glossy dark chocolate glaze. It is a CAKE SLICE on a plate, NOT a mousse served in a glass or cup.`,
    lighting: SOFT, aperture: 'f/4.0 — the aerated mousse texture on the cut face tack sharp' },
  'rice-pudding': {
    subject: `"Rice Pudding" — a serving of creamy homemade rice pudding.`,
    plate: `a shallow white bowl of creamy rice pudding dusted with ground cinnamon, standing on a plain white plate. Nothing else — NO raisins visible on top, NO whipped cream, NO garnish. ${ANGLE}`,
    styling: `Thick creamy white rice pudding with individual grains of rice visible, dusted evenly with reddish-brown cinnamon.`,
    lighting: SOFT, aperture: 'f/4.5 — the rice grains and cinnamon tack sharp' },
  // Plain jello. The product name promises fruit cocktail, but the kitchen serves
  // it without — a photograph full of suspended peach and pear would be selling
  // something the customer does not receive.
  'jello-fruit-cocktail': {
    subject: `"Jello" — a serving of plain red jello.`,
    plate: `a clear glass dessert cup filled with plain translucent red jello, topped with a swirl of whipped cream, standing on a plain white plate. The jello is COMPLETELY PLAIN and clear — NO fruit, NO fruit cocktail, NO peach, NO pear, NO cherry, NO pieces of anything suspended inside it. Nothing else on the plate. ${ANGLE}`,
    styling: `Bright translucent red jello, glossy and smooth, clear all the way through so the light passes through it — completely empty of any inclusions. A single swirl of white whipped cream on top.`,
    lighting: SOFT, aperture: 'f/4.0 — the clear jello and the cream tack sharp' },
  // One brownie, with three walnut halves on top — how the kitchen actually plates
  // it. The first version stacked three plain brownies, which is a different item.
  'brownies': {
    subject: `"Brownie" — one thick chocolate brownie topped with walnuts.`,
    plate: `ONE single thick square chocolate brownie in the centre of the plate, with exactly THREE walnut halves resting on top of it. Only one brownie — NOT a stack, NOT three brownies. Nothing else on the plate — NO ice cream, NO sauce, NO whipped cream, NO powdered sugar, NO scattered nuts on the plate. ${ANGLE}`,
    styling: `A dark dense brownie with a crackled shiny top and moist fudgy edges, crowned with three whole walnut halves showing their ridged pale-brown surface.`,
    lighting: HARD, aperture: 'f/4.0 — the crackled top and the walnuts tack sharp' },
  // One oversized bakery cookie, not the plate of three or four I first built —
  // at $5.05 this is a single large cookie sold from the case.
  'chocolate-chip-cookies': {
    subject: `"Chocolate Chip Cookie" — one large fresh-baked chocolate chip cookie.`,
    plate: `ONE single LARGE chocolate chip cookie lying flat in the centre of the plate, filling most of it. It is an oversized bakery cookie, roughly 15cm across — noticeably bigger than a home-baked cookie. Only one — NOT a stack, NOT several cookies, NOT a broken one. Nothing else on the plate. ${ANGLE}`,
    styling: `A big golden cookie with crisp cracked edges and a soft chewy centre, generously studded with large dark chocolate chunks, some half-melted and glossy on the surface. Slightly irregular and hand-formed at the rim.`,
    lighting: HARD, aperture: 'f/4.0 — the chocolate chunks and the cracked surface tack sharp' },
  'pound-cakes': {
    subject: `"All Pound Cakes" — slices of assorted pound cake.`,
    plate: `three thick rectangular slices of pound cake fanned across the centre of the plate, showing their dense golden crumb. Nothing else — NO cream, NO fruit, NO sauce. ${ANGLE}`,
    styling: `Dense golden-yellow crumb with a slightly darker baked crust on the top and edges of each slice, fine and buttery in texture.`,
    lighting: SOFT, aperture: 'f/4.0 — the crumb structure tack sharp' },
  // Missed in the first pass: the category has nineteen products, not eighteen.
  'danish-turnover': {
    subject: `"Danish Pastry or Apple Turnover" — a breakfast pastry from the bakery case.`,
    plate: `two pastries side by side in the centre of the plate: one round Danish with a pale cheese filling in its centre, and one triangular apple turnover with a glazed top. Nothing else on the plate — NO cream, NO fruit, NO sauce, NO powdered sugar dusting on the plate. ${ANGLE}`,
    styling: `The Danish is golden and layered with a soft pale cheese centre and a light sugar glaze. The turnover is a puffed golden triangle with a crimped edge, drizzled with white icing, one corner showing a hint of apple filling.`,
    lighting: HARD, aperture: 'f/4.0 — the pastry layers and glaze tack sharp' },
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
