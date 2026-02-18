import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — FAQ | MENIUS',
  description: 'Respuestas a las preguntas más comunes sobre MENIUS: configuración, precios, pedidos, pagos, integraciones, soporte, seguridad y más.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — MENIUS',
    description: 'Todo lo que necesitas saber sobre menús digitales, pedidos online y pagos con MENIUS.',
    type: 'website',
  },
};

interface FaqCategory {
  id: string;
  title: string;
  icon: string;
  questions: { q: string; a: ReactNode }[];
}

const lnk = 'text-purple-400 hover:text-purple-300 transition-colors';

const categories: FaqCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: '💡',
    questions: [
      {
        q: '¿Qué es MENIUS?',
        a: 'MENIUS es una plataforma SaaS que permite a restaurantes crear su propio menú digital con QR, recibir pedidos en tiempo real, gestionar su operación desde un dashboard intuitivo, y aceptar pagos en línea con Stripe. Todo por una tarifa mensual fija, sin comisiones por pedido.',
      },
      {
        q: '¿Necesito conocimientos técnicos para usar MENIUS?',
        a: 'No. MENIUS está diseñado para que cualquier persona pueda configurar su menú digital en minutos. Si sabes usar un celular, puedes usar MENIUS. Al crear tu cuenta se genera automáticamente un menú de ejemplo completo con categorías, productos y mesas para que empieces rápidamente.',
      },
      {
        q: '¿Mis clientes necesitan descargar una app?',
        a: 'No. Tu menú funciona directamente en el navegador del celular. El cliente escanea el código QR y ve tu menú al instante, sin descargar nada ni registrarse. Es una Progressive Web App (PWA) ultrarrápida optimizada para móvil.',
      },
      {
        q: '¿En qué países funciona MENIUS?',
        a: 'MENIUS funciona en cualquier país del mundo. La plataforma soporta múltiples monedas (USD, MXN, COP, PEN, EUR, ARS, CLP y más) y tu menú puede estar en español o inglés. Los pagos online se procesan a través de Stripe, disponible en más de 46 países.',
      },
      {
        q: '¿MENIUS funciona para todo tipo de restaurante?',
        a: 'Sí. Funciona para taquerías, pizzerías, cafeterías, sushi bars, food trucks, panaderías, heladerías, bares, restaurantes de servicio completo, cocinas fantasma (dark kitchens), catering y cualquier negocio de alimentos y bebidas.',
      },
      {
        q: '¿Puedo ver un demo antes de registrarme?',
        a: <>Sí. Tenemos demos en vivo disponibles sin necesidad de crear cuenta. Puedes explorar un restaurante de ejemplo completo con menú, carrito, checkout y seguimiento de pedido. <Link href="/r/demo" className={lnk}>Ver demo en vivo →</Link></>,
      },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración y Menú',
    icon: '⚙️',
    questions: [
      {
        q: '¿Cuánto tiempo toma configurar mi menú?',
        a: 'La configuración básica toma entre 15 y 30 minutos. Al crear tu restaurante, se genera un menú de ejemplo con categorías, productos y mesas que puedes editar. Solo necesitas reemplazar los datos de ejemplo con los tuyos.',
      },
      {
        q: '¿Puedo importar mi menú existente con IA?',
        a: 'Sí. MENIUS incluye una función de importación inteligente con IA. Puedes tomar una foto de tu menú impreso (carta, pizarra, PDF) y nuestra inteligencia artificial extrae automáticamente los nombres de platillos, descripciones y precios. Solo revisas, ajustas si es necesario, y listo.',
      },
      {
        q: '¿Puedo agregar fotos a mis productos?',
        a: 'Sí. Puedes subir tus propias fotos o usar nuestra inteligencia artificial (Google Gemini) para generar fotos profesionales de tus platillos automáticamente. Solo describe el platillo y la IA crea la imagen en segundos. Perfecto si no tienes fotógrafo profesional.',
      },
      {
        q: '¿Puedo agregar variantes y extras a mis productos?',
        a: 'Sí. Puedes agregar variantes (como tamaño: chico, mediano, grande) con diferencia de precio, y extras (como queso extra, tocino, aguacate) con precio adicional. Tus clientes los seleccionan al agregar el producto al carrito, igual que en las mejores apps de delivery.',
      },
      {
        q: '¿Puedo tener mi menú en inglés y español?',
        a: 'Sí. Cada restaurante puede configurar el idioma de su menú público (español o inglés) desde el dashboard. Esto cambia todos los textos de la interfaz del menú, el checkout, las confirmaciones y las notificaciones.',
      },
      {
        q: '¿Cómo funcionan los códigos QR?',
        a: 'MENIUS genera un código QR único para cada mesa de tu restaurante. Los imprimes y los colocas en las mesas. Cuando un cliente escanea el QR, ve tu menú con la mesa ya seleccionada automáticamente. También puedes compartir un enlace directo para pedidos de pickup o delivery.',
      },
      {
        q: '¿Puedo personalizar el diseño de mi menú?',
        a: 'Tu menú se genera automáticamente con un diseño profesional y optimizado para móvil. Incluye el nombre de tu restaurante, logo, categorías con navegación, fotos de productos, precios, y un carrito de compras integrado. Todo responsivo y rápido.',
      },
      {
        q: '¿Puedo conectar un dominio personalizado?',
        a: 'Sí. En los planes Pro y Business puedes conectar tu propio dominio (ej: menu.turestaurante.com) para que tus clientes accedan al menú con tu marca. La configuración es sencilla y viene con certificado SSL incluido.',
      },
    ],
  },
  {
    id: 'pedidos',
    title: 'Pedidos y Operación',
    icon: '🛒',
    questions: [
      {
        q: '¿Cómo recibo los pedidos?',
        a: 'Los pedidos llegan en tiempo real a tu dashboard con un sonido de alerta. Ves un tablero Kanban donde puedes gestionar los pedidos: pendiente → preparando → listo → entregado. También puedes recibir notificaciones por WhatsApp y email en los planes Pro y Business.',
      },
      {
        q: '¿Funciona para dine-in, pickup y delivery?',
        a: 'Sí. Tú decides qué tipos de orden habilitar desde tu dashboard. Para dine-in, los clientes escanean el QR de la mesa. Para pickup, usan tu enlace directo. Para delivery, los clientes agregan su dirección de entrega al hacer el pedido.',
      },
      {
        q: '¿Los clientes pueden seguir el estado de su pedido?',
        a: 'Sí. Después de hacer un pedido, el cliente recibe una página de seguimiento en tiempo real donde ve el estado actualizado: pendiente, preparando, listo, entregado. La actualización es instantánea, sin necesidad de recargar la página.',
      },
      {
        q: '¿Puedo recibir pedidos de múltiples mesas al mismo tiempo?',
        a: 'Sí. No hay límite en la cantidad de pedidos simultáneos. Cada pedido se identifica por mesa y llega a tu tablero en tiempo real. Tu equipo puede gestionar decenas de pedidos al mismo tiempo sin problemas.',
      },
      {
        q: '¿Puedo pausar la recepción de pedidos?',
        a: 'Sí. Desde el dashboard puedes desactivar temporalmente la recepción de pedidos (por ejemplo, cuando tu cocina está saturada o fuera de horario). Tus clientes verán un aviso de que el restaurante no está aceptando pedidos en ese momento.',
      },
      {
        q: '¿El dashboard incluye analytics y reportes?',
        a: 'Sí. El dashboard incluye métricas de pedidos, productos más vendidos, ingresos por período, y datos de rendimiento de tu restaurante. Puedes usar esta información para tomar decisiones informadas sobre tu menú y operación.',
      },
      {
        q: '¿Qué pasa si hay un problema con un pedido?',
        a: 'Desde el dashboard puedes ver los detalles completos de cada pedido, las notas del cliente, y cambiar el estado manualmente. Si necesitas contactar al cliente, puedes ver su nombre y los datos que proporcionó al hacer el pedido.',
      },
    ],
  },
  {
    id: 'precios',
    title: 'Precios y Facturación',
    icon: '💰',
    questions: [
      {
        q: '¿Hay comisiones por pedido?',
        a: 'No. MENIUS no cobra ninguna comisión ni porcentaje por cada pedido o venta. Pagas una tarifa mensual fija según tu plan y listo. El 100% de lo que vendes es tuyo (menos la tarifa estándar de Stripe si usas pagos online).',
      },
      {
        q: '¿Puedo probar MENIUS antes de pagar?',
        a: <>Sí. Todos los planes incluyen 14 días de prueba gratuita con acceso a todas las funciones. No necesitas tarjeta de crédito para empezar. También puedes explorar nuestros <Link href="/r/demo" className={lnk}>demos en vivo</Link> sin crear una cuenta.</>,
      },
      {
        q: '¿Qué pasa después de los 14 días de prueba?',
        a: 'Al terminar la prueba, eliges el plan que prefieras y continúas sin interrupciones. Si no eliges un plan, tu cuenta se pausa temporalmente, pero nunca pierdes tus datos, menú ni configuración. Puedes reactivar en cualquier momento.',
      },
      {
        q: '¿Cuáles son los planes disponibles?',
        a: <>Ofrecemos tres planes: Starter ($39/mes) ideal para restaurantes pequeños con funciones esenciales; Pro ($79/mes) con IA, pagos online, dominio personalizado y WhatsApp; y Business ($149/mes) con soporte dedicado, múltiples ubicaciones y onboarding personalizado. Todos sin comisiones por pedido. <Link href="/#precios" className={lnk}>Ver planes y precios →</Link></>,
      },
      {
        q: '¿Puedo cambiar de plan en cualquier momento?',
        a: 'Sí. Puedes subir o bajar de plan cuando quieras desde tu dashboard. Los cambios se aplican inmediatamente y el cobro se ajusta de forma proporcional (prorrateado). Sin penalidades ni contratos.',
      },
      {
        q: '¿Cómo se procesan los pagos de la suscripción?',
        a: 'Los pagos se procesan de forma segura a través de Stripe, la plataforma de pagos utilizada por empresas como Google, Amazon y Shopify. Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express).',
      },
      {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Sí. No hay contratos a largo plazo ni penalidades por cancelación. Puedes cancelar tu suscripción en cualquier momento desde tu dashboard o el portal de facturación de Stripe. Tu cuenta permanecerá activa hasta el final del período ya pagado.',
      },
    ],
  },
  {
    id: 'pagos-clientes',
    title: 'Pagos de Clientes',
    icon: '💳',
    questions: [
      {
        q: '¿Mis clientes pueden pagar en línea?',
        a: 'Sí. Puedes habilitar pagos en línea a través de Stripe. Tus clientes pagan con tarjeta de crédito o débito directamente desde el menú. El dinero se deposita automáticamente en tu cuenta bancaria según el calendario de Stripe.',
      },
      {
        q: '¿También puedo aceptar pagos en efectivo?',
        a: 'Sí. Puedes habilitar ambas opciones: pago en efectivo y pago en línea. Tus clientes eligen cómo quieren pagar al hacer su pedido. Tú decides qué métodos de pago ofrecer según las necesidades de tu negocio.',
      },
      {
        q: '¿Stripe cobra comisión por transacción?',
        a: 'Stripe cobra su tarifa estándar por procesamiento de pagos (generalmente 2.9% + $0.30 USD por transacción en EE.UU., varía por país). Esta es la tarifa de Stripe, no de MENIUS. MENIUS no agrega ningún cargo adicional sobre las transacciones.',
      },
      {
        q: '¿Es seguro el proceso de pago para mis clientes?',
        a: 'Absolutamente. Stripe cuenta con certificación PCI DSS Nivel 1, el estándar más alto de seguridad en la industria de pagos. Los datos de tarjeta nunca pasan por nuestros servidores — son procesados directamente por Stripe con encriptación de extremo a extremo.',
      },
    ],
  },
  {
    id: 'integraciones',
    title: 'Integraciones y Tecnología',
    icon: '🔗',
    questions: [
      {
        q: '¿MENIUS se integra con WhatsApp?',
        a: 'Sí. En el Plan Pro y Business, puedes recibir notificaciones de nuevos pedidos directamente en tu WhatsApp Business. Solo configura tu número en el dashboard y recibirás alertas instantáneas cada vez que entre un pedido.',
      },
      {
        q: '¿Puedo usar MENIUS como app en mi celular?',
        a: 'Sí. MENIUS es una Progressive Web App (PWA). Puedes "instalarla" en tu celular desde el navegador sin pasar por la App Store o Google Play. Funciona como una app nativa con acceso rápido desde tu pantalla de inicio.',
      },
      {
        q: '¿Funciona sin internet?',
        a: 'La funcionalidad principal requiere conexión a internet para procesar pedidos en tiempo real. Sin embargo, la PWA tiene soporte offline básico: si pierdes conexión momentáneamente, la interfaz sigue disponible y se reconecta automáticamente cuando vuelve la señal.',
      },
      {
        q: '¿Qué es la generación de imágenes con IA?',
        a: 'MENIUS incluye inteligencia artificial (Google Gemini) que genera fotos profesionales de tus platillos. Describes el platillo (ej: "tacos al pastor con piña y cilantro en plato de barro") y la IA crea una imagen realista y atractiva en segundos. Ideal para restaurantes que no tienen fotos profesionales.',
      },
      {
        q: '¿Puedo gestionar múltiples ubicaciones?',
        a: 'Sí. El Plan Business permite gestionar varias sucursales desde una sola cuenta. Cada ubicación tiene su propio menú, QR, configuración y pedidos, pero puedes supervisar todo desde un dashboard centralizado.',
      },
      {
        q: '¿Qué tecnologías usa MENIUS?',
        a: 'MENIUS está construido con tecnología de última generación: Next.js (React) para el frontend, Supabase (PostgreSQL) para la base de datos con actualizaciones en tiempo real, Stripe para pagos seguros, y Google Gemini para funciones de inteligencia artificial. Todo alojado en infraestructura global para máxima velocidad.',
      },
    ],
  },
  {
    id: 'seguridad',
    title: 'Seguridad y Privacidad',
    icon: '🔒',
    questions: [
      {
        q: '¿Es seguro MENIUS?',
        a: 'Sí. Toda la comunicación está encriptada con SSL/TLS. Los pagos se procesan a través de Stripe (certificado PCI DSS Nivel 1). Los datos se almacenan en Supabase con Row-Level Security (RLS), lo que significa que cada restaurante solo puede ver sus propios datos. Implementamos headers de seguridad (HSTS, CSP), sanitización de inputs, y rate limiting.',
      },
      {
        q: '¿Qué datos recopilan de mis clientes?',
        a: <>Solo recopilamos la información estrictamente necesaria para procesar pedidos: nombre del cliente, artículos ordenados, y opcionalmente email y dirección de entrega. No usamos cookies de rastreo ni publicidad de terceros. Puedes leer nuestra <Link href="/privacy" className={lnk}>Política de Privacidad</Link> completa para más detalles.</>,
      },
      {
        q: '¿Cumplen con regulaciones de privacidad?',
        a: 'Sí. MENIUS cumple con CCPA (California Consumer Privacy Act) y NY SHIELD Act. No vendemos ni compartimos datos personales con terceros para marketing. Solo compartimos datos con proveedores esenciales del servicio (Stripe para pagos, Supabase para base de datos, Resend para emails transaccionales).',
      },
      {
        q: '¿Mis datos están respaldados?',
        a: 'Sí. La base de datos tiene respaldos automáticos diarios gestionados por Supabase. Tu menú, productos, configuración y historial de pedidos están protegidos. Además, tu cuenta nunca se elimina aunque canceles tu suscripción — siempre puedes reactivar y recuperar todo.',
      },
    ],
  },
  {
    id: 'soporte',
    title: 'Soporte y Ayuda',
    icon: '🤝',
    questions: [
      {
        q: '¿Qué tipo de soporte ofrecen?',
        a: 'El nivel de soporte depende del plan. Plan Starter: soporte por email con respuesta en 48 horas hábiles. Plan Pro: soporte prioritario por email con respuesta en 24 horas. Plan Business: soporte dedicado por WhatsApp, onboarding personalizado y sesiones de configuración asistida.',
      },
      {
        q: '¿Ofrecen servicio de configuración profesional?',
        a: <>Sí. Para restaurantes que prefieren no configurar nada por su cuenta, ofrecemos un servicio de Setup Profesional. Nuestro equipo configura tu menú completo, sube tus productos con fotos, configura métodos de pago, genera los códigos QR y te entrega todo funcionando. <Link href="/setup-profesional" className={lnk}>Más información sobre Setup Profesional →</Link></>,
      },
      {
        q: '¿Puedo solicitar una demostración personalizada?',
        a: <>Sí. Si estás interesado en el Plan Business o tienes preguntas específicas sobre cómo MENIUS se adapta a tu restaurante, puedes contactarnos a <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a> para agendar una demostración personalizada.</>,
      },
      {
        q: '¿Tienen tutoriales o guías?',
        a: <>Sí. Nuestro <Link href="/blog" className={lnk}>blog</Link> contiene guías detalladas, tutoriales paso a paso y artículos sobre cómo aprovechar al máximo MENIUS: desde cómo crear tu menú digital hasta estrategias para aumentar ventas, fotos con IA, y tendencias del sector. Nuevos artículos se publican regularmente.</>,
      },
      {
        q: '¿Cómo reporto un error o sugiero una mejora?',
        a: <>Puedes reportar errores o enviar sugerencias directamente a <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a>. Leemos y respondemos todos los mensajes. Las sugerencias de mejora se evalúan y las más solicitadas se incorporan en futuras actualizaciones de la plataforma.</>,
      },
    ],
  },
];

