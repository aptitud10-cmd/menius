import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — FAQ',
  description: 'Respuestas a las preguntas más comunes sobre MENIUS: configuración, precios, pedidos, pagos, integraciones, soporte y más.',
  alternates: { canonical: '/faq' },
};

/* ─── FAQ DATA ─── */

interface FaqCategory {
  id: string;
  title: string;
  icon: string;
  questions: { q: string; a: string }[];
}

const categories: FaqCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: '💡',
    questions: [
      {
        q: '¿Qué es MENIUS?',
        a: 'MENIUS es una plataforma SaaS que permite a restaurantes crear su propio menú digital con QR, recibir pedidos en tiempo real, gestionar su operación desde un dashboard, y aceptar pagos en línea. Todo sin comisiones por pedido.',
      },
      {
        q: '¿Necesito conocimientos técnicos para usar MENIUS?',
        a: 'No. MENIUS está diseñado para que cualquier persona pueda configurar su menú digital en minutos. Si sabes usar un celular, puedes usar MENIUS. Además, al crear tu cuenta se genera un menú de ejemplo para que veas cómo funciona todo.',
      },
      {
        q: '¿Mis clientes necesitan descargar una app?',
        a: 'No. Tu menú funciona directamente en el navegador del celular. El cliente escanea el código QR y ve tu menú al instante, sin descargar apps ni registrarse. Es una Progressive Web App (PWA) ultrarrápida.',
      },
      {
        q: '¿En qué países funciona MENIUS?',
        a: 'MENIUS funciona en cualquier país. La plataforma soporta múltiples monedas (USD, MXN, COP, PEN, EUR, etc.) y tu menú público puede estar en español o inglés. Los pagos online se procesan a través de Stripe, disponible en más de 40 países.',
      },
      {
        q: '¿MENIUS funciona para todo tipo de restaurante?',
        a: 'Sí. Funciona para taquerías, pizzerías, cafeterías, sushi bars, food trucks, panaderías, fast food, restaurantes de servicio completo, bares y más. Cualquier negocio de alimentos y bebidas puede usarlo.',
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
        q: '¿Puedo agregar fotos a mis productos?',
        a: 'Sí. Puedes subir tus propias fotos o usar nuestra inteligencia artificial (Google Gemini) para generar fotos profesionales de tus platillos automáticamente. Solo describe el platillo y la IA crea la imagen.',
      },
      {
        q: '¿Puedo agregar variantes y extras a mis productos?',
        a: 'Sí. Puedes agregar variantes (como tamaño: chico, mediano, grande) con diferencia de precio, y extras (como queso extra, tocino, etc.) con precio adicional. Tus clientes los seleccionan al agregar el producto al carrito.',
      },
      {
        q: '¿Puedo tener mi menú en inglés y español?',
        a: 'Sí. Cada restaurante puede configurar el idioma de su menú público (español o inglés) desde el dashboard. Esto cambia todos los textos de la interfaz del menú, el checkout y las confirmaciones.',
      },
      {
        q: '¿Cómo funcionan los códigos QR?',
        a: 'MENIUS genera un código QR único para cada mesa de tu restaurante. Los imprimes y los colocas en las mesas. Cuando un cliente escanea el QR, ve tu menú con la mesa ya seleccionada. También puedes compartir un enlace directo para pedidos de pickup o delivery.',
      },
      {
        q: '¿Puedo personalizar el diseño de mi menú?',
        a: 'Tu menú se genera automáticamente con un diseño profesional y optimizado para móvil. Incluye el nombre de tu restaurante, logo, categorías con navegación, fotos de productos, precios, y un carrito de compras integrado.',
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
        a: 'Los pedidos llegan en tiempo real a tu dashboard con un sonido de alerta. Ves un tablero Kanban donde puedes gestionar los pedidos: pendiente → preparando → listo → entregado. También puedes recibir notificaciones por WhatsApp y email (Plan Pro+).',
      },
      {
        q: '¿Funciona para dine-in, pickup y delivery?',
        a: 'Sí. Tú decides qué tipos de orden habilitar desde tu dashboard. Para dine-in, los clientes escanean el QR de la mesa. Para pickup, usan tu enlace directo. Para delivery (Plan Pro+), los clientes agregan su dirección de entrega.',
      },
      {
        q: '¿Los clientes pueden seguir el estado de su pedido?',
        a: 'Sí. Después de hacer un pedido, el cliente recibe una página de seguimiento en tiempo real donde ve el estado actualizado: pendiente, preparando, listo, entregado. La actualización es instantánea gracias a nuestra tecnología en tiempo real.',
      },
      {
        q: '¿Puedo recibir pedidos de múltiples mesas al mismo tiempo?',
        a: 'Sí. No hay límite en la cantidad de pedidos simultáneos. Cada pedido se identifica por mesa y llega a tu tablero en tiempo real. Tu equipo puede gestionar decenas de pedidos al mismo tiempo.',
      },
      {
        q: '¿Qué pasa si hay un problema con un pedido?',
        a: 'Desde el dashboard puedes ver los detalles de cada pedido, las notas del cliente, y cambiar el estado. Si necesitas contactar al cliente, puedes ver su nombre y los datos que proporcionó al hacer el pedido.',
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
        a: 'No. MENIUS no cobra ninguna comisión ni porcentaje por cada pedido o venta. Pagas una tarifa mensual fija según tu plan y listo. El 100% de lo que vendes es tuyo.',
      },
      {
        q: '¿Puedo probar MENIUS antes de pagar?',
        a: 'Sí. Todos los planes incluyen 14 días de prueba gratuita con acceso a todas las funciones. No necesitas tarjeta de crédito para empezar. Además, puedes explorar nuestros demos en vivo sin crear una cuenta.',
      },
      {
        q: '¿Qué pasa después de los 14 días de prueba?',
        a: 'Al terminar la prueba, eliges el plan que prefieras y continúas sin interrupciones. Si no eliges un plan, tu cuenta se pausa temporalmente — pero nunca pierdes tus datos, menú ni configuración. Puedes reactivar en cualquier momento.',
      },
      {
        q: '¿Puedo cambiar de plan en cualquier momento?',
        a: 'Sí. Puedes subir o bajar de plan cuando quieras desde tu dashboard. Los cambios se aplican inmediatamente y el cobro se ajusta de forma proporcional (prorrateado).',
      },
      {
        q: '¿Cómo se procesan los pagos de la suscripción?',
        a: 'Los pagos se procesan de forma segura a través de Stripe, la plataforma de pagos utilizada por empresas como Google, Amazon y Shopify. Aceptamos todas las tarjetas de crédito y débito principales.',
      },
      {
        q: '¿Puedo cancelar en cualquier momento?',
        a: 'Sí. No hay contratos ni penalidades. Puedes cancelar tu suscripción en cualquier momento desde tu dashboard o el portal de facturación. Tu cuenta permanecerá activa hasta el final del período ya pagado.',
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
        a: 'Sí. Puedes habilitar pagos en línea a través de Stripe. Tus clientes pagan con tarjeta de crédito o débito directamente desde el menú. El dinero se deposita en tu cuenta bancaria.',
      },
      {
        q: '¿También puedo aceptar pagos en efectivo?',
        a: 'Sí. Puedes habilitar ambas opciones: pago en efectivo y pago en línea. Tus clientes eligen cómo quieren pagar al hacer su pedido. Tú decides qué métodos ofrecer.',
      },
      {
        q: '¿Stripe cobra comisión por transacción?',
        a: 'Stripe cobra su tarifa estándar por procesamiento de pagos (generalmente 2.9% + $0.30 USD por transacción en EE.UU.). Esta es la tarifa de Stripe, no de MENIUS. MENIUS no agrega ningún cargo adicional sobre las transacciones.',
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
        a: 'Sí. En el Plan Pro y Business, puedes recibir notificaciones de nuevos pedidos directamente a tu WhatsApp Business. Solo configura tu número en el dashboard y recibirás alertas instantáneas.',
      },
      {
        q: '¿Puedo usar MENIUS como app en mi celular?',
        a: 'Sí. MENIUS es una Progressive Web App (PWA). Puedes "instalarla" en tu celular desde el navegador sin pasar por la App Store. Funciona como una app nativa con acceso rápido desde tu pantalla de inicio.',
      },
      {
        q: '¿Funciona sin internet?',
        a: 'La funcionalidad principal requiere conexión a internet para procesar pedidos en tiempo real. Sin embargo, la PWA tiene soporte offline básico: si pierdes conexión momentáneamente, la interfaz sigue disponible y se reconecta automáticamente.',
      },
      {
        q: '¿Qué es la generación de imágenes con IA?',
        a: 'MENIUS incluye inteligencia artificial (Google Gemini) que genera fotos profesionales de tus platillos. Describes el platillo (ej: "tacos al pastor con piña y cilantro") y la IA crea una imagen realista y atractiva en segundos. Perfecto si no tienes fotos profesionales.',
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
        a: 'Sí. Toda la comunicación está encriptada con SSL/TLS. Los pagos se procesan a través de Stripe (certificado PCI DSS). Los datos se almacenan en Supabase con Row-Level Security. Implementamos headers de seguridad (HSTS, CSP), sanitización de inputs, y rate limiting.',
      },
      {
        q: '¿Qué datos recopilan de mis clientes?',
        a: 'Solo recopilamos la información necesaria para procesar pedidos: nombre del cliente, artículos ordenados, y opcionalmente email y dirección de entrega. No usamos cookies de rastreo ni publicidad. Puedes leer nuestra Política de Privacidad completa para más detalles.',
      },
      {
        q: '¿Cumplen con regulaciones de privacidad?',
        a: 'Sí. MENIUS cumple con CCPA (California Consumer Privacy Act) y NY SHIELD Act. No vendemos ni compartimos datos personales con terceros para marketing. Solo compartimos datos con proveedores esenciales (Stripe para pagos, Supabase para base de datos).',
      },
    ],
  },
  {
    id: 'soporte',
    title: 'Soporte',
    icon: '🤝',
    questions: [
      {
        q: '¿Qué tipo de soporte ofrecen?',
        a: 'Todos los planes incluyen acceso a nuestro chat en vivo, esta documentación y FAQ. Plan Starter: soporte por email. Plan Pro: soporte prioritario con respuesta en 24 horas. Plan Business: soporte dedicado por WhatsApp con onboarding personalizado.',
      },
      {
        q: '¿Puedo solicitar una demostración personalizada?',
        a: 'Sí. Si estás interesado en el Plan Business o tienes preguntas específicas, puedes contactarnos a ventas@menius.app para agendar una demostración personalizada donde te mostramos la plataforma en detalle.',
      },
    ],
  },
];

