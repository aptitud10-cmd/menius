'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCart, calculateItemTotal } from '@/lib/stores/cartStore'
import { createOrder } from '@/lib/orders'
import { mockRestaurant } from '@/lib/mockData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency } from '@/lib/utils'
import { Bike, Store, UtensilsCrossed, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type OrderType = 'delivery' | 'pickup' | 'dine_in'

interface OrderTypeOption {
  value: OrderType
  label: string
  icon: React.ReactNode
  enabled: boolean
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const items = useCart(state => state.items)
  const clearCart = useCart(state => state.clearCart)
  const subtotal = useCart(state => state.getSubtotal())

  // Form state
  const [orderType, setOrderType] = useState<OrderType>('pickup')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculations
  const tax = subtotal * mockRestaurant.tax_rate
  const deliveryFee = orderType === 'delivery' ? mockRestaurant.delivery_fee : 0
  const total = subtotal + tax + deliveryFee

  // Order type options
  const orderTypeOptions: OrderTypeOption[] = [
    {
      value: 'pickup',
      label: 'Recoger',
      icon: <Store className="h-5 w-5" />,
      enabled: mockRestaurant.pickup_enabled
    },
    {
      value: 'delivery',
      label: 'Delivery',
      icon: <Bike className="h-5 w-5" />,
      enabled: mockRestaurant.delivery_enabled
    },
    {
      value: 'dine_in',
      label: 'Comer aquí',
      icon: <UtensilsCrossed className="h-5 w-5" />,
      enabled: mockRestaurant.dine_in_enabled
    }
  ]

  // Validation
  const isValid = () => {
    if (!customerName.trim()) return false
    if (!customerPhone.trim()) return false
    if (orderType === 'delivery' && !deliveryAddress.trim()) return false
    if (orderType === 'dine_in' && !tableNumber.trim()) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid()) {
      toast.error('Por favor completa todos los campos requeridos')
      return
    }

    setIsSubmitting(true)

    try {
      // Create order in Supabase
      const result = await createOrder({
        restaurant_id: mockRestaurant.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || undefined,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress : undefined,
        table_number: orderType === 'dine_in' ? tableNumber : undefined,
        special_instructions: specialInstructions || undefined,
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        total,
        items
      })

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la orden')
      }

      // Clear cart
      clearCart()

      // Navigate to confirmation
      router.push(`/r/${slug}/order/${result.order_number}`)
      
      toast.success('¡Pedido confirmado!')
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar el pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tu carrito está vacío</h2>
          <p className="text-muted-foreground mb-6">
            Agrega algunos platillos para hacer tu pedido
          </p>
          <Button onClick={() => router.push(`/r/${slug}`)}>
            Ver menú
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Finalizar pedido</h1>
        <p className="text-muted-foreground mb-8">
          {mockRestaurant.name}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Order Type Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Tipo de pedido</h2>
            <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as OrderType)}>
              <div className="grid gap-3">
                {orderTypeOptions.filter(opt => opt.enabled).map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      orderType === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex items-center gap-3 flex-1">
                      {option.icon}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {option.value === 'delivery' && (
                      <span className="text-sm text-muted-foreground">
                        +{formatCurrency(mockRestaurant.delivery_fee)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Tus datos</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Nombre completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              {orderType === 'delivery' && (
                <div>
                  <Label htmlFor="address">
                    Dirección de entrega <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Calle, número, colonia, referencias..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}

              {orderType === 'dine_in' && (
                <div>
                  <Label htmlFor="table">
                    Número de mesa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="table"
                    type="text"
                    placeholder="Ej: 5"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Instrucciones especiales (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Alergias, preferencias, etc."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Resumen del pedido</h2>
            
            {/* Items */}
            <div className="space-y-3 mb-4 pb-4 border-b">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.quantity}x {item.name}
                    </p>
                    {item.selected_modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.selected_modifiers.map(m => m.option_name).join(', ')}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">{formatCurrency(calculateItemTotal(item))}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Impuesto ({(mockRestaurant.tax_rate * 100).toFixed(2)}%)
                </span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              💳 <strong>Pago en el local</strong> - No es necesario pagar ahora. 
              Puedes pagar cuando recojas o recibas tu pedido.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isValid() || isSubmitting}
            className="w-full h-14 text-base font-semibold"
            size="lg"
          >
            {isSubmitting ? 'Enviando pedido...' : `Confirmar pedido · ${formatCurrency(total)}`}
          </Button>
        </form>
      </div>
    </div>
  )
}
