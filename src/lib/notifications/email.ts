/**
 * Email notification service — Resend.
 * Requires: RESEND_API_KEY env var.
 *
 * Design system (2026):
 *  - Max 600px, table-based layout for Outlook compatibility
 *  - Restaurant name as primary brand; MENIUS as "Powered by" in footer
 *  - Neutral white card on #f4f4f5 background
 *  - Status-color accent strips (no flat emoji-only headers)
 *  - Full item details: variant, modifiers, extras, notes
 */

// ---------- Types ----------

export interface OrderEmailItem {
  name: string;
  qty: number;
  price: string;           // formatted string
  variant?: string;
  modifiers?: string[];    // e.g. ["Sin cebolla", "Extra queso"]
  extras?: string[];       // e.g. ["Papa extra (+$20)"]
  notes?: string;
}

interface EmailMessage {
  to: string;
  from?: string;           // overrides default sender
  replyTo?: string;        // reply-to address
  subject: string;
  html: string;
}

// ---------- Transport ----------

export async function sendEmail({ to, from, replyTo, subject, html }: EmailMessage): Promise<boolean> {
  const apiKey = (process.env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) {
    console.log('[Email] Resend not configured — skipping email to:', to);
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      from: from ?? 'MENIUS <noreply@menius.app>',
      to: [to],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = [replyTo];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

// ---------- Shared shell ----------

function shell(accentColor: string, headerContent: string, bodyContent: string, footerContent: string) {
  return `<!DOCTYPE html>
<html lang="und" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title></title>
  <!--[if mso]><style>body,table,td,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;">
  <tr>
    <td align="center" style="padding:32px 16px 40px;">

      <!-- Wrapper -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

        <!-- Colour accent bar -->
        <tr>
          <td height="5" style="background-color:${accentColor};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#ffffff;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

            <!-- Header -->
            ${headerContent}

            <!-- Body -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:28px 32px 0;">
                ${bodyContent}
              </td></tr>
            </table>

            <!-- Footer inside card -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:24px 32px 28px;border-top:1px solid #f0f0f0;margin-top:24px;">
                <p style="margin:0;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
                  ${footerContent}
                </p>
              </td></tr>
            </table>

          </td>
        </tr>

        <!-- Bottom spacer -->
        <tr><td height="32">&nbsp;</td></tr>

        <!-- Powered by MENIUS -->
        <tr>
          <td align="center">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              Powered by <a href="https://menius.app" style="color:#7c3aed;text-decoration:none;font-weight:600;">MENIUS</a>
              &nbsp;·&nbsp; Digital menus &amp; orders for restaurants
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ---------- Helpers ----------

function itemsTable(items: OrderEmailItem[], currency?: string): string {
  if (!items.length) return '';

  const rows = items.map(item => {
    const subLines: string[] = [];
    if (item.variant) subLines.push(`<span style="color:#6b7280;">${item.variant}</span>`);
    if (item.modifiers?.length) {
      subLines.push(...item.modifiers.map(m => `<span style="color:#6b7280;">· ${m}</span>`));
    }
    if (item.extras?.length) {
      subLines.push(...item.extras.map(e => `<span style="color:#7c3aed;">+ ${e}</span>`));
    }
    if (item.notes) {
      subLines.push(`<em style="color:#d97706;">"${item.notes}"</em>`);
    }

    return `
    <tr>
      <td style="padding:10px 0 10px;border-bottom:1px solid #f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;vertical-align:top;">
        <span style="font-size:14px;font-weight:600;color:#111827;">${item.qty}&times;&nbsp;${item.name}</span>
        ${subLines.length ? `<br/><span style="font-size:12px;line-height:1.8;">${subLines.join('<br/>')}</span>` : ''}
      </td>
      <td style="padding:10px 0 10px;border-bottom:1px solid #f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:right;vertical-align:top;white-space:nowrap;">
        <span style="font-size:14px;font-weight:600;color:#111827;">${item.price}</span>
      </td>
    </tr>`;
  }).join('');

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    ${rows}
  </table>`;
}

function ctaButton(href: string, label: string, color: string): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td align="center" style="border-radius:12px;background-color:${color};">
        <a href="${href}" target="_blank"
          style="display:inline-block;padding:14px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function pill(text: string, bg: string, color: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:${bg};color:${color};font-size:12px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${text}</span>`;
}

function metaRow(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:7px 0;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:7px 0;font-size:13px;color:#111827;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;vertical-align:top;">${value}</td>
  </tr>`;
}

// ---------- Order Confirmation (customer) ----------

export function buildOrderConfirmationEmail(params: {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  total: string;
  items: OrderEmailItem[];
  trackingUrl: string;
  orderType?: string;
  paymentMethod?: string;
  tableNumber?: string | null;
  notes?: string | null;
  locale?: string;
}): string {
  const { customerName, orderNumber, restaurantName, total, items, trackingUrl, orderType, paymentMethod, tableNumber, notes, locale } = params;
  const en = locale === 'en';

  const orderTypeLabels: Record<string, { en: string; es: string; color: string; bg: string }> = {
    dine_in:  { en: 'Dine-in',  es: 'En restaurante', color: '#7c3aed', bg: '#f3f0ff' },
    pickup:   { en: 'Pickup',   es: 'Para recoger',   color: '#0891b2', bg: '#ecfeff' },
    delivery: { en: 'Delivery', es: 'Delivery',        color: '#059669', bg: '#f0fdf4' },
  };
  const paymentLabels: Record<string, { en: string; es: string }> = {
    cash:   { en: 'Cash', es: 'Efectivo' },
    online: { en: 'Online', es: 'En línea' },
    card:   { en: 'Card', es: 'Tarjeta' },
  };

  const ot = orderType ? orderTypeLabels[orderType] : null;
  const pm = paymentMethod ? paymentLabels[paymentMethod] : null;

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;">
        <!-- Restaurant name -->
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.02em;">${restaurantName}</p>
        <!-- Confirmation badge -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;vertical-align:middle;">
              <div style="width:20px;height:20px;border-radius:50%;background-color:#059669;text-align:center;line-height:20px;">
                <span style="color:#fff;font-size:12px;font-weight:700;">&#10003;</span>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:13px;font-weight:600;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${en ? 'Order confirmed' : 'Pedido confirmado'}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const metaRows: string[] = [
    metaRow(en ? 'Order' : 'Pedido', `<span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;">#${orderNumber}</span>`),
    metaRow(en ? 'Customer' : 'Cliente', customerName),
  ];
  if (ot) metaRows.push(metaRow(en ? 'Type' : 'Tipo', pill(en ? ot.en : ot.es, ot.bg, ot.color)));
  if (pm) metaRows.push(metaRow(en ? 'Payment' : 'Pago', en ? pm.en : pm.es));
  if (tableNumber) metaRows.push(metaRow(en ? 'Table' : 'Mesa', tableNumber));
  if (notes) metaRows.push(metaRow(en ? 'Notes' : 'Notas', `<em style="color:#6b7280;">${notes}</em>`));

  const body = `
  <p style="margin:0 0 20px;font-size:15px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    ${en ? `Hi <strong>${customerName}</strong> — your order has been received and is being processed.` : `Hola <strong>${customerName}</strong> — tu pedido fue recibido y está en proceso.`}
  </p>

  <!-- Meta info -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
    ${metaRows.join('')}
  </table>

  <!-- Divider -->
  <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${en ? 'Your order' : 'Tu pedido'}
  </p>

  ${itemsTable(items)}

  <!-- Total -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;border-top:2px solid #f3f4f6;">
    <tr>
      <td style="padding:16px 0 0;font-size:16px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Total</td>
      <td style="padding:16px 0 0;text-align:right;font-size:22px;font-weight:800;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${total}</td>
    </tr>
  </table>

  ${ctaButton(trackingUrl, en ? '📦 Track my order' : '📦 Seguir mi pedido', '#7c3aed')}

  <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${en ? 'Tap the button above to follow your order in real time.' : 'Toca el botón para seguir tu pedido en tiempo real.'}
  </p>`;

  const footer = `${en ? `This email was sent by` : `Este correo fue enviado por`} <strong style="color:#111827;">${restaurantName}</strong> ${en ? 'using the MENIUS platform.' : 'a través de la plataforma MENIUS.'}`;

  return shell('#7c3aed', header, body, footer);
}

