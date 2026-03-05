const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function buildStatusMessage(status: string, orderNumber: string, etaMinutes?: number): string {
  const eta = etaMinutes ?? 15;
  const map: Record<string, string> = {
    confirmed: `Tu orden #${orderNumber} ha sido confirmada. Tiempo estimado: ~${eta} min.`,
    preparing: `Tu orden #${orderNumber} se esta preparando. Lista en aprox. ${eta} min.`,
    ready: `Tu orden #${orderNumber} esta lista! Puedes pasar a recogerla.`,
    delivered: `Gracias por tu compra! Orden #${orderNumber} entregada. Buen provecho!`,
    cancelled: `Tu orden #${orderNumber} ha sido cancelada. Contactanos si tienes dudas.`,
  };
  return map[status] ?? '';
}

export async function sendOrderSMS({
  to,
  orderNumber,
  status,
  restaurantName,
  etaMinutes,
}: {
  to: string;
  orderNumber: string;
  status: string;
  restaurantName: string;
  etaMinutes?: number;
}) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) return;

  const message = buildStatusMessage(status, orderNumber, etaMinutes);
  if (!message) return;

  const body = `[${restaurantName}] ${message}`;

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
