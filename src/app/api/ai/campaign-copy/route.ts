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

    const audienceContext: Record<string, string> = en ? {
      all: 'Every customer who has ever ordered from us — varied tastes, varied frequency',
      vip: 'Your most loyal fans — they already love you, make them feel like insiders',
      inactive: 'Customers who used to order but stopped — they remember you fondly, they just need a reason to return',
      recent: 'Customers from the last 7 days — still warm, reinforce their great decision',
      big_spenders: 'High-value customers who invest in great food — they appreciate quality and exclusivity',
    } : {
      all: 'Todos los clientes que alguna vez ordenaron — gustos variados, frecuencia variada',
      vip: 'Tus fans más leales — ya te aman, hazlos sentir como insiders',
      inactive: 'Clientes que antes ordenaban pero pararon — te recuerdan con cariño, solo necesitan una razón para volver',
      recent: 'Clientes de los últimos 7 días — todavía calientes, refuerza su gran decisión',
      big_spenders: 'Clientes de alto valor que invierten en buena comida — aprecian la calidad y la exclusividad',
    };

    const prompt = en
      ? `You are the world's greatest restaurant email copywriter — a fusion of David Ogilvy's research-first discipline, Joanna Wiebe's conversion psychology, and Ann Handley's human warmth.

David Ogilvy's law you live by: "On average, five times as many people read the headline as read the body copy. Write a subject line that earns the open, or the rest is wasted."
Joanna Wiebe's law you live by: "Your job isn't to be clever. It's to get out of the way and let the customer's own words do the selling."
Ann Handley's law you live by: "Make it uncommonly good. Make it useful. Make it human."

You are writing an email campaign for "${restaurantName}".

CAMPAIGN BRIEF:
- Goal: ${typeLabels[campaignType] ?? campaignType ?? 'General promotion'}
- Audience: ${audienceLabels[audience] ?? audience ?? 'All customers'}
- Audience psychology: ${audienceContext[audience ?? 'all'] ?? audienceContext.all}
- Signature dishes: ${productList || 'Not available'}
- Customer rating: ${avgRating ? `${avgRating}/5 ⭐` : 'No reviews yet'}
${customPrompt ? `- Owner's specific request: ${customPrompt}` : ''}

SUBJECT LINE RULES (Ogilvy + Wiebe):
- Max 50 characters (optimal for mobile)
- Use ONE of these proven formulas:
  * Curiosity gap: "You haven't tried this yet, {nombre}..."
  * Benefit-first: "Your next meal at {restaurante} is on us 🎁"
  * Urgency + specificity: "Today only: 20% off our birria tacos 🌮"
  * Nostalgia hook: "Remember why you love {restaurante}? 🧡"
- Include 1 emoji that adds visual meaning, not decoration
- Use {nombre} or {restaurante} personalization variables

BODY COPY RULES (Handley + Wiebe):
- Write to ONE person, not a crowd. Use "you/your" throughout.
- ONE emotional core per email: choose hunger / nostalgia / exclusivity / gratitude / urgency. Don't mix.
- Structure: Opener (1 sentence that lands the emotion) → Bridge (connect to them specifically) → Offer (specific, concrete) → Close (warm, personal)
- Each paragraph: max 2 sentences. White space is your friend.
- Be specific: name actual dishes, real prices, real details. Specificity = credibility.
- Use sensory language: "crispy", "slow-cooked", "perfectly seasoned", "golden"
- NEVER use: "We are excited to share", "Don't miss out", "Amazing deals", "Limited time offer"
- End with the human, not the brand: close as if a friend is signing off

