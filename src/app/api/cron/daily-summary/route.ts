export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Daily summary cron — previously sent WhatsApp summaries to restaurant owners.
 * WhatsApp/SMS channels have been removed from the product.
 * This endpoint is kept as a stub so existing Vercel cron config doesn't 404.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ sent: 0, skipped: 0, message: 'WhatsApp daily summary disabled' });
}
