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

    const styleInstructions: Record<string, string> = {
      professional: 'Professional food photography for a high-end restaurant menu. Clean white marble or light gray surface. Soft diffused natural window light from the left. Shallow depth of field (f/2.8). Subtle garnish visible.',
      rustic: 'Rustic artisanal food photography for a cozy restaurant. Reclaimed wooden table surface. Warm golden-hour side lighting. Linen napkin and vintage utensils as subtle props. Overhead 60-degree angle.',
      modern: 'Modern minimalist food photography for a trendy restaurant. Matte ceramic plate on solid muted background. Bright, even, shadowless studio lighting. Geometric plating. Clean overhead flat-lay.',
      vibrant: 'Vibrant editorial food photography. Rich saturated colors. Dynamic 30-degree hero angle. Fresh herb garnishes and ingredient splashes around the plate. Bright natural daylight with hard shadows.',
    };

    const stylePrompt = styleInstructions[style] || styleInstructions.professional;

    // Latin cuisine detection — specific plating and dishware by country/region
    const latinCuisineMap: Record<string, string> = {
      Mexican: 'Authentic Mexican plating: rustic clay or talavera ceramic plate, warm terracotta tones, fresh cilantro, lime wedge, red and green salsa on the side. Traditional Mexican street food or restaurant presentation.',
      Colombian: 'Authentic Colombian plating: colorful ceramic or white plate, traditional garnishes with hogao sauce, crispy chicharrón, patacones, or rice and beans. Bandeja paisa style for hearty dishes.',
      Peruvian: 'Authentic Peruvian plating: modern Nikkei or traditional presentation, aji amarillo sauces, corn, purple potato, microgreens. Clean fine-dining plating with Andean ingredients.',
      Argentine: 'Authentic Argentine plating: rustic wooden board or white ceramic, asado-style charcoal marks, chimichurri sauce on the side, red wine glass hint in background. Bold, hearty South American style.',
      Venezuelan: 'Authentic Venezuelan plating: arepa on a colorful plate, melting cheese, black beans, shredded beef (pabellón style). Warm tropical colors, plantains as garnish.',
      Brazilian: 'Authentic Brazilian plating: bright ceramic plate, feijoada style with black beans, white rice, farofa, orange slices. Tropical colors and generous portions.',
      Guatemalan: 'Authentic Central American plating: rustic ceramic, black beans, rice, tortillas, pepián sauce. Traditional Mayan-inspired garnishes and natural earthen colors.',
      Spanish: 'Authentic Spanish tapas or paella style: cazuela clay dish, saffron-colored rice, seafood, chorizo. Mediterranean warmth with olive oil drizzle.',
      Italian: 'Authentic Italian plating: white ceramic plate, fresh basil leaves, extra virgin olive oil drizzle, Parmigiano shavings. Simple, elegant, bistro-style presentation.',
      Japanese: 'Authentic Japanese plating: lacquerware or minimalist white ceramic, wasabi and pickled ginger, clean geometric presentation. Kaiseki-inspired minimal elegance.',
      American: 'American comfort food style: cast iron skillet or thick ceramic plate, generous portion, crispy edges visible. Casual diner or gourmet burger restaurant style.',
      Chinese: 'Authentic Chinese plating: porcelain bowl or plate with blue and white pattern, steaming broth, chopsticks visible at edge. Restaurant-quality dim sum or wok-fried presentation.',
    };

    const cuisineContext = cuisine && cuisine !== 'General' && latinCuisineMap[cuisine]
      ? latinCuisineMap[cuisine]
      : cuisine && cuisine !== 'General'
        ? `This is a ${cuisine} cuisine dish. Use authentic ${cuisine} plating style, traditional garnishes, and appropriate dishware.`
        : '';

    // Auto-detect Latin cuisine from product name
    const lowerName = (productName + ' ' + (description ?? '')).toLowerCase();
    let autoLatinContext = '';
    if (!cuisineContext) {
      if (/taco|burrito|quesadilla|enchilada|pozole|mole|tamale|tostada|chilaquil|guacamol|elote|tlayuda|torta|huarache/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Mexican;
      } else if (/arepa|bandeja|changua|ajiaco|sancocho|aguapanela|chicharrón|patacón/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Colombian;
      } else if (/ceviche|lomo.?saltado|aji.?de.?gallina|causa|anticucho|chicha/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Peruvian;
      } else if (/asado|empanada|choripán|milanesa|locro|chimichurri/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Argentine;
      } else if (/pabellón|cachapa|hallaca|tequeño/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Venezuelan;
      } else if (/feijoada|coxinha|brigadeiro|caipirinha|pão.?de.?queijo/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Brazilian;
      } else if (/pizza|pasta|risotto|ossobuco|carbonara|lasagna|gnocchi/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Italian;
      } else if (/sushi|ramen|udon|tempura|katsu|miso|onigiri/.test(lowerName)) {
        autoLatinContext = latinCuisineMap.Japanese;
      }
    }

    const effectiveCuisineContext = cuisineContext || autoLatinContext;

    const categoryHint = category ? `Category: ${category}.` : '';

    const angleMap: Record<string, string> = {
      'Beverages': 'Shot from a slight 20-degree angle to show the glass/cup and liquid level clearly.',
      'Drinks': 'Shot from a slight 20-degree angle to show the glass/cup and liquid level clearly.',
      'Desserts': 'Shot from a 45-degree angle to capture layers, textures, and toppings.',
      'Breakfast': 'Shot from overhead flat-lay to show the full plate composition.',
      'Salads': 'Shot from overhead to show all ingredients and colors.',
      'Pizza': 'Shot from directly overhead to show toppings, with one slice slightly pulled away.',
      'Soups': 'Shot from overhead to show the bowl and garnish floating on top.',
      'Tacos': 'Shot from a 30-degree angle to show the filling and toppings clearly, two or three tacos arranged naturally.',
      'Bowls': 'Shot from overhead at 45 degrees to show all ingredients arranged beautifully.',
    };
    const angleHint = (category && angleMap[category]) ? angleMap[category] : '';

    const prompt = `A single, stunning, photorealistic food photograph of: "${productName}"${description ? `. ${description}` : ''}.

${effectiveCuisineContext}
${categoryHint}
${stylePrompt}
${angleHint}

FRAMING (critical):
- Landscape orientation, roughly 16:9 aspect ratio (wider than tall)
- The ENTIRE dish must be fully visible within the frame — no part of the plate or food cut off at any edge
- Center the dish with 10-15% breathing room (margin) around all sides
- The dish should fill about 70-80% of the frame, leaving clean background visible

Technical requirements:
- Ultra-realistic food photography, 4K HDR quality, indistinguishable from a real photo by a professional photographer
- Absolutely NO text, watermarks, logos, or labels anywhere in the image
- Single dish, perfectly plated, as it would be served in a real restaurant
- Food must look fresh, steaming if hot, glistening if sauced, crispy if fried
- Professional color grading with appetizing warm tones
- Shallow depth of field with the dish in sharp focus
- No human hands, no faces, no distracting background elements`;

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
