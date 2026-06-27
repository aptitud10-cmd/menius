import { createClient } from "@/lib/supabase/server";
import { getDashboardContext } from "@/lib/get-dashboard-context";
import { resolvePlanId } from "@/lib/plans";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

export function meetsMinPlan(currentPlan: string, minPlan: string): boolean {
  return (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

export async function getDashboardPlan(): Promise<string> {
  const supabase = await createClient();
  const { restaurantId } = await getDashboardContext();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trial_end, past_due_since")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!subscription) return "free";
  if (subscription.status === "active") {
    return resolvePlanId(subscription.plan_id ?? "free");
  }
  if (subscription.status === "past_due") {
    const since = (subscription as Record<string, unknown>).past_due_since as
      | string
      | null
      | undefined;
    // Sin timestamp registrado (fila legacy) → mantener el plan para no cortar
    // a un cliente del que no tenemos datos de gracia.
    if (!since) return resolvePlanId(subscription.plan_id ?? "free");
    const GRACE_DAYS = 7;
    const graceEnd = new Date(since).getTime() + GRACE_DAYS * 86400_000;
    if (Date.now() < graceEnd)
      return resolvePlanId(subscription.plan_id ?? "free");
    return "free";
  }
  if (
    subscription.status === "trialing" &&
    subscription.trial_end &&
    new Date(subscription.trial_end) > new Date()
  ) {
    return resolvePlanId(subscription.plan_id ?? "starter");
  }
  return "free";
}

export async function checkPlanAccess(minPlan: string): Promise<boolean> {
  const plan = await getDashboardPlan();
  return meetsMinPlan(plan, minPlan);
}
