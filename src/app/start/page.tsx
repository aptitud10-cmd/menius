import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Guía de Inicio — MENIUS',
  description: 'Configura tu menú digital en 30 minutos. Sigue esta guía paso a paso para lanzar tu restaurante en MENIUS.',
  alternates: { canonical: 'https://menius.app/start' },
  robots: { index: true, follow: true },
};

const steps = [
  {
    number: '01',
    title: 'Crea tu restaurante',
    time: '5 min',
    color: 'emerald',
    description: 'Configura el perfil base de tu negocio.',
    tasks: [
      'Ve a Dashboard → Configuración',
      'Agrega el nombre de tu restaurante',
      'Sube tu logo (o usa las iniciales por ahora)',
      'Escribe una descripción breve (2-3 líneas)',
      'Agrega tu dirección y teléfono',
      'Configura tu moneda y zona horaria',
    ],
    tip: 'El logo y la descripción aparecen en tu menú público. Una buena primera impresión aumenta el ticket promedio.',
    cta: { label: 'Ir a Configuración', href: '/app/settings' },
  },
  {
    number: '02',
    title: 'Organiza tus categorías',
    time: '5 min',
    color: 'blue',
    description: 'Una estructura clara ayuda a los clientes a encontrar lo que buscan.',
    tasks: [
      'Ve a Dashboard → Menú → Categorías',
      'Elimina las categorías de ejemplo que no necesitas',
      'Crea tus categorías reales (ej: Entradas, Platos Fuertes, Postres, Bebidas)',
      'Máximo 6-8 categorías para no abrumar al cliente',
      'Ordénalas de mayor a menor popularidad',
    ],
    tip: 'Los estudios muestran que menus con 4-6 categorías tienen mayor ticket promedio que menús con 10+ categorías (paradoja de la elección).',
    cta: { label: 'Ir a Categorías', href: '/app/menu/categories' },
  },
  {
    number: '03',
    title: 'Agrega tus productos',
    time: '10 min',
    color: 'violet',
    description: 'Empieza con tus 10-15 productos más vendidos. Puedes agregar más después.',
    tasks: [
      'Ve a Dashboard → Menú → Productos',
      'Para cada producto: nombre, descripción y precio',
      'Agrega una foto (sube la tuya o genera una con IA desde el producto)',
      'Si tienes variantes (tamaños), configúralas en el producto',
      'Si tienes extras (queso extra, etc.), agrégalos también',
      'Marca como activos solo los que ya tienes disponibles',
    ],
    tip: 'Los productos con foto se ordenan un 30% más que los que no tienen. Prioriza las fotos de tus platillos estrella.',
    cta: { label: 'Ir a Productos', href: '/app/menu/products' },
  },
  {
    number: '04',
    title: 'Configura tus pedidos',
    time: '3 min',
    color: 'amber',
    description: 'Define cómo quieres recibir pedidos y cómo cobrarás.',
    tasks: [
      'Ve a Dashboard → Configuración → Métodos de pago',
      'Habilita efectivo si aceptas pagos en físico',
      'Para pagos online: haz clic en "Conectar Stripe" (tarda 5-10 min la primera vez)',
      'Habilita los tipos de orden: dine-in, pickup, delivery',
      'Si ofreces delivery, configura el costo de envío',
      'Configura tus horarios de atención',
    ],
    tip: 'Stripe necesita verificar tu identidad y cuenta bancaria. Hazlo hoy para tenerlo listo cuando abras. El proceso tarda 1-3 días hábiles.',
    cta: { label: 'Ir a Configuración', href: '/app/settings' },
  },
  {
    number: '05',
    title: 'Genera y prueba tus QR',
    time: '5 min',
    color: 'rose',
    description: 'El QR es la puerta de entrada de tus clientes. Pruébalo antes de imprimir.',
    tasks: [
      'Ve a Dashboard → Mesas',
      'Crea tus mesas (Mesa 1, Mesa 2, Barra, etc.)',
      'Descarga el QR de cada mesa en alta resolución',
      'Escanea el QR con tu celular',
      'Haz un pedido de prueba completo',
      'Verifica que el pedido llega correctamente al dashboard',
      'Imprime los QR y colócalos en las mesas',
    ],
    tip: 'Plastifica los QR o usa portamenús con QR integrado. Un QR rayado o doblado que no escanea es una venta perdida.',
    cta: { label: 'Ir a Mesas', href: '/app/tables' },
  },
  {
    number: '06',
    title: 'Lanza y consigue tus primeras reseñas',
    time: 'Día de apertura',
    color: 'teal',
    description: 'Las primeras 10 reseñas de Google definen tu posicionamiento local.',
    tasks: [
      'Comparte el link de tu menú en tus redes sociales',
      'Agrega el link en la bio de tu Instagram',
      'Crea tu perfil en Google Business (gratis)',
      'Sube fotos de tu restaurante a Google Maps',
      'Pide a los primeros 10 clientes que dejen una reseña en Google',
      'Crea un código de descuento de apertura en MENIUS (ej: BIENVENIDO10)',
    ],
    tip: 'El código de descuento de apertura no solo atrae clientes — te da datos de cuántas personas lo usaron y puedes medir el impacto.',
    cta: { label: 'Crear Promoción', href: '/app/promotions' },
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', badge: 'bg-blue-500' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', badge: 'bg-violet-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', badge: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', badge: 'bg-rose-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', badge: 'bg-teal-500' },
};

export default function StartPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-bold text-xl tracking-tight">MENIUS</Link>
          <Link
            href="/app"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Ir al Dashboard →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="mb-14 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Guía de inicio rápido</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Tu restaurante listo en{' '}
            <span className="text-emerald-400">30 minutos</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Sigue estos 6 pasos en orden y tendrás tu menú digital funcionando, con QR, pagos y pedidos en tiempo real.
          </p>

          {/* Time estimate */}
          <div className="flex items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-gray-400">~30 minutos en total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm text-gray-400">Sin conocimientos técnicos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-sm text-gray-400">MENIUS AI te ayuda en cada paso</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, idx) => {
            const colors = colorMap[step.color];
            return (
              <div
                key={step.number}
                className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 lg:p-8`}
              >
                <div className="flex items-start gap-5">
                  {/* Number */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.badge} flex items-center justify-center`}>
                    <span className="text-white font-bold text-base">{String(idx + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="text-lg font-bold text-white">{step.title}</h2>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {step.time}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{step.description}</p>

                    {/* Tasks */}
                    <ul className="space-y-2 mb-4">
                      {step.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className={`flex-shrink-0 w-4 h-4 rounded border ${colors.border} mt-0.5 flex items-center justify-center`}>
                            <div className="w-1.5 h-1.5 rounded-sm bg-gray-600" />
                          </div>
                          <span className="text-sm text-gray-300">{task}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Tip */}
                    <div className={`flex items-start gap-2 p-3 rounded-xl bg-black/20 border ${colors.border} mb-4`}>
                      <span className="text-base flex-shrink-0">💡</span>
                      <p className="text-xs text-gray-400 leading-relaxed">{step.tip}</p>
                    </div>

                    {/* CTA */}
                    <Link
                      href={step.cta.href}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.badge} text-white text-sm font-semibold hover:opacity-90 transition-opacity`}
                    >
                      {step.cta.label} →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI tip section */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">✨</span>
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">¿Tienes dudas en algún paso?</h3>
              <p className="text-gray-400 text-sm mb-3">
                MENIUS AI está disponible 24/7 en tu dashboard. Pregúntale cualquier cosa: "¿Cómo agrego una variante?",
                "¿Dónde configuro el delivery?", "¿Cómo genero un QR?". Te guía paso a paso con capturas de pantalla.
              </p>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                Abrir MENIUS AI en el Dashboard →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-10 pt-8 border-t border-gray-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500">¿Prefieres que lo hagamos por ti?</p>
            <Link href="/setup-profesional" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Ver servicio de Setup Profesional →
            </Link>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">¿Dudas o problemas?</p>
            <a href="mailto:soporte@menius.app" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              soporte@menius.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
