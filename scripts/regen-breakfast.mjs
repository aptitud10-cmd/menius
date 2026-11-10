/**
 * Regenerates the 58 breakfast products that still sit on shared Unsplash stock
 * (eggs, omelettes, benedicts, pancakes, French toast, waffles, wraps, bagels,
 * cereal, avocado toast). Same shared prompt as the burger batch Pedro approved:
 * one white plate, continuous dark slate, black backdrop, hard key from the left,
 * 35-degree three-quarter angle.
 *
 * Plating decisions that are NOT in the database, taken 2026-11-10:
 *   - "Choice of meat" is shown as bacon — the most legible of the options.
 *   - "Two eggs any style" is shown sunny-side up, yolks intact.
 *   - Garden Vegetable Omelette ("choice of two vegetables") → spinach + tomato.
 *   - Avocado Omelette: the description lists bacon, cheddar and onion and never
 *     says avocado. The name promises it, so sliced avocado sits on top.
 *   - Coconut Pancakes: the description only names a pina colada syrup; toasted
 *     coconut flakes on top make the name readable. Remove if they don't carry it.
 *   - Home fries and toast appear wherever the description says "served with".
 *
 * Runs in three batches of ~20 so each one can be reviewed as a contact sheet.
 * Output goes to its own folder, never mixed with earlier batches: in August a
 * retried batch left stale images beside new ones and they nearly shipped.
 *
 * Usage:
 *   node scripts/regen-breakfast.mjs --batch 1        # one batch
 *   node scripts/regen-breakfast.mjs key1 key2        # specific products
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fal } from '@fal-ai/client';

const OUT_DIR = 'scripts/.product-output/breakfast';

const key = (() => {
  const m = readFileSync('.env.local', 'utf8').match(/^FAL_API_KEY\s*=\s*(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '') : null;
})();
if (!key) {
  console.error('FAL_API_KEY no encontrada en .env.local.');
  process.exit(1);
}
fal.config({ credentials: key });

const HARD = `Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the golden crust, the crisp edges, the glossy yolk, the melting butter. A black negative fill card on the right deepens shadows for maximum tonal contrast.`;

const ANGLE = `The camera is at a 35-degree THREE-QUARTER angle looking ACROSS the plate — NOT overhead, NOT top-down, NOT a flat lay. The far rim of the plate and the dark surface behind it are visible.`;

const VESSELS = {
  plate: 'one single large plain white ceramic plate',
  bowl: 'one single plain white ceramic bowl, sitting on a small plain white saucer plate',
};

const build = ({ subject, plate, styling, vessel = 'plate' }) => `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands, NO cutlery in use.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: ${subject}

PLATE COMPOSITION (critical): ${plate} ${ANGLE}

INGREDIENT FIDELITY (critical): show ONLY the components named above. Do NOT add any other topping, sauce, garnish, herb sprig, side or drink. NO coffee cup, NO juice glass, NO orange slice, NO strawberry fan unless named. NO toast and NO bread slices unless named above.

SERVED IN/ON: ${VESSELS[vessel]}. Nothing else in frame.
PLATING IDENTITY: Classic American New York diner breakfast. Generous, honest, unpretentious portions — no fine-dining tweezer plating, no microgreens, no edible flowers, no smears or dots of sauce, no wooden board, no skillet.
CAMERA: 50mm or 85mm prime lens, f/4.0 — the whole dish sharp, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: 35-degree hero angle — the universal professional food photography standard.
COMPOSITION: Square 1:1 frame. The dish is CENTERED. The round PLATE itself (not just the food) spans about 80% of the frame width, so a clear band of dark slate shows on the left and on the right of the rim. SAFE ZONE: all food within the central 80%. DO NOT shift the dish left or right. The WHOLE plate, including its entire rim, is inside the frame with dark slate visible between the rim and ALL FOUR edges of the image — the plate never touches or crosses any edge, even when the food is stacked tall (pull the camera back rather than crop the plate).

SURFACE & SETTING: the dish sits on a dark matte slate stone surface, one CONTINUOUS unbroken tabletop running past every edge of the frame — NOT a board, NOT a tray, NOT a slab with visible edges under the plate. The background is a COMPLETELY PLAIN, EMPTY, PURE BLACK backdrop, heavily out of focus — NO furniture, NO windows, NO wall, NO wood, NO objects of any kind. Every corner and every edge of the frame is DARK — no brown, no amber, no warm glow, no lit surface in the background. NO studio softbox, NO reflector panel, NO light stand, NO white or silver rectangle at any edge of the image.

LIGHTING: ${HARD}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones. Highlights slightly golden, never blown out. High micro-contrast revealing every texture detail. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural. Subtle vignette darkening the corners by 15%.

FOOD STYLING: ${styling}`;

// ── Shared plate components ─────────────────────────────────────────────────
// From a real Buccaneer plate (Pedro, 2026-11-10): thin ROUND SLICES griddled
// with onion and a little pepper, paprika-orange, some crisp, some soft. The
// first batch used diced cubes, which is not what this kitchen serves.
const HOME_FRIES = 'an appetizing, generous, messy heap of New York diner home fries made from pre-boiled potatoes: thin IRREGULAR broken pieces and half-slices of potato — about HALF of them griddled to a deep golden-brown with crisp caramelised edges, the rest soft and creamy-pale — tossed with plenty of soft golden onion and a few bits of red pepper, generously seasoned with paprika so warm orange patches run through the heap, plus crispy browned shredded-potato strands. They look hot, buttery and craveable. They must NOT look like fried plantains, tostones, patacones or chips: NO flattened discs, NO neat round coins, NO cubes';
// Toast comes on its own side plate in a NY diner, so it is never in the photo.
const EGGS = 'two sunny-side-up fried eggs with bright intact orange yolks and set white edges';
const BACON = 'three strips of crisp wavy bacon';
const PANCAKES = 'a stack of three thick fluffy golden-brown buttermilk pancakes';
// Pancakes, waffles and French toast at Buccaneer: syrup and butter come on the
// SIDE (Pedro, 2026-11-10) — never a pat melting on top, never syrup poured.
const BUTTER_SYRUP = 'and on the plate beside the stack one small white ramekin of amber maple syrup and one small separate pat of butter — NO butter on top, NO syrup poured over the food';
// Buccaneer's French toast (Pedro, 2026-11-10): dusted with cinnamon and
// powdered sugar, NEVER butter on top; syrup and butter come on the side.
const FT_DUST = 'dusted on top with a light snowfall of white powdered sugar and a sprinkle of ground cinnamon';
const SIDE_SYRUP = BUTTER_SYRUP;
const FRENCH_TOAST = `EXACTLY three (3) slices of golden-brown griddled French toast, overlapping, with a lightly caramelised custard crust, ${FT_DUST}`;
const WAFFLE = 'one large round thick Belgian waffle with deep square pockets, golden and crisp';
const WHIPPED = 'a generous swirl of whipped cream';
const BERRIES = 'fresh strawberries cut in halves, blueberries and banana slices';
// From a real Buccaneer omelette (Pedro, 2026-11-10): big, wide, folded ONCE,
// griddled in butter until the outside is blistered and spotted deep golden-
// brown, with the filling MIXED INTO the eggs and showing through the browned
// surface. The first batch drew a pale half-moon with the filling spilling out
// of the fold like a quesadilla.
const OMELETTE = (filling) =>
  `one very large, wide American diner omelette covering about half of the plate, folded over ONCE into a broad flat half-moon. Its outside is griddled on a buttered flat-top: bright yellow egg heavily SPOTTED and blistered with deep golden-brown and lacy browned patches, slightly uneven and rustic, NOT smooth, NOT pale. The filling (${filling}) is MIXED INTO the beaten eggs, so small pieces of it are visible embedded in and showing through the browned egg surface — the filling does NOT spill out of the fold`;
const BENEDICT = (protein, sauce = 'glossy pale-yellow hollandaise sauce') =>
  `two halves of a toasted English muffin, each topped with ${protein} and a soft poached egg, covered with ${sauce}`;
const BAGEL = 'one hand-rolled water bagel with a glossy golden crust, sliced open';
// Real Buccaneer lox plate (reference photo, 2026-11-10): both halves TOASTED and
// laid open-faced, the lox draped over them; cream cheese comes on the side in
// small cups. Plain white ramekins here — never branded portion cups (no logos).
const LOX_BAGEL = 'one hand-rolled water bagel, both halves TOASTED golden and laid side by side OPEN-FACED, generously draped with silky folds of orange-pink smoked salmon (lox) covering both halves';
const SIDE_CREAM_CHEESE = 'two small plain white ramekins of cream cheese beside the bagel';

/**
 * Every product, keyed by the exact database name so the upload manifest can be
 * matched to product ids by name. `batch` drives the three review rounds.
 */
