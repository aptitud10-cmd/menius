import { z } from 'zod';

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres')
    .refine(v => !/@/.test(v), { message: 'Ingresa el nombre del restaurante, no un email' }),
  slug: z.string().min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  timezone: z.string().default('America/Mexico_City'),
  currency: z.string().default('MXN'),
  locale: z.enum(['es', 'en']).default('es'),
});

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
  dietary_tags: z.array(z.string()).optional(),
  translations: z.record(z.string(), contentTranslationSchema).nullable().optional(),
});

export const tableSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
});

const uuidOrNull = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().uuid().nullable()
);

export const publicOrderSchema = z.object({
  customer_name: z.string().min(1, 'Nombre requerido'),
  customer_phone: z.string().min(7, 'Teléfono requerido').regex(/^[+\d\s\-().]+$/, 'Teléfono inválido'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  order_type: z.enum(['dine_in', 'pickup', 'delivery']).default('dine_in'),
  payment_method: z.enum(['cash', 'online']).default('cash'),
  notes: z.string().default(''),
  tip_amount: z.number().min(0, 'La propina no puede ser negativa').max(1000, 'Propina máxima: $1,000').optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: uuidOrNull,
    qty: z.number().min(1).max(99, 'Cantidad máxima por producto: 99'),
    unit_price: z.number(),
    line_total: z.number(),
    notes: z.string().default(''),
    extras: z.array(z.object({
      extra_id: z.string().uuid(),
      price: z.number(),
    })).default([]),
    modifiers: z.array(z.object({
      group_id: z.string(),
      group_name: z.string(),
      option_id: z.string(),
      option_name: z.string(),
      price_delta: z.number(),
    })).default([]),
  })).min(1, 'Agrega al menos un producto').max(50, 'Máximo 50 productos por orden'),
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
});

export const reviewSubmitSchema = z.object({
  restaurant_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  customer_name: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).default(''),
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
  order_types: z.array(z.enum(['dine_in', 'pickup', 'delivery'])).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
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
