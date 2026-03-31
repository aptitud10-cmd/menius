// ============================================================
// MENIUS — Types
// ============================================================

export type OrderType = 'dine_in' | 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'online' | 'wallet';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  timezone: string;
  currency: string;
  locale?: 'es' | 'en';
  available_locales?: string[];
  logo_url: string | null;
  cover_image_url?: string | null;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  google_business_url?: string | null;
  custom_domain?: string | null;
  operating_hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  notification_whatsapp?: string | null;
  notification_email?: string | null;
  notifications_enabled?: boolean;
  order_types_enabled?: OrderType[];
  payment_methods_enabled?: PaymentMethod[];
  estimated_delivery_minutes?: number | null;
  delivery_fee?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean;
  is_active?: boolean;
  created_at: string;
  // CFDI / fiscal data (Mexico)
  fiscal_rfc?: string | null;
  fiscal_razon_social?: string | null;
  fiscal_regimen_fiscal?: string | null;
  fiscal_lugar_expedicion?: string | null;
  // Tax configuration
  country_code?: string | null;
  state_code?: string | null;
  tax_rate?: number | null;
  tax_included?: boolean | null;
  tax_label?: string | null;
}

export interface CfdiRequest {
  id: string;
  order_id: string;
  restaurant_id: string;
  rfc: string;
  razon_social: string;
  cfdi_use: string;
  regimen_fiscal: string;
  cp_domicilio?: string | null;
  status: 'pending' | 'issued' | 'error';
  facturama_id?: string | null;
  xml_url?: string | null;
  pdf_url?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  role: 'super_admin' | 'owner' | 'staff';
  default_restaurant_id: string | null;
  created_at: string;
}

export interface ContentTranslation {
  name?: string;
  description?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  translations?: Record<string, ContentTranslation>;
  created_at: string;
  available_from?: string | null; // "HH:MM" 24h, null = always available
  available_to?: string | null;   // "HH:MM" 24h
}

export type DietaryTag =
  | 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free'
  | 'spicy' | 'contains_nuts' | 'keto' | 'organic' | 'halal' | 'kosher';

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  in_stock?: boolean;
  is_featured?: boolean;
  is_new?: boolean;
  prep_time_minutes?: number | null;
  translations?: Record<string, ContentTranslation>;
  dietary_tags?: DietaryTag[];
  sort_order: number;
  created_at: string;
  // joined (legacy)
  variants?: ProductVariant[];
  extras?: ProductExtra[];
  // joined (new modifier groups system)
  modifier_groups?: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  product_id: string;
  name: string;
  selection_type: 'single' | 'multi';
  min_select: number;
  max_select: number;
  is_required: boolean;
  sort_order: number;
  display_type?: 'list' | 'grid';
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
}

export interface ProductExtra {
  id: string;
  product_id: string;
  name: string;
  price: number;
  sort_order: number;
}

export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  qr_code_value: string;
  is_active: boolean;
  status?: TableStatus;
  capacity?: number;
  created_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  notes: string;
  total: number;
  tax_amount?: number;
  tip_amount?: number;
  delivery_fee?: number;
  discount_amount?: number;
  order_type?: OrderType;
  payment_method?: PaymentMethod;
  delivery_address?: string;
  table_name?: string | null;
  created_at: string;
  updated_at?: string;
  estimated_ready_minutes?: number;
  scheduled_for?: string | null;
  include_utensils?: boolean;
  payment_breakdown?: { cash?: number; card?: number; [key: string]: number | undefined } | null;
  // joined
  items?: OrderItem[];
  table?: Table;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
  notes: string;
  // joined
  product?: Product;
  variant?: ProductVariant;
  extras?: OrderItemExtra[];
}

export interface OrderItemExtra {
  id: string;
  order_item_id: string;
  extra_id: string;
  price: number;
  // joined
  extra?: ProductExtra;
}

// ---- Subscription / Billing ----
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

export interface Subscription {
  id: string;
  restaurant_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_id: string; // 'starter' | 'pro' | 'business'
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  max_orders_per_month: number | null;
  max_locations: number | null;
  created_at: string;
  updated_at: string;
}

// ---- Cart (client-side) ----
export interface ModifierSelection {
  group: ModifierGroup;
  selectedOptions: ModifierOption[];
}

export interface CartItem {
  uid?: string;
  product: Product;
  variant: ProductVariant | null;
  extras: ProductExtra[];
  modifierSelections: ModifierSelection[];
  qty: number;
  notes: string;
  lineTotal: number;
}
