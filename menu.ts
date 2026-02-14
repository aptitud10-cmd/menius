// Types for Menu and Cart System

export interface Restaurant {
  id: string
  name: string
  slug: string
  description: string
  logo_url?: string
  cover_image_url?: string
  phone?: string
  address?: string
  is_active: boolean
  accepts_online_orders: boolean
  delivery_enabled: boolean
  pickup_enabled: boolean
  dine_in_enabled: boolean
  min_order_amount: number
  delivery_fee: number
  tax_rate: number
  business_hours?: BusinessHours
}

export interface BusinessHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
}

export interface DayHours {
  open: string // "09:00"
  close: string // "22:00"
  closed?: boolean
}

export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string
  price: number
  image_url?: string
  is_available: boolean
  is_featured: boolean
  is_popular?: boolean
  preparation_time_minutes?: number
  modifiers?: MenuModifier[]
  dietary_tags?: DietaryTag[]
  spicy_level?: 0 | 1 | 2 | 3 // 0 = not spicy, 3 = very spicy
}

export type DietaryTag = 
  | 'vegetarian' 
  | 'vegan' 
  | 'gluten-free' 
  | 'dairy-free' 
  | 'nut-free'

export interface MenuModifier {
  id: string
  name: string // "Tamaño", "Tipo de carne"
  required: boolean
  options: ModifierOption[]
}

export interface ModifierOption {
  id: string
  name: string // "Grande", "Pollo"
  price: number // Price difference (can be 0)
}

export interface CartItem {
  id: string // Unique ID for this cart item
  product_id: string
  name: string
  price: number
  image_url?: string
  quantity: number
  selected_modifiers: SelectedModifier[]
  special_instructions?: string
}

export interface SelectedModifier {
  modifier_id: string
  modifier_name: string
  option_id: string
  option_name: string
  price: number
}

export interface OrderType {
  type: 'delivery' | 'pickup' | 'dine_in'
  label: string
}

export interface CheckoutFormData {
  customer_name: string
  customer_phone: string
  customer_email?: string
  order_type: 'delivery' | 'pickup' | 'dine_in'
  table_number?: string
  delivery_address?: string
  special_instructions?: string
  payment_method: 'pay_on_arrival' | 'pay_online'
}

export interface OrderSummary {
  subtotal: number
  tax: number
  delivery_fee: number
  total: number
}
