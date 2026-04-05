/**
 * This endpoint was a one-off onboarding helper that contained hardcoded PII
 * (customer email addresses) and a hardcoded secret token — both committed to
 * source control. It has been disabled.
 *
 * To send manual onboarding emails, use POST /api/admin/retention-emails
 * (authenticated via verifyAdmin) instead.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Endpoint disabled' }, { status: 410 });
}
