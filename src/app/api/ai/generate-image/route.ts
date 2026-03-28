export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-generate-image');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const canUseImageAI = await hasPlanAccess(tenant.restaurantId, 'starter');
    if (!canUseImageAI) {
      return NextResponse.json(
        { error: 'La generación de imágenes con IA requiere el plan Starter o superior.' },
        { status: 403 }
      );
    }

    const { allowed } = await checkRateLimitAsync(`ai:${tenant.userId}`, { limit: 20, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Límite de generaciones alcanzado. Intenta en 1 hora.' },
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
    const { productName, description, style, cuisine, category, isBanner } = body;

    if (!productName?.trim()) {
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
      if (/jugo|juice|naranja/.test(lowerName)) return 'a chilled clear glass filled with freshly squeezed vibrant juice, a citrus slice on the rim';
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
        if (/juice|jugo/.test(lowerName)) return 'Bright vibrant freshly squeezed color. Citrus slice on the rim. Natural pulp visible. Condensation on the cold glass.';
        if (/coffee|café|espresso|latte|cappuccino/.test(lowerName)) return 'Perfect latte art rosette or tulip pattern. Steam rising delicately. Crema golden-brown and smooth. Impeccable barista craft visible.';
        return 'Drink fresh, vibrant, and perfectly prepared. Garnish precisely placed. Condensation visible on cold glass. Every detail of the preparation visible.';
      }
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
      if (/pancake|hotcake/.test(lowerName)) return 'Pancakes stacked with butter melting and pooling on top. Maple syrup dripping naturally down the sides. Fresh berries bright and colorful. Powdered sugar dusting delicate as snow.';
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
    const bannerPrompt = isBanner ? `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment, NO text, NO human hands visible.

Award-winning wide-format restaurant banner photograph. Indistinguishable from a professional DSLR photograph. Shot in a real restaurant or professional food photography studio.

RESTAURANT: "${productName}"${description ? ` — ${description}` : ''}.
${effectiveCuisineContext ? `CUISINE IDENTITY: ${effectiveCuisineContext}` : ''}

COMPOSITION: Wide 16:9 horizontal banner. Multiple dishes or food elements spread naturally across the frame. Beautiful layered table scene. Generous empty space on the left third for potential text overlay. Depth of field with bokeh on background elements.

CAMERA: 35mm wide lens, f/4 aperture, ISO 640 — cinematic look with natural film grain.

LIGHTING: Warm inviting restaurant ambiance. Soft directional key light from the left at 45 degrees, gentle fill from the right. Golden tones with warm color temperature (3400K). Appetizing and welcoming mood.

SCENE: Beautifully plated dishes on a restaurant table. Natural textures — linen napkins, wooden table, handcrafted ceramic plates. Candle light or golden-hour window light visible in background.

COLOR SCIENCE: Rich warm tonal depth. Deep shadows with warm amber undertones — not pure black. Highlights golden and inviting. Film-like color rendering, naturally saturated.` : null;

    const prompt = bannerPrompt ?? `NOT CGI, NOT 3D render, NOT illustration — this is a REAL photograph. NO cooking equipment visible, NO text or logos, NO human hands.

This is an award-winning commercial food photograph in the style of Lyan van Furth or Eric Wolfinger — the world's finest food photographers. Every element is deliberate and masterfully composed.

SUBJECT: "${productName}"${description ? ` — ${description}` : ''}.
SERVED IN/ON: ${container}.
${effectiveCuisineContext ? `PLATING IDENTITY: ${effectiveCuisineContext}` : ''}

CAMERA: 50mm or 85mm prime lens, ${dofInstruction}, ISO 400 — authentic DSLR photograph with natural film grain.
ANGLE: ${angleInstruction}.
COMPOSITION: Square 1:1 frame. Subject positioned at the power point using the rule of thirds — slightly off-center, never dead-center. Subject fills 55-60% of the frame, leaving generous negative space that gives the image breathing room and a high-end editorial feel. SAFE ZONE: all food/drink within the central 80% — outer 10% may be cropped by UI.

SURFACE & SETTING: ${surfaceInstruction}
${styleOverride ? styleOverride : ''}

LIGHTING: ${lighting}

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber-brown undertones — never pure black, always depth. Highlights slightly golden, never blown out. High micro-contrast revealing every individual texture detail — condensation droplets, sauce gloss, char marks, herb edges. Film-like tonal quality similar to Fujifilm Velvia — vivid but completely natural, never over-processed. Subtle vignette darkening the corners by 15% to draw the eye naturally toward the center.

FOOD STYLING: ${foodStyling}`;

    const aspectRatio = isBanner ? '16:9' : '1:1';

    // ─── FETCH STYLE ANCHOR FOR THIS RESTAURANT + CATEGORY ───────────────────
    let anchorBase64: string | null = null;
    if (!isBanner && category) {
      try {
        const adminSupabase = createAdminClient();
        const { data: anchor } = await adminSupabase
          .from('style_anchors')
          .select('anchor_url')
          .eq('restaurant_id', tenant.restaurantId)
          .eq('category_name', category)
          .maybeSingle();

        if (anchor?.anchor_url) {
          const anchorRes = await fetch(anchor.anchor_url, { signal: AbortSignal.timeout(8000) });
          if (anchorRes.ok) {
            const anchorBuffer = await anchorRes.arrayBuffer();
            anchorBase64 = Buffer.from(anchorBuffer).toString('base64');
            logger.info('Style anchor loaded', { restaurantId: tenant.restaurantId, category });
          }
        }
      } catch (anchorErr) {
        logger.warn('Failed to load style anchor, generating without reference', {
          error: anchorErr instanceof Error ? anchorErr.message : String(anchorErr),
        });
      }
    }

    // ─── ANCHOR PROMPT (when reference image is available) ───────────────────
    const anchorPrompt = anchorBase64 ? `STYLE REFERENCE: The reference image above is the approved visual style anchor for the "${category}" category of this restaurant. You MUST match EXACTLY:
- The background material, color, texture, and depth of field
- The lighting direction, color temperature, shadow depth, and intensity
- The camera angle and overall composition style
- The color grading, mood, and tonal quality

Change ONLY the subject to: "${productName}"${description ? ` — ${description}` : ''}.
Served in/on: ${container}.
${foodStyling}
Keep everything else — surface, lighting, background, atmosphere — pixel-perfect consistent with the reference.` : null;

    // ─── PRIMARY MODEL: gemini-3-pro-image-preview ────────────────────────────
    let imageBase64: string | null = null;
    const mimeType = 'image/jpeg';

    try {
      let contents: object[];

      if (anchorBase64 && anchorPrompt) {
        contents = [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: anchorBase64 } },
            { text: anchorPrompt },
          ],
        }];
      } else {
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
      }

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
          break;
        }
      }
    } catch (primaryErr) {
      logger.warn('gemini-3-pro-image-preview failed', {
        error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      });
    }

    // ─── FALLBACK: gemini-2.5-flash-image ─────────────────────────────────────
    // Triggers when primary threw an error OR returned a response without image parts
    if (!imageBase64) {
      logger.warn('gemini-3-pro-image-preview returned no image, falling back to gemini-2.5-flash-image');
      try {
        const flashResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['TEXT', 'IMAGE'] as any } as any,
        });
        const flashParts = (flashResponse as any).candidates?.[0]?.content?.parts ?? [];
        for (const part of flashParts) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }
      } catch (flashErr) {
        logger.warn('gemini-2.5-flash-image also failed', {
          error: flashErr instanceof Error ? flashErr.message : String(flashErr),
        });
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No se pudo generar la imagen. Intenta con una descripción diferente.' },
        { status: 422 }
      );
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = 'jpg';
    const fileName = `${tenant.userId}/ai-${Date.now()}.${ext}`;

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
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
    });
  } catch (err: unknown) {
    logger.error('AI image generation error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando imagen con IA' },
      { status: 500 }
    );
  }
}
