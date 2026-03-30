export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/notifications/email';
import { buildOnboardingGuideEmail } from '@/lib/notifications/retention-emails';

const TOKEN = 'onboarding_menius_2026_xr7k';
const APP_URL = 'https://menius.app';

const RECIPIENTS = [
  {
    to: 'noelia700@outlook.com',
    ownerName: 'Noelia Larios',
    restaurantName: 'Hot dogs perrones',
    restaurantSlug: 'hot-dogs-perrones',
  },
  {
    to: 'ros.june252823@gmail.com',
    ownerName: 'Rosario Quispe Villaneva',
    restaurantName: 'EL SABOR',
    restaurantSlug: 'el-sabor',
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const results: Record<string, boolean> = {};

  for (const r of RECIPIENTS) {
    const html = buildOnboardingGuideEmail({
      ownerName: r.ownerName,
      restaurantName: r.restaurantName,
      restaurantSlug: r.restaurantSlug,
      dashboardUrl: `${APP_URL}/app`,
      menuUrl: `${APP_URL}/${r.restaurantSlug}`,
      tablesUrl: `${APP_URL}/app/tables`,
    });

    const sent = await sendEmail({
      to: r.to,
      subject: `${r.ownerName.split(' ')[0]}, aquí están tus 3 primeros pasos en MENIUS 🚀`,
      html,
      replyTo: 'soporte@menius.app',
    });

    results[r.restaurantSlug] = sent;
  }

  return NextResponse.json({ ok: true, results });
}
