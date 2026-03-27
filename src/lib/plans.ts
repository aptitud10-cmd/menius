// ============================================================
// MENIUS — Subscription Plans Configuration
// ============================================================

export type PlanId = 'free' | 'starter' | 'pro' | 'business';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  /** $0 for the free plan */
  price: { monthly: number; annual: number };
  /** Empty strings for the free plan (no Stripe product) */
  stripePriceId: { monthly: string; annual: string };
  limits: {
    maxProducts: number;
    maxTables: number;
    maxUsers: number;
    maxCategories: number;
    /** Monthly order cap; -1 = unlimited */
    maxOrdersPerMonth: number;
  };
  features: string[];
  excluded: string[];
  popular?: boolean;
  /** True for the plan that requires no payment card */
  isFree?: boolean;
}

/** Kept for backward compat with existing 'trialing' subscriptions in DB */
export const TRIAL_DAYS = 14;

/** Monthly order limit enforced for the FREE plan */
export const FREE_MONTHLY_ORDER_LIMIT = 50;

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Empieza gratis. Sin tarjeta de crédito.',
    price: { monthly: 0, annual: 0 },
    stripePriceId: { monthly: '', annual: '' },
    limits: {
      maxProducts: -1,
      maxTables: 5,
      maxUsers: 1,
      maxCategories: -1,
      maxOrdersPerMonth: FREE_MONTHLY_ORDER_LIMIT,
    },
    features: [
      'Menú digital + QR (hasta 5 mesas)',
      'Solo dine-in',
      '50 pedidos / mes',
      'Importar menú desde foto con IA',
      'Soporte por email',
    ],
    excluded: [
      'Sin marca "Powered by MENIUS"',
      'Pickup y Delivery',
      'MENIUS AI assistant',
      'Notificaciones WhatsApp / email',
      'Analytics',
      'Pagos online',
    ],
    isFree: true,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para restaurantes que inician su digitalización.',
    price: { monthly: 39, annual: 390 },
    stripePriceId: {
      monthly: (process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '').trim(),
      annual: (process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '').trim(),
    },
    limits: {
      maxProducts: -1,
      maxTables: 15,
      maxUsers: 2,
      maxCategories: -1,
      maxOrdersPerMonth: -1,
    },
    features: [
      'Productos y categorías ilimitados',
      'Menú digital con fotos',
      'QR para hasta 15 mesas',
      'Pedidos online (dine-in + pickup)',
      'Sin marca MENIUS en el menú',
      'MENIUS AI (asistente de negocio)',
      'Importar menú desde foto con IA',
      'Generación de imágenes con IA',
      'Analytics básico (últimos 30 días)',
      'Notificaciones sonoras',
      '2 usuarios administradores',
      'Soporte por chat',
    ],
    excluded: [
      'Delivery',
      'Notificaciones WhatsApp',
      'Analytics avanzado',
      'Promociones y cupones',
      'Reseñas de clientes',
      'Gestión de equipo',
      'Exportar reportes',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para restaurantes que quieren crecer y vender más.',
    price: { monthly: 79, annual: 790 },
    stripePriceId: {
      monthly: (process.env.STRIPE_PRICE_PRO_MONTHLY ?? '').trim(),
      annual: (process.env.STRIPE_PRICE_PRO_ANNUAL ?? '').trim(),
    },
    limits: {
      maxProducts: -1,
      maxTables: 50,
      maxUsers: 5,
      maxCategories: -1,
      maxOrdersPerMonth: -1,
    },
    features: [
      'Todo lo de Starter',
      'Hasta 50 mesas',
      'Delivery + dirección de entrega',
      'WhatsApp notifications (500 msgs/mes)',
      'Notificaciones por email',
      'Cocina KDS en tiempo real',
      'Analytics avanzado (histórico completo)',
      'Promociones y cupones de descuento',
      'Reseñas de clientes',
      'Gestión de equipo (5 usuarios)',
      'Exportar reportes PDF / CSV',
      'Pagos online con tarjeta (Stripe)',
      'Chat prioritario 24h',
    ],
    excluded: [],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Para cadenas y franquicias con múltiples ubicaciones.',
    price: { monthly: 149, annual: 1490 },
    stripePriceId: {
      monthly: (process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '').trim(),
      annual: (process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? '').trim(),
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxUsers: -1,
      maxCategories: -1,
      maxOrdersPerMonth: -1,
    },
    features: [
      'Todo lo de Pro',
      'Mesas y usuarios ilimitados',
      'Hasta 3 sucursales incluidas',
      'WhatsApp notifications (2,000 msgs/mes)',
      'Dominio personalizado',
      'Exportar datos completos (CSV / Excel)',
      'Acceso API',
      'Account manager dedicado (chat)',
      'Tickets SLA < 1h',
    ],
    excluded: [],
  },
};

// Legacy aliases for data created before the plan ID migration
const PLAN_ALIASES: Record<string, PlanId> = {
  basic: 'starter',
  enterprise: 'business',
};

export function resolvePlanId(planId: string): PlanId {
  return (PLAN_ALIASES[planId] ?? planId) as PlanId;
}

export function getPlan(planId: PlanId | string): PlanConfig | null {
  return PLANS[resolvePlanId(planId)] ?? null;
}

export function getPlanByStripePrice(priceId: string): PlanConfig | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId.monthly === priceId || plan.stripePriceId.annual === priceId) {
      return plan;
    }
  }
  return null;
}

export function getIntervalByStripePrice(priceId: string): BillingInterval {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId.annual === priceId) return 'annual';
  }
  return 'monthly';
}

export function isWithinLimit(value: number, limit: number): boolean {
  if (limit === -1) return true;
  return value <= limit;
}
