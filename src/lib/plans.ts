// ============================================================
// MENIUS — Subscription Plans Configuration
// ============================================================

export type PlanId = 'free' | 'starter' | 'pro' | 'business';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  description_en?: string;
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
  features_en?: string[];
  excluded: string[];
  excluded_en?: string[];
  popular?: boolean;
  /** True for the plan that requires no payment card */
  isFree?: boolean;
}

/** Trial disabled — kept for backward compat with existing 'trialing' subscriptions in DB */
export const TRIAL_DAYS = 0;

/** No longer enforced — Free plan has unlimited orders to avoid customer-facing failures */
export const FREE_MONTHLY_ORDER_LIMIT = -1;

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Para probar el producto. 1 mesa, hasta 15 productos.',
    description_en: 'For trying the product. 1 table, up to 15 products.',
    price: { monthly: 0, annual: 0 },
    stripePriceId: { monthly: '', annual: '' },
    limits: {
      maxProducts: 15,
      maxTables: 1,
      maxUsers: 1,
      maxCategories: -1,
      maxOrdersPerMonth: -1,
    },
    features: [
      'Menú digital + QR (1 mesa)',
      'Hasta 15 productos',
      'Pedidos ilimitados',
      'Solo dine-in en efectivo',
      'Soporte por email',
    ],
    features_en: [
      'Digital menu + QR (1 table)',
      'Up to 15 products',
      'Unlimited orders',
      'Cash dine-in only',
      'Email support',
    ],
    excluded: [
      'Sin marca "Powered by MENIUS"',
      'Pickup y Delivery',
      'Importar menú desde foto con IA',
      'Generación de imágenes con IA',
      'MENIUS AI assistant',
      'Notificaciones por email',
      'Analytics',
      'Pagos online',
    ],
    excluded_en: [
      'No "Powered by MENIUS" branding',
      'Pickup & Delivery',
      'Import menu from photo with AI',
      'AI image generation',
      'MENIUS AI assistant',
      'Email notifications',
      'Analytics',
      'Online payments',
    ],
    isFree: true,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para restaurantes que inician su digitalización.',
    description_en: 'For restaurants starting their digital journey.',
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
      'Pedidos online (dine-in + pickup + delivery)',
      'Sin marca MENIUS en el menú',
      'MENIUS AI (asistente de negocio)',
      'Importar menú desde foto con IA',
      'Generación de imágenes con IA',
      'Analytics completo (histórico completo)',
      'Notificaciones sonoras',
      '2 usuarios administradores',
      'Pagos online con tarjeta (0% comisión)',
      'Soporte por chat (respuesta en 8h)',
    ],
    features_en: [
      'Unlimited products & categories',
      'Digital menu with photos',
      'QR for up to 15 tables',
      'Online orders (dine-in + pickup + delivery)',
      'No MENIUS branding on menu',
      'MENIUS AI (business assistant)',
      'Import menu from photo with AI',
      'AI image generation',
      'Full analytics (complete history)',
      'Sound notifications',
      '2 admin users',
      'Online card payments (0% commission)',
      'Chat support (8h response)',
    ],
    excluded: [
      'Notificaciones email avanzadas',
      'Cocina KDS en tiempo real',
      'Promociones y cupones',
      'Reseñas de clientes',
      'Programa de lealtad',
      'Gestión de equipo',
      'Exportar reportes',
    ],
    excluded_en: [
      'Advanced email notifications',
      'Real-time kitchen KDS',
      'Promotions & coupons',
      'Customer reviews',
      'Loyalty program',
      'Team management',
      'Export reports',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para restaurantes que quieren crecer y vender más.',
    description_en: 'For restaurants ready to grow and sell more.',
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
      'Notificaciones por email',
      'Cocina KDS en tiempo real',
      'Promociones y cupones de descuento',
      'Reseñas de clientes',
      'Programa de lealtad para clientes',
      'Gestión de equipo (5 usuarios)',
      'Exportar reportes PDF / CSV',
      'Soporte por chat (respuesta en 2h)',
    ],
    features_en: [
      'Everything in Starter',
      'Up to 50 tables',
      'Email notifications',
      'Real-time kitchen KDS',
      'Promotions & discount coupons',
      'Customer reviews',
      'Customer loyalty program',
      'Team management (5 users)',
      'Export PDF / CSV reports',
      'Chat support (2h response)',
    ],
    excluded: [],
    excluded_en: [],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Para cadenas y franquicias con múltiples ubicaciones.',
    description_en: 'For chains & franchises with multiple locations.',
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
      'Dominio personalizado',
      'Exportar datos completos (CSV / Excel)',
      'Acceso API',
      'Onboarding personalizado 1:1 con el equipo MENIUS',
      'Account manager dedicado (chat)',
      'Soporte prioritario (respuesta < 1h)',
    ],
    features_en: [
      'Everything in Pro',
      'Unlimited tables & users',
      'Up to 3 branches included',
      'Custom domain',
      'Full data export (CSV / Excel)',
      'API access',
      'Personalized 1:1 onboarding with the MENIUS team',
      'Dedicated account manager (chat)',
      'Priority support (response < 1h)',
    ],
    excluded: [],
    excluded_en: [],
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
