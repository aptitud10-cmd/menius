import { getDashboardContext } from '@/lib/get-dashboard-context';
import { MarketingHub } from '@/components/dashboard/MarketingHub';

export default async function MarketingPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [
    { data: restaurant },
    { count: totalCustomers },
    { count: customersWithEmail },
    { count: customersWithPhone },
  ] = await Promise.all([
    supabase.from('restaurants').select('name, slug, currency, notification_email, notification_whatsapp, notifications_enabled').eq('id', restaurantId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('email', 'is', null).neq('email', ''),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('phone', 'is', null).neq('phone', ''),
  ]);

  return (
    <MarketingHub
      restaurantName={restaurant?.name ?? ''}
      menuSlug={restaurant?.slug ?? ''}
      totalCustomers={totalCustomers ?? 0}
      customersWithEmail={customersWithEmail ?? 0}
      customersWithPhone={customersWithPhone ?? 0}
      notificationsEnabled={restaurant?.notifications_enabled !== false}
      hasEmail={!!restaurant?.notification_email}
      hasWhatsApp={!!restaurant?.notification_whatsapp}
    />
  );
}
