/**
 * Mapa del dashboard para el asistente de IA.
 *
 * PROBLEMA QUE RESUELVE: la guía del dashboard vivía como ~120 líneas de prosa
 * dentro del system prompt, mantenidas a mano. Nadie las actualizaba al agregar
 * una feature, así que el asistente terminó describiendo un producto que no
 * existía: ofrecía campañas de SMS (MENIUS no tiene SMS), automations de
 * cumpleaños y un botón para activarlas que nunca existió. Al mismo tiempo
 * ignoraba secciones reales —sucursales, media, business, ai-insights— porque
 * se agregaron después de escribir el prompt.
 *
 * CÓMO LO RESUELVE: la ruta es la fuente de verdad. Cada entrada de aquí se
 * corresponde con una carpeta real bajo src/app/(dashboard)/app, y el test
 * `dashboard-map.test.ts` recorre el filesystem y falla si aparece una ruta sin
 * describir o una entrada que apunta a una ruta que ya no existe.
 *
 * O sea: no evita que alguien escriba una descripción incorrecta, pero sí que
 * el mapa se desincronice en silencio, que es lo que pasó.
 *
 * AL AGREGAR UNA SECCIÓN NUEVA AL DASHBOARD: el test va a fallar hasta que la
 * agregues acá. Describí solo lo que la pantalla hace de verdad — el asistente
 * repite esto textualmente a un cliente que paga.
 */

export interface DashboardSection {
  /** Ruta relativa bajo /app. '' es el home del dashboard. */
  path: string;
  /** Nombre como aparece en la navegación. */
  label: string;
  /** Qué se puede hacer ahí. Sin adornos: el modelo lo repite tal cual. */
  what: string;
  /** Plan mínimo, cuando la sección está gateada. */
  plan?: "starter" | "pro" | "business";
  /** Rutas hijas que no merecen entrada propia en la guía. */
  covers?: string[];
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    path: "",
    label: "Home",
    what: "Stats of the day, recent orders, low-stock alerts, onboarding checklist and the button to share the menu.",
  },
  {
    path: "menu/products",
    label: "Menu > Products",
    what: "Create and edit products: name, description, price, photo (upload, AI-generate, or pick from the media gallery). Toggles for Active, In stock, Featured, New. Dietary tags, translations, and modifier groups (options and extras).",
    covers: ["menu/products/new", "menu/products/[id]"],
  },
  {
    path: "menu/categories",
    label: "Menu > Categories",
    what: "Create, rename, reorder and hide categories. Drag to reorder. Categories can have an availability window (e.g. breakfast only).",
  },
  {
    path: "menu/inventory",
    label: "Menu > Inventory",
    what: "Track stock per product. When stock hits zero the product shows a 'Sold out' badge and stays visible on the menu.",
  },
  {
    path: "media",
    label: "Media",
    what: "Gallery of images already uploaded, reusable across products.",
  },
  {
    path: "orders",
    label: "Orders",
    what: "Full order history with filters by status, date and type. Open an order to see its items and the customer's contact details.",
  },
  {
    path: "counter",
    label: "Counter",
    what: "Cashier/POS screen: take walk-in orders, set an ETA, assign delivery drivers and print tickets. Works on tablet.",
    covers: ["counter/tablet"],
  },
  {
    path: "kds",
    label: "Kitchen (KDS)",
    what: "Full-screen kitchen display with real-time orders and sound alerts.",
    plan: "pro",
  },
  {
    path: "tables",
    label: "Tables & QR",
    what: "Create tables and generate a printable QR per table. Each QR opens the ordering page for that table.",
  },
  {
    path: "reservations",
    label: "Reservations",
    what: "Incoming table reservations. A reservation starts as pending and the restaurant confirms it.",
    plan: "starter",
  },
  {
    path: "customers",
    label: "Customers (CRM)",
    what: "Built automatically from orders. Segments: VIP, regular, and at-risk (no order in 21+ days). Each profile shows order history, total spent, tags and notes.",
    plan: "starter",
  },
  {
    path: "loyalty",
    label: "Loyalty",
    what: "Points program: customers earn points per order and redeem them as a discount at checkout.",
    plan: "pro",
  },
  {
    path: "promotions",
    label: "Promotions",
    what: "Discount coupons: percentage or fixed amount, with a code, usage cap, expiry date and minimum order.",
    plan: "pro",
  },
  {
    path: "marketing",
    label: "Marketing Hub",
    what: "Email campaigns segmented by audience (all, VIP, inactive, recent) and an AI generator for social posts. The automations panel is informational: it shows which automated emails are running, there is no switch to turn them on or off.",
    plan: "pro",
  },
  {
    path: "reviews",
    label: "Reviews",
    what: "Ratings and comments left by diners, with the option to reply from the dashboard.",
    plan: "pro",
  },
  {
    path: "analytics",
    label: "Analytics",
    what: "Sales charts, best-selling products and peak hours.",
    plan: "starter",
  },
  {
    path: "business",
    label: "Business",
    what: "Business overview: revenue, costs and margin across periods.",
    plan: "pro",
  },
  {
    path: "ai-insights",
    label: "AI Insights",
    what: "Automatic reading of the restaurant's data with suggestions on what to look at.",
    plan: "pro",
  },
  {
    path: "branches",
    label: "Branches",
    what: "Manage multiple locations under one account and switch between them.",
    plan: "business",
  },
  {
    path: "staff",
    label: "Team",
    what: "Invite staff members and assign roles.",
    plan: "pro",
  },
  {
    path: "settings",
    label: "Settings",
    what: "Restaurant details, opening hours, order types (dine-in, pickup, delivery), delivery fee and radius, payment methods, taxes, languages, custom domain and thermal printers.",
    covers: ["settings/api-keys", "settings/data"],
  },
  {
    path: "billing",
    label: "Billing",
    what: "Current plan, invoices and payment method. Plan changes and cancellation happen here.",
  },
];

/**
 * Rutas que existen pero no van en la guía: son estados del sistema, no
 * secciones que el dueño navegue por su cuenta. El test las conoce y no las
 * exige.
 */
export const NON_GUIDE_ROUTES = [
  "subscription-expired",
  "verify-email",
];

/** Renderiza el mapa como el bloque de texto que se inyecta en el system prompt. */
export function renderDashboardGuide(): string {
  return DASHBOARD_SECTIONS.map((s) => {
    const url = s.path ? `/app/${s.path}` : "/app";
    const plan = s.plan ? ` (${s.plan}+)` : "";
    return `- **${s.label}**${plan} — ${url}: ${s.what}`;
  }).join("\n");
}
