import { getDashboardContext } from '@/lib/get-dashboard-context';
import { checkPlanAccess } from '@/lib/plan-access';
import { PlanUpgradeWall } from '@/components/dashboard/PlanUpgradeWall';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';

export default async function AIInsightsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const hasAccess = await checkPlanAccess('starter');
  if (!hasAccess) {
    const { data: rest } = await supabase.from('restaurants').select('locale').eq('id', restaurantId).maybeSingle();
    const locale = rest?.locale === 'en' ? 'en' : 'es';
    return <PlanUpgradeWall requiredPlan="starter" locale={locale} featureEs="AI Menu Optimizer" featureEn="AI Menu Optimizer" />;
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('locale, currency')
    .eq('id', restaurantId)
    .maybeSingle();

  return (
    <AIInsightsPanel
      locale={(restaurant?.locale ?? 'es') as 'es' | 'en'}
      currency={restaurant?.currency ?? 'MXN'}
    />
  );
}
