import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';
import { PrinterSettingsSection } from '@/components/dashboard/PrinterSettingsSection';
import { FiscalSettings } from '@/components/dashboard/FiscalSettings';
import { KDSStationsSettings } from '@/components/dashboard/KDSStationsSettings';
import { MercadoPagoSettings } from '@/components/dashboard/MercadoPagoSettings';
import { WidgetCode } from './WidgetCode';
import { getDashboardTranslations } from '@/lib/dashboard-translations';

export default async function SettingsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: kdsStations }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
    supabase.from('kds_stations').select('*').eq('restaurant_id', restaurantId).order('position'),
  ]);

  if (!restaurant) redirect('/onboarding/create-restaurant');

  const isMxn = restaurant?.currency === 'MXN';
  const locale = (restaurant?.locale === 'en' ? 'en' : 'es') as 'es' | 'en';
  const t = getDashboardTranslations(locale);

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="dash-heading mb-5">{t.settings_title}</h1>
        <RestaurantSettings initialData={restaurant} />
      </div>
      <div id="printer" className="scroll-mt-20">
        <PrinterSettingsSection locale={restaurant?.locale ?? 'es'} />
      </div>
      <div id="kds-stations">
        <h2 className="dash-heading mb-4">{t.settings_kds}</h2>
        <KDSStationsSettings
          initialStations={kdsStations ?? []}
          restaurantId={restaurantId}
        />
      </div>
      <div id="install" className="scroll-mt-20 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="dash-heading mb-2">{t.settings_installTitle}</h2>
        <p className="text-sm text-gray-500 mb-4">{t.settings_installDesc}</p>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="font-semibold text-gray-900">1.</span>{t.settings_installStep1}</li>
          <li className="flex gap-2"><span className="font-semibold text-gray-900">2.</span>{t.settings_installStep2}</li>
          <li className="flex gap-2"><span className="font-semibold text-gray-900">3.</span>{t.settings_installStep3}</li>
        </ol>
      </div>

      <div id="widget" className="scroll-mt-20 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="dash-heading mb-2">{t.settings_widgetTitle}</h2>
        <WidgetCode slug={restaurant.slug} isEn={locale === 'en'} />
      </div>

      {/* MercadoPago — available for all currencies except COP (Wompi handles COP) */}
      {restaurant.currency !== 'COP' && (
        <div id="mercadopago">
          <MercadoPagoSettings
            restaurantId={restaurantId}
            mpEnabled={(restaurant as any).mp_enabled ?? false}
            hasMpToken={!!(restaurant as any).mp_access_token}
            locale={locale}
          />
        </div>
      )}

      {isMxn && (
        <div>
          <h2 className="dash-heading mb-4">{t.settings_cfdiTitle}</h2>
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
