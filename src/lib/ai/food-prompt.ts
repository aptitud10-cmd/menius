/**
 * Shared food photography prompt builder.
 * Used by the regular generate-image route and the admin bulk-regenerate endpoint.
 */

export interface FoodPromptParams {
  productName: string;
  description?: string | null;
  category?: string | null;
  style?: string | null;
  cuisine?: string | null;
}

const angleMap: Record<string, string> = {
  Beverages:
    "20-degree tilt showing the full glass profile, condensation droplets, and liquid level — glass silhouette fully visible",
  Drinks:
    "20-degree tilt showing the full glass profile, condensation droplets, and liquid level — glass silhouette fully visible",
  "Hot drinks":
    "22-degree tilt showing the cup rim, latte art surface, and steam curling softly upward",
  Cocktails:
    "18-degree tilt showing the glass silhouette, garnish, and ice against a dark background",
  Desserts:
    "42-degree angle capturing every layer, drizzle, and topping — all strata clearly visible",
  Breakfast:
    "48-degree overhead showing the full plate and vibrant colors of every ingredient",
  Salads:
    "overhead flat-lay — all colorful ingredients visible and artfully arranged",
  Pizza:
    "overhead flat-lay — full round pizza visible, one slice lifted slightly to show cheese pull",
  Soups:
    "overhead flat-lay — bowl centered, garnish floating, wisps of steam rising",
  Tacos:
    "28-degree angle — 2-3 tacos arranged naturally, filling generously spilling, all toppings visible",
  Bowls:
    "45-degree overhead — all ingredients arranged in sections, beautiful color contrast",
  Burgers:
    "35-degree hero angle — every single burger layer visible from the bottom bun to the crown",
  Sandwiches:
    "32-degree angle — cross-section visible showing all fillings in perfect layers",
  Chicken:
    "30-degree angle — crispy skin texture and golden char fully visible",
  Sushi:
    "15-degree tilt — pieces in a diagonal line, rice grain texture and fish color fully visible",
  Pasta:
    "38-degree angle — bowl depth, sauce coating every strand, garnish on top",
  Grills:
    "28-degree hero angle — full steak/grill surface visible, every crosshatch sear mark and crust texture exposed, cut section revealing perfect internal doneness",
  Steaks:
    "28-degree hero angle — full steak surface dominant, crosshatch sear marks razor-sharp, cut showing internal color gradient from crust to center",
  Beef: "28-degree hero angle — full cut surface visible with dramatic char marks, sauce pooling naturally at the base",
  Carnes:
    "28-degree hero angle — protein fills the frame, sear marks and crust texture fully visible, sides arranged behind",
  BBQ: "30-degree angle — smoky char and caramelized crust fully exposed, sauce glistening under the light",
  Meat: "28-degree hero angle — full protein surface visible, every texture of the crust and char clearly defined",
  Seafood:
    "32-degree angle — full seafood surface visible, glisten of butter and natural ocean colors fully exposed",
  Fish: "30-degree angle — full fillet or whole fish visible, crispy skin texture and natural flesh color clearly showing",
  Shrimp:
    "25-degree angle — shrimp arranged in a natural arc, vibrant pink-orange color and char marks exposed",
};

const dofMap: Record<string, string> = {
  Beverages:
    "f/2.0 — creamy bokeh behind the glass, full glass perfectly in focus",
  Drinks:
    "f/2.0 — creamy bokeh behind the glass, full glass perfectly in focus",
  Cocktails: "f/2.0 — deep bokeh, glass sharp from base to garnish",
  "Hot drinks": "f/2.2 — cup sharp, steam trails softly defocused at tips",
  Burgers: "f/3.2 — entire burger stack in focus from bottom bun to crown",
  Sandwiches: "f/3.5 — all layers sharp in cross-section",
  Chicken: "f/3.5 — full piece in focus, surface texture razor-sharp",
  Pizza: "f/5.6 — full pizza in sharp focus, every topping crystal clear",
  Salads: "f/5.6 — all ingredients in sharp focus overhead",
  Soups: "f/4.0 — bowl sharp, garnish in focus, slight defocus at bowl edge",
  Pasta: "f/2.8 — pasta in focus, background gently defocused",
  Desserts: "f/2.8 — hero layer sharp, slight defocus on edges",
  Breakfast: "f/3.5 — entire plate in focus, every ingredient crisp",
  Tacos: "f/3.2 — all tacos in focus, fillings razor-sharp",
  Bowls: "f/4.0 — all ingredient sections in clear focus",
  Grills:
    "f/4.0 — entire steak/grill surface in critical sharp focus, every sear mark and crust texture razor-crisp, NO part of the protein out of focus",
  Steaks:
    "f/4.0 — full steak surface sharp from crust edge to crust edge, internal cut cross-section fully in focus",
  Beef: "f/3.5 — entire cut surface sharp, char marks and crust texture rendered with maximum detail",
  Carnes:
    "f/3.5 — full protein piece sharp throughout, NO shallow focus on meat dishes",
  BBQ: "f/4.0 — full surface and char detail sharp, sauce gloss rendered with clarity",
  Meat: "f/3.5 — full protein surface in sharp focus throughout",
  Seafood:
    "f/3.2 — full seafood piece sharp, glistening surface texture and color fully resolved",
  Fish: "f/4.0 — full fillet sharp from head to tail, skin texture and flesh color fully in focus",
  Shrimp:
    "f/4.0 — all shrimp in sharp focus, vibrant color and char detail clear",
};

