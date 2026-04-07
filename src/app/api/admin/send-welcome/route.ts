export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/email';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-send-welcome');

/**
 * POST /api/admin/send-welcome
 *
 * Sends a warm "we're here to help" contact email to a specific list of
 * restaurant slugs. Useful for new clients who just signed up.
 *
 * Body: { slugs: string[] }   — list of restaurant slugs to contact
 *
 * Auth: verifyAdmin (ADMIN_EMAIL env var)
 */
export async function POST(request: NextRequest) {
  try {
    // Accept either a logged-in admin session OR the CRON_SECRET bearer token
    // so this endpoint can be triggered from the terminal / CI without a browser session.
    const bearerToken = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const hasCronAuth = cronSecret && bearerToken === `Bearer ${cronSecret}`;

    if (!hasCronAuth) {
      const auth = await verifyAdmin();
      if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : [];

    if (slugs.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un slug' }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const { data: restaurants } = await adminDb
      .from('restaurants')
      .select('id, name, slug, notification_email, locale')
      .in('slug', slugs)
      .not('notification_email', 'is', null)
      .neq('notification_email', '');

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ error: 'No se encontraron restaurantes con email configurado', slugs }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
    let sent = 0;
    let failed = 0;
    const results: { slug: string; email: string; ok: boolean }[] = [];

    for (const r of restaurants) {
      if (!r.notification_email) continue;
      const en = r.locale === 'en';

      const html = buildWelcomeEmail(r.name, r.slug, appUrl, en);
      const subject = en
        ? `${r.name} — We're here whenever you need us 👋`
        : `${r.name} — Aquí estamos para lo que necesites 👋`;

      const ok = await sendEmail({ to: r.notification_email, subject, html });
      if (ok) sent++; else failed++;
      results.push({ slug: r.slug, email: r.notification_email, ok });
      logger.info('Welcome email', { slug: r.slug, email: r.notification_email, ok });
    }

    return NextResponse.json({ sent, failed, total: restaurants.length, results });
  } catch (err) {
    logger.error('send-welcome error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildWelcomeEmail(restaurantName: string, slug: string, appUrl: string, en = false): string {
  const menuUrl = `${appUrl}/${slug}`;
  const dashUrl = `${appUrl}/app`;
  const waLink = 'https://wa.me/message/MENIUS_WA'; // replace with real WA link if available

  const greeting = en
    ? `Hi! We noticed you recently set up your digital menu on MENIUS.`
    : `¡Hola! Notamos que recientemente creaste tu menú digital en MENIUS.`;

  const body1 = en
    ? `We're reaching out to make sure everything is working perfectly for you and your customers. Setting up a new menu can have some rough edges, and we want to make sure you have a smooth experience from day one.`
    : `Nos comunicamos para asegurarnos de que todo esté funcionando perfectamente para ti y tus clientes. Configurar un menú nuevo puede tener algunos detalles, y queremos que tengas una experiencia impecable desde el primer día.`;

  const body2 = en
    ? `If you have any questions, need help updating your menu, or run into anything unexpected — just reply to this email or reach us on WhatsApp. We're a real team and we respond fast.`
    : `Si tienes alguna pregunta, necesitas ayuda para actualizar tu menú, o notas algo que no funciona — simplemente responde este correo o escríbenos por WhatsApp. Somos un equipo real y respondemos rápido.`;

  const ctaLabel = en ? 'Go to my dashboard' : 'Ir a mi dashboard';
  const waLabel = en ? 'Write to us on WhatsApp' : 'Escribirnos por WhatsApp';
  const viewMenuLabel = en ? 'View my menu' : 'Ver mi menú';

  return `<!DOCTYPE html>
<html lang="${en ? 'en' : 'es'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${en ? 'We\'re here for you' : 'Aquí estamos para ti'}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px 48px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- Accent bar -->
          <tr><td height="5" style="background:#10b981;border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

              <!-- Header -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:28px 32px 20px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#10b981;letter-spacing:0.08em;text-transform:uppercase;">MENIUS</p>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">
                      ${en ? 'We\'re here for you, ' : 'Aquí estamos para ti, '}${restaurantName} 👋
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:0 32px 28px;">
                    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${greeting}</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${body1}</p>
                    <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">${body2}</p>

                    <!-- CTA buttons -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <a href="${dashUrl}/orders" style="display:block;padding:14px 20px;background:#10b981;color:#ffffff;text-align:center;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
                            ${ctaLabel} →
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <a href="${waLink}" style="display:block;padding:14px 20px;background:#25D366;color:#ffffff;text-align:center;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
                            💬 ${waLabel}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <a href="${menuUrl}" style="display:block;padding:14px 20px;background:#f9fafb;color:#374151;text-align:center;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;border:1px solid #e5e7eb;">
                            🍽️ ${viewMenuLabel}
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:20px 32px 24px;border-top:1px solid #f0f0f0;">
                    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                      ${en
                        ? `MENIUS — Digital menu for restaurants · <a href="${menuUrl}" style="color:#9ca3af;">menius.app/${slug}</a>`
                        : `MENIUS — Menú digital para restaurantes · <a href="${menuUrl}" style="color:#9ca3af;">menius.app/${slug}</a>`}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr><td height="32">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
