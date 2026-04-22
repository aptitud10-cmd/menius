import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminMarketingHub } from '@/components/admin/AdminMarketingHub';

export default async function AdminMarketingPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) redirect('/login');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) redirect('/login');

  const [
    { count: totalRestaurants },
    { count: restaurantsWithEmail },
    { data: subs },
  ] = await Promise.all([
    supabase.from('restaurants').select('id', { count: 'exact', head: true }),
    supabase.from('restaurants').select('id', { count: 'exact', head: true }).not('notification_email', 'is', null).neq('notification_email', ''),
    supabase.from('subscriptions').select('restaurant_id, status'),
  ]);

  const planCounts: Record<string, number> = {};
  for (const s of subs ?? []) {
    planCounts[s.status] = (planCounts[s.status] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <AdminMarketingHub
          totalRestaurants={totalRestaurants ?? 0}
          restaurantsWithEmail={restaurantsWithEmail ?? 0}
          planCounts={planCounts}
        />
      </div>
    </div>
  );
}