const surfaceMap: Record<string, string> = {
  Beverages:
    "polished dark basalt stone bar counter, surface has subtle dark grain texture. Background: deep out-of-focus dark charcoal, smooth and featureless. No props, no food, no plates around.",
  Drinks:
    "polished dark basalt stone bar counter, surface has subtle dark grain texture. Background: deep out-of-focus dark charcoal, smooth and featureless.",
  "Hot drinks":
    "warm light oak wood table surface with visible wood grain. A thin ceramic saucer underneath the cup. Background: soft warm cream out-of-focus.",
  Cocktails:
    "sleek dark honed marble bar counter with subtle veining. One carefully folded linen cocktail napkin to the side. Background: deep out-of-focus black.",
  Burgers:
    "matte dark slate stone surface, rough texture. Background: deep matte charcoal. No extra props.",
  Chicken:
    "matte black ceramic tile surface. Background: deep charcoal. No extra props.",
  Pizza:
    "worn rustic wood board on a rough dark stone surface. Background: warm dark wood tones.",
  Tacos:
    "warm terracotta ceramic surface with a small natural woven cloth underneath. Background: warm earth tones.",
  Desserts:
    "white Carrara marble surface with soft gray veining. Background: elegant soft gray, barely perceptible.",
  Salads:
    "clean white marble surface. Background: bright soft natural light, airy white.",
  Soups:
    "dark slate or matte ceramic tile surface. Background: deep warm moody charcoal.",
  Pasta:
    "white linen cloth draped over a wooden restaurant table. Background: warm ambient restaurant.",
  Breakfast:
    "light oak wood breakfast table with fine wood grain. Background: soft warm morning light.",
  Dinner: "polished dark slate restaurant surface. Background: deep charcoal.",
  Appetizers:
    "rustic wooden serving board or dark ceramic tile. Background: warm dark tones.",
  Sandwiches:
    "rustic weathered wooden board. Background: warm natural ambient.",
  Grills:
    "matte black slate stone surface with subtle rough grain. A steak knife resting diagonally to the right of the plate. Background: deep dramatic charcoal black, completely smooth.",
  Steaks:
    "honed dark basalt stone surface, rough and matte. A sharp steak knife visible at the edge. Background: near-black charcoal with subtle depth.",
  Beef: "dark matte slate surface. Background: deep charcoal, moody and dramatic.",
  Carnes:
    "dark matte slate or black ceramic tile surface. Background: deep charcoal, no distractions.",
  BBQ: "worn dark wood board with a natural grain, slight char stains visible for authenticity. Background: warm deep dark tones.",
  Meat: "matte dark slate surface. Background: deep charcoal black.",
  Seafood:
    "white Carrara marble surface with cool gray veining. A lemon wedge and fresh herb sprig to the side. Background: soft cool gray, elegant and clean.",
  Fish: "white ceramic tile or light marble surface. A lemon wedge and dill sprig to the side. Background: soft neutral gray.",
  Shrimp:
    "dark polished slate surface. A halved lemon beside the plate. Background: deep charcoal.",
};

const latinCuisineMap: Record<string, string> = {
  Mexican:
    "Served on a rustic clay or hand-painted Talavera ceramic plate. Warm terracotta tones. Cilantro, lime wedge, and vibrant salsa as natural garnishes.",
  Colombian:
    "Colorful hand-painted ceramic plate. Hogao sauce, fresh herbs visible. Warm and hearty presentation.",
  Peruvian:
    "Modern fine-dining plate. Aji amarillo sauce drizzle, purple corn, potato, and microgreens arranged with precision.",
  Argentine:
    "Rustic wooden board. Visible char marks from the grill, chimichurri sauce in a small clay dish on the side, fresh lemon wedge.",
  Venezuelan:
    "Colorful ceramic plate. Melted cheese, black beans, shredded beef. Sweet plantains as vibrant garnish.",
  Brazilian:
    "Bright ceramic plate. Black beans, white rice, crispy farofa, orange slices arranged with color contrast.",
  Spanish:
    "White ceramic. Saffron golden color, olive oil drizzle, smoked paprika dust, elegant simplicity.",
  Italian:
    "White ceramic plate. Fresh basil leaf, high-quality olive oil drizzle, Parmigiano Reggiano shavings.",
  Japanese:
    "Black lacquer or minimalist white ceramic. Wasabi and pickled ginger with precision. Clean geometric presentation.",
  American:
    "White ceramic plate or rustic wooden board. Generous portion, crispy edges, casual fine-dining presentation.",
  Chinese:
    "Blue-and-white porcelain bowl. Steaming broth, chopsticks resting at the edge.",
};

