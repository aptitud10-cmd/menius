'use client';

import Link from 'next/link';
import { FadeIn, Stagger, StaggerItem, HoverCard, LazyMotion, domAnimation } from './Animations';

/* ─── DATA ─── */

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Menú Digital QR',
    desc: 'Tus clientes escanean el QR desde la mesa, ven tu menú con fotos y precios, y ordenan desde su celular. Sin descargar apps.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Pedidos en Tiempo Real',
    desc: 'Recibe pedidos al instante en tu dashboard. Tablero Kanban para gestionar: pendiente → preparando → listo.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Analytics Inteligente',
    desc: 'Ventas por día, platillos más vendidos, ticket promedio, horas pico. Los datos que necesitas para crecer.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: 'Fotos con IA',
    desc: 'Genera fotos profesionales de tus platillos con inteligencia artificial. Sin necesidad de fotógrafo.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    title: 'Promociones y Cupones',
    desc: 'Crea códigos de descuento con límites y fechas. Atrae más clientes y aumenta el ticket promedio.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'Gestión de Equipo',
    desc: 'Invita meseros, cocineros y cajeros. Asigna roles y permisos para cada miembro de tu equipo.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: 'Pagos con Stripe',
    desc: 'Acepta pagos en línea de forma segura. Sin comisiones ocultas. El dinero directo a tu cuenta bancaria.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Notificaciones Inteligentes',
    desc: 'Alerta sonora, WhatsApp y email cuando llega un pedido. Nunca pierdas una venta.',
  },
];

const steps = [
  { num: '01', title: 'Regístrate gratis', desc: 'Crea tu cuenta en 30 segundos. Sin tarjeta de crédito requerida.' },
  { num: '02', title: 'Configura tu menú', desc: 'Sube categorías, platillos, fotos (o genéralas con IA), precios, variantes y extras.' },
  { num: '03', title: 'Genera tus QR', desc: 'Imprime los códigos QR personalizados para cada mesa de tu restaurante.' },
  { num: '04', title: 'Recibe pedidos', desc: 'Tus clientes ordenan desde su celular. Tú gestionas todo en tu dashboard en tiempo real.' },
];

const plans = [
  {
    name: 'Starter',
    price: 39,
    desc: 'Para restaurantes que inician su digitalización.',
    popular: false,
    features: [
      'Menú digital con fotos',
      'QR para hasta 10 mesas',
      'Pedidos online (dine-in + pickup)',
      'Notificaciones sonoras',
      'Imágenes con IA (5/mes)',
      '1 usuario administrador',
      'Soporte por email',
    ],
    excluded: ['Delivery', 'WhatsApp y email', 'Analytics avanzado', 'Promociones'],
    cta: 'Empezar gratis',
  },
  {
    name: 'Pro',
    price: 79,
    desc: 'Para restaurantes que quieren crecer.',
    popular: true,
    features: [
      'Todo lo de Starter',
      'Hasta 200 productos y 50 mesas',
      'Delivery + dirección de entrega',
      'Notificaciones WhatsApp y email',
      'Analytics avanzado',
      'Promociones y cupones',
      'Reseñas de clientes',
      'Equipo (3 usuarios)',
      'Imágenes IA (50/mes)',
      'Sin marca MENIUS',
      'Soporte prioritario (24h)',
    ],
    excluded: [],
    cta: 'Empezar con Pro',
  },
  {
    name: 'Business',
    price: 149,
    desc: 'Para cadenas y restaurantes grandes.',
    popular: false,
    features: [
      'Todo lo de Pro',
      'Productos, mesas y usuarios ilimitados',
      'Imágenes IA ilimitadas',
      'Analytics + exportar datos',
      'Dominio personalizado',
      'Onboarding personalizado',
      'Soporte dedicado por WhatsApp',
    ],
    excluded: [],
    cta: 'Contactar ventas',
  },
];

