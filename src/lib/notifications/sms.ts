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
    console.warn('[SMS] Twilio SMS env vars not set — skipping');
    return { success: false };
  }

  const digits = to.replace(/[^0-9]/g, '');
  const e164 = to.trim().startsWith('+') ? `+${digits}` : `+${digits}`;

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
      console.error('[SMS] Twilio error:', await res.text());
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error('[SMS] Send error:', err);
    return { success: false };
  }
}

/**
 * Determines whether a phone number belongs to a WhatsApp-first market
 * or an SMS-first market (US/Canada).
 */
export function resolveChannel(_phone: string): 'whatsapp' | 'sms' {
  // WhatsApp is the primary channel for all markets worldwide.
  // SMS (Twilio) is used as fallback if WhatsApp delivery fails.
  return 'whatsapp';
}

export function formatStatusUpdateSMS(
  orderNumber: string,
  status: string,
  restaurantName: string,
  trackingUrl?: string,
): string {
  if (status === 'delivered' && trackingUrl) {
    return `✨ Order #${orderNumber} delivered at ${restaurantName}. Enjoy! Rate your experience: ${trackingUrl}`;
  }
  const messages: Record<string, string> = {
    confirmed: `✅ Order #${orderNumber} confirmed at ${restaurantName}.`,
    preparing: `👨‍🍳 Order #${orderNumber} is being prepared at ${restaurantName}.`,
    ready: `🔔 Order #${orderNumber} is ready for pickup at ${restaurantName}!`,
    delivered: `✨ Order #${orderNumber} delivered. Enjoy your meal!`,
    cancelled: `❌ Order #${orderNumber} was cancelled by ${restaurantName}.`,
  };
  const base = messages[status] ?? `Order #${orderNumber} update from ${restaurantName}.`;
  if (trackingUrl && ['confirmed', 'ready'].includes(status)) {
    return `${base} Track: ${trackingUrl}`;
  }
  return base;
}

export function formatOrderConfirmationSMS(
  orderNumber: string,
  restaurantName: string,
  total: string,
  trackingUrl: string,
): string {
  return `✅ Order #${orderNumber} confirmed at ${restaurantName}. Total: ${total}. Track: ${trackingUrl}`;
}
