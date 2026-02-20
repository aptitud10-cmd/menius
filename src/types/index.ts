// ============================================================
// MENIUS — Types
// ============================================================

export type OrderType = 'dine_in' | 'pickup' | 'delivery';
export type PaymentMethod = 'cash' | 'online';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  timezone: string;
  currency: string;
  locale?: 'es' | 'en';
  logo_url: string | null;
  cover_image_url?: string | null;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  custom_domain?: string | null;
  operating_hours?: Record<string, { open: string; close: string; closed?: boolean }>;
  notification_whatsapp?: string | null;
  notification_email?: string | null;
  notifications_enabled?: boolean;
  order_types_enabled?: OrderType[];
  payment_methods_enabled?: PaymentMethod[];
  is_active?: boolean;
  created_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  role: 'super_admin' | 'owner' | 'staff';
  default_restaurant_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  is_featured?: boolean;
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

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  qr_code_value: string;
  is_active: boolean;
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
  order_type?: OrderType;
  payment_method?: PaymentMethod;
  delivery_address?: string;
  created_at: string;
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
  plan_id: string; // 'starter' | 'pro' | 'business'
  status: SubscriptionStatus;
  billing_interval: 'monthly' | 'annual';
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Cart (client-side) ----
export interface ModifierSelection {
  group: ModifierGroup;
  selectedOptions: ModifierOption[];
}

export interface CartItem {
  product: Product;
  variant: ProductVariant | null;
  extras: ProductExtra[];
  modifierSelections: ModifierSelection[];
  qty: number;
  notes: string;
  lineTotal: number;
}
