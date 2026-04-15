import { redirect } from 'next/navigation';
import { getDashboardContext } from '@/lib/get-dashboard-context';
import { RestaurantSettings } from '@/components/dashboard/RestaurantSettings';
import { PrinterSettingsSection } from '@/components/dashboard/PrinterSettingsSection';
import { FiscalSettings } from '@/components/dashboard/FiscalSettings';
import { KDSStationsSettings } from '@/components/dashboard/KDSStationsSettings';
import { WidgetCode } from './WidgetCode';

export default async function SettingsPage() {
  const { supabase, restaurantId } = await getDashboardContext();

  const [{ data: restaurant }, { data: kdsStations }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
    supabase.from('kds_stations').select('*').eq('restaurant_id', restaurantId).order('position'),
  ]);

  if (!restaurant) redirect('/onboarding/create-restaurant');

  const isMxn = restaurant?.currency === 'MXN';
  const isEn = restaurant?.locale === 'en';

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="dash-heading mb-5">{isEn ? 'Settings' : 'Configuración'}</h1>
        <RestaurantSettings initialData={restaurant} />
      </div>
      <div id="printer" className="scroll-mt-20">
        <PrinterSettingsSection locale={restaurant?.locale ?? 'es'} />
      </div>
      <div id="kds-stations">
        <h2 className="dash-heading mb-4">{isEn ? 'Kitchen Display' : 'Display de Cocina'}</h2>
        <KDSStationsSettings
          initialStations={kdsStations ?? []}
          restaurantId={restaurantId}
        />
      </div>
      <div id="install" className="scroll-mt-20 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="dash-heading mb-2">{isEn ? 'Install MENIUS as App' : 'Instala MENIUS como App'}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {isEn
            ? 'Add MENIUS to your home screen for quick access — works on iPhone, Android, and desktop browsers.'
            : 'Agrega MENIUS a tu pantalla de inicio para acceso rápido — funciona en iPhone, Android y navegadores de escritorio.'}
        </p>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="font-semibold text-gray-900">1.</span>{isEn ? 'Open this page in Safari (iPhone) or Chrome (Android / Desktop).' : 'Abre esta página en Safari (iPhone) o Chrome (Android / Escritorio).'}</li>
          <li className="flex gap-2"><span className="font-semibold text-gray-900">2.</span>{isEn ? 'Tap the Share button (iPhone) or the menu ⋮ (Android) or the ⊕ icon in the address bar (Desktop).' : 'Toca el botón Compartir (iPhone), el menú ⋮ (Android) o el ícono ⊕ en la barra de direcciones (Escritorio).'}</li>
          <li className="flex gap-2"><span className="font-semibold text-gray-900">3.</span>{isEn ? 'Select "Add to Home Screen" and confirm.' : 'Selecciona "Agregar a pantalla de inicio" y confirma.'}</li>
        </ol>
      </div>

      <div id="widget" className="scroll-mt-20 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="dash-heading mb-2">{isEn ? 'Embeddable Widget' : 'Widget embebible'}</h2>
        <WidgetCode slug={restaurant.slug} isEn={isEn} />
      </div>

      {isMxn && (
        <div>
          <h2 className="dash-heading mb-4">{isEn ? 'CFDI Invoicing' : 'Facturación CFDI'}</h2>
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
