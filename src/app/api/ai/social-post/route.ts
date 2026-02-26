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

    const { platform, postType, customPrompt, locale: reqLocale } = await request.json();

    const supabase = createClient();
    const [{ data: restaurant }, { data: topProducts }, { data: recentReviews }] = await Promise.all([
      supabase.from('restaurants').select('name, slug, description, address, locale').eq('id', tenant.restaurantId).maybeSingle(),
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

    const locale = reqLocale ?? restaurant?.locale ?? 'es';
    const en = locale === 'en';

    const restaurantName = restaurant?.name ?? (en ? 'My Restaurant' : 'Mi Restaurante');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    const menuUrl = `${appUrl}/r/${restaurant?.slug ?? ''}`;
    const productList = (topProducts ?? []).map((p) => `${p.name} ($${p.price})`).join(', ');
    const avgRating = (recentReviews ?? []).length > 0
      ? ((recentReviews ?? []).reduce((s, r) => s + r.rating, 0) / (recentReviews ?? []).length).toFixed(1)
      : null;

    const platformRules: Record<string, string> = en ? {
      instagram: `- Max 2200 chars but ideal 150-200\n- Use emojis strategically (don't overdo)\n- Include 15-20 relevant hashtags separated from main text\n- Visual and aspirational tone\n- Include a clear CTA (link in bio, swipe up, etc.)`,
      facebook: `- Max 500 chars ideal\n- Conversational and community-driven tone\n- Include 3-5 hashtags max\n- Ask questions for engagement\n- Include direct menu link`,
      twitter: `- Max 280 chars STRICT\n- Direct and punchy\n- 1-3 hashtags max\n- Include menu link if space allows`,
      whatsapp: `- Short and direct broadcast/status message\n- Use emojis to separate sections\n- Include menu link\n- Informal and personal format`,
      tiktok: `- Short catchy caption (max 150 chars)\n- Use trending food hashtags\n- Include a curiosity hook\n- Gen-Z friendly but professional tone`,
    } : {
      instagram: `- Máximo 2200 caracteres pero ideal 150-200\n- Usa emojis estratégicamente (no exageres)\n- Incluye 15-20 hashtags relevantes separados del texto principal\n- Tono visual y aspiracional\n- Incluye un CTA claro (link en bio, swipe up, etc.)`,
      facebook: `- Máximo 500 caracteres ideal\n- Tono más conversacional y community-driven\n- Incluye 3-5 hashtags máximo\n- Haz preguntas para generar engagement\n- Incluye el link directo al menú`,
      twitter: `- Máximo 280 caracteres ESTRICTO\n- Directo y punchy\n- 1-3 hashtags máximo\n- Incluye el link al menú si hay espacio`,
      whatsapp: `- Mensaje corto y directo para broadcast/estado\n- Usa emojis para separar secciones\n- Incluye el link al menú\n- Formato informal y personal`,
      tiktok: `- Caption corto y llamativo (máximo 150 caracteres)\n- Usa trending hashtags de comida\n- Incluye un hook que genere curiosidad\n- Tono Gen-Z friendly pero profesional`,
    };

    const typeLabels: Record<string, string> = en ? {
      promo: 'Promotion or special discount',
      new_dish: 'New dish on the menu',
      daily_special: 'Daily special',
      behind_scenes: 'Behind the scenes / preparation process',
      customer_review: 'Highlight customer review',
      general: 'General restaurant post',
      event: 'Special event or celebration',
      story: 'Restaurant story / anecdote',
    } : {
      promo: 'Promoción o descuento especial',
      new_dish: 'Nuevo platillo en el menú',
      daily_special: 'Especial del día',
      behind_scenes: 'Detrás de cámaras / proceso de preparación',
      customer_review: 'Destacar reseña de cliente',
      general: 'Post general del restaurante',
      event: 'Evento especial o celebración',
      story: 'Historia/anécdota del restaurante',
    };

    const prompt = en
      ? `You are an expert social media community manager for restaurant marketing.

Generate a post for "${restaurantName}" on ${platform ?? 'instagram'}.

CONTEXT:
- Post type: ${typeLabels[postType] ?? postType ?? 'General post'}
- Popular products: ${productList || 'Not available'}
- Average rating: ${avgRating ?? 'No reviews'}
- Menu link: ${menuUrl}
${restaurant?.description ? `- Restaurant description: ${restaurant.description}` : ''}
${customPrompt ? `- User instructions: ${customPrompt}` : ''}

RULES FOR ${(platform ?? 'instagram').toUpperCase()}:
${platformRules[platform] ?? platformRules.instagram}

RESPONSE FORMAT (strict JSON, no markdown):
{
  "caption": "The full post text/caption, ready to copy and paste",
  "hashtags": "Hashtags separated by space (if applicable for the platform)",
  "imageIdea": "Brief description of what image/photo would complement this post",
  "bestTime": "Best time to publish this type of content (e.g. '12:00-13:00' or '18:00-20:00')",
  "tip": "A brief professional tip to maximize this post's reach"
}

GENERAL RULES:
- Write in English
- Professional but warm and authentic tone
- Mention specific products when natural
- Do NOT use generic or cliché text
- Adapt content to each social network's style
- Content should drive engagement (likes, comments, shares)`
      : `Eres un community manager experto en marketing gastronómico para redes sociales.

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
