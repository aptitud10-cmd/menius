// ============================================================
// MENIUS — Types
// ============================================================

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  timezone: string;
  currency: string;
  logo_url: string | null;
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
  sort_order: number;
  created_at: string;
  // joined
  variants?: ProductVariant[];
  extras?: ProductExtra[];
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
  notes: string;
  total: number;
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

// ---- Cart (client-side) ----
export interface CartItem {
  product: Product;
  variant: ProductVariant | null;
  extras: ProductExtra[];
  qty: number;
  notes: string;
  lineTotal: number;
}
