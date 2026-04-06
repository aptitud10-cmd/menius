export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';

const logger = createLogger('ai-describe');

// Only allow fetching images from trusted storage domains to prevent SSRF
const ALLOWED_IMAGE_HOSTS = [
  'supabase.co',
  'supabase.in',
  'supabase.com',
  'amazonaws.com',
  'cloudflare.com',
  'googleusercontent.com',
  'menius.app',
  'menius.co',
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    return ALLOWED_IMAGE_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { allowed } = await checkRateLimitAsync(`ai-describe:${tenant.userId}`, { limit: 30, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Límite alcanzado. Intenta más tarde.' }, { status: 429 });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    let imageBase64: string | null = null;
    let mimeType = 'image/jpeg';
    let imageUrl: string | null = null;
    let locale = 'es';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      locale = (formData.get('locale') as string | null) ?? 'es';

      if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString('base64');
      mimeType = file.type;
    } else {
      const body = await request.json();
      imageUrl = body.imageUrl as string | null;
      locale = body.locale ?? 'es';

      if (!imageUrl) {
        return NextResponse.json({ error: 'imageUrl or image file required' }, { status: 400 });
      }

      if (!isAllowedImageUrl(imageUrl)) {
        return NextResponse.json({ error: 'imageUrl must point to a trusted storage domain' }, { status: 400 });
      }

      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!imgRes.ok) {
        return NextResponse.json({ error: 'Could not fetch image URL' }, { status: 400 });
      }
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      imageBase64 = imgBuffer.toString('base64');
      mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    }

    const isEn = locale === 'en';

    const prompt = isEn
      ? `You are an expert restaurant menu copywriter. Analyze this food photograph and return a JSON object with these exact fields:

{
  "name": "Appetizing dish name (2-4 words, title case)",
  "shortDesc": "Menu description (max 120 chars, sensory and appetizing, present tense)",
  "longDesc": "Social media caption (2-3 sentences, evocative and mouthwatering, include texture, aroma, flavor notes)",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "tags": ["tag1", "tag2"],
  "cuisine": "Detected cuisine type (Mexican/Italian/American/etc)"
}

Rules:
- Be specific, not generic. "Crispy golden chicken with smoky chipotle glaze" > "Chicken dish"
- shortDesc must be ≤120 characters
- ingredients should list 3-6 key visible ingredients
- tags should be 2-3 short labels like "spicy", "vegan", "signature"
- Return ONLY valid JSON, no markdown, no explanation`
      : `Eres un experto en redacción de menús de restaurante. Analiza esta fotografía de comida y devuelve un objeto JSON con estos campos exactos:

{
  "name": "Nombre atractivo del plato (2-4 palabras, mayúsculas en palabras principales)",
  "shortDesc": "Descripción para el menú (máx 120 caracteres, sensorial y apetitosa, tiempo presente)",
  "longDesc": "Caption para redes sociales (2-3 oraciones, evocadora y que abra el apetito, incluye textura, aroma, sabor)",
  "ingredients": ["ingrediente1", "ingrediente2", "ingrediente3"],
  "tags": ["etiqueta1", "etiqueta2"],
  "cuisine": "Tipo de cocina detectado (Mexicana/Italiana/Americana/etc)"
}

Reglas:
- Sé específico, no genérico. "Pollo crocante con glaseado chipotle ahumado" > "Plato de pollo"
- shortDesc debe tener ≤120 caracteres
- ingredients debe listar 3-6 ingredientes clave visibles
- tags deben ser 2-3 etiquetas cortas como "picante", "vegano", "signature"
- Devuelve SOLO JSON válido, sin markdown, sin explicación`;

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
      } as any,
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let parsed: Record<string, unknown>;
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: 'Could not parse AI response', raw: rawText },
        { status: 422 }
      );
    }

    return NextResponse.json({
      name: parsed.name ?? '',
      shortDesc: parsed.shortDesc ?? '',
      longDesc: parsed.longDesc ?? '',
      ingredients: parsed.ingredients ?? [],
      tags: parsed.tags ?? [],
      cuisine: parsed.cuisine ?? '',
    });
  } catch (err) {
    logger.error('Describe route error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
