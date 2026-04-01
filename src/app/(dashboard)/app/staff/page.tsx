import { createClient } from '@/lib/supabase/server';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { checkPlanAccess } from '@/lib/plan-access';
import { PlanUpgradeWall } from '@/components/dashboard/PlanUpgradeWall';
import StaffContent from './_content';

export default async function StaffPage() {
  const { restaurantId } = await getDashboardContext();
  const hasAccess = await checkPlanAccess('starter');
  if (!hasAccess) {
    const supabase = createClient();
    const { data: rest } = await supabase.from('restaurants').select('locale').eq('id', restaurantId).maybeSingle();
    const locale = rest?.locale === 'en' ? 'en' : 'es';
    return <PlanUpgradeWall requiredPlan="starter" locale={locale} featureEs="Gestión de Equipo" featureEn="Team Management" />;
  }
  return <StaffContent />;
}
