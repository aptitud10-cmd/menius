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

    const { campaignType, audience, restaurantName, customPrompt } = await request.json();

    const supabase = createClient();
    const [{ data: topProducts }, { data: recentReviews }] = await Promise.all([
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
    ]);

    const productList = (topProducts ?? []).map((p) => `${p.name} ($${p.price})`).join(', ');
    const avgRating = (recentReviews ?? []).length > 0
      ? ((recentReviews ?? []).reduce((s, r) => s + r.rating, 0) / (recentReviews ?? []).length).toFixed(1)
      : null;

    const audienceLabels: Record<string, string> = {
      all: 'Todos los clientes',
      vip: 'Clientes VIP (5+ pedidos)',
      inactive: 'Clientes inactivos (30+ días sin ordenar)',
      recent: 'Clientes recientes (últimos 7 días)',
      big_spenders: 'Grandes compradores ($100+ gastados)',
    };

    const typeLabels: Record<string, string> = {
      promo: 'Promoción / Descuento',
      reactivation: 'Reactivar clientes inactivos',
      new_product: 'Nuevo producto en el menú',
      vip_thanks: 'Agradecimiento a clientes frecuentes',
      seasonal: 'Campaña de temporada / festiva',
    };

    const prompt = `Eres un copywriter experto en email marketing para restaurantes.

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
- Escribe en español
- Tono profesional pero cercano, como un amigo que te recomienda algo
- NO uses jerga técnica ni palabras rebuscadas
- El asunto debe generar curiosidad o urgencia
- El cuerpo debe ser conciso, cada párrafo max 2 oraciones
- Menciona productos específicos cuando sea relevante
- El CTA debe ser una acción clara y directa`;

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
