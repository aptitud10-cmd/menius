import { getDashboardContext } from '@/lib/get-dashboard-context';
import { EmailCampaigns } from '@/components/dashboard/EmailCampaigns';

export default async function MarketingPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { count: totalCustomers }, { count: customersWithEmail }] = await Promise.all([
    supabase.from('restaurants').select('name, slug, currency').eq('id', restaurantId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('email', 'is', null).neq('email', ''),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-gray-900">Email Marketing</h1>
      <EmailCampaigns
        restaurantName={restaurant?.name ?? ''}
        menuSlug={restaurant?.slug ?? ''}
        totalCustomers={totalCustomers ?? 0}
        customersWithEmail={customersWithEmail ?? 0}
      />
    </div>
  );
}
