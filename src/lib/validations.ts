import { z } from 'zod';

// Signup / login / onboarding wizard messages, in the interface language
// ('en' for English, Spanish otherwise).
const FORM_TEXT = {
  es: {
    nameMin: 'Escribe al menos 2 caracteres.',
    email: 'Ingresa un email válido.',
    passwordMin: 'Usa al menos 8 caracteres en la contraseña.',
    passwordRequired: 'Ingresa tu contraseña.',
    restaurantNameMin: 'El nombre debe tener al menos 2 caracteres.',
    restaurantNameMax: 'Usa 80 caracteres como máximo.',
    restaurantNameEmail: 'Escribe el nombre del restaurante, no un email.',
    slugMin: 'La URL debe tener al menos 2 caracteres.',
    slugFormat: 'Usa solo minúsculas, números y guiones en la URL.',
  },
  en: {
    nameMin: 'Enter at least 2 characters.',
    email: 'Enter a valid email.',
    passwordMin: 'Use at least 8 characters for your password.',
    passwordRequired: 'Enter your password.',
    restaurantNameMin: 'The name needs at least 2 characters.',
    restaurantNameMax: 'Use 80 characters or fewer.',
    restaurantNameEmail: "Enter your restaurant's name, not an email.",
    slugMin: 'The URL needs at least 2 characters.',
    slugFormat: 'Use only lowercase letters, numbers and hyphens in the URL.',
  },
} as const;

function formText(locale?: string | null) {
  return locale === 'en' ? FORM_TEXT.en : FORM_TEXT.es;
}

export function getSignupSchema(locale?: string | null) {
  const m = formText(locale);
  return z.object({
    full_name: z.string().min(2, m.nameMin).optional(),
    email: z.string().email(m.email),
    password: z.string().min(8, m.passwordMin),
  });
}

export function getLoginSchema(locale?: string | null) {
  const m = formText(locale);
  return z.object({
    email: z.string().email(m.email),
    password: z.string().min(1, m.passwordRequired),
  });
}

/** `locale` here is the interface language for messages, not the menu's `locale` field. */
export function getCreateRestaurantSchema(locale?: string | null) {
  const m = formText(locale);
  return z.object({
    name: z.string().min(2, m.restaurantNameMin).max(80, m.restaurantNameMax)
      .refine(v => !/@/.test(v), { message: m.restaurantNameEmail }),
    slug: z.string().min(2, m.slugMin)
      .regex(/^[a-z0-9-]+$/, m.slugFormat),
    country_code: z.string().min(2).max(2).transform(v => v.toUpperCase()).default('MX'),
    timezone: z.string().default('America/Mexico_City'),
    currency: z.string().default('MXN'),
    locale: z.enum(['es', 'en']).default('es'),
  });
}

export const signupSchema = getSignupSchema('es');
export const loginSchema = getLoginSchema('es');
export const createRestaurantSchema = getCreateRestaurantSchema('es');

const contentTranslationSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
  image_url: z.string().nullable().optional(),
  translations: z.record(z.string(), contentTranslationSchema).nullable().optional(),
  available_from: z.string().nullable().optional(), // "HH:MM" 24h
  available_to: z.string().nullable().optional(),   // "HH:MM" 24h
  send_to_kitchen: z.boolean().optional(),          // false = no va a la pantalla/ticket de cocina
  display_mode: z.enum(['grid', 'list']).nullable().optional(), // formato en el teléfono; null = automático
});

export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().default(''),
  price: z.number().min(0, 'Precio debe ser positivo'),
  category_id: z.string().uuid('Categoría requerida'),
  is_active: z.boolean().default(true),
  in_stock: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  dine_in_only: z.boolean().optional(),
  hide_image: z.boolean().optional(),
  prep_time_minutes: z.number().int().min(1).max(120).nullable().optional(),
  available_from: z.string().nullable().optional(),
  available_until: z.string().nullable().optional(),
  dietary_tags: z.array(z.string()).optional(),
  translations: z.record(z.string(), contentTranslationSchema).nullable().optional(),
  cost_price: z.number().min(0).nullable().optional(),
});

export const tableSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
});

const uuidOrNull = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().uuid().nullable()
);

const PHONE_RE = /^[+\d\s\-().]+$/;

