import { getDashboardContext } from '@/lib/get-dashboard-context';
import { MarketingHub } from '@/components/dashboard/MarketingHub';
import { checkPlanAccess } from '@/lib/plan-access';
import { PlanUpgradeWall } from '@/components/dashboard/PlanUpgradeWall';

export default async function MarketingPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const hasAccess = await checkPlanAccess('pro');
  if (!hasAccess) {
    const { data: rest } = await supabase.from('restaurants').select('locale').eq('id', restaurantId).maybeSingle();
    const locale = rest?.locale === 'en' ? 'en' : 'es';
    return <PlanUpgradeWall requiredPlan="pro" locale={locale} featureEs="Marketing y Campañas" featureEn="Marketing & Campaigns" />;
  }

  const [
    { data: restaurant },
    { count: totalCustomers },
    { count: customersWithEmail },
    { count: customersWithPhone },
  ] = await Promise.all([
    supabase.from('restaurants').select('name, slug, currency, locale, notification_email, notification_whatsapp, notifications_enabled').eq('id', restaurantId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('email', 'is', null).neq('email', ''),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('phone', 'is', null).neq('phone', ''),
  ]);

  return (
    <MarketingHub
      restaurantName={restaurant?.name ?? ''}
      menuSlug={restaurant?.slug ?? ''}
      restaurantLocale={restaurant?.locale ?? 'es'}
      totalCustomers={totalCustomers ?? 0}
      customersWithEmail={customersWithEmail ?? 0}
      customersWithPhone={customersWithPhone ?? 0}
      notificationsEnabled={restaurant?.notifications_enabled !== false}
      hasEmail={!!restaurant?.notification_email}
      hasWhatsApp={!!restaurant?.notification_whatsapp}
    />
  );
}
