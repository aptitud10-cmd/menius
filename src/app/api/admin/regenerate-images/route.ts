export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';
import { buildFoodPrompt } from '@/lib/ai/food-prompt';

const logger = createLogger('admin-regenerate-images');

const BATCH_SIZE = 5;

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

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return new Response('GEMINI_API_KEY no configurado', { status: 503 });
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

        // ─── Fetch style anchors (category_name → style) ──────────────────
        const { data: anchors } = await adminSupabase
          .from('style_anchors')
          .select('category_name, style')
          .eq('restaurant_id', restaurantId);

        const anchorStyleMap = new Map<string, string | null>();
        for (const a of anchors ?? []) anchorStyleMap.set(a.category_name, a.style ?? null);

        const total = products.length;
        let processed = 0;
        let generated = 0;
        let failed = 0;

        send({ type: 'start', total });
        logger.info('Starting bulk regeneration', { restaurantId, total });

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        // ─── Process in parallel batches ──────────────────────────────────
        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = products.slice(i, i + BATCH_SIZE);
          const batchNames = batch.map(p => p.name).join(', ');

          send({ type: 'progress', processed, total, generated, failed, currentBatch: batchNames });

          const results = await Promise.allSettled(
            batch.map(async (product) => {
              const categoryName = catMap.get(product.category_id) ?? null;
              const anchorStyle = categoryName ? (anchorStyleMap.get(categoryName) ?? null) : null;

              const prompt = buildFoodPrompt({
                productName: product.name,
                description: product.description,
                category: categoryName,
                style: anchorStyle,
              });

              try {
                // ─── Imagen 4 — text-only, no fallback chain ───────────────
                const imagenResponse = await ai.models.generateImages({
                  model: 'imagen-4.0-generate-001',
                  prompt,
                  config: { numberOfImages: 1, aspectRatio: '1:1' },
                });

                const firstImage = imagenResponse.generatedImages?.[0];
                if (!firstImage?.image?.imageBytes) {
                  logger.warn('No image bytes returned', { productId: product.id, name: product.name });
                  return false;
                }

                const buffer = Buffer.from(firstImage.image.imageBytes as string, 'base64');
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
