export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPlan } from '@/lib/plans';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-chat');

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

async function gatherRestaurantContext(restaurantId: string) {
  const supabase = createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: restaurant },
    { data: categories },
    { data: products },
    { data: todayOrders },
    { data: weekOrders },
    { data: monthOrders },
    { data: tables },
    { data: subscription },
    { data: reviews },
    { data: promotions },
    { data: staff },
    { data: crmCustomers },
  ] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
    supabase.from('categories').select('id, name, is_active, sort_order').eq('restaurant_id', restaurantId).order('sort_order'),
    supabase.from('products').select('id, name, description, price, category_id, is_active, is_featured, image_url').eq('restaurant_id', restaurantId).order('sort_order'),
    supabase.from('orders').select('id, order_number, status, total, order_type, payment_method, customer_name, customer_phone, delivery_address, discount_amount, created_at').eq('restaurant_id', restaurantId).gte('created_at', todayStart).order('created_at', { ascending: false }),
    supabase.from('orders').select('id, status, total, order_type, customer_name, customer_phone, created_at').eq('restaurant_id', restaurantId).gte('created_at', weekAgo).order('created_at', { ascending: false }),
    supabase.from('orders').select('id, status, total, order_type, customer_name, customer_phone, discount_amount, created_at').eq('restaurant_id', restaurantId).gte('created_at', monthAgo),
    supabase.from('tables').select('id, name, is_active').eq('restaurant_id', restaurantId),
    supabase.from('subscriptions').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
    supabase.from('reviews').select('id, customer_name, rating, comment, created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('promotions').select('id, code, discount_type, discount_value, is_active, usage_count, max_uses, expires_at').eq('restaurant_id', restaurantId),
    supabase.from('staff_members').select('id, name, role, is_active').eq('restaurant_id', restaurantId),
    supabase.from('customers').select('id, name, phone, email, total_orders, total_spent, last_order_at, tags').eq('restaurant_id', restaurantId).order('total_spent', { ascending: false }).limit(20),
  ]);

  const completedStatuses = ['completed', 'delivered', 'ready'];
  const allMonth = monthOrders ?? [];
  const completedMonth = allMonth.filter(o => completedStatuses.includes(o.status));
  const monthRevenue = completedMonth.reduce((s, o) => s + Number(o.total), 0);
  const monthDiscount = allMonth.reduce((s, o) => s + Number(o.discount_amount || 0), 0);

  const allWeek = weekOrders ?? [];
  const completedWeek = allWeek.filter(o => completedStatuses.includes(o.status));
  const weekRevenue = completedWeek.reduce((s, o) => s + Number(o.total), 0);

  const allToday = todayOrders ?? [];
  const completedToday = allToday.filter(o => completedStatuses.includes(o.status));
  const todayRevenue = completedToday.reduce((s, o) => s + Number(o.total), 0);

  const cancelledMonth = allMonth.filter(o => o.status === 'cancelled').length;
  const pendingToday = allToday.filter(o => o.status === 'pending').length;

  const customerMap: Record<string, { name: string; phone: string; orders: number; total: number; lastOrder: string }> = {};
  for (const o of allMonth) {
    const key = o.customer_phone || o.customer_name || 'anon';
    if (!customerMap[key]) {
      customerMap[key] = { name: o.customer_name, phone: o.customer_phone || '', orders: 0, total: 0, lastOrder: o.created_at };
    }
    customerMap[key].orders++;
    customerMap[key].total += Number(o.total);
    if (o.created_at > customerMap[key].lastOrder) customerMap[key].lastOrder = o.created_at;
  }
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const deliveryOrders = allMonth.filter(o => o.order_type === 'delivery').length;
  const pickupOrders = allMonth.filter(o => o.order_type === 'pickup').length;
  const dineInOrders = allMonth.filter(o => o.order_type === 'dine_in').length;

  const avgRating = (reviews ?? []).length > 0
    ? ((reviews ?? []).reduce((s, r) => s + r.rating, 0) / (reviews ?? []).length).toFixed(1)
    : 'Sin reseñas';

  const plan = subscription ? getPlan(subscription.plan_id) : null;
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  const activeProducts = (products ?? []).filter(p => p.is_active);
  const inactiveProducts = (products ?? []).filter(p => !p.is_active);
  const productsWithoutImage = activeProducts.filter(p => !p.image_url);
  const activeTables = (tables ?? []).filter(t => t.is_active);
  const activePromos = (promotions ?? []).filter(p => p.is_active);

  return `
=== RESTAURANTE ===
Nombre: ${restaurant?.name ?? 'N/A'}
Slug: ${restaurant?.slug ?? 'N/A'}
URL del menú: menius.app/r/${restaurant?.slug ?? ''}
Moneda: ${restaurant?.currency ?? 'USD'}
Idioma: ${restaurant?.locale ?? 'es'}
Dirección: ${restaurant?.address || 'No configurada'}
Teléfono: ${restaurant?.phone || 'No configurado'}
Email: ${restaurant?.email || 'No configurado'}
WhatsApp notificaciones: ${restaurant?.notification_whatsapp || 'No configurado'}
Tipos de orden activos: ${(restaurant?.order_types_enabled as string[] ?? ['dine_in']).join(', ')}
Métodos de pago: ${(restaurant?.payment_methods_enabled as string[] ?? ['cash']).join(', ')}
Horario: ${restaurant?.operating_hours ? JSON.stringify(restaurant.operating_hours) : 'No configurado'}

=== SUSCRIPCIÓN ===
Plan: ${plan?.name ?? 'Sin plan'}
Estado: ${subscription?.status ?? 'N/A'}
${trialDaysLeft !== null ? `Días de prueba restantes: ${trialDaysLeft}` : ''}
${plan ? `Límites: ${plan.limits.maxProducts === -1 ? 'ilimitados' : `${plan.limits.maxProducts} productos, ${plan.limits.maxTables} mesas, ${plan.limits.maxUsers} usuarios`}` : ''}

=== MENÚ ===
Categorías: ${(categories ?? []).map(c => `${c.name}${c.is_active ? '' : ' (inactiva)'}`).join(', ') || 'Ninguna'}
Productos activos: ${activeProducts.length}
Productos inactivos: ${inactiveProducts.length}
Productos sin imagen: ${productsWithoutImage.length}
Productos destacados: ${activeProducts.filter(p => p.is_featured).length}
Lista de productos: ${activeProducts.slice(0, 30).map(p => `${p.name} ($${Number(p.price).toFixed(2)})`).join(', ')}

=== VENTAS HOY ===
Ordenes hoy: ${allToday.length}
Completadas hoy: ${completedToday.length}
Ingresos hoy: $${todayRevenue.toFixed(2)}
Pendientes ahora: ${pendingToday}
Ticket promedio hoy: $${completedToday.length > 0 ? (todayRevenue / completedToday.length).toFixed(2) : '0.00'}

=== VENTAS ESTA SEMANA ===
Ordenes: ${allWeek.length}
Completadas: ${completedWeek.length}
Ingresos: $${weekRevenue.toFixed(2)}
Ticket promedio: $${completedWeek.length > 0 ? (weekRevenue / completedWeek.length).toFixed(2) : '0.00'}

=== VENTAS ESTE MES (30 días) ===
Ordenes totales: ${allMonth.length}
Completadas: ${completedMonth.length}
Canceladas: ${cancelledMonth}
Ingresos: $${monthRevenue.toFixed(2)}
Descuentos otorgados: $${monthDiscount.toFixed(2)}
Ticket promedio: $${completedMonth.length > 0 ? (monthRevenue / completedMonth.length).toFixed(2) : '0.00'}
Por tipo: Dine-in: ${dineInOrders}, Pickup: ${pickupOrders}, Delivery: ${deliveryOrders}

=== CLIENTES TOP (30 días) ===
${topCustomers.length > 0 ? topCustomers.map((c, i) => `${i + 1}. ${c.name || 'Anónimo'}${c.phone ? ` (${c.phone})` : ''} — ${c.orders} ordenes, $${c.total.toFixed(2)} total`).join('\n') : 'Sin datos de clientes aún'}

=== RESEÑAS ===
Rating promedio: ${avgRating}
Total reseñas: ${(reviews ?? []).length}
${(reviews ?? []).slice(0, 5).map(r => `- ${r.customer_name}: ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} "${r.comment || 'Sin comentario'}"`).join('\n')}

=== MESAS ===
Total: ${(tables ?? []).length} (${activeTables.length} activas)
${activeTables.map(t => t.name).join(', ')}

=== PROMOCIONES ===
${activePromos.length > 0 ? activePromos.map(p => `- ${p.code}: ${p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`} off (usado: ${p.usage_count}/${p.max_uses ?? '∞'}${p.expires_at ? `, expira: ${new Date(p.expires_at).toLocaleDateString()}` : ''})`).join('\n') : 'Sin promociones activas'}

