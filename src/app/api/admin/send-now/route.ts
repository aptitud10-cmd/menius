export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/notifications/email';
import { buildTrialEndingEmail, buildEngagementEmail } from '@/lib/notifications/retention-emails';

const TOKEN = 'menius_send_2026_xk9z';
const APP_URL = 'https://menius.app';

export async function GET(request: NextRequest) {
  const t = request.nextUrl.searchParams.get('t');
  if (t !== TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const results: Record<string, boolean> = {};

  // Email 1: Rosario — trial ending
  const htmlRosario = buildTrialEndingEmail({
    ownerName: 'Rosario Quispe Villaneva',
    restaurantName: 'EL SABOR',
    trialEndDate: '31 de marzo de 2026',
    dashboardUrl: `${APP_URL}/app`,
    pricingUrl: `${APP_URL}/app/billing`,
    supportUrl: `${APP_URL}/support`,
  });
  results.rosario = await sendEmail({
    to: 'ros.june252823@gmail.com',
    subject: 'Tu prueba de MENIUS termina pronto — aquí lo que sigue, Rosario',
    html: htmlRosario,
  });

  // Email 2: Noelia — engagement
  const htmlNoelia = buildEngagementEmail({
    ownerName: 'Noelia Larios',
    restaurantName: 'Hot dogs perrones',
    restaurantSlug: 'hot-dogs-perrones',
    daysLeft: 12,
    dashboardUrl: `${APP_URL}/app`,
    menuUrl: `${APP_URL}/hot-dogs-perrones`,
  });
  results.noelia = await sendEmail({
    to: 'noelia700@outlook.com',
    subject: 'Noelia, ¿ya exploraste todo lo que MENIUS puede hacer por Hot dogs perrones? ✨',
    html: htmlNoelia,
  });

  return NextResponse.json({ ok: true, results });
}
