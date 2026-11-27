import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { V2Page } from "@/components/landing-v2/V2Page";
import "@/components/landing-v2/lv2-help.css";
import { resolveLandingV2Locale } from "@/lib/landing-v2-copy";
import { SUPPORT_CONTACT } from "@/lib/support-contact";
import { V2ScrollSpy } from "@/components/landing-v2/V2ScrollSpy";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  return {
    title: locale === "en" ? "Changelog" : "Novedades",
    description:
      locale === "en"
        ? "Every update, improvement and fix in MENIUS, by version and date."
        : "Cada actualización, mejora y arreglo de MENIUS, por versión y fecha.",
    alternates: { canonical: "/changelog" },
    robots: { index: true, follow: true },
  };
}

/*
 * Historial: solo se editan u omiten entradas existentes (sin versiones ni
 * fechas nuevas). Fuera lo que ya no ofrecemos en EE.UU. (Wompi/Colombia,
 * puntos de lealtad, sucursales y API del plan Business, plan gratis de
 * 3 pedidos/día, generador de posts) y sin nombres de proveedores de IA.
 * Las etiquetas por release ("Nuevo"/"Estable") ya no se muestran.
 */

interface Change {
  type: "new" | "improved" | "fixed";
  es: string;
  en: string;
}
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
    version: "2.10",
    dateEs: "Noviembre 2026",
    dateEn: "November 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Counter rediseñado",
      "Pago y seguimiento nuevos",
      "Pro pasa a $149/mes",
    ],
    highlightsEn: [
      "Redesigned Counter",
      "New checkout and order tracking",
      "Pro is now $149/mo",
    ],
    changes: [
      {
        type: "new",
        es: "Counter rediseñado: modo claro u oscuro, 4 sonidos a elegir, la alerta de pedido nuevo suena hasta que lo aceptas o lo rechazas, y las fotos se ven sin salir de la app.",
        en: "Redesigned Counter: light or dark mode, 4 sounds to choose from, the new-order alert rings until you accept or reject, and photos open without leaving the app.",
      },
      {
        type: "new",
        es: "Pedidos para llevar sin recoger: la tarjeta cambia de color con el tiempo, opción \"No vino\" con deshacer y un recordatorio al cliente a los 20 minutos.",
        en: "Uncollected pickups: the card changes color over time, a \"No-show\" option with undo, and a reminder to the customer after 20 minutes.",
      },
      {
        type: "new",
        es: "Marca a los clientes que no reciben o no pagan; el Counter te avisa cuando vuelven a pedir.",
        en: "Flag customers who don't pick up or don't pay; the Counter warns you when they order again.",
      },
      {
        type: "new",
        es: "Los pedidos que nadie acepta en 15 minutos se cancelan solos, y los que quedaron olvidados se cierran.",
        en: "Orders nobody accepts within 15 minutes are cancelled automatically, and forgotten ones are closed.",
      },
      {
        type: "improved",
        es: "Pantalla de pago nueva: total arriba, propina en dólares redondos, email opcional, cubiertos solo si el cliente los pide y aviso de cerrado o en pausa antes de confirmar.",
        en: "New checkout: total at the top, tips in round dollars, optional email, utensils only when the customer asks, and a closed/paused notice before confirming.",
      },
      {
        type: "improved",
        es: "Seguimiento del pedido nuevo, con el color del restaurante; los emails usan el mismo estilo.",
        en: "New order tracking page in the restaurant's color; emails use the same style.",
      },
      {
        type: "improved",
        es: "Menú: navegación en una sola hoja con Populares, grilla o lista por categoría, ficha de plato más clara, horario visible, información del restaurante, reseñas e íconos de dieta.",
        en: "Menu: one-sheet navigation with Popular, grid or list per category, a clearer dish page, visible hours, restaurant info, reviews and diet icons.",
      },
      {
        type: "improved",
        es: "El enlace de tu tienda se comparte en WhatsApp con foto, nombre y \"Order online\".",
        en: "Your store link shares on WhatsApp with a photo, name and \"Order online\".",
      },
      {
        type: "improved",
        es: "Plan Pro: ahora $149/mes o $1,490/año, con 0% de comisión de MENIUS por pedido.",
        en: "Pro plan: now $149/mo or $1,490/yr, with 0% MENIUS commission per order.",
      },
    ],
  },
  {
    version: "2.9",
    dateEs: "Noviembre 2026",
    dateEn: "November 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Un solo plan: Pro $79/mes",
      "Dominio propio incluido",
      "Tu nombre en el resumen de la tarjeta",
    ],
    highlightsEn: [
      "One plan: Pro $79/mo",
      "Custom domain included",
      "Your name on the card statement",
    ],
    changes: [
      {
        type: "new",
        es: "Un solo plan: Pro $79/mes con todo incluido (dominio propio incluido); el procesamiento de Stripe lo paga el restaurante y aparece su nombre en el resumen de la tarjeta.",
        en: "One plan: Pro $79/mo with everything included (custom domain included); Stripe processing is paid by the restaurant and its name appears on the card statement.",
      },
    ],
  },
  {
    version: "2.8",
    dateEs: "Abril 2026",
    dateEn: "April 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Cancelar suscripción",
      "Cambio de plan más claro",
    ],
    highlightsEn: [
      "Cancel subscription",
      "Clearer plan changes",
    ],
    changes: [
      {
        type: "new",
        es: "Cancela tu suscripción desde el panel, en Facturación. Tu plan sigue activo hasta el final del período que ya pagaste y después pasa al plan Free.",
        en: "Cancel your subscription from the dashboard, under Billing. Your plan stays active until the end of the period you already paid for, then moves to the Free plan.",
      },
      {
        type: "improved",
        es: "Facturación: antes de cancelar ves tu plan, la fecha de vencimiento y las funciones que dejarías de tener.",
        en: "Billing: before you cancel, you see your plan, its end date and the features you would lose.",
      },
    ],
  },
  {
    version: "2.7",
    dateEs: "Abril 2026",
    dateEn: "April 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Pagos online sin comisión",
      "Mejor posicionamiento en Google",
      "Sello Powered by MENIUS",
      "Panel en el celular",
    ],
    highlightsEn: [
      "Online payments, zero commission",
      "Better Google visibility",
      "Powered by MENIUS badge",
      "Dashboard on your phone",
    ],
    changes: [
      {
        type: "new",
        es: "Pagos online con tarjeta a través de Stripe Connect, con 0% de comisión de MENIUS. El plan Free solo acepta efectivo.",
        en: "Online card payments through Stripe Connect, with 0% MENIUS commission. The Free plan only accepts cash.",
      },
      {
        type: "new",
        es: "Sello \"Powered by MENIUS\" en el pie del menú público de cada restaurante.",
        en: "\"Powered by MENIUS\" badge in the footer of every public menu.",
      },
      {
        type: "improved",
        es: "Google entiende mejor tu menú público: una descripción automática con tus categorías si no escribiste una, y resultados de búsqueda más completos.",
        en: "Google understands your public menu better: an automatic description from your categories if you haven’t written one, and richer search results.",
      },
      {
        type: "improved",
        es: "Panel en el celular: barra inferior fija (Inicio, Pedidos, Menú, Counter), pedidos ordenados por estado, y productos e inventario en tarjetas compactas.",
        en: "Dashboard on your phone: a fixed bottom bar (Home, Orders, Menu, Counter), orders sorted by status, and products and inventory as compact cards.",
      },
      {
        type: "improved",
        es: "Primeros pasos: una lista con el tiempo estimado de cada paso y el siguiente siempre a la vista; puedes ocultarla al completar 4 de 6.",
        en: "Getting started: a checklist with an estimated time for each step and the next one always in view; you can hide it after finishing 4 of 6.",
      },
      {
        type: "fixed",
        es: "Se arregló el error \"No se pudo crear la orden\" al hacer un pedido.",
        en: "Fixed the \"Could not create order\" error when placing an order.",
      },
    ],
  },
  {
    version: "2.6",
    dateEs: "Marzo 2026",
    dateEn: "March 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Pedidos manuales en el Counter",
      "Inventario con alertas",
      "Mapa de horas pico",
    ],
    highlightsEn: [
      "Manual orders on the Counter",
      "Inventory with alerts",
      "Busy-hours heatmap",
    ],
    changes: [
      {
        type: "new",
        es: "Pedidos manuales en el Counter: registra pedidos por teléfono o en el mostrador, con búsqueda de productos, tipo de orden y datos del cliente.",
        en: "Manual orders on the Counter: take phone and walk-in orders with product search, order type and customer details.",
      },
      {
        type: "new",
        es: "Inventario: stock por producto, aviso cuando queda poco y descuento automático con cada pedido. Está en Menú → Inventario.",
        en: "Inventory: stock per product, an alert when it runs low, and automatic deduction with each order. Find it in Menu → Inventory.",
      },
      {
        type: "improved",
        es: "Estadísticas: mapa de actividad por hora y día, embudo de conversión y pedidos por tipo (en mesa, para llevar y delivery).",
        en: "Analytics: an activity heatmap by hour and day, a conversion funnel, and orders by type (dine-in, pickup and delivery).",
      },
      {
        type: "improved",
        es: "Menú en el celular: dos columnas de platos en lugar de una, tarjetas con la foto arriba y categorías más compactas.",
        en: "Menu on phones: two columns of dishes instead of one, cards with the photo on top, and more compact categories.",
      },
      {
        type: "improved",
        es: "Carrito en el celular: sugerencias \"También te puede gustar\" con platos destacados que aún no están en el carrito.",
        en: "Cart on phones: \"You may also like\" suggestions with featured dishes that aren’t in the cart yet.",
      },
      {
        type: "improved",
        es: "Preguntas frecuentes: al tocar una categoría ves solo sus preguntas.",
        en: "FAQ: tap a category to see only its questions.",
      },
      {
        type: "fixed",
        es: "Menú en el celular: la página ya no se mueve de lado al ir a una categoría con nombre largo.",
        en: "Menu on phones: the page no longer shifts sideways when you jump to a category with a long name.",
      },
    ],
  },
  {
    version: "2.5",
    dateEs: "Marzo 2026",
    dateEn: "March 2026",
    badgeEs: "Nuevo",
    badgeEn: "New",
    badgeColor: "bg-emerald-500",
    highlightsEs: [
      "Mejor posicionamiento del menú en Google",
      "Menú 40% más rápido",
    ],
    highlightsEn: [
      "Better Google visibility for menus",
      "40% faster menu",
    ],
    changes: [
      {
        type: "improved",
        es: "El menú público carga 40% más rápido: las opciones de cada plato se cargan junto con el resto del menú.",
        en: "The public menu loads 40% faster: each dish’s options now load along with the rest of the menu.",
      },
      {
        type: "improved",
        es: "Ícono correcto al agregar el menú a la pantalla de inicio del iPhone.",
        en: "The right icon when you add the menu to an iPhone home screen.",
      },
      {
        type: "improved",
        es: "Estado abierto/cerrado del restaurante ahora visible en móvil.",
        en: "Restaurant open/closed status is now visible on mobile (previously desktop-only).",
      },
      {
        type: "improved",
        es: "Los botones de la parte superior del menú son más grandes (mínimo 44 px) y más fáciles de tocar.",
        en: "Menu header buttons are larger (at least 44 px) and easier to tap.",
      },
      {
        type: "fixed",
        es: "Email de soporte unificado en todas las pantallas (soporte@menius.app).",
        en: "Support email unified across all screens (soporte@menius.app).",
      },
    ],
  },
  {
    version: "2.4",
    dateEs: "Febrero 2026",
    dateEn: "February 2026",
    badgeEs: "Estable",
    badgeEn: "Stable",
    badgeColor: "bg-blue-500",
    highlightsEs: [
      "Pago de la demo renovado",
      "Conexión con Stripe paso a paso",
    ],
    highlightsEn: [
      "Redesigned demo checkout",
      "Step-by-step Stripe setup",
    ],
    changes: [
      {
        type: "new",
        es: "El pago de la demo se rediseñó, con datos de ejemplo ya cargados.",
        en: "The demo checkout was redesigned, with sample data already filled in.",
      },
      {
        type: "improved",
        es: "Stripe Connect: conexión paso a paso desde Configuración.",
        en: "Stripe Connect: step-by-step setup from Settings.",
      },
      {
        type: "fixed",
        es: "Cancelar al final del período ya no marca la cuenta como cancelada antes de tiempo.",
        en: "Cancelling at the end of the billing period no longer marks the account as cancelled early.",
      },
    ],
  },
  {
    version: "2.3",
    dateEs: "Febrero 2026",
    dateEn: "February 2026",
    badgeEs: "Estable",
    badgeEn: "Stable",
    badgeColor: "bg-blue-500",
    highlightsEs: [
      "Mapa del delivery en el seguimiento",
      "Historial de pedidos con el email",
      "Horarios por categoría",
    ],
    highlightsEn: [
      "Delivery map in order tracking",
      "Order history by email",
      "Category availability schedules",
    ],
    changes: [
      {
        type: "new",
        es: "Mapa de la entrega en tiempo real en la página de seguimiento.",
        en: "Real-time delivery map on the order tracking page.",
      },
      {
        type: "new",
        es: "Historial de pedidos: tus clientes ven sus pedidos anteriores solo con su email.",
        en: "Order history: customers can view their past orders using just their email.",
      },
      {
        type: "new",
        es: "Horarios por categoría: define cuándo está disponible cada categoría (por ejemplo, desayunos de 7 a 11 am).",
        en: "Category schedules: configure availability hours per category (e.g., breakfast 7–11am).",
      },
      {
        type: "new",
        es: 'Reordenar: botón "Volver a pedir" en historial recrea el carrito anterior.',
        en: 'Reorder: "Order again" button in history recreates the previous cart automatically.',
      },
    ],
  },
  {
    version: "2.2",
    dateEs: "Enero 2026",
    dateEn: "January 2026",
    badgeEs: "Estable",
    badgeEn: "Stable",
    badgeColor: "bg-blue-500",
    highlightsEs: [
      "Más protección para tus pedidos",
      "Baja de emails con un clic",
      "Sin emails duplicados",
    ],
    highlightsEn: [
      "Better order protection",
      "One-click email unsubscribe",
      "No duplicate emails",
    ],
    changes: [
      {
        type: "new",
        es: "La página de estado del pedido limita las consultas repetidas, para proteger los datos de tus pedidos.",
        en: "The order status page now limits repeated lookups, to protect your orders’ data.",
      },
      {
        type: "new",
        es: "Tus clientes pueden darse de baja de los emails con un clic.",
        en: "Customers can unsubscribe from emails with one click.",
      },
      {
        type: "improved",
        es: "Los emails automáticos ya no se envían dos veces.",
        en: "Automatic emails are no longer sent twice.",
      },
      {
        type: "fixed",
        es: "\"Volver a pedir\" vacía el carrito antes de agregar los platos (antes los duplicaba).",
        en: "\"Order again\" now empties the cart before adding the dishes (it used to duplicate them).",
      },
    ],
  },
  {
    version: "2.1",
    dateEs: "Enero 2026",
    dateEn: "January 2026",
    badgeEs: "Estable",
    badgeEn: "Stable",
    badgeColor: "bg-blue-500",
    highlightsEs: [
      "Marketing en un solo lugar",
      "Campañas por email",
      "9 automatizaciones",
    ],
    highlightsEn: [
      "Marketing in one place",
      "Email campaigns",
      "9 automations",
    ],
    changes: [
      {
        type: "new",
        es: "Marketing: un solo panel para tus campañas por email y tus automatizaciones.",
        en: "Marketing: one panel for your email campaigns and automations.",
      },
      {
        type: "new",
        es: "Campañas por email: crea y envía novedades y promociones a todos tus clientes o a grupos específicos.",
        en: "Email campaigns: create and send news and promotions to all your customers or to specific groups.",
      },
      {
        type: "new",
        es: "9 automatizaciones listas: confirmación de pedido, bienvenida, reactivación, pedido de reseña y más. Funcionan solas en cuanto activas las notificaciones por email.",
        en: "9 ready-made automations: order confirmation, welcome, reactivation, review request and more. They run on their own once email notifications are on.",
      },
      {
        type: "improved",
        es: "Clientes: etiquetas automáticas (Nuevo, Frecuente, VIP) según cómo compran.",
        en: "Customers: automatic tags (New, Frequent, VIP) based on how they buy.",
      },
    ],
  },
  {
    version: "2.0",
    dateEs: "Diciembre 2025",
    dateEn: "December 2025",
    badgeEs: "Mayor",
    badgeEn: "Major",
    badgeColor: "bg-purple-500",
    highlightsEs: [
      "Lanzamiento de MENIUS 2.0",
      "MENIUS AI",
      "Pantalla de cocina (KDS)",
      "Estadísticas avanzadas",
    ],
    highlightsEn: [
      "MENIUS 2.0 launch",
      "MENIUS AI",
      "Kitchen Display System",
      "Advanced analytics",
    ],
    changes: [
      {
        type: "new",
        es: "MENIUS AI: un asistente en tu panel que responde con los datos de tu restaurante.",
        en: "MENIUS AI: an assistant in your dashboard that answers with your restaurant’s data.",
      },
      {
        type: "new",
        es: "Pantalla de cocina (KDS): los pedidos aparecen en tiempo real.",
        en: "Kitchen Display System (KDS): orders show up in real time.",
      },
      {
        type: "new",
        es: "Estadísticas avanzadas: ventas, clientes, platos y horas pico.",
        en: "Advanced analytics: sales metrics, customers, products, and peak hours.",
      },
      {
        type: "new",
        es: "Lista de clientes integrada, con historial, etiquetas y campañas de marketing.",
        en: "Built-in customer CRM with history, tags, and marketing campaigns.",
      },
      {
        type: "new",
        es: "Varios idiomas: menú público en español e inglés con detección automática.",
        en: "Multi-language: public menu in Spanish and English with automatic detection.",
      },
    ],
  },
];

