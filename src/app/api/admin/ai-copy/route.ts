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
      const platformDNA: Record<string, string> = {
        instagram: `ADN DE INSTAGRAM B2B (dueños de restaurantes):
- Hook rule: primera línea DETIENE el scroll — empieza con el dolor del restaurantero, NO con el nombre de MENIUS
- Longitud ideal: 150-220 chars de caption, párrafos cortos separados por líneas en blanco
- Estructura: Hook (dolor) → Insight (¿por qué pasa?) → Solución (MENIUS) → CTA
- Emojis: 2-4 con propósito, no decorativos
- Hashtags (15-20): #MenuDigital #RestauranteOnline #GestionRestaurante #NegocioGastronomico #RestauranteTech
- Voz: consultor de restaurantes que encontró algo que cambia el juego, no marca vendiendo`,
        facebook: `ADN DE FACEBOOK B2B:
- Hook: pregunta que duele ("¿Cuántos pedidos perdiste hoy por no tener menú online?")
- Longitud: 100-200 chars, conversacional, directa
- Termina con pregunta que invite comentarios del dueño de restaurante
- 3-5 hashtags máximo
- Voz: comunidad de restauranteros, no pitch comercial`,
        twitter: `ADN DE TWITTER/X B2B:
- 280 chars ESTRICTOS — cada palabra gana su lugar
- Dato específico O pregunta que duele O afirmación que sorprende al dueño de restaurante
- 1-2 hashtags máx
- Voz: founder de restaurtech compartiendo insight real, no marketing corporativo`,
        linkedin: `ADN DE LINKEDIN B2B:
- 300-600 chars ideales
- Estructura: Dato/observación provocadora → contexto → solución MENIUS → call to action suave
- Data-driven: usa métricas reales de la plataforma (${totalRestaurants ?? 0} restaurantes registrados, etc.)
- 3-5 hashtags: #RestaurantTech #FoodService #TransformacionDigital #RestaurantManagement
- Voz: thought leader de restaurtech compartiendo aprendizajes reales, no vendedor`,
        tiktok: `ADN DE TIKTOK B2B:
- Caption max 150 chars — es plataforma 100% visual
- Hook de curiosidad o dato sorprendente sobre pérdidas en restaurantes sin presencia digital
- 3-5 hashtags trending: #RestauranteTips #DueñoDeRestaurante #NegocioGastronomico
- Voz: auténtico, behind-the-scenes, muestra la realidad del restaurantero`,
      };

      const typeLabels: Record<string, string> = {
        case_study: 'Caso de éxito de un restaurante cliente de MENIUS',
        feature: 'Destacar una funcionalidad clave de MENIUS',
        stats: 'Estadísticas impresionantes de la industria o de la plataforma',
        tips: 'Tips accionables para dueños de restaurantes',
        testimonial: 'Testimonial auténtico de cliente satisfecho con MENIUS',
        trend: 'Tendencia de la industria restaurantera',
        behind_scenes: 'Detrás de cámaras del equipo MENIUS',
      };

      prompt = `Eres el/la creador/a de contenido B2B #1 del mundo para SaaS de restaurantes — una fusión explosiva de Gary Vaynerchuk (contenido plataforma-nativo que para el scroll), Ann Handley (voz auténtica, storytelling que conecta y convierte) y Neil Patel (data-first, cada post tiene un objetivo de negocio medible).

Tu audiencia son DUEÑOS DE RESTAURANTES en Latinoamérica. Los conoces por dentro: trabajan 14 horas diarias, pierden pedidos por no tener presencia digital, pagan comisiones abusivas a UberEats (15-30%), llevan pedidos a mano o por teléfono. Necesitan soluciones que funcionen desde el día 1 sin curva de aprendizaje.

DATOS REALES DE MENIUS (úsalos para credibilidad y especificidad):
${platformContext}

TAREA: Crea el post PERFECTO para ${(campaignType ?? 'instagram').toUpperCase()} de la cuenta oficial de MENIUS.
Tipo de contenido: ${typeLabels[audience] ?? audience ?? 'General'}
${customPrompt ? `Instrucciones especiales del admin: ${customPrompt}` : ''}

${platformDNA[campaignType ?? 'instagram'] ?? platformDNA.instagram}

PRINCIPIOS IRROMPIBLES:
1. HOOK PRIMERO: Línea 1 = el dolor del dueño, no el nombre de MENIUS. Ejemplos de nivel: "Tu carta en papel está costándote dinero ahora mismo." / "UberEats se lleva el 30% de cada pedido. Tu margen: casi nada." / "¿Cuántas veces al día tomas pedidos por teléfono y algo sale mal?"
2. SÉ ESPECÍFICO: "Importa tu menú en 60 segundos con IA" > "tenemos tecnología avanzada". Números concretos = credibilidad
3. DATOS REALES: si hay métricas de la plataforma, úsalas. La especificidad destruye el escepticismo
4. VOZ AUTÉNTICA: como un fundador compartiendo lo que descubrió en el campo, no una marca haciendo marketing
5. NUNCA: "Nos complace anunciar", "solución innovadora", "líder del mercado", "transformación digital" genérica
6. SIEMPRE: lenguaje de restaurantero, sus palabras exactas, sus problemas reales, sus victorias concretas

PARA imageIdea: escribe un prompt cinematográfico para generar imagen con IA — escena exacta, tipo de restaurante, iluminación, ambiente, mood, estilo fotográfico.

FORMATO JSON estricto (sin markdown):
{
  "caption": "Texto completo del post listo para publicar. Párrafos separados con \\n\\n.",
  "hashtags": "Hashtags separados por espacio",
  "imageIdea": "Prompt cinematográfico para IA: escena exacta, tipo de restaurante, iluminación, mood, estilo visual editorial",
  "bestTime": "Mejor día + hora para publicar con máximo alcance B2B en restauranteros",
  "tip": "Insight agudo y específico para maximizar el rendimiento de este post — no consejo genérico",
  "hookVariant": "Primera línea alternativa para A/B test — mismo mensaje, ángulo emocional diferente"
}`;
    } else if (isSms) {
      prompt = `Eres el/la mejor copywriter de SMS B2B del mundo para SaaS de restaurantes. Cada SMS que escribes tiene tasa de click 3x el promedio de la industria porque dominas la fórmula: valor inmediato + urgencia real + CTA irresistible en 160 chars exactos.

CONTEXTO DE MENIUS:
${platformContext}

AUDIENCIA: ${audienceLabels[audience] ?? 'Todos los restaurantes'}
${customPrompt ? `INSTRUCCIONES: ${customPrompt}` : ''}

FÓRMULA DE SMS DE ÉLITE (160 chars ESTRICTOS):
- Estructura: [Nombre personalizado] + [beneficio o dolor en 1 frase] + [CTA + link]
- La urgencia debe ser REAL, no artificial ("tu trial vence en 3 días" > "¡oferta limitada!")
- Usa {restaurante} para personalizar con el nombre del restaurante
- CTA concreto con link (usa menius.app como dominio)
- Lenguaje directo, del restaurantero, sin jerga corporativa
- Cuenta los chars — 160 es el límite duro para no fragmentar el mensaje

EJEMPLOS DE NIVEL:
- "Hola {restaurante}, tu menú ya tiene 47 visitas este mes. Activa pedidos online y convierte esas visitas en ventas: menius.app/activar" (134 chars)
- "{restaurante}, tu trial termina en 2 días. Tus clientes ya pueden ordenar online. Sigue así por solo $39/mes: menius.app/continuar" (130 chars)

JSON estricto (sin markdown):
{
  "message": "El SMS completo incluyendo {restaurante} — MÁXIMO 160 chars",
  "charCount": "Número exacto de caracteres del message (sin contar esta clave)",
  "variant": "Versión alternativa para A/B test — mismo objetivo, diferente ángulo emocional — máx 160 chars",
  "tip": "Por qué este SMS debería funcionar bien con esta audiencia específica + mejor hora de envío"
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

      prompt = `Eres el/la mejor copywriter de emails B2B del mundo para SaaS de restaurantes — la fusión perfecta de David Ogilvy (headlines que hacen imposible NO leer), Joanna Wiebe (voice-of-customer, cada línea habla con las palabras exactas del restaurantero), Ann Handley (autenticidad que construye confianza) y los mejores email marketers de Shopify, HubSpot y Toast (estructura que convierte en cada segmento del funnel).

Tu especialidad: emails de MENIUS → dueños de restaurantes en Latinoamérica que convierten, retienen y reactivan.

CONTEXTO DE LA PLATAFORMA:
${platformContext}

AUDIENCIA DE ESTE EMAIL: ${audienceLabels[audience] ?? 'Todos los restaurantes'}
TIPO DE CAMPAÑA: ${typeLabels[campaignType] ?? campaignType ?? 'Tips y mejores prácticas'}
${customPrompt ? `INSTRUCCIONES DEL ADMIN: ${customPrompt}` : ''}

PSICOGRAFÍA DE LA AUDIENCIA (conoce su mundo):
- Trabajan 12-16h al día, no tienen tiempo para leer párrafos largos
- Su mayor dolor: perder clientes por no tener presencia digital vs. pagar comisiones abusivas a apps de delivery
- Su mayor deseo: más pedidos, menos trabajo manual, control de su negocio
- Lenguaje que resuena: "tu menú", "tus clientes", "tus pedidos", cifras concretas, tiempo real

FÓRMULAS DE COPYWRITING DE ÉLITE:
1. SUBJECT LINE (Ogilvy + Joanna Wiebe):
   - Patrón ganador: [Número/dato] + [beneficio específico del restaurantero] O [pregunta que duele] O [curiosidad con beneficio implícito]
   - Ejemplos de nivel: "Tu menú puede recibir pedidos esta noche" / "3 restaurantes cerca de ti ya reciben pedidos online" / "¿Cuánto te costó hoy no tener pedidos online?"
   - Max 55 chars. Emoji solo si amplifica el mensaje (no si decora)
2. OPENING LINE (Joanna Wiebe — voice-of-customer):
   - Primera oración = el dolor/deseo en las palabras exactas del restaurantero
   - NO: "Queremos informarte que…" / "En MENIUS estamos emocionados de…"
   - SÍ: "Cada vez que tu cliente no puede ver tu menú online, se va a otro lado."
3. BODY (Handley — 3 párrafos max, 1-2 oraciones cada uno):
   - Párrafo 1: amplía el dolor o situación con dato específico
   - Párrafo 2: el insight que cambia la perspectiva + MENIUS como solución natural (no forzada)
   - Párrafo 3: beneficio concreto + resultado esperado con números si es posible
4. CTA (Wiebe — verbo de acción + beneficio):
   - Max 5 palabras. Verbos: Activar, Ver, Empezar, Digitalizar, Conectar
   - Ejemplos top: "Activar pedidos online", "Ver cómo funciona", "Empezar gratis hoy"
5. TONO: asesor de confianza que conoce el negocio de restaurantes por dentro — nunca vendedor, nunca corporativo. Tutea siempre.

FORMATO JSON estricto (sin markdown):
{
  "subject": "Asunto del email (max 55 chars)",
  "body": "Cuerpo completo del email. 3 párrafos máximo, separados por \\n\\n. Incluye variable {restaurante} para personalización.",
  "cta": "Texto del botón CTA (max 5 palabras, verbo de acción + beneficio)",
  "subjectVariant": "Asunto alternativo para A/B test — mismo beneficio, diferente ángulo emocional",
  "preheader": "Texto de preheader (preview del inbox, max 85 chars — debe complementar el subject, no repetirlo)",
  "tip": "Un insight de experto sobre por qué este email debería funcionar bien con esta audiencia específica — incluye métrica o benchmark real si aplica"
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
            temperature: 0.95,
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
    const parts: Array<{ text?: string; thought?: boolean }> = geminiData?.candidates?.[0]?.content?.parts ?? [];
    const rawText = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('') || parts[0]?.text ?? '';

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
