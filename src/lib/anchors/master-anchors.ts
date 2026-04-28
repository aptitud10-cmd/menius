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
  omelette: `Award-winning food photography of a CLASSIC FRENCH OMELETTE.

CRITICAL — the form is non-negotiable: pale yellow buttery exterior, slightly browned in spots, FOLDED in classic half-moon shape with the filling visible spilling from one open side. Steam wisps rising naturally. A few scattered fresh chives on top.

ON: pristine round white ceramic plate. Hash brown potatoes and a slice of buttered toast plated next to the omelette as breakfast accompaniments.
SURFACE: warm light oak wood breakfast table with subtle wood grain.
LIGHTING: soft morning window light from the left at 35°, warm tones (3400K), gentle shadows.
ANGLE: 42° hero angle showing the omelette's folded form clearly.
CAMERA: 85mm prime lens, f/3.5, ISO 400, natural film grain.
COMPOSITION: subject centered, occupying 60-65% of the frame width, generous margin all around.

NO white corner artifacts. NO text. NO logos. NO hands. NO utensils. NO vignette.`,

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

  steak: `Award-winning food photography of a PERFECTLY GRILLED RIBEYE STEAK.

CRITICAL — a thick prime ribeye steak with deep crosshatch grill marks on the surface and a beautiful golden-brown Maillard crust. ONE clean cut on the side revealing the perfect medium-rare interior — vibrant pink with red juices glistening. Resting butter and fresh thyme sprig on top, slowly melting. Fresh cracked black pepper. Steam rising. Roasted garlic cloves and a small ramekin of chimichurri sauce beside the steak.

ON: matte dark ceramic plate or rustic wooden cutting board.
SURFACE: dark slate restaurant surface.
LIGHTING: single hard key light from the left at 45° revealing every texture — the crust, the cross-section interior, the glossy juices.
ANGLE: 30° angle showing both the surface char and the cross-section.
CAMERA: 85mm prime lens, f/3.5, ISO 400.
COMPOSITION: steak centered, 60% of frame width.

NO white corner artifacts. NO text. NO logos. NO hands. NO vignette.`,

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
};

export const MASTER_CATEGORY_SLUGS = Object.keys(MASTER_PROMPTS);
