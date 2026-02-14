import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, SelectedModifier } from '@/types/menu'

interface CartStore {
  items: CartItem[]
  restaurantId: string | null
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setRestaurant: (id: string) => void
  getItemCount: () => number
  getSubtotal: () => number
}

// Generate unique ID for cart items
const generateCartItemId = () => {
  return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      setRestaurant: (id: string) => {
        const currentRestaurantId = get().restaurantId
        
        // If switching restaurants, clear cart
        if (currentRestaurantId && currentRestaurantId !== id) {
          set({ items: [], restaurantId: id })
        } else {
          set({ restaurantId: id })
        }
      },

      addItem: (item) => {
        const cartItem: CartItem = {
          ...item,
          id: generateCartItemId()
        }
        
        set((state) => ({
          items: [...state.items, cartItem]
        }))
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        }))
      },

      clearCart: () => {
        set({ items: [], restaurantId: null })
      },

      getItemCount: () => {
        const items = get().items
        return items.reduce((count, item) => count + item.quantity, 0)
      },

      getSubtotal: () => {
        const items = get().items
        return items.reduce((total, item) => {
          const itemPrice = item.price
          const modifiersPrice = item.selected_modifiers.reduce(
            (sum, mod) => sum + mod.price,
            0
          )
          return total + (itemPrice + modifiersPrice) * item.quantity
        }, 0)
      }
    }),
    {
      name: 'menius-cart-storage',
      version: 1,
    }
  )
)

// Helper function to calculate item total including modifiers
export const calculateItemTotal = (item: CartItem): number => {
  const basePrice = item.price
  const modifiersTotal = item.selected_modifiers.reduce(
    (sum, mod) => sum + mod.price,
    0
  )
  return (basePrice + modifiersTotal) * item.quantity
}

// Helper function to format modifiers for display
export const formatModifiers = (modifiers: SelectedModifier[]): string => {
  if (modifiers.length === 0) return ''
  
  return modifiers
    .map(mod => {
      if (mod.price > 0) {
        return `${mod.option_name} (+$${mod.price.toFixed(2)})`
      }
      return mod.option_name
    })
    .join(', ')
}
