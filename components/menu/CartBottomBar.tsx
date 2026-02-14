'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/stores/cartStore'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface CartBottomBarProps {
  onViewCart: () => void
  minOrderAmount?: number
}

export function CartBottomBar({ onViewCart, minOrderAmount = 0 }: CartBottomBarProps) {
  const itemCount = useCart(state => state.getItemCount())
  const subtotal = useCart(state => state.getSubtotal())

  if (itemCount === 0) return null

  const meetsMinimum = subtotal >= minOrderAmount

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <Button
          onClick={onViewCart}
          className="w-full h-14 text-base font-semibold"
          size="lg"
        >
          <div className="flex items-center justify-between w-full">
            {/* Left side - Cart icon and count */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <span>Ver carrito</span>
            </div>

            {/* Right side - Total */}
            <span className="font-bold">{formatCurrency(subtotal)}</span>
          </div>
        </Button>

        {/* Minimum order warning */}
        {!meetsMinimum && minOrderAmount > 0 && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Pedido mínimo: {formatCurrency(minOrderAmount)} · Faltan{' '}
            {formatCurrency(minOrderAmount - subtotal)}
          </p>
        )}
      </div>
    </div>
  )
}
