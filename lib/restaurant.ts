import { createClient } from '@/lib/supabase/client'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type OrderType = 'delivery' | 'pickup' | 'dine_in'

export interface OrderWithDetails {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  order_type: OrderType
  delivery_address: string | null
  table_number: string | null
  special_instructions: string | null
  subtotal: number
  tax_amount: number
  delivery_fee: number
  total_amount: number
  status: OrderStatus
  payment_status: string
  payment_method: string
  created_at: string
  updated_at: string
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    modifiers: string | null
    special_instructions: string | null
    subtotal: number
    menu_items: {
      name: string
      image_url: string | null
    }
  }>
}

/**
 * Get all orders for a restaurant
 */
export async function getRestaurantOrders(
  restaurantId: string,
  filters?: {
    status?: OrderStatus
    orderType?: OrderType
    fromDate?: string
    toDate?: string
  }
) {
  const supabase = createClient()

  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu_items (
          name,
          image_url
        )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.orderType) {
    query = query.eq('order_type', filters.orderType)
  }

  if (filters?.fromDate) {
    query = query.gte('created_at', filters.fromDate)
  }

  if (filters?.toDate) {
    query = query.lte('created_at', filters.toDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching restaurant orders:', error)
    return []
  }

  return data as OrderWithDetails[]
}

/**
 * Get orders count by status
 */
export async function getOrdersCountByStatus(restaurantId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('restaurant_id', restaurantId)

  if (error) {
    console.error('Error fetching orders count:', error)
    return {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0
    }
  }

  const counts = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0
  }

  data.forEach(order => {
    counts[order.status as OrderStatus]++
  })

  return counts
}

/**
 * Subscribe to new orders in real-time
 */
export function subscribeToOrders(
  restaurantId: string,
  onInsert: (order: any) => void,
  onUpdate: (order: any) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel('restaurant-orders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`
      },
      (payload) => {
        onInsert(payload.new)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`
      },
      (payload) => {
        onUpdate(payload.new)
      }
    )
    .subscribe()

  return channel
}
