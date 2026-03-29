export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verify-admin';
import { sendEmail } from '@/lib/notifications/email';
import { buildTrialEndingEmail, buildEngagementEmail } from '@/lib/notifications/retention-emails';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

interface RetentionEmailPayload {
  type: 'trial_ending' | 'engagement';
  to: string;
  ownerName: string;
  restaurantName: string;
  restaurantSlug: string;
  trialEndDate?: string;
  daysLeft?: number;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let body: RetentionEmailPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, to, ownerName, restaurantName, restaurantSlug, trialEndDate, daysLeft } = body;

  if (!type || !to || !ownerName || !restaurantName) {
    return NextResponse.json({ error: 'Missing required fields: type, to, ownerName, restaurantName' }, { status: 400 });
  }

  let html: string;
  let subject: string;

  if (type === 'trial_ending') {
    html = buildTrialEndingEmail({
      ownerName,
      restaurantName,
      trialEndDate: trialEndDate ?? 'próximamente',
      dashboardUrl: `${APP_URL}/app`,
      pricingUrl: `${APP_URL}/app/billing`,
      supportUrl: `${APP_URL}/support`,
    });
    subject = `Tu prueba de MENIUS termina pronto — aquí lo que sigue, ${ownerName.split(' ')[0]}`;
  } else if (type === 'engagement') {
    html = buildEngagementEmail({
      ownerName,
      restaurantName,
      restaurantSlug: restaurantSlug ?? '',
      daysLeft: daysLeft ?? 14,
      dashboardUrl: `${APP_URL}/app`,
      menuUrl: `${APP_URL}/${restaurantSlug}`,
    });
    subject = `${ownerName.split(' ')[0]}, ¿ya exploraste todo lo que MENIUS puede hacer por ${restaurantName}? ✨`;
  } else {
    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
  }

  const sent = await sendEmail({ to, subject, html });

  return NextResponse.json({ ok: sent, to, type, subject });
}