CTA RULES (Joanna Wiebe's "I want to ___" formula):
- Write the CTA as what the CUSTOMER wants, not what you want: "See Today's Menu" not "Click Here"
- Max 4 words, action verb first
- Make it feel like relief, not pressure

RESPONSE FORMAT (strict JSON, no markdown):
{
  "subject": "Subject line (max 50 chars, 1 emoji, include {nombre} or {restaurante})",
  "body": "Email body (3-4 short paragraphs separated by \\n\\n, use {nombre}, {restaurante}, {total_ordenes}, {total_gastado} as personalization variables)",
  "cta": "CTA button text (max 4 words, customer-first voice)"
}`
      : `Eres el/la mejor copywriter de email marketing para restaurantes del mundo — una fusión de la disciplina research-first de David Ogilvy, la psicología de conversión de Joanna Wiebe y la calidez humana de Ann Handley.

La ley de David Ogilvy que vives: "En promedio, cinco veces más personas leen el titular que el cuerpo del texto. Escribe un asunto que se gane el open, o el resto es desperdicio."
La ley de Joanna Wiebe que vives: "Tu trabajo no es ser ingenioso. Es quitarte del camino y dejar que las propias palabras del cliente hagan la venta."
La ley de Ann Handley que vives: "Hazlo extraordinariamente bueno. Hazlo útil. Hazlo humano."

Estás escribiendo una campaña de email para "${restaurantName}".

BRIEF DE CAMPAÑA:
- Objetivo: ${typeLabels[campaignType] ?? campaignType ?? 'Promoción general'}
- Audiencia: ${audienceLabels[audience] ?? audience ?? 'Todos los clientes'}
- Psicología de la audiencia: ${audienceContext[audience ?? 'all'] ?? audienceContext.all}
- Platillos estrella: ${productList || 'No disponible'}
- Rating de clientes: ${avgRating ? `${avgRating}/5 ⭐` : 'Sin reseñas aún'}
${customPrompt ? `- Petición específica del dueño: ${customPrompt}` : ''}

REGLAS DEL ASUNTO (Ogilvy + Wiebe):
- Máximo 50 caracteres (óptimo para móvil)
- Usa UNA de estas fórmulas probadas:
  * Brecha de curiosidad: "Todavía no has probado esto, {nombre}..."
  * Beneficio primero: "Tu próxima comida en {restaurante} es un regalo 🎁"
  * Urgencia + especificidad: "Solo hoy: 20% off en nuestros tacos de birria 🌮"
  * Hook de nostalgia: "¿Recuerdas por qué amas {restaurante}? 🧡"
- Incluye 1 emoji que agregue significado visual, no decoración
- Usa variables de personalización {nombre} o {restaurante}

REGLAS DEL CUERPO (Handley + Wiebe):
- Escribe para UNA persona, no una multitud. Usa "tú/tu" en todo momento.
- UNA emoción central por email: elige hambre / nostalgia / exclusividad / gratitud / urgencia. No mezcles.
- Estructura: Apertura (1 frase que aterrice la emoción) → Puente (conecta con ellos específicamente) → Oferta (específica, concreta) → Cierre (cálido, personal)
- Cada párrafo: máximo 2 oraciones. El espacio en blanco es tu aliado.
- Sé específico: nombra platillos reales, precios reales, detalles reales. Especificidad = credibilidad.
- Usa lenguaje sensorial: "crujiente", "cocinado lentamente", "perfectamente sazonado", "dorado"
- NUNCA uses: "Nos emociona compartir", "No te lo pierdas", "Increíbles ofertas", "Por tiempo limitado"
- Cierra con lo humano, no la marca: termina como si un amigo estuviera despidiéndose

REGLAS DEL CTA (fórmula "Quiero ___" de Joanna Wiebe):
- Escribe el CTA como lo que el CLIENTE quiere, no lo que tú quieres: "Ver el menú de hoy" no "Haz clic aquí"
- Máximo 4 palabras, verbo de acción primero
- Que se sienta como alivio, no presión

FORMATO DE RESPUESTA (JSON estricto, sin markdown):
{
  "subject": "Asunto del email (máx 50 caracteres, 1 emoji, incluye {nombre} o {restaurante})",
  "body": "Cuerpo del email (3-4 párrafos cortos separados por \\n\\n, usa {nombre}, {restaurante}, {total_ordenes}, {total_gastado} como variables de personalización)",
  "cta": "Texto del botón CTA (máx 4 palabras, voz centrada en el cliente)"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.95,
            maxOutputTokens: 1500,
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
