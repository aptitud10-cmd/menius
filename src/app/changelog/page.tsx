import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('menius_locale')?.value ?? 'es';
  return {
    title: 'Changelog — MENIUS',
    description: locale === 'en'
      ? 'Every update, improvement and new feature in MENIUS. See how your platform evolves.'
      : 'Cada actualización, mejora y nueva función de MENIUS. Mira cómo evoluciona tu plataforma.',
    alternates: { canonical: 'https://menius.app/changelog' },
    robots: { index: true, follow: true },
  };
}

type Locale = 'es' | 'en';

interface Change { type: 'new' | 'improved' | 'fixed'; es: string; en: string; }
interface Release {
  version: string;
  dateEs: string;
  dateEn: string;
  badgeEs: string;
  badgeEn: string;
  badgeColor: string;
  highlightsEs: string[];
  highlightsEn: string[];
  changes: Change[];
}

const releases: Release[] = [
  {
    version: '2.6',
    dateEs: 'Marzo 2026',
    dateEn: 'March 2026',
    badgeEs: 'Nuevo',
    badgeEn: 'New',
    badgeColor: 'bg-emerald-500',
    highlightsEs: ['Counter POS manual', 'Inventario con alertas', 'Programa de Lealtad', 'API Keys', 'Sucursales', 'Analytics heatmap'],
    highlightsEn: ['Counter manual POS', 'Inventory with alerts', 'Loyalty Program', 'API Keys', 'Multi-location branches', 'Analytics heatmap'],
    changes: [
      { type: 'new', es: 'Counter POS: crea pedidos manuales (llamadas telefónicas, pedidos en persona) directamente desde el Counter con búsqueda de productos, tipo de orden y datos del cliente.', en: 'Counter POS: create manual orders (phone calls, walk-ins) directly from the Counter with product search, order type, and customer info.' },
      { type: 'new', es: 'Inventario: control de stock por producto con cantidades, umbral de alerta y descuento automático al recibir pedidos. Accesible desde Menú > Inventario en el dashboard.', en: 'Inventory: per-product stock control with quantities, low-stock threshold alerts, and automatic decrement on order. Accessible from Menu > Inventory in the dashboard.' },
      { type: 'new', es: 'Programa de Lealtad: sistema de puntos por compra configurable — define puntos por peso/dólar, mínimo de canje y gestiona los puntos de cada cliente desde el dashboard.', en: 'Loyalty Program: configurable points-per-purchase system — define points per dollar, minimum redemption, and manage each customer\'s points from the dashboard.' },
      { type: 'new', es: 'API Keys: genera llaves de acceso SHA-256 para integrar MENIUS con sistemas externos. Disponible en Plan Business desde Configuración > API Keys.', en: 'API Keys: generate SHA-256 access keys to integrate MENIUS with external systems. Available on the Business Plan from Settings > API Keys.' },
      { type: 'new', es: 'Sucursales: gestiona múltiples ubicaciones bajo el mismo negocio desde un dashboard centralizado. Cada sucursal tiene su propio menú, URL y pedidos. Disponible en Plan Business.', en: 'Branches: manage multiple locations under the same business from a centralized dashboard. Each branch has its own menu, URL, and orders. Available on the Business Plan.' },
      { type: 'improved', es: 'Analytics: nuevo heatmap de actividad semanal (hora × día), embudo de conversión y desglose por tipo de orden (dine-in, pickup, delivery).', en: 'Analytics: new weekly activity heatmap (hour × day), conversion funnel, and order type breakdown (dine-in, pickup, delivery).' },
      { type: 'improved', es: 'Menú mobile: grid de 2 columnas (antes 1 columna) — ves el doble de productos por pantalla. Tarjetas verticales estilo Uber Eats con imagen arriba. Pills de categoría más compactas.', en: 'Mobile menu: 2-column grid (previously 1 column) — twice as many products visible per screen. Vertical Uber Eats-style cards with image on top. More compact category pills.' },
      { type: 'improved', es: 'Carrito mobile: sugerencias "También te puede gustar" basadas en productos destacados no agregados aún al carrito.', en: 'Mobile cart: "You may also like" suggestions based on featured products not yet in the cart.' },
      { type: 'improved', es: 'FAQ: filtrado por categoría sin scroll — al hacer clic en una categoría solo aparecen sus preguntas. Diseño más compacto y navegable.', en: 'FAQ: category filtering without scroll — clicking a category only shows its questions. More compact and navigable design.' },
      { type: 'improved', es: 'WhatsApp bot: sesiones migradas de memoria a Redis (Upstash) para mayor estabilidad en producción.', en: 'WhatsApp bot: sessions migrated from memory to Redis (Upstash) for improved production stability.' },
      { type: 'fixed', es: 'Menú mobile: desplazamiento horizontal al navegar a categorías con nombres largos (ej. "Postres") resuelto.', en: 'Mobile menu: horizontal shift when navigating to categories with long names (e.g., "Desserts") resolved.' },
      { type: 'fixed', es: 'Routes de debug (/api/debug/menu, /api/debug/products) eliminadas de producción para mayor seguridad.', en: 'Debug routes (/api/debug/menu, /api/debug/products) removed from production for improved security.' },
    ],
  },
  {
    version: '2.5',
    dateEs: 'Marzo 2026',
    dateEn: 'March 2026',
    badgeEs: 'Nuevo',
    badgeEn: 'New',
    badgeColor: 'bg-emerald-500',
    highlightsEs: ['Plan gratuito con 3 pedidos/día', 'SEO mejorado para menús públicos', 'Rendimiento 40% más rápido'],
    highlightsEn: ['Free plan with 3 orders/day', 'Improved SEO for public menus', '40% faster menu load'],
    changes: [
      { type: 'new', es: 'Plan gratuito permanente: menús activos con hasta 3 pedidos por día sin suscripción.', en: 'Permanent free plan: active menus with up to 3 orders per day, no subscription required.' },
      { type: 'new', es: 'Banner informativo en menú muestra pedidos disponibles restantes del día.', en: 'Informational banner on the menu shows remaining orders available for the day.' },
      { type: 'improved', es: 'Carga del menú público 40% más rápida: modifier groups ahora se cargan en paralelo.', en: 'Public menu loads 40% faster: modifier groups now load in parallel with the rest of the menu.' },
      { type: 'improved', es: 'Apple Touch Icon en PNG generado dinámicamente para instalación correcta en iOS.', en: 'Apple Touch Icon dynamically generated as PNG for correct iOS home screen installation.' },
      { type: 'improved', es: 'Estado abierto/cerrado del restaurante ahora visible en móvil.', en: 'Restaurant open/closed status is now visible on mobile (previously desktop-only).' },
      { type: 'improved', es: 'Botones del header del menú ampliados a 44px mínimo para mejor uso táctil.', en: 'Menu header buttons enlarged to 44px minimum for better touch accessibility.' },
      { type: 'fixed', es: 'Email de soporte unificado en todas las pantallas (soporte@menius.app).', en: 'Support email unified across all screens (soporte@menius.app).' },
      { type: 'fixed', es: 'Error de TypeScript en /admin/health resuelto — el dashboard de salud funciona correctamente.', en: 'TypeScript error in /admin/health resolved — the health dashboard now works correctly.' },
    ],
  },
  {
    version: '2.4',
    dateEs: 'Febrero 2026',
    dateEn: 'February 2026',
    badgeEs: 'Estable',
    badgeEn: 'Stable',
    badgeColor: 'bg-blue-500',
    highlightsEs: ['Dashboard de Salud de Plataforma', 'Demo checkout estilo Stripe', 'Stripe Connect onboarding'],
    highlightsEn: ['Platform Health Dashboard', 'Stripe-style demo checkout', 'Stripe Connect onboarding'],
    changes: [
      { type: 'new', es: 'Admin: Dashboard de Salud de Plataforma en /admin/health — KPIs, alertas, MRR estimado.', en: 'Admin: Platform Health Dashboard at /admin/health — KPIs, alerts, estimated MRR.' },
      { type: 'new', es: 'Demo checkout rediseñado visualmente idéntico a Stripe (datos pre-llenados para demostración).', en: 'Demo checkout visually redesigned, identical to Stripe (pre-filled data for demonstration).' },
      { type: 'improved', es: 'Stripe Connect: flujo de onboarding completo con UI en Configuración.', en: 'Stripe Connect: complete onboarding flow with UI in Settings.' },
      { type: 'improved', es: 'Webhook de pagos separado con secret propio (STRIPE_PAYMENTS_WEBHOOK_SECRET).', en: 'Payments webhook separated with its own secret (STRIPE_PAYMENTS_WEBHOOK_SECRET).' },
      { type: 'fixed', es: 'Billing webhook: cancel_at_period_end ya no marca la cuenta como cancelada prematuramente.', en: 'Billing webhook: cancel_at_period_end no longer prematurely marks the account as cancelled.' },
    ],
  },
  {
    version: '2.3',
    dateEs: 'Febrero 2026',
    dateEn: 'February 2026',
    badgeEs: 'Estable',
    badgeEn: 'Stable',
    badgeColor: 'bg-blue-500',
    highlightsEs: ['Mapa de delivery en tracking', 'Historial de pedidos por email', 'Horarios por categoría'],
    highlightsEn: ['Delivery map in order tracking', 'Order history by email', 'Category availability schedules'],
    changes: [
      { type: 'new', es: 'Mapa de entrega en tiempo real en la página de seguimiento (react-leaflet + OpenStreetMap).', en: 'Real-time delivery map on the order tracking page (react-leaflet + OpenStreetMap).' },
      { type: 'new', es: 'Historial de pedidos: clientes pueden ver sus pedidos anteriores con solo su email.', en: 'Order history: customers can view their past orders using just their email.' },
      { type: 'new', es: 'Categorías con horario: configura horarios de disponibilidad por categoría.', en: 'Category schedules: configure availability hours per category (e.g., breakfast 7–11am).' },
      { type: 'new', es: 'Reordenar: botón "Volver a pedir" en historial recrea el carrito anterior.', en: 'Reorder: "Order again" button in history recreates the previous cart automatically.' },
    ],
  },
  {
    version: '2.2',
    dateEs: 'Enero 2026',
    dateEn: 'January 2026',
    badgeEs: 'Estable',
    badgeEn: 'Stable',
    badgeColor: 'bg-blue-500',
    highlightsEs: ['Rate limiting en APIs', 'Unsubscribe de emails', 'Idempotencia en emails automáticos'],
    highlightsEn: ['API rate limiting', 'Email unsubscribe', 'Automated email idempotency'],
    changes: [
      { type: 'new', es: 'Rate limiting en /api/orders/status para prevenir enumeración de pedidos.', en: 'Rate limiting on /api/orders/status to prevent order enumeration attacks.' },
      { type: 'new', es: 'Endpoint /api/unsubscribe para desuscripción de emails con un clic.', en: 'Endpoint /api/unsubscribe for one-click email unsubscription.' },
      { type: 'improved', es: 'Idempotencia en emails automáticos: previenen envíos duplicados.', en: 'Automated email idempotency: prevents duplicate sends using tracking tags.' },
      { type: 'fixed', es: 'CartStore: reorder limpia el carrito antes de agregar items (antes duplicaba).', en: 'CartStore: reorder now clears the cart before adding items (previously duplicated them).' },
    ],
  },
  {
    version: '2.1',
    dateEs: 'Enero 2026',
    dateEn: 'January 2026',
    badgeEs: 'Estable',
    badgeEn: 'Stable',
    badgeColor: 'bg-blue-500',
    highlightsEs: ['Marketing Hub completo', 'Campañas Email y SMS', 'Generador de posts con IA', '9 Automatizaciones'],
    highlightsEn: ['Full Marketing Hub', 'Email & SMS Campaigns', 'AI post generator', '9 Automations'],
    changes: [
      { type: 'new', es: 'Marketing Hub: panel centralizado con 4 módulos — Campañas de Email, Redes Sociales, SMS y Automatizaciones.', en: 'Marketing Hub: centralized panel with 4 modules — Email Campaigns, Social Media, SMS, and Automations.' },
      { type: 'new', es: 'Campañas de Email: crea y envía newsletters y promociones a toda tu base de clientes o segmentos específicos.', en: 'Email Campaigns: create and send newsletters and promotions to your full customer base or specific segments.' },
      { type: 'new', es: 'Generador de Social Media con IA: crea captions optimizados para Instagram, Facebook y TikTok basados en tus productos o contexto personalizado.', en: 'AI Social Media generator: create optimized captions for Instagram, Facebook, and TikTok based on your products or custom context.' },
      { type: 'new', es: 'Campañas SMS: envío de mensajes de texto a clientes registrados vía Twilio.', en: 'SMS Campaigns: send text messages to registered customers via Twilio integration.' },
      { type: 'new', es: '9 Automatizaciones preconfiguradas: bienvenida, reactivación, VIP, recordatorio de trial, y más. Solo actívalas y trabajan solas.', en: '9 pre-built Automations: welcome, reactivation, VIP, trial reminder, and more. Just activate them and they run automatically.' },
      { type: 'improved', es: 'CRM: etiquetas automáticas de cliente (Nuevo, Frecuente, VIP) según comportamiento de compra.', en: 'CRM: automatic customer tags (New, Frequent, VIP) based on purchase behavior.' },
    ],
  },
  {
    version: '2.0',
    dateEs: 'Diciembre 2025',
    dateEn: 'December 2025',
    badgeEs: 'Mayor',
    badgeEn: 'Major',
    badgeColor: 'bg-purple-500',
    highlightsEs: ['Lanzamiento de MENIUS 2.0', 'MENIUS AI', 'KDS de Cocina', 'Analytics avanzados'],
    highlightsEn: ['MENIUS 2.0 launch', 'MENIUS AI', 'Kitchen Display System', 'Advanced analytics'],
    changes: [
      { type: 'new', es: 'MENIUS AI: asistente inteligente con Google Gemini integrado al dashboard.', en: 'MENIUS AI: intelligent assistant powered by Google Gemini, integrated into the dashboard.' },
      { type: 'new', es: 'Kitchen Display System (KDS): pantalla de cocina en tiempo real con Supabase Realtime.', en: 'Kitchen Display System (KDS): real-time kitchen screen powered by Supabase Realtime.' },
      { type: 'new', es: 'Analytics avanzados: métricas de ventas, clientes, productos y horas pico.', en: 'Advanced analytics: sales metrics, customers, products, and peak hours.' },
      { type: 'new', es: 'CRM de clientes integrado con historial, tags y campañas de marketing.', en: 'Built-in customer CRM with history, tags, and marketing campaigns.' },
      { type: 'new', es: 'Multi-idioma: menú público en español e inglés con detección automática.', en: 'Multi-language: public menu in Spanish and English with automatic detection.' },
    ],
  },
];

