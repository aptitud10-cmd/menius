export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { buildFoodPrompt, analyzeIngredients } from '@/lib/ai/food-prompt';

const logger = createLogger('admin-regenerate-images');

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1200;

export type RegenEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; processed: number; total: number; generated: number; failed: number; currentBatch: string }
  | { type: 'done'; processed: number; total: number; generated: number; failed: number }
  | { type: 'error'; message: string };

function sseChunk(data: RegenEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  // ─── Auth: must be the restaurant's tenant ────────────────────────────────
  const tenant = await getTenant();
  if (!tenant) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { restaurantId } = body as { restaurantId?: string };

  if (!restaurantId) {
    return new Response('restaurantId requerido', { status: 400 });
  }

  // Only allow regenerating images for the caller's own restaurant
  if (restaurantId !== tenant.restaurantId) {
    return new Response('Sin acceso a este restaurante', { status: 403 });
  }

  // Rate limit: max 3 bulk regenerations per restaurant per day
  const { allowed: rateLimitAllowed } = await checkRateLimitAsync(
    `bulk-regen:${tenant.restaurantId}`,
    { limit: 3, windowSec: 86400 },
  );
  if (!rateLimitAllowed) {
    return new Response('Límite de regeneraciones masivas alcanzado (3/día). Vuelve mañana.', { status: 429 });
  }

  const geminiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  const falKey = (process.env.FAL_API_KEY ?? '').trim();

  if (!geminiKey && !falKey) {
    return new Response('Se requiere GEMINI_API_KEY o FAL_API_KEY', { status: 503 });
  }

  const adminSupabase = createAdminClient();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: RegenEvent) => {
        try {
          controller.enqueue(sseChunk(event));
        } catch {
          // client disconnected
        }
      };

      try {
        // ─── Fetch all products ────────────────────────────────────────────
        const { data: products, error: prodErr } = await adminSupabase
          .from('products')
          .select('id, name, description, category_id')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true);

        if (prodErr || !products) {
          send({ type: 'error', message: prodErr?.message ?? 'Error al obtener productos' });
          controller.close();
          return;
        }

        // ─── Fetch categories (id → name map) ─────────────────────────────
        const { data: categories } = await adminSupabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurantId);

        const catMap = new Map<string, string>();
        for (const cat of categories ?? []) catMap.set(cat.id, cat.name);

        // ─── Fetch style anchors (category_name → { style, anchor_url }) ──
        const { data: anchors } = await adminSupabase
          .from('style_anchors')
          .select('category_name, style, anchor_url')
          .eq('restaurant_id', restaurantId);

        const anchorStyleMap = new Map<string, string | null>();
        const anchorUrlMap = new Map<string, string | null>();
        for (const a of anchors ?? []) {
          anchorStyleMap.set(a.category_name, a.style ?? null);
          anchorUrlMap.set(a.category_name, (a as any).anchor_url ?? null);
        }

        const total = products.length;
        let processed = 0;
        let generated = 0;
        let failed = 0;

        send({ type: 'start', total });
        logger.info('Starting bulk regeneration', { restaurantId, total, engine: falKey ? 'fal.ai+gemini-fallback' : 'gemini' });

        // ─── Lazy-init AI clients ──────────────────────────────────────────
        let ai: any = null;
        if (geminiKey) {
          const { GoogleGenAI } = await import('@google/genai');
          ai = new GoogleGenAI({ apiKey: geminiKey });
        }

        let falClient: any = null;
        if (falKey) {
          const falModule = await import('@fal-ai/client');
          falClient = falModule.fal;
          falClient.config({ credentials: falKey });
        }

        // ─── Helper: fetch remote image as base64 ─────────────────────────
        const urlToBase64 = async (url: string): Promise<string> => {
          const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          const buf = await res.arrayBuffer();
          return Buffer.from(buf).toString('base64');
        };

        // ─── Helper: generate with fal.ai ─────────────────────────────────
        const generateWithFal = async (
          product: { id: string; name: string; description?: string | null },
          prompt: string,
          anchorUrl: string | null,
          categoryName: string | null,
        ): Promise<string | null> => {
          if (!falClient) return null;

          try {
            if (anchorUrl) {
              // ── Kontext: image-to-image with style anchor ──────────────
              // Keep prompt clean — no finalPrompt concat, to avoid conflicting
              // lighting/angle instructions that cause Kontext to ignore the anchor.
              const kontextPrompt = [
                `Replace the food subject in the reference image with: "${product.name}"${product.description ? ` (${product.description})` : ''}.`,
                `The new food must look completely different from the original — do NOT copy or blend the original food subject.`,
                product.description ? `Visible ingredients: ${product.description} — all must be clearly identifiable in the final image.` : '',
                `KEEP EXACTLY: background color and texture, lighting direction and color temperature, shadow depth, camera angle, color grading, plate and surface style, overall mood and atmosphere.`,
                `CHANGE ONLY: the food subject itself.`,
                `Photorealistic commercial food photograph — NOT CGI, NOT illustration.`,
                `New subject centered, occupying 60–70% of the frame.`,
              ].filter(Boolean).join(' ');

              const result = await falClient.subscribe('fal-ai/flux-pro/kontext', {
                input: {
                  prompt: kontextPrompt,
                  image_url: anchorUrl,
                  num_images: 1,
                  output_format: 'jpeg',
                  guidance_scale: 5.5,
                  safety_tolerance: '5',
                },
              });
              const imgUrl = result?.data?.images?.[0]?.url ?? result?.images?.[0]?.url;
              if (imgUrl) return urlToBase64(imgUrl);
              return null;

            } else {
              // ── nano-banana-2: best photoreal food model, single image in bulk ──
              const result = await falClient.subscribe('fal-ai/nano-banana-2', {
                input: {
                  prompt,
                  aspect_ratio: '1:1',
                  output_resolution: '2K',
                  num_images: 1,
                },
              });
              const images: Array<{ url: string }> = result?.data?.images ?? result?.images ?? [];
              if (images.length === 0) return null;
              return urlToBase64(images[0].url);
            }
          } catch (falErr) {
            logger.warn('fal.ai generation failed', {
              productId: product.id,
              error: falErr instanceof Error ? falErr.message : String(falErr),
            });
            return null;
          }
        };

        // ─── Helper: generate with Gemini (fallback) ──────────────────────
        const generateWithGemini = async (prompt: string, productId: string): Promise<string | null> => {
          if (!ai) return null;

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseModalities: ['TEXT', 'IMAGE'] as any } as any,
            });
            const parts = (response as any).candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) return part.inlineData.data;
            }
          } catch (flashErr) {
            logger.warn('gemini-2.5-flash-image failed, trying gemini-3-pro-image-preview', {
              productId,
              error: flashErr instanceof Error ? flashErr.message : String(flashErr),
            });
          }

          try {
            const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseModalities: ['TEXT', 'IMAGE'] as any } as any,
            });
            const parts = (response as any).candidates?.[0]?.content?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) return part.inlineData.data;
            }
          } catch (proErr) {
            logger.warn('gemini-3-pro-image-preview fallback also failed', {
              productId,
              error: proErr instanceof Error ? proErr.message : String(proErr),
            });
          }

          return null;
        };

        // ─── Process in parallel batches ──────────────────────────────────
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = products.slice(i, i + BATCH_SIZE);
          const batchNames = batch.map(p => p.name).join(', ');

          send({ type: 'progress', processed, total, generated, failed, currentBatch: batchNames });

          const results = await Promise.allSettled(
            batch.map(async (product) => {
              const categoryName = catMap.get(product.category_id) ?? null;
              const anchorStyle = categoryName ? (anchorStyleMap.get(categoryName) ?? null) : null;
              const anchorUrl = categoryName ? (anchorUrlMap.get(categoryName) ?? null) : null;

              // Ingredient analysis (Flash structuring) — only when description is rich
              let ingredientAnalysis = null;
              if (geminiKey && product.description && product.description.length >= 40) {
                ingredientAnalysis = await analyzeIngredients(product.name, product.description, geminiKey).catch(() => null);
              }

              const prompt = buildFoodPrompt({
                productName: product.name,
                description: product.description,
                category: categoryName,
                style: anchorStyle,
                ingredientAnalysis,
              });

              try {
                let imageBase64: string | null = null;

                // ─── PRIMARY: fal.ai (Kontext w/ anchor OR Flux Pro v1.1) ─
                if (falClient) {
                  imageBase64 = await generateWithFal(product, prompt, anchorUrl, categoryName);
                  if (!imageBase64) {
                    logger.warn('fal.ai returned no image, trying Gemini fallback', { productId: product.id });
                  }
                }

                // ─── FALLBACK: Gemini ──────────────────────────────────────
                if (!imageBase64) {
                  imageBase64 = await generateWithGemini(prompt, product.id);
                }

                if (!imageBase64) {
                  logger.warn('All engines returned no image', { productId: product.id, name: product.name });
                  return false;
                }

                const buffer = Buffer.from(imageBase64, 'base64');
                const fileName = `admin-regen/${restaurantId}/${product.id}-${Date.now()}.jpg`;

                const { error: uploadError } = await adminSupabase.storage
                  .from('product-images')
                  .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true,
                  });

                if (uploadError) {
                  logger.warn('Upload failed', { productId: product.id, error: uploadError.message });
                  return false;
                }

                const { data: urlData } = adminSupabase.storage
                  .from('product-images')
                  .getPublicUrl(fileName);

                const { error: updateError } = await adminSupabase
                  .from('products')
                  .update({ image_url: urlData.publicUrl })
                  .eq('id', product.id);

                if (updateError) {
                  logger.warn('DB update failed', { productId: product.id, error: updateError.message });
                  return false;
                }

                return true;
              } catch (err) {
                logger.warn('Image generation failed', {
                  productId: product.id,
                  name: product.name,
                  error: err instanceof Error ? err.message : String(err),
                });
                return false;
              }
            })
          );

          for (const result of results) {
            processed++;
            if (result.status === 'fulfilled' && result.value) generated++;
            else failed++;
          }

          send({ type: 'progress', processed, total, generated, failed, currentBatch: '' });

          if (i + BATCH_SIZE < total) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        send({ type: 'done', processed, total, generated, failed });
        logger.info('Bulk regeneration complete', { restaurantId, total, generated, failed });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error interno';
        logger.error('Bulk regeneration error', { restaurantId, error: message });
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
