export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-generate-image');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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
    const { productName, description, style, cuisine, category } = body;

    if (!productName?.trim()) {
      return NextResponse.json({ error: 'Nombre del producto requerido' }, { status: 400 });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const lowerName = (productName + ' ' + (description ?? '')).toLowerCase();
    const isDrink = ['Beverages', 'Hot drinks', 'Cocktails', 'Drinks'].includes(category ?? '');

    // ─── CATEGORY → HERO ANGLE ───────────────────────────────────────────────
    const angleMap: Record<string, string> = {
      Beverages:    '20-degree tilt showing the full glass profile, condensation, and liquid level',
      Drinks:       '20-degree tilt showing the full glass profile, condensation, and liquid level',
      'Hot drinks': '22-degree tilt showing the cup rim, steam curling up, and latte art if present',
      Cocktails:    '20-degree tilt showing the glass silhouette and garnish against the background',
      Desserts:     '45-degree angle capturing every layer, drizzle, and topping in detail',
      Breakfast:    '50-degree overhead showing full plate and vibrant colors',
      Salads:       'overhead flat-lay — all colorful ingredients visible and beautifully arranged',
      Pizza:        'overhead flat-lay — full round pizza visible, one slice lifted slightly to show cheese pull',
      Soups:        'overhead flat-lay — bowl centered, garnish floating, steam rising',
      Tacos:        '28-degree angle — 2-3 tacos arranged naturally, filling spilling slightly, toppings visible',
      Bowls:        '45-degree overhead — all ingredients arranged in sections, beautiful colors',
      Burgers:      '38-degree hero angle — every burger layer clearly visible from patty to bun',
      Sandwiches:   '35-degree angle — cross-section visible showing all fillings',
      Chicken:      '30-degree angle — crispy texture and golden char visible',
      Sushi:        '15-degree tilt — pieces in a diagonal line, rice texture and fish color visible',
      Pasta:        '40-degree angle — bowl depth, sauce coating, garnish visible',
    };
    const angleInstruction = (category && angleMap[category]) ? angleMap[category] : '38-degree hero angle — the universal professional food photography standard';

    // ─── CATEGORY → CONTAINER (what the food/drink is IN or ON) ─────────────
    // This is the critical fix for the "pan/skillet" problem.
    function getContainer(): string {
      if (/margarita/.test(lowerName)) return 'a classic margarita glass with a salted rim, lime wedge on the rim';
      if (/cerveza|beer|craft beer/.test(lowerName)) return 'a cold frosted pint glass with a creamy foam head';
      if (/mezcal/.test(lowerName)) return 'a traditional clay copita (small clay cup) with an orange slice and sal de gusano';
      if (/mojito/.test(lowerName)) return 'a tall highball glass with ice, mint, lime, and soda, with a straw';
      if (/wine|vino/.test(lowerName)) return 'a large elegant wine glass';
      if (/whiskey|bourbon|sour/.test(lowerName)) return 'a thick whiskey rocks glass with a large clear ice cube';
      if (/limonada|lemonade/.test(lowerName)) return 'a tall highball glass with ice, fresh mint, and a lemon slice on the rim';
      if (/horchata/.test(lowerName)) return 'a tall glass with ice, filled with creamy horchata, a cinnamon stick on the rim';
      if (/smoothie|batido/.test(lowerName)) return 'a tall frosted glass with a straw and fruit garnish on the rim';
      if (/agua mineral|sparkling water|water/.test(lowerName)) return 'a clear glass bottle with condensation and a lemon slice beside it';
      if (/jugo|juice|naranja/.test(lowerName)) return 'a chilled glass filled with freshly squeezed bright juice';
      if (/café|coffee|espresso|latte|cappuccino|olla/.test(lowerName)) return 'a beautiful ceramic coffee mug or clay pot, steam gently rising';
      if (/tea|té/.test(lowerName)) return 'a ceramic mug or glass cup with tea';
      if (/hot chocolate|chocolate caliente/.test(lowerName)) return 'a large ceramic mug with whipped cream on top';
      if (/burger|hamburguesa/.test(lowerName)) return 'a ceramic plate or wooden board';
      if (/taco/.test(lowerName)) return 'a traditional ceramic plate or oval serving tray';
      if (/pizza/.test(lowerName)) return 'a round wooden pizza board';
      if (/pasta|fettuccine|alfredo|spaghetti|linguine/.test(lowerName)) return 'a wide, shallow white ceramic pasta bowl';
      if (/salad|ensalada|césar|caesar/.test(lowerName)) return 'a wide ceramic salad bowl or large flat plate';
      if (/sopa|soup/.test(lowerName)) return 'a deep ceramic bowl';
      if (/pancake|hotcake|waffle|french toast|omelette|huevo|egg|benedict|avena|molletes|chilaquil/.test(lowerName)) return 'a round white ceramic breakfast plate';
      if (/guacamole/.test(lowerName)) return 'a traditional molcajete (stone mortar bowl) or small ceramic bowl, tortilla chips arranged around it';
      if (/nacho/.test(lowerName)) return 'a large oval ceramic sharing plate';
      if (/alita|wing/.test(lowerName)) return 'a ceramic sharing plate lined with parchment';
      if (/helado|ice.?cream/.test(lowerName)) return 'a chilled ceramic bowl or glass coupe';
      if (/brownie|sundae/.test(lowerName)) return 'a white ceramic plate or deep glass bowl';
      if (/churro/.test(lowerName)) return 'a long rectangular ceramic plate, with a small cup of chocolate sauce beside it';
      if (/flan/.test(lowerName)) return 'a small ceramic ramekin or plate, inverted with caramel sauce pooling around it';
      if (/cheesecake|pay de queso/.test(lowerName)) return 'a white ceramic dessert plate';
      if (/tiramisu/.test(lowerName)) return 'a rectangular glass dish or ceramic ramekin';
      if (/crème brûlée|creme brulee/.test(lowerName)) return 'a classic white oval ceramic ramekin';
      if (isDrink) return 'an appropriate glass or mug';
      return 'a white ceramic plate';
    }

    // ─── CATEGORY → SURFACE & BACKGROUND ─────────────────────────────────────
    const surfaceMap: Record<string, string> = {
      Beverages:    'polished dark granite bar counter. Water droplets scattered nearby. NO plates, NO food around it.',
      Drinks:       'polished dark granite bar counter. NO plates, NO food around it.',
      'Hot drinks': 'warm light oak wood table surface. A small saucer underneath.',
      Cocktails:    'sleek dark marble bar counter, one cocktail napkin folded beside it.',
      Burgers:      'dark slate stone surface or rustic wooden board. Deep matte charcoal background.',
      Chicken:      'matte black ceramic tile surface. Deep charcoal background.',
      Pizza:        'worn rustic wooden pizza board on a rough stone surface.',
      Tacos:        'warm terracotta surface with a small woven cloth underneath.',
      Desserts:     'white marble surface with soft gray veining. Elegant minimal background.',
      Salads:       'clean white marble surface, bright natural daylight look.',
      Soups:        'dark slate or matte ceramic tile surface. Moody warm tones.',
      Pasta:        'white linen cloth on a wooden restaurant table.',
      Breakfast:    'light oak wood breakfast table. Soft morning light atmosphere.',
      Dinner:       'polished dark slate restaurant surface. Deep charcoal background.',
      Appetizers:   'rustic wooden serving board or dark ceramic tile.',
      Sandwiches:   'rustic wooden board. Warm natural background.',
    };
    const surfaceInstruction = (category && surfaceMap[category]) ? surfaceMap[category] : 'clean dark matte restaurant table surface. Deep charcoal background.';

    // ─── FOOD STYLING ─────────────────────────────────────────────────────────
    const getFoodStylingDetails = (): string => {
      if (isDrink) {
        if (/margarita/.test(lowerName)) return 'Salt rim on half the glass. Lime wedge on rim. Ice visible. Vibrant lime-green color.';
        if (/beer|cerveza/.test(lowerName)) return 'Thick creamy foam head, condensation droplets on the cold glass, golden amber color glowing through.';
        if (/mezcal/.test(lowerName)) return 'Clear or amber mezcal in the clay copita. Orange slice bright and fresh. Sal de gusano in a tiny dish.';
        if (/mojito/.test(lowerName)) return 'Fresh mint leaves pressed against the glass. Lime wedge. Ice cubes perfectly clear. Bubbles rising.';
        if (/wine|vino/.test(lowerName)) return 'Deep ruby-red wine with legs running down the glass. Beautiful bokeh background.';
        if (/whiskey|bourbon/.test(lowerName)) return 'Amber whiskey with a perfectly clear large ice cube. Orange peel twist garnish.';
        if (/limonada|lemonade/.test(lowerName)) return 'Vibrant yellow lemonade, fresh mint, ice cubes, lemon slice on rim. Condensation on the cold glass.';
        if (/smoothie/.test(lowerName)) return 'Thick vibrant tropical smoothie. Fresh fruit garnish on the rim. Straw at a natural angle.';
        if (/juice|jugo/.test(lowerName)) return 'Bright vibrant color, freshly squeezed look. Slice of fruit on rim.';
        if (/coffee|café|espresso|latte|cappuccino/.test(lowerName)) return 'Perfect latte art rosette. Steam rising delicately. Crema golden-brown and smooth.';
        return 'Drink fresh, vibrant, and perfectly prepared. Garnish precisely placed. Condensation visible on glass.';
      }
      if (/burger|hamburguesa/.test(lowerName)) return 'All burger layers perfectly visible: brioche bun with sesame seeds, Maillard-crusted patty, cheese melting in golden ribbons, fresh lettuce and red tomato. One tiny sauce drip at the side.';
      if (/taco/.test(lowerName)) return 'Taco filling overflowing naturally — protein, vibrant salsa, fresh cilantro, white onion. Lime wedge. Slight char marks on tortilla.';
      if (/pizza/.test(lowerName)) return 'One slice being lifted — mozzarella cheese stretching in long glossy strands. Crust golden-brown with charred bubbles. Fresh basil leaf bright green.';
      if (/pasta|alfredo|fettuccine/.test(lowerName)) return 'Pasta twisted into a natural nest. Sauce coating every strand, glistening. Fresh basil leaf. Parmigiano shavings catching the light. Steam rising.';
      if (/steak|ribeye|filete/.test(lowerName)) return 'Perfect sear marks. Golden-brown Maillard crust. Sauce artfully drizzled. Steam rising. Sides arranged beautifully.';
      if (/salmon|shrimp|lobster|seafood/.test(lowerName)) return 'Perfectly cooked seafood glistening with butter. Lemon wedge bright yellow. Steam rising.';
      if (/chicken|pollo|alita|wing/.test(lowerName)) return 'Golden-brown crispy exterior with char marks. Sauce glistening. Steam rising.';
      if (/guacamole/.test(lowerName)) return 'Chunky fresh guacamole, diced tomato, cilantro, lime visible. Tortilla chips arranged around the bowl.';
      if (/nacho/.test(lowerName)) return 'Cheese melted and pulling between chips. Jalapeño slices bright green. Guacamole bright green. Pico de gallo vibrant red.';
      if (/ice cream|helado/.test(lowerName)) return 'Scoops perfectly rounded, glistening. Sauce dripping naturally down sides. Slight condensation on the cold bowl.';
      if (/brownie/.test(lowerName)) return 'Warm brownie with cracked top, ice cream melting slightly over it. Chocolate sauce dripping. Whipped cream perfectly swirled.';
      if (/pancake|hotcake/.test(lowerName)) return 'Pancakes stacked with butter melting on top, maple syrup dripping naturally. Fresh berries bright and colorful.';
      if (/salad|ensalada/.test(lowerName)) return 'Greens crisp and vibrant. Dressing glistening on leaves. Parmesan shavings catching light. Croutons golden-brown.';
      return 'Food fresh, appetizing, and perfectly prepared. Natural textures and colors. Steam rising if hot. Professional restaurant presentation.';
    };

    // ─── CUISINE CONTEXT (suppressed for drinks) ──────────────────────────────
    const latinCuisineMap: Record<string, string> = {
      Mexican:    'Served on a rustic clay or Talavera ceramic plate. Warm terracotta tones. Cilantro, lime wedge, and salsa as natural garnishes.',
      Colombian:  'Colorful ceramic plate. Hogao sauce, fresh herbs visible.',
      Peruvian:   'Modern fine-dining plate. Aji amarillo sauce drizzle, corn, purple potato, microgreens.',
      Argentine:  'Rustic wooden board. Char marks from the grill, chimichurri sauce on the side, lemon wedge.',
      Venezuelan: 'Colorful ceramic plate. Melting cheese, black beans, shredded beef. Plantains as garnish.',
      Brazilian:  'Bright ceramic plate. Black beans, white rice, farofa, orange slices.',
      Spanish:    'White ceramic. Saffron color, olive oil drizzle, paprika dust.',
      Italian:    'White ceramic plate. Fresh basil leaf, olive oil drizzle, Parmigiano shavings.',
      Japanese:   'Black lacquer or minimalist white ceramic. Wasabi and pickled ginger. Clean geometric precision.',
      American:   'White ceramic plate or wooden board. Generous portion, crispy edges, restaurant-quality presentation.',
      Chinese:    'Blue-and-white porcelain bowl. Steaming broth, chopsticks at edge.',
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
      ? 'Warm, rustic feel: reclaimed wood surface, golden-hour side lighting, linen napkin at edge.'
      : style === 'modern'
        ? 'Modern minimalist: matte ceramic on solid muted background, shadowless studio light, flat-lay.'
        : style === 'vibrant'
          ? 'Vibrant editorial: saturated colors, hard natural daylight shadows.'
          : '';

    // ─── BUILD THE FINAL PROMPT ───────────────────────────────────────────────
    const container = getContainer();
    const foodStyling = getFoodStylingDetails();

    const prompt = `Hyperrealistic food photography RAW photograph. Shot in a real restaurant or food photography studio with professional equipment. Indistinguishable from an actual photograph taken with a professional DSLR. NOT CGI, NOT 3D render, NOT illustration, NOT painting, NOT Pixar, NOT animation, NOT AI art.

SERVED IN/ON: ${container}.

SUBJECT: "${productName}"${description ? ` — ${description}` : ''}.
${effectiveCuisineContext ? `PRESENTATION STYLE: ${effectiveCuisineContext}` : ''}
FOOD STYLING: ${foodStyling}

CAMERA: 50mm or 85mm prime lens, f/2.8 aperture, ISO 400 — real DSLR photo with natural grain.
ANGLE: ${angleInstruction}.
COMPOSITION: Square 1:1 frame. Subject centered, filling approximately 65-70% of frame. Equal breathing room on all sides. SAFE ZONE: all food/drink within central 80% — outer 10% may be cropped by UI.

SURFACE & SETTING: ${surfaceInstruction}
${styleOverride ? `STYLE: ${styleOverride}` : ''}

LIGHTING: Professional three-point soft lighting — large octabox softbox from the left, silver reflector fill from the right, subtle warm backlight for natural rim separation.

REALISM (critical):
- This is a REAL photograph — show natural, authentic food with real imperfections
- Condensation on cold drinks, natural sauce drips, slight caramelization — authentic textures
- NO plastic-looking textures, NO artificial CGI glow, NO over-processed digital sheen
- NO pans, skillets, woks, or cooking equipment${isDrink ? '\n- Beverage MUST be in proper glassware (glass, mug, cup, bottle) — NEVER on a plate or flat surface alone' : '\n- Food MUST be shown as served to a customer at a restaurant table — plated and ready to eat'}
- NO text, watermarks, logos, or human hands visible`;

    // Primary: gemini-3-pro-image-preview (nano banana — most photorealistic)
    let imageBase64: string | null = null;
    const mimeType = 'image/jpeg';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'] as any,
          imageConfig: { aspectRatio: '1:1' } as any,
        } as any,
      });
      const parts = (response as any).candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    } catch {
      // Fallback 1: Imagen 4
      logger.warn('gemini-3-pro-image-preview failed, falling back to Imagen 4');
      try {
        const imagenResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt,
          config: { numberOfImages: 1, aspectRatio: '1:1' },
        });
        const firstImage = imagenResponse.generatedImages?.[0];
        if (firstImage?.image?.imageBytes) imageBase64 = firstImage.image.imageBytes as string;
      } catch (imagenErr) {
        // Fallback 2: gemini-2.5-flash-image
        logger.warn('Imagen 4 failed, falling back to gemini-2.5-flash-image', {
          error: imagenErr instanceof Error ? imagenErr.message : String(imagenErr),
        });
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash-image',
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] as any } as any,
        });
        const result = await model.generateContent(prompt);
        const response = result.response;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if ((part as any).inlineData) {
              imageBase64 = (part as any).inlineData.data;
              break;
            }
          }
        }
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
    });
  } catch (err: unknown) {
    logger.error('AI image generation error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando imagen con IA' },
      { status: 500 }
    );
  }
}
