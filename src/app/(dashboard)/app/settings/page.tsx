import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';
import { PrinterSettingsSection } from '@/components/dashboard/PrinterSettingsSection';
import { FiscalSettings } from '@/components/dashboard/FiscalSettings';

export default async function SettingsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();

  if (!restaurant) redirect('/onboarding/create-restaurant');

  const isMxn = restaurant?.currency === 'MXN';

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="dash-heading mb-5">{restaurant?.locale === 'en' ? 'Settings' : 'Configuración'}</h1>
        <RestaurantSettings initialData={restaurant} />
      </div>
      <div id="printer">
        <PrinterSettingsSection locale={restaurant?.locale ?? 'es'} />
      </div>
      {isMxn && (
        <div>
          <h2 className="dash-heading mb-4">{restaurant?.locale === 'en' ? 'CFDI Invoicing' : 'Facturación CFDI'}</h2>
          <FiscalSettings
            restaurantId={restaurantId}
            initialData={{
              fiscal_rfc: restaurant.fiscal_rfc,
              fiscal_razon_social: restaurant.fiscal_razon_social,
              fiscal_regimen_fiscal: restaurant.fiscal_regimen_fiscal,
              fiscal_lugar_expedicion: restaurant.fiscal_lugar_expedicion,
            }}
          />
        </div>
      )}
    </div>
  );
}
