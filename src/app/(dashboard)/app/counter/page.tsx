import Link from 'next/link';
import { Monitor, Smartphone, ExternalLink, Download, Tablet, Printer, Wifi, CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Counter App — MENIUS',
};

const APK_URL = 'https://expo.dev/artifacts/eas/dxPgSHGFe4YJUPDoFFrVfF.apk';

export default function CounterHubPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="dash-heading">Counter / Caja</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona tus órdenes en tiempo real desde cualquier dispositivo
        </p>
      </div>

      {/* Two options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Option A — Browser */}
        <div className="dash-card p-6 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">Counter en navegador</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Funciona en cualquier celular, tablet o computadora con Chrome o Safari. Sin instalar nada.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <Spec text="Cualquier dispositivo con navegador" />
            <Spec text="Impresión desde ajustes del navegador" />
            <Spec text="Actualización instantánea" />
          </ul>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/counter"
              target="_blank"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Counter
            </Link>
            <Link
              href="/app/counter/tablet"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Tablet className="w-4 h-4" />
              Modo tablet (pantalla completa)
            </Link>
          </div>
        </div>

        {/* Option B — Native App */}
        <div className="dash-card p-6 flex flex-col gap-4 ring-2 ring-orange-500/20 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Recomendado
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">App nativa Android</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Instala la app en tu tablet Android. Más rápida, con notificaciones y soporte completo de impresora Bluetooth.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <Spec text="Notificaciones de nuevas órdenes" />
            <Spec text="Impresora Bluetooth sin diálogo" />
            <Spec text="Funciona sin abrir el navegador" />
          </ul>
          <div className="mt-auto">
            <a
              href={APK_URL}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar APK (Android)
            </a>
          </div>
        </div>
      </div>

      {/* Install guide */}
      <div className="dash-card p-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-orange-500" />
          Cómo instalar la app en la tablet
        </h2>
        <ol className="space-y-4">
          {[
            { n: '1', text: 'En la tablet Android, abre Chrome y ve al link de descarga del APK.' },
            { n: '2', text: 'Si Android pregunta "¿Instalar de fuente desconocida?", acepta. Es seguro.' },
            { n: '3', text: 'Una vez instalada, abre la app MENIUS Counter.' },
            { n: '4', text: 'Inicia sesión con tu cuenta de MENIUS. La app se conecta automáticamente a tus órdenes.' },
          ].map(({ n, text }) => (
            <li key={n} className="flex gap-4">
              <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                {n}
              </span>
              <p className="text-sm text-gray-600 leading-relaxed pt-0.5">{text}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Hardware specs */}
      <div className="dash-card p-6">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tablet className="w-4 h-4 text-gray-400" />
          Hardware recomendado
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Tablet specs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tablet className="w-4 h-4 text-blue-500" />
              <p className="font-semibold text-sm text-gray-800">Tablet</p>
            </div>
            <ul className="space-y-2">
              <HardwareSpec label="Sistema" value="Android 9 o superior" />
              <HardwareSpec label="Pantalla" value='10" o más (orientación horizontal)' />
              <HardwareSpec label="RAM" value="3 GB mínimo (4 GB recomendado)" />
            </ul>
          </div>

          {/* Printer specs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer className="w-4 h-4 text-purple-500" />
              <p className="font-semibold text-sm text-gray-800">Impresora térmica</p>
            </div>
            <ul className="space-y-2">
              <HardwareSpec label="Tipo" value="Térmica ESC/POS" />
              <HardwareSpec label="Papel" value="58 mm o 80 mm" />
              <HardwareSpec label="Conexión" value="Bluetooth 4.0+ o WiFi" />
            </ul>
          </div>
        </div>

        {/* WiFi note */}
        <div className="mt-6 flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <Wifi className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">Conexión a internet:</span> La tablet debe estar conectada a WiFi para recibir órdenes en tiempo real. Se recomienda WiFi de 2.4 GHz o 5 GHz estable en el área de caja.
          </p>
        </div>
      </div>
    </div>
  );
}

function Spec({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function HardwareSpec({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-2 text-sm">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-700 text-right">{value}</span>
    </li>
  );
}
