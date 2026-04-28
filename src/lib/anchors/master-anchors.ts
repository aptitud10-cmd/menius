import type { SupabaseClient } from '@supabase/supabase-js';

export interface MasterAnchor {
  id: string;
  category_slug: string;
  display_name: string;
  aliases: string[];
  anchor_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

const DIACRITICS = /[̀-ͯ]/g;
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim();
}

/**
 * Find a master anchor matching the given category name.
 * Returns the master anchor with the most-specific (longest) alias match.
 * Returns null if no anchor matches OR if the matched anchor has no anchor_url yet.
 */
export async function findMasterAnchor(
  supabase: SupabaseClient,
  categoryName: string,
): Promise<MasterAnchor | null> {
  if (!categoryName) return null;
  const haystack = normalize(categoryName);
  if (!haystack) return null;

  const { data: anchors } = await supabase
    .from('master_style_anchors')
    .select('*')
    .not('anchor_url', 'is', null);
  if (!anchors || anchors.length === 0) return null;

  // Find best match: longest alias word that appears as substring in the
  // normalized category name. Prefer specific over generic ("egg specialty"
  // beats "egg" if the name is "3 Egg Specialty Omelettes").
  let best: { anchor: MasterAnchor; matchLen: number } | null = null;
  for (const anchor of anchors as MasterAnchor[]) {
    for (const alias of anchor.aliases) {
      const needle = normalize(alias);
      if (!needle) continue;
      if (haystack.includes(needle)) {
        if (!best || needle.length > best.matchLen) {
          best = { anchor, matchLen: needle.length };
        }
      }
    }
  }
  return best?.anchor ?? null;
}

/**
 * The 15 master prompts used during calibration. Each is tuned to produce
 * a textbook-correct visual reference for that category — the form must
 * be unmistakable so the anchor teaches downstream generations the right
 * shape.
 */
