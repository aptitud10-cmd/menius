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

async function gatherRestaurantContext(restaurantId: string): Promise<{ context: string; locale: string }> {
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

  const locale = restaurant?.locale ?? 'es';
  const en = locale === 'en';

  const avgRating = (reviews ?? []).length > 0
    ? ((reviews ?? []).reduce((s, r) => s + r.rating, 0) / (reviews ?? []).length).toFixed(1)
    : (en ? 'No reviews' : 'Sin reseñas');

  const plan = subscription ? getPlan(subscription.plan_id) : null;
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

  const activeProducts = (products ?? []).filter(p => p.is_active);
  const inactiveProducts = (products ?? []).filter(p => !p.is_active);
  const productsWithoutImage = activeProducts.filter(p => !p.image_url);
  const activeTables = (tables ?? []).filter(t => t.is_active);
  const activePromos = (promotions ?? []).filter(p => p.is_active);

  const na = en ? 'Not set' : 'No configurado';

  const context = `
=== ${en ? 'RESTAURANT' : 'RESTAURANTE'} ===
${en ? 'Name' : 'Nombre'}: ${restaurant?.name ?? 'N/A'}
Slug: ${restaurant?.slug ?? 'N/A'}
${en ? 'Menu URL' : 'URL del menú'}: menius.app/r/${restaurant?.slug ?? ''}
${en ? 'Currency' : 'Moneda'}: ${restaurant?.currency ?? 'USD'}
${en ? 'Language' : 'Idioma'}: ${locale}
${en ? 'Address' : 'Dirección'}: ${restaurant?.address || na}
${en ? 'Phone' : 'Teléfono'}: ${restaurant?.phone || na}
Email: ${restaurant?.email || na}
${en ? 'WhatsApp notifications' : 'WhatsApp notificaciones'}: ${restaurant?.notification_whatsapp || na}
${en ? 'Active order types' : 'Tipos de orden activos'}: ${(restaurant?.order_types_enabled as string[] ?? ['dine_in']).join(', ')}
${en ? 'Payment methods' : 'Métodos de pago'}: ${(restaurant?.payment_methods_enabled as string[] ?? ['cash']).join(', ')}
${en ? 'Schedule' : 'Horario'}: ${restaurant?.operating_hours ? JSON.stringify(restaurant.operating_hours) : na}

=== ${en ? 'SUBSCRIPTION' : 'SUSCRIPCIÓN'} ===
${en ? 'Plan' : 'Plan'}: ${plan?.name ?? (en ? 'No plan' : 'Sin plan')}
${en ? 'Status' : 'Estado'}: ${subscription?.status ?? 'N/A'}
${trialDaysLeft !== null ? `${en ? 'Trial days left' : 'Días de prueba restantes'}: ${trialDaysLeft}` : ''}
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

=== ${en ? 'THIS MONTH\'S SALES (30 days)' : 'VENTAS ESTE MES (30 días)'} ===
${en ? 'Total orders' : 'Ordenes totales'}: ${allMonth.length}
${en ? 'Completed' : 'Completadas'}: ${completedMonth.length}
${en ? 'Cancelled' : 'Canceladas'}: ${cancelledMonth}
${en ? 'Revenue' : 'Ingresos'}: $${monthRevenue.toFixed(2)}
${en ? 'Discounts given' : 'Descuentos otorgados'}: $${monthDiscount.toFixed(2)}
${en ? 'Avg ticket' : 'Ticket promedio'}: $${completedMonth.length > 0 ? (monthRevenue / completedMonth.length).toFixed(2) : '0.00'}
${en ? 'By type' : 'Por tipo'}: Dine-in: ${dineInOrders}, Pickup: ${pickupOrders}, Delivery: ${deliveryOrders}

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
${(crmCustomers ?? []).length > 0 ? (crmCustomers ?? []).slice(0, 15).map((c, i) => `${i + 1}. ${c.name || (en ? 'Anonymous' : 'Anónimo')}${c.phone ? ` (${c.phone})` : ''}${c.email ? ` — ${c.email}` : ''} — ${c.total_orders} ${en ? 'orders' : 'ordenes'}, $${Number(c.total_spent).toFixed(2)} total${c.tags?.length > 0 ? ` [${c.tags.join(', ')}]` : ''}${c.last_order_at ? ` — ${en ? 'last' : 'última'}: ${new Date(c.last_order_at).toLocaleDateString()}` : ''}`).join('\n') : (en ? 'No customers yet' : 'Sin clientes registrados aún')}

=== ${en ? 'RECENT ORDERS TODAY' : 'ORDENES RECIENTES HOY'} ===
${allToday.slice(0, 10).map(o => `#${o.order_number} — ${o.customer_name || (en ? 'No name' : 'Sin nombre')} — $${Number(o.total).toFixed(2)} — ${o.status} — ${o.order_type ?? 'dine_in'}`).join('\n') || (en ? 'No orders today' : 'Sin ordenes hoy')}
`.trim();

  return { context, locale };
}

const SHARED_CAPABILITIES = `
CORE CAPABILITIES:
1. Analytics & sales — Daily/weekly/monthly sales, average ticket, trends, peak hours, best/worst sellers
2. CRM & customers — Customer database with history, total spend, frequency, tags, segmentation
3. Menu & products — Prices, products without images, menu optimization, pricing suggestions
4. Orders — Order status, pending, cancelled, preparation times
5. Dashboard guide — Step-by-step explanations of each section
6. Business strategy — Promotions, schedules, marketing, how to sell more
7. Reviews — Feedback analysis, suggestions to improve ratings
8. Subscription — Current plan, limits, which plan to choose

CHEF CONSULTANT:
9. Recipes — Detailed recipes: ingredients, quantities, steps, timing, chef tips
10. Drinks & cocktails — Beverage recipes, pairings, menu combinations
11. Recipe costing — Help calculate cost per portion given ingredient prices
12. Food trends — Trending dishes, creative variations, themed menus
13. Cooking tips — Techniques, ingredient substitutions, presentation improvement
14. Themed menus — Ideas for holidays, seasons, special events

DASHBOARD GUIDE (step-by-step for each section):
- Menu > Categories: Create/edit categories, drag & drop ordering, show/hide categories
- Menu > Products: Add products with name, description, price, photo (upload, AI-generate, or gallery). Add variants/extras via "Options & extras" section: click "+ New group", pick a template (Size, Extras, Preparation, Sides) or custom. Each option can have an extra price ($0.00 = included).
- Menu > Gallery: Shared image library for reusing product photos
- Tables & QR: Create tables, generate printable QR codes. Customers scan to see your menu.
- Kitchen (KDS): Kitchen display screen. Orders appear in real-time with sound alerts. Change status: pending → preparing → ready → completed.
- Orders: Full order history. Filter by status, date, type. Click an order to see details, contact customer via WhatsApp, cancel or refund.
- Customers: CRM database. Each customer has order history, total spent, tags, notes. Click to send WhatsApp message or email.
- Analytics: Sales charts (daily/weekly/monthly), top products, order types breakdown, revenue trends.
- Marketing: Create email campaigns. Select customers by segment (all, tag, or custom). Write subject and body. Schedule or send immediately. Track opens and clicks.
- Promotions: Create discount coupons. Types: percentage off or fixed amount. Set code, max uses, expiration date. Share via WhatsApp or social media.
- Reviews: See customer reviews and ratings. Respond to reviews.
- Team/Staff: Add employees. Roles: admin, manager, staff, kitchen. Each role has different permissions.
- Settings: Restaurant name, logo, banner image, address, phone, email, WhatsApp number, operating hours (including 24h option), order types (dine-in, pickup, delivery), payment methods (cash, card, Stripe online), currency, timezone, language.
- Billing: Current plan and status. Upgrade/downgrade between Starter ($39/mo), Pro ($66/mo), Business ($124/mo). View invoices.
- Data & Privacy: Export data, delete account.

MARKETING & ADVERTISING GUIDE:
- How to create an email campaign: Go to Marketing > click "New campaign" > select audience > write subject and body > preview > send or schedule
- Best practices: Send 1-2 campaigns/week max. Best times: Tuesday 10am, Thursday 2pm. Use customer's first name. Include a clear call-to-action (order now, use this coupon).
- Social media ideas: Use the AI social post generator (Marketing > Social Post) to create Instagram/Facebook posts. Suggest: post 3-5 times/week, use food photos, share promotions, behind-the-scenes content, customer reviews.
- Promotion strategy: Create time-limited offers (48-72 hours). "Happy Hour" discounts, "First order 10% off", loyalty rewards for repeat customers. Use CRM tags to target specific segments.
- WhatsApp marketing: Share menu link and promo codes via WhatsApp. Set up WhatsApp notifications in Settings so you get alerts for new orders.

TROUBLESHOOTING GUIDE:
- Images not loading: Check if image URL is valid. Try re-uploading. Use AI image generation for better results.
- QR code not scanning: Make sure QR is printed large enough (min 3cm). Test with your phone camera first.
- Orders not appearing: Check if notification sound is enabled (bell icon). Check browser notification permissions. Refresh the page.
- Payment issues: Verify Stripe is connected in Settings > Payment methods. Check Stripe dashboard for errors.
- Menu not updating: Changes may take 1-2 minutes to appear on the public menu. Try clearing browser cache.
- Can't access dashboard: Check subscription status in Billing. If expired, renew to regain access.
- Slow performance: Clear browser cache. Use Chrome or Edge for best experience.

ESCALATION RULES:
- If you cannot solve the problem, or the user is frustrated, or it's a billing/payment dispute, or a critical bug: tell the user to contact support at soporte@menius.app or visit the Help section. Say something like: "This needs human attention — please email soporte@menius.app and we'll fix it within 24 hours."
- For feature requests: acknowledge them positively and suggest emailing soporte@menius.app with the idea.
- NEVER say "I'm just an AI" as an excuse. Instead, give your best answer and offer escalation if needed.

RULES:
- Max 350 words, clear and direct
- Use **bold** and lists when it improves readability
- If action is needed, say exactly where to go in the dashboard (e.g. "Go to **Menu > Products** > click the product > scroll to **Options & extras**")
- Use the restaurant's currency for amounts
- Max 2-3 emojis per response, only when they add value
- Never make up data — if you don't have data, say so and suggest where to find it
- On first message / hello, give a quick status summary with actionable tips
- CRITICAL: Always respond in the same language the user writes in`;

function getSystemPrompt(locale: string) {
  if (locale === 'en') return `You are "MENIUS AI", the intelligent assistant for MENIUS — a digital management platform for restaurants.

YOUR PERSONALITY:
You are like an expert business partner: approachable, direct, with real experience in food service and business. You talk like a trusted colleague, not a robot. Your tone is warm and professional. You can be witty when it fits, but you always provide value. Match the user's language — if they write in Spanish, reply in Spanish; if in English, reply in English.

Style examples:
- Instead of "The average ticket is $15.50" → "Your average ticket is at **$15.50** — not bad, but if you push extras you could easily hit $18."
- Instead of "You have no active promotions" → "No active promos right now. Want me to suggest one? Tuesdays tend to be slow for many restaurants."
- Instead of "Error, data not found" → "Hmm, I don't have that info yet. You might need to set it up first."
${SHARED_CAPABILITIES}`;

  return `Eres "MENIUS AI", el asistente inteligente de MENIUS — plataforma de gestión digital para restaurantes.

TU PERSONALIDAD:
Eres como un socio experto del restaurante: cercano, directo, con experiencia real en gastronomía y negocios. Hablas como un colega de confianza, no como un robot. Usas un tono cálido y profesional. Puedes ser gracioso cuando viene al caso, pero siempre aportas valor. Tuteas al usuario. Si el usuario escribe en inglés, responde en inglés; si escribe en español, responde en español.

Ejemplos de tu estilo:
- En vez de "El ticket promedio es $15.50" → "Tu ticket promedio anda en **$15.50** — nada mal, pero si subes los extras podrías llegar fácil a $18."
- En vez de "No tienes promociones activas" → "No tienes ninguna promo activa. ¿Quieres que te sugiera una? Los martes suelen ser flojos para muchos restaurantes."
- En vez de "Error, no encontré datos" → "Hmm, no tengo esa info todavía. Puede que necesites configurarlo primero."
${SHARED_CAPABILITIES}`;
}

function buildProactiveTips(context: string): string {
  const tips: string[] = [];

  const noImageMatch = context.match(/Products without image|Productos sin imagen: (\d+)/);
  if (noImageMatch && parseInt(noImageMatch[1]) > 0) {
    tips.push(`ALERT: ${noImageMatch[1]} products without images — products with images sell up to 30% more.`);
  }

  const cancelledMatch = context.match(/Cancelled|Canceladas: (\d+)/);
  if (cancelledMatch && parseInt(cancelledMatch[1]) > 3) {
    tips.push(`ALERT: ${cancelledMatch[1]} cancellations this month — worth investigating why.`);
  }

  const pendingMatch = context.match(/Pending now|Pendientes ahora: (\d+)/);
  if (pendingMatch && parseInt(pendingMatch[1]) > 0) {
    tips.push(`URGENT: ${pendingMatch[1]} pending orders unattended.`);
  }

  if (context.includes('Address: Not set') || context.includes('Dirección: No configurado')) {
    tips.push('IMPROVE: No address configured — customers don\'t know where to find you.');
  }

  if (context.includes('Schedule: Not set') || context.includes('Horario: No configurado')) {
    tips.push('IMPROVE: No schedule configured — customers don\'t know your opening hours.');
  }

  if (context.includes('No active promotions') || context.includes('Sin promociones activas')) {
    tips.push('OPPORTUNITY: No active promotions — promos can increase sales 15-20%.');
  }

  const ratingMatch = context.match(/Average rating|Rating promedio: ([\d.]+)/);
  if (ratingMatch && parseFloat(ratingMatch[1]) < 4.0) {
    tips.push(`ATTENTION: Rating at ${ratingMatch[1]} — review comments to improve.`);
  }

  const trialMatch = context.match(/Trial days left|Días de prueba restantes: (\d+)/);
  if (trialMatch && parseInt(trialMatch[1]) <= 5) {
    tips.push(`NOTICE: Only ${trialMatch[1]} trial days left.`);
  }

  if (tips.length === 0) return '';
  return `\n\n=== ALERTS & OPPORTUNITIES ===\n${tips.join('\n')}`;
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

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'IA no configurada.' }, { status: 503 });
    }

    const body = await request.json();
    const userMessage = String(body.message ?? '').trim();
    const clientHistory: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!userMessage) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    const supabase = createClient();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: savedMessages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('restaurant_id', tenant.restaurantId)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10);

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

    const { context, locale: restaurantLocale } = await gatherRestaurantContext(tenant.restaurantId);

    const proactiveTips = buildProactiveTips(context);
    const systemPrompt = getSystemPrompt(restaurantLocale);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${systemPrompt}\n\n${restaurantLocale === 'en' ? 'CURRENT RESTAURANT DATA' : 'DATOS ACTUALES DEL RESTAURANTE'}:\n${context}${proactiveTips}` }],
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
