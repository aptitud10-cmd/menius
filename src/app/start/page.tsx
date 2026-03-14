import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Quick Start Guide — MENIUS',
  description: 'Set up your digital menu in 30 minutes. Follow this step-by-step guide to launch your restaurant on MENIUS.',
  alternates: { canonical: 'https://menius.app/start' },
  robots: { index: true, follow: true },
};

type Locale = 'es' | 'en';

interface Step {
  number: string;
  color: string;
  titleEs: string; titleEn: string;
  timeEs: string; timeEn: string;
  descEs: string; descEn: string;
  tasksEs: string[]; tasksEn: string[];
  tipEs: string; tipEn: string;
  ctaLabelEs: string; ctaLabelEn: string;
  ctaHref: string;
}

const steps: Step[] = [
  {
    number: '01',
    color: 'emerald',
    titleEs: 'Crea tu restaurante',
    titleEn: 'Create your restaurant',
    timeEs: '5 min', timeEn: '5 min',
    descEs: 'Configura el perfil base de tu negocio.',
    descEn: 'Set up the basic profile for your business.',
    tasksEs: [
      'Ve a Dashboard → Configuración',
      'Agrega el nombre de tu restaurante',
      'Sube tu logo (o usa las iniciales por ahora)',
      'Escribe una descripción breve (2-3 líneas)',
      'Agrega tu dirección y teléfono',
      'Configura tu moneda y zona horaria',
    ],
    tasksEn: [
      'Go to Dashboard → Settings',
      'Add your restaurant name',
      'Upload your logo (or use initials for now)',
      'Write a short description (2-3 lines)',
      'Add your address and phone number',
      'Set your currency and timezone',
    ],
    tipEs: 'El logo y la descripción aparecen en tu menú público. Una buena primera impresión aumenta el ticket promedio.',
    tipEn: 'Your logo and description appear on your public menu. A great first impression increases average order value.',
    ctaLabelEs: 'Ir a Configuración', ctaLabelEn: 'Go to Settings',
    ctaHref: '/app/settings',
  },
  {
    number: '02',
    color: 'blue',
    titleEs: 'Organiza tus categorías',
    titleEn: 'Organize your categories',
    timeEs: '5 min', timeEn: '5 min',
    descEs: 'Una estructura clara ayuda a los clientes a encontrar lo que buscan.',
    descEn: 'A clear structure helps customers find what they\'re looking for.',
    tasksEs: [
      'Ve a Dashboard → Menú → Categorías',
      'Elimina las categorías de ejemplo que no necesitas',
      'Crea tus categorías reales (ej: Entradas, Platos Fuertes, Postres, Bebidas)',
      'Máximo 6-8 categorías para no abrumar al cliente',
      'Ordénalas de mayor a menor popularidad',
    ],
    tasksEn: [
      'Go to Dashboard → Menu → Categories',
      'Delete the sample categories you don\'t need',
      'Create your real categories (e.g., Starters, Mains, Desserts, Drinks)',
      'Maximum 6–8 categories to avoid overwhelming customers',
      'Sort them from most to least popular',
    ],
    tipEs: 'Los estudios muestran que menús con 4-6 categorías tienen mayor ticket promedio que menús con 10+ (paradoja de la elección).',
    tipEn: 'Studies show menus with 4–6 categories have a higher average ticket than menus with 10+ (paradox of choice).',
    ctaLabelEs: 'Ir a Categorías', ctaLabelEn: 'Go to Categories',
    ctaHref: '/app/menu/categories',
  },
  {
    number: '03',
    color: 'violet',
    titleEs: 'Agrega tus productos',
    titleEn: 'Add your products',
    timeEs: '10 min', timeEn: '10 min',
    descEs: 'Empieza con tus 10-15 productos más vendidos. Puedes agregar más después.',
    descEn: 'Start with your 10-15 best-selling products. You can add more later.',
    tasksEs: [
      'Ve a Dashboard → Menú → Productos',
      'Para cada producto: nombre, descripción y precio',
      'Agrega una foto (sube la tuya o genera una con IA)',
      'Si tienes variantes (tamaños), configúralas en el producto',
      'Si tienes extras (queso extra, etc.), agrégalos también',
      'Marca como activos solo los que ya tienes disponibles',
    ],
    tasksEn: [
      'Go to Dashboard → Menu → Products',
      'For each product: name, description and price',
      'Add a photo (upload yours or generate one with AI)',
      'If you have variants (sizes), configure them on the product',
      'If you have extras (extra cheese, etc.), add those too',
      'Mark as active only the items currently available',
    ],
    tipEs: 'Los productos con foto se ordenan un 30% más que los que no tienen. Prioriza las fotos de tus platillos estrella.',
    tipEn: 'Products with photos are ordered 30% more than those without. Prioritize photos for your signature dishes.',
    ctaLabelEs: 'Ir a Productos', ctaLabelEn: 'Go to Products',
    ctaHref: '/app/menu/products',
  },
  {
    number: '04',
    color: 'amber',
    titleEs: 'Configura tus pedidos',
    titleEn: 'Set up your orders',
    timeEs: '3 min', timeEn: '3 min',
    descEs: 'Define cómo quieres recibir pedidos y cómo cobrarás.',
    descEn: 'Define how you want to receive orders and how you\'ll collect payment.',
    tasksEs: [
      'Ve a Dashboard → Configuración → Métodos de pago',
      'Habilita efectivo si aceptas pagos en físico',
      'Para pagos online: haz clic en "Conectar Stripe" (tarda 5-10 min la primera vez)',
      'Habilita los tipos de orden: dine-in, pickup, delivery',
      'Si ofreces delivery, configura el costo de envío',
      'Configura tus horarios de atención',
    ],
    tasksEn: [
      'Go to Dashboard → Settings → Payment methods',
      'Enable cash if you accept in-person payments',
      'For online payments: click "Connect Stripe" (takes 5-10 min the first time)',
      'Enable order types: dine-in, pickup, delivery',
      'If you offer delivery, configure the delivery fee',
      'Set your operating hours',
    ],
    tipEs: 'Stripe necesita verificar tu identidad y cuenta bancaria. Hazlo hoy para tenerlo listo cuando abras.',
    tipEn: 'Stripe needs to verify your identity and bank account. Do it today so it\'s ready when you open.',
    ctaLabelEs: 'Ir a Configuración', ctaLabelEn: 'Go to Settings',
    ctaHref: '/app/settings',
  },
  {
    number: '05',
    color: 'rose',
    titleEs: 'Genera y prueba tus QR',
    titleEn: 'Generate and test your QR codes',
    timeEs: '5 min', timeEn: '5 min',
    descEs: 'El QR es la puerta de entrada de tus clientes. Pruébalo antes de imprimir.',
    descEn: 'The QR code is your customers\' entry point. Test it before printing.',
    tasksEs: [
      'Ve a Dashboard → Mesas',
      'Crea tus mesas (Mesa 1, Mesa 2, Barra, etc.)',
      'Descarga el QR de cada mesa en alta resolución',
      'Escanea el QR con tu celular',
      'Haz un pedido de prueba completo',
      'Verifica que el pedido llega correctamente al dashboard',
      'Imprime los QR y colócalos en las mesas',
    ],
    tasksEn: [
      'Go to Dashboard → Tables',
      'Create your tables (Table 1, Table 2, Bar, etc.)',
      'Download the QR for each table in high resolution',
      'Scan the QR with your phone',
      'Place a complete test order',
      'Verify the order arrives correctly in the dashboard',
      'Print the QR codes and place them on the tables',
    ],
    tipEs: 'Plastifica los QR o usa portamenús con QR integrado. Un QR rayado que no escanea es una venta perdida.',
    tipEn: 'Laminate the QR codes or use menu holders with built-in QR. A scratched QR that won\'t scan is a lost sale.',
    ctaLabelEs: 'Ir a Mesas', ctaLabelEn: 'Go to Tables',
    ctaHref: '/app/tables',
  },
  {
    number: '06',
    color: 'teal',
    titleEs: 'Lanza y consigue tus primeras reseñas',
    titleEn: 'Launch and get your first reviews',
    timeEs: 'Día de apertura', timeEn: 'Opening day',
    descEs: 'Las primeras 10 reseñas de Google definen tu posicionamiento local.',
    descEn: 'Your first 10 Google reviews define your local ranking.',
    tasksEs: [
      'Comparte el link de tu menú en tus redes sociales',
      'Agrega el link en la bio de tu Instagram',
      'Crea tu perfil en Google Business (gratis)',
      'Sube fotos de tu restaurante a Google Maps',
      'Pide a los primeros 10 clientes que dejen una reseña en Google',
      'Crea un código de descuento de apertura en MENIUS (ej: BIENVENIDO10)',
    ],
    tasksEn: [
      'Share your menu link on your social media',
      'Add the link to your Instagram bio',
      'Create your Google Business profile (free)',
      'Upload restaurant photos to Google Maps',
      'Ask your first 10 customers to leave a Google review',
      'Create an opening discount code in MENIUS (e.g., WELCOME10)',
    ],
    tipEs: 'El código de descuento de apertura te da datos de cuántas personas lo usaron y puedes medir el impacto.',
    tipEn: 'The opening discount code gives you data on how many people used it so you can measure the impact.',
    ctaLabelEs: 'Crear Promoción', ctaLabelEn: 'Create Promotion',
    ctaHref: '/app/promotions',
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

export default async function StartPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as Locale;
  const isEn = locale === 'en';

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
            {isEn ? 'Go to Dashboard →' : 'Ir al Dashboard →'}
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="mb-14 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              {isEn ? 'Quick start guide' : 'Guía de inicio rápido'}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {isEn
              ? <>{`Your restaurant ready in `}<span className="text-emerald-400">30 minutes</span></>
              : <>{'Tu restaurante listo en '}<span className="text-emerald-400">30 minutos</span></>
            }
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            {isEn
              ? 'Follow these 6 steps in order and you\'ll have your digital menu up and running — with QR codes, payments, and real-time orders.'
              : 'Sigue estos 6 pasos en orden y tendrás tu menú digital funcionando, con QR, pagos y pedidos en tiempo real.'}
          </p>

          {/* Time estimate */}
          <div className="flex flex-wrap items-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-gray-400">{isEn ? '~30 minutes total' : '~30 minutos en total'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm text-gray-400">{isEn ? 'No technical skills needed' : 'Sin conocimientos técnicos'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-sm text-gray-400">{isEn ? 'MENIUS AI guides you every step' : 'MENIUS AI te ayuda en cada paso'}</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, idx) => {
            const colors = colorMap[step.color];
            const title = isEn ? step.titleEn : step.titleEs;
            const time = isEn ? step.timeEn : step.timeEs;
            const desc = isEn ? step.descEn : step.descEs;
            const tasks = isEn ? step.tasksEn : step.tasksEs;
            const tip = isEn ? step.tipEn : step.tipEs;
            const ctaLabel = isEn ? step.ctaLabelEn : step.ctaLabelEs;

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
                      <h2 className="text-lg font-bold text-white">{title}</h2>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {time}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">{desc}</p>

                    {/* Tasks */}
                    <ul className="space-y-2 mb-4">
                      {tasks.map((task, i) => (
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
                      <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                    </div>

                    {/* CTA */}
                    <Link
                      href={step.ctaHref}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${colors.badge} text-white text-sm font-semibold hover:opacity-90 transition-opacity`}
                    >
                      {ctaLabel} →
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
              <h3 className="font-bold text-white mb-1">
                {isEn ? 'Have questions at any step?' : '¿Tienes dudas en algún paso?'}
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                {isEn
                  ? 'MENIUS AI is available 24/7 in your dashboard. Ask it anything: "How do I add a variant?", "Where do I configure delivery?", "How do I generate a QR?". It guides you step by step.'
                  : 'MENIUS AI está disponible 24/7 en tu dashboard. Pregúntale cualquier cosa: "¿Cómo agrego una variante?", "¿Dónde configuro el delivery?", "¿Cómo genero un QR?". Te guía paso a paso.'}
              </p>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
              >
                {isEn ? 'Open MENIUS AI in the Dashboard →' : 'Abrir MENIUS AI en el Dashboard →'}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-10 pt-8 border-t border-gray-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500">
              {isEn ? 'Prefer we set it up for you?' : '¿Prefieres que lo hagamos por ti?'}
            </p>
            <Link href="/setup-profesional" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              {isEn ? 'See Professional Setup service →' : 'Ver servicio de Setup Profesional →'}
            </Link>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {isEn ? 'Questions or issues?' : '¿Dudas o problemas?'}
            </p>
            <a href="mailto:soporte@menius.app" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              soporte@menius.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