export default function FaqPage() {
  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <div className="min-h-screen landing-bg overflow-x-hidden relative noise-overlay">
      <LandingNav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="section-glow section-glow-purple" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm text-purple-400 uppercase tracking-[0.2em] font-medium mb-5">Centro de Ayuda</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight mb-5">
            Preguntas Frecuentes
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto font-light">
            {totalQuestions} respuestas a las preguntas más comunes de dueños de restaurantes sobre MENIUS.
          </p>
        </div>
      </section>

      {/* Category nav */}
      <section className="sticky top-16 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide -mx-2 px-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors duration-200"
              >
                <span className="text-base">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* FAQ Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16 md:py-20">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.id} className="mb-14 last:mb-0 scroll-mt-36">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="text-xl md:text-2xl font-semibold text-white">{cat.title}</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-gray-500">
                {cat.questions.length}
              </span>
            </div>

            <div className="space-y-3">
              {cat.questions.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-purple-500/20 transition-colors duration-300"
                >
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                    <span className="text-[15px] font-medium text-gray-200 pr-4">{faq.q}</span>
                    <span className="faq-icon text-purple-400 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="mt-20 relative text-center rounded-2xl overflow-hidden p-10 md:p-14">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              ¿No encontraste tu respuesta?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed font-light">
              Escríbenos y nuestro equipo te responderá lo antes posible.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:soporte@menius.app"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-medium text-[15px] hover:bg-gray-100 transition-all btn-glow"
              >
                soporte@menius.app
              </a>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-medium text-[15px] hover:text-white hover:border-white/20 transition-all"
              >
                Explorar el demo
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-black overflow-hidden">
        <div className="separator-gradient max-w-5xl mx-auto" />
        <div className="relative z-10 bg-black pt-10 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="text-lg font-bold tracking-tight text-white">MENIUS</Link>
                <p className="text-[13px] text-gray-600 mt-4 leading-relaxed max-w-[200px]">Menús digitales y pedidos en línea para restaurantes.</p>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Producto</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/#funciones" className="text-[13px] text-gray-600 hover:text-white transition-colors">Funciones</Link></li>
                  <li><Link href="/#precios" className="text-[13px] text-gray-600 hover:text-white transition-colors">Precios</Link></li>
                  <li><Link href="/r/demo" className="text-[13px] text-gray-600 hover:text-white transition-colors">Demo en vivo</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Recursos</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/blog" className="text-[13px] text-gray-600 hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/faq" className="text-[13px] text-gray-600 hover:text-white transition-colors">FAQ</Link></li>
                  <li><a href="mailto:soporte@menius.app" className="text-[13px] text-gray-600 hover:text-white transition-colors">Soporte</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-[0.15em] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/privacy" className="text-[13px] text-gray-600 hover:text-white transition-colors">Privacidad</Link></li>
                  <li><Link href="/terms" className="text-[13px] text-gray-600 hover:text-white transition-colors">Términos</Link></li>
                  <li><Link href="/cookies" className="text-[13px] text-gray-600 hover:text-white transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
            <div className="separator-gradient mt-12" />
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-gray-700" suppressHydrationWarning>&copy; {new Date().getFullYear()} MENIUS Inc.</p>
              <p className="text-[11px] text-gray-700">
                Hecho en{' '}
                <a href="https://www.scuart.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">Scuart Digital</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
