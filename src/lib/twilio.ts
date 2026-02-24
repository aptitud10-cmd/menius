const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

const STATUS_MESSAGES_ES: Record<string, string> = {
  confirmed: 'Tu orden #{order} ha sido confirmada. Tiempo estimado: ~15 min.',
  preparing: 'Tu orden #{order} se esta preparando.',
  ready: 'Tu orden #{order} esta lista! Puedes pasar a recogerla.',
  delivered: 'Gracias por tu compra! Orden #{order} entregada. Buen provecho!',
  cancelled: 'Tu orden #{order} ha sido cancelada. Contactanos si tienes dudas.',
};

export async function sendOrderSMS({
  to,
  orderNumber,
  status,
  restaurantName,
}: {
  to: string;
  orderNumber: string;
  status: string;
  restaurantName: string;
}) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return;

  const template = STATUS_MESSAGES_ES[status];
  if (!template) return;

  const body = `[${restaurantName}] ${template.replace('#{order}', orderNumber)}`;

  const cleanPhone = to.replace(/[^0-9+]/g, '');
  if (cleanPhone.length < 10) return;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
        From: TWILIO_FROM,
        Body: body,
      }),
    });
  } catch (err) {
    console.error('[Twilio] SMS send failed:', err);
  }
}
