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