function getIsDrink(category: string | null | undefined): boolean {
  return ["Beverages", "Hot drinks", "Cocktails", "Drinks"].includes(
    category ?? "",
  );
}

// Fruit juice lookup: maps name patterns → { color, garnish }
// Add new fruits here — the catch-all below will NOT assume citrus.
const FRUIT_JUICE_MAP: Array<{
  pattern: RegExp;
  color: string;
  garnish: string;
}> = [
  {
    pattern: /cranberry|ar[aá]ndano rojo|cr[aá]nberry/,
    color: "deep ruby-red cranberry juice",
    garnish:
      "a few fresh or frozen cranberries and a sprig of rosemary on the rim — NO citrus, NO orange slice",
  },
  {
    pattern: /naranja|orange/,
    color: "vibrant freshly squeezed orange juice",
    garnish: "a thin orange wheel on the rim",
  },
  {
    pattern: /apple|manzana/,
    color: "pale golden-green apple juice",
    garnish:
      "a thin green apple slice on the rim — NOT lime, NOT lemon, ONLY apple",
  },
  {
    pattern: /watermelon|sand[íi]a/,
    color: "deep pink-red watermelon juice",
    garnish: "fresh mint leaves, no citrus",
  },
  {
    pattern: /mango/,
    color: "thick rich golden-yellow mango juice",
    garnish: "a fresh mango slice on the rim",
  },
  {
    pattern: /pi[ñn]a|pineapple/,
    color: "bright golden-yellow pineapple juice",
    garnish: "a pineapple wedge on the rim",
  },
  {
    pattern: /fresa|strawberry/,
    color: "vibrant deep pink-red strawberry juice",
    garnish: "a fresh strawberry on the rim",
  },
  {
    pattern: /zanahoria|carrot/,
    color: "bright vivid orange carrot juice",
    garnish: "a carrot stick beside the glass",
  },
  {
    pattern: /mora|blackberry/,
    color: "deep purple-black blackberry juice",
    garnish: "a few fresh blackberries on the rim",
  },
  {
    pattern: /maracuy[áa]|passion.?fruit/,
    color: "vibrant golden-orange passion fruit juice",
    garnish: "a passion fruit half beside the glass",
  },
  {
    pattern: /guayaba|guava/,
    color: "pale pink guava juice",
    garnish: "a thin guava slice on the rim",
  },
  {
    pattern: /guanabana|soursop/,
    color: "creamy pale white-green soursop juice",
    garnish: "a small piece of soursop on the rim",
  },
  {
    pattern: /tamarindo/,
    color: "deep brown tamarind juice",
    garnish: "a tamarind pod beside the glass",
  },
  {
    pattern: /lim[oó]n|lime/,
    color: "pale greenish-yellow lime juice",
    garnish: "a lime wheel on the rim",
  },
  {
    pattern: /toronja|grapefruit/,
    color: "blush pink grapefruit juice",
    garnish: "a grapefruit wedge on the rim",
  },
  {
    pattern: /uva|grape/,
    color: "deep purple grape juice",
    garnish: "a small bunch of grapes beside the glass",
  },
  {
    pattern: /durazno|peach/,
    color: "soft peachy-golden peach juice",
    garnish: "a peach slice on the rim",
  },
  {
    pattern: /lichi|lychee/,
    color: "clear pale rose lychee juice",
    garnish: "two lychee fruits on a pick on the rim",
  },
  {
    pattern: /pitahaya|dragon.?fruit/,
    color: "vivid magenta-pink dragon fruit juice",
    garnish: "a small dragon fruit slice on the rim",
  },
  {
    pattern: /coco|coconut/,
    color: "opaque creamy white coconut juice",
    garnish: "a piece of fresh coconut and a straw",
  },
  {
    pattern: /betabel|beet/,
    color: "deep jewel-red beet juice",
    garnish: "a thin beet slice beside the glass",
  },
  {
    pattern: /pepino|cucumber/,
    color: "pale clear green cucumber juice",
    garnish: "a thin cucumber wheel on the rim and fresh mint",
  },
];

