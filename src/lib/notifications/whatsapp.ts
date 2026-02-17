/**
 * Send a WhatsApp message via the WhatsApp Business API (Cloud API).
 * Requires: WHATSAPP_TOKEN and WHATSAPP_PHONE_ID env vars.
 * 
 * Falls back to a WhatsApp deep-link if the Business API is not configured,
 * which can be used as a click-to-chat URL.
 */

interface WhatsAppMessage {
  to: string;
  text: string;
}

export async function sendWhatsApp({ to, text }: WhatsAppMessage): Promise<{ success: boolean; fallbackUrl?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  const cleanPhone = to.replace(/[^0-9]/g, '');

  if (!token || !phoneId) {
    const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    return { success: false, fallbackUrl };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      console.error('WhatsApp API error:', await res.text());
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return { success: false };
  }
}

export function formatNewOrderWhatsApp(orderNumber: string, customerName: string, total: string, itemsSummary: string): string {
  return `🍽️ *Nueva orden #${orderNumber}*

👤 Cliente: ${customerName}
💰 Total: ${total}

📋 Productos:
${itemsSummary}

Gestiona esta orden en tu dashboard de MENIUS.`;
}

export function formatStatusUpdateWhatsApp(orderNumber: string, status: string, restaurantName: string): string {
  const statusMessages: Record<string, string> = {
    confirmed: '✅ Tu pedido ha sido confirmado',
    preparing: '👨‍🍳 Tu pedido se está preparando',
    ready: '🔔 ¡Tu pedido está listo!',
    delivered: '✨ Tu pedido ha sido entregado. ¡Buen provecho!',
    cancelled: '❌ Tu pedido ha sido cancelado',
  };

  return `${statusMessages[status] ?? `Estado actualizado: ${status}`}

📋 Pedido #${orderNumber}
🏪 ${restaurantName}`;
}
