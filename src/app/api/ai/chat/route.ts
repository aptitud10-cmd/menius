export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenant } from '@/lib/auth/get-tenant';
import { hasPlanAccess } from '@/lib/auth/check-plan';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { getPlan } from '@/lib/plans';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-chat');

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

async function gatherRestaurantContext(restaurantId: string): Promise<{ context: string; locale: string; restaurantName: string; restaurantSlug: string; atRiskCount: number; zeroSalesNames: string[] }> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const riskThreshold = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

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
    { data: atRiskCustomers },
    { data: topProductsRaw },
    { data: hourlyRaw },
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
    // Customers at churn risk: haven't ordered in 21+ days but have 2+ orders
    supabase.from('customers').select('name, phone, total_orders, last_order_at').eq('restaurant_id', restaurantId).lt('last_order_at', riskThreshold).gte('total_orders', 2).order('last_order_at', { ascending: false }).limit(10),
    // Top products by revenue in last 30 days via order_items join
    supabase.from('order_items').select('product_id, line_total, products!inner(name, is_active)').eq('products.restaurant_id', restaurantId).gte('created_at', monthAgo).limit(500),
    // Orders with hour info for peak hour calculation (last 30 days)
    supabase.from('orders').select('created_at').eq('restaurant_id', restaurantId).gte('created_at', monthAgo).in('status', ['completed', 'delivered', 'ready']),
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

  // Peak hour from last 30 days of completed orders
  const hourCounts: number[] = new Array(24).fill(0);
  for (const o of hourlyRaw ?? []) {
    const h = new Date(o.created_at).getHours();
    hourCounts[h]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakHourStr = hourCounts[peakHour] > 0
    ? `${peakHour}:00–${peakHour + 1}:00 (${hourCounts[peakHour]} orders)`
    : null;

  // Top products by revenue (last 30 days)
  const productRevMap: Record<string, { name: string; revenue: number; qty: number }> = {};
  for (const item of topProductsRaw ?? []) {
    const prod = (item as unknown as { product_id: string; line_total: number; products: { name: string; is_active: boolean } });
    if (!prod.product_id) continue;
    if (!productRevMap[prod.product_id]) {
      productRevMap[prod.product_id] = { name: prod.products?.name ?? prod.product_id, revenue: 0, qty: 0 };
    }
    productRevMap[prod.product_id].revenue += Number(prod.line_total);
    productRevMap[prod.product_id].qty++;
  }
  const sortedProducts = Object.values(productRevMap).sort((a, b) => b.revenue - a.revenue);
  const topProducts5 = sortedProducts.slice(0, 5);

  // Active products with zero sales last 30 days
  const soldProductIds = new Set(Object.keys(productRevMap));
  const activeProducts = (products ?? []).filter(p => p.is_active);
  const zeroSalesProducts = activeProducts.filter(p => !soldProductIds.has(p.id)).slice(0, 3);

  const topCustomers = (() => {
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
    return Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 10);
  })();

  const deliveryOrders = allMonth.filter(o => o.order_type === 'delivery').length;
  const pickupOrders = allMonth.filter(o => o.order_type === 'pickup').length;
  const dineInOrders = allMonth.filter(o => o.order_type === 'dine_in').length;

  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';

  const avgRating = (reviews ?? []).length > 0
    ? ((reviews ?? []).reduce((s, r) => s + r.rating, 0) / (reviews ?? []).length).toFixed(1)
    : (en ? 'No reviews' : 'Sin reseñas');

  const plan = subscription ? getPlan(subscription.plan_id) : null;
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  const inactiveProducts = (products ?? []).filter(p => !p.is_active);
  const productsWithoutImage = activeProducts.filter(p => !p.image_url);
  const activeTables = (tables ?? []).filter(t => t.is_active);
  const activePromos = (promotions ?? []).filter(p => p.is_active);

  const na = en ? 'Not set' : 'No configurado';

  // CRM customers with segment tag
  const crmWithSegment = (crmCustomers ?? []).map(c => {
    const daysSinceLast = c.last_order_at
      ? Math.floor((now.getTime() - new Date(c.last_order_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const segment = daysSinceLast > 21 ? (en ? 'at-risk' : 'en riesgo') : c.total_orders >= 5 ? 'VIP' : (en ? 'regular' : 'regular');
    return { ...c, segment };
  });

  const context = `
=== ${en ? 'RESTAURANT' : 'RESTAURANTE'} ===
${en ? 'Name' : 'Nombre'}: ${restaurant?.name ?? 'N/A'}
Slug: ${restaurant?.slug ?? 'N/A'}
${en ? 'Menu URL' : 'URL del menú'}: menius.app/${restaurant?.slug ?? ''}
${en ? 'Currency' : 'Moneda'}: ${restaurant?.currency ?? 'USD'}
${en ? 'Language' : 'Idioma'}: ${locale}
${en ? 'Address' : 'Dirección'}: ${restaurant?.address || na}
${en ? 'Phone' : 'Teléfono'}: ${restaurant?.phone || na}
Email: ${restaurant?.email || na}
${en ? 'WhatsApp notifications' : 'WhatsApp notificaciones'}: ${restaurant?.notification_whatsapp || na}
${en ? 'Active order types' : 'Tipos de orden activos'}: ${(restaurant?.order_types_enabled as string[] ?? ['dine_in']).join(', ')}
${en ? 'Payment methods' : 'Métodos de pago'}: ${(restaurant?.payment_methods_enabled as string[] ?? ['cash']).join(', ')}
${en ? 'Schedule' : 'Horario'}: ${restaurant?.operating_hours ? JSON.stringify(restaurant.operating_hours) : na}
${en ? 'Tax configuration' : 'Configuración de impuesto'}: ${
  (restaurant as Record<string, unknown>)?.tax_rate
    ? `${(restaurant as Record<string, unknown>).tax_rate}% (${(restaurant as Record<string, unknown>).tax_label ?? 'Tax'}) — ${(restaurant as Record<string, unknown>).tax_included ? (en ? 'included in price' : 'incluido en el precio') : (en ? 'added on top' : 'agregado al total')}${(restaurant as Record<string, unknown>).country_code ? ` — ${(restaurant as Record<string, unknown>).country_code}${(restaurant as Record<string, unknown>).state_code ? `/${(restaurant as Record<string, unknown>).state_code}` : ''}` : ''}`
    : (en ? 'No tax configured' : 'Sin impuesto configurado')
}

=== ${en ? 'SUBSCRIPTION' : 'SUSCRIPCIÓN'} ===
${en ? 'Plan' : 'Plan'}: ${plan?.name ?? 'Free'}
${en ? 'Status' : 'Estado'}: ${subscription?.status ?? 'free'}
${trialDaysLeft !== null && (subscription?.status === 'trialing') ? `${en ? 'Trial days left' : 'Días de prueba restantes'}: ${trialDaysLeft}` : ''}
${plan ? `${en ? 'Limits' : 'Límites'}: ${plan.limits.maxProducts === -1 ? (en ? 'unlimited' : 'ilimitados') : `${plan.limits.maxProducts} ${en ? 'products' : 'productos'}, ${plan.limits.maxTables} ${en ? 'tables' : 'mesas'}, ${plan.limits.maxUsers} ${en ? 'users' : 'usuarios'}`}` : ''}

=== ${en ? 'MENU' : 'MENÚ'} ===
${en ? 'Categories' : 'Categorías'}: ${(categories ?? []).map(c => `${c.name}${c.is_active ? '' : (en ? ' (inactive)' : ' (inactiva)')}`).join(', ') || (en ? 'None' : 'Ninguna')}
${en ? 'Active products' : 'Productos activos'}: ${activeProducts.length}
${en ? 'Inactive products' : 'Productos inactivos'}: ${inactiveProducts.length}
${en ? 'Products without image' : 'Productos sin imagen'}: ${productsWithoutImage.length}
${en ? 'Featured products' : 'Productos destacados'}: ${activeProducts.filter(p => p.is_featured).length}
${en ? 'Product list' : 'Lista de productos'}: ${activeProducts.slice(0, 30).map(p => `${p.name} ($${Number(p.price).toFixed(2)})`).join(', ')}

=== ${en ? 'TODAY\'S SALES' : 'VENTAS HOY'} ===
${en ? 'Orders today' : 'Ordenes hoy'}: ${allToday.length}
${en ? 'Completed today' : 'Completadas hoy'}: ${completedToday.length}
${en ? 'Revenue today' : 'Ingresos hoy'}: $${todayRevenue.toFixed(2)}
${en ? 'Pending now' : 'Pendientes ahora'}: ${pendingToday}
${en ? 'Avg ticket today' : 'Ticket promedio hoy'}: $${completedToday.length > 0 ? (todayRevenue / completedToday.length).toFixed(2) : '0.00'}

=== ${en ? 'THIS WEEK\'S SALES' : 'VENTAS ESTA SEMANA'} ===
${en ? 'Orders' : 'Ordenes'}: ${allWeek.length}
${en ? 'Completed' : 'Completadas'}: ${completedWeek.length}
${en ? 'Revenue' : 'Ingresos'}: $${weekRevenue.toFixed(2)}
${en ? 'Avg ticket' : 'Ticket promedio'}: $${completedWeek.length > 0 ? (weekRevenue / completedWeek.length).toFixed(2) : '0.00'}
${peakHourStr ? `${en ? 'Peak hour (30d)' : 'Hora pico (30d)'}: ${peakHourStr}` : ''}

=== ${en ? 'THIS MONTH\'S SALES (30 days)' : 'VENTAS ESTE MES (30 días)'} ===
${en ? 'Total orders' : 'Ordenes totales'}: ${allMonth.length}
${en ? 'Completed' : 'Completadas'}: ${completedMonth.length}
${en ? 'Cancelled' : 'Canceladas'}: ${cancelledMonth}
${en ? 'Revenue' : 'Ingresos'}: $${monthRevenue.toFixed(2)}
${en ? 'Discounts given' : 'Descuentos otorgados'}: $${monthDiscount.toFixed(2)}
${en ? 'Avg ticket' : 'Ticket promedio'}: $${completedMonth.length > 0 ? (monthRevenue / completedMonth.length).toFixed(2) : '0.00'}
${en ? 'By type' : 'Por tipo'}: Dine-in: ${dineInOrders}, Pickup: ${pickupOrders}, Delivery: ${deliveryOrders}

=== ${en ? 'TOP PRODUCTS (30 days)' : 'PRODUCTOS TOP (30 días)'} ===
${topProducts5.length > 0 ? topProducts5.map((p, i) => `${i + 1}. ${p.name} — $${p.revenue.toFixed(2)} revenue, ${p.qty} ${en ? 'orders' : 'pedidos'}`).join('\n') : (en ? 'No sales data yet' : 'Sin datos de ventas aún')}
${zeroSalesProducts.length > 0 ? `\n${en ? 'Active products with 0 sales this month' : 'Productos activos sin ventas este mes'}: ${zeroSalesProducts.map(p => p.name).join(', ')}` : ''}

=== ${en ? 'TOP CUSTOMERS (30 days)' : 'CLIENTES TOP (30 días)'} ===
${topCustomers.length > 0 ? topCustomers.map((c, i) => `${i + 1}. ${c.name || (en ? 'Anonymous' : 'Anónimo')}${c.phone ? ` (${c.phone})` : ''} — ${c.orders} ${en ? 'orders' : 'ordenes'}, $${c.total.toFixed(2)} total`).join('\n') : (en ? 'No customer data yet' : 'Sin datos de clientes aún')}

=== ${en ? 'REVIEWS' : 'RESEÑAS'} ===
${en ? 'Average rating' : 'Rating promedio'}: ${avgRating}
${en ? 'Total reviews' : 'Total reseñas'}: ${(reviews ?? []).length}
${(reviews ?? []).slice(0, 5).map(r => `- ${r.customer_name}: ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} "${r.comment || (en ? 'No comment' : 'Sin comentario')}"`).join('\n')}

=== ${en ? 'TABLES' : 'MESAS'} ===
Total: ${(tables ?? []).length} (${activeTables.length} ${en ? 'active' : 'activas'})
${activeTables.map(t => t.name).join(', ')}

=== ${en ? 'PROMOTIONS' : 'PROMOCIONES'} ===
${activePromos.length > 0 ? activePromos.map(p => `- ${p.code}: ${p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`} off (${en ? 'used' : 'usado'}: ${p.usage_count}/${p.max_uses ?? '∞'}${p.expires_at ? `, ${en ? 'expires' : 'expira'}: ${new Date(p.expires_at).toLocaleDateString()}` : ''})`).join('\n') : (en ? 'No active promotions' : 'Sin promociones activas')}

=== ${en ? 'TEAM' : 'EQUIPO'} ===
${(staff ?? []).length > 0 ? (staff ?? []).map(s => `- ${s.name} (${s.role})${s.is_active ? '' : (en ? ' — inactive' : ' — inactivo')}`).join('\n') : (en ? 'Owner only' : 'Solo el propietario')}

=== ${en ? 'CUSTOMER DATABASE (CRM)' : 'BASE DE DATOS DE CLIENTES (CRM)'} ===
${en ? 'Total in database' : 'Total en base de datos'}: ${(crmCustomers ?? []).length >= 20 ? '20+' : (crmCustomers ?? []).length}
${crmWithSegment.length > 0 ? crmWithSegment.slice(0, 15).map((c, i) => `${i + 1}. ${c.name || (en ? 'Anonymous' : 'Anónimo')}${c.phone ? ` (${c.phone})` : ''}${c.email ? ` — ${c.email}` : ''} — ${c.total_orders} ${en ? 'orders' : 'ordenes'}, $${Number(c.total_spent).toFixed(2)} total [${c.segment}]${c.tags?.length > 0 ? ` [${c.tags.join(', ')}]` : ''}${c.last_order_at ? ` — ${en ? 'last' : 'última'}: ${new Date(c.last_order_at).toLocaleDateString()}` : ''}`).join('\n') : (en ? 'No customers yet' : 'Sin clientes registrados aún')}

${(atRiskCustomers ?? []).length > 0 ? `=== ${en ? 'AT-RISK CUSTOMERS (no order in 21+ days)' : 'CLIENTES EN RIESGO (sin orden en 21+ días)'} ===
${(atRiskCustomers ?? []).map(c => `- ${c.name || (en ? 'Anonymous' : 'Anónimo')}${c.phone ? ` (${c.phone})` : ''} — ${c.total_orders} ${en ? 'orders total' : 'órdenes total'}, ${en ? 'last order' : 'última orden'}: ${new Date(c.last_order_at).toLocaleDateString()}`).join('\n')}` : ''}

=== ${en ? 'RECENT ORDERS TODAY' : 'ORDENES RECIENTES HOY'} ===
${allToday.slice(0, 10).map(o => `#${o.order_number} — ${o.customer_name || (en ? 'No name' : 'Sin nombre')} — $${Number(o.total).toFixed(2)} — ${o.status} — ${o.order_type ?? 'dine_in'}`).join('\n') || (en ? 'No orders today' : 'Sin ordenes hoy')}
`.trim();

  return {
    context,
    locale,
    restaurantName: restaurant?.name ?? '',
    restaurantSlug: restaurant?.slug ?? '',
    atRiskCount: (atRiskCustomers ?? []).length,
    zeroSalesNames: zeroSalesProducts.map(p => p.name),
  };
}

const SHARED_CAPABILITIES_INTRO_ES = `
=== OBJETIVO ===
Resolver la consulta del dueño de restaurante en 1 respuesta clara y accionable.
Éxito = el dueño sabe exactamente qué hacer a continuación.
No termines la respuesta con otra pregunta a menos que necesites claridad para resolver.

=== HERRAMIENTAS / CAPACIDADES ===
Puedes:
1. Analizar datos reales del restaurante — ventas, pedidos, clientes, ticket promedio, tendencias, horas pico
2. Guiar paso a paso por cualquier sección del dashboard — menú, órdenes, marketing, configuración, facturación
3. Interpretar métricas — comparar hoy vs ayer, semana vs semana anterior, detectar problemas
4. Actuar como consultor de chef — recetas, costos, tendencias gastronómicas, menús temáticos
5. Sugerir estrategias de negocio con base en los datos reales del restaurante
6. Generar ideas de marketing — campañas, promociones, redes sociales, retención de clientes
7. Explicar errores o problemas del sistema con soluciones concretas
8. Escalar a soporte humano cuando el problema lo requiere
9. Ejecutar acciones directas — crear promociones, activar/desactivar productos, enviar campañas de email, ajustar puntos de lealtad

=== ACCIONES DISPONIBLES ===
Cuando el dueño te pida realizar algo, EJECUTA la acción directamente usando las herramientas disponibles.
No pidas confirmación para acciones simples como crear una promo o desactivar un producto — el dueño ya lo pidió.
Sí pide confirmación antes de enviar campañas de email masivas (confirma segmento y mensaje).

=== RESTRICCIONES ===
NO puedes:
- Inventar datos que no estén en el contexto del restaurante (si no tienes el dato, dilo)
- Prometer funciones que no existen en MENIUS
- Dar consejos médicos, legales o fiscales específicos
- Compartir datos o información de otros restaurantes
- Procesar pagos, reembolsos ni cancelar suscripciones directamente
- Dar descuentos o créditos de plataforma sin autorización

=== PROCESO ===
Para cada mensaje recibido, sigue este orden internamente:
1. CLASIFICAR — tipo de consulta: analytics / menú / pedidos / técnico / estrategia / chef / facturación / acción
2. REVISAR DATOS — consulta el contexto real del restaurante antes de responder
3. ACTUAR O RESPONDER — si pide acción, usa la herramienta; si pide info, responde directo
4. VERIFICAR — si es el 3er intercambio sin resolver, o el dueño está frustrado → escala a soporte

=== CRITERIO DE ÉXITO ===
Una respuesta es exitosa cuando:
- El dueño sabe exactamente qué pasó o qué hacer
- Usas datos reales del restaurante, no ejemplos genéricos
- Tono de socio experto, no de chatbot genérico
- Si no puedes resolver → escalas correctamente con el email de soporte`;

const SHARED_CAPABILITIES_INTRO_EN = `
=== OBJECTIVE ===
Resolve the restaurant owner's question in 1 clear, actionable response.
Success = the owner knows exactly what to do next.
Do not end your response with another question unless you need clarification to resolve the issue.

=== TOOLS / CAPABILITIES ===
You can:
1. Analyze real restaurant data — sales, orders, customers, average ticket, trends, peak hours
2. Guide step-by-step through any dashboard section — menu, orders, marketing, settings, billing
3. Interpret metrics — compare today vs yesterday, week vs prior week, detect problems
4. Act as a chef consultant — recipes, costs, food trends, themed menus
5. Suggest business strategies based on real restaurant data
6. Generate marketing ideas — campaigns, promotions, social media, customer retention
7. Explain system errors or issues with concrete solutions
8. Escalate to human support when the problem requires it
9. Execute direct actions — create promotions, toggle products, send email campaigns, adjust loyalty points

=== AVAILABLE ACTIONS ===
When the owner asks you to do something, EXECUTE the action directly using available tools.
Don't ask for confirmation on simple actions like creating a promo or toggling a product — the owner already asked.
Do confirm before sending mass email campaigns (confirm segment and message).

=== RESTRICTIONS ===
You CANNOT:
- Invent data not present in the restaurant context (if you don't have it, say so)
- Promise features that don't exist in MENIUS
- Give specific medical, legal, or tax advice
- Share data or information from other restaurants
- Process payments, refunds, or cancel subscriptions directly
- Give platform discounts or credits without authorization

=== PROCESS ===
For each incoming message, follow this order internally:
1. CLASSIFY — type of query: analytics / menu / orders / technical / strategy / chef / billing / action
2. REVIEW DATA — check the real restaurant context before responding
3. ACT OR RESPOND — if action requested, use the tool; if info requested, respond directly
4. VERIFY — if this is the 3rd exchange without resolution, or the owner is frustrated → escalate to support

=== SUCCESS CRITERIA ===
A response is successful when:
- The owner knows exactly what happened or what to do
- You use real restaurant data, not generic examples
- Tone of an expert partner, not a generic chatbot
- If you can't resolve it → escalate correctly with the support email`;

const SHARED_CAPABILITIES_BODY = `

DASHBOARD GUIDE (step-by-step for each section):

- **Home**: Today's stats, sales vs yesterday, recent orders, low stock alerts, onboarding checklist, share menu button.
- **Menu > Categories**: Create/edit/reorder categories, show/hide.
- **Menu > Products**: Add with name, description, price, photo (upload, AI-generate, or gallery). Toggles: Active, In Stock, Featured, New, Dietary tags, Translations. Add variants/extras via "Options & extras".
- **Menu > Import (OCR)**: Upload photo of physical menu → AI creates categories and products automatically.
- **Tables & QR**: Create tables, generate printable QR codes per table.
- **Counter**: Cashier screen. Accept orders, set ETA, assign drivers, print tickets.
- **Kitchen (KDS)**: Full-screen real-time kitchen display with sound alerts.
- **Orders**: Full history, filter by status/date/type. Click order for details, contact customer via WhatsApp.
- **Customers (CRM)**: Auto-built from orders. Profile shows history, total spent, tags. Send WhatsApp/email.
- **Analytics**: Sales charts, top products, order type breakdown, peak hours heatmap.
- **Marketing Hub**: Email Campaigns, Social Media AI generator, SMS Campaigns, 9 pre-built Automations.
- **Promotions**: Discount coupons — percentage or fixed, with code, max uses, expiration.
- **Reviews**: See ratings and comments. Respond from dashboard.
- **Team/Staff**: Add employees with roles (admin, manager, staff, kitchen). Add delivery drivers.
- **Settings**: Logo, cover, public URL, custom domain (Pro+), basic info, order types, payment methods, Stripe Connect, operating hours, notifications (WhatsApp + email), taxes, printers (per-device).
- **Billing**: Plan status, usage, upgrade/downgrade, invoices, Stripe portal, cancel subscription.
- **Data & Privacy**: Export all data as JSON. Delete account permanently.
- **Keyboard Shortcuts**: Ctrl+K (Cmd+K) opens Command Palette.

MARKETING:
- Email campaigns: best for reactivating lapsed customers and rewarding VIPs. Segment first.
- Social media AI generator: pick platform + post type → caption, hashtags, posting tips.
- SMS: 98% open rate. Use for time-sensitive offers only. Keep under 160 chars.
- Automations: enable in Settings. Zero-effort retention — runs automatically on customer behavior.

PROMOTION STRATEGY:
- "Free dessert with order over $X" beats "10% off" (higher perceived value, lower cost).
- Reactivation: specific product mention beats generic "we miss you".
- Flash offers: 4-6 hour windows perform 3x better than "this week only".

TROUBLESHOOTING:
- Orders not appearing: Settings > Notifications — master toggle must be ON, add WhatsApp/email.
- Payment issues: Settings > Payment Methods — Stripe Connect must show green badge.
- Menu not updating: takes 1-2 min. Check product is Active.
- Product shows sold out: Menu > Products > click product > toggle "In Stock" ON.
- Custom domain not verifying: DNS takes up to 48h. CNAME → cname.vercel-dns.com.
- Printer not printing: Settings > Printers — enable at least one option. Use Chrome/Edge.

ESCALATION:
- After 3 unresolved exchanges, or billing/payment dispute, or critical bug → soporte@menius.app
- Never say "I'm just an AI". Give best answer and offer escalation if truly out of scope.

RULES:
- Max 350 words, clear and direct
- Use **bold** and lists when it improves readability
- Say exactly where to go in the dashboard when action is needed
- Use the restaurant's currency for amounts
- Max 2-3 emojis per response, only when they add value
- Never make up data — say "I don't have that data yet"
- On first message / hello, give a quick status summary with 2-3 actionable tips from real data
- CRITICAL: Always respond in the same language the user writes in`;


function getSystemPrompt(locale: string, restaurantName?: string) {
  const name = restaurantName ? `"${restaurantName}"` : 'your restaurant';
  const nameEs = restaurantName ? `"${restaurantName}"` : 'tu restaurante';
  if (locale === 'en') return `=== IDENTITY ===
You are "MENIUS AI" — the expert business partner for ${name}, powered by MENIUS, a digital management platform for restaurants.
Your expertise: food service operations, sales analytics, marketing, menu management, and restaurant business strategy.
You are approachable, direct, warm, and professional. You talk like a trusted colleague — not a robot.
Match the user's language — if they write in Spanish, reply in Spanish; if in English, reply in English.

Style examples:
- Instead of "The average ticket is $15.50" → "Your average ticket is at **$15.50** — not bad, but pushing extras could easily get you to $18."
- Instead of "You have no active promotions" → "No active promos right now. Want me to suggest one?"
${SHARED_CAPABILITIES_INTRO_EN}
${SHARED_CAPABILITIES_BODY}`;

  return `=== IDENTIDAD ===
Eres "MENIUS AI" — el socio experto de ${nameEs}, la plataforma de gestión digital MENIUS para restaurantes.
Tu expertise: operaciones de restaurante, análisis de ventas, marketing gastronómico, gestión de menús y estrategia de negocio.
Eres cercano, directo, cálido y profesional. Hablas como un colega de confianza — no como un robot. Tuteas al usuario.
Si el usuario escribe en inglés, responde en inglés; si escribe en español, responde en español.

Ejemplos de tu estilo:
- En vez de "El ticket promedio es $15.50" → "Tu ticket promedio anda en **$15.50** — nada mal, pero con extras podrías llegar fácil a $18."
- En vez de "No tienes promociones activas" → "Sin promos activas. ¿Quieres que te sugiera una?"
${SHARED_CAPABILITIES_INTRO_ES}
${SHARED_CAPABILITIES_BODY}`;
}

function buildProactiveTips(context: string, atRiskCount: number, zeroSalesNames: string[]): string {
  const tips: string[] = [];

  const noImageMatch = context.match(/(?:Products without image|Productos sin imagen): (\d+)/);
  if (noImageMatch && parseInt(noImageMatch[1]) > 0) {
    tips.push(`ALERT: ${noImageMatch[1]} products without images — products with images sell up to 30% more.`);
  }

  const cancelledMatch = context.match(/(?:Cancelled|Canceladas): (\d+)/);
  if (cancelledMatch && parseInt(cancelledMatch[1]) > 3) {
    tips.push(`ALERT: ${cancelledMatch[1]} cancellations this month — worth investigating why.`);
  }

  const pendingMatch = context.match(/(?:Pending now|Pendientes ahora): (\d+)/);
  if (pendingMatch && parseInt(pendingMatch[1]) > 0) {
    tips.push(`URGENT: ${pendingMatch[1]} pending orders unattended.`);
  }

  if (context.includes('Address: Not set') || context.includes('Dirección: No configurado')) {
    tips.push('IMPROVE: No address configured.');
  }

  if (context.includes('Schedule: Not set') || context.includes('Horario: No configurado')) {
    tips.push('IMPROVE: No schedule configured.');
  }

  if (context.includes('No active promotions') || context.includes('Sin promociones activas')) {
    tips.push('OPPORTUNITY: No active promotions — promos can increase sales 15-20%.');
  }

  const ratingMatch = context.match(/(?:Average rating|Rating promedio): ([\d.]+)/);
  if (ratingMatch && parseFloat(ratingMatch[1]) < 4.0) {
    tips.push(`ATTENTION: Rating at ${ratingMatch[1]} — review comments to improve.`);
  }

  const trialMatch = context.match(/(?:Trial days left|Días de prueba restantes): (\d+)/);
  if (trialMatch && parseInt(trialMatch[1]) <= 5) {
    tips.push(`NOTICE: Only ${trialMatch[1]} trial days left.`);
  }

  if (atRiskCount > 0) {
    tips.push(`RETENTION: ${atRiskCount} customers haven't ordered in 21+ days — a targeted promo could bring them back.`);
  }

  if (zeroSalesNames.length > 0) {
    tips.push(`MENU: ${zeroSalesNames.join(', ')} — active but 0 sales this month. Consider featuring, discounting, or removing.`);
  }

  if (tips.length === 0) return '';
  return `\n\n=== ALERTS & OPPORTUNITIES ===\n${tips.join('\n')}`;
}

// Execute a tool call and return a human-readable result
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  restaurantId: string,
  menuUrl: string,
): Promise<string> {
  const supabase = await createClient();

  if (name === 'create_promotion') {
    const code = String(args.code ?? '').toUpperCase().replace(/\s+/g, '');
    const discount_type = args.discount_type as 'percentage' | 'fixed';
    const discount_value = Number(args.discount_value);
    const min_order = args.min_order ? Number(args.min_order) : 0;
    const expires_in_days = args.expires_in_days ? Number(args.expires_in_days) : 30;
    const max_uses = args.max_uses ? Number(args.max_uses) : null;
    const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('promotions').insert({
      restaurant_id: restaurantId,
      code,
      discount_type,
      discount_value,
      min_order,
      expires_at,
      max_uses,
      is_active: true,
      usage_count: 0,
    });

    if (error) {
      if (error.code === '23505') return `ERROR: The code "${code}" already exists. Try a different code.`;
      return `ERROR: Could not create promotion — ${error.message}`;
    }
    return `SUCCESS: Promotion "${code}" created — ${discount_type === 'percentage' ? `${discount_value}%` : `$${discount_value}`} off${min_order > 0 ? `, min order $${min_order}` : ''}, expires in ${expires_in_days} days${max_uses ? `, max ${max_uses} uses` : ''}.`;
  }

  if (name === 'toggle_product') {
    const product_name = String(args.product_name ?? '');
    const active = Boolean(args.active);

    const { data: matches } = await supabase
      .from('products')
      .select('id, name, is_active')
      .eq('restaurant_id', restaurantId)
      .ilike('name', `%${product_name}%`)
      .limit(3);

    if (!matches || matches.length === 0) {
      return `ERROR: No product found matching "${product_name}". Check the exact name in Menu > Products.`;
    }
    if (matches.length > 1) {
      return `CLARIFY: Multiple products match "${product_name}": ${matches.map(p => p.name).join(', ')}. Be more specific.`;
    }

    const product = matches[0];
    if (product.is_active === active) {
      return `INFO: "${product.name}" is already ${active ? 'active' : 'inactive'}.`;
    }

    const { error } = await supabase.from('products').update({ is_active: active }).eq('id', product.id);
    if (error) return `ERROR: Could not update product — ${error.message}`;
    return `SUCCESS: "${product.name}" is now ${active ? 'active and visible on your menu' : 'hidden from your menu'}.`;
  }

  if (name === 'send_campaign') {
    const segment = String(args.segment ?? 'all') as 'all' | 'vip' | 'inactive' | 'recent';
    const subject = String(args.subject ?? '').slice(0, 200);
    const message = String(args.message ?? '').slice(0, 500);
    const cta_label = args.cta_label ? String(args.cta_label).slice(0, 50) : undefined;

    // Use admin client to bypass cookie auth — restaurantId is already verified by getTenant() upstream
    const admin = createAdminClient();

    const { data: restaurant } = await admin
      .from('restaurants')
      .select('name, slug, locale')
      .eq('id', restaurantId)
      .maybeSingle();
    if (!restaurant) return 'ERROR: Restaurant not found.';

    const segmentFilter = segment === 'vip' ? 'vip' : segment === 'inactive' ? 'inactive' : segment === 'recent' ? 'recent' : undefined;
    let query = admin
      .from('customers')
      .select('id, name, email, total_orders, last_order_at')
      .eq('restaurant_id', restaurantId)
      .not('email', 'is', null)
      .neq('email', '')
      .not('tags', 'cs', '{"unsubscribed"}');

    if (segmentFilter === 'vip') {
      query = query.gte('total_orders', 5);
    } else if (segmentFilter === 'inactive') {
      query = query.lt('last_order_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    } else if (segmentFilter === 'recent') {
      query = query.gte('last_order_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }

    const { data: customers } = await query.limit(500);
    if (!customers || customers.length === 0) {
      return `ERROR: No customers with email match the "${segment}" segment.`;
    }

    const { sendEmail } = await import('@/lib/notifications/email');
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');
    const ctaUrl = menuUrl || `${appUrl}/${restaurant.slug}`;
    let sent = 0;

    for (const customer of customers) {
      if (!customer.email) continue;
      const success = await sendEmail({
        to: customer.email,
        subject: subject.replace('{nombre}', customer.name || 'Cliente'),
        html: `<p>${message.replace(/\n/g, '<br>')}</p>${cta_label ? `<a href="${ctaUrl}" style="display:block;margin-top:16px;padding:12px;background:#7c3aed;color:#fff;text-align:center;border-radius:8px;text-decoration:none;">${cta_label}</a>` : ''}`,
      });
      if (success) sent++;
    }

    return `SUCCESS: Campaign sent to ${sent} of ${customers.length} ${segment} customers. Subject: "${subject}".`;
  }

  if (name === 'adjust_loyalty_points') {
    const customer_phone = String(args.customer_phone ?? '');
    const points = Number(args.points);
    const reason = String(args.reason ?? 'Manual adjustment by owner');

    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('id, points')
      .eq('restaurant_id', restaurantId)
      .eq('customer_phone', customer_phone)
      .maybeSingle();

    if (!account) {
      return `ERROR: No loyalty account found for ${customer_phone}. The customer needs to have at least one order with loyalty enabled.`;
    }

    const { error } = await supabase.rpc('adjust_loyalty_points', {
      p_account_id: account.id,
      p_points: points,
      p_description: reason,
      p_order_id: null,
    });

    if (error) return `ERROR: Could not adjust points — ${error.message}`;
    const newBalance = account.points + points;
    return `SUCCESS: ${points > 0 ? 'Added' : 'Removed'} ${Math.abs(points)} points for ${customer_phone}. New balance: ${newBalance} points.`;
  }

  return `ERROR: Unknown tool "${name}".`;
}

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
  }

  const canUseAIChat = await hasPlanAccess(tenant.restaurantId, 'starter');
  if (!canUseAIChat) {
    return new Response(JSON.stringify({ error: 'El asistente MENIUS AI requiere el plan Starter o superior.' }), { status: 403 });
  }

  // Per-plan rate limits: Starter=60, Pro=120, Business=300 msgs/hour
  const supabase = await createClient();
  const { data: sub } = await supabase.from('subscriptions').select('plan_id').eq('restaurant_id', tenant.restaurantId).maybeSingle();
  const planId = sub?.plan_id ?? 'free';
  const rateLimit = planId === 'business' ? 300 : planId === 'pro' ? 120 : 60;

  const { allowed } = await checkRateLimitAsync(`ai-chat:${tenant.userId}`, { limit: rateLimit, windowSec: 3600 });
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Has alcanzado el límite de mensajes. Intenta en unos minutos.' }), { status: 429 });
  }

  const anthropicKey = (process.env.ANTHROPIC_API_KEY ?? '').trim();
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'IA no configurada.' }), { status: 503 });
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Solicitud inválida.' }), { status: 400 });
  }

  const userMessage = String(body.message ?? '').trim().slice(0, 2000);
  const clientHistory: ChatMessage[] = Array.isArray(body.history)
    ? body.history.slice(-20).map((m: ChatMessage) => ({
        role: m.role,
        text: String(m.text ?? '').slice(0, 2000),
      }))
    : [];

  if (!userMessage) {
    return new Response(JSON.stringify({ error: 'Mensaje vacío' }), { status: 400 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: savedMessages } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('restaurant_id', tenant.restaurantId)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(20);

  const memoryMessages = (savedMessages ?? []).reverse();

  // Client always sends its own history (even empty []). We trust client state
  // exclusively — DB memory is only used when the client explicitly sends nothing
  // (body.history === undefined), which means a legacy or non-widget caller.
  let conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  if (Array.isArray(body.history)) {
    conversationHistory = clientHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
  } else if (memoryMessages.length > 0) {
    conversationHistory = memoryMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant' as 'user' | 'assistant',
      content: m.content,
    }));
  } else {
    conversationHistory = [];
  }

  const { context, locale: restaurantLocale, restaurantName, restaurantSlug, atRiskCount, zeroSalesNames } = await gatherRestaurantContext(tenant.restaurantId);

  const proactiveTips = buildProactiveTips(context, atRiskCount, zeroSalesNames);
  const systemPrompt = getSystemPrompt(restaurantLocale, restaurantName);
  const menuUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '')}/${restaurantSlug}`;
  const fullSystemPrompt = `${systemPrompt}\n\n${restaurantLocale === 'en' ? 'CURRENT RESTAURANT DATA' : 'DATOS ACTUALES DEL RESTAURANTE'}:\n${context}${proactiveTips}`;

  // Claude tool definitions (same capabilities as before)
  const claudeTools: import('@anthropic-ai/sdk/resources').Tool[] = [
    {
      name: 'create_promotion',
      description: 'Create a discount promotion/coupon for the restaurant. Use when the owner asks to create a promo, coupon, or discount code.',
      input_schema: {
        type: 'object' as const,
        properties: {
          code: { type: 'string', description: 'Promotion code (uppercase, no spaces). E.g. LUNES20' },
          discount_type: { type: 'string', enum: ['percentage', 'fixed'], description: 'percentage = % off, fixed = fixed amount off' },
          discount_value: { type: 'number', description: 'Discount amount. For percentage: 0-100. For fixed: amount in restaurant currency.' },
          min_order: { type: 'number', description: 'Minimum order total to apply the promo. Optional, default 0.' },
          expires_in_days: { type: 'number', description: 'Days until expiration from today. Default 30.' },
          max_uses: { type: 'number', description: 'Maximum number of times the code can be used. Omit for unlimited.' },
        },
        required: ['code', 'discount_type', 'discount_value'],
      },
    },
    {
      name: 'toggle_product',
      description: 'Activate or deactivate a product by name. Use when owner asks to enable/disable/hide/show a product.',
      input_schema: {
        type: 'object' as const,
        properties: {
          product_name: { type: 'string', description: 'Product name to search for (partial match is OK).' },
          active: { type: 'boolean', description: 'true = activate the product, false = deactivate it.' },
        },
        required: ['product_name', 'active'],
      },
    },
    {
      name: 'send_campaign',
      description: 'Send an email marketing campaign to a customer segment. Use when owner asks to send email/campaign to customers.',
      input_schema: {
        type: 'object' as const,
        properties: {
          segment: { type: 'string', enum: ['all', 'vip', 'inactive', 'recent'], description: 'all=everyone, vip=5+ orders, inactive=30+ days no order, recent=last 7 days' },
          subject: { type: 'string', description: 'Email subject line.' },
          message: { type: 'string', description: 'Email body message (plain text, max 500 chars).' },
          cta_label: { type: 'string', description: 'Call-to-action button text. E.g. "Ver menú".' },
        },
        required: ['segment', 'subject', 'message'],
      },
    },
    {
      name: 'adjust_loyalty_points',
      description: 'Add or remove loyalty points for a customer by phone number.',
      input_schema: {
        type: 'object' as const,
        properties: {
          customer_phone: { type: 'string', description: 'Customer phone number.' },
          points: { type: 'number', description: 'Points to add (positive) or remove (negative).' },
          reason: { type: 'string', description: 'Reason for the adjustment.' },
        },
        required: ['customer_phone', 'points', 'reason'],
      },
    },
  ];

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const messages: import('@anthropic-ai/sdk/resources').MessageParam[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      let fullReply = '';

      try {
        const claudeStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2500,
          system: fullSystemPrompt,
          tools: claudeTools,
          messages,
        });

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullReply += event.delta.text;
            controller.enqueue(sse({ chunk: event.delta.text }));
          }
        }

        const finalMsg = await claudeStream.finalMessage();

        // Handle tool use
        if (finalMsg.stop_reason === 'tool_use') {
          const toolUseBlock = finalMsg.content.find(b => b.type === 'tool_use');
          if (toolUseBlock && toolUseBlock.type === 'tool_use') {
            const toolResult = await executeTool(
              toolUseBlock.name,
              toolUseBlock.input as Record<string, unknown>,
              tenant.restaurantId,
              menuUrl,
            );

            // Second round with tool result
            const messagesWithTool: import('@anthropic-ai/sdk/resources').MessageParam[] = [
              ...messages,
              { role: 'assistant', content: finalMsg.content },
              {
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: toolUseBlock.id,
                  content: toolResult,
                }],
              },
            ];

            fullReply = '';
            const claudeStream2 = anthropic.messages.stream({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 2500,
              system: fullSystemPrompt,
              tools: claudeTools,
              messages: messagesWithTool,
            });

            for await (const event of claudeStream2) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullReply += event.delta.text;
                controller.enqueue(sse({ chunk: event.delta.text }));
              }
            }
          }
        }

        controller.enqueue(sse({ done: true }));
        controller.close();

        if (fullReply) {
          supabase.from('chat_messages').insert([
            { restaurant_id: tenant.restaurantId, user_id: tenant.userId, role: 'user', content: userMessage },
            { restaurant_id: tenant.restaurantId, user_id: tenant.userId, role: 'assistant', content: fullReply },
          ]).then(() => {});
        }
      } catch (err) {
        logger.error('Chat stream error', { error: err instanceof Error ? err.message : String(err) });
        controller.enqueue(sse({ error: 'Error interno del asistente.' }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
