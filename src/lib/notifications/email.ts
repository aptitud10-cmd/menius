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
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
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
  locale?: string;
}): string {
  const { customerName, orderNumber, restaurantName, total, items, trackingUrl, locale } = params;
  const en = locale === 'en';

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
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">${en ? 'Order confirmed!' : '¡Pedido confirmado!'}</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${en ? 'Order' : 'Orden'} #${orderNumber}</p>
      </div>
      <div style="padding:24px;">
        <p style="font-size:15px;color:#374151;margin:0 0 16px;">
          ${en ? `Hi <strong>${customerName}</strong>, your order at <strong>${restaurantName}</strong> was received successfully.` : `Hola <strong>${customerName}</strong>, tu pedido en <strong>${restaurantName}</strong> fue recibido exitosamente.`}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          ${itemsHtml}
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:2px solid #f3f4f6;">
          <span style="font-size:16px;font-weight:700;color:#111827;">Total</span>
          <span style="font-size:20px;font-weight:800;color:#7c3aed;">${total}</span>
        </div>
        <a href="${trackingUrl}" style="display:block;margin-top:24px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
          ${en ? 'Track my order' : 'Seguir mi pedido'}
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      ${en ? `Sent by <strong style="color:#7c3aed;">MENIUS</strong> on behalf of ${restaurantName}` : `Enviado por <strong style="color:#7c3aed;">MENIUS</strong> en nombre de ${restaurantName}`}
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
  locale?: string;
}): string {
  const { ownerName, restaurantName, dashboardUrl, menuUrl, locale } = params;
  const en = locale === 'en';

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
        <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">${en ? 'Welcome to MENIUS!' : '¡Bienvenido a MENIUS!'}</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${en ? `${restaurantName} now has a digital menu` : `${restaurantName} ya tiene su menú digital`}</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          ${en ? `Hi <strong>${ownerName}</strong>, your restaurant was created successfully. You have a <strong>14-day free trial</strong> with all features unlocked.` : `Hola <strong>${ownerName}</strong>, tu restaurante fue creado exitosamente. Tienes <strong>14 días de prueba gratis</strong> con todas las funciones desbloqueadas.`}
        </p>
        <div style="background:#f3f0ff;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="font-size:13px;font-weight:600;color:#7c3aed;margin:0 0 10px;">${en ? 'Next steps:' : 'Próximos pasos:'}</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">${en ? '1. Customize your menu with your products' : '1. Personaliza tu menú con tus productos'}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">${en ? '2. Generate QR codes for your tables' : '2. Genera los QR para tus mesas'}</td></tr>
            <tr><td style="padding:4px 0;font-size:13px;color:#4b5563;">${en ? '3. Share your menu and start receiving orders' : '3. Comparte tu menú y recibe pedidos'}</td></tr>
          </table>
        </div>
        <div style="text-align:center;">
          <a href="${dashboardUrl}" style="display:inline-block;padding:14px 40px;background:#7c3aed;color:#fff;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:12px;">
            ${en ? 'Go to my dashboard' : 'Ir a mi dashboard'}
          </a>
          <p style="margin:12px 0 0;font-size:13px;">
            <a href="${menuUrl}" style="color:#7c3aed;text-decoration:none;font-weight:500;">${en ? 'View my public menu' : 'Ver mi menú público'} →</a>
          </p>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      ${en ? 'Need help? Reply to this email and we\'ll assist you.' : '¿Necesitas ayuda? Responde a este email y te asistimos.'}
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
  locale?: string;
}): string {
  const { customerName, orderNumber, restaurantName, status, trackingUrl, locale } = params;
  const en = locale === 'en';

  const statusInfoEs: Record<string, { emoji: string; title: string; message: string; color: string }> = {
    confirmed: { emoji: '✅', title: 'Pedido confirmado', message: 'El restaurante ha confirmado tu pedido.', color: '#059669' },
    preparing: { emoji: '👨‍🍳', title: 'Preparando tu pedido', message: 'El chef ya está trabajando en tu pedido.', color: '#7c3aed' },
    ready: { emoji: '🔔', title: '¡Tu pedido está listo!', message: 'Tu pedido está listo para recoger.', color: '#d97706' },
    delivered: { emoji: '✨', title: 'Pedido entregado', message: '¡Buen provecho! Esperamos que disfrutes tu comida.', color: '#059669' },
    cancelled: { emoji: '❌', title: 'Pedido cancelado', message: 'Tu pedido fue cancelado. Si tienes dudas, contacta al restaurante.', color: '#dc2626' },
  };

  const statusInfoEn: Record<string, { emoji: string; title: string; message: string; color: string }> = {
    confirmed: { emoji: '✅', title: 'Order confirmed', message: 'The restaurant has confirmed your order.', color: '#059669' },
    preparing: { emoji: '👨‍🍳', title: 'Preparing your order', message: 'The chef is now working on your order.', color: '#7c3aed' },
    ready: { emoji: '🔔', title: 'Your order is ready!', message: 'Your order is ready for pickup.', color: '#d97706' },
    delivered: { emoji: '✨', title: 'Order delivered', message: 'Enjoy your meal! We hope you love it.', color: '#059669' },
    cancelled: { emoji: '❌', title: 'Order cancelled', message: 'Your order was cancelled. If you have questions, please contact the restaurant.', color: '#dc2626' },
  };

  const statusMap = en ? statusInfoEn : statusInfoEs;
  const fallback = en
    ? { emoji: '📋', title: `Status: ${status}`, message: 'Your order status has been updated.', color: '#6b7280' }
    : { emoji: '📋', title: `Estado: ${status}`, message: 'El estado de tu pedido ha sido actualizado.', color: '#6b7280' };
  const info = statusMap[status] ?? fallback;

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
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">${en ? 'Order' : 'Orden'} #${orderNumber}</p>
      <p style="color:#374151;font-size:15px;margin:16px 0 24px;">${info.message}</p>
      <a href="${trackingUrl}" style="display:inline-block;padding:12px 32px;background:#7c3aed;color:#fff;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;">
        ${en ? 'View my order' : 'Ver mi pedido'}
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      ${en ? `Sent by <strong style="color:#7c3aed;">MENIUS</strong> on behalf of ${restaurantName}` : `Enviado por <strong style="color:#7c3aed;">MENIUS</strong> en nombre de ${restaurantName}`}
    </p>
  </div>
</body>
</html>`;
}

export function buildTrialEndingEmail(params: {
  ownerName: string;
  restaurantName: string;
  daysLeft: number;
  billingUrl: string;
  locale?: string;
}): string {
  const { ownerName, restaurantName, daysLeft, billingUrl, locale } = params;
  const en = locale === 'en';
  const urgency = daysLeft <= 1
    ? { emoji: '🚨', color: '#dc2626', msg: en ? 'Your free trial ends tomorrow.' : 'Tu prueba gratuita termina mañana.' }
    : { emoji: '⏰', color: '#d97706', msg: en ? `Your free trial ends in ${daysLeft} days.` : `Tu prueba gratuita termina en ${daysLeft} días.` };

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
      <div style="background:linear-gradient(135deg,${urgency.color},#b91c1c);padding:36px 24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">${urgency.emoji}</div>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">${urgency.msg}</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${restaurantName}</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          ${en ? `Hi <strong>${ownerName}</strong>, don't lose access to your digital menu, real-time orders, and everything you've set up.` : `Hola <strong>${ownerName}</strong>, no pierdas el acceso a tu menú digital, pedidos en tiempo real y todo lo que has configurado.`}
        </p>
        <div style="background:#fef3c7;border-radius:12px;padding:16px;margin-bottom:24px;border-left:4px solid #d97706;">
          <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
            ${en ? 'If you don\'t activate a plan, your dashboard will be locked but <strong>your data will not be deleted</strong>. You can reactivate at any time.' : 'Si no activas un plan, tu panel quedará bloqueado pero <strong>tus datos no se eliminarán</strong>. Puedes reactivar en cualquier momento.'}
          </p>
        </div>
        <div style="text-align:center;">
          <a href="${billingUrl}" style="display:inline-block;padding:14px 40px;background:#7c3aed;color:#fff;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
            ${en ? 'Choose my plan — from $39/mo' : 'Elegir mi plan — desde $39/mes'}
          </a>
        </div>
        <div style="margin-top:24px;padding:16px;background:#f3f0ff;border-radius:12px;text-align:center;">
          <p style="font-size:12px;color:#7c3aed;margin:0;font-weight:600;">${en ? 'Recommended Pro plan · $79/mo' : 'Plan Pro recomendado · $79/mes'}</p>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">${en ? 'Delivery · WhatsApp · Analytics · 3 users' : 'Delivery · WhatsApp · Analytics · 3 usuarios'}</p>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;">
      MENIUS · <a href="${billingUrl}" style="color:#7c3aed;text-decoration:none;">${en ? 'Manage subscription' : 'Gestionar suscripción'}</a>
    </p>
  </div>
</body>
</html>`;
}

