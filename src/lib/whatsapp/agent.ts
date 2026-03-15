import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { sendWhatsApp } from '@/lib/notifications/whatsapp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createAdminClient(supabaseUrl, supabaseServiceKey);
}

interface IncomingMessage {
  from: string;
  text: string;
  name: string;
}

interface ConversationSession {
  restaurantId: string;
  restaurantName: string;
  slug: string;
  locale: string;
  currency: string;
  lastActivity: number;
}

// Sessions are stored in Redis when available, falling back to in-process Map
// for local dev. Redis is required in multi-instance Vercel deployments.
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

function detectIntent(text: string): 'menu' | 'hours' | 'order_status' | 'help' | 'greeting' | 'unknown' {
  const lower = text.toLowerCase().trim();

  if (/^(hola|hi|hello|hey|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|qu[eé]\s*tal)/i.test(lower)) {
    return 'greeting';
  }
  if (/men[uú]|carta|platillos?|productos?|que\s*tienen|what.*have|what.*serve/i.test(lower)) {
    return 'menu';
  }
  if (/horario|hora|abierto|cerrado|hours?|open|close/i.test(lower)) {
    return 'hours';
  }
  if (/pedido|orden|order|estado|status|tracking|seguimiento/i.test(lower)) {
    return 'order_status';
  }
  if (/ayuda|help|info|informaci[oó]n/i.test(lower)) {
    return 'help';
  }

  return 'unknown';
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
    const systemPrompt = locale === 'en'
      ? `You are a friendly WhatsApp assistant for "${restaurantName}". Answer customer questions about the menu, hours, and ordering. Keep responses short (max 300 chars). Use emojis sparingly. Always be helpful and polite. Here's the menu:\n${menuSummary}`
      : `Eres un asistente amigable de WhatsApp para "${restaurantName}". Responde preguntas sobre el menú, horarios y pedidos. Mantén respuestas cortas (máx 300 caracteres). Usa emojis con moderación. Siempre sé útil y amable. Aquí está el menú:\n${menuSummary}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nCustomer message: "${userMessage}"` }] },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
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

export async function handleIncomingMessage({ from, text, name }: IncomingMessage) {
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
      currency: restaurant.currency ?? 'USD',
      lastActivity: Date.now(),
    };
  }

  session.lastActivity = Date.now();
  await setSession(from, session);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const menuUrl = `${appUrl}/${session.slug}`;
  const isEn = session.locale === 'en';
  const intent = detectIntent(text);

  let reply = '';

  switch (intent) {
    case 'greeting': {
      reply = isEn
        ? `Hi${name ? ` ${name}` : ''}! 👋 Welcome to *${session.restaurantName}*.\n\nHow can I help you?\n📋 See our menu: ${menuUrl}\n\nType "menu", "hours", or ask me anything!`
        : `¡Hola${name ? ` ${name}` : ''}! 👋 Bienvenido/a a *${session.restaurantName}*.\n\n¿En qué te puedo ayudar?\n📋 Ver menú: ${menuUrl}\n\nEscribe "menú", "horario", o pregúntame lo que necesites.`;
      break;
    }

    case 'menu': {
      const { categories, products } = await getMenuForRestaurant(session.restaurantId);

      if (products.length === 0) {
        reply = isEn
          ? `Our menu is being updated. Check back soon!\n📋 ${menuUrl}`
          : `Nuestro menú se está actualizando. ¡Vuelve pronto!\n📋 ${menuUrl}`;
        break;
      }

      const topProducts = products.slice(0, 8);
      const productList = topProducts
        .map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)}`)
        .join('\n');

      reply = isEn
        ? `📋 *Menu — ${session.restaurantName}*\n\n${productList}\n\n${products.length > 8 ? `...and ${products.length - 8} more items\n\n` : ''}👉 Full menu & order: ${menuUrl}`
        : `📋 *Menú — ${session.restaurantName}*\n\n${productList}\n\n${products.length > 8 ? `...y ${products.length - 8} productos más\n\n` : ''}👉 Menú completo y pedidos: ${menuUrl}`;
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

      const hours = Object.entries(restaurant.operating_hours as Record<string, { open: string; close: string; closed?: boolean }>)
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
      reply = isEn
        ? `To check your order status, use the tracking link you received when placing your order.\n\nWant to place a new order? 👉 ${menuUrl}`
        : `Para ver el estado de tu pedido, usa el enlace de seguimiento que recibiste al hacer tu pedido.\n\n¿Quieres hacer un nuevo pedido? 👉 ${menuUrl}`;
      break;
    }

    case 'help': {
      reply = isEn
        ? `ℹ️ *${session.restaurantName}* — How can I help?\n\n📋 "menu" — See our dishes\n🕐 "hours" — Opening hours\n📦 "order" — Order status\n\n👉 Order online: ${menuUrl}`
        : `ℹ️ *${session.restaurantName}* — ¿En qué puedo ayudarte?\n\n📋 "menú" — Ver nuestros platillos\n🕐 "horario" — Horario de atención\n📦 "pedido" — Estado de tu pedido\n\n👉 Pedir en línea: ${menuUrl}`;
      break;
    }

    default: {
      const { products } = await getMenuForRestaurant(session.restaurantId);
      const menuSummary = products.slice(0, 15)
        .map((p) => `${p.name}: $${Number(p.price).toFixed(2)}${p.description ? ` — ${p.description}` : ''}`)
        .join('\n');

      reply = await generateAIResponse(text, session.restaurantName, menuSummary, session.locale);
      reply += `\n\n📋 ${menuUrl}`;
      break;
    }
  }

  await sendWhatsApp({ to: from, text: reply });
}
