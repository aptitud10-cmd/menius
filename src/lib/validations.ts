import { z } from 'zod';

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z.string().min(2, 'Mínimo 2 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  timezone: z.string().default('America/Mexico_City'),
  currency: z.string().default('MXN'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().default(''),
  price: z.number().min(0, 'Precio debe ser positivo'),
  category_id: z.string().uuid('Categoría requerida'),
  is_active: z.boolean().default(true),
});

export const tableSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
});

export const publicOrderSchema = z.object({
  customer_name: z.string().min(1, 'Nombre requerido'),
  notes: z.string().default(''),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable(),
    qty: z.number().min(1),
    unit_price: z.number(),
    line_total: z.number(),
    notes: z.string().default(''),
    extras: z.array(z.object({
      extra_id: z.string().uuid(),
      price: z.number(),
    })).default([]),
  })).min(1, 'Agrega al menos un producto'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type PublicOrderInput = z.infer<typeof publicOrderSchema>;
