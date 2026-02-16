import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TablesManager } from '@/components/dashboard/TablesManager';

export default async function TablesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('default_restaurant_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.default_restaurant_id) redirect('/onboarding/create-restaurant');

  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', profile.default_restaurant_id)
    .order('created_at');

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Mesas & Códigos QR</h1>
      <TablesManager initialTables={tables ?? []} />
    </div>
  );
}
