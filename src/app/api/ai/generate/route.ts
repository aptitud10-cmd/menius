export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-generate-public');

const DEMO_LIMIT = 2; // free demo uses per IP per hour

async function ipDemoAllowed(ip: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('ai_enhance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('type', 'generate')
      .gte('created_at', windowStart);
    return (count ?? 0) < DEMO_LIMIT;
  } catch {
    return true;
  }
}

async function generateWithFalAi(prompt: string): Promise<string | null> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return null;

  try {
    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: falKey });

    const result = await (fal as any).subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        image_size: 'square_hd',
      },
    });

    return (result as any)?.images?.[0]?.url ?? null;
  } catch (err) {
    logger.warn('fal.ai generate failed', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function buildFoodPrompt(dishName: string, cuisine: string, style: string): string {
  const styleMap: Record<string, string> = {
    dark_moody:  'dark moody fine dining, dramatic single-source chiaroscuro lighting, deep rich shadows, charcoal dark background',
    bright_airy: 'bright airy natural window light, clean white background, fresh and vibrant colors',
    rustic:      'warm rustic setting, reclaimed wood surface, golden hour side lighting, cozy authentic atmosphere',
    editorial:   'editorial magazine style, high contrast professional studio, sophisticated plating',
    delivery:    'white clean background, bright even lighting, vibrant colors, delivery app optimized',
  };

  const cuisineMap: Record<string, string> = {
    Mexican:    'Served on a rustic hand-painted Talavera ceramic. Cilantro, lime, vibrant salsa as natural garnishes.',
    Colombian:  'On a colorful hand-painted ceramic plate. Hogao sauce and fresh herbs visible.',
    Peruvian:   'Modern fine-dining plate. Aji amarillo drizzle, microgreens arranged with precision.',
    Argentine:  'Rustic wooden board. Visible char marks, chimichurri in a small clay dish, fresh lemon wedge.',
    Italian:    'White ceramic. Fresh basil leaf, extra-virgin olive oil drizzle, Parmigiano shavings.',
    American:   'Generous portion on a white plate or rustic wooden board. Casual fine-dining feel.',
    General:    'White ceramic plate, clean restaurant presentation.',
  };

  const styleDesc = styleMap[style] ?? styleMap.editorial;
  const cuisineContext = cuisineMap[cuisine] ?? cuisineMap.General;

  return `NOT CGI, NOT 3D render, NOT illustration — this is a REAL DSLR photograph.

Award-winning commercial food photograph in the style of a Michelin-starred restaurant lookbook.

SUBJECT: "${dishName}" — a freshly prepared, beautifully plated restaurant dish.
PLATING: ${cuisineContext}
STYLE: ${styleDesc}

CAMERA: 85mm prime lens, f/2.8, ISO 400 — authentic DSLR photograph with natural film grain.
COMPOSITION: Square 1:1. Subject fills 60% of frame, slight off-center. All food within central 80%.

LIGHTING: Professional three-point setup — key light at 45° left, subtle fill right, warm rim backlight separating subject from background.

COLOR SCIENCE: Rich cinematic color grading. Deep shadows with warm amber undertones. Highlights golden, never blown out. Micro-contrast revealing every texture detail — sauce gloss, fresh herb edges, char marks.

FOOD STYLING: Exquisitely plated, every ingredient visible and intentional. Steam rising if hot. Natural garnishes precisely placed.

NO text, NO logos, NO human hands, NO cooking equipment visible.`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    let restaurantId: string | null = null;
    try {
      const { getTenant } = await import('@/lib/auth/get-tenant');
      const tenant = await getTenant();
      restaurantId = tenant?.restaurantId ?? null;
    } catch { /* public demo */ }

    if (!restaurantId) {
      const allowed = await ipDemoAllowed(ip);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Demo limit reached (2 per hour). Sign up to Menius for unlimited generations.' },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const rawDishName = String(body.dishName ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 120);
    const cuisine = String(body.cuisine ?? 'General').slice(0, 50);
    const style = String(body.style ?? 'editorial').slice(0, 50);

    if (!rawDishName) {
      return NextResponse.json({ error: 'Dish name is required' }, { status: 400 });
    }

    const prompt = buildFoodPrompt(rawDishName, cuisine, style);

    // Try fal.ai first (better quality), then Gemini
    let imageUrl: string | null = null;
    let engine = 'gemini';

    const falUrl = await generateWithFalAi(prompt);
    if (falUrl) {
      imageUrl = falUrl;
      engine = 'fal-ai';
    }

    if (!imageUrl) {
      const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
      if (!apiKey) {
        return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      let imageBase64: string | null = null;

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
          if (part.inlineData?.data) { imageBase64 = part.inlineData.data; break; }
        }
      } catch { /* try Imagen 4 */ }

      if (!imageBase64) {
        const imagenResp = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt,
          config: { numberOfImages: 1, aspectRatio: '1:1' },
        });
        const first = imagenResp.generatedImages?.[0];
        if (first?.image?.imageBytes) imageBase64 = first.image.imageBytes as string;
      }

      if (!imageBase64) {
        return NextResponse.json(
          { error: 'Could not generate image. Try a different dish name.' },
          { status: 422 }
        );
      }

      // Upload generated image to Supabase
      const admin = createAdminClient();
      const prefix = restaurantId ? `r-${restaurantId}` : `demo-${ip.replace(/[^a-z0-9]/gi, '-')}`;
      const path = `ai-generate/${prefix}/${Date.now()}.jpg`;

      const buffer = Buffer.from(imageBase64, 'base64');
      const { error: uploadErr } = await admin.storage
        .from('product-images')
        .upload(path, buffer, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });

      if (uploadErr) {
        return NextResponse.json({ error: `Storage error: ${uploadErr.message}` }, { status: 500 });
      }

      const { data: urlData } = admin.storage.from('product-images').getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    // Log the generate action
    try {
      await createAdminClient().from('ai_enhance_logs').insert({
        ip,
        restaurant_id: restaurantId,
        type: 'generate',
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ url: imageUrl, engine });
  } catch (err) {
    logger.error('Generate route error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
