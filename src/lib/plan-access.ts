import { getDashboardContext } from "@/lib/get-dashboard-context";
import { getEffectivePlanId, hasPlanAccess } from "@/lib/auth/check-plan";

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

export function meetsMinPlan(currentPlan: string, minPlan: string): boolean {
  return (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

/**
 * Plan efectivo del restaurante en contexto de dashboard.
 *
 * Wrapper de conveniencia sobre `getEffectivePlanId` (fuente única, en
 * `auth/check-plan.ts`): deriva el restaurantId del contexto de dashboard para
 * los callers de páginas que no lo tienen a mano. Antes esta función duplicaba
 * la lógica de resolución de plan pero OMITÍA `commission_plan`, tratando a los
 * clientes del plan 4% como 'free' y negándoles features tier starter.
 */
export async function getDashboardPlan(): Promise<string> {
  const { restaurantId } = await getDashboardContext();
  return getEffectivePlanId(restaurantId);
}

export async function checkPlanAccess(
  minPlan: "starter" | "pro" | "business",
): Promise<boolean> {
  const { restaurantId } = await getDashboardContext();
  return hasPlanAccess(restaurantId, minPlan);
}
