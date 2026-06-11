import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/plans';

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

function rank(planId: string): number {
  return PLAN_RANK[planId] ?? 0;
}

/**
 * Dunning grace period: how long a 'past_due' subscription keeps its paid plan
 * after the first failed charge. Stripe Smart Retries run on its own during this
 * window; after it elapses the restaurant degrades to 'free' (menu stays live,
 * paid features turn off) until payment recovers.
 */
export const PAST_DUE_GRACE_DAYS = 7;

/**
 * Legacy Free limits — applied to restaurants grandfathered before 2026-04-29.
 * These match the generous Free plan that existed before plan-limit tightening.
 */
export const LEGACY_FREE_LIMITS = {
  maxProducts: -1,
  maxTables: 5,
  maxUsers: 1,
  maxCategories: -1,
  maxOrdersPerMonth: -1,
} as const;

/**
 * Returns the effective limits for a restaurant.
 * Grandfathered restaurants (`is_legacy_free=true`) on the Free plan get the
 * old generous limits. Everyone else uses the current PLANS config.
 */
export async function getEffectivePlanLimits(
  restaurantId: string,
): Promise<{ planId: string; limits: typeof LEGACY_FREE_LIMITS; isLegacyFree: boolean }> {
  const planId = await getEffectivePlanId(restaurantId);

  // Only Free-tier restaurants can be grandfathered — paid plans use their own limits.
  if (planId !== 'free') {
    const plan = PLANS[planId as keyof typeof PLANS];
    return {
      planId,
      limits: (plan?.limits ?? PLANS.free.limits) as typeof LEGACY_FREE_LIMITS,
      isLegacyFree: false,
    };
  }

  const supabase = await createClient();
  const { data: rest } = await supabase
    .from('restaurants')
    .select('is_legacy_free')
    .eq('id', restaurantId)
    .maybeSingle();

  const isLegacyFree = (rest as any)?.is_legacy_free === true;
  return {
    planId: 'free',
    limits: isLegacyFree ? LEGACY_FREE_LIMITS : (PLANS.free.limits as typeof LEGACY_FREE_LIMITS),
    isLegacyFree,
  };
}

/**
 * Resolves the effective plan ID for a restaurant.
 *
 * Priority:
 *  1. commission_plan = true  → 'starter' (pay-per-order model, no subscription needed)
 *  2. Active subscription → subscription.plan_id
 *  3. past_due within grace period → subscription.plan_id; after grace → 'free'
 *  4. Valid trial → plan_id (usually 'starter')
 *  5. Otherwise → 'free'
 */
export async function getEffectivePlanId(restaurantId: string): Promise<string> {
  const supabase = await createClient();

  // Commission-plan restaurants get starter-level access without a subscription.
  const { data: rest } = await supabase
    .from('restaurants')
    .select('commission_plan')
    .eq('id', restaurantId)
    .maybeSingle();

  if ((rest as any)?.commission_plan === true) return 'starter';

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_end, past_due_since')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!sub) return 'free';
  if (sub.status === 'active') return sub.plan_id ?? 'free';

  // past_due: keep the paid plan during the grace window, then degrade to free.
  // Stripe keeps retrying the charge in the background; if it recovers, invoice.paid
  // flips status back to 'active' and clears past_due_since.
  if (sub.status === 'past_due') {
    const since = (sub as any).past_due_since;
    // No timestamp recorded (legacy row) → fall back to keeping the plan, so we
    // never wrongly cut off an existing customer we have no grace data for.
    if (!since) return sub.plan_id ?? 'free';
    const graceEnd = new Date(since).getTime() + PAST_DUE_GRACE_DAYS * 86400_000;
    return Date.now() < graceEnd ? (sub.plan_id ?? 'free') : 'free';
  }

  if (
    sub.status === 'trialing' &&
    sub.trial_end &&
    new Date(sub.trial_end) > new Date()
  ) {
    return sub.plan_id ?? 'starter';
  }
  return 'free';
}

/**
 * Returns true if the restaurant's effective plan meets or exceeds `minPlan`.
 */
export async function hasPlanAccess(
  restaurantId: string,
  minPlan: 'starter' | 'pro' | 'business',
): Promise<boolean> {
  const planId = await getEffectivePlanId(restaurantId);
  return rank(planId) >= rank(minPlan);
}
