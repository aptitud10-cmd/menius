import { createClient } from '@/lib/supabase/client'
import { CartItem } from '@/types/menu'

export interface CreateOrderData {
  restaurant_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  order_type: 'delivery' | 'pickup' | 'dine_in'
  delivery_address?: string
  table_number?: string
  special_instructions?: string
  subtotal: number
  tax: number
  delivery_fee: number
  total: number
  items: CartItem[]
}

export interface OrderResponse {
  success: boolean
  order_id?: string
  order_number?: number
  error?: string
}

/**
 * Create a new order in Supabase
 */
export async function createOrder(data: CreateOrderData): Promise<OrderResponse> {
  const supabase = createClient()

  try {
    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: data.restaurant_id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        order_type: data.order_type,
        delivery_address: data.delivery_address || null,
        table_number: data.table_number || null,
        special_instructions: data.special_instructions || null,
        subtotal: data.subtotal,
        tax_amount: data.tax,
        delivery_fee: data.delivery_fee,
        total_amount: data.total,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash', // Default to cash for now
      })
      .select('id, order_number')
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return {
        success: false,
        error: orderError.message
      }
    }

    if (!order) {
      return {
        success: false,
        error: 'No order returned from database'
      }
    }

    // 2. Create order items
    const orderItems = data.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      modifiers: item.selected_modifiers.length > 0 
        ? JSON.stringify(item.selected_modifiers)
        : null,
      special_instructions: item.special_instructions || null,
      subtotal: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Note: Order was created but items failed
      // In production, you might want to rollback or handle this differently
      return {
        success: false,
        error: 'Order created but failed to add items: ' + itemsError.message
      }
    }

    // 3. Success!
    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number
    }

  } catch (error) {
    console.error('Unexpected error creating order:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu_items (
          name,
          image_url
        )
      ),
      restaurants (
        name,
        phone,
        address
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  return data
}

/**
 * Get order by order number
 */
export async function getOrderByNumber(orderNumber: number) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu_items (
          name,
          image_url
        )
      ),
      restaurants (
        name,
        phone,
        address
      )
    `)
    .eq('order_number', orderNumber)
    .single()

  if (error) {
    console.error('Error fetching order:', error)
    return null
  }

  return data
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('Error updating order status:', error)
    return null
  }

  return data
}
