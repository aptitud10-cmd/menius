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
): string {
  const typeLabel = orderType === 'delivery' ? '🛵 Delivery' : orderType === 'takeaway' ? '🥡 Para llevar' : '🪑 Mesa';
  const tableStr = tableNumber ? `\n🪑 Mesa: ${tableNumber}` : '';
  const notesStr = notes ? `\n📝 Notas: ${notes}` : '';
  return `🍽️ *Nueva orden #${orderNumber}*

👤 Cliente: ${customerName}
${typeLabel}${tableStr}${notesStr}
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

export function formatStatusUpdateWhatsApp(orderNumber: string, status: string, restaurantName: string, locale = 'es', trackingUrl?: string, reviewUrl?: string): string {
  const en = locale === 'en';

  if (status === 'delivered') {
    const ctaUrl = reviewUrl ?? trackingUrl;
    if (ctaUrl) {
      return en
        ? `✨ *Order #${orderNumber} delivered!*\n\n🏪 ${restaurantName}\n\nEnjoy your meal! We'd love to hear what you think 🌟\n👉 Rate your experience: ${ctaUrl}`
        : `✨ *¡Pedido #${orderNumber} entregado!*\n\n🏪 ${restaurantName}\n\n¡Buen provecho! Nos encantaría saber qué te pareció 🌟\n👉 Deja tu reseña aquí: ${ctaUrl}`;
    }
  }

  const statusMessages: Record<string, string> = en
    ? {
        confirmed: '✅ Your order has been confirmed',
        preparing: '👨‍🍳 Your order is being prepared',
        ready: '🔔 Your order is ready!',
        delivered: '✨ Your order has been delivered. Enjoy!',
        cancelled: '❌ Your order has been cancelled',
      }
    : {
        confirmed: '✅ Tu pedido ha sido confirmado',
        preparing: '👨‍🍳 Tu pedido se está preparando',
        ready: '🔔 ¡Tu pedido está listo!',
        delivered: '✨ Tu pedido ha sido entregado. ¡Buen provecho!',
        cancelled: '❌ Tu pedido ha sido cancelado',
      };

  const base = `${statusMessages[status] ?? `Estado actualizado: ${status}`}\n\n📋 ${en ? 'Order' : 'Pedido'} #${orderNumber}\n🏪 ${restaurantName}`;
  if (trackingUrl && ['confirmed', 'preparing', 'ready'].includes(status)) {
    return `${base}\n\n${en ? 'Track your order' : 'Sigue tu pedido'}: ${trackingUrl}`;
  }
  return base;
}
