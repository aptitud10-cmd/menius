import { createClient } from '@/lib/supabase/server';

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
 * Resolves the effective plan ID for a restaurant from the subscriptions table.
 * Returns 'free' when no active paid subscription exists.
 */
export async function getEffectivePlanId(restaurantId: string): Promise<string> {
  const supabase = createClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_end')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!sub) return 'free';
  if (sub.status === 'active' || sub.status === 'past_due') return sub.plan_id ?? 'free';
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
