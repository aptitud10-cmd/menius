import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';

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

    const apiKey = process.env.GEMINI_API_KEY;
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

    const prompt = `You are an expert at reading restaurant menus. Analyze this menu image and extract ALL items you can identify.

${langInstruction}

Return a valid JSON array. Each item should have:
- "category": The section/category name (e.g. "Entradas", "Platos fuertes", "Bebidas", "Postres", "Appetizers", "Main Course", etc.)
- "name": The dish name exactly as written
- "description": A brief description if visible, or generate a short appetizing one based on the name (1 sentence max)
- "price": The numeric price (number only, no currency symbol). If no price is visible, use 0.

IMPORTANT RULES:
- Extract EVERY item you can read, even if partially visible
- Group items by their category/section
- If a category is not clear, use "General"
- Return ONLY the JSON array, no markdown, no explanation
- Price must be a number (e.g. 12.99 not "$12.99")

Example format:
[
  {"category": "Entradas", "name": "Guacamole", "description": "Aguacate fresco con tomate y cilantro", "price": 8.99},
  {"category": "Platos fuertes", "name": "Tacos al Pastor", "description": "Tres tacos con piña y cebolla", "price": 12.99}
]`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ]);

    const responseText = result.response.text();

    let items: Array<{ category: string; name: string; description: string; price: number }>;

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

    const sanitized = items
      .filter((item) => item.name && typeof item.name === 'string')
      .map((item) => ({
        category: String(item.category || 'General').slice(0, 100),
        name: String(item.name).slice(0, 150),
        description: String(item.description || '').slice(0, 500),
        price: typeof item.price === 'number' ? Math.max(0, item.price) : 0,
      }));

    return NextResponse.json({
      items: sanitized,
      count: sanitized.length,
    });
  } catch (err: any) {
    console.error('Menu OCR error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error procesando la imagen del menú' },
      { status: 500 }
    );
  }
}