const faqs = [
  { q: '¿Necesito conocimientos técnicos?', a: 'No. MENIUS está diseñado para que cualquier persona pueda configurar su menú digital en minutos. Si sabes usar un celular, puedes usar MENIUS.' },
  { q: '¿Hay comisiones por pedido?', a: 'No cobramos ninguna comisión por pedido ni porcentaje de tus ventas. Pagas una tarifa mensual fija y listo. Todo lo que vendes es 100% tuyo.' },
  { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Tu menú funciona directamente en el navegador del celular. El cliente escanea el QR y ve tu menú al instante, sin descargas ni registros.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir o bajar de plan cuando quieras. Los cambios se aplican inmediatamente y se ajusta el cobro de forma proporcional.' },
  { q: '¿Cómo recibo los pedidos?', a: 'Los pedidos llegan en tiempo real a tu dashboard con sonido de alerta. También puedes recibir notificaciones por WhatsApp o email (Plan Pro+).' },
  { q: '¿Funciona para delivery y para comer en el restaurante?', a: 'Sí. Tus clientes pueden pedir desde el QR de la mesa (dine-in), hacer pickup, o pedir delivery con dirección de entrega (Plan Pro+).' },
  { q: '¿Puedo probar antes de pagar?', a: 'Claro. Todos los planes incluyen 14 días de prueba gratuita con todas las funciones. Sin tarjeta de crédito. Además, puedes explorar nuestros demos en vivo.' },
  { q: '¿Qué pasa después de los 14 días?', a: 'Elige el plan que prefieras y sigue operando sin interrupciones. Si no eliges un plan, tu cuenta se pausa — nunca pierdes tus datos.' },
];

const testimonials = [
  {
    name: 'María González',
    role: 'Taquería La Bendición — CDMX',
    text: 'Desde que usamos MENIUS, nuestros pedidos aumentaron un 35%. Los clientes aman poder ver las fotos y ordenar directo desde la mesa.',
    initials: 'MG',
  },
  {
    name: 'Carlos Ramírez',
    role: 'Restaurante El Sabor — Bogotá',
    text: 'El dashboard es increíble. Veo los pedidos en tiempo real y el analytics me ayuda a saber qué promover. Nos cambió la operación completamente.',
    initials: 'CR',
  },
  {
    name: 'Ana Martínez',
    role: 'Café Colonial — New York',
    text: 'Lo mejor: cero comisiones. Con apps de delivery perdíamos el 30%. Con MENIUS pagamos una tarifa fija y ahorramos más de $2,000 al mes.',
    initials: 'AM',
  },
];

/* ─── COMPONENT ─── */

export function LandingSections() {
  return (
    <LazyMotion features={domAnimation}>
      {/* ── How It Works ── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Fácil de configurar</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              En 4 pasos, tu restaurante digital
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Sin conocimientos técnicos. Sin contratos. Empieza a recibir pedidos hoy.</p>
          </FadeIn>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <StaggerItem key={step.num}>
                <div className="relative group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-5 group-hover:bg-brand-100 transition-colors duration-300">
                    <span className="text-sm font-extrabold text-brand-600">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funciones" className="py-24 md:py-32 bg-gray-50 dots-pattern">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Todo lo que necesitas</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              Una plataforma completa para tu restaurante
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Desde el menú digital hasta analytics avanzado. Todo integrado en un solo lugar.</p>
          </FadeIn>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <HoverCard className="h-full p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </HoverCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── For Whom ── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Para todo tipo de negocio</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              MENIUS se adapta a tu restaurante
            </h2>
          </FadeIn>
          <Stagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" staggerDelay={0.06}>
            {[
              { icon: '🌮', name: 'Taquerías' },
              { icon: '🍕', name: 'Pizzerías' },
              { icon: '☕', name: 'Cafeterías' },
              { icon: '🍔', name: 'Fast Food' },
              { icon: '🍣', name: 'Sushi Bars' },
              { icon: '🍽️', name: 'Restaurantes' },
              { icon: '🚚', name: 'Food Trucks' },
              { icon: '🍰', name: 'Panaderías' },
            ].map((item) => (
              <StaggerItem key={item.name}>
                <HoverCard className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-brand-50 hover:border-brand-100 transition-colors duration-300">
                  <span className="text-3xl mb-3 block">{item.icon}</span>
                  <p className="text-sm font-semibold text-gray-700">{item.name}</p>
                </HoverCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Demo Preview ── */}
      <section className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="relative rounded-3xl bg-brand-950 p-8 md:p-14 overflow-hidden glow-brand">
              <div className="absolute inset-0 mesh-gradient" />
              <div className="absolute inset-0 noise" />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 text-center md:text-left">
                  <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.15em] mb-4">Pruébalo ahora</p>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 font-heading leading-tight">
                    Explora nuestros demos interactivos
                  </h2>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Navega por un menú real con categorías, fotos, variantes, extras y carrito de compras.
                    Haz un pedido completo como lo harían tus clientes.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/r/demo" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-500 text-brand-950 font-bold text-sm shadow-xl shadow-brand-500/25 hover:bg-brand-400 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-950/50 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-950/60" />
                      </span>
                      Demo en Español
                    </Link>
                    <Link href="/r/buccaneer-diner" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl glass text-white font-semibold text-sm hover:bg-white/10 transition-all duration-300">
                      Demo in English
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>

                {/* Phone mockup */}
                <div className="flex-shrink-0 w-64 md:w-72">
                  <div className="relative mx-auto w-[220px] h-[440px] rounded-[2.5rem] border-[6px] border-gray-700/80 bg-gray-900 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-700/80 rounded-b-2xl z-10" />
                    <div className="h-full w-full bg-gray-50 p-2 pt-6 overflow-hidden">
                      <div className="bg-white rounded-2xl p-3 mb-2 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">LC</div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-800">La Cocina de MENIUS</p>
                            <p className="text-[8px] text-emerald-600 font-medium">● Abierto ahora</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-2 overflow-hidden">
                        <span className="flex-shrink-0 px-2 py-0.5 bg-brand-500 text-white text-[7px] font-bold rounded-full">Entradas</span>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-[7px] font-bold rounded-full">Fuertes</span>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-[7px] font-bold rounded-full">Postres</span>
                      </div>
                      {[
                        { name: 'Guacamole Fresco', price: '$8.99' },
                        { name: 'Tacos al Pastor', price: '$12.99' },
                        { name: 'Burger Clásica', price: '$14.99' },
                        { name: 'Pizza Margherita', price: '$16.99' },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center gap-2 bg-white rounded-xl p-2 mb-1.5 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-gray-800 truncate">{item.name}</p>
                            <p className="text-[9px] font-bold text-brand-600">{item.price}</p>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 bg-brand-500 rounded-xl p-2 text-center shadow-lg shadow-brand-500/25">
                        <p className="text-[9px] font-bold text-brand-950">🛒 Ver carrito · 3 items</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Ahorra miles de dólares</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              MENIUS vs Apps de Delivery
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Las apps cobran hasta 30% por pedido. Con MENIUS, tarifa fija mensual y el 100% de tus ventas es tuyo.</p>
          </FadeIn>

          <FadeIn delay={0.1}>
            {/* Desktop table */}
            <div className="hidden md:block rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 pl-6 pr-4 font-semibold text-gray-900 w-1/3"></th>
                    <th className="text-center py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-bold text-xs">
                        MENIUS
                      </span>
                    </th>
                    <th className="text-center py-4 px-4 pr-6 font-semibold text-gray-400 text-xs">Apps de Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Comisión por pedido', '0%', '15%–30%'],
                    ['Tarifa mensual', 'Desde $39/mes', 'Gratis (cobran por venta)'],
                    ['Control de clientes', 'Total — tus datos', 'La app se queda con los datos'],
                    ['Tu marca propia', 'Sí, dominio propio', 'Tu marca junto a la competencia'],
                    ['Menú personalizable', 'Fotos IA, extras, variantes', 'Limitado'],
                    ['Pedidos directos', 'Sí, sin intermediario', 'No'],
                    ['WhatsApp', 'Sí (Plan Pro+)', 'No'],
                    ['Analytics', 'Sí, completo', 'Básico o de pago'],
                  ].map(([feature, menius, other]) => (
                    <tr key={feature} className="border-b border-gray-100 last:border-0">
                      <td className="py-3.5 pl-6 pr-4 text-gray-700 font-medium">{feature}</td>
                      <td className="py-3.5 px-4 text-center text-brand-700 font-semibold bg-brand-50/30">{menius}</td>
                      <td className="py-3.5 px-4 pr-6 text-center text-gray-400">{other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {[
                ['Comisión por pedido', '0%', '15%–30%'],
                ['Tarifa mensual', 'Desde $39/mes', 'Gratis (cobran por venta)'],
                ['Control de clientes', 'Total — tus datos', 'La app se queda con los datos'],
                ['Tu marca propia', 'Sí, dominio propio', 'Tu marca junto a la competencia'],
                ['Menú personalizable', 'Fotos IA, extras, variantes', 'Limitado'],
                ['Pedidos directos', 'Sí, sin intermediario', 'No'],
                ['WhatsApp', 'Sí (Plan Pro+)', 'No'],
                ['Analytics', 'Sí, completo', 'Básico o de pago'],
              ].map(([feature, menius, other]) => (
                <div key={feature} className="rounded-xl bg-white border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{feature}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg bg-brand-50 border border-brand-100 px-3 py-2">
                      <p className="text-[10px] text-brand-600 font-semibold mb-0.5">MENIUS</p>
                      <p className="text-sm font-bold text-brand-800">{menius}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold mb-0.5">Delivery Apps</p>
                      <p className="text-sm text-gray-500">{other}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 bg-gradient-to-r from-brand-50 to-brand-50/50 rounded-2xl p-6 border border-brand-100">
              <p className="text-sm text-brand-800 leading-relaxed text-center">
                <strong>Ejemplo real:</strong> Un restaurante que vende $10,000/mes en delivery pierde{' '}
                <strong className="text-red-600">$3,000 en comisiones</strong> con apps. Con MENIUS Pro ($79/mes),
                ahorra <strong className="text-brand-700">$2,921/mes</strong> — casi{' '}
                <strong className="text-brand-700">$35,000 al año</strong>.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="py-20 md:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Ecosistema integrado</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 font-heading">
              Conectado con las herramientas que necesitas
            </h2>
          </FadeIn>
          <Stagger className="flex flex-wrap items-center justify-center gap-4 md:gap-6" staggerDelay={0.06}>
            {[
              { name: 'Stripe', desc: 'Pagos seguros', icon: '💳' },
              { name: 'WhatsApp', desc: 'Notificaciones', icon: '💬' },
              { name: 'Google AI', desc: 'Fotos con IA', icon: '✨' },
              { name: 'QR Code', desc: 'Mesas con QR', icon: '📱' },
              { name: 'Email', desc: 'Alertas de pedido', icon: '📧' },
              { name: 'PWA', desc: 'App sin descarga', icon: '📲' },
            ].map((int) => (
              <StaggerItem key={int.name}>
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <span className="text-xl">{int.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{int.name}</p>
                    <p className="text-[11px] text-gray-500">{int.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Precios transparentes</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              Sin comisiones. Sin sorpresas.
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Tarifa fija mensual. El 100% de tus ventas es tuyo. Cancela cuando quieras.</p>
          </FadeIn>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
            {plans.map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`relative h-full rounded-2xl p-7 flex flex-col ${
                    plan.popular
                      ? 'bg-brand-950 text-white ring-2 ring-brand-400 shadow-2xl glow-brand md:scale-[1.04]'
                      : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-brand-400 text-brand-950 text-[11px] font-bold rounded-full uppercase tracking-wider shadow-lg shadow-brand-400/25">
                      Más popular
                    </span>
                  )}
                  <h3 className={`text-lg font-bold font-heading ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-sm mt-1 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
                  <div className="mt-6 mb-7">
                    <span className={`text-4xl font-extrabold font-heading ${plan.popular ? 'text-white' : 'text-gray-900'}`}>${plan.price}</span>
                    <span className={`text-sm ml-1 ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>USD/mes</span>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-brand-400' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm leading-snug ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                    {plan.excluded?.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 opacity-35">
                        <svg className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className={`text-sm line-through ${plan.popular ? 'text-gray-500' : 'text-gray-400'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.name === 'Business' ? 'mailto:ventas@menius.app?subject=Plan%20Business' : `/signup?plan=${plan.name.toLowerCase()}`}
                    className={`mt-8 block text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 ${
                      plan.popular
                        ? 'bg-brand-400 text-brand-950 shadow-lg shadow-brand-400/25 hover:bg-brand-300'
                        : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <FadeIn delay={0.3} className="text-center mt-10">
            <p className="text-sm text-gray-400">
              14 días de prueba gratis con todas las funciones. Sin tarjeta de crédito.
            </p>
          </FadeIn>

          <FadeIn delay={0.35}>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-gray-200">
              {[
                { icon: '🔒', text: 'Pagos seguros con Stripe' },
                { icon: '🛡️', text: 'Datos encriptados (SSL/TLS)' },
                { icon: '✅', text: 'Sin comisiones por pedido' },
                { icon: '📋', text: 'CCPA & NY SHIELD compliant' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2">
                  <span className="text-base">{badge.icon}</span>
                  <span className="text-xs font-medium text-gray-500">{badge.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Setup add-on */}
          <FadeIn delay={0.4}>
            <Link
              href="/setup-profesional"
              className="mt-10 flex items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand-50 to-amber-50/50 border border-brand-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-brand-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">¿No tienes tiempo? Te lo configuramos nosotros</p>
                  <p className="text-xs text-gray-500 mt-0.5">Servicio de setup profesional + soporte prioritario desde <strong className="text-brand-700">$149</strong></p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Done-For-You Service ── */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Servicio profesional</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              ¿Prefieres que lo hagamos por ti?
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">
              Nuestro equipo configura todo tu menú digital, sube tus productos con fotos IA, y deja tu restaurante online listo para recibir pedidos.
            </p>
          </FadeIn>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
            {[
              {
                name: 'Setup Básico',
                price: 149,
                desc: 'Tu menú digital listo en 48 horas.',
                features: [
                  'Hasta 50 productos con categorías',
                  'Logo y colores de tu marca',
                  'Configuración de QR para mesas',
                  'Fotos con IA para todos los platos',
                  'Configuración de pagos',
                  '1 revisión incluida',
                ],
              },
              {
                name: 'Setup Premium',
                price: 349,
                desc: 'Todo optimizado para vender más.',
                popular: true,
                features: [
                  'Todo lo de Setup Básico',
                  'Hasta 150 productos',
                  'Descripciones optimizadas para venta',
                  'Dominio personalizado configurado',
                  'SEO básico (Google My Business)',
                  'Integración WhatsApp',
                  'Capacitación por video (30 min)',
                  '3 revisiones incluidas',
                ],
              },
              {
                name: 'Setup Enterprise',
                price: 699,
                desc: 'Experiencia concierge completa.',
                features: [
                  'Todo lo de Setup Premium',
                  'Productos ilimitados',
                  'SEO avanzado y meta tags',
                  'Diseño personalizado',
                  'Configuración de analytics',
                  'Capacitación 1-on-1 (1 hora)',
                  'Revisiones ilimitadas (30 días)',
                  'Soporte prioritario 60 días',
                ],
              },
            ].map((pkg) => (
              <StaggerItem key={pkg.name}>
                <div className={`relative h-full rounded-2xl p-7 flex flex-col ${
                  pkg.popular
                    ? 'bg-brand-950 text-white ring-2 ring-brand-400 shadow-2xl glow-brand'
                    : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300'
                }`}>
                  {pkg.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-brand-400 text-brand-950 text-[11px] font-bold rounded-full uppercase tracking-wider shadow-lg shadow-brand-400/25">
                      Recomendado
                    </span>
                  )}
                  <h3 className={`text-lg font-bold font-heading ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                  <p className={`text-sm mt-1 ${pkg.popular ? 'text-gray-400' : 'text-gray-500'}`}>{pkg.desc}</p>
                  <div className="mt-6 mb-7">
                    <span className={`text-4xl font-extrabold font-heading ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>${pkg.price}</span>
                    <span className={`text-sm ml-1 ${pkg.popular ? 'text-gray-400' : 'text-gray-500'}`}>USD único</span>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${pkg.popular ? 'text-brand-400' : 'text-brand-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm leading-snug ${pkg.popular ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/setup-profesional?plan=${pkg.name.toLowerCase().replace(' ', '-')}`}
                    className={`mt-8 block text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 ${
                      pkg.popular
                        ? 'bg-brand-400 text-brand-950 shadow-lg shadow-brand-400/25 hover:bg-brand-300'
                        : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    }`}
                  >
                    Solicitar setup
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Soporte mensual */}
          <FadeIn delay={0.3}>
            <div className="mt-14 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🛡️</span>
                      <h3 className="text-lg font-bold text-gray-900 font-heading">Soporte Prioritario Mensual</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Nos encargamos de las actualizaciones de tu menú, cambios de precios, nuevos productos, reportes y optimización continua. Tú enfócate en cocinar.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-gray-900 font-heading">$79</p>
                      <p className="text-xs text-gray-500">USD/mes</p>
                    </div>
                    <Link
                      href="/setup-profesional?plan=soporte-mensual"
                      className="px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors whitespace-nowrap"
                    >
                      Conocer más →
                    </Link>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Respuesta en <4 horas',
                    'Cambios ilimitados al menú',
                    'Soporte por WhatsApp',
                    'Reportes semanales',
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-gray-600">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Lo que dicen</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              Restaurantes que confían en MENIUS
            </h2>
          </FadeIn>

          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
            {testimonials.map((t) => (
              <StaggerItem key={t.name}>
                <div className="h-full p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-700">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 md:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] font-semibold text-brand-600 uppercase tracking-[0.15em] mb-3">Preguntas frecuentes</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 font-heading">
              ¿Tienes dudas? Aquí las resolvemos
            </h2>
          </FadeIn>

          <Stagger className="space-y-3" staggerDelay={0.06}>
            {faqs.map((faq, i) => (
              <StaggerItem key={i}>
                <details className="group rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden hover:border-brand-100 transition-colors duration-300">
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                    <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                    <span className="faq-icon text-brand-500 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </StaggerItem>
            ))}
          </Stagger>

          <FadeIn delay={0.3} className="text-center mt-10">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors duration-300"
            >
              Ver las {34} preguntas frecuentes
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="relative py-28 md:py-36 bg-brand-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-950 to-brand-900" />
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand-500/[0.08] rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 font-heading leading-tight">
              Digitaliza tu restaurante{' '}
              <span className="text-gradient">hoy mismo</span>
            </h2>
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed">
              Únete a los restaurantes que ya usan MENIUS para recibir más pedidos, ahorrar en comisiones, y ofrecer una experiencia digital premium a sus clientes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 text-brand-950 font-bold text-[15px] shadow-xl shadow-brand-500/25 hover:shadow-2xl hover:shadow-brand-500/30 hover:bg-brand-400 hover:-translate-y-0.5 transition-all duration-300"
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto group px-8 py-4 rounded-2xl glass text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Ver demo en vivo
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </LazyMotion>
  );
}
