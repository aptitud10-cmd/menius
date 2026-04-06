import { Redis } from '@upstash/redis';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';
import { createAdminClient } from '@/lib/supabase/admin';

function getAdminClient() {
  return createAdminClient();
}

interface IncomingMessage {
  from: string;
  text: string;
  name: string;
  messageId?: string;
}

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

type ConversationStep = 'browsing' | 'awaiting_name' | 'awaiting_confirm' | 'awaiting_order_confirm';

interface ConversationSession {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  locale: string;
  currency: string;
  lastActivity: number;
  step?: ConversationStep;
  cart?: CartItem[];
  customerName?: string;
  pendingOrderId?: string;
  pendingOrderNumber?: string;
}

// Sessions stored in Redis when available, falling back to in-process Map for local dev.
const SESSION_TTL_SECONDS = 30 * 60;
const localSessions = new Map<string, ConversationSession>();

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

async function getSession(from: string): Promise<ConversationSession | null> {
  const r = getRedis();
  if (r) {
    try {
      const data = await r.get<ConversationSession>(`wa:session:${from}`);
      return data ?? null;
    } catch {
      return localSessions.get(from) ?? null;
    }
  }
  return localSessions.get(from) ?? null;
}

async function setSession(from: string, session: ConversationSession): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(`wa:session:${from}`, session, { ex: SESSION_TTL_SECONDS });
      return;
    } catch { /* fall through */ }
  }
  localSessions.set(from, session);
}

async function clearSession(from: string): Promise<void> {
  const r = getRedis();
  if (r) {
    try { await r.del(`wa:session:${from}`); } catch { /* ignore */ }
  }
  localSessions.delete(from);
}

/** Exposed for webhook deduplication — returns the Redis client if available */
export function getRedisForWebhook(): Redis | null {
  return getRedis();
}

/** Called from order-notifications after placing an order, to set up bidirectional WA confirmation */
export async function storeOrderAwaitingConfirmation(
  customerPhone: string,
  orderId: string,
  orderNumber: string,
  restaurantId: string,
  restaurantName: string,
  slug: string,
  locale: string,
  currency: string,
): Promise<void> {
  const session: ConversationSession = {
    restaurantId,
    restaurantName,
    slug,
    locale,
    currency,
    lastActivity: Date.now(),
    step: 'awaiting_order_confirm',
    pendingOrderId: orderId,
    pendingOrderNumber: orderNumber,
  };
  await setSession(customerPhone, session);
}

async function findRestaurantByPhone(phone: string) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug, locale, currency, notification_whatsapp')
    .or(`notification_whatsapp.eq.${phone},notification_whatsapp.eq.+${phone}`)
    .maybeSingle();
  return data;
}

async function getMenuForRestaurant(restaurantId: string) {
  const supabase = getAdminClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
    supabase.from('products').select('id, name, description, price, category_id').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
  ]);
  return { categories: categories ?? [], products: products ?? [] };
}

// ── Intent detection ──