export function getJuiceContainer(lowerName: string): string {
  for (const { pattern, color, garnish } of FRUIT_JUICE_MAP) {
    if (pattern.test(lowerName)) {
      return `a tall clear glass filled with ${color}, clear ice cubes, ${garnish}. Condensation on the cold glass exterior.`;
    }
  }
  // Generic fallback: do NOT assume citrus — let the model read the product name
  return `a tall clear glass filled with freshly prepared juice whose color matches the fruit in the product name, ice cubes, garnish matching the fruit — NOT orange, NOT citrus unless the product name specifies it. Condensation on the cold glass exterior.`;
}

export function getJuiceStyling(lowerName: string): string {
  for (const { pattern, color, garnish } of FRUIT_JUICE_MAP) {
    if (pattern.test(lowerName)) {
      return `${color.charAt(0).toUpperCase() + color.slice(1)}, crystal clear or naturally textured. ${garnish.charAt(0).toUpperCase() + garnish.slice(1)}. Ice perfectly clear. Condensation on glass. Color is accurate to the real fruit — not orange, not generic citrus.`;
    }
  }
  return `Juice color accurate to the fruit named in the product — do NOT use orange or citrus color unless the product is orange juice. Garnish matching the actual fruit. Ice perfectly clear. Condensation on glass.`;
}

function getContainer(lowerName: string, isDrink: boolean): string {
  if (/margarita/.test(lowerName))
    return "a classic wide-rim margarita glass with a half-salted rim, fresh lime wedge perched on the rim, ice visible through the glass";
  if (/cerveza|beer|craft beer/.test(lowerName))
    return "a cold frosted pint glass with a perfectly formed creamy foam head, condensation running down the exterior";
  if (/mezcal/.test(lowerName))
    return "a traditional clay copita (small clay cup) with a vibrant orange slice and sal de gusano in a tiny ceramic dish beside it";
  if (/mojito/.test(lowerName))
    return "a tall highball glass packed with fresh mint leaves, lime wedges, clear ice cubes, with a thin straw";
  if (/wine|vino/.test(lowerName))
    return "a large elegant crystal wine glass, stem visible, held at the base";
  if (/whiskey|bourbon|sour/.test(lowerName))
    return "a heavy-bottomed whiskey rocks glass with a single large clear ice sphere or cube";
  if (/limonada|lemonade/.test(lowerName))
    return "a tall clear highball glass with ice, fresh mint, and a lemon wheel on the rim, condensation visible";
  if (/horchata/.test(lowerName))
    return "a tall clear glass with ice, filled with creamy white horchata, a cinnamon stick resting on the rim";
  if (/smoothie|batido/.test(lowerName))
    return "a tall frosted glass with a paper straw and fresh fruit garnish on the rim";
  if (/agua mineral|sparkling water|water/.test(lowerName))
    return "a clear glass bottle with condensation and a lemon slice beside it on the surface";
  if (/jugo|juice/.test(lowerName)) return getJuiceContainer(lowerName);
  if (/café|coffee|espresso|latte|cappuccino|olla/.test(lowerName))
    return "a beautiful ceramic coffee mug or artisan clay pot, steam gently curling upward";
  if (/tea|té/.test(lowerName))
    return "a delicate ceramic mug or clear glass cup showing the tea color";
  if (/hot chocolate|chocolate caliente/.test(lowerName))
    return "a large ceramic mug topped with a cloud of whipped cream and a dusting of cocoa powder";
  if (
    /steak|ribeye|filete|t-bone|strip|sirloin|porterhouse|wagyu|chulet/.test(
      lowerName,
    )
  )
    return "a matte black or dark ceramic plate, or a thick slate serving stone";
  if (/salmon/.test(lowerName))
    return "a wide white ceramic plate with a generous rim, a lemon wedge and fresh herb to the side";
  if (/shrimp|camarón|langostino/.test(lowerName))
    return "a wide dark ceramic plate or cast iron skillet, a halved lemon beside it";
  if (/lobster|langosta/.test(lowerName))
    return "a large oval white ceramic plate, drawn butter in a small ramekin to the side";
  if (/fish|tilapia|mahi|bass|sea bass|branzino|trucha/.test(lowerName))
    return "a wide white ceramic plate, lemon wedge and fresh herb beside it";
  if (/burger|hamburguesa/.test(lowerName))
    return "a matte black ceramic plate or a rustic wooden board";
  if (/taco/.test(lowerName))
    return "a traditional handcrafted ceramic plate or oval serving tray";
  if (/pizza/.test(lowerName))
    return "a round worn rustic wooden pizza board with a dark grain";
  if (/pasta|fettuccine|alfredo|spaghetti|linguine/.test(lowerName))
    return "a wide shallow white ceramic pasta bowl with a generous rim";
  if (/salad|ensalada|césar|caesar/.test(lowerName))
    return "a wide ceramic salad bowl or large flat white plate";
  if (/sopa|soup/.test(lowerName))
    return "a deep handcrafted ceramic bowl with a wide rim";
  if (
    /pancake|hotcake|waffle|french toast|omelette|huevo|egg|benedict|avena|molletes|chilaquil/.test(
      lowerName,
    )
  )
    return "a round white ceramic breakfast plate with clean edges";
  if (/guacamole/.test(lowerName))
    return "a traditional basalt molcajete (stone mortar bowl) with tortilla chips fanned around it";
  if (/nacho/.test(lowerName))
    return "a large oval ceramic sharing plate with generous portions";
  if (/alita|wing/.test(lowerName))
    return "a ceramic sharing plate lined with natural parchment paper";
  if (/helado|ice.?cream/.test(lowerName))
    return "a chilled ceramic bowl or elegant glass coupe";
  if (/brownie|sundae/.test(lowerName))
    return "a white ceramic plate or deep clear glass bowl";
  if (/churro/.test(lowerName))
    return "a long rectangular ceramic plate, a small cup of dark chocolate dipping sauce beside it";
  if (/flan/.test(lowerName))
    return "a small ceramic ramekin inverted onto a plate, rich caramel sauce pooling around the base";
  if (/cheesecake|pay de queso/.test(lowerName))
    return "a pristine white ceramic dessert plate";
  if (/tiramisu/.test(lowerName))
    return "a rectangular glass dish or elegant ceramic ramekin";
  if (/crème brûlée|creme brulee/.test(lowerName))
    return "a classic white oval ceramic ramekin with a perfectly caramelized sugar top";
  if (isDrink) return "an appropriate premium glass or ceramic mug";
  return "a white ceramic plate";
}