=== EQUIPO ===
${(staff ?? []).length > 0 ? (staff ?? []).map(s => `- ${s.name} (${s.role})${s.is_active ? '' : ' — inactivo'}`).join('\n') : 'Solo el propietario'}

=== BASE DE DATOS DE CLIENTES (CRM) ===
Total en base de datos: ${(crmCustomers ?? []).length >= 20 ? '20+' : (crmCustomers ?? []).length}
${(crmCustomers ?? []).length > 0 ? (crmCustomers ?? []).slice(0, 15).map((c, i) => `${i + 1}. ${c.name || 'Anónimo'}${c.phone ? ` (${c.phone})` : ''}${c.email ? ` — ${c.email}` : ''} — ${c.total_orders} ordenes, $${Number(c.total_spent).toFixed(2)} total${c.tags?.length > 0 ? ` [${c.tags.join(', ')}]` : ''}${c.last_order_at ? ` — última: ${new Date(c.last_order_at).toLocaleDateString()}` : ''}`).join('\n') : 'Sin clientes registrados aún'}

=== ORDENES RECIENTES HOY ===
${allToday.slice(0, 10).map(o => `#${o.order_number} — ${o.customer_name || 'Sin nombre'} — $${Number(o.total).toFixed(2)} — ${o.status} — ${o.order_type ?? 'dine_in'}`).join('\n') || 'Sin ordenes hoy'}
`.trim();
}

const SYSTEM_PROMPT = `Eres "MENIUS AI", el asistente inteligente de MENIUS — plataforma de gestión digital para restaurantes.

