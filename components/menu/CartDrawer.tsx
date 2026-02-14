'use client'

import { useCart, calculateItemTotal, formatModifiers } from '@/lib/stores/cartStore'
import { Restaurant } from '@/types/menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  restaurant: Restaurant
  onCheckout: () => void
}

export function CartDrawer({
  isOpen,
  onClose,
  restaurant,
  onCheckout
}: CartDrawerProps) {
  const items = useCart(state => state.items)
  const updateQuantity = useCart(state => state.updateQuantity)
  const removeItem = useCart(state => state.removeItem)
  const clearCart = useCart(state => state.clearCart)
  const subtotal = useCart(state => state.getSubtotal())

  const tax = subtotal * restaurant.tax_rate
  const total = subtotal + tax

  const meetsMinimum = subtotal >= restaurant.min_order_amount

  if (items.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Tu carrito</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
            <p className="text-muted-foreground mb-6">
              Agrega algunos platillos para empezar tu pedido
            </p>
            <Button onClick={onClose}>Ver menú</Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Tu carrito ({items.length})</SheetTitle>
        </SheetHeader>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 my-6">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex gap-3">
                  {/* Item image */}
                  {item.image_url ? (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-xl">🍽️</span>
                    </div>
                  )}

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                    
                    {/* Modifiers */}
                    {item.selected_modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatModifiers(item.selected_modifiers)}
                      </p>
                    )}

                    {/* Special instructions */}
                    {item.special_instructions && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        Nota: {item.special_instructions}
                      </p>
                    )}

                    {/* Price and quantity controls */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold text-primary">
                        {formatCurrency(calculateItemTotal(item))}
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clear cart button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="w-full mt-4 text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vaciar carrito
          </Button>
        </div>

        {/* Summary and checkout */}
        <div className="border-t pt-4 space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Impuesto ({(restaurant.tax_rate * 100).toFixed(2)}%)
              </span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Minimum order warning */}
          {!meetsMinimum && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Pedido mínimo: {formatCurrency(restaurant.min_order_amount)}
                <br />
                <span className="font-medium">
                  Faltan {formatCurrency(restaurant.min_order_amount - subtotal)}
                </span>
              </p>
            </div>
          )}

          {/* Checkout button */}
          <Button
            onClick={onCheckout}
            disabled={!meetsMinimum}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Continuar al checkout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