function getLighting(
  category: string | null | undefined,
  isDrink: boolean,
  lowerName: string,
): string {
  if (isDrink) {
    if (category === "Cocktails") {
      return "Single backlight source positioned behind and slightly left of the glass at 30 degrees, creating a luminous translucency glow through the liquid — the liquid appears lit from within. A very soft silver reflector card on the right provides minimal fill, barely lifting the deepest shadow. The background remains in near-darkness. This is the standard lighting for Hendricks, Belvedere, and Patrón advertising campaigns.";
    }
    return "Backlight at 30 degrees behind the glass creating a natural translucency glow through the liquid. Soft reflector fill from the right, about 3 stops underexposed relative to the key. This makes the liquid appear to glow from within — the definitive technique for premium beverage photography.";
  }
  if (
    ["Burgers", "Chicken", "Dinner"].includes(category ?? "") ||
    /steak|ribeye|filete/.test(lowerName)
  ) {
    return "Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the Maillard crust, the crispy skin, the glossy sauce. A black negative fill card on the right deepens shadows for maximum tonal contrast. This is the lighting signature of Lyan van Furth and the standard for Michelin-starred food photography.";
  }
  if (["Desserts", "Breakfast"].includes(category ?? "")) {
    return "Soft diffused north-facing window light — large and even, no harsh shadows, mimicking overcast natural daylight. The light wraps gently around the subject, creating a luminous and inviting mood. A white reflector card on the shadow side fills gently to lift detail without flattening the image. Warm golden cast from the slight golden-hour color temperature.";
  }
  if (["Pizza", "Tacos", "Pasta", "Soups"].includes(category ?? "")) {
    return "Low-angle side light raking across the surface at 20 degrees — this grazing light technique creates micro-shadows in every texture: the crust bubbles, the cheese pulls, the herb leaves, the sauce glistening. A soft fill from the opposite side at 2.5 stops below key preserves shadow detail. This is the lighting that makes textures jump off the page in food editorial.";
  }
  return "Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill. Subtle warm rim backlight separates the subject from the background naturally. Professional three-point setup refined for commercial restaurant photography.";
}