export function buildOwnerNewOrderEmail(params: {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  orderType: string;
  total: string;
  items: { name: string; qty: number; price: string }[];
  dashboardUrl: string;
  locale?: string;
}): string {
  const { orderNumber, customerName, customerPhone, orderType, total, items, dashboardUrl, locale } = params;
  const en = locale === 'en';

  const typeLabelsEs: Record<string, string> = { dine_in: 'En el restaurante', pickup: 'Para recoger', delivery: 'Delivery' };
  const typeLabelsEn: Record<string, string> = { dine_in: 'Dine-in', pickup: 'Pickup', delivery: 'Delivery' };
  const typeLabels = en ? typeLabelsEn : typeLabelsEs;

  const itemsHtml = items
    .map(i => `<tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${i.qty}x ${i.name}</td><td style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;font-weight:600;">${i.price}</td></tr>`)
    .join('');

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
      <div style="background:linear-gradient(135deg,#059669,#047857);padding:28px 24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🔔</div>
        <h2 style="color:#fff;font-size:18px;font-weight:700;margin:0;">${en ? 'New order!' : '¡Nuevo pedido!'}</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:4px 0 0;">${en ? 'Order' : 'Orden'} #${orderNumber}</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280;">${en ? 'Customer' : 'Cliente'}</td>
            <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${customerName}</td>
          </tr>
          ${customerPhone ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">${en ? 'Phone' : 'Teléfono'}</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">${customerPhone}</td></tr>` : ''}
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#6b7280;">${en ? 'Type' : 'Tipo'}</td>
            <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">${typeLabels[orderType] ?? orderType}</td>
          </tr>
        </table>
        <div style="border-top:1px solid #f3f4f6;padding-top:12px;margin-bottom:12px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin:0 0 8px;font-weight:600;">${en ? 'Items' : 'Productos'}</p>
          <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:2px solid #f3f4f6;">
          <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
          <span style="font-size:20px;font-weight:800;color:#059669;">${total}</span>
        </div>
        <a href="${dashboardUrl}" style="display:block;margin-top:20px;padding:14px;background:#7c3aed;color:#fff;text-align:center;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;">
          ${en ? 'View in dashboard' : 'Ver en el dashboard'}
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">
      ${en ? 'Automatic notification from MENIUS' : 'Notificación automática de MENIUS'}
    </p>
  </div>
</body>
</html>`;
}

export interface SocialPostDigestItem {
  platform: string;
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
  image_url?: string | null;
  image_idea?: string;
  best_time?: string;
  tip?: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👥', linkedin: '💼', twitter: '🐦', tiktok: '🎵',
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', linkedin: '#0A66C2', twitter: '#1DA1F2', tiktok: '#000000',
};

export function buildSocialPostDigestEmail(posts: SocialPostDigestItem[], date: string): string {
  const postsHtml = posts.map((p) => {
    const emoji = PLATFORM_EMOJI[p.platform] || '📱';
    const color = PLATFORM_COLOR[p.platform] || '#6b7280';
    const platformName = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
    const captionPreview = p.caption.length > 300 ? p.caption.slice(0, 300) + '...' : p.caption;

    return `
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:24px;">
        <div style="background:${color};padding:16px 20px;display:flex;align-items:center;">
          <span style="font-size:20px;margin-right:8px;">${emoji}</span>
          <span style="color:#fff;font-size:16px;font-weight:700;">${platformName}</span>
        </div>
        ${p.image_url ? `<div style="text-align:center;background:#f9fafb;padding:12px;"><img src="${p.image_url}" alt="Post image" style="max-width:100%;max-height:400px;border-radius:8px;" /></div>` : ''}
        <div style="padding:20px;">
          <div style="background:#f0fdf4;border-left:4px solid #059669;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#059669;margin:0 0 4px;font-weight:700;">HOOK</p>
            <p style="font-size:15px;color:#111827;margin:0;font-weight:600;">${p.hook}</p>
          </div>
          <div style="margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin:0 0 6px;font-weight:700;">CAPTION</p>
            <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;white-space:pre-line;">${captionPreview}</p>
          </div>
          <div style="margin-bottom:16px;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;margin:0 0 6px;font-weight:700;">CTA</p>
            <p style="font-size:14px;color:#7c3aed;margin:0;font-weight:600;">${p.cta}</p>
          </div>
          <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:12px;">
            <p style="font-size:12px;color:#6366f1;margin:0;word-break:break-all;">${p.hashtags}</p>
          </div>
          ${p.best_time ? `<p style="font-size:12px;color:#6b7280;margin:0 0 6px;">⏰ Best time: <strong>${p.best_time}</strong></p>` : ''}
          ${p.tip ? `<p style="font-size:12px;color:#059669;margin:0;">💡 ${p.tip}</p>` : ''}
          ${p.image_idea && !p.image_url ? `<p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">🖼️ Image idea: ${p.image_idea}</p>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;font-weight:800;color:#059669;margin:0;">MENIUS</h1>
      <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Social Media Post Generator</p>
    </div>
    <div style="background:linear-gradient(135deg,#059669,#047857);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:28px;">
      <div style="font-size:36px;margin-bottom:12px;">📱</div>
      <h2 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 4px;">Your posts are ready!</h2>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">${date} · ${posts.length} posts generated</p>
    </div>
    ${postsHtml}
    <div style="text-align:center;margin-top:24px;">
      <a href="https://menius.app/admin/social-generator" style="display:inline-block;padding:14px 40px;background:#059669;color:#fff;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">
        View all posts
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;">
      Automated by MENIUS AI · <a href="https://menius.app/admin" style="color:#059669;text-decoration:none;">Admin Panel</a>
    </p>
  </div>
</body>
</html>`;
}