function detectIntent(text: string): 'menu' | 'hours' | 'order_status' | 'help' | 'greeting' | 'order' | 'confirm_order' | 'cancel_order' | 'unknown' {
  const lower = text.toLowerCase().trim();

  // Quick order confirmation/cancellation responses
  if (/^(1|si|sí|yes|confirmar|confirm)[\s!.]*$/i.test(lower)) return 'confirm_order';
  if (/^(2|no|cancelar|cancel|anular)[\s!.]*$/i.test(lower)) return 'cancel_order';

  if (/^(hola|hi|hello|hey|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|qu[eé]\s*tal)/i.test(lower)) {
    return 'greeting';
  }
  if (/men[uú]|carta|platillos?|productos?|que\s*tienen|what.*have|what.*serve/i.test(lower)) {
    return 'menu';
  }
  if (/horario|hora|abierto|cerrado|hours?|open|close/i.test(lower)) {
    return 'hours';
  }
  if (/pedido|orden|order|estado|status|tracking|seguimiento/i.test(lower) &&
      !/quiero.*order|quiero.*pedir|want.*order/i.test(lower)) {
    return 'order_status';
  }
  if (/ayuda|help|info|informaci[oó]n/i.test(lower)) {
    return 'help';
  }
  // Detect ordering intent: "quiero X", "dame X", "2 hamburguesas", etc.
  if (/quiero|pido|dame\s+\w|me\s+das?\s+\w|agregar|a[ñn]adir|ordenar|pedir|comprar|llevar|I\s+want|give\s+me|I[''']d\s+like|add\s+\w|\d+\s*(x\s*)?\w{3}/i.test(lower)) {
    return 'order';
  }

  return 'unknown';
}

function isConfirmation(text: string): boolean {
  return /^(si|sí|yes|confirm|ok|confirmar|dale|listo|va|claro|adelante|sure|yep|yeah|vamos|s[íi])[\s!.]*$/i.test(text.trim());
}

function isCancellation(text: string): boolean {
  return /^(no|cancel|cancelar|no\s+quiero|mejor\s+no|nope|stop|salir|exit)[\s!.]*$/i.test(text.trim());
}

// ── Formatting helpers ──

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatCartSummary(cart: CartItem[], currency: string): string {
  const lines = cart.map(
    (item) => `• ${item.qty}x ${item.name} — ${formatPrice(item.unitPrice * item.qty, currency)}`
  );
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  return lines.join('\n') + `\n\n*Total: ${formatPrice(total, currency)}*`;
}

// ── Gemini helpers ──

async function matchProductsWithAI(
  userMessage: string,
  products: { id: string; name: string; price: number }[],
): Promise<{ productId: string; qty: number }[]> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || products.length === 0) return [];

  const productList = products
    .map((p) => `ID:${p.id} NAME:"${p.name}" PRICE:${p.price}`)
    .join('\n');

  const prompt = `You are a JSON API for a restaurant ordering system.

MENU:
${productList}

CUSTOMER MESSAGE: "${userMessage}"

Extract what the customer wants to order. Return ONLY a valid JSON array like:
[{"productId": "uuid-here", "qty": 2}, {"productId": "uuid-here", "qty": 1}]

Rules:
- Match product names fuzzy (e.g. "hamburguesa" matches "Hamburguesa Clásica")
- Default qty is 1 if not specified
- Return [] if nothing clearly matches
- Return ONLY the JSON array, no markdown, no explanation`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonStr = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => {
      if (item === null || typeof item !== 'object') return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.productId === 'string' && typeof rec.qty === 'number' && (rec.qty as number) > 0;
    });
  } catch {
    return [];
  }
}

async function generateAIResponse(
  userMessage: string,
  restaurantName: string,
  menuSummary: string,
  locale: string,
): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return locale === 'en'
      ? `Thanks for your message! You can see our full menu at the link above. 😊`
      : `¡Gracias por tu mensaje! Puedes ver nuestro menú completo en el enlace de arriba. 😊`;
  }

  try {
    const systemPrompt =
      locale === 'en'
        ? `You are a friendly WhatsApp assistant for "${restaurantName}". Answer customer questions about the menu, hours, and ordering. Keep responses short (max 300 chars). Use emojis sparingly. Always be helpful and polite. Here's the menu:\n${menuSummary}`
        : `Eres un asistente amigable de WhatsApp para "${restaurantName}". Responde preguntas sobre el menú, horarios y pedidos. Mantén respuestas cortas (máx 300 caracteres). Usa emojis con moderación. Siempre sé útil y amable. Aquí está el menú:\n${menuSummary}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nCustomer message: "${userMessage}"` }],
            },
          ],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) throw new Error('Gemini API error');
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply?.trim() || (locale === 'en' ? 'Thanks for reaching out! 😊' : '¡Gracias por escribirnos! 😊');
  } catch {
    return locale === 'en'
      ? `Thanks for your message! Check our full menu online. 😊`
      : `¡Gracias por tu mensaje! Revisa nuestro menú completo en línea. 😊`;
  }
}

// ── Order creation ──

async function getProductsWithRequiredModifiers(
  restaurantId: string,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('modifier_groups')
    .select('product_id')
    .in('product_id', productIds)
    .eq('restaurant_id', restaurantId)
    .eq('is_required', true);
  return new Set((data ?? []).map((r) => r.product_id));
}

async function createWhatsAppOrder(
  session: ConversationSession,
  customerName: string,
  customerPhone: string,
  messageId?: string,
): Promise<{ orderNumber: string; error?: string }> {
  const supabase = getAdminClient();

  // Check if restaurant is paused
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('orders_paused_until, notification_whatsapp')
    .eq('id', session.restaurantId)
    .maybeSingle();

  const pausedUntil = (restaurant as any)?.orders_paused_until;
  if (pausedUntil && new Date(pausedUntil) > new Date()) {
    return { orderNumber: '', error: 'paused' };
  }

  const cart = session.cart ?? [];
  if (cart.length === 0) return { orderNumber: '', error: 'empty_cart' };

  // Fetch real server-side prices — never trust session values
  const productIds = cart.map((item) => item.productId);
  const { data: dbProducts } = await supabase
    .from('products')
    .select('id, price, name, in_stock')
    .in('id', productIds)
    .eq('restaurant_id', session.restaurantId);

  const priceMap = new Map(
    (dbProducts ?? []).map((p) => [
      p.id,
      { price: Number(p.price), name: p.name as string, inStock: p.in_stock },
    ])
  );

  const orderItems: {
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const item of cart) {
    const dbProduct = priceMap.get(item.productId);
    if (!dbProduct) continue;
    if (dbProduct.inStock === false) return { orderNumber: '', error: 'out_of_stock' };
    orderItems.push({
      productId: item.productId,
      name: dbProduct.name,
      qty: item.qty,
      unitPrice: dbProduct.price,
      lineTotal: dbProduct.price * item.qty,
    });
  }

  if (orderItems.length === 0) return { orderNumber: '', error: 'empty_cart' };

  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Generate order number using same RPC as web
  const { data: orderNum } = await supabase.rpc('generate_order_number', {
    rest_id: session.restaurantId,
  });
  const orderNumber = (orderNum as string) ?? `WA-${Date.now().toString(36).toUpperCase()}`;

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: session.restaurantId,
      order_number: orderNumber,
      customer_name: customerName,
      customer_phone: customerPhone,
      total,
      status: 'pending',
      order_type: 'pickup',
      payment_method: 'cash',
      notes: '📱 Pedido por WhatsApp',
      include_utensils: true,
      idempotency_key: messageId ? `wa:msg:${messageId}` : `wa:${customerPhone}:${Date.now()}`,
    })
    .select('id')
    .single();

  if (orderError || !order) return { orderNumber: '', error: 'db_error' };

  // Insert order items
  const { error: itemsError } = await supabase.from('order_items').insert(
    orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      qty: item.qty,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
    }))
  );

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { orderNumber: '', error: 'db_error' };
  }

  // Notify restaurant
  if (restaurant?.notification_whatsapp) {
    const isEn = session.locale === 'en';
    const itemLines = orderItems.map((i) => `• ${i.qty}x ${i.name}`).join('\n');
    const notifText = isEn
      ? `🔔 *New WhatsApp order!*\n#${orderNumber}\n\n${itemLines}\n\nTotal: ${formatPrice(total, session.currency)}\nCustomer: ${customerName} (${customerPhone})\nPickup / Cash`
      : `🔔 *¡Nuevo pedido por WhatsApp!*\n#${orderNumber}\n\n${itemLines}\n\nTotal: ${formatPrice(total, session.currency)}\nCliente: ${customerName} (${customerPhone})\nRecoger / Efectivo`;
    sendWhatsApp({ to: restaurant.notification_whatsapp, text: notifText }).catch(() => {});
  }

  return { orderNumber };
}

// ── Main handler ──

export async function handleIncomingMessage({ from, text, name, messageId }: IncomingMessage) {
  let session = await getSession(from);

  if (!session) {
    const restaurant = await findRestaurantByPhone(from);
    if (!restaurant) {
      await sendWhatsApp({
        to: from,
        text: '¡Hola! Este número no está asociado a ningún restaurante en MENIUS. Visita menius.app para más información.',
      });
      return;
    }

    session = {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      slug: restaurant.slug,
      locale: restaurant.locale ?? 'es',
      currency: restaurant.currency ?? 'MXN',
      lastActivity: Date.now(),
      step: 'browsing',
    };
  }

  session.lastActivity = Date.now();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const menuUrl = `${appUrl}/${session.slug}`;
  const isEn = session.locale === 'en';
  let reply = '';

  // ── Mid-conversation steps ──

  if (session.step === 'awaiting_name') {
    if (isCancellation(text)) {
      session.step = 'browsing';
      session.cart = undefined;
      await setSession(from, session);
      reply = isEn
        ? `Order cancelled. You can start over anytime! 😊\n📋 ${menuUrl}`
        : `Pedido cancelado. ¡Puedes empezar de nuevo cuando quieras! 😊\n📋 ${menuUrl}`;
      await sendWhatsApp({ to: from, text: reply });
      return;
    }

    const customerName = text.trim().slice(0, 60);
    session.customerName = customerName;
    session.step = 'awaiting_confirm';
    await setSession(from, session);

    const cartSummary = formatCartSummary(session.cart ?? [], session.currency);
    reply = isEn
      ? `Great! Order for *${customerName}*:\n\n${cartSummary}\n\n💵 Pay at pickup (cash)\n\nType *YES* to confirm or *CANCEL* to cancel.`
      : `¡Perfecto! Pedido para *${customerName}*:\n\n${cartSummary}\n\n💵 Pago al recoger (efectivo)\n\nEscribe *SÍ* para confirmar o *CANCELAR* para cancelar.`;
    await sendWhatsApp({ to: from, text: reply });
    return;
  }

  if (session.step === 'awaiting_confirm') {
    if (isCancellation(text)) {
      session.step = 'browsing';
      session.cart = undefined;
      session.customerName = undefined;
      await setSession(from, session);
      reply = isEn
        ? `Order cancelled. No problem! 😊\n📋 ${menuUrl}`
        : `Pedido cancelado. ¡Sin problema! 😊\n📋 ${menuUrl}`;
      await sendWhatsApp({ to: from, text: reply });
      return;
    }

    if (isConfirmation(text)) {
      const customerName = session.customerName ?? name ?? 'Cliente';
      const { orderNumber, error } = await createWhatsAppOrder(session, customerName, from, messageId);

      session.step = 'browsing';
      session.cart = undefined;
      session.customerName = undefined;
      await setSession(from, session);

      if (error === 'paused') {
        reply = isEn
          ? `Sorry, this restaurant is not accepting orders right now. Please try again later or visit: ${menuUrl}`
          : `Lo sentimos, el restaurante no está aceptando pedidos en este momento. Intenta más tarde o visita: ${menuUrl}`;
      } else if (error === 'out_of_stock') {
        reply = isEn
          ? `Sorry, one of the items in your order is out of stock. Please check the menu and try again: ${menuUrl}`
          : `Lo sentimos, uno de los productos de tu pedido está agotado. Revisa el menú e intenta de nuevo: ${menuUrl}`;
      } else if (error) {
        reply = isEn
          ? `There was an error processing your order. Please try again or order directly from: ${menuUrl}`
          : `Hubo un error al procesar tu pedido. Intenta de nuevo o pide desde: ${menuUrl}`;
      } else {
        reply = isEn
          ? `✅ *Order #${orderNumber} confirmed!* 🎉\n\nWe'll notify you when it's ready for pickup. Thank you, ${customerName}! 😊`
          : `✅ *¡Pedido #${orderNumber} confirmado!* 🎉\n\nTe avisaremos cuando esté listo para recoger. ¡Gracias, ${customerName}! 😊`;
      }

      await sendWhatsApp({ to: from, text: reply });
      return;
    }

    // Unrecognized input during confirm step — remind
    reply = isEn
      ? `Please type *YES* to confirm your order or *CANCEL* to cancel it.`
      : `Por favor escribe *SÍ* para confirmar tu pedido o *CANCELAR* para cancelarlo.`;
    await sendWhatsApp({ to: from, text: reply });
    return;
  }

  // ── Bidirectional order confirmation ──
  // Customer responds 1/YES to confirm their placed order, 2/NO to cancel
  if (session.step === 'awaiting_order_confirm' && session.pendingOrderId) {
    const supabase = getAdminClient();
    const intent = detectIntent(text);

    if (intent === 'confirm_order') {
      // Mark order as confirmed
      await supabase.from('orders').update({ status: 'confirmed' }).eq('id', session.pendingOrderId);
      session.step = 'browsing';
      session.pendingOrderId = undefined;
      session.pendingOrderNumber = undefined;
      await setSession(from, session);
      reply = isEn
        ? `✅ Order *#${session.pendingOrderNumber}* confirmed! We'll notify you when it's ready. 🙌`
        : `✅ ¡Orden *#${session.pendingOrderNumber}* confirmada! Te avisamos cuando esté lista. 🙌`;
      await sendWhatsApp({ to: from, text: reply });
      return;
    }

    if (intent === 'cancel_order') {
      await supabase.from('orders').update({ status: 'cancelled', cancellation_reason: isEn ? 'Cancelled by customer via WhatsApp' : 'Cancelado por cliente via WhatsApp' }).eq('id', session.pendingOrderId);
      session.step = 'browsing';
      session.pendingOrderId = undefined;
      session.pendingOrderNumber = undefined;
      await setSession(from, session);
      reply = isEn
        ? `❌ Order *#${session.pendingOrderNumber}* has been cancelled. Let us know if you need anything else!`
        : `❌ Orden *#${session.pendingOrderNumber}* cancelada. ¡Avísanos si necesitas algo más!`;
      await sendWhatsApp({ to: from, text: reply });
      return;
    }

    // Unrecognized — remind
    reply = isEn
      ? `Reply *1* to confirm your order or *2* to cancel.`
      : `Responde *1* para confirmar tu orden o *2* para cancelarla.`;
    await sendWhatsApp({ to: from, text: reply });
    return;
  }

  // ── Normal intent detection (step === 'browsing' or undefined) ──

  const intent = detectIntent(text);

  switch (intent) {
    case 'greeting': {
      reply = isEn
        ? `Hi${name ? ` ${name}` : ''}! 👋 Welcome to *${session.restaurantName}*.\n\nHow can I help you?\n📋 See our menu: ${menuUrl}\n\nYou can also type what you'd like to order and I'll help you! 🛒`
        : `¡Hola${name ? ` ${name}` : ''}! 👋 Bienvenido/a a *${session.restaurantName}*.\n\n¿En qué te puedo ayudar?\n📋 Ver menú: ${menuUrl}\n\n¡También puedes escribir lo que quieres pedir y te ayudo! 🛒`;
      break;
    }

    case 'menu': {
      const { products } = await getMenuForRestaurant(session.restaurantId);

      if (products.length === 0) {
        reply = isEn
          ? `Our menu is being updated. Check back soon!\n📋 ${menuUrl}`
          : `Nuestro menú se está actualizando. ¡Vuelve pronto!\n📋 ${menuUrl}`;
        break;
      }

      const topProducts = products.slice(0, 8);
      const productList = topProducts
        .map((p) => `• ${p.name} — ${formatPrice(Number(p.price), session.currency)}`)
        .join('\n');

      reply = isEn
        ? `📋 *Menu — ${session.restaurantName}*\n\n${productList}\n\n${products.length > 8 ? `...and ${products.length - 8} more items\n\n` : ''}💬 Just type what you want to order!\n👉 Full menu: ${menuUrl}`
        : `📋 *Menú — ${session.restaurantName}*\n\n${productList}\n\n${products.length > 8 ? `...y ${products.length - 8} productos más\n\n` : ''}💬 ¡Escribe lo que quieres pedir!\n👉 Menú completo: ${menuUrl}`;
      break;
    }

    case 'hours': {
      const supabase = getAdminClient();
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('operating_hours')
        .eq('id', session.restaurantId)
        .maybeSingle();

      if (!restaurant?.operating_hours) {
        reply = isEn
          ? `We haven't set our hours yet. Contact us for more info!\n📋 ${menuUrl}`
          : `Aún no hemos configurado nuestro horario. ¡Contáctanos para más info!\n📋 ${menuUrl}`;
        break;
      }

      const days: Record<string, string> = isEn
        ? { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
        : { monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom' };

      const hours = Object.entries(
        restaurant.operating_hours as Record<string, { open: string; close: string; closed?: boolean }>
      )
        .map(([day, h]) => {
          const label = days[day] ?? day;
          if (h.closed) return `${label}: ${isEn ? 'Closed' : 'Cerrado'}`;
          return `${label}: ${h.open} – ${h.close}`;
        })
        .join('\n');

      reply = isEn
        ? `🕐 *Hours — ${session.restaurantName}*\n\n${hours}`
        : `🕐 *Horario — ${session.restaurantName}*\n\n${hours}`;
      break;
    }

    case 'order_status': {
      // Look up most recent order by this customer phone
      const supabase = getAdminClient();
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number, status, created_at')
        .eq('customer_phone', from)
        .eq('restaurant_id', session.restaurantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOrder) {
        const statusMap: Record<string, { es: string; en: string }> = {
          pending: { es: 'Pendiente', en: 'Pending' },
          confirmed: { es: 'Confirmada', en: 'Confirmed' },
          preparing: { es: 'En preparación', en: 'Preparing' },
          ready: { es: 'Lista para entrega', en: 'Ready for pickup' },
          delivered: { es: 'Entregada', en: 'Delivered' },
          cancelled: { es: 'Cancelada', en: 'Cancelled' },
        };
        const s = statusMap[lastOrder.status] ?? { es: lastOrder.status, en: lastOrder.status };
        reply = isEn
          ? `📦 Your last order *#${lastOrder.order_number}* is: *${s.en}*\n\nFull tracking: ${menuUrl}`
          : `📦 Tu última orden *#${lastOrder.order_number}* está: *${s.es}*\n\nSeguimiento completo: ${menuUrl}`;
      } else {
        reply = isEn
          ? `No recent orders found for your number. Want to order? 👉 ${menuUrl}`
          : `No encontré órdenes recientes para tu número. ¿Quieres pedir? 👉 ${menuUrl}`;
      }
      break;
    }

    case 'confirm_order':
    case 'cancel_order': {
      // No pending order to confirm/cancel — generic response
      reply = isEn
        ? `To check your order, use your tracking link or visit: ${menuUrl}`
        : `Para ver tu orden, usa tu enlace de seguimiento o visita: ${menuUrl}`;
      break;
    }

    case 'help': {
      reply = isEn
        ? `ℹ️ *${session.restaurantName}* — How can I help?\n\n📋 "menu" — See our dishes\n🕐 "hours" — Opening hours\n🛒 Just type your order — I'll place it for you!\n📦 "order" — Order status\n\n👉 Order online: ${menuUrl}`
        : `ℹ️ *${session.restaurantName}* — ¿En qué puedo ayudarte?\n\n📋 "menú" — Ver nuestros platillos\n🕐 "horario" — Horario de atención\n🛒 ¡Escribe tu pedido directamente y lo proceso!\n📦 "pedido" — Estado de tu pedido\n\n👉 Pedir en línea: ${menuUrl}`;
      break;
    }

    case 'order': {
      const { products } = await getMenuForRestaurant(session.restaurantId);

      if (products.length === 0) {
        reply = isEn
          ? `We don't have products available right now. Check our menu: ${menuUrl}`
          : `No tenemos productos disponibles en este momento. Ve el menú: ${menuUrl}`;
        break;
      }

      const matched = await matchProductsWithAI(
        text,
        products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price) })),
      );

      if (matched.length === 0) {
        // Couldn't match anything — fall through to AI response
        const menuSummary = products
          .slice(0, 15)
          .map((p) => `${p.name}: ${formatPrice(Number(p.price), session.currency)}`)
          .join('\n');
        const aiReply = await generateAIResponse(text, session.restaurantName, menuSummary, session.locale);
        reply = `${aiReply}\n\n📋 ${menuUrl}`;
        break;
      }

      // Build product map for quick lookup
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Check for required modifiers — redirect those to web
      const matchedIds = matched.map((m) => m.productId);
      const withRequiredMods = await getProductsWithRequiredModifiers(session.restaurantId, matchedIds);

      const orderable = matched.filter((m) => !withRequiredMods.has(m.productId));
      const needsWeb = matched.filter((m) => withRequiredMods.has(m.productId));

      const cart: CartItem[] = orderable
        .map((m) => {
          const product = productMap.get(m.productId);
          if (!product) return null;
          return {
            productId: m.productId,
            name: product.name,
            qty: m.qty,
            unitPrice: Number(product.price),
          };
        })
        .filter((item): item is CartItem => item !== null);

      if (cart.length === 0) {
        // All products need web ordering (required modifiers)
        const names = needsWeb.map((m) => productMap.get(m.productId)?.name ?? '').filter(Boolean).join(', ');
        reply = isEn
          ? `*${names}* has required customizations (like size or extras). Please order from our menu to choose your options:\n👉 ${menuUrl}`
          : `*${names}* tiene opciones obligatorias (como tamaño o extras). Por favor pide desde el menú para elegir tus opciones:\n👉 ${menuUrl}`;
        break;
      }

      session.cart = cart;
      session.step = 'awaiting_name';
      await setSession(from, session);

      const cartSummary = formatCartSummary(cart, session.currency);

      let webOnlyNote = '';
      if (needsWeb.length > 0) {
        const names = needsWeb.map((m) => productMap.get(m.productId)?.name ?? '').filter(Boolean).join(', ');
        webOnlyNote = isEn
          ? `\n\n⚠️ *${names}* needs customizations — please add from the menu: ${menuUrl}`
          : `\n\n⚠️ *${names}* requiere personalización — agrégalo desde el menú: ${menuUrl}`;
      }

      reply = isEn
        ? `🛒 *Your order:*\n\n${cartSummary}${webOnlyNote}\n\n💵 Pickup / Cash\n\n*What's your name for the order?* (or type CANCEL to cancel)`
        : `🛒 *Tu pedido:*\n\n${cartSummary}${webOnlyNote}\n\n💵 Recoger / Efectivo\n\n*¿A qué nombre va el pedido?* (o escribe CANCELAR para cancelar)`;
      break;
    }

    default: {
      const { products } = await getMenuForRestaurant(session.restaurantId);
      const menuSummary = products
        .slice(0, 15)
        .map((p) => `${p.name}: ${formatPrice(Number(p.price), session.currency)}${p.description ? ` — ${p.description}` : ''}`)
        .join('\n');
      const aiReply = await generateAIResponse(text, session.restaurantName, menuSummary, session.locale);
      reply = `${aiReply}\n\n📋 ${menuUrl}`;
      break;
    }
  }

  await setSession(from, session);
  await sendWhatsApp({ to: from, text: reply });
}
