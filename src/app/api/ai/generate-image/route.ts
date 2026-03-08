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

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const styleInstructions: Record<string, string> = {
      professional: 'Professional food photography for a high-end restaurant menu. Clean white marble or light gray surface. Soft diffused natural window light from the left. Shallow depth of field (f/2.8). Subtle garnish visible.',
      rustic: 'Rustic artisanal food photography for a cozy restaurant. Reclaimed wooden table surface. Warm golden-hour side lighting. Linen napkin and vintage utensils as subtle props. Overhead 60-degree angle.',
      modern: 'Modern minimalist food photography for a trendy restaurant. Matte ceramic plate on solid muted background. Bright, even, shadowless studio lighting. Geometric plating. Clean overhead flat-lay.',
      vibrant: 'Vibrant editorial food photography. Rich saturated colors. Dynamic 30-degree hero angle. Fresh herb garnishes and ingredient splashes around the plate. Bright natural daylight with hard shadows.',
    };

    const stylePrompt = styleInstructions[style] || styleInstructions.professional;

    const cuisineContext = cuisine && cuisine !== 'General'
      ? `This is a ${cuisine} cuisine dish. Use authentic ${cuisine} plating style, traditional garnishes, and appropriate dishware (e.g. ceramic for Mexican, lacquerware for Japanese, cast iron for American).`
      : '';

    const categoryHint = category
      ? `Category: ${category}.`
      : '';

    const angleMap: Record<string, string> = {
      'Beverages': 'Shot from a slight 20-degree angle to show the glass/cup and liquid level clearly.',
      'Drinks': 'Shot from a slight 20-degree angle to show the glass/cup and liquid level clearly.',
      'Desserts': 'Shot from a 45-degree angle to capture layers, textures, and toppings.',
      'Breakfast': 'Shot from overhead flat-lay to show the full plate composition.',
      'Salads': 'Shot from overhead to show all ingredients and colors.',
      'Pizza': 'Shot from directly overhead to show toppings, with one slice slightly pulled away.',
      'Soups': 'Shot from overhead to show the bowl and garnish floating on top.',
    };
    const angleHint = (category && angleMap[category]) ? angleMap[category] : '';

    const prompt = `Generate a single, stunning, photorealistic food photograph of: "${productName}"${description ? `. ${description}` : ''}.

${cuisineContext}
${categoryHint}
${stylePrompt}
${angleHint}

FRAMING (critical):
- Landscape orientation, roughly 16:9 aspect ratio (wider than tall)
- The ENTIRE dish must be fully visible within the frame — no part of the plate or food cut off at any edge
- Center the dish with 10-15% breathing room (margin) around all sides
- The dish should fill about 70-80% of the frame, leaving clean background visible

Technical requirements:
- Ultra-realistic food photography, indistinguishable from a real photo taken by a professional photographer
- Absolutely NO text, watermarks, logos, or labels anywhere in the image
- Single dish, perfectly plated, as it would be served in a real restaurant
- Food must look fresh, steaming if hot, glistening if sauced, crispy if fried
- Professional color grading with appetizing warm tones
- Shallow depth of field with the dish in sharp focus
- No human hands, no faces, no distracting background elements`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
      } as any,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    let imageBase64: string | null = null;
    let mimeType = 'image/png';

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if ((part as any).inlineData) {
          imageBase64 = (part as any).inlineData.data;
          mimeType = (part as any).inlineData.mimeType || 'image/png';
          break;
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
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
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
