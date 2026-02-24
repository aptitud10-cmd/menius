export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-import-menu');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { allowed } = checkRateLimit(`ocr:${tenant.userId}`, { limit: 10, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Límite alcanzado. Intenta en 1 hora.' },
        { status: 429 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini AI no está configurado.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const language = (formData.get('language') as string) || 'es';

    if (!file) {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const langInstruction = language === 'en'
      ? 'The menu is in English. Keep all names and descriptions in English.'
      : 'El menú puede estar en español u otro idioma. Mantén los nombres y descripciones en el idioma original.';

    const prompt = `You are a world-class restaurant menu analyst. Analyze this menu image and extract a COMPLETE structured representation of every item, including variants, extras/add-ons, and dietary information.

${langInstruction}

Return a valid JSON array. Each item MUST have these fields:
- "category": Section name (e.g. "Desayunos", "Entradas", "Platos fuertes", "Bebidas", "Postres")
- "name": Dish name exactly as written
- "description": Brief description if visible, otherwise generate ONE appetizing sentence
- "price": Base numeric price (number only, no currency). Use 0 if not visible
- "variants": Array of size/style options IF the menu shows choices like "Chico/Grande", "4pcs/8pcs", or cooking styles. Each: {"name": "Grande", "price_delta": 3.00}. Empty array [] if none
- "extras": Array of add-ons/extras IF the menu lists them (e.g. "+guacamole $2"). Each: {"name": "Guacamole extra", "price": 2.50}. Empty array [] if none
- "modifier_groups": Array of required choices IF the menu shows "Elige tu..." or "Incluye..." options. Each group: {"name": "Elige proteína", "selection_type": "single", "is_required": true, "options": [{"name": "Pollo", "price_delta": 0}, {"name": "Camarón", "price_delta": 3.00}]}. Empty array [] if none
- "dietary": Array of dietary tags from ONLY these values: ["vegetarian", "vegan", "gluten-free", "spicy", "popular"]. Look for symbols like V, VG, GF, 🌶, ⭐, or text hints. Empty array [] if none

CRITICAL RULES:
- Extract EVERY item, even partially visible ones
- "price_delta" = additional cost over the base price (0 if same price)
- Only create "variants" for size/portion differences with DIFFERENT prices
- Only create "extras" for OPTIONAL add-ons clearly marked with a "+" or extra price
- Only create "modifier_groups" for REQUIRED choices (e.g. "choose your side", "select cooking")
- If a section header exists, use it as category. Otherwise use "General"
- Return ONLY the JSON array, no markdown, no explanation
- All prices must be numbers (12.99 not "$12.99")

Example:
[
  {
    "category": "Desayunos",
    "name": "Huevos Rancheros",
    "description": "Huevos fritos sobre tortilla con salsa roja y frijoles",
    "price": 9.99,
    "variants": [],
    "extras": [{"name": "Guacamole", "price": 2.50}, {"name": "Tocino", "price": 3.00}],
    "modifier_groups": [{"name": "Estilo de huevo", "selection_type": "single", "is_required": true, "options": [{"name": "Estrellados", "price_delta": 0}, {"name": "Revueltos", "price_delta": 0}]}],
    "dietary": ["gluten-free"]
  },
  {
    "category": "Bebidas",
    "name": "Limonada",
    "description": "Limonada natural con hierbabuena",
    "price": 4.99,
    "variants": [{"name": "Chica", "price_delta": 0}, {"name": "Grande", "price_delta": 2.00}],
    "extras": [],
    "modifier_groups": [],
    "dietary": ["vegan"]
  }
]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ]);

    const responseText = result.response.text();

    interface RawVariant { name: string; price_delta: number }
    interface RawExtra { name: string; price: number }
    interface RawModOption { name: string; price_delta: number }
    interface RawModGroup {
      name: string;
      selection_type: string;
      is_required: boolean;
      options: RawModOption[];
    }
    interface RawItem {
      category: string;
      name: string;
      description: string;
      price: number;
      variants?: RawVariant[];
      extras?: RawExtra[];
      modifier_groups?: RawModGroup[];
      dietary?: string[];
    }

    let items: RawItem[];

    try {
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      items = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'No se pudo procesar el menú. Intenta con una foto más clara.' },
        { status: 422 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos en la imagen.' },
        { status: 422 }
      );
    }

    const VALID_DIETARY = ['vegetarian', 'vegan', 'gluten-free', 'spicy', 'popular'];

    const sanitized = items
      .filter((item) => item.name && typeof item.name === 'string')
      .map((item) => ({
        category: String(item.category || 'General').slice(0, 100),
        name: String(item.name).slice(0, 150),
        description: String(item.description || '').slice(0, 500),
        price: typeof item.price === 'number' ? Math.max(0, item.price) : 0,
        variants: (Array.isArray(item.variants) ? item.variants : [])
          .filter((v) => v.name)
          .map((v, i) => ({
            name: String(v.name).slice(0, 100),
            price_delta: typeof v.price_delta === 'number' ? v.price_delta : 0,
            sort_order: i,
          })),
        extras: (Array.isArray(item.extras) ? item.extras : [])
          .filter((e) => e.name)
          .map((e, i) => ({
            name: String(e.name).slice(0, 100),
            price: typeof e.price === 'number' ? Math.max(0, e.price) : 0,
            sort_order: i,
          })),
        modifier_groups: (Array.isArray(item.modifier_groups) ? item.modifier_groups : [])
          .filter((g) => g.name && Array.isArray(g.options) && g.options.length > 0)
          .map((g, gi) => ({
            name: String(g.name).slice(0, 100),
            selection_type: g.selection_type === 'multi' ? 'multi' as const : 'single' as const,
            is_required: Boolean(g.is_required),
            sort_order: gi,
            options: g.options
              .filter((o) => o.name)
              .map((o, oi) => ({
                name: String(o.name).slice(0, 100),
                price_delta: typeof o.price_delta === 'number' ? o.price_delta : 0,
                sort_order: oi,
              })),
          })),
        dietary: (Array.isArray(item.dietary) ? item.dietary : [])
          .filter((d) => VALID_DIETARY.includes(String(d)))
          .map(String),
      }));

    return NextResponse.json({
      items: sanitized,
      count: sanitized.length,
    });
  } catch (err: unknown) {
    logger.error('Menu OCR error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error procesando la imagen del menú' },
      { status: 500 }
    );
  }
}
