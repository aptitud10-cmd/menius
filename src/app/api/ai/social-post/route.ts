export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { allowed } = checkRateLimit(`ai-social:${tenant.userId}`, { limit: 30, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Límite alcanzado. Intenta en unos minutos.' }, { status: 429 });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) return NextResponse.json({ error: 'IA no configurada.' }, { status: 503 });

    const { platform, postType, customPrompt } = await request.json();

    const supabase = createClient();
    const [{ data: restaurant }, { data: topProducts }, { data: recentReviews }] = await Promise.all([
      supabase.from('restaurants').select('name, slug, description, address').eq('id', tenant.restaurantId).maybeSingle(),
      supabase
        .from('products')
        .select('name, price, description, is_featured')
        .eq('restaurant_id', tenant.restaurantId)
        .eq('is_active', true)
        .order('sort_order')
        .limit(8),
      supabase
        .from('reviews')
        .select('rating, comment, customer_name')
        .eq('restaurant_id', tenant.restaurantId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const restaurantName = restaurant?.name ?? 'Mi Restaurante';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const menuUrl = `${appUrl}/r/${restaurant?.slug ?? ''}`;
    const productList = (topProducts ?? []).map((p) => `${p.name} ($${p.price})`).join(', ');
    const avgRating = (recentReviews ?? []).length > 0
      ? ((recentReviews ?? []).reduce((s, r) => s + r.rating, 0) / (recentReviews ?? []).length).toFixed(1)
      : null;

    const platformRules: Record<string, string> = {
      instagram: `- Máximo 2200 caracteres pero ideal 150-200
- Usa emojis estratégicamente (no exageres)
- Incluye 15-20 hashtags relevantes separados del texto principal
- Tono visual y aspiracional
- Incluye un CTA claro (link en bio, swipe up, etc.)`,
      facebook: `- Máximo 500 caracteres ideal
- Tono más conversacional y community-driven
- Incluye 3-5 hashtags máximo
- Haz preguntas para generar engagement
- Incluye el link directo al menú`,
      twitter: `- Máximo 280 caracteres ESTRICTO
- Directo y punchy
- 1-3 hashtags máximo
- Incluye el link al menú si hay espacio`,
      whatsapp: `- Mensaje corto y directo para broadcast/estado
- Usa emojis para separar secciones
- Incluye el link al menú
- Formato informal y personal`,
      tiktok: `- Caption corto y llamativo (máximo 150 caracteres)
- Usa trending hashtags de comida
- Incluye un hook que genere curiosidad
- Tono Gen-Z friendly pero profesional`,
    };

    const typeLabels: Record<string, string> = {
      promo: 'Promoción o descuento especial',
      new_dish: 'Nuevo platillo en el menú',
      daily_special: 'Especial del día',
      behind_scenes: 'Detrás de cámaras / proceso de preparación',
      customer_review: 'Destacar reseña de cliente',
      general: 'Post general del restaurante',
      event: 'Evento especial o celebración',
      story: 'Historia/anécdota del restaurante',
    };

    const prompt = `Eres un community manager experto en marketing gastronómico para redes sociales.

Genera un post para "${restaurantName}" en ${platform ?? 'instagram'}.

CONTEXTO:
- Tipo de post: ${typeLabels[postType] ?? postType ?? 'Post general'}
- Productos populares: ${productList || 'No disponible'}
- Rating promedio: ${avgRating ?? 'Sin reseñas'}
- Link al menú: ${menuUrl}
${restaurant?.description ? `- Descripción del restaurante: ${restaurant.description}` : ''}
${customPrompt ? `- Instrucciones del usuario: ${customPrompt}` : ''}

REGLAS PARA ${(platform ?? 'instagram').toUpperCase()}:
${platformRules[platform] ?? platformRules.instagram}

FORMATO DE RESPUESTA (JSON estricto, sin markdown):
{
  "caption": "El texto/caption del post completo, listo para copiar y pegar",
  "hashtags": "Los hashtags separados por espacio (si aplica para la plataforma)",
  "imageIdea": "Descripción breve de qué imagen/foto acompañaría bien este post",
  "bestTime": "Mejor hora para publicar este tipo de contenido (ej: '12:00-13:00' o '18:00-20:00')",
  "tip": "Un tip profesional breve para maximizar el alcance de este post"
}

REGLAS GENERALES:
- Escribe en español
- Tono profesional pero cercano y auténtico
- Menciona productos específicos cuando sea natural
- NO uses texto genérico o cliché
- Adapta el contenido al estilo de cada red social
- El contenido debe generar engagement (likes, comentarios, compartidos)`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const geminiData = await res.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    try {
      const parsed = JSON.parse(rawText);
      return NextResponse.json({
        caption: parsed.caption ?? '',
        hashtags: parsed.hashtags ?? '',
        imageIdea: parsed.imageIdea ?? '',
        bestTime: parsed.bestTime ?? '',
        tip: parsed.tip ?? '',
      });
    } catch {
      return NextResponse.json({ error: 'Error parseando respuesta de IA', raw: rawText.slice(0, 500) }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 },
    );
  }
}
