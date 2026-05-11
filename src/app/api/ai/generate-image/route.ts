export const dynamic = 'force-dynamic';
export const maxDuration = 180;

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { getEffectivePlanId } from '@/lib/auth/check-plan';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { buildFoodPrompt, getJuiceContainer, getJuiceStyling, analyzeIngredients, buildIngredientSection, checkPromptCoherence } from '@/lib/ai/food-prompt';

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

    // ─── INGREDIENT ANALYSIS (Flash structuring) ─────────────────────────────
    let ingredientAnalysis = null;
    if (!isBanner && description && description.length >= 40) {
      try {
        ingredientAnalysis = await analyzeIngredients(productName, description, apiKey);
      } catch {
        // non-critical — proceed without ingredient analysis
      }
    }

    // ─── BANNER MODE ──────────────────────────────────────────────────────────
    const bannerPrompt = isBanner ? `CRITICAL RULES — strictly enforce: NOT CGI, NOT 3D render, NOT illustration. NO text, NO logos, NO watermarks, NO white patches or artifacts in any corner, NO human hands, NO cooking equipment. Every corner filled with background — no blank white areas.

Award-winning wide-format restaurant banner photograph. Indistinguishable from a professional DSLR photograph. Shot in a real restaurant or professional food photography studio.

RESTAURANT: "${productName}"${description ? ` — ${description}` : ''}.

COMPOSITION: Wide 16:9 horizontal banner. Multiple dishes or food elements spread naturally across the frame. Beautiful layered table scene. Generous empty space on the left third for potential text overlay. Depth of field with bokeh on background elements.

CAMERA: 35mm wide lens, f/4 aperture, ISO 640 — cinematic look with natural film grain.

LIGHTING: Warm inviting restaurant ambiance. Soft directional key light from the left at 45 degrees, gentle fill from the right. Golden tones with warm color temperature (3400K). Appetizing and welcoming mood.

SCENE: Beautifully plated dishes on a restaurant table. Natural textures — linen napkins, wooden table, handcrafted ceramic plates. Candle light or golden-hour window light visible in background.

COLOR SCIENCE: Rich warm tonal depth. Deep shadows with warm amber undertones — not pure black. Highlights golden and inviting. Film-like color rendering, naturally saturated.` : null;

    const prompt = bannerPrompt ?? buildFoodPrompt({
      productName,
      description,
      category,
      style,
      cuisine,
      ingredientAnalysis,
    });

    const aspectRatio = isBanner ? '16:9' : '4:3';

    // ─── COHERENCE CHECK (#4) — validate prompt before expensive generation ───
    let finalPrompt = prompt;
    if (!isBanner && description && description.length >= 30) {
      try {
        const coherence = await checkPromptCoherence(productName, description, prompt, apiKey);
        if (coherence && !coherence.ok && coherence.fixedPrompt) {
          logger.info('Coherence check fixed prompt', {
            productName,
            issues: coherence.issues,
          });
          finalPrompt = coherence.fixedPrompt;
        }
      } catch {
        // non-critical — proceed with original prompt
      }
    }

    // ─── FETCH STYLE ANCHOR (own → master fallback) ──────────────────────────
    let anchorBase64: string | null = null;
    let anchorPublicUrl: string | null = null;
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

      // 3) Keep anchor URL for Kontext (uses public URL directly — better than base64)
      //    Also download as base64 for Gemini fallback which needs inline data
      if (anchorUrl) {
        anchorPublicUrl = anchorUrl;
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
          anchorPublicUrl = null;
        }
      }
    }

    // ─── KONTEXT PROMPT (clean — no finalPrompt to avoid conflicting instructions) ──
    // Kontext needs ONE clear directive: replace the food, keep everything else.
    // Mixing in finalPrompt (which has its own lighting/angle instructions) causes
    // the model to ignore the anchor's visual style — last instruction wins.
    const anchorPrompt = anchorPublicUrl
      ? [
          `Replace the food subject in the reference image with: "${productName}"${description ? ` (${description})` : ''}.`,
          `The new food must look completely different from the original — do NOT copy or blend the original food subject.`,
          description ? `Visible ingredients: ${description} — all must be clearly identifiable in the final image.` : '',
          `KEEP EXACTLY: background color and texture, lighting direction and color temperature, shadow depth, camera angle, color grading, plate and surface style, overall mood and atmosphere.`,
          `CHANGE ONLY: the food subject itself.`,
          `Photorealistic commercial food photograph — NOT CGI, NOT illustration.`,
          `New subject centered, occupying 60–70% of the frame.`,
        ].filter(Boolean).join(' ')
      : null;

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

        if (anchorPublicUrl) {
          // flux-pro/kontext: pass the public URL directly — better than base64 inline.
          // guidance_scale 7.5 forces strong subject replacement while preserving style.
          const kontextResult = await (fal as any).subscribe('fal-ai/flux-pro/kontext', {
            input: {
              prompt: anchorPrompt ?? finalPrompt,
              image_url: anchorPublicUrl,
              num_images: 1,
              output_format: 'jpeg',
              guidance_scale: 5.5,
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
              prompt: finalPrompt,
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
          : [{ role: 'user', parts: [{ text: finalPrompt }] }];

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
