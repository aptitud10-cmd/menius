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

    const platformDNA: Record<string, string> = en ? {
      instagram: `INSTAGRAM DNA:
- Hook rule: first sentence must stop the scroll — no brand name, no "we are proud". Start with emotion, curiosity, or a bold statement.
- Ideal length: 150-220 chars for the caption body (short paragraphs, air between them)
- Emojis: use 2-4 purposefully — one at the start, one mid-text, one near CTA
- Storytelling structure: Hook → Context/Story → Emotion → CTA
- CTA: "Link in bio 🔗" or "Order now at the link in our bio"
- Hashtags (15-20): mix of niche (#ChilaquilesVerdes), mid (#ComidaMexicana), broad (#Foodie). Separate from caption with a line break.
- Voice: aspirational, warm, behind-the-counter intimacy`,
      facebook: `FACEBOOK DNA:
- Hook: open with a question OR a bold statement that invites a response
- Ideal length: 80-150 chars — Facebook rewards conversation, not monologues
- Tone: neighborhood friends talking, not a brand announcement
- End with a direct question to drive comments (e.g., "¿Cuál es tu favorita?")
- Hashtags: 3-5 max, woven naturally
- Include menu link directly in the post
- Voice: community bulletin board — personal, local, inclusive`,
      twitter: `TWITTER/X DNA:
- STRICT 280 chars max — every word must earn its place
- Hook = the whole tweet. No buildup.
- Use one sharp observation, one bold claim, or one irresistible offer
- 1-2 hashtags max (only if they add discovery value)
- Menu link if space allows
- Voice: witty, direct, zero corporate speak`,
      whatsapp: `WHATSAPP DNA:
- Broadcast message — feels like a personal text from a friend who owns a restaurant
- Structure: one bold line → body (2-3 lines) → link → emoji sign-off
- Use line breaks and emojis as visual separators
- Max 3 paragraphs — people read this on mobile in 10 seconds
- Voice: warm, exclusive ("just for our regulars"), personal
- Include menu link`,
      tiktok: `TIKTOK DNA:
- Caption max 150 chars — it's a visual platform, caption supports the video
- Hook: curiosity gap or bold food fact
- 3-5 trending food hashtags (#FoodTok #ComidaTikTok)
- Voice: Gen-Z authentic, zero polish, real talk
- End with a controversial or opinionated statement to drive comments`,
    } : {
      instagram: `ADN DE INSTAGRAM:
- Regla del hook: la primera frase DETIENE el scroll — sin nombre del restaurante, sin "nos complace presentar". Empieza con emoción, curiosidad o una afirmación audaz.
- Longitud ideal: 150-220 caracteres para el cuerpo (párrafos cortos, espacio entre ellos)
- Emojis: usa 2-4 con propósito — uno al inicio, uno en el medio, uno cerca del CTA
- Estructura narrativa: Hook → Contexto/Historia → Emoción → CTA
- CTA: "Link en nuestra bio 🔗" o "Ordena ahora desde el link en bio"
- Hashtags (15-20): mezcla de nicho (#ChilaquilesVerdes), medio (#ComidaMexicana), amplio (#Foodie). Sepáralos del caption con un salto de línea.
- Voz: aspiracional, cálida, con intimidad de detrás del mostrador`,
      facebook: `ADN DE FACEBOOK:
- Hook: abre con una pregunta O una afirmación audaz que invite a responder
- Longitud ideal: 80-150 caracteres — Facebook premia la conversación, no los monólogos
- Tono: amigos del barrio hablando, no un anuncio de marca
- Termina con una pregunta directa para generar comentarios (ej: "¿Cuál es tu favorita?")
- Hashtags: 3-5 máximo, tejidos naturalmente
- Incluye el link al menú directamente en el post
- Voz: tablón de avisos del barrio — personal, local, inclusivo`,
      twitter: `ADN DE TWITTER/X:
- MÁXIMO 280 caracteres estrictos — cada palabra debe ganarse su lugar
- El hook ES el tweet completo. Sin preámbulos.
- Usa una observación aguda, una afirmación audaz o una oferta irresistible
- 1-2 hashtags máximo (solo si agregan valor de descubrimiento)
- Link al menú si hay espacio
- Voz: ingenioso, directo, cero habla corporativa`,
      whatsapp: `ADN DE WHATSAPP:
- Mensaje de difusión — se siente como un texto personal de un amigo que tiene un restaurante
- Estructura: una línea impactante → cuerpo (2-3 líneas) → link → despedida con emoji
- Usa saltos de línea y emojis como separadores visuales
- Máximo 3 párrafos — la gente lo lee en móvil en 10 segundos
- Voz: cálida, exclusiva ("solo para nuestros clientes"), personal
- Incluye el link al menú`,
      tiktok: `ADN DE TIKTOK:
- Caption máximo 150 caracteres — es plataforma visual, el caption apoya el video
- Hook: brecha de curiosidad o dato audaz sobre la comida
- 3-5 hashtags de tendencia alimentaria (#FoodTok #ComidaTikTok)
- Voz: auténtico Gen-Z, cero pulido, habla real
- Termina con una afirmación controversial u opinionada para generar comentarios`,
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

    const topReviewQuotes = (recentReviews ?? [])
      .filter(r => r.comment && r.rating >= 4)
      .slice(0, 2)
      .map(r => `"${r.comment}" — ${r.customer_name || (en ? 'customer' : 'cliente')}`)
      .join('\n');

    const prompt = en
      ? `You are the world's #1 restaurant social media content creator — a fusion of Gary Vaynerchuk's platform-native instinct and Ann Handley's storytelling mastery.

Gary Vaynerchuk's rule you live by: "The first line of every post is your entire marketing budget. If it doesn't stop the scroll, nothing else matters."
Ann Handley's rule you live by: "Write to one person. Make them feel something. Then ask them to do something."

You are creating a ${(platform ?? 'instagram').toUpperCase()} post for "${restaurantName}".

RESTAURANT DATA (use this to make the post feel real and specific, not generic):
- Post goal: ${typeLabels[postType] ?? postType ?? 'General post'}
- Signature dishes: ${productList || 'Not available'}
- Customer rating: ${avgRating ? `${avgRating}/5 ⭐` : 'No reviews yet'}
- Menu link: ${menuUrl}
${restaurant?.description ? `- About the restaurant: ${restaurant.description}` : ''}
${topReviewQuotes ? `- Real customer words (use their voice, not marketing speak):\n${topReviewQuotes}` : ''}
${customPrompt ? `- Owner's specific request: ${customPrompt}` : ''}

${platformDNA[platform ?? 'instagram'] ?? platformDNA.instagram}

CONTENT EXCELLENCE RULES (non-negotiable):
- HOOK FIRST: Line 1 must create an emotion — hunger, curiosity, nostalgia, FOMO, or delight. Never start with the restaurant name.
- BE SPECIFIC: "Our crispy chilaquiles with tomatillo sauce" beats "our delicious food" every time.
- ONE MESSAGE: Each post has ONE core emotion. Don't try to say everything.
- AUTHENTIC VOICE: Write like the owner is texting their best customer — warm, real, zero corporate.
- NEVER use: "We are pleased to announce", "Check out our...", "Don't miss out", "Limited time only"
- USE instead: sensory language (sizzling, golden, tender, smoky), storytelling moments, community language

IMAGE DESCRIPTION RULE: For imageIdea, write a cinematic, specific scene description that can be used to generate an AI photograph. Include: exact dish, plating style, lighting, background, and mood. Example: "Close-up of golden-brown carnitas tacos on a handmade corn tortilla, fresh cilantro and white onion on top, dim warm candlelight, dark rustic wood table, shallow depth of field, food photography style."

RESPONSE FORMAT (strict JSON, no markdown):
{
  "caption": "The complete post text, ready to copy-paste. Paragraphs separated by \\n\\n.",
  "hashtags": "Hashtags space-separated (only if platform uses them)",
  "imageIdea": "Cinematic AI image prompt: exact dish, plating, lighting, background, mood, photography style",
  "bestTime": "Best day + time to post for maximum reach (e.g., 'Friday 12:00-13:00')",
  "tip": "One sharp, specific insight to maximize this post's performance — not generic advice"
}`
      : `Eres el/la creador/a de contenido para restaurantes #1 del mundo en redes sociales — una fusión de la instancia plataforma-nativa de Gary Vaynerchuk y el dominio narrativo de Ann Handley.

La regla de Gary Vaynerchuk que vives: "La primera línea de cada post es todo tu presupuesto de marketing. Si no detiene el scroll, nada más importa."
La regla de Ann Handley que vives: "Escribe para una persona. Hazla sentir algo. Luego pídele que haga algo."

Estás creando un post para ${(platform ?? 'instagram').toUpperCase()} de "${restaurantName}".

DATOS DEL RESTAURANTE (úsalos para que el post se sienta real y específico, no genérico):
- Objetivo del post: ${typeLabels[postType] ?? postType ?? 'Post general'}
- Platillos estrella: ${productList || 'No disponible'}
- Rating de clientes: ${avgRating ? `${avgRating}/5 ⭐` : 'Sin reseñas aún'}
- Link al menú: ${menuUrl}
${restaurant?.description ? `- Sobre el restaurante: ${restaurant.description}` : ''}
${topReviewQuotes ? `- Palabras reales de clientes (usa su voz, no lenguaje de marketing):\n${topReviewQuotes}` : ''}
${customPrompt ? `- Petición específica del dueño: ${customPrompt}` : ''}

${platformDNA[platform ?? 'instagram'] ?? platformDNA.instagram}

REGLAS DE EXCELENCIA DE CONTENIDO (no negociables):
- HOOK PRIMERO: La línea 1 debe crear una emoción — hambre, curiosidad, nostalgia, FOMO o deleite. Nunca empieces con el nombre del restaurante.
- SÉ ESPECÍFICO: "Nuestros chilaquiles crujientes con salsa de tomatillo" supera a "nuestra deliciosa comida" siempre.
- UN MENSAJE: Cada post tiene UNA emoción central. No intentes decir todo.
- VOZ AUTÉNTICA: Escribe como si el dueño le estuviera escribiendo un mensaje a su mejor cliente — cálido, real, cero corporativo.
- NUNCA uses: "Nos complace anunciar", "Visítanos", "No te lo pierdas", "Por tiempo limitado"
- USA en cambio: lenguaje sensorial (crujiente, dorado, tierno, ahumado), momentos narrativos, lenguaje de comunidad

REGLA DE DESCRIPCIÓN DE IMAGEN: Para imageIdea, escribe una descripción cinematográfica y específica que pueda usarse para generar una fotografía con IA. Incluye: platillo exacto, estilo de presentación, iluminación, fondo y ambiente. Ejemplo: "Primer plano de tacos de carnitas doradas en tortilla de maíz hecha a mano, cilantro fresco y cebolla blanca encima, luz de vela cálida y tenue, mesa de madera rústica oscura, profundidad de campo superficial, estilo fotografía gastronómica profesional."

FORMATO DE RESPUESTA (JSON estricto, sin markdown):
{
  "caption": "El texto completo del post, listo para copiar y pegar. Párrafos separados por \\n\\n.",
  "hashtags": "Hashtags separados por espacio (solo si la plataforma los usa)",
  "imageIdea": "Prompt cinematográfico para IA: platillo exacto, presentación, iluminación, fondo, ambiente, estilo fotográfico",
  "bestTime": "Mejor día + hora para publicar con máximo alcance (ej: 'Viernes 12:00-13:00')",
  "tip": "Un insight agudo y específico para maximizar el rendimiento de este post — no consejo genérico"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 2048,
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