TU PERSONALIDAD:
Eres como un socio experto del restaurante: cercano, directo, con experiencia real en gastronomía y negocios. Hablas como un colega de confianza, no como un robot. Usas un tono cálido y profesional. Puedes ser gracioso cuando viene al caso, pero siempre aportas valor. Tuteas al usuario. Adaptas tu idioma al del usuario (español o inglés).

Ejemplos de tu estilo:
- En vez de "El ticket promedio es $15.50" → "Tu ticket promedio anda en **$15.50** — nada mal, pero si subes los extras podrías llegar fácil a $18."
- En vez de "No tienes promociones activas" → "No tienes ninguna promo activa. ¿Quieres que te sugiera una? Los martes suelen ser flojos para muchos restaurantes."
- En vez de "Error, no encontré datos" → "Hmm, no tengo esa info todavía. Puede que necesites configurarlo primero."

CAPACIDADES PRINCIPALES:
1. **Analítica y ventas** — Ventas del día/semana/mes, ticket promedio, comparaciones, tendencias, horas pico, productos más y menos vendidos
2. **CRM y clientes** — Base de clientes con historial, gasto total, frecuencia, tags. Top compradores, clientes inactivos, segmentación
3. **Menú y productos** — Precios, productos sin imagen, optimización del menú, sugerencias de pricing
4. **Órdenes** — Estado de pedidos, pendientes, cancelados, tiempos de preparación
5. **Guía del dashboard** — Explicar paso a paso cómo usar cada sección
6. **Estrategia de negocio** — Promociones, horarios, marketing, cómo vender más
7. **Reseñas** — Análisis de feedback, sugerencias para mejorar rating
8. **Suscripción** — Plan actual, límites, qué plan conviene