export const MASTER_PROMPTS: Record<string, string> = {
  omelette: `Award-winning food photography of a CLASSIC AMERICAN-STYLE FOLDED OMELETTE.

CRITICAL — THIS IS A FOLDED OMELETTE, NOT scrambled eggs, NOT a flat egg sheet. Mandatory shape: a thin egg sheet cooked just until set, then FOLDED IN HALF into a clean HALF-MOON / CRESCENT SHAPE with the seam on top. The folded edge is clean and continuous. Pale buttery yellow exterior with the lightest brown blush in spots. Filling visible peeking out from one open side of the fold (cheese melting, ham diced). Light dusting of fresh chives on top.

The omelette must read INSTANTLY as a folded omelette — if a viewer sees scrambled eggs or a flat egg pancake, the photo has FAILED.

ON: pristine round white ceramic plate. Crispy hash brown potatoes and a slice of buttered white toast plated next to the omelette as breakfast accompaniments.
SURFACE: warm light oak wood breakfast table with subtle wood grain.
LIGHTING: soft morning window light from the left at 35°, warm tones (3400K), gentle shadows.
ANGLE: 35° hero angle showing the omelette's folded crescent shape clearly from the side.
CAMERA: 85mm prime lens, f/3.5, ISO 400, natural film grain.
COMPOSITION: subject centered, occupying 60-65% of the frame width, generous margin all around.

NO scrambled eggs. NO flat egg sheet. NO white corner artifacts. NO text. NO logos. NO hands. NO utensils. NO vignette.`,

  burger: `Award-winning food photography of a CLASSIC GOURMET BURGER.

CRITICAL — every layer perfectly stacked and visible from the side: brioche bun crown with toasted sesame seeds, melted American cheese draping over the sides in golden ribbons, perfectly seared beef patty with visible char and Maillard crust, crisp green lettuce, bright red tomato slice, brioche bottom bun. ONE controlled sauce drip on the side.

ON: matte dark slate stone surface. Crispy golden hand-cut fries piled to one side.
SURFACE: rough dark slate texture. Background: deep matte charcoal, smooth and out-of-focus.
LIGHTING: single hard key light from the left at 45° creating dramatic shadows that reveal every texture. Black negative-fill card on the right deepens shadows for tonal contrast.
ANGLE: 35° hero angle — every burger layer visible from bottom bun to crown.
CAMERA: 85mm prime lens, f/3.2, ISO 400.
COMPOSITION: burger centered, 60% of frame width, fries balancing the negative space.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  pizza: `Award-winning food photography of a WOOD-FIRED MARGHERITA PIZZA.

CRITICAL — full round pizza visible with one slice lifted slightly to show melted mozzarella stretching in long glossy cheese-pull strands catching the light. Crust golden-brown with leopard-spot char bubbles from a wood-fired oven. Vibrant red San Marzano tomato sauce visible between cheese pools. Fresh whole basil leaves bright green and glossy.

ON: round worn rustic wooden pizza board with dark grain and slight char marks.
SURFACE: dark stone restaurant table beneath the wood board.
LIGHTING: low-angle side light raking across the surface at 20° — grazing light that creates micro-shadows in every texture.
ANGLE: 25° angle showing both the full round shape AND the cheese pull on the lifted slice.
CAMERA: 50mm prime lens, f/5.6, ISO 400.
COMPOSITION: pizza centered, occupying 70% of the frame.

NO white corner artifacts. NO text. NO logos. NO hands except the slice being lifted is OK if shown from afar. NO vignette.`,

  taco: `Award-winning food photography of AUTHENTIC MEXICAN STREET TACOS.

CRITICAL — three soft corn tortillas, slightly charred from the comal, generously filled with grilled marinated meat (al pastor or carnitas). Each taco overflowing with bright white diced onion, vibrant green cilantro, and a wedge of yellow lime. Salsa visible glistening. Authentic street-food energy, not fast-food.

ON: traditional handcrafted ceramic plate or oval terracotta serving tray.
SURFACE: warm terracotta ceramic counter with a small natural woven cloth underneath.
LIGHTING: low-angle side light at 25° creating texture in tortilla char marks and meat caramelization.
ANGLE: 28° angle — three tacos arranged naturally, fillings spilling, all toppings visible.
CAMERA: 50mm prime lens, f/3.2, ISO 400.
COMPOSITION: tacos centered as a group, occupying 65% of the frame.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  salad: `Award-winning food photography of a CAESAR SALAD.

CRITICAL — crisp romaine hearts cut lengthwise, vibrantly green, each leaf glistening with creamy Caesar dressing coating naturally. Generous shavings of Parmigiano-Reggiano catching the light like flakes of gold. Golden-brown garlic croutons with visible toasted texture. Cracked black pepper visible. Maybe one anchovy fillet and a lemon wedge for authenticity.

ON: wide ceramic salad bowl or large flat white plate.
SURFACE: clean white marble surface with soft gray veining.
LIGHTING: bright soft natural light from above-left, airy and inviting.
ANGLE: 45° overhead-leaning angle showing all ingredient layers in clear focus.
CAMERA: 50mm prime lens, f/5.6, ISO 200, every element razor-sharp.
COMPOSITION: bowl centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  pasta: `Award-winning food photography of FETTUCCINE ALFREDO.

CRITICAL — fresh fettuccine pasta twisted into a natural elegant nest, pale yellow ribbons glistening with creamy white Parmesan-butter sauce coating every strand. Generous Parmigiano shavings on top catching the light. Fresh basil leaf or parsley sprig as garnish. Cracked black pepper. Delicate wisps of steam rising naturally.

ON: wide shallow white ceramic pasta bowl with a generous rim.
SURFACE: white linen cloth draped over a wooden restaurant table.
LIGHTING: warm ambient restaurant light from the right at 40°, golden tones (3400K).
ANGLE: 38° angle showing bowl depth, sauce coating every strand, garnish on top.
CAMERA: 85mm prime lens, f/2.8, ISO 400.
COMPOSITION: bowl centered, 60% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  dessert: `Award-winning food photography of a NEW YORK CHEESECAKE SLICE.

CRITICAL — a single tall slice of classic New York cheesecake, smooth pale ivory body with a perfectly compact texture, golden graham cracker crust at the base. A glossy red strawberry compote drizzled artfully over the top, ONE drip running down one side in a controlled line. Fresh whole strawberries arranged beside the slice. A delicate dusting of powdered sugar.

ON: pristine white ceramic dessert plate.
SURFACE: white Carrara marble surface with soft gray veining.
LIGHTING: soft diffused north-facing window light, large and even, mimicking overcast natural daylight. Wraps gently around the subject.
ANGLE: 42° angle capturing every layer — crust, filling, topping.
CAMERA: 85mm prime lens, f/2.8, ISO 200.
COMPOSITION: slice centered, 55% of frame width, generous negative space for editorial feel.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  cocktail: `Award-winning food photography of a CLASSIC MARGARITA COCKTAIL.

CRITICAL — a wide-rim margarita glass with a perfectly applied half-salted rim. Pale lime-green liquid clearly visible. Crystal-clear ice cubes. A fresh lime wedge perched on the rim. The glass silhouette is fully visible against the dark background.

ON: sleek dark honed marble bar counter with subtle veining. One folded linen cocktail napkin to the side.
SURFACE: dark marble with deep out-of-focus black background.
LIGHTING: single backlight from behind and slightly left at 30° creating luminous translucency through the green liquid — the cocktail glows from within. Soft silver fill from the right barely lifting the deepest shadow.
ANGLE: 18° tilt showing the glass silhouette, garnish, and ice clearly.
CAMERA: 85mm prime lens, f/2.0, ISO 400.
COMPOSITION: glass centered, occupying 50% of frame width, generous dark negative space.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  coffee: `Award-winning food photography of a CAPPUCCINO with LATTE ART.

CRITICAL — a beautiful cappuccino in a ceramic cup with a perfect rosette or tulip latte art pattern on the surface. The crema is golden-brown beneath a pristine velvety microfoam. Steam delicately curling upward. A small saucer underneath the cup. Maybe one biscotti on the saucer.

ON: large ceramic cappuccino cup on a thin matching saucer.
SURFACE: warm light oak wood table with visible wood grain.
LIGHTING: soft warm directional light from the left at 35°, golden tones (3200K).
ANGLE: 22° angle showing the cup rim, latte art surface, and steam curling softly upward.
CAMERA: 85mm prime lens, f/2.2, ISO 400.
COMPOSITION: cup centered, 55% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  breakfast: `Award-winning food photography of a CLASSIC AMERICAN PANCAKE STACK breakfast.

CRITICAL — three to four fluffy golden-brown pancakes stacked, each layer perfectly distinct. A rectangular pat of butter melting and pooling on the very top. Maple syrup dripping naturally down the sides of the stack forming a small pool at the base. Fresh blueberries and strawberries arranged colorfully around the stack. A delicate dusting of powdered sugar on top like snow.

ON: round white ceramic breakfast plate with clean edges.
SURFACE: light oak wood breakfast table with fine wood grain.
LIGHTING: soft warm morning light from the right at 40°, golden hour tones (3200K).
ANGLE: 35° hero angle showing every pancake layer and the syrup drip clearly.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: stack centered, 60% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  sandwich: `Award-winning food photography of a GOURMET CLUB SANDWICH.

CRITICAL — a tall triple-decker club sandwich cut diagonally to show every layer in cross-section: toasted artisan bread, sliced turkey, crispy bacon, fresh green lettuce, bright red tomato, melted cheese, mayo. A wooden cocktail pick spearing each half to hold it together. One half standing upright behind the other lying flat to show both the side profile AND the cross-section.

ON: rustic weathered wooden cutting board.
SURFACE: warm wooden restaurant table.
LIGHTING: warm natural ambient light from the left at 35°.
ANGLE: 32° angle — cross-section visible showing all fillings in perfect layers.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: sandwich centered, 65% of frame width, fries or salad balancing one corner.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  chicken: `Award-winning food photography of CRISPY BUFFALO WINGS.

CRITICAL — a generous portion of golden-brown crispy chicken wings glistening with bright orange-red Buffalo sauce. Visible char marks and crispy skin texture. Sauce coating every wing naturally with one or two natural drips. Celery sticks and a small ramekin of creamy blue cheese dressing on the side.

ON: ceramic sharing plate lined with natural parchment paper.
SURFACE: matte black ceramic tile surface.
LIGHTING: single hard key light from the left at 45° creating dramatic shadows that reveal every crispy skin texture.
ANGLE: 30° angle — crispy skin texture and golden char fully visible.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: wings arranged centered on the plate, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  steak: `Award-winning food photography of a PERFECTLY GRILLED WHOLE STEAK.

CRITICAL — a thick juicy steak (sirloin or ribeye cut) shown WHOLE and UNCUT, never sliced open. Deep crosshatch grill marks on top, beautiful caramelized golden-brown Maillard crust on every visible surface. Cooked to MEDIUM (NOT rare, NOT medium-rare) — the steak is fully cooked through with a warm pink-brown interior that should ONLY be implied by appearance, never exposed by a cut showing red center. Resting butter pat melting on top with a fresh thyme sprig. Fresh cracked black pepper visible. Light steam rising naturally. Roasted garlic cloves and a small ramekin of green chimichurri sauce plated beside the steak.

The steak must read as fully cooked and APPETIZING for everyday diners — no exposed red raw center, no blood-pink interior visible.

ON: rustic wooden cutting board OR matte dark ceramic dinner plate.
SURFACE: dark slate restaurant surface, slightly textured.
LIGHTING: single hard key light from the left at 45° revealing every texture — the surface char, the grill marks, the glossy butter on top.
ANGLE: 28° angle from the front showing the surface char and the steak's natural thickness in profile.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: steak centered, 60% of frame width.

NO red raw interior visible. NO sliced cross-section. NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  seafood: `Award-winning food photography of a PAN-SEARED ATLANTIC SALMON FILLET.

CRITICAL — a thick salmon fillet with crispy golden-brown seared skin on top, glistening with butter and oil. Vibrant pink-orange flesh visible at the edges. A pat of compound herb butter melting on top. Fresh dill and a vibrant yellow lemon wedge beside it. Steam rising. Small piles of seasonal vegetables (asparagus tips, cherry tomatoes) plated alongside.

ON: pristine white ceramic dinner plate.
SURFACE: clean white marble or light wood surface.
LIGHTING: bright soft natural light from above-left, fresh and clean.
ANGLE: 35° hero angle showing the crispy skin and the side flesh together.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: fillet centered, 60% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  juice: `Award-winning food photography of a FRESH ORANGE JUICE.

CRITICAL — a tall clear highball glass filled with vibrant freshly squeezed orange juice. Natural pulp visible suspended in the liquid. Crystal-clear ice cubes. A bright orange wheel slice perched on the rim. Heavy condensation droplets on the cold glass exterior, some running down. Color is rich vivid orange (NOT yellow, NOT lemon).

ON: polished dark stone bar counter or warm wood breakfast table.
SURFACE: depending on context — warm wood works well for juice. Background: deep out-of-focus dark charcoal OR soft warm cream, smooth.
LIGHTING: backlight at 30° behind the glass creating natural translucency glow through the juice — the liquid appears to glow from within.
ANGLE: 20° tilt showing the full glass profile, condensation, and juice level.
CAMERA: 85mm prime lens, f/2.0, ISO 400.
COMPOSITION: glass centered, 50% of frame width, generous negative space.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  appetizer: `Award-winning food photography of LOADED NACHOS as a sharable appetizer.

CRITICAL — a generous pile of golden crispy tortilla chips arranged on a sharing platter, blanketed with melted yellow cheese, sprinkled with diced tomato, fresh cilantro, sliced jalapeños, black beans, and small dollops of guacamole and sour cream. The composition reads as an inviting shared starter — abundant but not chaotic.

ON: round dark slate sharing platter or rustic wooden board.
SURFACE: dark restaurant table, out-of-focus.
LIGHTING: warm directional light from above-left at 40° revealing every texture — chip crispness, cheese pull, sauce shine.
ANGLE: 35° hero angle showing the layered toppings clearly.
CAMERA: 50mm prime lens, f/3.5, ISO 400.
COMPOSITION: dish centered, 70% of frame width, slight overflow energy.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  soup: `Award-winning food photography of a HEARTY HOMEMADE CHICKEN SOUP.

CRITICAL — a wide ceramic soup bowl filled with golden chicken broth. Visible chunks of pulled chicken, carrots in rounds, celery, fresh herbs (parsley, cilantro), and small pasta or rice. Steam rising naturally. The broth is clear and inviting, not greasy. A wedge of lime and a slice of avocado on top hint at LatAm style.

ON: wide ceramic soup bowl with a generous rim, on a small saucer.
SURFACE: rustic warm wood table or warm ceramic surface.
LIGHTING: soft natural light from the right at 35°, warm and homey, slight steam catching the light.
ANGLE: 28° angle — bowl rim and broth surface clearly visible, soup ingredients showing.
CAMERA: 85mm prime lens, f/3.2, ISO 400.
COMPOSITION: bowl centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  rice: `Award-winning food photography of CLASSIC ARROZ CON POLLO.

CRITICAL — a wide plate of fluffy yellow rice (saffron or achiote tinted) topped with golden-roasted chicken pieces — clearly identifiable thigh and drumstick with crispy skin. Vibrant green peas, red bell pepper strips, and small black olives scattered through the rice. A wedge of lime on the side. The dish reads as abundant, homey LatAm comfort food.

ON: wide round white ceramic dinner plate or shallow oval terracotta dish.
SURFACE: warm wood restaurant table.
LIGHTING: warm directional natural light from the left at 35°, golden tones (3200K).
ANGLE: 32° angle — clearly showing the rice, the chicken pieces, and the colorful vegetables.
CAMERA: 50mm prime lens, f/3.5, ISO 400.
COMPOSITION: plate centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  soft_drink: `Award-winning food photography of a CLASSIC ICED SODA in a clean glass.

CRITICAL — a tall clear highball glass filled with bubbling amber-brown cola or lightly tinted soda. Crystal-clear ice cubes packed inside, bubbles visible rising through the liquid. Heavy condensation on the exterior glass with droplets running down. A simple lemon or lime wedge on the rim. The drink reads instantly as a refreshing soft drink, not alcohol.

ON: polished dark wood bar counter or smooth dark stone.
SURFACE: dark out-of-focus background, smooth.
LIGHTING: backlight at 35° behind the glass creating luminous translucency through the bubbles. Soft cool fill from the front-right at low intensity.
ANGLE: 18° tilt showing the full glass silhouette, ice, condensation, and bubbles.
CAMERA: 85mm prime lens, f/2.2, ISO 400.
COMPOSITION: glass centered, 50% of frame width, generous dark negative space.

NO branded labels. NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  grill_meat: `Award-winning food photography of an ARGENTINIAN-STYLE PARRILLA / ASADO platter.

CRITICAL — a generous wooden serving board piled with multiple cuts of grilled meat: a thick slice of churrasco (sirloin) with deep grill marks, a piece of grilled chorizo sausage cut diagonally to show the inside, a slice of grilled chicken or short rib. Each cut shows beautiful char marks and Maillard crust. ALL CUTS ARE FULLY COOKED — no exposed raw red interior. A small ramekin of bright green chimichurri sauce. A few roasted potato chunks and a wedge of lime alongside.

ON: rustic wooden cutting board with handle, well-worn.
SURFACE: warm wood restaurant table or stone tile.
LIGHTING: single warm directional light from the left at 40° creating dramatic char-mark shadows.
ANGLE: 30° hero angle showing the variety of cuts and char marks.
CAMERA: 50mm prime lens, f/3.5, ISO 400.
COMPOSITION: board centered, 70% of frame width, abundant feel.

NO red raw interior. NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  ceviche: `Award-winning food photography of CLASSIC PERUVIAN CEVICHE.

CRITICAL — a shallow white plate or wide glass coupe filled with chunks of cured white fish glistening in cloudy lime "leche de tigre" marinade. Thinly sliced red onion in vibrant magenta. Bright cilantro leaves scattered. One yellow rocoto pepper slice or thin chili rings for color. On the side: a few corn kernels (choclo) and a slice of orange sweet potato (camote). A wedge of lime garnish.

ON: shallow flat white ceramic plate OR clear curved glass coupe.
SURFACE: wet stone or cool blue-gray slate hinting at coastal freshness.
LIGHTING: bright cool natural light from above-left, fresh and clean.
ANGLE: 38° angle — fish chunks, onion, marinade pool, and accompaniments all visible.
CAMERA: 85mm prime lens, f/3.2, ISO 200.
COMPOSITION: plate centered, 60% of frame width, the plate filling but not crowded.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  arepa: `Award-winning food photography of a CLASSIC VENEZUELAN AREPA REINA PEPIADA.

CRITICAL — a thick golden-toasted round corn arepa, sliced open horizontally to show the white corn interior and stuffed generously with creamy chicken-avocado salad — visible chicken, mashed avocado, mayo. The filling is overflowing slightly from the open side, inviting. The arepa exterior shows dark golden char spots from the budare grill.

ON: small round wooden cutting board OR plain white ceramic plate.
SURFACE: warm wood breakfast table or warm tile surface.
LIGHTING: warm soft directional light from the left at 35°, golden tones, natural.
ANGLE: 30° angle — open side facing camera so filling is fully visible, char marks on the exterior visible.
CAMERA: 85mm prime lens, f/3.2, ISO 400.
COMPOSITION: arepa centered, 60% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  empanada: `Award-winning food photography of a TRIO OF GOLDEN EMPANADAS.

CRITICAL — three baked or fried empanadas with a beautifully golden-brown crust, classic crimped half-moon shape with neat fork-pressed edges. ONE empanada cut open to show a generous savory filling inside (seasoned ground beef with onions, peppers, hard-boiled egg pieces, olives — clearly visible). The other two whole. A small ramekin of chimichurri or green sauce on the side. A wedge of lime.

ON: rustic ceramic plate or wooden serving board.
SURFACE: warm wood restaurant table.
LIGHTING: warm directional light from the right at 40° revealing the texture of the crust.
ANGLE: 32° angle showing the trio together with the cut empanada displaying its filling.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: empanadas arranged centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  combo_plate: `Award-winning food photography of COLOMBIAN BANDEJA PAISA.

CRITICAL — a large oval or round plate generously loaded with a Colombian combo plate: white rice on one side, red beans (frijoles) in a small mound, a piece of grilled steak (well done), a piece of golden crispy chicharrón pork belly, a fried egg on top with bright yellow yolk visible, a few slices of golden fried sweet plantain (plátano maduro), one small white arepa, half an avocado, and a small white chorizo sausage. Every component clearly identifiable. The plate is abundant but ordered — readable as a complete typical plate.

ON: large oval white ceramic plate or rectangular wooden serving board.
SURFACE: warm wood restaurant table, brown and inviting.
LIGHTING: warm overhead-leaning light from above-left at 50°, even, slightly warm.
ANGLE: 38° angle balancing top-down readability with hero angle on the meats.
CAMERA: 35mm wide prime lens, f/4.5, ISO 400 — wider lens to fit all components.
COMPOSITION: plate centered, 80% of frame width — abundance is the point.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  chilaquiles: `Award-winning food photography of MEXICAN CHILAQUILES VERDES.

CRITICAL — a wide ceramic plate piled with crispy tortilla chips bathed in vibrant green tomatillo salsa, the chips slightly softened but still maintaining crunch on the edges. Topped with crumbled white queso fresco, thin slices of red onion, fresh cilantro, sliced avocado, and a fried egg on top with bright yellow runny yolk. A drizzle of crema and a wedge of lime on the side.

ON: wide round white ceramic plate.
SURFACE: warm woven Mexican tablecloth or rustic ceramic tile.
LIGHTING: warm morning light from the right at 35°.
ANGLE: 35° hero angle showing the green salsa, the toppings, and the egg yolk catching the light.
CAMERA: 85mm prime lens, f/3.2, ISO 400.
COMPOSITION: plate centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

  mole: `Award-winning food photography of MOLE POBLANO over chicken.

CRITICAL — a piece of cooked chicken (thigh and drumstick) plated and generously coated with a thick, glossy, deep mahogany-brown mole sauce that pools naturally on the plate. Toasted sesame seeds sprinkled over the top of the sauce. A small mound of white Mexican rice on one side. A warm corn tortilla folded beside it. The mole has a velvety, lacquered surface that reads as authentic.

ON: round white ceramic dinner plate.
SURFACE: warm woven Mexican tablecloth or rustic terracotta tile.
LIGHTING: warm directional light from the left at 40° catching the sheen of the mole sauce.
ANGLE: 32° angle showing the sauce coating, the chicken, the rice, and the tortilla.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: plate centered, 65% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,
};

export const MASTER_CATEGORY_SLUGS = Object.keys(MASTER_PROMPTS);