function getFoodStylingDetails(lowerName: string, isDrink: boolean): string {
  if (isDrink) {
    if (/margarita/.test(lowerName))
      return "Half-salted rim perfectly applied. Fresh lime wedge on the rim. Ice clearly visible through the glass. Vibrant lime-green color with natural citrus glow.";
    if (/beer|cerveza/.test(lowerName))
      return "Thick creamy foam head, condensation droplets running down the cold glass exterior, golden amber color glowing from within.";
    if (/mezcal/.test(lowerName))
      return "Clear or amber mezcal in the clay copita. Vibrant fresh orange slice. Sal de gusano in a tiny ceramic dish. Minimal, dignified, artisanal.";
    if (/mojito/.test(lowerName))
      return "Fresh mint leaves pressed vibrantly against the glass. Lime wedge. Perfectly clear ice cubes. Bubbles rising naturally through the liquid.";
    if (/wine|vino/.test(lowerName))
      return "Deep ruby-red wine, legs running down the inside of the glass. Beautiful bokeh in the dark background. Refined and elegant.";
    if (/whiskey|bourbon/.test(lowerName))
      return "Amber whiskey with a single large perfectly clear ice sphere. Orange peel twist garnish, one edge caught by the light.";
    if (/limonada|lemonade/.test(lowerName))
      return "Vibrant yellow liquid, fresh mint leaves, ice cubes perfectly clear, lemon wheel on rim. Condensation on the cold glass exterior.";
    if (/smoothie/.test(lowerName))
      return "Thick vibrant tropical smoothie. Fresh fruit garnish on the rim. Straw at a natural relaxed angle.";
    if (/juice|jugo/.test(lowerName)) return getJuiceStyling(lowerName);
    if (/coffee|café|espresso|latte|cappuccino/.test(lowerName))
      return "Perfect latte art rosette or tulip pattern. Steam rising delicately. Crema golden-brown and smooth. Impeccable barista craft visible.";
    return "Drink fresh, vibrant, and perfectly prepared. Garnish precisely placed. Condensation visible on cold glass. Every detail of the preparation visible.";
  }
  if (/burger|hamburguesa/.test(lowerName))
    return "Every layer perfectly composed: brioche bun with toasted sesame seeds, Maillard-crusted patty with visible char, cheese melting in golden ribbons draping over the sides, vibrant fresh lettuce and bright red tomato. One natural sauce drip at the side — controlled and artful.";
  if (/taco/.test(lowerName))
    return "Taco filling overflowing generously — protein, vibrant salsa, fresh cilantro, white diced onion. Lime wedge bright yellow. Slight char marks on the tortilla. Authentic street food energy.";
  if (/pizza/.test(lowerName))
    return "One slice being lifted — mozzarella cheese stretching in long glossy strands catching the light. Crust golden-brown with char bubbles from a wood-fired oven. Fresh basil leaf vibrant green. Sauce glistening red through the cheese.";
  if (/pasta|alfredo|fettuccine/.test(lowerName))
    return "Pasta twisted into a natural elegant nest. Sauce coating every strand, glistening under the light. Fresh basil leaf. Parmigiano shavings catching the light like flakes of gold. Delicate wisps of steam rising.";
  if (/steak|ribeye|filete/.test(lowerName))
    return "Perfect crosshatch sear marks. Golden-brown Maillard crust with visible texture. Sauce artfully drizzled in a natural pool. Steam rising. Sides arranged with precision. A cut revealing the perfect internal doneness.";
  if (/salmon|shrimp|lobster|seafood/.test(lowerName))
    return "Perfectly cooked seafood glistening with a brush of butter, catching the light. Lemon wedge vibrant yellow. Steam rising. Ocean freshness visible in the color and texture.";
  if (/chicken|pollo|alita|wing/.test(lowerName))
    return "Golden-brown crispy exterior with dramatic char marks. Sauce glistening. Steam rising. The crunch is visible in every texture of the skin.";
  if (/guacamole/.test(lowerName))
    return "Chunky fresh guacamole, diced tomato bright red, vibrant cilantro, lime wedge. Tortilla chips artfully fanned around the molcajete.";
  if (/nacho/.test(lowerName))
    return "Cheese melted and pulling dramatically between chips. Jalapeño slices vibrant green. Guacamole bright fresh green. Pico de gallo vivid red and yellow.";
  if (/ice cream|helado/.test(lowerName))
    return "Scoops perfectly rounded and glistening. Sauce dripping naturally down the sides. Slight condensation on the cold bowl. Colors vivid and rich.";
  if (/brownie/.test(lowerName))
    return "Warm brownie with a cracked top revealing a fudgy interior. Ice cream melting slightly over the warm surface. Chocolate sauce dripping in a controlled artful stream. Whipped cream perfectly swirled.";
  if (/pancake|hotcake/.test(lowerName))
    return "Pancakes stacked with butter melting and pooling on top. Maple syrup dripping naturally down the sides. Fresh berries bright and colorful. Powdered sugar dusting delicate as snow.";
  if (/salad|ensalada/.test(lowerName))
    return "Greens crisp and vibrant, each leaf glistening. Dressing coating every leaf naturally. Parmesan shavings catching the light. Croutons golden-brown with visible texture.";
  return "Food fresh, exquisitely appetizing, and perfectly prepared. Natural textures and deep colors. Steam rising if hot. Professional fine-dining restaurant presentation with artful plating.";
}

// ─── Ingredient analysis (Flash structuring) ─────────────────────────────────

export interface IngredientAnalysis {
  visible_ingredients: string[]; // ingredients that must appear in the photo
  dominant_color: string; // primary color of the dish
  presentation_style: string; // how it's plated/served
  garnish: string; // specific garnish to show
  texture_highlights: string[]; // key textures to render (crispy, melted, etc.)
  avoid: string[]; // things NOT to show based on description
}