const typeStyles: Record<string, { labelEs: string; labelEn: string; color: string }> = {
  new: { labelEs: 'Nuevo', labelEn: 'New', color: 'bg-emerald-100 text-emerald-700' },
  improved: { labelEs: 'Mejorado', labelEn: 'Improved', color: 'bg-blue-100 text-blue-700' },
  fixed: { labelEs: 'Arreglado', labelEn: 'Fixed', color: 'bg-amber-100 text-amber-700' },
};

export default async function ChangelogPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('menius_locale')?.value === 'en' ? 'en' : 'es') as Locale;
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-bold text-xl tracking-tight">MENIUS</Link>
          <Link href="/app" className="text-sm text-gray-400 hover:text-white transition-colors">
            {isEn ? 'Dashboard →' : 'Dashboard →'}
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              {isEn ? 'Always improving' : 'Siempre mejorando'}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            {isEn
              ? 'Every update we make to MENIUS, documented. Your platform improves every week.'
              : 'Cada actualización que hacemos a MENIUS, documentada. Tu plataforma mejora cada semana.'}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-800 ml-[11px]" />
          <div className="space-y-14">
            {releases.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Dot */}
                <div className={`absolute left-0 top-1 w-[23px] h-[23px] rounded-full ${release.badgeColor} flex items-center justify-center shadow-lg`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                <div>
                  {/* Version header */}
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl font-bold text-white">v{release.version}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${release.badgeColor} text-white`}>
                      {isEn ? release.badgeEn : release.badgeEs}
                    </span>
                    <span className="text-sm text-gray-500">
                      {isEn ? release.dateEn : release.dateEs}
                    </span>
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {(isEn ? release.highlightsEn : release.highlightsEs).map((h) => (
                      <span key={h} className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                        {h}
                      </span>
                    ))}
                  </div>

                  {/* Changes list */}
                  <ul className="space-y-2.5">
                    {release.changes.map((change, i) => {
                      const style = typeStyles[change.type];
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded mt-0.5 ${style.color}`}>
                            {isEn ? style.labelEn : style.labelEs}
                          </span>
                          <span className="text-sm text-gray-300 leading-relaxed">
                            {isEn ? change.en : change.es}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-20 pt-10 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm mb-4">
            {isEn ? 'Have suggestions for the next release?' : '¿Tienes sugerencias para el próximo release?'}
          </p>
          <a
            href="mailto:soporte@menius.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            {isEn ? 'Send a suggestion' : 'Enviar sugerencia'}
          </a>
        </div>
      </div>
    </div>
  );
}
