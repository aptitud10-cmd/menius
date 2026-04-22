import { createClient } from '@/lib/supabase/server';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { checkPlanAccess } from '@/lib/plan-access';
import { PlanUpgradeWall } from '@/components/dashboard/PlanUpgradeWall';
import PromotionsContent from './_content';

export default async function PromotionsPage() {
  const { restaurantId } = await getDashboardContext();
  const hasAccess = await checkPlanAccess('pro');
  if (!hasAccess) {
    const supabase = await createClient();
    const { data: rest } = await supabase.from('restaurants').select('locale').eq('id', restaurantId).maybeSingle();
    const locale = rest?.locale === 'en' ? 'en' : 'es';
    return <PlanUpgradeWall requiredPlan="pro" locale={locale} featureEs="Promociones y Cupones" featureEn="Promotions & Coupons" />;
  }
  return <PromotionsContent />;
}