const TYPE_LABEL: Record<Change["type"], { es: string; en: string }> = {
  new: { es: "Nuevo", en: "New" },
  improved: { es: "Mejorado", en: "Improved" },
  fixed: { es: "Arreglado", en: "Fixed" },
};

/** "2.10" → "v2-10" (id de ancla sin puntos). */
function relId(version: string): string {
  return `v${version.replace(/\./g, "-")}`;
}

const T = {
  en: {
    badge: "Changelog",
    title: "What’s new in MENIUS",
    lead: "Every update we ship, by version and date.",
    endB: "Have an idea for the next version?",
    endT: "Tell us what would help your restaurant. A person reads every message.",
    endCta: "Send a suggestion",
    endSupport: "Support",
    versions: "Versions",
  },
  es: {
    badge: "Novedades",
    title: "Lo nuevo en MENIUS",
    lead: "Cada actualización que publicamos, por versión y fecha.",
    endB: "¿Tienes una idea para la próxima versión?",
    endT: "Cuéntanos qué le ayudaría a tu restaurante. Una persona lee cada mensaje.",
    endCta: "Enviar una sugerencia",
    endSupport: "Soporte",
    versions: "Versiones",
  },
} as const;

export default async function ChangelogPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get("menius_locale")?.value);
  const isEn = locale === "en";
  const t = T[locale];

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph ph-split">
          <div className="wrap">
            <div>
              <span className="stamp label">{t.badge}</span>
              <h1>{t.title}</h1>
            </div>
            <p className="lead">{t.lead}</p>
          </div>
        </header>

        <section className="chap tight paths-sec" aria-label={t.title}>
          <div className="wrap">
            <nav className="chips rel-nav" aria-label={t.versions}>
              {releases.map((release, i) => (
                <a key={release.version} href={`#${relId(release.version)}`} aria-current={i === 0 ? "true" : undefined}>
                  v{release.version} <b>{isEn ? release.dateEn.replace(/ \d{4}$/, "") : release.dateEs.replace(/ \d{4}$/, "")}</b>
                </a>
              ))}
            </nav>
            <ol className="rels">
              {releases.map((release) => (
                <li key={release.version} className="rel" id={relId(release.version)}>
                  <div className="rel-v">
                    <h2>
                      <span className="stamp">v{release.version}</span>
                    </h2>
                    <time>{isEn ? release.dateEn : release.dateEs}</time>
                  </div>
                  <div>
                    <p className="rel-hl">
                      {(isEn ? release.highlightsEn : release.highlightsEs).join(" · ")}
                    </p>
                    <ul className="chg">
                      {release.changes.map((change, i) => (
                        <li key={i}>
                          <span className={`t t-${change.type}`}>
                            {isEn ? TYPE_LABEL[change.type].en : TYPE_LABEL[change.type].es}
                          </span>
                          <span>{isEn ? change.en : change.es}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>

            <div className="doc-end">
              <p>
                <b>{t.endB}</b>
                {t.endT}
              </p>
              <div className="end-links">
                <a className="btn btn-primary" href={`mailto:${SUPPORT_CONTACT.email}`}>{t.endCta}</a>
                <Link className="tlink" href="/support">{t.endSupport}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <V2ScrollSpy ids={releases.map((r) => relId(r.version))} />
    </V2Page>
  );
}