// ---------- Payment Receipt (customer) ----------

export function buildPaymentReceiptEmail(params: {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  total: string;
  items: OrderEmailItem[];
  trackingUrl: string;
  orderType?: string;
  locale?: string;
}): string {
  const { customerName, orderNumber, restaurantName, total, items, trackingUrl, orderType, locale } = params;
  const en = locale === 'en';

  const orderTypeLabels: Record<string, { en: string; es: string }> = {
    dine_in:  { en: 'Dine-in',  es: 'En restaurante' },
    pickup:   { en: 'Pickup',   es: 'Para recoger' },
    delivery: { en: 'Delivery', es: 'Delivery' },
  };
  const otLabel = orderType ? (en ? orderTypeLabels[orderType]?.en : orderTypeLabels[orderType]?.es) : null;

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.02em;">${restaurantName}</p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;vertical-align:middle;">
              <div style="width:20px;height:20px;border-radius:50%;background-color:#059669;text-align:center;line-height:20px;">
                <span style="color:#fff;font-size:12px;font-weight:700;">&#10003;</span>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:13px;font-weight:600;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${en ? 'Payment confirmed' : 'Pago confirmado'}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const metaRows = [
    metaRow(en ? 'Receipt' : 'Recibo', `<span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;">#${orderNumber}</span>`),
    metaRow(en ? 'Customer' : 'Cliente', customerName),
    ...(otLabel ? [metaRow(en ? 'Type' : 'Tipo', otLabel)] : []),
  ];

  const body = `
  <p style="margin:0 0 20px;font-size:15px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    ${en ? `Hi <strong>${customerName}</strong> — your payment has been confirmed. Keep this email as your receipt.` : `Hola <strong>${customerName}</strong> — tu pago fue confirmado. Guarda este correo como comprobante.`}
  </p>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
    ${metaRows.join('')}
  </table>

  <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${en ? 'Order summary' : 'Resumen del pedido'}
  </p>

  ${itemsTable(items)}

  <!-- Total -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;border-top:2px solid #f3f4f6;">
    <tr>
      <td style="padding:16px 0 0;font-size:16px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${en ? 'Total paid' : 'Total pagado'}
      </td>
      <td style="padding:16px 0 0;text-align:right;font-size:22px;font-weight:800;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${total}</td>
    </tr>
  </table>

  ${ctaButton(trackingUrl, en ? '📦 Track my order' : '📦 Seguir mi pedido', '#059669')}`;

  const footer = `${en ? `Payment processed for` : `Pago procesado para`} <strong style="color:#111827;">${restaurantName}</strong> ${en ? 'via MENIUS.' : 'vía MENIUS.'}`;

  return shell('#059669', header, body, footer);
}