// En mesa el teléfono es opcional (Pedro 2026-11-19): el pedido llega a la mesa,
// nadie llama. En pickup y delivery sigue siendo obligatorio.
export const publicOrderSchema = z.object({
  customer_name: z.string().min(1, 'Nombre requerido'),
  customer_phone: z.string().default(''),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  order_type: z.enum(['dine_in', 'pickup', 'delivery']).default('dine_in'),
  payment_method: z.enum(['cash', 'online', 'wallet']).default('cash'),
  notes: z.string().default(''),
  tip_amount: z.number().min(0, 'La propina no puede ser negativa').max(1000, 'Propina máxima: $1,000').optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: uuidOrNull,
    qty: z.number().int('La cantidad debe ser un número entero').min(1).max(99, 'Cantidad máxima por producto: 99'),
    // unit_price and line_total are optional — server always recalculates from DB
    unit_price: z.number().optional().default(0),
    line_total: z.number().optional().default(0),
    notes: z.string().default(''),
    extras: z.array(z.object({
      extra_id: z.string().uuid(),
      price: z.number().optional().default(0), // server recalculates from DB
    })).default([]),
    modifiers: z.array(z.object({
      group_id: z.string(),
      group_name: z.string(),
      option_id: z.string(),
      option_name: z.string(),
      price_delta: z.number().optional().default(0), // server recalculates from DB
    })).default([]),
  })).min(1, 'Agrega al menos un producto').max(50, 'Máximo 50 productos por orden'),
}).superRefine((d, ctx) => {
  const phone = d.customer_phone.trim();
  if (d.order_type === 'dine_in' && phone === '') return;
  if (phone.length < 7) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['customer_phone'], message: 'Teléfono requerido' });
  else if (!PHONE_RE.test(phone)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['customer_phone'], message: 'Teléfono inválido' });
});

// ── Billing schemas ──

export const changePlanSchema = z.object({
  plan_id: z.enum(['starter', 'pro', 'business']),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

export const createCheckoutSchema = z.object({
  plan_id: z.enum(['starter', 'pro', 'business']),
  interval: z.enum(['monthly', 'annual']).default('monthly'),
});

// ── Tenant schemas ──

export const staffSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: z.enum(['staff', 'manager']).default('staff'),
});

export const campaignSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  recipient_filter: z.enum(['all', 'recent', 'inactive']).default('all'),
});

export const smsCampaignSchema = z.object({
  message: z.string().min(1).max(1600),
  recipient_filter: z.enum(['all', 'recent', 'inactive']).default('all'),
});

export const promotionSchema = z.object({
  code: z.string().min(2).max(30).transform(v => v.toUpperCase().trim()),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().min(0),
  max_uses: z.number().int().min(0).default(0),
  min_order_amount: z.number().min(0).default(0),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: 100,
      type: 'number',
      inclusive: true,
      path: ['discount_value'],
      message: 'El descuento porcentual no puede superar el 100%',
    });
  }
});

export const reviewSubmitSchema = z.object({
  restaurant_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  customer_name: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(''),
  /** Reporte privado de un problema con el pedido: lo ve el dueño, no se publica. */
  issue: z.boolean().optional(),
});

export const restaurantUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  logo_url: z.string().url().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  locale: z.enum(['es', 'en']).optional(),
  theme_color: z.string().max(20).optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  order_types: z.array(z.enum(['dine_in', 'pickup', 'delivery'])).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  tax_included: z.boolean().optional(),
  tax_label: z.string().max(20).optional(),
  country_code: z.string().length(2).optional().nullable(),
  state_code: z.string().max(5).optional().nullable(),
}).partial();

// ── Payment schemas ──

export const paymentIntentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().int().min(1),
  currency: z.string().min(3).max(3).default('usd'),
});

export const paymentCheckoutSchema = z.object({
  order_id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  amount: z.number().int().min(1),
  currency: z.string().min(3).max(3).default('usd'),
  customer_email: z.string().email().optional(),
});

// ── Type exports ──

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type PublicOrderInput = z.infer<typeof publicOrderSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type SmsCampaignInput = z.infer<typeof smsCampaignSchema>;
export type PromotionInput = z.infer<typeof promotionSchema>;
export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type PaymentCheckoutInput = z.infer<typeof paymentCheckoutSchema>;
