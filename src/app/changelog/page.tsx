import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog — Novedades de MENIUS',
  description: 'Todas las actualizaciones, mejoras y nuevas funciones de MENIUS. Así evoluciona tu plataforma de menú digital.',
  alternates: { canonical: 'https://menius.app/changelog' },
  robots: { index: true, follow: true },
};

const releases = [
  {
    version: '2.5',
    date: 'Marzo 2026',
    badge: 'Nuevo',
    badgeColor: 'bg-emerald-500',
    highlights: ['Plan gratuito con 3 pedidos/día', 'SEO mejorado para menús públicos', 'Rendimiento 40% más rápido en carga de menú'],
    changes: [
      { type: 'new', text: 'Plan gratuito permanente: menús activos con hasta 3 pedidos por día sin suscripción.' },
      { type: 'new', text: 'Banner informativo en menú muestra pedidos disponibles restantes del día.' },
      { type: 'improved', text: 'Carga del menú público 40% más rápida: modifier groups ahora se cargan en paralelo con el resto del menú.' },
      { type: 'improved', text: 'Apple Touch Icon en PNG generado dinámicamente para instalación correcta en iOS.' },
      { type: 'improved', text: 'Estado abierto/cerrado del restaurante ahora visible en móvil (antes solo en desktop).' },
      { type: 'improved', text: 'Botones del header del menú amplíados a 44px mínimo para mejor uso táctil.' },
      { type: 'improved', text: 'OG image de menús públicos ahora usa la foto real del restaurante en lugar de SVG.' },
      { type: 'fixed', text: 'Corrección de email de soporte unificado en todas las pantallas (soporte@menius.app).' },
      { type: 'fixed', text: 'Error de TypeScript en /admin/health resuelto — el dashboard de salud de plataforma funciona correctamente.' },
    ],
  },
  {
    version: '2.4',
    date: 'Febrero 2026',
    badge: 'Estable',
    badgeColor: 'bg-blue-500',
    highlights: ['Dashboard de Salud de Plataforma', 'Demo checkout estilo Stripe', 'Límites de ordenes diarias'],
    changes: [
      { type: 'new', text: 'Admin: Dashboard de Salud de Plataforma en /admin/health — KPIs, alertas, MRR estimado.' },
      { type: 'new', text: 'Demo checkout rediseñado visualmente idéntico a Stripe (datos de tarjeta pre-llenados para demostración).' },
      { type: 'new', text: 'Status page pública mejorada: incluye 7 servicios con latencia real, idéntico a Stripe Status.' },
      { type: 'new', text: 'Google Gemini AI integrado en status page para monitoreo de salud del servicio IA.' },
      { type: 'improved', text: 'Stripe Connect: flujo de onboarding completo con UI en Configuración.' },
      { type: 'improved', text: 'Webhook de pagos separado con secret propio (STRIPE_PAYMENTS_WEBHOOK_SECRET).' },
      { type: 'improved', text: 'Cancelación de cuenta ahora cancela la suscripción de Stripe automáticamente.' },
      { type: 'fixed', text: 'Billing webhook: cancel_at_period_end ya no marca la cuenta como cancelada prematuramente.' },
      { type: 'fixed', text: 'Middleware: protección de rutas /admin verifica correctamente que el email sea admin.' },
      { type: 'fixed', text: 'Respuestas de IA (social posts, AI copy) ahora parsean correctamente JSON envuelto en markdown.' },
    ],
  },
  {
    version: '2.3',
    date: 'Febrero 2026',
    badge: 'Estable',
    badgeColor: 'bg-blue-500',
    highlights: ['Mapa de delivery en tracking', 'Historial de pedidos por email', 'Horarios por categoría'],
    changes: [
      { type: 'new', text: 'Mapa de entrega en tiempo real en la página de seguimiento de pedidos (react-leaflet + OpenStreetMap).' },
      { type: 'new', text: 'Historial de pedidos: clientes pueden ver sus pedidos anteriores con solo su email (/r/[slug]/mis-pedidos).' },
      { type: 'new', text: 'Categorías con horario: configura horarios de disponibilidad por categoría (desayunos 7-11am, etc.).' },
      { type: 'new', text: 'Reordenar: botón "Volver a pedir" en historial recrea el carrito anterior automáticamente.' },
      { type: 'improved', text: 'Header del menú: enlace directo a historial de pedidos con ícono de historial.' },
      { type: 'fixed', text: 'Compatibilidad de react-leaflet con React 18 (downgrade a v4.2.1).' },
    ],
  },
  {
    version: '2.2',
    date: 'Enero 2026',
    badge: 'Estable',
    badgeColor: 'bg-blue-500',
    highlights: ['Rate limiting en APIs', 'Unsubscribe de emails', 'Idempotencia en emails automáticos'],
    changes: [
      { type: 'new', text: 'Rate limiting en /api/orders/status para prevenir enumeración de pedidos.' },
      { type: 'new', text: 'Endpoint /api/unsubscribe para desuscripción de emails con un clic.' },
      { type: 'new', text: 'Tag "unsubscribed" en CRM para no enviar emails a clientes que se desuscribieron.' },
      { type: 'improved', text: 'Idempotencia en emails automáticos: setup_email_sent y no_orders_email_sent previenen envíos duplicados.' },
      { type: 'improved', text: 'Reporte mensual: idempotencia con tag monthly_report_YYYY_MM — nunca se envía dos veces el mismo mes.' },
      { type: 'improved', text: 'Búsqueda en CRM: sanitización de caracteres especiales en filtros de PostgREST.' },
      { type: 'fixed', text: 'Index de mes en reporte mensual corregido (getMonth() + 1).' },
      { type: 'fixed', text: 'CartStore: reorder limpia el carrito antes de agregar items (antes duplicaba).' },
    ],
  },
  {
    version: '2.1',
    date: 'Enero 2026',
    badge: 'Estable',
    badgeColor: 'bg-blue-500',
    highlights: ['MENIUS AI mejorado', 'Open Graph dinámico', 'Seguridad en middleware'],
    changes: [
      { type: 'new', text: 'Open Graph image dinámico generado con next/og para mejor presencia en redes sociales.' },
      { type: 'new', text: 'Metadata SEO completa en landing page: canonical absoluta, og:url, og:image.' },
      { type: 'improved', text: 'MENIUS AI: regex de tips proactivos corregido para funcionar en inglés y español.' },
      { type: 'improved', text: 'Middleware: try/catch en new URL(origin) previene crash con headers Origin inválidos.' },
      { type: 'improved', text: 'getWebhookSecret() lanza error explícito si la variable no está configurada.' },
      { type: 'improved', text: 'Checkout de Stripe: nombres de productos reales (no "Producto" genérico) en líneas de pedido.' },
      { type: 'fixed', text: 'Auth pages (login, register): robots noindex para no indexar páginas privadas.' },
    ],
  },
  {
    version: '2.0',
    date: 'Diciembre 2025',
    badge: 'Mayor',
    badgeColor: 'bg-purple-500',
    highlights: ['Lanzamiento de MENIUS 2.0', 'MENIUS AI', 'KDS de Cocina', 'Analytics avanzados'],
    changes: [
      { type: 'new', text: 'MENIUS AI: asistente inteligente con Google Gemini integrado al dashboard, con datos reales de tu restaurante.' },
      { type: 'new', text: 'Kitchen Display System (KDS): pantalla de cocina en tiempo real con Supabase Realtime.' },
      { type: 'new', text: 'Analytics avanzados: métricas de ventas, clientes, productos y horas pico.' },
      { type: 'new', text: 'CRM de clientes integrado con historial, tags y campañas de marketing.' },
      { type: 'new', text: 'Modifier groups: opciones de personalización avanzada (ej: punto de cocción, nivel de picante).' },
      { type: 'new', text: 'Multi-idioma: menú público en español e inglés con detección automática.' },
      { type: 'new', text: 'Stripe Connect: restaurantes pueden conectar su cuenta de Stripe para recobrar pagos directamente.' },
      { type: 'improved', text: 'MenuShell completamente rediseñado: 3 columnas en desktop, navegación por categorías, búsqueda, favoritos.' },
      { type: 'improved', text: 'Checkout rediseñado: soporte completo para dine-in, pickup y delivery con validaciones.' },
    ],
  },
];

