/**
 * Send SMS messages via Twilio REST API.
 * Used as primary channel for US/Canada (+1) numbers.
 * Required env vars:
 *   TWILIO_ACCOUNT_SID  — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN   — your Twilio Auth Token
 *   TWILIO_PHONE_NUMBER — your Twilio SMS number, e.g. "+12015551234"
 */

interface SmsMessage {
  to: string;
  text: string;
}

export async function sendSMS({ to, text }: SmsMessage): Promise<{ success: boolean }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.error('[SMS] ❌ MISSING ENV VARS — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER not configured in Vercel. SMS will NOT be sent until these are set.');
    return { success: false };
  }

  const digits = to.replace(/[^0-9]/g, '');
  if (!digits || digits.length < 7) {
    console.error(`[SMS] ❌ Invalid phone number: "${to}"`);
    return { success: false };
  }
  const e164 = `+${digits}`;

  console.info(`[SMS] → Sending to ${e164} from ${from}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: e164, Body: text }).toString(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[SMS] ❌ Twilio error (HTTP ${res.status}) to ${e164}:`, errBody);
      return { success: false };
    }
    console.info(`[SMS] ✅ Sent to ${e164}`);
    return { success: true };
  } catch (err) {
    console.error('[SMS] ❌ Network error sending to', e164, ':', err);
    return { success: false };
  }
}

/**
 * Primary notification channel.
 * SMS (Twilio) is used as primary while WhatsApp Business API approval is pending.
 * Switch back to 'whatsapp' once Meta approves the number.
 */
export function resolveChannel(_phone: string): 'whatsapp' | 'sms' {
  return 'sms';
}

export function formatStatusUpdateSMS(
  orderNumber: string,
  status: string,
  restaurantName: string,
  trackingUrl?: string,
  reviewUrl?: string,
  orderType?: string,
  locale = 'es',
): string {
  const en = locale === 'en';

  if (status === 'delivered') {
    const ctaUrl = reviewUrl ?? trackingUrl;
    const isPickup = orderType === 'pickup';
    const isDineIn = orderType === 'dine_in';
    if (ctaUrl) {
      return en
        ? `${isPickup ? '🥡' : isDineIn ? '🍽️' : '✨'} Order #${orderNumber} ${isPickup ? 'picked up' : isDineIn ? 'served' : 'delivered'} at ${restaurantName}. Rate your experience: ${ctaUrl}`
        : `${isPickup ? '🥡' : isDineIn ? '🍽️' : '✨'} Pedido #${orderNumber} ${isPickup ? 'recogido' : isDineIn ? 'servido' : 'entregado'} en ${restaurantName}. Deja tu reseña: ${ctaUrl}`;
    }
  }

  const readyMsg = (() => {
    if (status !== 'ready') return null;
    if (orderType === 'delivery') return en ? `🛵 Order #${orderNumber} is ready — driver picking up soon at ${restaurantName}!` : `🛵 Pedido #${orderNumber} listo — el repartidor lo tomará pronto en ${restaurantName}!`;
    if (orderType === 'pickup') return en ? `🥡 Order #${orderNumber} is ready for pickup at ${restaurantName}!` : `🥡 Pedido #${orderNumber} listo para recoger en ${restaurantName}!`;
    return en ? `🔔 Order #${orderNumber} is ready at ${restaurantName}!` : `🔔 Pedido #${orderNumber} listo en ${restaurantName}!`;
  })();

  const messages: Record<string, string> = en
    ? {
        confirmed: `✅ Order #${orderNumber} confirmed at ${restaurantName}.`,
        preparing: `👨‍🍳 Order #${orderNumber} is being prepared at ${restaurantName}.`,
        ready: readyMsg ?? `🔔 Order #${orderNumber} is ready!`,
        delivered: `✨ Order #${orderNumber} delivered. Enjoy!`,
        cancelled: `❌ Order #${orderNumber} cancelled by ${restaurantName}.`,
      }
    : {
        confirmed: `✅ Pedido #${orderNumber} confirmado en ${restaurantName}.`,
        preparing: `👨‍🍳 Pedido #${orderNumber} se está preparando en ${restaurantName}.`,
        ready: readyMsg ?? `🔔 Pedido #${orderNumber} listo!`,
        delivered: `✨ Pedido #${orderNumber} entregado. ¡Buen provecho!`,
        cancelled: `❌ Pedido #${orderNumber} cancelado por ${restaurantName}.`,
      };

  const base = messages[status] ?? (en ? `Order #${orderNumber} update from ${restaurantName}.` : `Actualización pedido #${orderNumber} en ${restaurantName}.`);
  if (trackingUrl && ['confirmed', 'ready'].includes(status)) {
    return `${base} ${en ? 'Track' : 'Sigue tu pedido'}: ${trackingUrl}`;
  }
  return base;
}

export function formatOrderConfirmationSMS(
  orderNumber: string,
  restaurantName: string,
  total: string,
  trackingUrl: string,
  locale = 'es',
): string {
  const en = locale === 'en';
  return en
    ? `✅ Order #${orderNumber} confirmed at ${restaurantName}. Total: ${total}. Track: ${trackingUrl}`
    : `✅ Pedido #${orderNumber} confirmado en ${restaurantName}. Total: ${total}. Sigue tu pedido: ${trackingUrl}`;
}