/* ─── PAGE ─── */

export default function FaqPage() {
  const totalQuestions = categories.reduce((acc, cat) => acc + cat.questions.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-brand-950/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight font-heading">
            <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors duration-300 hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="text-[13px] font-semibold px-5 py-2.5 rounded-xl bg-brand-500 text-brand-950 hover:bg-brand-400 transition-all duration-300 shadow-lg shadow-brand-500/20">
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-brand-950 pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute inset-0 noise" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-[13px] font-semibold text-brand-400 uppercase tracking-[0.15em] mb-4">Centro de Ayuda</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white font-heading mb-5">
            Preguntas Frecuentes
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
            {totalQuestions} respuestas a las preguntas más comunes de dueños de restaurantes sobre MENIUS.
          </p>
        </div>
      </section>

      {/* Category nav */}
      <section className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide -mx-2 px-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-brand-700 hover:bg-brand-50 transition-colors duration-200"
              >
                <span className="text-base">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* FAQ Content */}
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-20">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.id} className="mb-14 last:mb-0 scroll-mt-36">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 font-heading">{cat.title}</h2>
              <span className="ml-auto px-2.5 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                {cat.questions.length}
              </span>
            </div>

            <div className="space-y-3">
              {cat.questions.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden hover:border-brand-100 transition-colors duration-300"
                >
                  <summary className="flex items-center justify-between px-6 py-5 cursor-pointer">
                    <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                    <span className="faq-icon text-brand-500 text-xl font-light transition-transform duration-200 flex-shrink-0">+</span>
                  </summary>
                  <div className="faq-answer px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="mt-20 text-center rounded-2xl bg-brand-950 p-10 md:p-14 relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient" />
          <div className="absolute inset-0 noise" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white font-heading mb-4">
              ¿No encontraste tu respuesta?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              Usa el chat en vivo (esquina inferior derecha) o escríbenos a soporte@menius.app. Respondemos en menos de 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:soporte@menius.app"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand-500 text-brand-950 font-bold text-sm shadow-xl shadow-brand-500/25 hover:bg-brand-400 transition-all duration-300"
              >
                Enviar email
              </a>
              <Link
                href="/r/demo"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl glass text-white font-semibold text-sm hover:bg-white/10 transition-all duration-300"
              >
                Explorar el demo
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-950 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight font-heading">
              <span className="text-brand-400">MEN</span><span className="text-white">IUS</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Términos</Link>
              <Link href="/cookies" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cookies</Link>
            </div>
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} MENIUS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