/**
 * Uses Gemini Flash to extract structured ingredient data from product name+description.
 * Returns null if Flash is unavailable or description is too short to be useful.
 * Cost: ~$0.0001 per call — only invoked when description.length > 60.
 */
export async function analyzeIngredients(
  productName: string,
  description: string | null | undefined,
  geminiKey: string,
): Promise<IngredientAnalysis | null> {
  if (!description || description.trim().length < 40) return null;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a food photography art director. Analyze this restaurant menu item and extract structured data for a food photo shoot.

Product: "${productName}"
Description: "${description}"

Return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:
{
  "visible_ingredients": ["list of specific ingredients that MUST be visibly identifiable in the photo"],
  "dominant_color": "the main color of the dish as seen in the photo (e.g. 'golden brown', 'deep red', 'bright green')",
  "presentation_style": "how the dish looks when plated (e.g. 'stacked layers', 'sauce-coated', 'arranged in bowl', 'wrapped')",
  "garnish": "specific garnish that should be visible (e.g. 'fresh cilantro leaves', 'lemon wedge', 'none')",
  "texture_highlights": ["2-3 key textures that make this dish look appetizing (e.g. 'crispy crust', 'melted cheese pull', 'glossy sauce')"],
  "avoid": ["things that should NOT appear based on the description (e.g. if it says 'vegan' → avoid dairy; if 'mocktail' → avoid alcohol bottles)"]
}`,
            },
          ],
        },
      ],
    });

    const text =
      (response as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as IngredientAnalysis;

    // Basic validation
    if (!Array.isArray(parsed.visible_ingredients) || !parsed.dominant_color)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Converts IngredientAnalysis into prompt fragments that override generic styling.
 */
export function buildIngredientSection(analysis: IngredientAnalysis): string {
  const parts: string[] = [];

  if (analysis.visible_ingredients.length > 0) {
    parts.push(
      `VISIBLE INGREDIENTS — every one of these MUST be identifiable in the photo: ${analysis.visible_ingredients.join(", ")}.`,
    );
  }
  if (analysis.dominant_color) {
    parts.push(
      `DOMINANT COLOR: The dish is primarily ${analysis.dominant_color} — render this color accurately and vividly.`,
    );
  }
  if (analysis.presentation_style) {
    parts.push(`PRESENTATION: ${analysis.presentation_style}.`);
  }
  if (analysis.garnish && analysis.garnish !== "none") {
    parts.push(
      `GARNISH: ${analysis.garnish} — precisely placed, sharp focus, vibrant.`,
    );
  }
  if (analysis.texture_highlights.length > 0) {
    parts.push(
      `TEXTURE FOCUS: Emphasize ${analysis.texture_highlights.join(", ")} — these are what make this dish irresistible.`,
    );
  }
  if (analysis.avoid.length > 0) {
    parts.push(`DO NOT SHOW: ${analysis.avoid.join(", ")}.`);
  }

  return parts.join("\n");
}

export interface CoherenceResult {
  ok: boolean;
  issues: string[];
  fixedPrompt?: string;
}

/**
 * Pre-generation coherence check (#4).
 * Asks Gemini Flash whether the prompt faithfully represents the product.
 * Returns ok:true (proceed), ok:false + issues (retry with fixedPrompt), or null on error.
 * Only run this on the per-product flow — not in bulk regeneration.
 */
export async function checkPromptCoherence(
  productName: string,
  description: string | null | undefined,
  prompt: string,
  geminiKey: string,
): Promise<CoherenceResult | null> {
  if (!description || description.trim().length < 30)
    return { ok: true, issues: [] };

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a food photography art director reviewing a photo prompt for accuracy.

Product: "${productName}"
Description: "${description}"

Prompt to review (first 800 chars):
${prompt.slice(0, 800)}

Check: does the prompt accurately represent this specific product? Look for:
1. Wrong garnish or wrong fruit (e.g. orange slice on a cranberry juice)
2. Wrong color description (e.g. "golden" for a red product)
3. Wrong container type (e.g. "mug" for a cold drink)
4. Anything in "SERVED IN/ON" or "FOOD STYLING" that contradicts the product name or description

Return ONLY valid JSON (no markdown):
{
  "ok": true or false,
  "issues": ["list any specific inaccuracies found — empty array if ok"],
  "fix": "if not ok, one sentence describing what to correct in the prompt — empty string if ok"
}`,
            },
          ],
        },
      ],
    });

    const text =
      (response as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      ok: boolean;
      issues: string[];
      fix: string;
    };

    if (parsed.ok) return { ok: true, issues: [] };

    // Inject the fix as a hard constraint near the top of the prompt, right after
    // the SUBJECT line — this gives it higher weight than any later container/styling
    // instructions (models weight early context more strongly than trailing overrides).
    const fixedPrompt = parsed.fix
      ? prompt.replace(/^(SUBJECT:.*?\n)/m, `$1CONSTRAINT: ${parsed.fix}\n`)
      : prompt;

    return { ok: false, issues: parsed.issues ?? [], fixedPrompt };
  } catch {
    return null;
  }
}