const ITEMS = {
  // ── Batch 1 — eggs, omelettes, benedicts (19) ──────────────────────────────
  'two-eggs-with-meat': { batch: 1, name: 'Two Eggs with Meat',
    subject: '"Two Eggs with Meat" — two eggs with bacon, home fries.',
    plate: `${EGGS}, ${BACON} and ${HOME_FRIES}, all arranged on the plate.`,
    styling: 'Yolks glossy and domed, bacon crisp, home fries crusty and golden.' },
  'two-eggs-canadian-bacon': { batch: 1, name: 'Two Eggs with Canadian Bacon',
    subject: '"Two Eggs with Canadian Bacon" — two eggs with Canadian bacon, home fries.',
    plate: `${EGGS}, three round slices of seared pink Canadian bacon (back bacon medallions) and ${HOME_FRIES}.`,
    styling: 'The Canadian bacon is ROUND, pink and lightly seared — NOT strips of streaky bacon.' },
  'corned-beef-hash-two-eggs': { batch: 1, name: 'Corned Beef Hash & Two Eggs',
    subject: '"Corned Beef Hash & Two Eggs" — house corned beef hash with two eggs, home fries.',
    plate: `a mound of crisp seared corned beef hash (shredded pink corned beef with diced potato, browned crust) with ${EGGS} resting on top of it, plus ${HOME_FRIES}.`,
    styling: 'The hash has a dark crisp crust; the eggs sit ON the hash.' },
  'half-romanian-steak-two-eggs': { batch: 1, name: '1/2 Romanian Steak with Two Eggs',
    subject: '"1/2 Romanian Steak with Two Eggs" — grilled skirt steak with two eggs, home fries.',
    plate: `a long thin grilled skirt steak (Romanian steak) with dark char marks, sliced in a few pieces showing a pink centre, ${EGGS} and ${HOME_FRIES}.`,
    styling: 'The skirt steak is long, thin and fibrous with a charred surface — NOT a thick round steak.' },
  'ribeye-steak-and-eggs': { batch: 1, name: 'Ribeye Steak and Eggs',
    subject: '"Ribeye Steak and Eggs" — a ribeye steak with two eggs, home fries.',
    plate: `a thick grilled ribeye steak with a dark seared crust and visible marbling, ${EGGS} and ${HOME_FRIES}.`,
    styling: 'The ribeye is whole (not sliced), glistening, with grill marks.' },
  'pastrami-omelette': { batch: 1, name: 'Pastrami or Corned Beef Omelette',
    subject: '"Pastrami Omelette" — an omelette filled with pastrami, with home fries.',
    plate: `${OMELETTE('thin pink slices of pastrami')} and ${HOME_FRIES}.`,
    styling: 'Pink pastrami pieces visible embedded in the browned egg.' },
  'ham-bacon-sausage-omelette': { batch: 1, name: 'Ham, Bacon or Sausage Omelette',
    subject: '"Bacon Omelette" — an omelette filled with bacon, with home fries.',
    plate: `${OMELETTE('chopped crisp bacon')} and ${HOME_FRIES}.`,
    styling: 'Bits of crisp bacon visible embedded in the browned egg.' },
  'ham-cheese-omelette': { batch: 1, name: 'Ham & Cheese Omelette',
    subject: '"Ham & Cheese Omelette" — an omelette with ham and melted cheese, with home fries.',
    plate: `${OMELETTE('diced pink ham and melted yellow American cheese')} and ${HOME_FRIES}.`,
    styling: 'Pink ham pieces and a little melted cheese visible in the browned egg.' },
  'western-omelette': { batch: 1, name: 'Western Omelette',
    subject: '"Western Omelette" — an omelette with ham, peppers and onions, with home fries.',
    plate: `${OMELETTE('diced pink ham, diced green bell pepper and diced onion')} and ${HOME_FRIES}.`,
    styling: 'Pink ham, green pepper and onion bits visible embedded in the browned egg. NO cheese.' },
  'mushroom-omelette': { batch: 1, name: 'Fresh Mushroom Omelette',
    subject: '"Fresh Mushroom Omelette" — an omelette with sauteed mushrooms, with home fries.',
    plate: `${OMELETTE('sauteed sliced white mushrooms')} and ${HOME_FRIES}.`,
    styling: 'Sauteed mushroom pieces visible embedded in the browned egg.' },
  'garden-vegetable-omelette': { batch: 1, name: 'Garden Vegetable Omelette',
    subject: '"Garden Vegetable Omelette" — an omelette with spinach and tomato, with home fries.',
    plate: `${OMELETTE('wilted green spinach and diced red tomato')} and ${HOME_FRIES}.`,
    styling: 'Green spinach and red tomato bits visible embedded in the browned egg. NO cheese.' },
  'mediterranean-omelette': { batch: 1, name: 'Mediterranean Omelette',
    subject: '"Mediterranean Omelette" — an omelette with peppers, onions, ham and cheese, topped with salsa.',
    plate: `${OMELETTE('diced bell peppers, onion, diced ham and melted white cheese')}, with a spoonful of chunky red tomato salsa on top of the omelette, and ${HOME_FRIES}.`,
    styling: 'Chunky fresh red salsa on top.' },
  'mexican-omelette': { batch: 1, name: 'Mexican Omelette',
    subject: '"Mexican Omelette" — an omelette with jalapenos, onions and cheddar, topped with salsa.',
    plate: `${OMELETTE('green jalapeno slices, onion and melted orange cheddar')}, with a spoonful of chunky red tomato salsa on top of the omelette, and ${HOME_FRIES}.`,
    styling: 'Green jalapeno and orange cheddar visible in the browned egg. NO guacamole, NO tortilla.' },
  'farmers-omelette': { batch: 1, name: 'Farmers Omelette',
    subject: '"Farmers Omelette" — an omelette with sausage, ham, potatoes and cheese mixed together.',
    plate: `${OMELETTE('crumbled sausage, diced ham, diced potato and melted cheese')} and ${HOME_FRIES}.`,
    styling: 'Hearty filling visibly mixed into the eggs.' },
  'avocado-omelette': { batch: 1, name: 'Avocado Omelette',
    subject: '"Avocado Omelette" — an omelette with bacon, cheddar and onions, topped with sliced avocado.',
    plate: `${OMELETTE('chopped crisp bacon, onion and melted orange cheddar')}, with a fan of fresh green avocado slices laid across the top, and ${HOME_FRIES}.`,
    styling: 'Bright green avocado fan on top. NO salsa.' },
  'greek-omelette': { batch: 1, name: 'Greek Omelette',
    subject: '"Greek Omelette" — an omelette with feta cheese and tomato.',
    plate: `${OMELETTE('crumbled white feta cheese and diced red tomato')} and ${HOME_FRIES}.`,
    styling: 'White feta and red tomato bits visible in the browned egg. NO olives, NO spinach.' },
  'classic-benedict': { batch: 1, name: 'Classic Benedict',
    subject: '"Classic Benedict" — poached eggs with Canadian bacon on English muffin with hollandaise, with home fries.',
    plate: `${BENEDICT('a round slice of pink Canadian bacon')}, and ${HOME_FRIES} beside them.`,
    styling: 'Hollandaise glossy and draping over the eggs; English muffin rough and toasted. A light dusting of paprika on the sauce is fine. NO toast.' },
  'smoked-salmon-benedict': { batch: 1, name: 'Smoked Salmon Benedict',
    subject: '"Smoked Salmon Benedict" — poached eggs with smoked salmon on English muffin with hollandaise, with home fries.',
    plate: `${BENEDICT('folded ribbons of silky orange-pink smoked salmon')}, and ${HOME_FRIES} beside them.`,
    styling: 'Silky translucent smoked salmon clearly visible under the eggs. NO capers, NO dill, NO toast.' },
  'crab-cakes-benedict': { batch: 1, name: 'Crab Cakes Benedict',
    subject: '"Crab Cakes Benedict" — poached eggs on crab cakes with chipotle hollandaise, with home fries.',
    plate: `two golden pan-seared crab cakes, each topped with a soft poached egg and covered with an ORANGE-tinted chipotle hollandaise sauce, and ${HOME_FRIES} beside them.`,
    styling: 'The crab cakes replace the muffin — NO English muffin here. The hollandaise is visibly orange from chipotle. NO toast.' },

  // ── Batch 2 — pancakes and French toast (20) ───────────────────────────────
  'pancakes-with-meat': { batch: 2, name: 'Pancakes with Meat',
    subject: '"Pancakes with Meat" — buttermilk pancakes with bacon.',
    plate: `${PANCAKES}, ${BACON} beside the stack, ${BUTTER_SYRUP}.`,
    styling: 'Pancakes tall and fluffy with golden edges.' },
  'pancakes-two-eggs': { batch: 2, name: 'Pancakes with Two Eggs, Any Style',
    subject: '"Pancakes with Two Eggs" — buttermilk pancakes with two eggs.',
    plate: `${PANCAKES}, ${EGGS} beside the stack, ${BUTTER_SYRUP}.`,
    styling: 'NO bacon, NO meat on this plate.' },
  'silver-dollar-pancakes': { batch: 2, name: 'Silver Dollar Pancakes',
    subject: '"Silver Dollar Pancakes" — mini pancakes, butter and syrup on the side.',
    plate: 'about ten SMALL silver-dollar pancakes (each the size of a coin, about 3 inches across) arranged in two overlapping shingled rows, ' + BUTTER_SYRUP + '.',
    styling: 'The pancakes are clearly MINI — small and many, NOT a stack of three large ones. NO meat.' },
  'silver-dollar-pancakes-meat': { batch: 2, name: 'Silver Dollar Pancakes with Meat',
    subject: '"Silver Dollar Pancakes with Meat" — mini pancakes with bacon.',
    plate: `about ten SMALL silver-dollar pancakes (each about 3 inches across) in overlapping shingled rows, ${BACON} beside them, ${BUTTER_SYRUP}.`,
    styling: 'The pancakes are clearly MINI — small and many.' },
  'pancakes-fruit-whipped-cream': { batch: 2, name: 'Pancakes with Fruit & Whipped Cream',
    subject: '"Pancakes with Fruit & Whipped Cream".',
    plate: `${PANCAKES} topped with ${WHIPPED} and ${BERRIES}.`,
    styling: 'Fruit bright and fresh, whipped cream white and airy. NO meat, NO syrup pool.' },
  'pancakes-fruit-cream-meat': { batch: 2, name: 'Pancakes with Fruit, Whipped Cream & Meat',
    subject: '"Pancakes with Fruit, Whipped Cream & Meat".',
    plate: `${PANCAKES} topped with ${WHIPPED} and ${BERRIES}, and ${BACON} beside the stack.`,
    styling: 'Fruit bright, bacon crisp.' },
  'banana-pecan-pancakes': { batch: 2, name: 'Banana Pecan Pancakes',
    subject: '"Banana Pecan Pancakes".',
    plate: `${PANCAKES} topped with fresh banana slices and toasted pecan halves, ${BUTTER_SYRUP}.`,
    styling: 'Banana coins and pecan halves on top. NO whipped cream, NO meat.' },
  'banana-pecan-pancakes-meat': { batch: 2, name: 'Banana Pecan Pancakes with Meat',
    subject: '"Banana Pecan Pancakes with Meat".',
    plate: `${PANCAKES} topped with fresh banana slices and toasted pecan halves, ${BACON} beside the stack, ${BUTTER_SYRUP}.`,
    styling: 'NO whipped cream.' },
  'chocolate-chip-pancakes': { batch: 2, name: 'Chocolate Chip Pancakes',
    subject: '"Chocolate Chip Pancakes".',
    plate: `${PANCAKES} studded with melted dark chocolate chips, with a few chocolate chips scattered on top, ${BUTTER_SYRUP}.`,
    styling: 'Chocolate chips visible inside the pancake edges and on top. NO whipped cream, NO fruit.' },
  'coconut-pancakes': { batch: 2, name: 'Coconut Pancakes',
    subject: '"Coconut Pancakes" — pancakes with a pina colada syrup.',
    plate: `${PANCAKES} with a sprinkle of toasted coconut flakes on top, and on the plate beside the stack one small white ramekin of creamy pale-golden pina colada syrup and one small separate pat of butter — NO syrup poured over the pancakes, NO butter on top.`,
    styling: 'The syrup is creamy and pale, NOT dark maple. NO pineapple ring, NO cherry, NO cocktail umbrella.' },
  'lumberjack': { batch: 2, name: 'Lumberjack',
    subject: '"Lumberjack" — three pancakes with bacon, ham, sausage and two eggs.',
    plate: `${PANCAKES}, two strips of crisp bacon, one slice of grilled ham, ONE single breakfast sausage link (exactly one) and ${EGGS}, all on one large plate, ${BUTTER_SYRUP}.`,
    styling: 'A big, abundant platter — every component clearly visible and separate.' },
  'oreo-pancakes': { batch: 2, name: 'Oreo Pancakes',
    subject: '"Oreo Pancakes" — buttermilk pancakes with crushed chocolate sandwich cookies.',
    plate: `${PANCAKES} with crushed dark chocolate sandwich cookie crumbs (black cookie with white cream filling visible) scattered between the layers and on top.`,
    styling: 'Black cookie crumbs with flecks of white cream filling. NO whole cookies with a logo, NO text on cookies.' },
  'healthy-greek-pancakes': { batch: 2, name: 'Healthy Greek Pancakes',
    subject: '"Healthy Greek Pancakes" — pancakes with Greek yogurt, strawberries, pecans and honey.',
    plate: `${PANCAKES} — full-size pancakes as wide as the other stacks, filling the plate generously — topped with a generous dollop of thick white Greek yogurt, plenty of halved fresh strawberries and pecan halves, drizzled with golden honey.`,
    styling: 'This is the most expensive pancake plate and must look abundant, not small. Thick tangy yogurt (not whipped cream), honey glistening. NO banana, NO blueberries, NO syrup.' },
  'old-fashioned-french-toast': { batch: 2, name: 'Old Fashioned French Toast',
    subject: '"Old Fashioned French Toast" — three slices of thin brioche French toast, butter and syrup on the side.',
    plate: `EXACTLY three (3) THIN slices of brioche French toast — count them, three — overlapping, ${FT_DUST}, ${SIDE_SYRUP}.`,
    styling: 'Slices thin and golden. NO fruit, NO whipped cream.' },
  'challah-french-toast': { batch: 2, name: 'Challah Bread French Toast',
    subject: '"Challah Bread French Toast" — thick-cut challah French toast, butter and syrup on the side.',
    plate: `EXACTLY three (3) thick slices of challah French toast, laid flat and slightly overlapping in the centre of the plate, ${FT_DUST}, ${SIDE_SYRUP}. Each slice is whole (not cut into pieces).`,
    styling: 'This is FRENCH TOAST, not plain bread: every visible face of every slice is soaked in egg custard and griddled to a deep golden-brown with darker caramelised patches — NO pale, raw, untoasted bread crumb showing anywhere. The slices are thick (about 1.5 inches). Count them: three. NO fruit, NO whipped cream.' },
  'french-toast-meat': { batch: 2, name: 'French Toast with Meat',
    subject: '"French Toast with Meat" — French toast with bacon.',
    plate: `${FRENCH_TOAST}, ${BACON} beside it, ${SIDE_SYRUP}.`,
    styling: 'NO eggs, NO fruit.' },
  'french-toast-two-eggs': { batch: 2, name: 'French Toast with Two Eggs, Any Style',
    subject: '"French Toast with Two Eggs".',
    plate: `${FRENCH_TOAST}, ${EGGS} beside it, ${SIDE_SYRUP}.`,
    styling: 'NO bacon, NO meat, NO fruit.' },
  'french-toast-fruit-cream': { batch: 2, name: 'French Toast with Fruit & Whipped Cream',
    subject: '"French Toast with Fruit & Whipped Cream".',
    plate: `${FRENCH_TOAST} topped with ${WHIPPED} and ${BERRIES}.`,
    styling: 'NO meat, NO eggs.' },
  'french-toast-deluxe': { batch: 2, name: 'French Toast Deluxe',
    subject: '"French Toast Deluxe" — French toast with bacon, ham, sausage and two eggs.',
    plate: `${FRENCH_TOAST}, two strips of crisp bacon, one slice of grilled ham, ONE single breakfast sausage link (exactly one) and ${EGGS}, all on one large plate, ${SIDE_SYRUP}.`,
    styling: 'A big, abundant platter — every component clearly visible and separate.' },
  'apple-crisp-french-toast': { batch: 2, name: 'Apple Crisp French Toast',
    subject: '"Apple Crisp French Toast" — brioche French toast stuffed with sauteed apples and raisins, with apple cider sauce.',
    plate: 'three slices of brioche French toast stacked with sauteed caramelised apple slices and raisins layered BETWEEN them and spilling out, topped with chunks of crumbly golden crumb cake and a generous swirl of whipped cream, finished with a drizzle of glossy creamy caramel sauce.',
    styling: 'The apple filling is clearly visible between the layers. The full description: sauteed apples, raisins, brown sugar and bourbon apple-cider sauce between 3 slices of brioche French toast, topped with crumb cake and whipped cream, finished with homemade creamy caramel sauce. NO ice cream.' },

  // ── Batch 3 — waffles, wraps, bagels, cereal, avocado toast (19) ───────────
  'waffle-two-eggs': { batch: 3, name: 'Belgian Waffle with Two Eggs, Any Style',
    subject: '"Belgian Waffle with Two Eggs".',
    plate: `${WAFFLE}, ${EGGS} beside it, ${BUTTER_SYRUP}.`,
    styling: 'NO fruit, NO whipped cream, NO meat.' },
  'waffle-fruit-cream': { batch: 3, name: 'Belgian Waffle with Fruit & Whipped Cream',
    subject: '"Belgian Waffle with Fruit & Whipped Cream".',
    plate: `${WAFFLE} topped with ${WHIPPED} and ${BERRIES}.`,
    styling: 'Fruit fresh and bright. NO ice cream, NO chocolate sauce.' },
  'chicken-and-waffle': { batch: 3, name: "Fried Chicken N' Waffle",
    subject: '"Fried Chicken N\' Waffle" — breaded chicken fingers on a Belgian waffle, syrup on the side.',
    plate: `${WAFFLE} with EXACTLY THREE (3) diner CHICKEN FINGERS laid across it: WIDE, FLAT, elongated pieces of pounded chicken breast (about three fingers wide and thin, like small flat cutlets, with slightly irregular rounded outlines), in a fine, crisp, golden-brown BREADCRUMB coating with a lightly bumpy texture, uniformly fried — ${BUTTER_SYRUP}.`,
    styling: 'Chicken FINGERS (Pedro, 2026-11-10): EXACTLY 3, wide and flat, NOT round thick nuggets or skinny sticks; breaded pieces with a fine smooth crumb, like classic diner chicken fingers — NOT craggy flour-dredged fried chicken, NOT Southern-style tenders with shaggy crust, NOT bone-in pieces. NO whipped cream, NO fruit.' },
  'nutella-waffle': { batch: 3, name: 'Nutella Waffle',
    subject: '"Nutella Waffle" — Belgian waffle with chocolate hazelnut spread, strawberries, bananas and blueberries.',
    plate: `${WAFFLE} with glossy brown chocolate-hazelnut spread oozing from it, topped with halved strawberries, banana slices and blueberries.`,
    styling: 'NO jar, NO label, NO text. NO whipped cream, NO ice cream.' },
  'waffle-sundae': { batch: 3, name: 'Belgian Waffle Sundae',
    subject: '"Belgian Waffle Sundae" — Belgian waffle with a scoop of ice cream, walnuts, whipped cream and chocolate syrup.',
    plate: `${WAFFLE} topped with ONE round scoop of vanilla ice cream, a swirl of whipped cream, chopped walnuts and dark chocolate syrup drizzled over.`,
    styling: 'Exactly one scoop. NO fruit, NO cherry.' },
  'southwestern-burrito': { batch: 3, name: 'Southwestern Burrito',
    subject: '"Southwestern Burrito" — breakfast burrito with eggs, sausage, bacon, peppers, jalapenos and cheese, with sour cream, salsa and home fries.',
    plate: `one large flour-tortilla breakfast burrito cut in half on the diagonal, the cut face showing scrambled egg, sausage, bacon, peppers and melted cheese; a small white ramekin of sour cream and a small white ramekin of red salsa; and ${HOME_FRIES}.`,
    styling: 'The CUT FACE of the burrito faces the camera so the filling is visible.' },
  'mexi-cali-wrap': { batch: 3, name: 'Mexi-Cali Rose Wrap',
    subject: '"Mexi-Cali Rose Wrap" — egg white wrap with avocado, cheddar, salsa and scallions, with home fries.',
    plate: `one flour-tortilla wrap cut in half on the diagonal, the cut face showing fluffy WHITE scrambled egg whites, green avocado, orange cheddar and chopped scallions; and ${HOME_FRIES}.`,
    styling: 'The egg is WHITE (egg whites only, no yellow). Cut face toward the camera. NO sour cream ramekin.' },
  'bagel-cream-cheese': { batch: 3, name: 'Bagel with Cream Cheese',
    subject: '"Bagel with Cream Cheese" — a hand-rolled bagel with cream cheese.',
    plate: `${BAGEL}, both halves face up and spread thickly with white cream cheese.`,
    styling: 'A plain bagel, nothing else on the plate. NO salmon, NO onion, NO capers.' },
  'bagel-smoked-salmon': { batch: 3, name: 'Bagel with Smoked Salmon',
    subject: '"Bagel with Smoked Salmon".',
    plate: `${LOX_BAGEL}.`,
    styling: 'NO cream cheese, NO onion, NO capers, NO salad.' },
  'bagel-salmon-cream-cheese-onion': { batch: 3, name: 'Bagel with Smoked Salmon, Cream Cheese & Onions',
    subject: '"Bagel with Smoked Salmon, Cream Cheese & Onions".',
    plate: `${LOX_BAGEL}, a few thin rings of red onion on top, and ${SIDE_CREAM_CHEESE}.`,
    styling: 'NO capers, NO lettuce, NO tomato, NO olives. NO brand names or logos on anything.' },
  'new-yorker-bagel': { batch: 3, name: 'The New Yorker Bagel',
    subject: '"The New Yorker Bagel" — bagel with smoked salmon, cream cheese, capers, lettuce, tomato, red onion and black olives.',
    plate: `${LOX_BAGEL} on one side of the plate; on the other side a fresh side salad of shredded iceberg lettuce, red tomato wedges, cucumber slices, rings of red onion and two whole black olives; one small white cup of capers; and ${SIDE_CREAM_CHEESE}.`,
    styling: 'Abundant, fresh and colourful, like a real NY diner lox platter. NO brand names or logos on anything.' },
  'dry-cereal-milk': { batch: 3, name: 'Assorted Dry Cereals with Milk', vessel: 'bowl',
    subject: '"Assorted Dry Cereals with Milk" — a bowl of corn flakes with milk.',
    plate: 'the bowl filled with golden corn flakes, and a small white ceramic creamer pitcher of milk on the saucer beside it.',
    styling: 'Flakes crisp and dry (milk still in the pitcher). NO branded box, NO fruit.' },
  'cereal-raisins': { batch: 3, name: 'Cereal with Raisins', vessel: 'bowl',
    subject: '"Cereal with Raisins" — a bowl of bran flakes with raisins and milk.',
    plate: 'the bowl filled with brown bran flakes and dark raisins, and a small white creamer pitcher of milk on the saucer beside it.',
    styling: 'Raisins clearly visible among the flakes. NO branded box.' },
  'cereal-berries': { batch: 3, name: 'Cereal with Seasonal Berries or Fruit Salad', vessel: 'bowl',
    subject: '"Cereal with Seasonal Berries" — a bowl of corn flakes topped with fresh berries.',
    plate: 'the bowl filled with golden corn flakes topped with fresh strawberries, blueberries and raspberries, and a small white creamer pitcher of milk on the saucer beside it.',
    styling: 'Berries bright and fresh. NO banana.' },
  'hot-oatmeal': { batch: 3, name: 'Old Fashioned Hot Oatmeal with Milk', vessel: 'bowl',
    subject: '"Old Fashioned Hot Oatmeal" — a bowl of hot oatmeal with milk.',
    plate: 'the bowl filled with creamy hot rolled-oat oatmeal with a light wisp of steam, and a small white creamer pitcher of milk on the saucer beside it.',
    styling: 'Plain oatmeal, creamy texture. NO toppings at all.' },
  'oatmeal-raisins-brown-sugar': { batch: 3, name: 'Oatmeal with Raisins & Brown Sugar', vessel: 'bowl',
    subject: '"Oatmeal with Raisins & Brown Sugar".',
    plate: 'the bowl filled with creamy hot oatmeal topped with dark raisins and a sprinkle of brown sugar melting into the surface.',
    styling: 'NO fruit, NO nuts, NO milk pitcher.' },
  'oatmeal-berries': { batch: 3, name: 'Oatmeal with Seasonal Berries', vessel: 'bowl',
    subject: '"Oatmeal with Seasonal Berries".',
    plate: 'the bowl filled with creamy hot oatmeal topped with fresh strawberries, blueberries and raspberries.',
    styling: 'Berries bright. NO raisins, NO nuts, NO milk pitcher.' },
  'avocado-toast': { batch: 3, name: 'Avocado Toast',
    subject: '"Avocado Toast" — seven-grain toast with smashed avocado, tomato, onion, cilantro, poached eggs and a house salad.',
    plate: 'two large slices of toasted seven-grain bread spread thickly with chunky smashed green avocado, a soft poached egg with a dusting of black pepper on each slice, halved RED and YELLOW cherry tomatoes scattered over them, a generous side salad of mixed greens (frisee, radicchio, arugula, cucumber) beside them, and one small white cup of house vinaigrette.',
    styling: 'Seeded multigrain bread visibly textured. NO salmon, NO chili flakes, NO cilantro garnish on top.' },
  'avocado-toast-salmon': { batch: 3, name: 'Avocado Toast with Smoked Salmon',
    subject: '"Avocado Toast with Smoked Salmon".',
    plate: 'two large slices of toasted seven-grain bread spread thickly with chunky smashed green avocado, folded ribbons of silky smoked salmon and a soft poached egg with a dusting of black pepper on each slice, halved RED and YELLOW cherry tomatoes scattered over them, a generous side salad of mixed greens (frisee, radicchio, arugula, cucumber) beside them, and one small white cup of house vinaigrette.',
    styling: 'Silky smoked salmon clearly visible. NO capers, NO chili flakes.' },
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