CHEF CONSULTOR — Recetas y cocina:
9. **Recetas** — Puedes dar recetas detalladas de cualquier platillo: ingredientes, cantidades, pasos, tiempos, tips de chef
10. **Bebidas y cócteles** — Recetas de bebidas, maridajes, combinaciones con el menú
11. **Costeo de recetas** — Ayudar a calcular costo por porción si dan los precios de ingredientes
12. **Tendencias gastronómicas** — Sugerir platillos de moda, variaciones creativas, menús temáticos
13. **Tips de cocina** — Técnicas, sustituciones de ingredientes, cómo mejorar presentación
14. **Menús temáticos** — Ideas para San Valentín, Navidad, Día de las Madres, temporadas

Cuando te pidan una receta:
- Da ingredientes con cantidades exactas
- Pasos numerados claros
- Tiempo de preparación y porciones
- Un tip de chef al final
- Si el platillo está en su menú, relaciona con el precio que cobran

SUGERENCIAS PROACTIVAS:
Cuando notes algo en los datos, menciónalo sin que te pregunten:
- Productos sin imagen → "Oye, tienes {n} productos sin foto. Los productos con imagen venden hasta 30% más."
- Muchas cancelaciones → "Vi que tienes {n} cancelaciones este mes. ¿Quieres que analicemos por qué?"
- Clientes inactivos → "Tienes clientes que no ordenan hace más de 30 días. Una promo podría reactivarlos."
- Rating bajo → "Tu rating está en {x}. ¿Revisamos los comentarios para ver qué mejorar?"
- Sin promociones → "No tienes promos activas. Los restaurantes con promos venden en promedio 15-20% más."
- Pocos métodos de pago → "Solo aceptas {x}. Agregar más opciones reduce el abandono de pedidos."
- Sin horario configurado → "No tienes horario de operación configurado. Tus clientes no saben cuándo estás abierto."
- Trial por vencer → "Te quedan {n} días de prueba. ¿Quieres que te explique los planes?"

GUÍA DEL DASHBOARD:
- **Menú > Categorías**: Crear/editar categorías, ordenar con drag & drop
- **Menú > Productos**: Agregar productos con foto, precio, variantes y extras
- **Mesas y QR**: Crear mesas, generar códigos QR elegantes para imprimir
- **Cocina (KDS)**: Pantalla para la cocina, pedidos en tiempo real con sonidos
- **Órdenes**: Ver todos los pedidos, cambiar estado, contactar por WhatsApp
- **Clientes**: CRM con historial, tags, notas, contacto directo
- **Analytics**: Gráficas de ventas, productos top, tendencias
- **Marketing**: Enviar campañas de email a tus clientes
- **Promociones**: Crear cupones (porcentaje o monto fijo)
- **Staff**: Agregar empleados con roles diferentes
- **Configuración**: Logo, banner, dirección, WhatsApp, tipos de orden, pagos, horario
- **Facturación**: Plan actual, cambiar de plan, historial

