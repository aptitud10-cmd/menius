export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimitAsync, getClientIP } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { UUID_RE } from '@/lib/constants';
import {
  heuristicIntent,
  sanitizeIntent,
  mergeIntent,
  buildCatalogueDigest,
  type MenuIntent,
} from '@/lib/menu-intent';
import type { Product, Category } from '@/types';

const logger = createLogger('menu-intent');

/**
 * Translates a diner's natural-language query into a structured menu filter.
 *
 * PUBLIC and UNAUTHENTICATED — anyone with a menu URL can call it, so it burns
 * tokens by definition. Three layers keep that bounded:
 *   1. Rate limit per IP (below).
 *   2. Query length cap — a 2 KB "query" is not a diner.
 *   3. The model call is skipped entirely when the heuristic already resolved
 *      the query, which covers the majority of real searches ("sin gluten",
 *      "lo más pedido", "algo barato").
 *
 * The response is a FILTER, never a product list: the client applies it locally
 * against the catalogue it already has. That keeps the payload tiny and makes it
 * impossible for the model to surface a dish the restaurant doesn't sell.
 */

const RATE_LIMIT = { limit: 12, windowSec: 60 };
const MAX_QUERY_LEN = 200;
/** Under this length a query is a plain dish name — the lexical engine handles it. */
const MIN_MODEL_QUERY_LEN = 12;
const MODEL_TIMEOUT_MS = 3500;

interface IntentResponse {
  intent: MenuIntent;
  /** 'heuristic' when no model call was made — useful for debugging and metrics. */
  source: 'heuristic' | 'model';
}

/** Decides whether the sentence is worth a model round-trip. */
function needsModel(query: string, heuristic: MenuIntent): boolean {
  if (query.trim().length < MIN_MODEL_QUERY_LEN) return false;
  // A multi-word sentence with no signal at all is exactly what the model is for
  // ("something light for my kid"). One that already produced tags or a price
  // band is resolved — spending 600 ms to confirm it is waste.
  const resolved =
    heuristic.requireTags.length > 0 ||
    heuristic.excludeTags.length > 0 ||
    heuristic.price !== null ||
    heuristic.wantsPopular;
  if (resolved) return false;
  return query.trim().split(/\s+/).length >= 3;
}

function buildPrompt(query: string, digest: string, locale: string): string {
  return `Sos el buscador de un menú de restaurante. Traducí el pedido del comensal a un filtro estructurado.

${digest}

Pedido del comensal (idioma: ${locale}): "${query}"

Devolvé SOLO JSON válido con esta forma:
{
  "terms": ["palabras de plato o ingrediente a buscar, en minúscula y sin acentos"],
  "requireTags": ["tags que el plato DEBE tener"],
  "excludeTags": ["tags que el plato NO debe tener"],
  "price": "cheap" | "mid" | "premium" | null,
  "wantsPopular": true | false,
  "categoryHints": ["nombre de categoría del menú si el pedido apunta a una"],
  "reply": "una frase corta y cálida que resuma qué buscaste (máx 100 caracteres)"
}

Tags permitidos (NINGÚN otro): vegetarian, vegan, gluten_free, dairy_free, spicy, contains_nuts, keto, organic, halal, kosher

Reglas:
- Una alergia o un "sin X" SIEMPRE va en excludeTags, nunca en requireTags.
- "terms" son palabras que aparecerían en el nombre de un plato. Conceptos abstractos ("liviano", "para chicos") NO van en terms: expresalos con tags, price o categoryHints.
- Si no hay señal para un campo, dejalo vacío o null. No inventes.
- categoryHints solo con nombres de categoría que figuren arriba.
- "reply" en el idioma del pedido.
- SOLO JSON, sin markdown ni explicación.`;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rate = await checkRateLimitAsync(`menu-intent:${ip}`, RATE_LIMIT);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    const { restaurant_id: restaurantId, query: rawQuery, locale: rawLocale } = body as Record<string, unknown>;

    if (typeof restaurantId !== 'string' || !UUID_RE.test(restaurantId)) {
      return NextResponse.json({ error: 'invalid_restaurant_id' }, { status: 400 });
    }
    if (typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    const query = rawQuery.slice(0, MAX_QUERY_LEN);
    const locale = typeof rawLocale === 'string' && /^[a-z]{2}$/.test(rawLocale) ? rawLocale : 'es';

    // The heuristic always runs and is always the floor: whatever happens with
    // the model, the caller gets at least this.
    const heuristic = heuristicIntent(query);

    if (!needsModel(query, heuristic)) {
      return NextResponse.json<IntentResponse>({ intent: heuristic, source: 'heuristic' });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return NextResponse.json<IntentResponse>({ intent: heuristic, source: 'heuristic' });
    }

    // Catalogue digest — names and tags only. Descriptions would blow the token
    // budget on a 400-item menu and add nothing to intent parsing.
    const db = createAdminClient();
    const [{ data: products }, { data: categories }] = await Promise.all([
      db
        .from('products')
        .select('id, name, category_id, dietary_tags, translations')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .limit(400),
      // select('*') a propósito: categories NO tiene columna `translations` en
      // prod (sí la tiene products), y un select explícito con una columna
      // inexistente devuelve 42703 y mata la búsqueda. Regla #11 de CLAUDE.md.
      db
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    if (!products?.length || !categories?.length) {
      return NextResponse.json<IntentResponse>({ intent: heuristic, source: 'heuristic' });
    }

    const digest = buildCatalogueDigest(
      products as unknown as Product[],
      categories as unknown as Category[],
      locale,
      locale,
    );

    let parsed: unknown = null;
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      // The diner is waiting with a spinner. Past ~3.5 s the heuristic result is
      // a better product than a correct answer nobody stayed for.
      //
      // El race NO cancela la request al modelo (el SDK no expone signal): solo
      // deja de esperarla. La invocación termina en background y se descarta —
      // aceptable porque el costo ya se pagó al enviarla.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: buildPrompt(query, digest, locale) }] }],
          config: { responseMimeType: 'application/json' } as never,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('model timeout')), MODEL_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timer));

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (err) {
      // Model unavailable, slow or returned junk — the heuristic still answers.
      logger.warn('intent model failed, falling back to heuristic', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json<IntentResponse>({ intent: heuristic, source: 'heuristic' });
    }

    const modelIntent = sanitizeIntent(parsed, heuristic);
    const intent = mergeIntent(heuristic, modelIntent);

    return NextResponse.json<IntentResponse>({ intent, source: 'model' });
  } catch (err) {
    logger.error('menu-intent route error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
