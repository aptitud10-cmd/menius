'use client'

import { useState } from 'react'
import { MenuItem, SelectedModifier } from '@/types/menu'
import { useCart } from '@/lib/stores/cartStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, Flame, Leaf } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ProductModalProps {
  product: MenuItem | null
  isOpen: boolean
  onClose: () => void
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const addItem = useCart(state => state.addItem)
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')

  if (!product) return null

  // Reset state when product changes
  const handleClose = () => {
    setQuantity(1)
    setSelectedModifiers([])
    setSpecialInstructions('')
    onClose()
  }

  // Handle modifier selection
  const handleModifierSelect = (
    modifierId: string,
    modifierName: string,
    optionId: string,
    optionName: string,
    price: number
  ) => {
    setSelectedModifiers(prev => {
      // Remove any previous selection for this modifier
      const filtered = prev.filter(m => m.modifier_id !== modifierId)
      
      // Add new selection
      return [
        ...filtered,
        {
          modifier_id: modifierId,
          modifier_name: modifierName,
          option_id: optionId,
          option_name: optionName,
          price
        }
      ]
    })
  }

  // Check if all required modifiers are selected
  const isValid = () => {
    if (!product.modifiers) return true
    
    const requiredModifiers = product.modifiers.filter(m => m.required)
    return requiredModifiers.every(rm =>
      selectedModifiers.some(sm => sm.modifier_id === rm.id)
    )
  }

  // Calculate total price
  const calculateTotal = () => {
    const basePrice = product.price
    const modifiersPrice = selectedModifiers.reduce((sum, m) => sum + m.price, 0)
    return (basePrice + modifiersPrice) * quantity
  }

  const handleAddToCart = () => {
    if (!isValid()) {
      toast.error('Por favor selecciona todas las opciones requeridas')
      return
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity,
      selected_modifiers: selectedModifiers,
      special_instructions: specialInstructions || undefined
    })

    toast.success('Agregado al carrito')
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Product image placeholder */}
          {product.image_url ? (
            <div className="w-full h-48 rounded-lg bg-gray-100 overflow-hidden mb-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
              <span className="text-6xl">🍽️</span>
            </div>
          )}

          <div className="space-y-2">
            <DialogTitle className="text-2xl">{product.name}</DialogTitle>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.is_popular && (
                <Badge variant="secondary">⭐ Popular</Badge>
              )}
              {product.spicy_level && product.spicy_level > 0 && (
                <Badge variant="outline" className="border-orange-200">
                  <Flame className="h-3 w-3 mr-1 text-orange-500" />
                  Picante nivel {product.spicy_level}
                </Badge>
              )}
              {product.dietary_tags?.includes('vegetarian') && (
                <Badge variant="outline" className="border-green-200">
                  <Leaf className="h-3 w-3 mr-1 text-green-600" />
                  Vegetariano
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground">{product.description}</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
          </div>
        </DialogHeader>

        {/* Modifiers */}
        {product.modifiers && product.modifiers.length > 0 && (
          <div className="space-y-6">
            {product.modifiers.map((modifier) => (
              <div key={modifier.id} className="space-y-3">
                <h3 className="font-semibold">
                  {modifier.name}
                  {modifier.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </h3>
                <div className="space-y-2">
                  {modifier.options.map((option) => {
                    const isSelected = selectedModifiers.some(
                      m => m.modifier_id === modifier.id && m.option_id === option.id
                    )

                    return (
                      <button
                        key={option.id}
                        onClick={() =>
                          handleModifierSelect(
                            modifier.id,
                            modifier.name,
                            option.id,
                            option.name,
                            option.price
                          )
                        }
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.name}</span>
                          {option.price !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              {option.price > 0 ? '+' : ''}
                              {formatCurrency(option.price)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Special instructions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Instrucciones especiales (opcional)
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Ej: Sin cebolla, extra salsa..."
            className="w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-4">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xl font-semibold w-12 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            disabled={!isValid()}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Agregar al carrito · {formatCurrency(calculateTotal())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
