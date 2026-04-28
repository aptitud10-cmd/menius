export const dynamic = 'force-dynamic';
export const maxDuration = 800; // up to ~13 min for 15 cats × 3 variants

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { MASTER_PROMPTS } from '@/lib/anchors/master-anchors';

const logger = createLogger('admin-master-anchors-generate');

const VARIANTS_PER_CATEGORY = 3;

/**
 * Generate N candidate images per category using flux-pro/v1.1-ultra,
 * upload each to storage, and return the candidate URLs grouped by slug.
 * The admin then picks one per category from the calibration UI.
 *
 * Body (optional):
 *   { slugs?: string[] }   — limit generation to specific slugs
 *                            (defaults to all slugs missing a master anchor)
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: 'fal.ai is not configured. Set FAL_API_KEY in env.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const requestedSlugs: string[] | undefined = Array.isArray(body?.slugs)
    ? body.slugs.filter((s: unknown): s is string => typeof s === 'string')
    : undefined;

  const supabase = createAdminClient();
  const { data: anchors, error: listErr } = await supabase
    .from('master_style_anchors')
    .select('id, category_slug, anchor_url');

  if (listErr) {
    logger.error('Failed to list master anchors', { error: listErr.message });
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const slugsToGenerate = (anchors ?? [])
    .filter((a) => {
      if (requestedSlugs && requestedSlugs.length > 0) {
        return requestedSlugs.includes(a.category_slug);
      }
      // Default: only generate for slugs missing an anchor
      return !a.anchor_url;
    })
    .map((a) => a.category_slug)
    .filter((slug) => MASTER_PROMPTS[slug]);

  if (slugsToGenerate.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'No categories need generation. Pass { slugs: [...] } to force.',
      candidates: {},
    });
  }

  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: falKey });

  const sharp = (await import('sharp')).default;

  type CandidateMap = Record<string, string[]>;
  const candidates: CandidateMap = {};
  const failures: Array<{ slug: string; reason: string }> = [];

  async function generateVariant(slug: string, prompt: string, v: number): Promise<string | null> {
    try {
      const result = await (fal as { subscribe: (...args: unknown[]) => Promise<unknown> })
        .subscribe('fal-ai/flux-pro/v1.1-ultra', {
          input: {
            prompt,
            aspect_ratio: '4:3',
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            output_format: 'jpeg',
            safety_tolerance: '5',
          },
        });

      const imgUrl = (result as { images?: Array<{ url?: string }> })?.images?.[0]?.url;
      if (!imgUrl) {
        failures.push({ slug, reason: `variant ${v + 1}: no image URL returned` });
        return null;
      }

      const res = await fetch(imgUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        failures.push({ slug, reason: `variant ${v + 1}: download failed (${res.status})` });
        return null;
      }
      const rawBuffer = Buffer.from(await res.arrayBuffer());
      const optimized = await sharp(rawBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const fileName = `master-anchors/candidates/${slug}-${Date.now()}-${v + 1}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, optimized, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadErr) {
        failures.push({ slug, reason: `variant ${v + 1}: upload failed (${uploadErr.message})` });
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('Variant generation failed', { slug, variant: v + 1, error: message });
      failures.push({ slug, reason: `variant ${v + 1}: ${message}` });
      return null;
    }
  }

  for (const slug of slugsToGenerate) {
    const prompt = MASTER_PROMPTS[slug];
    // Generate the 3 variants for this category IN PARALLEL.
    // (Categories themselves stay sequential to avoid fal.ai rate limits.)
    const variantResults = await Promise.all(
      Array.from({ length: VARIANTS_PER_CATEGORY }, (_, v) => generateVariant(slug, prompt, v)),
    );
    candidates[slug] = variantResults.filter((url): url is string => url !== null);
  }

  logger.info('Master anchor candidate generation complete', {
    requested: slugsToGenerate.length,
    candidatesGenerated: Object.values(candidates).reduce((sum, arr) => sum + arr.length, 0),
    failures: failures.length,
    by: admin.user.email,
  });

  return NextResponse.json({
    ok: true,
    candidates,
    failures,
  });
}
