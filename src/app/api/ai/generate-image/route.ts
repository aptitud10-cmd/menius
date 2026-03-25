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

    // ─── CATEGORY → HERO ANGLE ───────────────────────────────────────────────
    const angleMap: Record<string, string> = {
      Beverages:  'Camera at 20-degree tilt — shows glass profile, liquid level and condensation clearly.',
      Drinks:     'Camera at 20-degree tilt — shows glass profile, liquid level and condensation clearly.',
      'Hot drinks': 'Camera at 22-degree tilt — captures steam rising from the cup.',
      Desserts:   'Camera at 45-degree angle — captures every layer, drizzle and topping.',
      Breakfast:  'Camera at 50-degree overhead — shows full plate layout and vibrant colors.',
      Salads:     'Camera directly overhead (flat-lay) — all ingredients visible, beautiful composition.',
      Pizza:      'Camera directly overhead — full pizza visible, one slice pulled slightly away showing cheese stretch.',
      Soups:      'Camera directly overhead — bowl centered, garnish floating, steam rising.',
      Tacos:      'Camera at 28-degree angle — 2–3 tacos arranged naturally, filling and toppings fully visible.',
      Bowls:      'Camera at 45-degree overhead — all ingredients arranged in sections, beautiful colors.',
      Burgers:    'Camera at 38-degree angle (the McDonald\'s standard) — every layer of the burger clearly visible, bun sesame seeds sharp.',
      Sandwiches: 'Camera at 35-degree angle — cross-section visible showing all fillings.',
      Chicken:    'Camera at 30-degree angle — crispy texture and char visible from this angle.',
      Sushi:      'Camera at 15-degree tilt — pieces arranged in a line, rice texture and fish color visible.',
      Pasta:      'Camera at 40-degree angle — depth of the bowl, sauce coating and garnish visible.',
    };
    const angleInstruction = (category && angleMap[category]) ? angleMap[category] : 'Camera at 38-degree hero angle — the universal professional food photography standard used by top restaurant chains.';

    // ─── CATEGORY → SURFACE & BACKGROUND ─────────────────────────────────────
    const surfaceMap: Record<string, string> = {
      Burgers:    'Polished dark slate stone surface. Deep matte charcoal background. One sesame seed scattered naturally.',
      Chicken:    'Rustic matte black ceramic tile surface. Deep charcoal background. One sprig of rosemary at edge.',
      Pizza:      'Worn wooden pizza board surface. Dark warm background.',
      Tacos:      'Terracotta or warm stone surface. Earthy warm-toned background.',
      Desserts:   'White marble surface with subtle veining. Soft light gray background.',
      Beverages:  'Polished black granite surface. Dark charcoal background. Water droplets on nearby surface.',
      Drinks:     'Polished black granite surface. Dark charcoal background.',
      'Hot drinks': 'Light oak wood surface. Warm cream-toned background.',
      Salads:     'White ceramic plate on white marble surface. Clean bright background.',
      Soups:      'Dark ceramic bowl on slate surface. Moody dark background.',
      Sushi:      'Black lacquered slate surface. Minimalist dark background. Subtle bamboo mat at edge.',
      Pasta:      'White ceramic bowl on linen cloth. Warm off-white background.',
      Breakfast:  'Light oak wood surface. Warm soft morning-light background.',
    };
    const surfaceInstruction = (category && surfaceMap[category]) ? surfaceMap[category] : 'Polished matte slate surface. Deep charcoal background — makes food colors pop dramatically.';

    // ─── FOOD TYPE → STYLING DETAILS ─────────────────────────────────────────
    const lowerName = (productName + ' ' + (description ?? '')).toLowerCase();

    const getFoodStylingDetails = (): string => {
      if (/burger|hamburguesa|smash|whopper|big.?mac/.test(lowerName)) {
        return 'Burger layers perfectly stacked and visible. Cheese gently melting over the patty edges in golden ribbons. Patty showing deep Maillard-reaction crust with visible sear marks. Lettuce crisp and vibrant green, tomato slice red and fresh, sauce peeking out at edges. Bun lightly toasted, golden-brown, sesame seeds perfectly distributed. One tiny drip of sauce falling from the side — the iconic "money shot".';
      }
      if (/pollo|chicken|fried|crispy|kentucky|crujiente/.test(lowerName)) {
        return 'Fried chicken showing spectacular crispy golden-brown crust with visible ridges and crunchy texture from the Maillard reaction. Steam wisps rising from the hot interior. Cross-section showing juicy white meat inside. Coating glistening under the rim light.';
      }
      if (/taco|burrito|quesadilla|enchilada|fajita/.test(lowerName)) {
        return 'Taco filling overflowing naturally — visible layers of protein, fresh salsa, vibrant cilantro, crisp white onion. Lime wedge cut and placed nearby with one drop of juice. Corn or flour tortilla with slight char marks. Micro water droplets on the vegetables suggesting ultimate freshness.';
      }
      if (/pizza/.test(lowerName)) {
        return 'One pizza slice being slightly lifted — mozzarella cheese stretching in long, glossy strands (the iconic cheese pull). Toppings perfectly distributed. Crust showing golden-brown bubbles and char spots from the oven. Sauce visible at the crust edge. Steam rising from the freshly baked surface.';
      }
      if (/pasta|spaghetti|fettuccine|penne|lasagna|carbonara|alfredo/.test(lowerName)) {
        return 'Pasta twisted naturally into a nest. Sauce coating every strand — glistening under the key light. Fresh basil leaf placed precisely on top. Parmigiano shavings falling mid-air. Steam rising from the hot dish. Fork twisted in pasta at the side of the bowl.';
      }
      if (/sushi|roll|maki|nigiri|sashimi/.test(lowerName)) {
        return 'Sushi pieces arranged in a perfect diagonal line. Fish glistening with natural sheen. Rice texture sharp and individual grains visible. Wasabi and pickled ginger placed at the corner. Tiny sesame seeds on top catching the light.';
      }
      if (/arepa|bandeja|changua|ajiaco|sancocho/.test(lowerName)) {
        return 'Traditional Colombian plating. Vibrant colors of each ingredient separated beautifully. Arepa showing golden-brown toasted exterior. Melted cheese pulling naturally. Hogao sauce glistening. Fresh avocado slices with lime. Steam from hot components.';
      }
      if (/ceviche|lomo.?saltado|aji.?de.?gallina|causa|anticucho/.test(lowerName)) {
        return 'Modern Peruvian fine-dining presentation. Aji amarillo sauce artfully drizzled. Micro herbs placed precisely. Corn and purple potato as colorful accents. Every element looking bright, fresh and meticulously placed.';
      }
      if (/helado|ice.?cream|gelato|sundae/.test(lowerName)) {
        return 'Ice cream scoops perfectly rounded, glistening. Sauce dripping naturally down the sides in a controlled flow. Toppings scattered with precision. Micro condensation on the cold glass or bowl. Color contrast between the ice cream and sauce dramatic.';
      }
      if (/café|coffee|latte|cappuccino|espresso/.test(lowerName)) {
        return 'Latte art on the surface — perfect rosette or tulip pattern in the foam. Steam curling elegantly upward, backlit. Cup showing warm ceramic tones. Crema on espresso deep golden-brown. Condensation on glass if iced.';
      }
      if (/smoothie|jugo|juice|batido/.test(lowerName)) {
        return 'Vibrant color of the drink saturated and glowing. Condensation droplets on the outside of the glass. Fruit slice on the rim. Straw positioned at an angle. One splash of liquid frozen mid-air (if creatively appropriate).';
      }
      return 'Every ingredient perfectly visible and identifiable. Food appears fresh, appetizing and perfectly cooked. Textures crisp, sauces glistening, proteins showing golden-brown Maillard reaction. Steam rising if hot. Natural moisture droplets if cold or fresh.';
    };

    // ─── CUISINE CONTEXT ──────────────────────────────────────────────────────
    const latinCuisineMap: Record<string, string> = {
      Mexican:    'Rustic clay or Talavera ceramic plate. Warm terracotta color palette. Cilantro, lime wedge, salsa roja and verde on the side.',
      Colombian:  'Colorful ceramic plate. Hogao sauce, crispy chicharrón, patacones visible. Bandeja paisa generosity and color.',
      Peruvian:   'Modern fine-dining plate. Aji amarillo sauce drizzle, corn, purple potato, microgreens. Nikkei-inspired elegant precision.',
      Argentine:  'Rustic wooden board. Char marks from the grill, chimichurri sauce on the side, lemon wedge. Bold South American style.',
      Venezuelan: 'Colorful ceramic plate. Melting cheese, black beans, shredded beef (pabellón style). Plantains as garnish.',
      Brazilian:  'Bright ceramic plate. Black beans, white rice, farofa, orange slices. Generous tropical portions.',
      Spanish:    'Cazuela clay dish or white ceramic. Saffron color, olive oil drizzle, paprika dust. Mediterranean warmth.',
      Italian:    'White ceramic plate. Fresh basil leaf, extra-virgin olive oil drizzle, Parmigiano shavings. Simple, elegant, Michelin-adjacent.',
      Japanese:   'Black lacquer or minimalist white ceramic. Wasabi and pickled ginger. Clean geometric precision.',
      American:   'Cast iron skillet or thick white ceramic. Generous portion, crispy edges, diner-meets-gourmet energy.',
      Chinese:    'Blue-and-white porcelain bowl. Steaming broth, chopsticks at edge. Wok-fired restaurant quality.',
    };

    const cuisineContext = cuisine && cuisine !== 'General' && latinCuisineMap[cuisine]
      ? latinCuisineMap[cuisine]
      : cuisine && cuisine !== 'General'
        ? `${cuisine} cuisine: authentic plating style, traditional garnishes and appropriate dishware for ${cuisine} food culture.`
        : '';

    let autoCuisineContext = '';
    if (!cuisineContext) {
      if (/taco|burrito|quesadilla|enchilada|pozole|mole|tamale|tostada|chilaquil|guacamol|elote|torta|huarache/.test(lowerName)) autoCuisineContext = latinCuisineMap.Mexican;
      else if (/arepa|bandeja|changua|ajiaco|sancocho|aguapanela|chicharrón|patacón/.test(lowerName)) autoCuisineContext = latinCuisineMap.Colombian;
      else if (/ceviche|lomo.?saltado|aji.?de.?gallina|causa|anticucho/.test(lowerName)) autoCuisineContext = latinCuisineMap.Peruvian;
      else if (/asado|choripán|milanesa|locro|chimichurri/.test(lowerName)) autoCuisineContext = latinCuisineMap.Argentine;
      else if (/pabellón|cachapa|hallaca|tequeño/.test(lowerName)) autoCuisineContext = latinCuisineMap.Venezuelan;
      else if (/feijoada|coxinha|brigadeiro|pão.?de.?queijo/.test(lowerName)) autoCuisineContext = latinCuisineMap.Brazilian;
      else if (/pizza|pasta|risotto|carbonara|lasagna|gnocchi|tiramisu/.test(lowerName)) autoCuisineContext = latinCuisineMap.Italian;
      else if (/sushi|ramen|udon|tempura|katsu|miso|onigiri/.test(lowerName)) autoCuisineContext = latinCuisineMap.Japanese;
    }

    const effectiveCuisineContext = cuisineContext || autoCuisineContext;

    // ─── STYLE OVERRIDE ───────────────────────────────────────────────────────
    const styleOverride = style === 'rustic'
      ? 'Warm, rustic feel: reclaimed wood surface, golden-hour side lighting, linen napkin at edge.'
      : style === 'modern'
        ? 'Modern minimalist: matte ceramic on solid muted background, shadowless studio light, geometric plating, flat-lay.'
        : style === 'vibrant'
          ? 'Vibrant editorial: saturated colors, hard natural daylight shadows, ingredient splashes around the plate.'
          : '';

    // ─── BUILD THE FINAL PROMPT ───────────────────────────────────────────────
    const foodStyling = getFoodStylingDetails();

    const prompt = `Commercial food advertising photograph — the kind shot for a world-class restaurant chain like McDonald's, KFC or Nobu, produced by an award-winning food photographer using a Hasselblad H6D-400C with a 120mm f/4 macro lens, lit by a professional three-point studio lighting rig, retouched in Capture One Pro.

SUBJECT: "${productName}"${description ? ` — ${description}` : ''}.
${effectiveCuisineContext ? `\nCUISINE CONTEXT: ${effectiveCuisineContext}` : ''}
FOOD STYLING: ${foodStyling}

LIGHTING SETUP (critical — replicate exactly):
- Key light: 120cm octabox softbox at 45° left, 1.2m from dish — creates soft gradients, no harsh shadows
- Fill light: large silver reflector at 30° right — reduces shadow contrast to a flattering 3:1 ratio
- Rim/backlight: strip softbox directly behind the dish — creates a luminous halo around steam, edges and texture
- Combined result: food appears to GLOW from within, exactly like a multi-million-dollar advertising campaign

CAMERA & COMPOSITION:
- Aperture f/3.2 — subject razor-sharp, background melts into creamy bokeh
- ISO 100 — zero grain, ultra-clean shadows
- ${angleInstruction}
- Dish fills 75% of the 16:9 frame — elegant breathing room on all sides, NEVER cropped at any edge
- Rule of thirds applied — subject positioned at left or center third, negative space breathes on the right

SURFACE & BACKGROUND:
- ${surfaceInstruction}
${styleOverride ? `- Style override: ${styleOverride}` : ''}

COLOR GRADING (baked into the image):
- Color temperature 5800K — makes golden-browns, crispy crusts and warm tones absolutely sing
- Slightly lifted blacks (cinematic depth, not pure black) 
- Teal-orange color split: warm food tones contrast against cool dark background
- Micro contrast boost on all textures — every crispy ridge, pore and glaze highlight visible
- Vibrance naturally elevated — food looks rich and real, never oversaturated

QUALITY MANDATE:
- 4K ultra-high resolution, 100% photorealistic, indistinguishable from a real photograph
- The image must make the viewer immediately hungry upon seeing it
- Shot for a premium restaurant advertising campaign — zero compromise on quality
- Absolutely NO text, watermarks, logos, UI elements, or human hands visible
- NO illustration, painting, cartoon or AI-looking artifacts — pure photorealism only`;

    // Use Imagen 4 for superior photorealistic food photography
    let imageBase64: string | null = null;
    const mimeType = 'image/png';

    try {
      const imagenResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      });

      const firstImage = imagenResponse.generatedImages?.[0];
      if (firstImage?.image?.imageBytes) {
        imageBase64 = firstImage.image.imageBytes as string;
      }
    } catch (imagenErr) {
      // Fallback to gemini multimodal image generation if Imagen 4 fails
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

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No se pudo generar la imagen. Intenta con una descripción diferente.' },
        { status: 422 }
      );
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = 'png';
    const fileName = `${tenant.userId}/ai-${Date.now()}.${ext}`;

    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
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
