/**
 * Send WhatsApp messages via Twilio REST API.
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — your Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM — your Twilio WhatsApp sender, e.g. "whatsapp:+14155238886"
 */

interface WhatsAppMessage {
  to: string;
  text: string;
}

export async function sendWhatsApp({ to, text }: WhatsAppMessage): Promise<{ success: boolean }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.warn('[WhatsApp] Twilio env vars not set — skipping message');
    return { success: false };
  }

  // Normalize to E.164 with whatsapp: prefix
  const digits = to.replace(/[^0-9]/g, '');
  const e164 = to.trim().startsWith('+') ? `+${digits}` : `+${digits}`;
  const toWhatsApp = `whatsapp:${e164}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const body = new URLSearchParams({
    From: from,
    To: toWhatsApp,
    Body: text,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[WhatsApp] Twilio API error:', err);
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error('[WhatsApp] Twilio send error:', err);
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
): string {
  const en = locale === 'en';

  if (status === 'delivered') {
    const ctaUrl = reviewUrl ?? trackingUrl;
    if (ctaUrl) {
      return en
        ? `✨ *Order #${orderNumber} delivered!*\n\n🏪 ${restaurantName}\n\nEnjoy your meal! We'd love to hear what you think 🌟\n👉 Rate your experience: ${ctaUrl}`
        : `✨ *¡Pedido #${orderNumber} entregado!*\n\n🏪 ${restaurantName}\n\n¡Buen provecho! Nos encantaría saber qué te pareció 🌟\n👉 Deja tu reseña aquí: ${ctaUrl}`;
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

  const statusMessages: Record<string, string> = en
    ? {
        confirmed: '✅ Your order has been confirmed',
        preparing: '👨‍🍳 Your order is being prepared',
        ready: readyMsg ?? '🔔 Your order is ready!',
        delivered: '✨ Your order has been delivered. Enjoy!',
        cancelled: '❌ Your order has been cancelled',
      }
    : {
        confirmed: '✅ Tu pedido ha sido confirmado',
        preparing: '👨‍🍳 Tu pedido se está preparando',
        ready: readyMsg ?? '🔔 ¡Tu pedido está listo!',
        delivered: '✨ Tu pedido ha sido entregado. ¡Buen provecho!',
        cancelled: '❌ Tu pedido ha sido cancelado',
      };

  const fallback = en ? `Order update: ${status}` : `Estado actualizado: ${status}`;
  const base = `${statusMessages[status] ?? fallback}\n\n📋 ${en ? 'Order' : 'Pedido'} #${orderNumber}\n🏪 ${restaurantName}`;
  if (trackingUrl && ['confirmed', 'preparing', 'ready'].includes(status)) {
    return `${base}\n\n${en ? 'Track your order' : 'Sigue tu pedido'}: ${trackingUrl}`;
  }
  return base;
}
