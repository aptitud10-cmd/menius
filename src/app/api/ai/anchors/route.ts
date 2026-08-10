export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-anchors');

/**
 * Checks an image before it becomes a category's style reference.
 *
 * Anchors are themselves AI-generated, and Kontext is instructed to preserve the
 * reference's plate, surface and lighting — so a defect in the anchor is
 * inherited by every dish in that category rather than staying a one-off.
 *
 * Only flags defects that actually propagate: visible camera gear, solid food
 * served in a drinking glass, hands, text. Ordinary "not the prettiest photo"
 * is left alone — that is the owner's taste, not a defect.
 *
 * Returns a human-readable reason, or null when the image is usable. Fails open:
 * if the check itself errors the anchor is accepted, since blocking on an
 * unrelated outage would be worse than the occasional bad reference.
 */
async function findAnchorDefect(imageUrl: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) return null;

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;
    const base64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: contentType, data: base64 } },
            {
              text: `This image is about to become the style reference for an entire restaurant menu category. Every future dish photo in that category will copy its plate, surface and lighting.

Answer ONLY with JSON: {"usable": boolean, "reason": string}

Mark usable:false ONLY if you can see any of these, since each one would be copied onto every dish:
- photography equipment in frame (studio light, softbox, reflector, light stand, camera, tripod)
- solid food served inside a drinking glass, tumbler or cocktail glass (a glass is fine when the product itself is a drink)
- human hands or people
- text, logos or watermarks

Otherwise usable:true. Do NOT judge how appetising or well-composed it is — only these specific defects. "reason" must be one short sentence in Spanish naming what you saw.`,
            },
          ],
        },
      ],
    });

    const raw = (response as { text?: string }).text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const verdict = JSON.parse(match[0]) as { usable?: boolean; reason?: string };
    if (verdict.usable === false) {
      const reason = String(verdict.reason ?? '').slice(0, 200);
      logger.info('Anchor rejected', { imageUrl, reason });
      return reason
        ? `Esta imagen no sirve como referencia: ${reason}`
        : 'Esta imagen no sirve como referencia de estilo.';
    }
    return null;
  } catch (err) {
    logger.warn('Anchor validation failed, accepting anchor', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// GET /api/ai/anchors — list all anchors for current restaurant
export async function GET() {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('style_anchors')
      .select('id, category_name, anchor_url, style, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .order('category_name');

    if (error) {
      logger.error('Error fetching anchors', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ anchors: data ?? [] });
  } catch (err) {
    logger.error('GET anchors error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/ai/anchors — upsert anchor for a category
export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { category_name, anchor_url, style } = body;

    if (!category_name?.trim() || !anchor_url?.trim()) {
      return NextResponse.json(
        { error: 'category_name y anchor_url son requeridos' },
        { status: 400 }
      );
    }

    // Validate anchor_url: must be a public HTTP/HTTPS URL.
    // The URL gets fetched server-side when generating AI images (SSRF risk if unchecked).
    const ALLOWED_ANCHOR_HOSTS = [
      'supabase.co', 'supabase.in', 'supabase.com',
      'amazonaws.com', 'cloudflare.com', 'googleusercontent.com',
      'menius.app', 'menius.co',
    ];
    try {
      const parsed = new URL(String(anchor_url).trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
      const host = parsed.hostname;
      const isAllowed = ALLOWED_ANCHOR_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
      if (!isAllowed) {
        return NextResponse.json(
          { error: 'anchor_url debe apuntar al storage de Menius o a un proveedor de almacenamiento confiable' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'anchor_url inválido' }, { status: 400 });
    }

    // An anchor propagates to every future image in its category, so a defective
    // one is not a single bad photo — it is a bad photo repeated N times.
    // Buccaneer's "Farm Fresh Eggs" anchor showed scrambled egg served in a
    // cocktail glass with two studio lights in frame, and Kontext, told to keep
    // the reference's plate and lighting, reproduced both across the category.
    const defect = await findAnchorDefect(anchor_url.trim());
    if (defect) {
      return NextResponse.json(
        { error: defect, rejected: true },
        { status: 422 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('style_anchors')
      .upsert(
        {
          restaurant_id: tenant.restaurantId,
          category_name: category_name.trim(),
          anchor_url: anchor_url.trim(),
          style: style ?? null,
        },
        { onConflict: 'restaurant_id,category_name' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Error upserting anchor', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('Anchor upserted', { restaurantId: tenant.restaurantId, category: category_name });
    return NextResponse.json({ anchor: data });
  } catch (err) {
    logger.error('POST anchor error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE /api/ai/anchors?category=Beverages — remove anchor for a category
export async function DELETE(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category_name = searchParams.get('category');

    if (!category_name) {
      return NextResponse.json({ error: 'Parámetro category requerido' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('style_anchors')
      .delete()
      .eq('restaurant_id', tenant.restaurantId)
      .eq('category_name', category_name);

    if (error) {
      logger.error('Error deleting anchor', { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('Anchor deleted', { restaurantId: tenant.restaurantId, category: category_name });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('DELETE anchor error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
