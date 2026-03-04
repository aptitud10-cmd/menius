export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyAdmin } from '@/lib/auth/verify-admin';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { supabase, user } = auth;
    const { allowed } = checkRateLimit(`admin-ai:${user.id}`, { limit: 40, windowSec: 3600 });
    if (!allowed) return NextResponse.json({ error: 'Límite alcanzado.' }, { status: 429 });

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) return NextResponse.json({ error: 'IA no configurada.' }, { status: 503 });

    const { channel, campaignType, audience, customPrompt } = await request.json();

    const [
      { count: totalRestaurants },
      { count: activeRestaurants },
      { count: trialingRestaurants },
      { data: recentSignups },
    ] = await Promise.all([
      supabase.from('restaurants').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
      supabase.from('restaurants').select('name').order('created_at', { ascending: false }).limit(5),
    ]);

    const platformContext = `
- Plataforma: MENIUS — SaaS de menú digital inteligente para restaurantes
- Total restaurantes registrados: ${totalRestaurants ?? 0}
- Restaurantes activos (pagando): ${activeRestaurants ?? 0}
- Restaurantes en trial: ${trialingRestaurants ?? 0}
- Últimos registros: ${(recentSignups ?? []).map(r => r.name).join(', ') || 'N/A'}
- Planes: Starter ($39/mes), Pro ($79/mes), Business ($149/mes)
- Features principales: Menú digital QR, pedidos online, IA para importar menú, análisis, campañas de email, multi-idioma
- Propuesta de valor: Digitalizar menú en minutos con IA, recibir pedidos online, reducir costos operativos`;

    const audienceLabels: Record<string, string> = {
      all: 'Todos los restaurantes registrados',
      trialing: 'Restaurantes en periodo de prueba (14 días gratis)',
      active: 'Restaurantes con suscripción activa',
      cancelled: 'Restaurantes que cancelaron su suscripción',
      past_due: 'Restaurantes con pago vencido',
      no_products: 'Restaurantes que no han configurado su menú',
      no_orders: 'Restaurantes sin pedidos recientes',
    };

    const isEmail = channel !== 'social' && channel !== 'sms';
    const isSocial = channel === 'social';
    const isSms = channel === 'sms';

    let prompt: string;

    if (isSocial) {
      const platformRules: Record<string, string> = {
        instagram: 'Max 2200 chars, ideal 150-200. Emojis estratégicos. 15-20 hashtags. Tono aspiracional. CTA claro.',
        facebook: 'Max 500 chars. Conversacional. 3-5 hashtags. Preguntas para engagement. Link directo.',
        twitter: 'ESTRICTO 280 chars. Directo y punchy. 1-3 hashtags. Link si cabe.',
        linkedin: 'Profesional y data-driven. 300-600 chars. Stats y resultados. 3-5 hashtags B2B.',
        tiktok: 'Caption max 150 chars. Trending hashtags. Hook de curiosidad. Tono Gen-Z.',
      };

      const typeLabels: Record<string, string> = {
        case_study: 'Caso de éxito de un restaurante',
        feature: 'Destacar una funcionalidad de MENIUS',
        stats: 'Estadísticas impresionantes de la plataforma',
        tips: 'Tips para dueños de restaurantes',
        testimonial: 'Testimonial de cliente satisfecho',
        trend: 'Tendencia de la industria restaurantera',
        behind_scenes: 'Detrás de cámaras de MENIUS',
      };

      prompt = `Eres el director de marketing de MENIUS, la plataforma #1 de menú digital para restaurantes en Latinoamérica. Tienes 10+ años de experiencia en growth marketing para SaaS B2B en la industria restaurantera.

CONTEXTO DE MENIUS:
${platformContext}

TAREA: Genera un post para ${campaignType ?? 'instagram'} de la cuenta oficial de MENIUS.
Tipo de post: ${typeLabels[audience] ?? audience ?? 'General'}
${customPrompt ? `Instrucciones especiales: ${customPrompt}` : ''}

REGLAS PARA ${(campaignType ?? 'instagram').toUpperCase()}:
${platformRules[campaignType] ?? platformRules.instagram}

ESTRATEGIA DE CONTENIDO (aplica siempre):
- El post debe atraer DUEÑOS DE RESTAURANTES a registrarse en MENIUS
- Usa datos reales de la plataforma para credibilidad
- Storytelling > promoción directa
- Pain points comunes: menú desactualizado, pedidos por teléfono, falta de presencia digital, costos de plataformas como UberEats
- Diferenciadores: IA para importar menú en segundos, sin comisiones por pedido, marca propia del restaurante

FORMATO JSON estricto (sin markdown):
{
  "caption": "Texto completo del post listo para publicar",
  "hashtags": "Hashtags relevantes separados por espacio",
  "imageIdea": "Descripción de la imagen/video ideal para acompañar",
  "bestTime": "Mejor hora para publicar (ej: 12:00-13:00)",
  "tip": "Tip profesional para maximizar alcance",
  "hookVariant": "Versión alternativa del primer párrafo para A/B test"
}`;
    } else if (isSms) {
      prompt = `Eres el director de marketing de MENIUS con expertise en SMS marketing B2B.

CONTEXTO: ${platformContext}

Genera un SMS de MENIUS para dueños de restaurantes.
Audiencia: ${audienceLabels[audience] ?? 'Todos'}
${customPrompt ? `Instrucciones: ${customPrompt}` : ''}

REGLAS:
- MÁXIMO 160 caracteres ESTRICTO
- Directo, profesional, con urgencia sutil
- Incluir {restaurante} como variable
- Un CTA claro
- En español

JSON estricto:
{
  "message": "El SMS completo (max 160 chars)",
  "variant": "Versión alternativa para A/B test (max 160 chars)",
  "tip": "Consejo para maximizar respuesta"
}`;
    } else {
      const typeLabels: Record<string, string> = {
        onboarding: 'Onboarding — ayudar al nuevo usuario a configurar todo',
        upgrade: 'Upgrade — motivar a subir de plan con beneficios concretos',
        reactivation: 'Reactivación — traer de vuelta a un usuario inactivo',
        feature_announce: 'Anuncio de nueva función — generar excitement',
        tips: 'Tips y mejores prácticas para usar la plataforma',
        case_study: 'Caso de éxito — mostrar resultados de otro restaurante',
        seasonal: 'Campaña de temporada / festiva',
      };

      prompt = `Eres el CMO de MENIUS, la plataforma líder de menú digital para restaurantes. Combinas la precisión analítica de un growth hacker con el storytelling de un copywriter de clase mundial. Tu estilo es como el de los mejores emails de Shopify, HubSpot y Toast.

CONTEXTO DE LA PLATAFORMA:
${platformContext}

TAREA: Genera una campaña de email de MENIUS → Dueños de restaurantes.
- Tipo: ${typeLabels[campaignType] ?? campaignType ?? 'Tips y mejores prácticas'}
- Audiencia: ${audienceLabels[audience] ?? 'Todos los restaurantes'}
${customPrompt ? `- Instrucciones del admin: ${customPrompt}` : ''}

PRINCIPIOS DE COPYWRITING (nivel experto):
1. SUBJECT LINE: Genera curiosidad o urgencia. Usa números cuando sea posible. Max 60 chars. Emojis con moderación (max 1).
2. BODY: Abre con un pain point o pregunta retórica que resuene. Máximo 3 párrafos cortos. Cada párrafo = 1-2 oraciones. Usa datos específicos, no genéricos. Cierra con beneficio claro.
3. CTA: Verbo de acción + beneficio. Max 5 palabras. Ejemplos top: "Activar pedidos online", "Ver mi menú", "Empezar gratis".
4. TONO: Profesional pero humano. Como un asesor de confianza, no un vendedor. Tutea al lector.
5. VARIABLES: Usa {restaurante} para personalizar con el nombre del restaurante.

FORMATO JSON estricto (sin markdown):
{
  "subject": "Asunto del email (max 60 chars, con emoji opcional)",
  "body": "Cuerpo completo del email (2-3 párrafos cortos, usa \\n para separar párrafos)",
  "cta": "Texto del botón CTA (max 5 palabras)",
  "subjectVariant": "Versión alternativa del asunto para A/B test",
  "preheader": "Texto de preheader (lo que se ve en preview del inbox, max 90 chars)",
  "tip": "Un consejo profesional para mejorar la tasa de apertura/click de este email"
}`;
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.92,
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
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      return NextResponse.json(parsed);
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