const typeStyles: Record<string, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: 'bg-emerald-100 text-emerald-700' },
  improved: { label: 'Mejorado', color: 'bg-blue-100 text-blue-700' },
  fixed: { label: 'Arreglado', color: 'bg-amber-100 text-amber-700' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-emerald-400 font-bold text-xl tracking-tight">MENIUS</Link>
          <Link href="/app" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard →</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Siempre mejorando</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Cada actualización que hacemos a MENIUS, documentada. Tu plataforma mejora cada semana.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-800 ml-[11px]" />

          <div className="space-y-14">
            {releases.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Dot */}
                <div className={`absolute left-0 top-1 w-[23px] h-[23px] rounded-full ${release.badgeColor} flex items-center justify-center shadow-lg`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Content */}
                <div>
                  {/* Version header */}
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl font-bold text-white">v{release.version}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${release.badgeColor} text-white`}>
                      {release.badge}
                    </span>
                    <span className="text-sm text-gray-500">{release.date}</span>
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {release.highlights.map((h) => (
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
                            {style.label}
                          </span>
                          <span className="text-sm text-gray-300 leading-relaxed">{change.text}</span>
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
          <p className="text-gray-500 text-sm mb-4">¿Tienes sugerencias para el próximo release?</p>
          <a
            href="mailto:soporte@menius.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
          >
            Enviar sugerencia
          </a>
        </div>
      </div>
    </div>
  );
}
