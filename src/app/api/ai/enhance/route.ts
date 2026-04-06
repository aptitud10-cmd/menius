export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { checkRateLimitAsync } from '@/lib/rate-limit';

const logger = createLogger('ai-enhance');

const DEMO_LIMIT = 3; // free demo uses per IP per hour
const AUTH_USER_LIMIT = 30; // authenticated users: max 30 enhancements per hour

async function ipDemoAllowed(ip: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('ai_enhance_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', windowStart);
    return (count ?? 0) < DEMO_LIMIT;
  } catch {
    return true; // fail open for demo
  }
}

async function logEnhance(ip: string, restaurantId: string | null) {
  try {
    await createAdminClient().from('ai_enhance_logs').insert({ ip, restaurant_id: restaurantId });
  } catch { /* non-critical */ }
}

async function enhanceWithFalAi(imageUrl: string, style: string): Promise<string | null> {
  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return null;

  const styleDetails: Record<string, { prompt: string; lighting: string }> = {
    dark_moody: {
      prompt: 'dark moody fine dining aesthetic, dramatic chiaroscuro single-source side lighting at 45 degrees, deep rich shadows with warm amber undertones, dark charcoal slate background, high micro-contrast revealing every texture detail',
      lighting: 'dramatic Rembrandt lighting from the left, deep shadows, moody restaurant atmosphere',
    },
    bright_airy: {
      prompt: 'bright airy natural light photography, large soft north-facing window light, pure white or very light cream background, fresh and inviting, food pops with vibrant colors, clean negative space',
      lighting: 'soft diffused daylight, even and flattering, no harsh shadows',
    },
    natural: {
      prompt: 'warm authentic restaurant ambiance, golden hour natural side lighting, warm wooden surface, cozy and inviting atmosphere, natural color palette, honest and appetizing',
      lighting: 'warm golden hour window light from the left, natural and inviting',
    },
    editorial: {
      prompt: 'Michelin-starred restaurant editorial magazine style, high contrast professional studio three-point lighting, sophisticated artistic plating, award-winning food photography in the style of Saveur magazine, cinematic color grading',
      lighting: 'professional three-point studio setup, high contrast, magazine quality',
    },
    delivery: {
      prompt: 'delivery app optimized product photography, pure clean white background, bright even overhead lighting, vibrant saturated colors, every ingredient clearly visible, professional e-commerce food photography, Uber Eats / DoorDash quality standard',
      lighting: 'bright overhead studio lights, even and shadowless, product-focused',
    },
  };

  const { prompt: stylePrompt, lighting } = styleDetails[style] ?? styleDetails.editorial;

  const enhancementPrompt = `Award-winning professional food photograph. Transform this food photo into a studio-quality image.

STYLE: ${stylePrompt}
LIGHTING: ${lighting}
CAMERA: Hasselblad H6D medium format, 80mm lens, f/2.8, ISO 200. 
MANDATORY: Keep the EXACT same dish, same ingredients, same portion size, same plating arrangement. Do NOT add or remove any food items.
TRANSFORM COMPLETELY: Replace background with professional photography setting. Dramatically improve lighting direction, quality and color. Enrich colors to be vibrant and deeply appetizing. Make textures visible — sauce gloss, herb edges, char marks, steam.
RESULT: Photorealistic DSLR photograph indistinguishable from a $3,000 professional food photo shoot. NOT CGI, NOT illustration, NOT AI-looking.`;

  try {
    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: falKey });

    // Primary: FLUX.2 Pro Edit — multi-reference image editor (best for food enhancement)
    try {
      const result = await (fal as any).subscribe('fal-ai/flux-2-pro/edit', {
        input: {
          image_url: imageUrl,
          prompt: enhancementPrompt,
          guidance_scale: 4.0,
          num_inference_steps: 40,
        },
      });
      const url = (result as any)?.images?.[0]?.url ?? null;
      if (url) return url;
    } catch { /* fall through to secondary model */ }

    // Secondary: FLUX Dev img2img — reliable img2img at high strength
    const result = await (fal as any).subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: imageUrl,
        prompt: enhancementPrompt,
        strength: 0.88,
        num_inference_steps: 35,
        guidance_scale: 4.5,
      },
    });

    return (result as any)?.images?.[0]?.url ?? null;
  } catch (err) {
    logger.warn('fal.ai enhancement failed, falling back to Gemini', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function enhanceWithGemini(imageBase64: string, mimeType: string, style: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) return null;

  const styleDescriptions: Record<string, string> = {
    dark_moody:  'dramatic dark moody fine dining aesthetic — deep rich shadows, chiaroscuro lighting from a single side source, deep dark background',
    bright_airy: 'bright airy natural light aesthetic — soft diffused window light, clean white or light gray background, fresh and inviting',
    natural:     'warm natural restaurant ambiance — golden hour side lighting, warm wooden or stone surface, cozy and authentic',
    editorial:   'editorial magazine quality — high contrast professional studio lighting, sophisticated plating presentation',
    delivery:    'delivery app optimized — pure white clean background, bright overhead even lighting, vibrant appetizing colors',
  };

  const styleDesc = styleDescriptions[style] ?? 'professional food photography studio quality, dramatic and appetizing lighting';

  const prompt = `You are a world-class food photography specialist. I am giving you a real restaurant dish photo. Your task is to regenerate it as a stunning professional food photograph.

CRITICAL RULES:
- Keep the EXACT same dish, ingredients, portion size, and plating arrangement
- Do NOT add or remove any food items
- Do NOT change the actual food — only enhance the presentation environment

ENHANCE:
- Apply ${styleDesc}
- Professional camera: 85mm prime lens, shallow depth of field
- Rich color grading — vibrant, appetizing, never over-processed
- Clean background — remove any distracting elements
- Perfect lighting — no harsh flash, no flat lighting

OUTPUT: A photorealistic, award-winning food photograph. NOT CGI, NOT illustration.`;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    let result = null;

    // Try primary model
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'] as any,
          imageConfig: { aspectRatio: '1:1' } as any,
        } as any,
      });

      const parts = (response as any).candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) { result = part.inlineData.data; break; }
      }
    } catch { /* fall through to next model */ }

    // Note: Imagen 4 is text-to-image only — cannot use it for enhancement
    // (no reference image input supported). Skip fallback to avoid generic output.

    return result;
  } catch (err) {
    logger.error('Gemini enhancement error', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // Auth check — optional (demo works without login, but logs by IP)
    let restaurantId: string | null = null;
    let userId: string | null = null;
    try {
      const { getTenant } = await import('@/lib/auth/get-tenant');
      const tenant = await getTenant();
      restaurantId = tenant?.restaurantId ?? null;
      userId = tenant?.userId ?? null;
    } catch { /* public demo, no auth required */ }

    if (userId) {
      // Authenticated users: per-user rate limit to prevent cost abuse
      const { allowed } = await checkRateLimitAsync(`ai-enhance:${userId}`, { limit: AUTH_USER_LIMIT, windowSec: 3600 });
      if (!allowed) {
        return NextResponse.json(
          { error: `Límite de mejoras alcanzado (${AUTH_USER_LIMIT}/hora). Intenta en 1 hora.` },
          { status: 429 }
        );
      }
    } else {
      // Rate limit demo users by IP
      const allowed = await ipDemoAllowed(ip);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Demo limit reached (3 per hour). Sign up to Menius for unlimited enhancements.' },
          { status: 429 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const style = (formData.get('style') as string | null) ?? 'natural';

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
    const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

    // Optimize original for storage
    let optimizedOriginal: Buffer = buffer;
    try {
      const sharp = (await import('sharp')).default;
      optimizedOriginal = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch { /* use original */ }

    const admin = createAdminClient();
    const prefix = restaurantId ? `r-${restaurantId}` : `demo-${ip.replace(/[^a-z0-9]/gi, '-')}`;
    const ts = Date.now();

    // Upload original
    const originalPath = `ai-enhance/${prefix}/before-${ts}.jpg`;
    const { error: origErr } = await admin.storage
      .from('product-images')
      .upload(originalPath, optimizedOriginal, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });

    if (origErr) {
      logger.warn('Failed to store original', { error: origErr.message });
    }

    const { data: origUrl } = admin.storage.from('product-images').getPublicUrl(originalPath);

    // Try fal.ai first (better quality), then Gemini
    let enhancedBase64: string | null = null;

    const falResult = await enhanceWithFalAi(origUrl.publicUrl, style);
    if (falResult) {
      // fal.ai returns a URL — fetch the image and store it in Supabase
      try {
        const falImageRes = await fetch(falResult, { signal: AbortSignal.timeout(30000) });
        if (falImageRes.ok) {
          const falBuffer = Buffer.from(await falImageRes.arrayBuffer() as ArrayBuffer);
          const enhancedPath = `ai-enhance/${prefix}/after-${ts}.jpg`;
          await admin.storage
            .from('product-images')
            .upload(enhancedPath, falBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
          const { data: enhUrl } = admin.storage.from('product-images').getPublicUrl(enhancedPath);
          await logEnhance(ip, restaurantId);
          return NextResponse.json({
            url: enhUrl.publicUrl,
            originalUrl: origUrl.publicUrl,
            engine: 'fal-ai',
          });
        }
      } catch { /* fetch failed — fall through to Gemini */ }
      // Only mark as used if we successfully returned above; otherwise fall through
    }

    // Gemini fallback (used when fal.ai is unavailable or its result fetch failed)
    const imageBase64 = buffer.toString('base64');
    enhancedBase64 = await enhanceWithGemini(imageBase64, mimeType, style);

    if (!enhancedBase64) {
      return NextResponse.json(
        { error: 'Could not enhance the image. Please try a clearer photo.' },
        { status: 422 }
      );
    }

    const enhancedBuffer = Buffer.from(enhancedBase64, 'base64');
    const enhancedPath = `ai-enhance/${prefix}/after-${ts}.jpg`;

    const { error: enhErr } = await admin.storage
      .from('product-images')
      .upload(enhancedPath, enhancedBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });

    if (enhErr) {
      return NextResponse.json({ error: `Storage error: ${enhErr.message}` }, { status: 500 });
    }

    const { data: enhUrl } = admin.storage.from('product-images').getPublicUrl(enhancedPath);

    await logEnhance(ip, restaurantId);

    return NextResponse.json({
      url: enhUrl.publicUrl,
      originalUrl: origUrl.publicUrl,
      engine: 'gemini',
    });
  } catch (err) {
    logger.error('Enhance route error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