// ---------- Status Update (customer) ----------

export function buildStatusUpdateEmail(params: {
  customerName: string;
  orderNumber: string;
  restaurantName: string;
  status: string;
  trackingUrl: string;
  reviewUrl?: string;
  locale?: string;
  orderType?: string;
}): string {
  const { customerName, orderNumber, restaurantName, status, trackingUrl, reviewUrl, locale, orderType } = params;
  const en = locale === 'en';

  type StatusInfo = { icon: string; titleEn: string; titleEs: string; msgEn: string; msgEs: string; color: string };
  const STATUS: Record<string, StatusInfo> = {
    confirmed: {
      icon: '✅',
      titleEn: 'Order confirmed!',   titleEs: '¡Pedido confirmado!',
      msgEn:   'Your order has been accepted. The kitchen will start preparing it shortly.',
      msgEs:   'Tu pedido fue aceptado. La cocina empezará a prepararlo en breve.',
      color: '#059669',
    },
    preparing: {
      icon: '👨‍🍳',
      titleEn: 'Being prepared…',    titleEs: 'En preparación…',
      msgEn:   "The chef is working on your order right now. Won't be long!",
      msgEs:   'El chef está trabajando en tu pedido ahora mismo. ¡Ya casi!',
      color: '#7c3aed',
    },
    ready: {
      icon: '🔔',
      titleEn: 'Your order is ready!', titleEs: '¡Tu pedido está listo!',
      msgEn:   'Your order is ready and waiting for you. Come and get it!',
      msgEs:   'Tu pedido está listo y te espera. ¡Pásalo a recoger!',
      color: '#d97706',
    },
    delivered: (() => {
      if (orderType === 'pickup') return {
        icon: '🥡',
        titleEn: 'Order picked up — enjoy!', titleEs: '¡Pedido recogido — buen provecho!',
        msgEn:   'We hope everything was perfect. It would mean a lot to us if you shared your experience!',
        msgEs:   'Esperamos que todo haya estado perfecto. ¡Nos encantaría saber qué te pareció!',
        color: '#059669',
      };
      if (orderType === 'dine_in') return {
        icon: '🍽️',
        titleEn: 'Order served — enjoy!', titleEs: '¡Pedido servido — buen provecho!',
        msgEn:   'We hope everything was perfect. It would mean a lot to us if you shared your experience!',
        msgEs:   'Esperamos que todo haya estado perfecto. ¡Nos encantaría saber qué te pareció!',
        color: '#059669',
      };
      return {
        icon: '🎉',
        titleEn: 'Order delivered — enjoy!', titleEs: '¡Pedido entregado — buen provecho!',
        msgEn:   'We hope everything was perfect. It would mean a lot to us if you shared your experience!',
        msgEs:   'Esperamos que todo haya estado perfecto. ¡Nos encantaría saber qué te pareció!',
        color: '#059669',
      };
    })(),
    cancelled: {
      icon: '❌',
      titleEn: 'Order cancelled',    titleEs: 'Pedido cancelado',
      msgEn:   'Unfortunately your order was cancelled. Contact the restaurant if you have questions.',
      msgEs:   'Lamentablemente tu pedido fue cancelado. Contacta al restaurante si tienes dudas.',
      color: '#dc2626',
    },
  };

  const s = STATUS[status] ?? {
    icon: '📋', titleEn: `Status: ${status}`, titleEs: `Estado: ${status}`,
    msgEn: 'Your order status has changed.', msgEs: 'El estado de tu pedido cambió.',
    color: '#6b7280',
  };

  const title = en ? s.titleEn : s.titleEs;
  const msg   = en ? s.msgEn   : s.msgEs;

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding:36px 32px 28px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 12px;font-size:40px;line-height:1;">${s.icon}</p>
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${s.color};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${title}</p>
        <p style="margin:0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${restaurantName} &nbsp;·&nbsp; ${en ? 'Order' : 'Pedido'} #${orderNumber}</p>
      </td>
    </tr>
  </table>`;

  const reviewCtaUrl = status === 'delivered' ? (reviewUrl ?? trackingUrl) : trackingUrl;
  const reviewCta = status === 'delivered'
    ? `
  <div style="margin:24px 0 0;text-align:center;">
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      ${en ? '⭐ Rate your experience' : '⭐ Califica tu experiencia'}
    </p>
    ${ctaButton(reviewCtaUrl, en ? '🌟 Leave a review' : '🌟 Dejar una reseña', '#f59e0b')}
  </div>`
    : '';

  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:#374151;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    ${en ? `Hi <strong>${customerName}</strong>` : `Hola <strong>${customerName}</strong>`} — ${msg}
  </p>
  ${status !== 'delivered' ? ctaButton(trackingUrl, en ? '📍 View my order' : '📍 Ver mi pedido', s.color) : ''}
  ${reviewCta}`;

  const footer = `${en ? 'Sent by' : 'Enviado por'} <strong style="color:#111827;">${restaurantName}</strong> ${en ? 'via MENIUS.' : 'vía MENIUS.'}`;

  return shell(s.color, header, body, footer);
}