REGLAS:
- Responde en máximo 350 palabras, claro y directo
- Usa **negritas** y listas cuando mejore la lectura
- Si algo requiere acción, di exactamente dónde ir: "Ve a **Configuración** y en la pestaña..."
- Si algo no está configurado, sugiere configurarlo y di cómo
- Usa la moneda del restaurante para cifras
- Máximo 2-3 emojis por respuesta, solo cuando aporten
- Si no tienes la info, dilo honestamente, nunca inventes datos
- Cuando el usuario abre la conversación o dice hola, dale un resumen rápido del estado de su restaurante hoy (ventas, pedidos pendientes, algo que mejorar)`;

function buildProactiveTips(context: string): string {
  const tips: string[] = [];

  const noImageMatch = context.match(/Productos sin imagen: (\d+)/);
  if (noImageMatch && parseInt(noImageMatch[1]) > 0) {
    tips.push(`ALERTA: ${noImageMatch[1]} productos sin foto — los productos con imagen venden hasta 30% más.`);
  }

  const cancelledMatch = context.match(/Canceladas: (\d+)/);
  if (cancelledMatch && parseInt(cancelledMatch[1]) > 3) {
    tips.push(`ALERTA: ${cancelledMatch[1]} cancelaciones este mes — vale la pena investigar por qué.`);
  }

  const pendingMatch = context.match(/Pendientes ahora: (\d+)/);
  if (pendingMatch && parseInt(pendingMatch[1]) > 0) {
    tips.push(`URGENTE: ${pendingMatch[1]} pedidos pendientes sin atender.`);
  }

  if (context.includes('Dirección: No configurada')) {
    tips.push('MEJORA: Sin dirección configurada — los clientes no saben dónde encontrarte.');
  }

  if (context.includes('Horario: No configurado')) {
    tips.push('MEJORA: Sin horario configurado — tus clientes no saben cuándo estás abierto.');
  }

  if (context.includes('Sin promociones activas')) {
    tips.push('OPORTUNIDAD: Sin promociones activas — una promo puede aumentar ventas 15-20%.');
  }

  const ratingMatch = context.match(/Rating promedio: ([\d.]+)/);
  if (ratingMatch && parseFloat(ratingMatch[1]) < 4.0) {
    tips.push(`ATENCIÓN: Rating de ${ratingMatch[1]} — revisa los comentarios para mejorar.`);
  }

  const trialMatch = context.match(/Días de prueba restantes: (\d+)/);
  if (trialMatch && parseInt(trialMatch[1]) <= 5) {
    tips.push(`AVISO: Solo quedan ${trialMatch[1]} días de prueba.`);
  }

  if (tips.length === 0) return '';
  return `\n\n=== ALERTAS Y OPORTUNIDADES (menciona las relevantes cuando sea natural) ===\n${tips.join('\n')}`;
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { allowed } = checkRateLimit(`ai-chat:${tenant.userId}`, { limit: 60, windowSec: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de mensajes. Intenta en unos minutos.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'IA no configurada.' }, { status: 503 });
    }

    const body = await request.json();
    const userMessage = String(body.message ?? '').trim();
    const clientHistory: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-10) : [];

    if (!userMessage) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const supabase = createClient();

    // Load recent conversation memory from DB for richer context
    const { data: savedMessages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    const memoryMessages = (savedMessages ?? []).reverse();

    // Merge: prefer client-side history (current session), fill gaps with DB memory
    let conversationHistory: { role: string; parts: { text: string }[] }[];

    if (clientHistory.length > 0) {
      conversationHistory = clientHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));
    } else if (memoryMessages.length > 0) {
      conversationHistory = memoryMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
    } else {
      conversationHistory = [];
    }

    const [context] = await Promise.all([
      gatherRestaurantContext(tenant.restaurantId),
    ]);

    const proactiveTips = buildProactiveTips(context);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${SYSTEM_PROMPT}\n\nDATOS ACTUALES DEL RESTAURANTE:\n${context}${proactiveTips}` }],
          },
          contents: [
            ...conversationHistory,
            { role: 'user', parts: [{ text: userMessage }] },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.8,
            topP: 0.92,
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      logger.error('Gemini error', { error: errText });
      return NextResponse.json({ error: 'Error al procesar tu pregunta.' }, { status: 502 });
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'No se obtuvo respuesta.' }, { status: 502 });
    }

    // Persist both messages to DB (fire-and-forget)
    supabase.from('chat_messages').insert([
      { restaurant_id: tenant.restaurantId, user_id: tenant.userId, role: 'user', content: userMessage },
      { restaurant_id: tenant.restaurantId, user_id: tenant.userId, role: 'assistant', content: reply },
    ]).then(() => {});

    return NextResponse.json({ reply });
  } catch (err) {
    logger.error('Error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno del asistente.' }, { status: 500 });
  }
}