export function buildFoodPrompt({
  productName,
  description,
  category,
  style,
  cuisine,
  ingredientAnalysis,
}: FoodPromptParams & {
  ingredientAnalysis?: IngredientAnalysis | null;
}): string {
  const lowerName = (productName + " " + (description ?? "")).toLowerCase();
  const isDrink = getIsDrink(category);

  const angleInstruction =
    category && angleMap[category]
      ? angleMap[category]
      : "35-degree hero angle — the universal professional food photography standard";

  const dofInstruction =
    category && dofMap[category]
      ? dofMap[category]
      : "f/2.8 — subject in focus, background gently defocused";

  const surfaceInstruction =
    category && surfaceMap[category]
      ? surfaceMap[category]
      : "clean dark matte restaurant table surface. Background: deep charcoal, smooth and out-of-focus.";

  let effectiveCuisineContext = "";
  if (!isDrink) {
    if (cuisine && cuisine !== "General" && latinCuisineMap[cuisine]) {
      effectiveCuisineContext = latinCuisineMap[cuisine];
    } else if (!cuisine || cuisine === "General") {
      if (
        /taco|burrito|quesadilla|enchilada|pozole|mole|tamale|chilaquil|guacamol|torta/.test(
          lowerName,
        )
      )
        effectiveCuisineContext = latinCuisineMap.Mexican;
      else if (/arepa|bandeja|ajiaco|sancocho/.test(lowerName))
        effectiveCuisineContext = latinCuisineMap.Colombian;
      else if (/ceviche|lomo.?saltado|anticucho/.test(lowerName))
        effectiveCuisineContext = latinCuisineMap.Peruvian;
      else if (/asado|choripán|milanesa|chimichurri/.test(lowerName))
        effectiveCuisineContext = latinCuisineMap.Argentine;
      else if (/pizza|pasta|risotto|carbonara|lasagna|tiramisu/.test(lowerName))
        effectiveCuisineContext = latinCuisineMap.Italian;
      else if (/sushi|ramen|udon|tempura|katsu|miso/.test(lowerName))
        effectiveCuisineContext = latinCuisineMap.Japanese;
    }
  }

  const styleOverride =
    style === "rustic"
      ? "AESTHETIC: Warm rustic feel — reclaimed wood surface with visible knots and grain, golden-hour side lighting casting long warm shadows, aged linen napkin partially visible at the edge of frame. Color temperature very warm (3200K)."
      : style === "modern"
        ? "AESTHETIC: Modern minimalist — matte ceramic vessel on a solid muted background (warm gray or off-white), single shadowless studio softbox overhead, flat-lay or 20-degree overhead angle. Negative space dominant. Color temperature neutral (5000K)."
        : style === "vibrant"
          ? "AESTHETIC: Vibrant editorial — fully saturated colors, hard natural daylight casting sharp defined shadows, high contrast between subject and background, punchy and energetic. Color temperature slightly cool (6000K)."
          : "";

  const container = getContainer(lowerName, isDrink);
  const foodStyling = getFoodStylingDetails(lowerName, isDrink);
  const lighting = getLighting(category, isDrink, lowerName);
  const ingredientSection = ingredientAnalysis
    ? buildIngredientSection(ingredientAnalysis)
    : "";

  return `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth — the world's best food photographer. Every element is deliberate and masterfully composed.

SUBJECT: "${productName}"${description ? ` — ${description}` : ""}.
${ingredientSection ? `${ingredientSection}\n` : ""}SERVED IN/ON: ${container}.
${effectiveCuisineContext ? `PLATING IDENTITY: ${effectiveCuisineContext}` : ""}
CAMERA: 50mm or 85mm prime lens, ${dofInstruction}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: ${angleInstruction}.
COMPOSITION: Square 1:1 frame. Subject CENTERED in the frame — plate/bowl/glass at the geometric center. Subject fills 60-65% of the frame. Negative space distributed evenly on all four sides. SAFE ZONE: all food/drink within the central 80% — outer 10% may be cropped by UI. DO NOT shift the subject left or right — center is mandatory.

SURFACE & SETTING: ${surfaceInstruction}
${styleOverride ? styleOverride : ""}

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black, always depth. Highlights slightly golden, never blown out. High micro-contrast revealing every individual texture detail — condensation droplets, sauce gloss, char marks, herb edges. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural, never over-processed. Subtle vignette darkening the corners by 15% to draw the eye naturally toward the center.

FOOD STYLING: ${foodStyling}`;
}
