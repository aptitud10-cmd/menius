export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/notifications/email';
import { createLogger } from '@/lib/logger';
import { verifyAdmin } from '@/lib/auth/verify-admin';

const logger = createLogger('admin-campaigns');

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { supabase } = auth;
    const body = await request.json();
    const { subject, message, ctaText, filter } = body;

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Asunto y mensaje requeridos' }, { status: 400 });
    }

    // Validate CTA URL — only allow http/https to prevent javascript: injection in emails
    let ctaUrl: string | undefined = body.ctaUrl;
    if (ctaUrl) {
      try {
        const u = new URL(ctaUrl);
        if (!['http:', 'https:'].includes(u.protocol)) ctaUrl = undefined;
      } catch {
        ctaUrl = undefined;
      }
    }

    let query = supabase
      .from('restaurants')
      .select('id, name, slug, notification_email, owner_user_id')
      .not('notification_email', 'is', null)
      .neq('notification_email', '');

    if (filter === 'trialing' || filter === 'active' || filter === 'cancelled' || filter === 'past_due') {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('restaurant_id')
        .eq('status', filter);
      const ids = (subs ?? []).map(s => s.restaurant_id);
      if (ids.length === 0) return NextResponse.json({ sent: 0, failed: 0, total: 0 });
      query = query.in('id', ids);
    }

    const { data: restaurants } = await query.limit(500);

    let sent = 0;
    let failed = 0;

    for (const r of restaurants ?? []) {
      if (!r.notification_email) continue;

      const personalizedSubject = subject
        .replace(/\{restaurante\}/gi, r.name)
        .replace(/\{slug\}/gi, r.slug);

      const personalizedMessage = message
        .replace(/\{restaurante\}/gi, r.name)
        .replace(/\{slug\}/gi, r.slug);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
      const finalCtaUrl = (ctaUrl || `${appUrl}/app`)
        .replace(/\{slug\}/gi, r.slug);

      const html = buildAdminCampaignEmail(
        r.name,
        personalizedSubject,
        personalizedMessage,
        ctaText || 'Ir a mi dashboard',
        finalCtaUrl,
      );

      const success = await sendEmail({
        to: r.notification_email,
        subject: personalizedSubject,
        html,
      });

      if (success) sent++;
      else failed++;
    }

    logger.info('Admin campaign sent', { sent, failed, total: (restaurants ?? []).length, filter });

    return NextResponse.json({ sent, failed, total: (restaurants ?? []).length });
  } catch (err) {
    logger.error('Admin campaign error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function buildAdminCampaignEmail(
  restaurantName: string,
  subject: string,
  message: string,
  ctaText: string,
  ctaUrl: string,
): string {
  const paragraphs = message.split('\n').filter(p => p.trim()).map(p =>
    `<p style="margin:0 0 14px;font-size:15px;color:#d1d5db;line-height:1.7;">${p}</p>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:800;color:#7c3aed;margin:0;">MENIUS</h1>
      <p style="font-size:11px;color:#6b7280;margin:4px 0 0;letter-spacing:0.05em;">MENÚ DIGITAL PARA RESTAURANTES</p>
    </div>
    <div style="background:#0a0a0a;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#6d28d9 100%);padding:32px 28px;text-align:center;">
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 4px;font-weight:500;">Para: ${restaurantName}</p>
        <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0;line-height:1.3;">${subject}</h2>
      </div>
      <div style="padding:32px 28px;">
        ${paragraphs}
        <a href="${ctaUrl}" style="display:block;margin-top:28px;padding:16px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-align:center;border-radius:14px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.01em;">
          ${ctaText}
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:11px;color:#4b5563;margin:0;">MENIUS — Menú digital inteligente para restaurantes</p>
      <p style="font-size:10px;color:#374151;margin:6px 0 0;">¿No quieres recibir estos emails? Responde con "UNSUB"</p>
    </div>
  </div>
</body>
</html>`;
}
