/**
 * Send WhatsApp messages via Meta WhatsApp Cloud API.
 * Required env vars:
 *   WHATSAPP_TOKEN    — Meta access token (same one used by the WhatsApp agent)
 *   WHATSAPP_PHONE_ID — Meta Phone Number ID
 *   WHATSAPP_API_URL  — optional, defaults to https://graph.facebook.com/v19.0
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('whatsapp');

interface WhatsAppMessage {
  to: string;
  text: string;
}

export async function sendWhatsApp({ to, text }: WhatsAppMessage): Promise<{ success: boolean }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const apiBase = (process.env.WHATSAPP_API_URL ?? 'https://graph.facebook.com/v19.0').replace(/\/$/, '');

  if (!token || !phoneId) {
    logger.error('Missing env vars — WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set. Messages will NOT be sent.');
    return { success: false };
  }

  // Normalize to digits only (Meta API expects no '+' prefix)
  const digits = to.replace(/[^0-9]/g, '');

  if (!digits || digits.length < 7) {
    logger.error('Invalid phone number', { to, digits });
    return { success: false };
  }

  const url = `${apiBase}/${phoneId}/messages`;

  logger.info('Sending message', { to: digits, phoneId });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      // Common errors:
      // 131047 = message failed to send because >24h since customer last message (need approved template)
      // 131026 = recipient not a valid WhatsApp number
      // 190    = token expired or invalid
      logger.error('Meta API error', { status: res.status, to: digits, body: errBody });
      return { success: false };
    }

    const responseBody = await res.json().catch(() => ({})) as { messages?: { id: string }[] };
    logger.info('Message sent', { to: digits, messageId: responseBody?.messages?.[0]?.id ?? 'unknown' });
    return { success: true };
  } catch (err) {
    logger.error('Network error sending message', { to: digits, error: err instanceof Error ? err.message : String(err) });
    return { success: false };
  }
}

export function formatNewOrderWhatsApp(
  orderNumber: string,
  customerName: string,
  total: string,
  itemsSummary: string,
  orderType?: string,
  tableNumber?: string,
  notes?: string,
  deliveryAddress?: string,
): string {
  // Build the order-type line, merging table number into the dine-in label to avoid repetition
  let typeLabel: string;
  if (orderType === 'delivery') {
    typeLabel = '🛵 Delivery';
  } else if (orderType === 'pickup') {
    typeLabel = '🥡 Para llevar';
  } else {
    typeLabel = tableNumber ? `🪑 Mesa: ${tableNumber}` : '🪑 En restaurante';
  }
  const addrStr = deliveryAddress ? `\n📍 Dirección: ${deliveryAddress}` : '';
  const notesStr = notes ? `\n📝 Notas: ${notes}` : '';
  return `🍽️ *Nueva orden #${orderNumber}*

👤 Cliente: ${customerName}
${typeLabel}${addrStr}${notesStr}
💰 Total: ${total}

📋 Productos:
${itemsSummary}

Gestiona esta orden en tu dashboard de MENIUS.`;
}

export function formatCustomerOrderConfirmationWhatsApp(
  orderNumber: string,
  restaurantName: string,
  total: string,
  trackingUrl: string,
  locale = 'es',
): string {
  const en = locale === 'en';
  if (en) {
    return `✅ *Order confirmed!*

Your order *#${orderNumber}* at *${restaurantName}* has been received.
💰 Total: ${total}

Track your order: ${trackingUrl}`;
  }
  return `✅ *¡Pedido confirmado!*

Tu pedido *#${orderNumber}* en *${restaurantName}* fue recibido.
💰 Total: ${total}

Sigue tu pedido aquí: ${trackingUrl}`;
}

export function formatCustomerPaymentConfirmedWhatsApp(
  orderNumber: string,
  restaurantName: string,
  total: string,
  trackingUrl: string,
  locale = 'es',
): string {
  const en = locale === 'en';
  if (en) {
    return `💳 *Payment confirmed!*

Order *#${orderNumber}* at *${restaurantName}* — payment received.
💰 Total: ${total}

Track your order: ${trackingUrl}`;
  }
  return `💳 *¡Pago confirmado!*

Pedido *#${orderNumber}* en *${restaurantName}* — pago recibido.
💰 Total: ${total}

Sigue tu pedido aquí: ${trackingUrl}`;
}

export function formatStatusUpdateWhatsApp(
  orderNumber: string,
  status: string,
  restaurantName: string,
  locale = 'es',
  trackingUrl?: string,
  reviewUrl?: string,
  orderType?: string,
  estimatedMinutes?: number,
): string {
  const en = locale === 'en';

  if (status === 'delivered') {
    const ctaUrl = reviewUrl ?? trackingUrl;
    const isPickup = orderType === 'pickup';
    const isDineIn = orderType === 'dine_in';
    const titleEn = isPickup ? `🥡 *Order #${orderNumber} picked up!*` : isDineIn ? `🍽️ *Order #${orderNumber} served!*` : `✨ *Order #${orderNumber} delivered!*`;
    const titleEs = isPickup ? `🥡 *¡Pedido #${orderNumber} recogido!*` : isDineIn ? `🍽️ *¡Pedido #${orderNumber} servido!*` : `✨ *¡Pedido #${orderNumber} entregado!*`;
    if (ctaUrl) {
      return en
        ? `${titleEn}\n\n🏪 ${restaurantName}\n\nEnjoy your meal! We'd love to hear what you think 🌟\n👉 Rate your experience: ${ctaUrl}`
        : `${titleEs}\n\n🏪 ${restaurantName}\n\n¡Buen provecho! Nos encantaría saber qué te pareció 🌟\n👉 Deja tu reseña aquí: ${ctaUrl}`;
    }
  }

  // 'ready' message varies by order type
  const readyMsg = (() => {
    if (status !== 'ready') return null;
    if (orderType === 'delivery') {
      return en ? '🛵 Your order is ready and will be picked up by the driver soon!' : '🛵 ¡Tu pedido está listo! El repartidor lo tomará pronto.';
    }
    if (orderType === 'pickup') {
      return en ? '🥡 Your order is ready! Come pick it up.' : '🥡 ¡Tu pedido está listo! Pasa a recogerlo.';
    }
    return en ? '🔔 Your order is ready! We\'ll bring it to your table.' : '🔔 ¡Tu pedido está listo! Ya te lo llevamos a la mesa.';
  })();

  const deliveredMsgEn = orderType === 'pickup'
    ? '🥡 Your order has been picked up. Enjoy!'
    : orderType === 'dine_in'
      ? '🍽️ Your order has been served. Enjoy your meal!'
      : '✨ Your order has been delivered. Enjoy!';
  const deliveredMsgEs = orderType === 'pickup'
    ? '🥡 Tu pedido fue recogido. ¡Buen provecho!'
    : orderType === 'dine_in'
      ? '🍽️ Tu pedido fue servido. ¡Buen provecho!'
      : '✨ Tu pedido ha sido entregado. ¡Buen provecho!';

  const preparingMsgEn = estimatedMinutes
    ? `👨‍🍳 Your order is being prepared — ready in ~${estimatedMinutes} min!`
    : '👨‍🍳 Your order is being prepared';
  const preparingMsgEs = estimatedMinutes
    ? `👨‍🍳 Tu pedido se está preparando — listo en ~${estimatedMinutes} min!`
    : '👨‍🍳 Tu pedido se está preparando';

  const statusMessages: Record<string, string> = en
    ? {
        confirmed: '✅ Your order has been confirmed',
        preparing: preparingMsgEn,
        ready: readyMsg ?? '🔔 Your order is ready!',
        delivered: deliveredMsgEn,
        cancelled: '❌ Your order has been cancelled',
      }
    : {
        confirmed: '✅ Tu pedido ha sido confirmado',
        preparing: preparingMsgEs,
        ready: readyMsg ?? '🔔 ¡Tu pedido está listo!',
        delivered: deliveredMsgEs,
        cancelled: '❌ Tu pedido ha sido cancelado',
      };

  const fallback = en ? `Order update: ${status}` : `Estado actualizado: ${status}`;
  const base = `${statusMessages[status] ?? fallback}\n\n📋 ${en ? 'Order' : 'Pedido'} #${orderNumber}\n🏪 ${restaurantName}`;
  if (trackingUrl && ['confirmed', 'preparing', 'ready'].includes(status)) {
    return `${base}\n\n${en ? 'Track your order' : 'Sigue tu pedido'}: ${trackingUrl}`;
  }
  return base;
}
