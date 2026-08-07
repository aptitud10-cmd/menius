export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Commission (4%) plan — DEACTIVATION ONLY.
 *
 * Activation lives exclusively in /api/admin/toggle-commission-plan (verifyAdmin).
 * It used to be reachable here with nothing but a session: since commission_plan
 * grants starter-tier features and the 4% is only charged on card payments, any
 * cash-only restaurant could POST {} and hold a paid tier for free, forever.
 * The plan is internal (see CLAUDE.md) and is not offered self-service.
 *
 * A tenant may still turn it OFF for themselves — opting out of a fee never
 * needs a gate.
 */
export async function POST(req: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { deactivate?: boolean };
  if (body.deactivate !== true) {
    return NextResponse.json(
      { error: 'El plan por comisión se activa desde soporte. Escribinos y lo configuramos.' },
      { status: 403 },
    );
  }

  const db = createAdminClient();

  // Check if the restaurant has an active subscription before disabling the commission plan.
  // If not, also remove 'online' from payment_methods_enabled — a free restaurant with no
  // commission plan has no mechanism for Menius to collect its fee, so online payments must
  // be disabled to prevent zero-commission processing.
  const [{ data: subData }, { data: restData, error: restError }] = await Promise.all([
    db.from('subscriptions')
      .select('status, trial_end')
      .eq('restaurant_id', tenant.restaurantId)
      .maybeSingle(),
    db.from('restaurants')
      .select('payment_methods_enabled')
      .eq('id', tenant.restaurantId)
      .maybeSingle(),
  ]);

  if (restError) return NextResponse.json({ error: restError.message }, { status: 500 });

  const now = new Date();
  const hasActiveSub =
    subData?.status === 'active' ||
    subData?.status === 'past_due' ||
    (subData?.status === 'trialing' && subData.trial_end != null && new Date(subData.trial_end) > now);

  const updatePayload: Record<string, unknown> = { commission_plan: false };

  if (!hasActiveSub) {
    const current: string[] = Array.isArray(restData?.payment_methods_enabled)
      ? (restData.payment_methods_enabled as string[])
      : ['cash'];
    updatePayload.payment_methods_enabled = current.filter((m) => m !== 'online');
  }

  const { data, error } = await db
    .from('restaurants')
    .update(updatePayload)
    .eq('id', tenant.restaurantId)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
  return NextResponse.json({ success: true, onlineDisabled: !hasActiveSub });
}
