export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-import-menu');

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { allowed } = await checkRateLimitAsync(`ocr:${tenant.userId}`, { limit: 10, windowSec: 3600 });
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

    const prompt = `You are a world-class restaurant menu analyst and food copywriter. Analyze this menu image and extract a COMPLETE structured representation of every item.

${langInstruction}

First, identify the CUISINE TYPE of this restaurant (e.g. Mexican, Italian, American Diner, Japanese, Indian, Mediterranean, etc.). Use this knowledge to write better descriptions and categorize items correctly.

Return a valid JSON object with this structure:
{
  "cuisine": "the detected cuisine type",
  "items": [ ...array of items... ]
}

Each item in the "items" array MUST have these fields:
- "category": Broad category name (see CATEGORY GROUPING rules below)
- "name": Dish name exactly as written on the menu
- "description": If the menu shows a description, use it. If NOT visible, write a short, appetizing, professional description (1 sentence, max 15 words) that mentions the key ingredients and cooking method. Write like a food critic — make it sound delicious. Examples: "Crispy golden pancakes stacked high with warm maple syrup" or "Tender grilled chicken breast glazed with honey-chipotle sauce"
- "price": Base numeric price (number only, no currency symbol). Use 0 if not visible
- "variants": Array of size/portion options ONLY if the menu shows different sizes with different prices (e.g. "Small/Large", "4pcs/8pcs"). Each: {"name": "Large", "price_delta": 3.00}. Empty [] if none
- "extras": Array of optional add-ons ONLY if clearly marked with "+" or extra price on the menu. Each: {"name": "Extra cheese", "price": 2.50}. Empty [] if none
- "modifier_groups": Array of required choices ONLY if the menu shows "Choose your...", "Pick one:", "Comes with..." options. Each group: {"name": "Choose protein", "selection_type": "single", "is_required": true, "options": [{"name": "Chicken", "price_delta": 0}, {"name": "Shrimp", "price_delta": 3.00}]}. selection_type is "multi" only if customer can pick multiple. Empty [] if none
- "dietary": Array from ONLY these values: ["vegetarian", "vegan", "gluten-free", "spicy", "popular"]. Detect from symbols (V, VG, GF, 🌶, ⭐, ♦), highlighted/boxed items, "Chef's pick", "Best seller", "Most popular", or text hints. Items marked as bestsellers or featured = "popular". Empty [] if none

CATEGORY GROUPING (critical):
- Use BROAD categories. Maximum 8-10 total for the entire menu.
- Merge related subsections into ONE parent category.
- Examples: "Buttermilk Pancakes" + "French Toast" + "Waffles" = "Breakfast". "Caesar Salad" + "Greek Salad" = "Salads". "Burgers" + "Sandwiches" + "Wraps" = "Sandwiches & Wraps". "Margaritas" + "Beer" + "Wine" = "Drinks".
- Standard categories: Breakfast, Appetizers, Salads, Soups, Entrees, Pasta, Seafood, Sandwiches & Wraps, Tacos & Burritos, Pizza, Burgers, Sides, Desserts, Beverages, Kids Menu, Combos.
- If a section doesn't fit, use a simple name (e.g. "House Specials").

OTHER RULES:
- Extract EVERY item, even partially visible
- "price_delta" = additional cost over base (0 if same price)
- Do NOT invent variants/extras/modifiers that aren't on the menu
- Return ONLY the JSON object, no markdown, no explanation
- All prices must be numbers (12.99 not "$12.99")

Example output:
{
  "cuisine": "Mexican",
  "items": [
    {
      "category": "Breakfast",
      "name": "Huevos Rancheros",
      "description": "Farm-fresh eggs on crispy tortilla with smoky ranchero sauce and refried beans",
      "price": 9.99,
      "variants": [],
      "extras": [{"name": "Guacamole", "price": 2.50}],
      "modifier_groups": [{"name": "Egg style", "selection_type": "single", "is_required": true, "options": [{"name": "Sunny side up", "price_delta": 0}, {"name": "Scrambled", "price_delta": 0}]}],
      "dietary": ["gluten-free", "popular"]
    },
    {
      "category": "Beverages",
      "name": "Fresh Lemonade",
      "description": "Hand-squeezed lemonade with fresh mint and a touch of agave",
      "price": 4.99,
      "variants": [{"name": "Regular", "price_delta": 0}, {"name": "Large", "price_delta": 2.00}],
      "extras": [],
      "modifier_groups": [],
      "dietary": ["vegan"]
    }
  ]
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 65536,
        thinkingConfig: { thinkingBudget: 0 },
      } as Parameters<typeof genAI.getGenerativeModel>[0]['generationConfig'],
    });

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
    let cuisine = 'General';

    try {
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.items)) {
        items = parsed.items;
        cuisine = parsed.cuisine || 'General';
      } else {
        items = [];
      }
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
      cuisine,
    });
  } catch (err: unknown) {
    logger.error('Menu OCR error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error procesando la imagen del menú' },
      { status: 500 }
    );
  }
}