// ---------- New Order Alert (restaurant owner) ----------

export function buildOwnerNewOrderEmail(params: {
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  orderType: string;
  deliveryAddress?: string | null;
  total: string;
  items: OrderEmailItem[];
  dashboardUrl: string;
  notes?: string | null;
  tableNumber?: string | null;
  locale?: string;
}): string {
  const { orderNumber, restaurantName, customerName, customerPhone, customerEmail, orderType, deliveryAddress, total, items, dashboardUrl, notes, tableNumber, locale } = params;
  const en = locale === 'en';

  const orderTypeLabels: Record<string, { en: string; es: string; color: string; bg: string }> = {
    dine_in:  { en: 'Dine-in',  es: 'En restaurante', color: '#7c3aed', bg: '#f3f0ff' },
    pickup:   { en: 'Pickup',   es: 'Para recoger',   color: '#0891b2', bg: '#ecfeff' },
    delivery: { en: 'Delivery', es: 'Delivery',        color: '#059669', bg: '#f0fdf4' },
  };
  const ot = orderTypeLabels[orderType] ?? { en: orderType, es: orderType, color: '#6b7280', bg: '#f4f4f5' };

  const now = new Date().toLocaleTimeString(en ? 'en-US' : 'es-MX', { hour: '2-digit', minute: '2-digit' });

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111827;">
    <tr>
      <td style="padding:24px 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${restaurantName}
              </p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                🔔 ${en ? 'New order!' : '¡Nuevo pedido!'}
              </p>
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <p style="margin:0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${now}</p>
              <p style="margin:4px 0 0;font-family:monospace;font-size:13px;color:#d1d5db;background:#374151;padding:3px 8px;border-radius:6px;display:inline-block;">#${orderNumber}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const metaRows: string[] = [
    metaRow(en ? 'Customer' : 'Cliente', customerName),
  ];
  if (customerPhone) metaRows.push(metaRow(en ? 'Phone' : 'Teléfono', `<a href="tel:${customerPhone}" style="color:#7c3aed;text-decoration:none;">${customerPhone}</a>`));
  if (customerEmail) metaRows.push(metaRow('Email', customerEmail));
  metaRows.push(metaRow(en ? 'Type' : 'Tipo', pill(en ? ot.en : ot.es, ot.bg, ot.color)));
  if (tableNumber) metaRows.push(metaRow(en ? 'Table' : 'Mesa', tableNumber));
  if (orderType === 'delivery' && deliveryAddress) metaRows.push(metaRow(en ? 'Delivery address' : 'Dirección de entrega', deliveryAddress));
  if (notes) metaRows.push(metaRow(en ? 'Notes' : 'Notas', `<em style="color:#d97706;">"${notes}"</em>`));

  const body = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
    ${metaRows.join('')}
  </table>

  <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${en ? 'Items ordered' : 'Productos'}
  </p>

  ${itemsTable(items)}

  <!-- Total -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:4px;border-top:2px solid #f3f4f6;">
    <tr>
      <td style="padding:16px 0 0;font-size:16px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Total</td>
      <td style="padding:16px 0 0;text-align:right;font-size:22px;font-weight:800;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${total}</td>
    </tr>
  </table>

  ${ctaButton(dashboardUrl, en ? '⚡ Open in dashboard' : '⚡ Abrir en el dashboard', '#111827')}`;

  const footer = `${en ? 'Automatic notification from MENIUS for' : 'Notificación automática de MENIUS para'} <strong style="color:#111827;">${restaurantName}</strong>.`;

  return shell('#111827', header, body, footer);
}

// ---------- Welcome (restaurant owner) ----------

export function buildWelcomeEmail(params: {
  ownerName: string;
  restaurantName: string;
  dashboardUrl: string;
  menuUrl: string;
  locale?: string;
}): string {
  const { ownerName, restaurantName, dashboardUrl, menuUrl, locale } = params;
  const en = locale === 'en';

  const steps = en
    ? [
        { n: '1', t: 'Complete your menu', d: 'Add your products, photos, and prices.' },
        { n: '2', t: 'Set up your tables', d: 'Generate QR codes for each table.' },
        { n: '3', t: 'Share & go live',    d: 'Share your link and start receiving orders.' },
      ]
    : [
        { n: '1', t: 'Completa tu menú',   d: 'Agrega tus productos, fotos y precios.' },
        { n: '2', t: 'Configura tus mesas', d: 'Genera los códigos QR para cada mesa.' },
        { n: '3', t: 'Comparte y lanza',    d: 'Comparte tu enlace y empieza a recibir pedidos.' },
      ];

  const stepsHtml = steps.map(s => `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
    <tr>
      <td style="width:32px;vertical-align:top;padding-top:2px;">
        <div style="width:24px;height:24px;border-radius:50%;background-color:#7c3aed;text-align:center;line-height:24px;">
          <span style="color:#fff;font-size:12px;font-weight:700;">${s.n}</span>
        </div>
      </td>
      <td style="padding-left:12px;vertical-align:top;">
        <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${s.t}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${s.d}</p>
      </td>
    </tr>
  </table>`).join('');

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding:36px 32px 28px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 16px;font-size:40px;line-height:1;">🎉</p>
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.02em;">
          ${en ? 'Welcome to MENIUS!' : '¡Bienvenido a MENIUS!'}
        </p>
        <p style="margin:4px 0 0;font-size:14px;color:#7c3aed;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${restaurantName}
        </p>
      </td>
    </tr>
  </table>`;

  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    ${en
      ? `Hi <strong>${ownerName}</strong> — your restaurant is now live on MENIUS. You are on the <strong>Free plan</strong> — upgrade anytime to unlock more features. No credit card required.`
      : `Hola <strong>${ownerName}</strong> — tu restaurante ya está activo en MENIUS. Estás en el <strong>plan gratuito</strong> — mejora tu plan en cualquier momento para desbloquear más funciones. Sin tarjeta de crédito.`}
  </p>

  <!-- Trial badge -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
    <tr>
      <td style="background-color:#f3f0ff;border-radius:12px;padding:16px 20px;border-left:4px solid #7c3aed;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${en ? '✨ Forever free plan · Upgrade anytime' : '✨ Plan gratis para siempre · Mejora cuando quieras'}
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${en ? 'Digital menu · Real-time orders · QR codes · Analytics · WhatsApp alerts' : 'Menú digital · Pedidos en tiempo real · QR codes · Analytics · Alertas WhatsApp'}
        </p>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${en ? 'Get started in 3 steps' : 'Empieza en 3 pasos'}
  </p>

  ${stepsHtml}

  ${ctaButton(dashboardUrl, en ? '🚀 Go to my dashboard' : '🚀 Ir a mi dashboard', '#7c3aed')}

  <p style="margin:16px 0 0;text-align:center;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <a href="${menuUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600;">${en ? 'Preview my public menu →' : 'Ver mi menú público →'}</a>
  </p>`;

  const footer = `${en ? 'Questions? Reply to this email and we\'ll help you.' : '¿Tienes dudas? Responde este correo y te ayudamos.'}`;

  return shell('#7c3aed', header, body, footer);
}

// ---------- Trial Ending (restaurant owner) ----------

export function buildTrialEndingEmail(params: {
  ownerName: string;
  restaurantName: string;
  daysLeft: number;
  billingUrl: string;
  locale?: string;
}): string {
  const { ownerName, restaurantName, daysLeft, billingUrl, locale } = params;
  const en = locale === 'en';

  const urgent = daysLeft <= 1;
  const accentColor = urgent ? '#dc2626' : '#d97706';
  const icon = urgent ? '🚨' : '⏰';
  const titleEn = urgent ? 'Your trial ends tomorrow' : `Your trial ends in ${daysLeft} days`;
  const titleEs = urgent ? 'Tu prueba termina mañana' : `Tu prueba termina en ${daysLeft} días`;

  const header = `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="padding:36px 32px 28px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0 0 12px;font-size:40px;line-height:1;">${icon}</p>
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:${accentColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${en ? titleEn : titleEs}</p>
        <p style="margin:0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${restaurantName}</p>
      </td>
    </tr>
  </table>`;

  const body = `
  <p style="margin:0 0 24px;font-size:15px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
    ${en
      ? `Hi <strong>${ownerName}</strong> — you're on the free plan. Upgrade to unlock unlimited orders, WhatsApp notifications, delivery, and more.`
      : `Hola <strong>${ownerName}</strong> — estás en el plan gratuito. Mejora tu plan para desbloquear pedidos ilimitados, notificaciones WhatsApp, delivery y mucho más.`}
  </p>

  <!-- Warning box -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
    <tr>
      <td style="background-color:#fef3c7;border-radius:12px;padding:16px 20px;border-left:4px solid #d97706;">
        <p style="margin:0;font-size:13px;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
          ${en
            ? "On the free plan you're limited to 50 orders/month and dine-in only. Upgrade to remove limits and get delivery, WhatsApp alerts, and priority support."
            : 'En el plan gratuito tienes un límite de 50 pedidos/mes y solo dine-in. Mejora tu plan para eliminar límites y obtener delivery, alertas WhatsApp y soporte prioritario.'}
        </p>
      </td>
    </tr>
  </table>

  ${ctaButton(billingUrl, en ? '⚡ Choose my plan' : '⚡ Elegir mi plan', accentColor)}

  <!-- Plan hint -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
    <tr>
      <td style="background-color:#f9fafb;border-radius:12px;padding:16px 20px;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${en ? 'Pro plan · $79/mo · Most popular' : 'Plan Pro · $79/mes · El más popular'}
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${en ? 'Delivery · WhatsApp · Analytics · Up to 3 staff users' : 'Delivery · WhatsApp · Analytics · Hasta 3 usuarios de staff'}
        </p>
      </td>
    </tr>
  </table>`;

  const footer = `MENIUS &nbsp;·&nbsp; <a href="${billingUrl}" style="color:#7c3aed;text-decoration:none;">${en ? 'Manage subscription' : 'Gestionar suscripción'}</a>`;

  return shell(accentColor, header, body, footer);
}

// ---------- Social Post Digest (admin) ----------

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
    const captionPreview = p.caption.length > 300 ? p.caption.slice(0, 300) + '…' : p.caption;

    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background-color:${color};padding:14px 20px;">
          <span style="color:#fff;font-size:16px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${emoji} ${platformName}</span>
        </td>
      </tr>
      ${p.image_url ? `<tr><td style="text-align:center;background:#f9fafb;padding:12px;"><img src="${p.image_url}" alt="Post" style="max-width:100%;max-height:360px;border-radius:8px;" /></td></tr>` : ''}
      <tr>
        <td style="background:#fff;padding:20px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">HOOK</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${p.hook}</p>
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">CAPTION</p>
          <p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;white-space:pre-line;">${captionPreview}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#6366f1;word-break:break-all;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${p.hashtags}</p>
          ${p.best_time ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">⏰ <strong>Best time:</strong> ${p.best_time}</p>` : ''}
          ${p.tip ? `<p style="margin:6px 0 0;font-size:12px;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">💡 ${p.tip}</p>` : ''}
        </td>
      </tr>
    </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
      <tr>
        <td style="background:linear-gradient(135deg,#059669,#047857);border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:32px;">📱</p>
          <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff;">Your posts are ready!</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);">${date} · ${posts.length} posts generated</p>
        </td>
      </tr>
      <tr><td height="20"></td></tr>
      <tr><td>${postsHtml}</td></tr>
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <a href="https://menius.app/admin/social-generator" style="display:inline-block;padding:14px 40px;background:#059669;color:#fff;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;">
            View all posts
          </a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            Automated by <a href="https://menius.app" style="color:#059669;text-decoration:none;font-weight:600;">MENIUS AI</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
