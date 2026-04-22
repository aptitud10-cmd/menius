import { createClient } from '@/lib/supabase/server';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { resolvePlanId } from '@/lib/plans';

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 };

export function meetsMinPlan(currentPlan: string, minPlan: string): boolean {
  return (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

export async function getDashboardPlan(): Promise<string> {
  const supabase = await createClient();
  const { restaurantId } = await getDashboardContext();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, status, trial_end')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (!subscription) return 'free';
  if (subscription.status === 'active' || subscription.status === 'past_due') {
    return resolvePlanId(subscription.plan_id ?? 'free');
  }
  if (
    subscription.status === 'trialing' &&
    subscription.trial_end &&
    new Date(subscription.trial_end) > new Date()
  ) {
    return resolvePlanId(subscription.plan_id ?? 'starter');
  }
  return 'free';
}

export async function checkPlanAccess(minPlan: string): Promise<boolean> {
  const plan = await getDashboardPlan();
  return meetsMinPlan(plan, minPlan);
}
