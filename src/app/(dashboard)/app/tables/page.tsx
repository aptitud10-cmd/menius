import { getDashboardContext } from '@/lib/get-dashboard-context';
import { TablesManager } from '@/components/dashboard/TablesManager';

export default async function TablesPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [tablesRes, restaurantRes] = await Promise.all([
    supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at'),
    supabase
      .from('restaurants')
      .select('name, slug, locale')
      .eq('id', restaurantId)
      .maybeSingle(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';
  const slug = restaurantRes.data?.slug ?? '';
  const tables = tablesRes.data ?? [];

  for (const table of tables) {
    if (table.qr_code_value && !table.qr_code_value.startsWith(appUrl)) {
      const correctUrl = `${appUrl}/${slug}?table=${encodeURIComponent(table.name)}`;
      await supabase.from('tables').update({ qr_code_value: correctUrl }).eq('id', table.id);
      table.qr_code_value = correctUrl;
    }
  }

  return (
    <div>
      <h1 className="dash-heading mb-6">{restaurantRes.data?.locale === 'en' ? 'Tables & QR Codes' : 'Mesas & Códigos QR'}</h1>
      <TablesManager
        initialTables={tables}
        restaurantSlug={slug}
        restaurantName={restaurantRes.data?.name ?? ''}
      />
    </div>
  );
}
