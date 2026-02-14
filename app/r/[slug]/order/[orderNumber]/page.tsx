'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Home, Phone, Loader2 } from 'lucide-react'
import { getOrderByNumber } from '@/lib/orders'

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const orderNumber = parseInt(params.orderNumber as string)

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await getOrderByNumber(orderNumber)
        if (data) {
          setOrder(data)
        } else {
          setError('No se encontró la orden')
        }
      } catch (err) {
        console.error('Error loading order:', err)
        setError('Error al cargar la orden')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderNumber])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Orden no encontrada</h2>
          <p className="text-muted-foreground mb-6">{error || 'No pudimos encontrar esta orden'}</p>
          <Button onClick={() => router.push(`/r/${slug}`)}>
            Volver al menú
          </Button>
        </div>
      </div>
    )
  }

  const restaurant = order.restaurants

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">¡Pedido confirmado!</h1>
          <p className="text-muted-foreground">
            Tu pedido ha sido recibido exitosamente
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Número de pedido</p>
            <p className="text-4xl font-bold text-primary">#{order.order_number}</p>
            <p className="text-sm text-muted-foreground mt-2 capitalize">
              {order.order_type === 'delivery' && '🚴 Delivery'}
              {order.order_type === 'pickup' && '🏪 Recoger'}
              {order.order_type === 'dine_in' && '🍽️ Comer aquí'}
            </p>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <h2 className="font-semibold mb-4">{restaurant.name}</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground">Teléfono</p>
                <a 
                  href={`tel:${restaurant.phone}`}
                  className="font-medium text-primary hover:underline"
                >
                  {restaurant.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Home className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground">Dirección</p>
                <p className="font-medium">{restaurant.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">¿Qué sigue?</h3>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>• El restaurante está preparando tu pedido</li>
            <li>• Recibirás una notificación cuando esté listo</li>
            {order.payment_method === 'cash' && (
              <li>• Puedes pagar al momento de recoger tu pedido</li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push(`/r/${slug}`)}
            className="w-full"
            size="lg"
          >
            Hacer otro pedido
          </Button>
          
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Volver al inicio
          </Button>
        </div>

        {/* Support */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Problemas con tu pedido?{' '}
          <a 
            href={`tel:${restaurant.phone}`}
            className="text-primary hover:underline"
          >
            Llámanos
          </a>
        </p>
      </div>
    </div>
  )
}
