/**
 * Premium retention email templates — 2026 design system
 * Clean, minimal, table-based HTML for maximum email client compatibility.
 * Accent-driven design with personalization and clear hierarchy.
 */

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailShell(accentGradient: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>MENIUS</title>
  <!--[if mso]><style>body,table,td,p,a{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f0f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f0f5;">
  <tr>
    <td align="center" style="padding:40px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%;">

        <!-- Logo bar -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <a href="https://menius.app" style="text-decoration:none;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.04em;">
                MENIUS<span style="color:#7c3aed;">.</span>
              </span>
            </a>
          </td>
        </tr>

        <!-- Gradient accent top bar -->
        <tr>
          <td height="4" style="background:${accentGradient};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#ffffff;border-radius:0 0 20px 20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr><td height="28">&nbsp;</td></tr>
        <tr>
          <td align="center">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.8;">
              MENIUS · Menús digitales para restaurantes<br/>
              <a href="https://menius.app/support" style="color:#7c3aed;text-decoration:none;">Soporte</a>
              &nbsp;·&nbsp;
              <a href="https://menius.app" style="color:#7c3aed;text-decoration:none;">menius.app</a>
              &nbsp;·&nbsp;
              <span>soporte@menius.app</span>
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

function cta(href: string, label: string, bg: string, fg = '#ffffff'): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:12px;background-color:${bg};">
        <a href="${href}" target="_blank"
          style="display:inline-block;padding:15px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:700;color:${fg};text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function featureRow(icon: string, title: string, desc: string): string {
  return `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="40" style="vertical-align:top;padding-top:2px;">
            <span style="font-size:20px;">${icon}</span>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${title}</p>
            <p style="margin:0;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.5;">${desc}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─────────────────────────────────────────────
// EMAIL 1: Trial expiring soon → Free Forever
// ─────────────────────────────────────────────
export function buildTrialEndingEmail(params: {
  ownerName: string;
  restaurantName: string;
  trialEndDate: string;
  dashboardUrl: string;
  pricingUrl: string;
  supportUrl: string;
}): string {
  const { ownerName, restaurantName, trialEndDate, dashboardUrl, pricingUrl, supportUrl } = params;
  const firstName = esc(ownerName.split(' ')[0]);
  const safeRestaurantName = esc(restaurantName);

  const content = `
    <!-- Hero section -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <div style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:8px 16px;margin-bottom:20px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:700;color:#ea580c;letter-spacing:0.06em;text-transform:uppercase;">
              ⏳ Tu periodo de prueba termina pronto
            </span>
          </div>
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-0.03em;line-height:1.2;">
            Hola ${firstName}, tu cuenta<br/>seguirá activa 🎉
          </h1>
          <p style="margin:0;font-size:15px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;max-width:400px;margin:0 auto;">
            El <strong style="color:#111827;">${esc(trialEndDate)}</strong> tu prueba de <strong style="color:#111827;">${safeRestaurantName}</strong> termina, pero tu menú digital seguirá funcionando en nuestro <strong style="color:#059669;">plan gratuito para siempre</strong>.
          </p>
        </td>
      </tr>
    </table>

    <!-- Free plan section -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:32px 40px 0;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#059669;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">✅ Lo que incluye tu plan gratuito</p>
            <p style="margin:8px 0 0;font-size:14px;color:#166534;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;">
              ✓ &nbsp;Menú digital con código QR<br/>
              ✓ &nbsp;Fotos de tus platillos<br/>
              ✓ &nbsp;Hasta 5 mesas activas<br/>
              ✓ &nbsp;50 pedidos por mes<br/>
              ✓ &nbsp;Importar menú desde foto con IA<br/>
              ✓ &nbsp;Sin fecha de vencimiento — <strong>gratis para siempre</strong>
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- What you'd keep with Starter -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:0 40px 28px;">
          <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            Comparación de planes:
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;width:50%;border-right:1px solid #e5e7eb;">GRATIS (tu próximo plan)</td>
              <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">STARTER $39/mes</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;border-right:1px solid #f3f4f6;border-top:1px solid #f3f4f6;vertical-align:top;">5 mesas<br/>50 pedidos/mes<br/>Solo en restaurante<br/>Con marca MENIUS<br/><span style="color:#ef4444;">✕ Sin analytics</span><br/><span style="color:#ef4444;">✕ Sin delivery/pickup</span><br/><span style="color:#ef4444;">✕ Sin pedidos ilimitados</span></td>
              <td style="padding:12px 16px;font-size:13px;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;border-top:1px solid #f3f4f6;vertical-align:top;font-weight:500;">15 mesas<br/>Pedidos ilimitados<br/>Dine-in + Pickup + Delivery<br/>Sin marca MENIUS<br/><span style="color:#059669;">✓ Analytics 30 días</span><br/><span style="color:#059669;">✓ IA para tu negocio</span><br/><span style="color:#059669;">✓ Soporte prioritario</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTAs -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:0 40px 12px;text-align:center;">
          ${cta(pricingUrl, '🚀 Continuar con Starter — $39/mes', '#7c3aed')}
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 8px;text-align:center;">
          <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ¿Tienes dudas? Estoy aquí para ayudarte.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px 40px;text-align:center;">
          ${cta(supportUrl, 'Hablar con soporte', '#f3f4f6', '#374151')}
        </td>
      </tr>
    </table>

    <!-- Personal sign-off -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;">
            Gracias por confiar en MENIUS para digitalizar <strong>${safeRestaurantName}</strong>.<br/>
            Cualquier pregunta, responde este email directamente. 🙌<br/><br/>
            — William<br/>
            <span style="color:#9ca3af;font-size:13px;">Fundador, MENIUS</span>
          </p>
        </td>
      </tr>
    </table>`;

  return emailShell(
    'linear-gradient(90deg, #f97316, #fb923c)',
    content,
  );
}

// ─────────────────────────────────────────────
// EMAIL 3: Onboarding guide — "Cómo empezar"
// ─────────────────────────────────────────────
export function buildOnboardingGuideEmail(params: {
  ownerName: string;
  restaurantName: string;
  restaurantSlug: string;
  dashboardUrl: string;
  menuUrl: string;
  tablesUrl: string;
}): string {
  const { ownerName, restaurantName, restaurantSlug, dashboardUrl, menuUrl, tablesUrl } = params;
  const firstName = esc(ownerName.split(' ')[0]);
  const safeRestaurantName = esc(restaurantName);
  const safeRestaurantSlug = esc(restaurantSlug);

  function stepBlock(num: string, icon: string, title: string, desc: string, linkLabel: string, href: string): string {
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="44" style="vertical-align:top;">
                <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#8b5cf6);text-align:center;line-height:36px;">
                  <span style="color:#fff;font-size:16px;font-weight:800;font-family:Arial,sans-serif;">${num}</span>
                </div>
              </td>
              <td style="vertical-align:top;padding-left:12px;">
                <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                  ${icon} ${title}
                </p>
                <p style="margin:0 0 12px;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;">
                  ${desc}
                </p>
                <a href="${href}" style="display:inline-block;padding:8px 18px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;font-size:13px;font-weight:700;color:#7c3aed;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                  ${linkLabel} →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
  }

  const content = `
    <!-- Hero -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <div style="display:inline-block;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:8px 16px;margin-bottom:20px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:700;color:#7c3aed;letter-spacing:0.06em;text-transform:uppercase;">
              🚀 Guía de inicio — MENIUS
            </span>
          </div>
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-0.03em;line-height:1.2;">
            ${firstName}, en 3 pasos<br/>tu restaurante está listo 🍽️
          </h1>
          <p style="margin:0 auto;font-size:15px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;max-width:400px;">
            <strong style="color:#111827;">${safeRestaurantName}</strong> ya tiene su espacio digital. Solo faltan estos pasos para empezar a recibir pedidos.
          </p>
        </td>
      </tr>
    </table>

    <!-- Steps -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 40px 0;">
          ${stepBlock('1', '🍔', 'Agrega tus platillos',
            'Entra a <strong>Menú → Productos</strong> y añade cada platillo con su nombre, precio y foto. ¿No tienes fotos? MENIUS puede generarlas automáticamente con IA — solo haz clic en "Generar imagen" en cada producto.',
            'Ir a Menú → Productos', `${dashboardUrl}/menu/products`
          )}
          ${stepBlock('2', '📱', 'Crea tus mesas y genera el QR',
            'Entra a <strong>Mesas</strong>, crea una mesa y haz clic en "Ver QR". Descarga el código QR e imprímelo para ponerlo en tu mesa. Cuando un cliente lo escanee, verá tu menú y podrá hacer su pedido directamente.',
            'Ir a Mesas → QR', tablesUrl
          )}
          ${stepBlock('3', '📣', 'Comparte tu menú con tus clientes',
            `Tu menú digital ya está disponible en <strong>menius.app/${safeRestaurantSlug}</strong>. Comparte ese enlace por WhatsApp, Instagram o ponlo en tu perfil. También puedes compartirlo desde el botón "Compartir" en tu dashboard.`,
            'Ver mi menú público', menuUrl
          )}
        </td>
      </tr>
    </table>

    <!-- Extra tip -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:16px 40px 0;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#d97706;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">💡 Tip importante</p>
            <p style="margin:0;font-size:13px;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;">
              Completa primero el <strong>perfil de tu restaurante</strong> en Configuración: agrega tu logo, horario de atención y número de teléfono. Esto hace que tu menú luzca más profesional y genera más confianza en tus clientes.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 40px 40px;text-align:center;">
          ${cta(dashboardUrl, '🚀 Ir a mi dashboard ahora', '#7c3aed')}
          <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ¿Tienes alguna duda? Responde este correo y te ayudo personalmente.
          </p>
        </td>
      </tr>
    </table>

    <!-- Sign-off -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;">
            ¡Éxito con <strong>${safeRestaurantName}</strong>! 🎉<br/><br/>
            — William<br/>
            <span style="color:#9ca3af;font-size:13px;">Fundador, MENIUS · soporte@menius.app</span>
          </p>
        </td>
      </tr>
    </table>`;

  return emailShell(
    'linear-gradient(90deg, #7c3aed, #06b6d4)',
    content,
  );
}

// ─────────────────────────────────────────────
// EMAIL 4: Weekly digest — lunes a las 9am
// ─────────────────────────────────────────────
export function buildWeeklyDigestEmail(params: {
  ownerName: string;
  restaurantName: string;
  dashboardUrl: string;
  locale: string;
  currency: string;
  weekRevenue: number;
  weekOrders: number;
  avgTicket: number;
  prevWeekRevenue: number;
  prevWeekOrders: number;
  topProduct: string | null;
  topProductRevenue: number;
  atRiskCount: number;
  pendingOrdersCount: number;
  productsWithoutImage: number;
  activePromos: number;
  tip: string;
  tipCta: string;
  tipCtaUrl: string;
}): string {
  const {
    ownerName, restaurantName, dashboardUrl, locale, currency,
    weekRevenue, weekOrders, avgTicket,
    prevWeekRevenue, prevWeekOrders,
    topProduct, topProductRevenue,
    atRiskCount, pendingOrdersCount, productsWithoutImage, activePromos,
    tip, tipCta, tipCtaUrl,
  } = params;

  const en = locale === 'en';
  const firstName = esc(ownerName.split(' ')[0]);
  const safeRestaurantName = esc(restaurantName);
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  const revChange = prevWeekRevenue > 0
    ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
    : null;
  const ordChange = prevWeekOrders > 0
    ? Math.round(((weekOrders - prevWeekOrders) / prevWeekOrders) * 100)
    : null;

  function changeTag(pct: number | null): string {
    if (pct === null) return '';
    const up = pct >= 0;
    const color = up ? '#059669' : '#dc2626';
    const bg = up ? '#f0fdf4' : '#fef2f2';
    const arrow = up ? '↑' : '↓';
    return `<span style="display:inline-block;margin-left:6px;padding:2px 8px;background:${bg};border-radius:20px;font-size:11px;font-weight:700;color:${color};font-family:Arial,sans-serif;">${arrow} ${Math.abs(pct)}% vs ${en ? 'last week' : 'sem. anterior'}</span>`;
  }

  function statBlock(label: string, value: string, changePct: number | null): string {
    return `
    <td style="width:33.3%;padding:0 8px;text-align:center;vertical-align:top;">
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:20px 12px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${label}</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-0.03em;">${value}</p>
        ${changePct !== null ? `<p style="margin:6px 0 0;">${changeTag(changePct)}</p>` : ''}
      </div>
    </td>`;
  }

  const alerts: string[] = [];
  if (pendingOrdersCount > 0) alerts.push(`⚠️ ${pendingOrdersCount} ${en ? 'pending orders need attention' : 'órdenes pendientes sin atender'}`);
  if (productsWithoutImage > 0) alerts.push(`📸 ${productsWithoutImage} ${en ? 'products without photo — they sell 30% less' : 'productos sin foto — venden 30% menos'}`);
  if (atRiskCount > 0) alerts.push(`💔 ${atRiskCount} ${en ? 'customers at churn risk (21+ days inactive)' : 'clientes en riesgo de fuga (21+ días sin pedir)'}`);
  if (activePromos === 0) alerts.push(en ? '🎟️ No active promotions — promos can increase sales 15-20%' : '🎟️ Sin promociones activas — las promos aumentan ventas 15-20%');

  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <p style="margin:0;font-size:13px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.5;">${esc(a)}</p>
      </td>
    </tr>`).join('');

  const content = `
    <!-- Hero -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:7px 16px;margin-bottom:16px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;font-weight:700;color:#059669;letter-spacing:0.07em;text-transform:uppercase;">
              📊 ${en ? 'Weekly Digest' : 'Resumen semanal'}
            </span>
          </div>
          <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-0.03em;line-height:1.2;">
            ${en ? `Hey ${firstName}, here's your week` : `Hola ${firstName}, así fue tu semana`} 👋
          </h1>
          <p style="margin:0 auto;font-size:14px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;max-width:400px;">
            ${esc(safeRestaurantName)} · ${en ? 'Last 7 days summary' : 'Últimos 7 días'}
          </p>
        </td>
      </tr>
    </table>

    <!-- Stats row -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 32px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${statBlock(en ? 'Revenue' : 'Ingresos', fmt(weekRevenue), revChange)}
              ${statBlock(en ? 'Orders' : 'Órdenes', String(weekOrders), ordChange)}
              ${statBlock(en ? 'Avg ticket' : 'Ticket prom.', fmt(avgTicket), null)}
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${topProduct ? `
    <!-- Top product -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:20px 32px 0;">
          <div style="background:linear-gradient(135deg,#fdf4ff,#f5f3ff);border:1px solid #e9d5ff;border-radius:14px;padding:18px 22px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">🏆 ${en ? 'Top product this week' : 'Producto estrella esta semana'}</p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${esc(topProduct)}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-weight:600;">${fmt(topProductRevenue)} ${en ? 'in revenue' : 'en ventas'}</p>
          </div>
        </td>
      </tr>
    </table>` : ''}

    ${alerts.length > 0 ? `
    <!-- Alerts -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:20px 32px 0;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.05em;">${en ? 'Alerts & Opportunities' : 'Alertas y oportunidades'}</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;padding:0 16px;">
            <tr><td style="padding:0 16px;">${alertRows}</td></tr>
          </table>
        </td>
      </tr>
    </table>` : ''}

    <!-- Weekly tip -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:20px 32px 0;">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:18px 22px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#d97706;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">💡 ${en ? 'Tip of the week' : 'Tip de la semana'}</p>
            <p style="margin:8px 0 12px;font-size:14px;color:#92400e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;">${esc(tip)}</p>
            <a href="${tipCtaUrl}" style="display:inline-block;padding:9px 20px;background:#d97706;border-radius:8px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              ${esc(tipCta)} →
            </a>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 40px 40px;text-align:center;">
          ${cta(dashboardUrl, en ? 'View full dashboard' : 'Ver dashboard completo', '#059669')}
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ${en ? 'Questions? Reply to this email.' : '¿Dudas? Responde este correo directamente.'}
          </p>
        </td>
      </tr>
    </table>

    <!-- Sign-off -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;">
            ${en ? `Keep it up, ${firstName}! 🚀` : `¡Sigue así, ${firstName}! 🚀`}<br/><br/>
            — William<br/>
            <span style="color:#9ca3af;font-size:13px;">${en ? 'Founder, MENIUS' : 'Fundador, MENIUS'} · soporte@menius.app</span>
          </p>
        </td>
      </tr>
    </table>`;

  return emailShell('linear-gradient(90deg, #059669, #10b981)', content);
}

// ─────────────────────────────────────────────
// EMAIL 2: Engagement / Onboarding tips
// ─────────────────────────────────────────────
export function buildEngagementEmail(params: {
  ownerName: string;
  restaurantName: string;
  restaurantSlug: string;
  daysLeft: number;
  dashboardUrl: string;
  menuUrl: string;
}): string {
  const { ownerName, restaurantName, restaurantSlug, daysLeft, dashboardUrl, menuUrl } = params;
  const firstName = esc(ownerName.split(' ')[0]);
  const safeRestaurantName = esc(restaurantName);
  const safeRestaurantSlug = esc(restaurantSlug);

  const content = `
    <!-- Hero -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #f3f4f6;">
          <div style="display:inline-block;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:8px 16px;margin-bottom:20px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:700;color:#7c3aed;letter-spacing:0.06em;text-transform:uppercase;">
              ✨ ${daysLeft} días de Starter restantes
            </span>
          </div>
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:-0.03em;line-height:1.2;">
            ${firstName}, ¿ya viste todo<br/>lo que puedes hacer? 🌟
          </h1>
          <p style="margin:0 auto;font-size:15px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;max-width:420px;">
            <strong style="color:#111827;">${safeRestaurantName}</strong> ya está online en MENIUS. Aquí hay 3 funciones que te van a encantar y que quizás aún no has explorado.
          </p>
        </td>
      </tr>
    </table>

    <!-- Features -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 40px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            ${featureRow('🤖', 'MENIUS AI — Tu asistente de negocio', 'Pregúntale qué platillo está generando más ventas, cómo mejorar tu menú o cómo atraer más clientes. Es como tener un consultor disponible 24/7.')}
            ${featureRow('📸', 'Genera fotos de platillos con IA', '¿No tienes fotos de tus platos? MENIUS las genera automáticamente con inteligencia artificial. Ve a Menú → cualquier producto → "Generar imagen".')}
            ${featureRow('📊', 'Analytics de tu menú', 'Ve qué productos son los más vistos, cuántas veces se abrió tu menú y desde qué países. Está en tu dashboard bajo "Analytics".')}
          </table>
        </td>
      </tr>
    </table>

    <!-- Menu preview link -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:24px 40px 0;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Tu menú digital está en:</p>
            <a href="${menuUrl}" style="font-size:15px;font-weight:700;color:#7c3aed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;text-decoration:none;">
              menius.app/${safeRestaurantSlug} →
            </a>
            <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Compártelo con tus clientes — en redes, WhatsApp o imprímelo en un QR.</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:28px 40px 40px;text-align:center;">
          ${cta(dashboardUrl, '✨ Explorar mi dashboard', '#7c3aed')}
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ¿Necesitas ayuda con algo? Responde este email directamente.
          </p>
        </td>
      </tr>
    </table>

    <!-- Sign-off -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding:24px 40px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.7;">
            ¡Mucho éxito con <strong>${safeRestaurantName}</strong>! 🍽️<br/><br/>
            — William<br/>
            <span style="color:#9ca3af;font-size:13px;">Fundador, MENIUS · soporte@menius.app</span>
          </p>
        </td>
      </tr>
    </table>`;

  return emailShell(
    'linear-gradient(90deg, #7c3aed, #8b5cf6)',
    content,
  );
}
