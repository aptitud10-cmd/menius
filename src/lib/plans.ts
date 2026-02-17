// ============================================================
// MENIUS — Subscription Plans Configuration
// ============================================================

export type PlanId = 'starter' | 'pro' | 'business';
export type BillingInterval = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  price: { monthly: number; annual: number };
  stripePriceId: { monthly: string; annual: string };
  limits: {
    maxProducts: number;
    maxTables: number;
    maxUsers: number;
    maxCategories: number;
    maxAiImages: number;
  };
  features: string[];
  excluded: string[];
  popular?: boolean;
}

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para restaurantes que inician su digitalización.',
    price: { monthly: 39, annual: 390 },
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? '',
    },
    limits: {
      maxProducts: 30,
      maxTables: 10,
      maxUsers: 1,
      maxCategories: 5,
      maxAiImages: 5,
    },
    features: [
      'Menú digital con fotos',
      'QR para hasta 10 mesas',
      'Pedidos online (dine-in + pickup)',
      'Notificaciones sonoras',
      'Generación de imágenes con IA (5/mes)',
      '1 usuario administrador',
      'Soporte por email',
    ],
    excluded: [
      'Delivery',
      'Notificaciones WhatsApp y email',
      'Analytics avanzado',
      'Promociones y cupones',
      'Reseñas de clientes',
      'Gestión de equipo',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para restaurantes que quieren crecer y vender más.',
    price: { monthly: 79, annual: 790 },
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
    },
    limits: {
      maxProducts: 200,
      maxTables: 50,
      maxUsers: 3,
      maxCategories: 20,
      maxAiImages: 50,
    },
    features: [
      'Todo lo de Starter',
      'Hasta 200 productos y 50 mesas',
      'Delivery + dirección de entrega',
      'Notificaciones WhatsApp y email',
      'Analytics avanzado',
      'Promociones y cupones de descuento',
      'Reseñas de clientes',
      'Gestión de equipo (3 usuarios)',
      'Imágenes IA (50/mes)',
      'Sin marca MENIUS en el menú',
      'Soporte prioritario (24h)',
    ],
    excluded: [],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Para restaurantes grandes y cadenas con múltiples ubicaciones.',
    price: { monthly: 149, annual: 1490 },
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? '',
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxUsers: -1,
      maxCategories: -1,
      maxAiImages: -1,
    },
    features: [
      'Todo lo de Pro',
      'Productos, mesas y usuarios ilimitados',
      'Imágenes IA ilimitadas',
      'Analytics avanzado + exportar datos',
      'Dominio personalizado',
      'Onboarding personalizado',
      'Soporte dedicado por WhatsApp',
    ],
    excluded: [],
  },
};

export function getPlan(planId: PlanId | string): PlanConfig | null {
  return PLANS[planId as PlanId] ?? null;
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
