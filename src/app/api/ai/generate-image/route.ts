export const dynamic = 'force-dynamic';
export const maxDuration = 180;

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { getEffectivePlanId } from '@/lib/auth/check-plan';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-generate-image');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Plan-based daily limits — Starter: 10/day, Pro: 30/day, Business: 100/day
    const planId = await getEffectivePlanId(tenant.restaurantId);
    const DAILY_LIMITS: Record<string, number> = {
      free: 0,
      starter: 10,
      pro: 30,
      business: 100,
    };
    const dailyLimit = DAILY_LIMITS[planId] ?? 0;

    if (dailyLimit === 0) {
      return NextResponse.json(
        { error: 'La generación de imágenes con IA requiere el plan Starter o superior.' },
        { status: 403 }
      );
    }

    const { allowed: dailyAllowed } = await checkRateLimitAsync(`ai-daily:${tenant.userId}`, { limit: dailyLimit, windowSec: 86400 });
    if (!dailyAllowed) {
      return NextResponse.json(
        { error: `Límite diario de imágenes alcanzado (${dailyLimit}/día). Vuelve mañana o mejora tu plan.` },
        { status: 429 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini AI no está configurado. Agrega GEMINI_API_KEY en las variables de entorno.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { style, cuisine, category, isBanner } = body;

    // Sanitize user-supplied strings before embedding in AI prompts to prevent prompt injection.
    // Strip control characters and limit length — AI models can be manipulated via crafted inputs.
    const sanitizePromptStr = (val: unknown, maxLen: number): string =>
      String(val ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);

    const productName = sanitizePromptStr(body.productName, 120);
    const description = sanitizePromptStr(body.description, 300);

    if (!productName) {
      return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const lowerName = (productName + ' ' + (description ?? '')).toLowerCase();
    const isDrink = ['Beverages', 'Hot drinks', 'Cocktails', 'Drinks'].includes(category ?? '');

    // ─── CATEGORY → HERO ANGLE ───────────────────────────────────────────────
    const angleMap: Record<string, string> = {
      Beverages:    '20-degree tilt showing the full glass profile, condensation droplets, and liquid level — glass silhouette fully visible',
      Drinks:       '20-degree tilt showing the full glass profile, condensation droplets, and liquid level — glass silhouette fully visible',
      'Hot drinks': '22-degree tilt showing the cup rim, latte art surface, and steam curling softly upward',
      Cocktails:    '18-degree tilt showing the glass silhouette, garnish, and ice against a dark background',
      Desserts:     '42-degree angle capturing every layer, drizzle, and topping — all strata clearly visible',
      Breakfast:    '48-degree overhead showing the full plate and vibrant colors of every ingredient',
      Salads:       'overhead flat-lay — all colorful ingredients visible and artfully arranged',
      Pizza:        'overhead flat-lay — full round pizza visible, one slice lifted slightly to show cheese pull',
      Soups:        'overhead flat-lay — bowl centered, garnish floating, wisps of steam rising',
      Tacos:        '28-degree angle — 2-3 tacos arranged naturally, filling generously spilling, all toppings visible',
      Bowls:        '45-degree overhead — all ingredients arranged in sections, beautiful color contrast',
      Burgers:      '35-degree hero angle — every single burger layer visible from the bottom bun to the crown',
      Sandwiches:   '32-degree angle — cross-section visible showing all fillings in perfect layers',
      Chicken:      '30-degree angle — crispy skin texture and golden char fully visible',
      Sushi:        '15-degree tilt — pieces in a diagonal line, rice grain texture and fish color fully visible',
      Pasta:        '38-degree angle — bowl depth, sauce coating every strand, garnish on top',
    };
    const angleInstruction = (category && angleMap[category])
      ? angleMap[category]
      : '35-degree hero angle — the universal professional food photography standard';

    // ─── CATEGORY → DoF (aperture) ───────────────────────────────────────────
    const dofMap: Record<string, string> = {
      Beverages:    'f/2.0 — creamy bokeh behind the glass, full glass perfectly in focus',
      Drinks:       'f/2.0 — creamy bokeh behind the glass, full glass perfectly in focus',
      Cocktails:    'f/2.0 — deep bokeh, glass sharp from base to garnish',
      'Hot drinks': 'f/2.2 — cup sharp, steam trails softly defocused at tips',
      Burgers:      'f/3.2 — entire burger stack in focus from bottom bun to crown',
      Sandwiches:   'f/3.5 — all layers sharp in cross-section',
      Chicken:      'f/3.5 — full piece in focus, surface texture razor-sharp',
      Pizza:        'f/5.6 — full pizza in sharp focus, every topping crystal clear',
      Salads:       'f/5.6 — all ingredients in sharp focus overhead',
      Soups:        'f/4.0 — bowl sharp, garnish in focus, slight defocus at bowl edge',
      Pasta:        'f/2.8 — pasta in focus, background gently defocused',
      Desserts:     'f/2.8 — hero layer sharp, slight defocus on edges',
      Breakfast:    'f/3.5 — entire plate in focus, every ingredient crisp',
      Tacos:        'f/3.2 — all tacos in focus, fillings razor-sharp',
      Bowls:        'f/4.0 — all ingredient sections in clear focus',
    };
    const dofInstruction = (category && dofMap[category])
      ? dofMap[category]
      : 'f/2.8 — subject in focus, background gently defocused';

    // ─── CATEGORY → CONTAINER (what the food/drink is IN or ON) ─────────────
    const getContainer = (): string => {
      if (/margarita/.test(lowerName)) return 'a classic wide-rim margarita glass with a half-salted rim, fresh lime wedge perched on the rim, ice visible through the glass';
      if (/cerveza|beer|craft beer/.test(lowerName)) return 'a cold frosted pint glass with a perfectly formed creamy foam head, condensation running down the exterior';
      if (/mezcal/.test(lowerName)) return 'a traditional clay copita (small clay cup) with a vibrant orange slice and sal de gusano in a tiny ceramic dish beside it';
      if (/mojito/.test(lowerName)) return 'a tall highball glass packed with fresh mint leaves, lime wedges, clear ice cubes, with a thin straw';
      if (/wine|vino/.test(lowerName)) return 'a large elegant crystal wine glass, stem visible, held at the base';
      if (/whiskey|bourbon|sour/.test(lowerName)) return 'a heavy-bottomed whiskey rocks glass with a single large clear ice sphere or cube';
      if (/limonada|lemonade/.test(lowerName)) return 'a tall clear highball glass with ice, fresh mint, and a lemon wheel on the rim, condensation visible';
      if (/horchata/.test(lowerName)) return 'a tall clear glass with ice, filled with creamy white horchata, a cinnamon stick resting on the rim';
      if (/smoothie|batido/.test(lowerName)) return 'a tall frosted glass with a paper straw and fresh fruit garnish on the rim';
      if (/agua mineral|sparkling water|water/.test(lowerName)) return 'a clear glass bottle with condensation and a lemon slice beside it on the surface';
      if (/apple|manzana/.test(lowerName)) return 'a tall clear glass filled with crisp pale golden-green apple juice, clear ice cubes, a thin green APPLE slice perched on the rim — NOT lime, NOT lemon, NOT orange, ONLY apple garnish';
      if (/watermelon|sand[íi]a/.test(lowerName)) return 'a tall clear glass filled with vibrant deep pink-red watermelon juice, fresh mint leaves on top, no citrus';
      if (/mango/.test(lowerName)) return 'a tall clear glass filled with thick rich golden-yellow mango juice, a fresh mango slice on the rim';
      if (/pi[ñn]a|pineapple/.test(lowerName)) return 'a tall clear glass filled with bright golden-yellow pineapple juice, a pineapple wedge on the rim';
      if (/fresa|strawberry/.test(lowerName)) return 'a tall clear glass filled with vibrant deep pink-red strawberry juice, a fresh strawberry on the rim';
      if (/zanahoria|carrot/.test(lowerName)) return 'a tall clear glass filled with bright orange carrot juice, a carrot stick beside it';
      if (/guanabana|tamarindo|maracuy[áa]|passion.?fruit|guava|guayaba/.test(lowerName)) return 'a tall clear glass filled with tropical juice, garnish of the matching fruit on the rim';
      if (/jugo|juice|naranja|orange/.test(lowerName)) return 'a chilled clear glass filled with freshly squeezed vibrant orange juice, a citrus orange slice on the rim';
      if (/café|coffee|espresso|latte|cappuccino|olla/.test(lowerName)) return 'a beautiful ceramic coffee mug or artisan clay pot, steam gently curling upward';
      if (/tea|té/.test(lowerName)) return 'a delicate ceramic mug or clear glass cup showing the tea color';
      if (/hot chocolate|chocolate caliente/.test(lowerName)) return 'a large ceramic mug topped with a cloud of whipped cream and a dusting of cocoa powder';
      if (/burger|hamburguesa/.test(lowerName)) return 'a matte black ceramic plate or a rustic wooden board';
      if (/taco/.test(lowerName)) return 'a traditional handcrafted ceramic plate or oval serving tray';
      if (/pizza/.test(lowerName)) return 'a round worn rustic wooden pizza board with a dark grain';
      if (/pasta|fettuccine|alfredo|spaghetti|linguine/.test(lowerName)) return 'a wide shallow white ceramic pasta bowl with a generous rim';
      if (/salad|ensalada|césar|caesar/.test(lowerName)) return 'a wide ceramic salad bowl or large flat white plate';
      if (/sopa|soup/.test(lowerName)) return 'a deep handcrafted ceramic bowl with a wide rim';
      if (/pancake|hotcake|waffle|french toast|omelette|huevo|egg|benedict|avena|molletes|chilaquil/.test(lowerName)) return 'a round white ceramic breakfast plate with clean edges';
      if (/guacamole/.test(lowerName)) return 'a traditional basalt molcajete (stone mortar bowl) with tortilla chips fanned around it';
      if (/nacho/.test(lowerName)) return 'a large oval ceramic sharing plate with generous portions';
      if (/alita|wing/.test(lowerName)) return 'a ceramic sharing plate lined with natural parchment paper';
      if (/helado|ice.?cream/.test(lowerName)) return 'a chilled ceramic bowl or elegant glass coupe';
      if (/brownie|sundae/.test(lowerName)) return 'a white ceramic plate or deep clear glass bowl';
      if (/churro/.test(lowerName)) return 'a long rectangular ceramic plate, a small cup of dark chocolate dipping sauce beside it';
      if (/flan/.test(lowerName)) return 'a small ceramic ramekin inverted onto a plate, rich caramel sauce pooling around the base';
      if (/cheesecake|pay de queso/.test(lowerName)) return 'a pristine white ceramic dessert plate';
      if (/tiramisu/.test(lowerName)) return 'a rectangular glass dish or elegant ceramic ramekin';
      if (/crème brûlée|creme brulee/.test(lowerName)) return 'a classic white oval ceramic ramekin with a perfectly caramelized sugar top';
      if (isDrink) return 'an appropriate premium glass or ceramic mug';
      return 'a white ceramic plate';
    };

    // ─── CATEGORY → SURFACE & BACKGROUND ─────────────────────────────────────
    const surfaceMap: Record<string, string> = {
      Beverages:    'polished dark basalt stone bar counter, surface has subtle dark grain texture. Background: deep out-of-focus dark charcoal, smooth and featureless. No props, no food, no plates around.',
      Drinks:       'polished dark basalt stone bar counter, surface has subtle dark grain texture. Background: deep out-of-focus dark charcoal, smooth and featureless.',
      'Hot drinks': 'warm light oak wood table surface with visible wood grain. A thin ceramic saucer underneath the cup. Background: soft warm cream out-of-focus.',
      Cocktails:    'sleek dark honed marble bar counter with subtle veining. One carefully folded linen cocktail napkin to the side. Background: deep out-of-focus black.',
      Burgers:      'matte dark slate stone surface, rough texture. Background: deep matte charcoal. No extra props.',
      Chicken:      'matte black ceramic tile surface. Background: deep charcoal. No extra props.',
      Pizza:        'worn rustic wood board on a rough dark stone surface. Background: warm dark wood tones.',
      Tacos:        'warm terracotta ceramic surface with a small natural woven cloth underneath. Background: warm earth tones.',
      Desserts:     'white Carrara marble surface with soft gray veining. Background: elegant soft gray, barely perceptible.',
      Salads:       'clean white marble surface. Background: bright soft natural light, airy white.',
      Soups:        'dark slate or matte ceramic tile surface. Background: deep warm moody charcoal.',
      Pasta:        'white linen cloth draped over a wooden restaurant table. Background: warm ambient restaurant.',
      Breakfast:    'light oak wood breakfast table with fine wood grain. Background: soft warm morning light.',
      Dinner:       'polished dark slate restaurant surface. Background: deep charcoal.',
      Appetizers:   'rustic wooden serving board or dark ceramic tile. Background: warm dark tones.',
      Sandwiches:   'rustic weathered wooden board. Background: warm natural ambient.',
    };
    const surfaceInstruction = (category && surfaceMap[category])
      ? surfaceMap[category]
      : 'clean dark matte restaurant table surface. Background: deep charcoal, smooth and out-of-focus.';

    // ─── CATEGORY → LIGHTING (Rembrandt / Chiaroscuro by category) ───────────
    const getLighting = (): string => {
      if (isDrink) {
        if (['Cocktails'].includes(category ?? '')) {
          return 'Single backlight source positioned behind and slightly left of the glass at 30 degrees, creating a luminous translucency glow through the liquid — the liquid appears lit from within. A very soft silver reflector card on the right provides minimal fill, barely lifting the deepest shadow. The background remains in near-darkness. This is the standard lighting for Hendricks, Belvedere, and Patrón advertising campaigns.';
        }
        return 'Backlight at 30 degrees behind the glass creating a natural translucency glow through the liquid. Soft reflector fill from the right, about 3 stops underexposed relative to the key. This makes the liquid appear to glow from within — the definitive technique for premium beverage photography.';
      }
      if (['Burgers', 'Chicken', 'Dinner'].includes(category ?? '') || /steak|ribeye|filete/.test(lowerName)) {
        return 'Single hard key light from the left at 45 degrees — no softbox, just a focused directional light that creates dramatic shadows revealing every texture: the Maillard crust, the crispy skin, the glossy sauce. A black negative fill card on the right deepens shadows for maximum tonal contrast. This is the lighting signature of Lyan van Furth and the standard for Michelin-starred food photography.';
      }
      if (['Desserts', 'Breakfast'].includes(category ?? '')) {
        return 'Soft diffused north-facing window light — large and even, no harsh shadows, mimicking overcast natural daylight. The light wraps gently around the subject, creating a luminous and inviting mood. A white reflector card on the shadow side fills gently to lift detail without flattening the image. Warm golden cast from the slight golden-hour color temperature.';
      }
      if (['Pizza', 'Tacos', 'Pasta', 'Soups'].includes(category ?? '')) {
        return 'Low-angle side light raking across the surface at 20 degrees — this grazing light technique creates micro-shadows in every texture: the crust bubbles, the cheese pulls, the herb leaves, the sauce glistening. A soft fill from the opposite side at 2.5 stops below key preserves shadow detail. This is the lighting that makes textures jump off the page in food editorial.';
      }
      return 'Large octabox key light positioned left at 45 degrees, diffused and soft. A silver reflector card on the right at 2 stops below key provides gentle fill. Subtle warm rim backlight separates the subject from the background naturally. Professional three-point setup refined for commercial restaurant photography.';
    };

    // ─── FOOD STYLING ─────────────────────────────────────────────────────────
    const getFoodStylingDetails = (): string => {
      if (isDrink) {
        if (/margarita/.test(lowerName)) return 'Half-salted rim perfectly applied. Fresh lime wedge on the rim. Ice clearly visible through the glass. Vibrant lime-green color with natural citrus glow.';
        if (/beer|cerveza/.test(lowerName)) return 'Thick creamy foam head, condensation droplets running down the cold glass exterior, golden amber color glowing from within.';
        if (/mezcal/.test(lowerName)) return 'Clear or amber mezcal in the clay copita. Vibrant fresh orange slice. Sal de gusano in a tiny ceramic dish. Minimal, dignified, artisanal.';
        if (/mojito/.test(lowerName)) return 'Fresh mint leaves pressed vibrantly against the glass. Lime wedge. Perfectly clear ice cubes. Bubbles rising naturally through the liquid.';
        if (/wine|vino/.test(lowerName)) return 'Deep ruby-red wine, legs running down the inside of the glass. Beautiful bokeh in the dark background. Refined and elegant.';
        if (/whiskey|bourbon/.test(lowerName)) return 'Amber whiskey with a single large perfectly clear ice sphere. Orange peel twist garnish, one edge caught by the light.';
        if (/limonada|lemonade/.test(lowerName)) return 'Vibrant yellow liquid, fresh mint leaves, ice cubes perfectly clear, lemon wheel on rim. Condensation on the cold glass exterior.';
        if (/smoothie/.test(lowerName)) return 'Thick vibrant tropical smoothie. Fresh fruit garnish on the rim. Straw at a natural relaxed angle.';
        if (/apple|manzana/.test(lowerName)) return 'APPLE JUICE — pale golden-green color, crystal clear. Green APPLE slice on the rim — NOT lime, NOT lemon, NOT citrus, ONLY apple. Ice perfectly clear. Condensation on glass. The liquid is pale golden-green, NOT orange, NOT yellow — distinctly apple juice.';
        if (/watermelon|sand[íi]a/.test(lowerName)) return 'Deep vibrant pink-red watermelon juice color. Fresh mint leaves. No citrus. Refreshing summer feel.';
        if (/mango/.test(lowerName)) return 'Thick rich golden-yellow mango juice, tropical and vibrant. Mango slice garnish.';
        if (/pi[ñn]a|pineapple/.test(lowerName)) return 'Bright golden-yellow pineapple juice. Pineapple wedge on rim. Tropical freshness.';
        if (/fresa|strawberry/.test(lowerName)) return 'Vibrant deep pink-red strawberry juice. Fresh strawberry on rim. Sweet and fresh.';
        if (/zanahoria|carrot/.test(lowerName)) return 'Bright vivid orange carrot juice. Carrot stick garnish. Earthy and fresh.';
        if (/juice|jugo/.test(lowerName)) return 'Bright vibrant freshly squeezed orange-citrus color. Citrus slice on the rim. Natural pulp visible. Condensation on the cold glass.';
        if (/coffee|café|espresso|latte|cappuccino/.test(lowerName)) return 'Perfect latte art rosette or tulip pattern. Steam rising delicately. Crema golden-brown and smooth. Impeccable barista craft visible.';
        return 'Drink fresh, vibrant, and perfectly prepared. Garnish precisely placed. Condensation visible on cold glass. Every detail of the preparation visible.';
      }
      if (/omelette|omelet|tortilla francesa/.test(lowerName)) return 'Classic folded omelette in a half-moon or tri-fold shape — pale yellow buttery exterior, slightly browned in spots, slightly glossy. Filling clearly visible spilling from the open side — every ingredient from the description must be identifiable and recognizable (proteins, vegetables, cheese melting). Steam wisps rising. Side accompaniments (potatoes, toast, fruit, etc.) plated alongside the omelette as described, never on top. Garnish of fresh herbs. Always a real cooked egg dish — never a burger, never a flat pancake.';
      if (/huevos? benedict|benedictinos/.test(lowerName)) return 'Two perfectly poached eggs on English muffin halves with Canadian bacon or ham, blanketed in glossy hollandaise sauce dripping naturally. The yolk must be visibly runny in the cross-section — golden orange. Chives sprinkled on top. Sides plated next to it.';
      if (/huevos? rancheros/.test(lowerName)) return 'Two sunny-side-up fried eggs with vibrant orange-yellow yolks, on warm corn tortillas, smothered in red ranchera salsa. Refried beans, queso fresco crumbled, cilantro, avocado slices on the side.';
      if (/chilaquiles/.test(lowerName)) return 'Crispy tortilla chips coated in red or green salsa, topped with crema, queso fresco crumbled, sliced onion, cilantro. Two fried eggs on top with bright orange-yellow yolks. Avocado slices on the side.';
      if (/pancake|hotcake/.test(lowerName)) return 'Stack of 3 fluffy golden-brown pancakes with butter pat melting and pooling on top. Maple syrup dripping naturally down the sides forming a small pool. Fresh berries bright and colorful on top. Powdered sugar dusting delicate as snow.';
      if (/waffle/.test(lowerName)) return 'Golden-brown Belgian waffle with deep crispy squares, butter pat melting in a pocket, maple syrup pooling, fresh berries on top, powdered sugar dusting. Whipped cream cloud on the side.';
      if (/french toast|tostada francesa/.test(lowerName)) return 'Thick slices of golden-brown French toast with crisp edges, dusted with powdered sugar, maple syrup dripping. Fresh berries and a butter pat melting on top.';
      if (/burger|hamburguesa/.test(lowerName)) return 'Every layer perfectly composed: brioche bun with toasted sesame seeds, Maillard-crusted patty with visible char, cheese melting in golden ribbons draping over the sides, vibrant fresh lettuce and bright red tomato. One natural sauce drip at the side — controlled and artful.';
      if (/taco/.test(lowerName)) return 'Taco filling overflowing generously — protein, vibrant salsa, fresh cilantro, white diced onion. Lime wedge bright yellow. Slight char marks on the tortilla. Authentic street food energy.';
      if (/pizza/.test(lowerName)) return 'One slice being lifted — mozzarella cheese stretching in long glossy strands catching the light. Crust golden-brown with char bubbles from a wood-fired oven. Fresh basil leaf vibrant green. Sauce glistening red through the cheese.';
      if (/pasta|alfredo|fettuccine/.test(lowerName)) return 'Pasta twisted into a natural elegant nest. Sauce coating every strand, glistening under the light. Fresh basil leaf. Parmigiano shavings catching the light like flakes of gold. Delicate wisps of steam rising.';
      if (/steak|ribeye|filete/.test(lowerName)) return 'Perfect crosshatch sear marks. Golden-brown Maillard crust with visible texture. Sauce artfully drizzled in a natural pool. Steam rising. Sides arranged with precision. A cut revealing the perfect internal doneness.';
      if (/salmon|shrimp|lobster|seafood/.test(lowerName)) return 'Perfectly cooked seafood glistening with a brush of butter, catching the light. Lemon wedge vibrant yellow. Steam rising. Ocean freshness visible in the color and texture.';
      if (/chicken|pollo|alita|wing/.test(lowerName)) return 'Golden-brown crispy exterior with dramatic char marks. Sauce glistening. Steam rising. The crunch is visible in every texture of the skin.';
      if (/guacamole/.test(lowerName)) return 'Chunky fresh guacamole, diced tomato bright red, vibrant cilantro, lime wedge. Tortilla chips artfully fanned around the molcajete.';
      if (/nacho/.test(lowerName)) return 'Cheese melted and pulling dramatically between chips. Jalapeño slices vibrant green. Guacamole bright fresh green. Pico de gallo vivid red and yellow.';
      if (/ice cream|helado/.test(lowerName)) return 'Scoops perfectly rounded and glistening. Sauce dripping naturally down the sides. Slight condensation on the cold bowl. Colors vivid and rich.';
      if (/brownie/.test(lowerName)) return 'Warm brownie with a cracked top revealing a fudgy interior. Ice cream melting slightly over the warm surface. Chocolate sauce dripping in a controlled artful stream. Whipped cream perfectly swirled.';
      if (/salad|ensalada/.test(lowerName)) return 'Greens crisp and vibrant, each leaf glistening. Dressing coating every leaf naturally. Parmesan shavings catching the light. Croutons golden-brown with visible texture.';
      return 'Food fresh, exquisitely appetizing, and perfectly prepared. Natural textures and deep colors. Steam rising if hot. Professional fine-dining restaurant presentation with artful plating.';
    };

    // ─── CUISINE CONTEXT (suppressed for drinks) ──────────────────────────────
    const latinCuisineMap: Record<string, string> = {
      Mexican:    'Served on a rustic clay or hand-painted Talavera ceramic plate. Warm terracotta tones. Cilantro, lime wedge, and vibrant salsa as natural garnishes.',
      Colombian:  'Colorful hand-painted ceramic plate. Hogao sauce, fresh herbs visible. Warm and hearty presentation.',
      Peruvian:   'Modern fine-dining plate. Aji amarillo sauce drizzle, purple corn, potato, and microgreens arranged with precision.',
      Argentine:  'Rustic wooden board. Visible char marks from the grill, chimichurri sauce in a small clay dish on the side, fresh lemon wedge.',
      Venezuelan: 'Colorful ceramic plate. Melted cheese, black beans, shredded beef. Sweet plantains as vibrant garnish.',
      Brazilian:  'Bright ceramic plate. Black beans, white rice, crispy farofa, orange slices arranged with color contrast.',
      Spanish:    'White ceramic. Saffron golden color, olive oil drizzle, smoked paprika dust, elegant simplicity.',
      Italian:    'White ceramic plate. Fresh basil leaf, high-quality olive oil drizzle, Parmigiano Reggiano shavings.',
      Japanese:   'Black lacquer or minimalist white ceramic. Wasabi and pickled ginger with precision. Clean geometric presentation.',
      American:   'White ceramic plate or rustic wooden board. Generous portion, crispy edges, casual fine-dining presentation.',
      Chinese:    'Blue-and-white porcelain bowl. Steaming broth, chopsticks resting at the edge.',
    };

    let effectiveCuisineContext = '';
    if (!isDrink) {
      if (cuisine && cuisine !== 'General' && latinCuisineMap[cuisine]) {
        effectiveCuisineContext = latinCuisineMap[cuisine];
      } else if (!cuisine || cuisine === 'General') {
        if (/taco|burrito|quesadilla|enchilada|pozole|mole|tamale|chilaquil|guacamol|torta/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Mexican;
        else if (/arepa|bandeja|ajiaco|sancocho/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Colombian;
        else if (/ceviche|lomo.?saltado|anticucho/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Peruvian;
        else if (/asado|choripán|milanesa|chimichurri/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Argentine;
        else if (/pizza|pasta|risotto|carbonara|lasagna|tiramisu/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Italian;
        else if (/sushi|ramen|udon|tempura|katsu|miso/.test(lowerName)) effectiveCuisineContext = latinCuisineMap.Japanese;
      }
    }

    // ─── STYLE OVERRIDE ───────────────────────────────────────────────────────
    const styleOverride = style === 'rustic'
      ? 'AESTHETIC: Warm rustic feel — reclaimed wood surface with visible knots and grain, golden-hour side lighting casting long warm shadows, aged linen napkin partially visible at the edge of frame. Color temperature very warm (3200K).'
      : style === 'modern'
        ? 'AESTHETIC: Modern minimalist — matte ceramic vessel on a solid muted background (warm gray or off-white), single shadowless studio softbox overhead, flat-lay or 20-degree overhead angle. Negative space dominant. Color temperature neutral (5000K).'
        : style === 'vibrant'
          ? 'AESTHETIC: Vibrant editorial — fully saturated colors, hard natural daylight casting sharp defined shadows, high contrast between subject and background, punchy and energetic. Color temperature slightly cool (6000K).'
          : '';

    // ─── BUILD THE FINAL PROMPT ───────────────────────────────────────────────
    const container = getContainer();
    const foodStyling = getFoodStylingDetails();
    const lighting = getLighting();

    // ─── BANNER MODE ──────────────────────────────────────────────────────────
    const bannerPrompt = isBanner ? `CRITICAL RULES — strictly enforce: NOT CGI, NOT 3D render, NOT illustration. NO text, NO logos, NO watermarks, NO white patches or artifacts in any corner, NO human hands, NO cooking equipment. Every corner filled with background — no blank white areas.

Award-winning wide-format restaurant banner photograph. Indistinguishable from a professional DSLR photograph. Shot in a real restaurant or professional food photography studio.

RESTAURANT: "${productName}"${description ? ` — ${description}` : ''}.
${effectiveCuisineContext ? `CUISINE IDENTITY: ${effectiveCuisineContext}` : ''}

COMPOSITION: Wide 16:9 horizontal banner. Multiple dishes or food elements spread naturally across the frame. Beautiful layered table scene. Generous empty space on the left third for potential text overlay. Depth of field with bokeh on background elements.

CAMERA: 35mm wide lens, f/4 aperture, ISO 640 — cinematic look with natural film grain.

LIGHTING: Warm inviting restaurant ambiance. Soft directional key light from the left at 45 degrees, gentle fill from the right. Golden tones with warm color temperature (3400K). Appetizing and welcoming mood.

SCENE: Beautifully plated dishes on a restaurant table. Natural textures — linen napkins, wooden table, handcrafted ceramic plates. Candle light or golden-hour window light visible in background.

COLOR SCIENCE: Rich warm tonal depth. Deep shadows with warm amber undertones — not pure black. Highlights golden and inviting. Film-like color rendering, naturally saturated.` : null;

    const prompt = bannerPrompt ?? `CRITICAL RULES — strictly enforce, no exceptions:
- NOT CGI, NOT 3D render, NOT illustration, NOT AI-generated look
- NO text of any kind, NO logos, NO watermarks, NO stamps, NO labels, NO captions
- NO white patches, NO white spots, NO bright artifacts, NO digital noise in any corner
- NO dark patches, NO dark shadows, NO dark blobs, NO vignette in corners — corners must be visible and filled
- NO human hands, NO cooking equipment, NO utensils in frame
- Every corner filled with natural background — NO blank areas, NO darkness, NO undefined shapes

This is an award-winning commercial food photograph in the style of Lyan van Furth or Eric Wolfinger — the world's finest food photographers. Every pixel is intentional, every corner covered with rich background texture.

SUBJECT: "${productName}".
${description ? `INGREDIENTS — every ingredient listed here MUST be visibly identifiable in the photograph, accurately depicted (no substitutions, no missing items): ${description}` : ''}
SERVED IN/ON: ${container}.
${effectiveCuisineContext ? `PLATING IDENTITY: ${effectiveCuisineContext}` : ''}

CAMERA: 50mm or 85mm prime lens, ${dofInstruction}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: ${angleInstruction}.
COMPOSITION: 4:3 horizontal frame. Subject CENTERED horizontally and vertically — the dish/glass must be in the middle of the frame, NOT pushed to any side. Subject fills 60-70% of the frame for balanced presentation. SAFE ZONE: all food/drink within the central 75% — outer 12.5% margin all around must contain only background/surface, never the subject.

SURFACE & SETTING: ${surfaceInstruction}
${styleOverride ? styleOverride : ''}

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black, always depth. Highlights slightly golden, never blown out. High micro-contrast revealing every individual texture detail — condensation droplets, sauce gloss, char marks, herb edges. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural, never over-processed. NO vignette — corners must be as bright and defined as the center.

FOOD STYLING: ${foodStyling}`;

    const aspectRatio = isBanner ? '16:9' : '4:3';

    // ─── FETCH STYLE ANCHOR (own → master fallback) ──────────────────────────
    let anchorBase64: string | null = null;
    let anchorSource: 'restaurant' | 'master' | null = null;
    if (!isBanner && category) {
      const adminSupabase = createAdminClient();
      let anchorUrl: string | null = null;

      // 1) Restaurant-specific anchor takes priority
      try {
        const { data: ownAnchor } = await adminSupabase
          .from('style_anchors')
          .select('anchor_url')
          .eq('restaurant_id', tenant.restaurantId)
          .eq('category_name', category)
          .maybeSingle();
        if (ownAnchor?.anchor_url) {
          anchorUrl = ownAnchor.anchor_url;
          anchorSource = 'restaurant';
        }
      } catch (ownErr) {
        logger.warn('Failed to query own style anchor', {
          error: ownErr instanceof Error ? ownErr.message : String(ownErr),
        });
      }

      // 2) Fallback: master anchor matched by alias
      if (!anchorUrl) {
        try {
          const { findMasterAnchor } = await import('@/lib/anchors/master-anchors');
          const master = await findMasterAnchor(adminSupabase, category);
          if (master?.anchor_url) {
            anchorUrl = master.anchor_url;
            anchorSource = 'master';
            logger.info('Using master anchor fallback', {
              restaurantId: tenant.restaurantId,
              category,
              masterSlug: master.category_slug,
            });
          }
        } catch (masterErr) {
          logger.warn('Failed to query master style anchor', {
            error: masterErr instanceof Error ? masterErr.message : String(masterErr),
          });
        }
      }

      // 3) Download anchor image if we have a URL
      if (anchorUrl) {
        try {
          const anchorRes = await fetch(anchorUrl, { signal: AbortSignal.timeout(8000) });
          if (anchorRes.ok) {
            const anchorBuffer = await anchorRes.arrayBuffer();
            anchorBase64 = Buffer.from(anchorBuffer).toString('base64');
            logger.info('Style anchor loaded', {
              restaurantId: tenant.restaurantId,
              category,
              source: anchorSource,
            });
          }
        } catch (downloadErr) {
          logger.warn('Failed to download style anchor, generating without reference', {
            error: downloadErr instanceof Error ? downloadErr.message : String(downloadErr),
          });
          anchorSource = null;
        }
      }
    }

    // ─── ANCHOR PROMPT (when reference image is available) ───────────────────
    const anchorPrompt = anchorBase64 ? `STYLE REFERENCE: The reference image above is the approved visual style anchor for the "${category}" category of this restaurant. You MUST match EXACTLY:
- The background material, color, texture, and depth of field
- The lighting direction, color temperature, shadow depth, and intensity
- The camera angle and overall composition style
- The color grading, mood, and tonal quality

CRITICAL — the SUBJECT must change completely to: "${productName}".
${description ? `INGREDIENTS — these must be VISIBLY identifiable in the new photograph, faithfully depicted with no substitutions: ${description}` : ''}

Served in/on: ${container}.
${foodStyling}

COMPOSITION: Subject CENTERED in the frame, balanced, occupying 60-70% of the width. Outer 12.5% margin all around must show only background/surface, never the subject. Do NOT shift the dish to the right, left, top or bottom.

Keep everything else — surface, lighting, background, atmosphere — pixel-perfect consistent with the reference, but NEVER copy the food itself from the reference. The food must be the new subject described above.` : null;

    // ─── PRIMARY: fal.ai flux-pro/v1.1 — single image, fast ─────────────────
    let imageBase64: string | null = null;
    let engine = 'gemini';
    const mimeType = 'image/jpeg';

    const falKey = process.env.FAL_API_KEY;
    if (falKey) {
      try {
        const { fal } = await import('@fal-ai/client');
        fal.config({ credentials: falKey });

        let falImageUrl: string | null = null;

        if (anchorBase64) {
          // flux-pro/kontext: image-aware generation using the style anchor as reference
          const kontextResult = await (fal as any).subscribe('fal-ai/flux-pro/kontext', {
            input: {
              prompt: anchorPrompt ?? prompt,
              image_url: `data:image/jpeg;base64,${anchorBase64}`,
              num_images: 1,
              output_format: 'jpeg',
              guidance_scale: 3.5,
            },
          });
          falImageUrl =
            (kontextResult as any)?.data?.images?.[0]?.url ??
            (kontextResult as any)?.images?.[0]?.url ??
            null;
        } else {
          // flux-pro/v1.1-ultra: improved architecture with fewer corner artifacts
          const v1Result = await (fal as any).subscribe('fal-ai/flux-pro/v1.1-ultra', {
            input: {
              prompt,
              aspect_ratio: isBanner ? '16:9' : '4:3',
              num_inference_steps: 28,
              guidance_scale: 3.5,
              num_images: 1,
              output_format: 'jpeg',
              safety_tolerance: '5',
            },
          });
          falImageUrl =
            (v1Result as any)?.data?.images?.[0]?.url ??
            (v1Result as any)?.images?.[0]?.url ??
            null;
        }

        if (falImageUrl) {
          const res = await fetch(falImageUrl, { signal: AbortSignal.timeout(30000) });
          if (res.ok) {
            imageBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
            engine = 'fal-ai';
          }
        }
      } catch (falErr) {
        logger.warn('fal.ai failed, falling back to Gemini', {
          error: falErr instanceof Error ? falErr.message : String(falErr),
        });
      }
    }

    // ─── FALLBACK: Gemini 3 Pro (when fal.ai unavailable or failed) ──────────
    if (!imageBase64) {
      try {
        const useAnchor = anchorBase64 && anchorPrompt && !falKey;
        const contents: object[] = useAnchor
          ? [{ role: 'user', parts: [{ inlineData: { mimeType, data: anchorBase64 } }, { text: anchorPrompt }] }]
          : [{ role: 'user', parts: [{ text: prompt }] }];

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents,
          config: {
            responseModalities: ['TEXT', 'IMAGE'] as any,
            imageConfig: { aspectRatio } as any,
          } as any,
        });
        const parts = (response as any).candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            engine = 'gemini-3-pro';
            break;
          }
        }
      } catch (primaryErr) {
        logger.warn('gemini-3-pro-image-preview failed', {
          error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
        });
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No se pudo generar la imagen. Intenta con una descripción diferente.' },
        { status: 422 }
      );
    }

    const rawBuffer = Buffer.from(imageBase64, 'base64');

    // Optimize AI-generated image the same way manual uploads are processed:
    // resize to max 1200×1200, convert to WebP at quality 82.
    const sharp = (await import('sharp')).default;
    sharp.simd(true);
    const os = await import('os');
    const cpuCount = os.cpus().length;
    sharp.concurrency(Math.max(2, Math.min(cpuCount, 4)));

    // ─── DETECT + REMOVE WHITE/BRIGHT CORNER ARTIFACTS ─────────────────────
    // Some AI models leave bright/white patches in image corners. We sample
    // each corner (8% × 8% region) and check the mean brightness. If a corner
    // is significantly brighter than the rest of the image, we crop inward
    // by ~4% to eliminate the artifact before the final resize.
    let preprocessed = sharp(rawBuffer);
    try {
      const meta = await preprocessed.metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w > 200 && h > 200) {
        const sampleW = Math.floor(w * 0.08);
        const sampleH = Math.floor(h * 0.08);
        const corners = [
          { left: 0, top: 0 },
          { left: w - sampleW, top: 0 },
          { left: 0, top: h - sampleH },
          { left: w - sampleW, top: h - sampleH },
        ];
        const cornerMeans = await Promise.all(
          corners.map(async (c) =>
            sharp(rawBuffer)
              .extract({ left: c.left, top: c.top, width: sampleW, height: sampleH })
              .greyscale()
              .stats()
              .then((s) => s.channels[0]?.mean ?? 0)
              .catch(() => 0),
          ),
        );
        // Sample image center (40% × 40%) for comparison
        const cx = Math.floor(w * 0.3);
        const cy = Math.floor(h * 0.3);
        const cw = Math.floor(w * 0.4);
        const ch = Math.floor(h * 0.4);
        const centerStats = await sharp(rawBuffer)
          .extract({ left: cx, top: cy, width: cw, height: ch })
          .greyscale()
          .stats()
          .catch(() => null);
        const centerMean = centerStats?.channels[0]?.mean ?? 128;

        // If ANY corner is >220 brightness (near-white) AND substantially
        // brighter than center (> +50), crop ~4% off all sides to remove it.
        const hasWhiteCorner = cornerMeans.some((m) => m > 220 && m - centerMean > 50);
        if (hasWhiteCorner) {
          const cropPx = Math.floor(Math.min(w, h) * 0.04);
          preprocessed = sharp(rawBuffer).extract({
            left: cropPx,
            top: cropPx,
            width: w - cropPx * 2,
            height: h - cropPx * 2,
          });
          logger.info('Cropped white corner artifact', {
            cornerMeans,
            centerMean,
            cropPx,
          });
        }
      }
    } catch (cornerErr) {
      logger.warn('Corner artifact detection failed, proceeding without crop', {
        error: cornerErr instanceof Error ? cornerErr.message : String(cornerErr),
      });
      preprocessed = sharp(rawBuffer);
    }

    const buffer = await preprocessed
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const ext = 'webp';
    const fileName = `${tenant.userId}/ai-${Date.now()}.${ext}`;

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Error guardando imagen: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: urlData.publicUrl,
      generated: true,
      usedAnchor: !!anchorBase64,
      anchorSource,
      engine,
    });
  } catch (err: unknown) {
    logger.error('AI image generation error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando imagen con IA' },
      { status: 500 }
    );
  }
}
