/**
 * Email notification service using Resend.
 * Requires: RESEND_API_KEY env var.
 */

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Email] Resend not configured — skipping email to:', to);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MENIUS <noreply@menius.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error('[Email] Resend error:', await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Send error:', err);
    return false;
  }
}

export function buildOrderConfirmationEmail(params: {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  total: string;
  items: { name: string; qty: number; price: string }[];
  trackingUrl: string;
}): string {
  const { customerName, orderNumber, restaurantName, total, items, trackingUrl } = params;

  const itemsHtml = items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${i.qty}x ${i.name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;font-weight:600;">${i.price}</td>
        </tr>
      `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>

    <!-- Card -->
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Top -->
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">¡Pedido confirmado!</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Orden #${orderNumber}</p>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        <p style="font-size:15px;color:#374151;margin:0 0 16px;">
          Hola <strong>${customerName}</strong>, tu pedido en <strong>${restaurantName}</strong> fue recibido exitosamente.
        </p>

        <!-- Items -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          ${itemsHtml}
        </table>

        <!-- Total -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:2px solid #f3f4f6;">
          <span style="font-size:16px;font-weight:700;color:#111827;">Total</span>
          <span style="font-size:20px;font-weight:800;color:#7c3aed;">${total}</span>
        </div>

        <!-- CTA -->
        <a href="${trackingUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
          Seguir mi pedido
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      Enviado por <strong style="color:#7c3aed;">MENIUS</strong> en nombre de ${restaurantName}
    </p>
  </div>
</body>
</html>`;
}

export function buildWelcomeEmail(params: {
  ownerName: string;
  restaurantName: string;
  dashboardUrl: string;
  menuUrl: string;
}): string {
  const { ownerName, restaurantName, dashboardUrl, menuUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:40px 24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🎉</div>
        <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">¡Bienvenido a MENIUS!</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${restaurantName} ya tiene su menú digital</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          Hola <strong>${ownerName}</strong>, tu restaurante fue creado exitosamente.
          Tienes <strong>14 días de prueba gratis</strong> con todas las funciones desbloqueadas.
        </p>
        <div style="background:#f3f0ff;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="font-size:13px;font-weight:600;color:#7c3aed;margin:0 0 10px;">Próximos pasos:</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">1. Personaliza tu menú con tus productos</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">2. Genera los QR para tus mesas</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">3. Comparte tu menú y recibe pedidos</td></tr>
          </table>
        </div>
        <div style="text-align:center;">
          <a href="${dashboardUrl}" style="display:inline-block;padding:14px 40px;background:#7c3aed;color:#fff;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:12px;">
            Ir a mi dashboard
          </a>
          <p style="margin:12px 0 0;font-size:13px;">
            <a href="${menuUrl}" style="color:#7c3aed;text-decoration:none;font-weight:500;">Ver mi menú público →</a>
          </p>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      ¿Necesitas ayuda? Responde a este email y te asistimos.
    </p>
  </div>
</body>
</html>`;
}

export function buildStatusUpdateEmail(params: {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  status: string;
  trackingUrl: string;
}): string {
  const { customerName, orderNumber, restaurantName, status, trackingUrl } = params;

  const statusInfo: Record<string, { emoji: string; title: string; message: string; color: string }> = {
    confirmed: { emoji: '✅', title: 'Pedido confirmado', message: 'El restaurante ha confirmado tu pedido.', color: '#059669' },
    preparing: { emoji: '👨‍🍳', title: 'Preparando tu pedido', message: 'El chef ya está trabajando en tu pedido.', color: '#7c3aed' },
    ready: { emoji: '🔔', title: '¡Tu pedido está listo!', message: 'Tu pedido está listo para recoger.', color: '#d97706' },
    delivered: { emoji: '✨', title: 'Pedido entregado', message: '¡Buen provecho! Esperamos que disfrutes tu comida.', color: '#059669' },
    cancelled: { emoji: '❌', title: 'Pedido cancelado', message: 'Tu pedido fue cancelado. Si tienes dudas, contacta al restaurante.', color: '#dc2626' },
  };

  const info = statusInfo[status] ?? { emoji: '📋', title: `Estado: ${status}`, message: 'El estado de tu pedido ha sido actualizado.', color: '#6b7280' };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center;padding:40px 24px;">
      <div style="font-size:48px;margin-bottom:12px;">${info.emoji}</div>
      <h2 style="color:${info.color};font-size:20px;font-weight:700;margin:0 0 8px;">${info.title}</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">Orden #${orderNumber}</p>
      <p style="color:#374151;font-size:15px;margin:16px 0 24px;">${info.message}</p>
      <a href="${trackingUrl}" style="display:inline-block;padding:12px 32px;background:#7c3aed;color:#fff;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;">
        Ver mi pedido
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      Enviado por <strong style="color:#7c3aed;">MENIUS</strong> en nombre de ${restaurantName}
    </p>
  </div>
</body>
</html>`;
}
