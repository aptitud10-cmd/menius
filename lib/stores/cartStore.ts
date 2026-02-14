import { create } from 'zustand'
import { MenuItem } from '@/types/menu'

interface CartItem {
  item: MenuItem
  quantity: number
  notes?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: MenuItem, quantity: number, notes?: string) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (item, quantity, notes) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.item.id === item.id)
      
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.item.id === item.id
              ? { ...i, quantity: i.quantity + quantity, notes }
              : i
          ),
        }
      }
      
      return {
        items: [...state.items, { item, quantity, notes }],
      }
    })
  },
  
  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.item.id !== itemId),
    }))
  },
  
  updateQuantity: (itemId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.item.id === itemId ? { ...i, quantity } : i
      ),
    }))
  },
  
  clearCart: () => {
    set({ items: [] })
  },
  
  getTotal: () => {
    const state = get()
    return state.items.reduce((total, item) => {
      return total + item.item.price * item.quantity
    }, 0)
  },
}))
