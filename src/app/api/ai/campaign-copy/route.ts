export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { allowed } = checkRateLimit(`ai-campaign:${tenant.userId}`, { limit: 20, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Límite alcanzado. Intenta en unos minutos.' }, { status: 429 });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) return NextResponse.json({ error: 'IA no configurada.' }, { status: 503 });

    const { campaignType, audience, restaurantName, customPrompt, locale: reqLocale } = await request.json();

    const supabase = createClient();
    const [{ data: topProducts }, { data: recentReviews }, { data: restaurant }] = await Promise.all([
      supabase
        .from('products')
        .select('name, price, is_featured')
        .eq('restaurant_id', tenant.restaurantId)
        .eq('is_active', true)
        .order('sort_order')
        .limit(10),
      supabase
        .from('reviews')
        .select('rating, comment')
        .eq('restaurant_id', tenant.restaurantId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('restaurants')
        .select('locale')
        .eq('id', tenant.restaurantId)
        .maybeSingle(),
    ]);

    const locale = reqLocale ?? restaurant?.locale ?? 'es';
    const en = locale === 'en';

    const productList = (topProducts ?? []).map((p) => `${p.name} ($${p.price})`).join(', ');
    const avgRating = (recentReviews ?? []).length > 0
      ? ((recentReviews ?? []).reduce((s, r) => s + r.rating, 0) / (recentReviews ?? []).length).toFixed(1)
      : null;

    const audienceLabels: Record<string, string> = en ? {
      all: 'All customers',
      vip: 'VIP customers (5+ orders)',
      inactive: 'Inactive customers (30+ days without ordering)',
      recent: 'Recent customers (last 7 days)',
      big_spenders: 'Big spenders ($100+ spent)',
    } : {
      all: 'Todos los clientes',
      vip: 'Clientes VIP (5+ pedidos)',
      inactive: 'Clientes inactivos (30+ días sin ordenar)',
      recent: 'Clientes recientes (últimos 7 días)',
      big_spenders: 'Grandes compradores ($100+ gastados)',
    };

    const typeLabels: Record<string, string> = en ? {
      promo: 'Promotion / Discount',
      reactivation: 'Reactivate inactive customers',
      new_product: 'New product on the menu',
      vip_thanks: 'Thank you to loyal customers',
      seasonal: 'Seasonal / holiday campaign',
    } : {
      promo: 'Promoción / Descuento',
      reactivation: 'Reactivar clientes inactivos',
      new_product: 'Nuevo producto en el menú',
      vip_thanks: 'Agradecimiento a clientes frecuentes',
      seasonal: 'Campaña de temporada / festiva',
    };

    const langRule = en
      ? '- Write in English\n- Professional but warm tone, like a friend recommending something\n- Do NOT use technical jargon\n- Subject should create curiosity or urgency\n- Body should be concise, each paragraph max 2 sentences\n- Mention specific products when relevant\n- CTA should be a clear, direct action'
      : '- Escribe en español\n- Tono profesional pero cercano, como un amigo que te recomienda algo\n- NO uses jerga técnica ni palabras rebuscadas\n- El asunto debe generar curiosidad o urgencia\n- El cuerpo debe ser conciso, cada párrafo max 2 oraciones\n- Menciona productos específicos cuando sea relevante\n- El CTA debe ser una acción clara y directa';

    const prompt = en
      ? `You are an expert email marketing copywriter for restaurants.

Generate an email campaign for "${restaurantName}".

CONTEXT:
- Campaign type: ${typeLabels[campaignType] ?? campaignType ?? 'General promotion'}
- Audience: ${audienceLabels[audience] ?? audience ?? 'All customers'}
- Popular products: ${productList || 'Not available'}
- Average rating: ${avgRating ?? 'No reviews yet'}
${customPrompt ? `- Additional user instructions: ${customPrompt}` : ''}

RESPONSE FORMAT (strict JSON, no markdown):
{
  "subject": "Email subject (use emojis, max 60 chars, include {nombre} or {restaurante} as variables)",
  "body": "Email body (2-3 short paragraphs, use {nombre}, {restaurante}, {total_ordenes}, {total_gastado} as variables, warm and personal tone, subtle urgency)",
  "cta": "CTA button text (max 4 words, clear action)"
}

RULES:
${langRule}`
      : `Eres un copywriter experto en email marketing para restaurantes.

Genera una campaña de email para "${restaurantName}".

CONTEXTO:
- Tipo de campaña: ${typeLabels[campaignType] ?? campaignType ?? 'Promoción general'}
- Audiencia: ${audienceLabels[audience] ?? audience ?? 'Todos los clientes'}
- Productos populares: ${productList || 'No disponible'}
- Rating promedio: ${avgRating ?? 'Sin reseñas aún'}
${customPrompt ? `- Instrucciones adicionales del usuario: ${customPrompt}` : ''}

FORMATO DE RESPUESTA (JSON estricto, sin markdown):
{
  "subject": "Asunto del email (usa emojis, max 60 caracteres, incluye {nombre} o {restaurante} como variables)",
  "body": "Cuerpo del email (2-3 párrafos cortos, usa {nombre}, {restaurante}, {total_ordenes}, {total_gastado} como variables, tono cálido y cercano, con un sentido de urgencia sutil)",
  "cta": "Texto del botón CTA (max 4 palabras, acción clara)"
}

REGLAS:
${langRule}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const geminiData = await res.json();
    const rawText = (geminiData?.candidates?.[0]?.content?.parts ?? [])
      .filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text ?? '')
      .join('') || '';

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      return NextResponse.json({
        subject: parsed.subject ?? '',
        body: parsed.body ?? '',
        cta: parsed.cta ?? 'Ver menú',
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
