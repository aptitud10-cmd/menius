'use client'

import { OrderWithDetails, OrderStatus } from '@/lib/restaurant'
import { updateOrderStatus } from '@/lib/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { 
  Clock, 
  Phone, 
  MapPin, 
  Utensils,
  CheckCircle2,
  ChefHat,
  Package,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface OrderCardProps {
  order: OrderWithDetails
  onStatusUpdate: () => void
}

const statusConfig: Record<OrderStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
  nextStatus?: OrderStatus
  nextLabel?: string
}> = {
  pending: {
    label: 'Pendiente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: <Clock className="h-4 w-4" />,
    nextStatus: 'confirmed',
    nextLabel: 'Confirmar'
  },
  confirmed: {
    label: 'Confirmada',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    nextStatus: 'preparing',
    nextLabel: 'Preparar'
  },
  preparing: {
    label: 'Preparando',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
    icon: <ChefHat className="h-4 w-4" />,
    nextStatus: 'ready',
    nextLabel: 'Marcar lista'
  },
  ready: {
    label: 'Lista',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    icon: <Package className="h-4 w-4" />,
    nextStatus: 'completed',
    nextLabel: 'Completar'
  },
  completed: {
    label: 'Completada',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-200',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    icon: <XCircle className="h-4 w-4" />
  }
}

const orderTypeLabels = {
  delivery: { label: 'Delivery', icon: '🚴' },
  pickup: { label: 'Recoger', icon: '🏪' },
  dine_in: { label: 'Comer aquí', icon: '🍽️' }
}

export function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const statusInfo = statusConfig[order.status]
  const orderTypeInfo = orderTypeLabels[order.order_type]

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      toast.success('Estado actualizado')
      onStatusUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar estado')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de cancelar esta orden?')) return
    await handleUpdateStatus('cancelled')
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-bold">#{order.order_number}</h3>
            <Badge className={statusInfo.bgColor + ' ' + statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1.5">{statusInfo.label}</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(order.total_amount)}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end mt-1">
            {orderTypeInfo.icon} {orderTypeInfo.label}
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{order.customer_name}</span>
          <span className="text-muted-foreground">·</span>
          <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">
            {order.customer_phone}
          </a>
        </div>

        {order.delivery_address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{order.delivery_address}</span>
          </div>
        )}

        {order.table_number && (
          <div className="flex items-center gap-2 text-sm">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Mesa {order.table_number}</span>
          </div>
        )}

        {order.special_instructions && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> {order.special_instructions}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-sm">Platillos:</h4>
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div>
              <span className="font-medium">{item.quantity}x</span>{' '}
              <span>{item.menu_items.name}</span>
              {item.modifiers && (
                <p className="text-xs text-muted-foreground ml-6">
                  {JSON.parse(item.modifiers).map((m: any) => m.option_name).join(', ')}
                </p>
              )}
              {item.special_instructions && (
                <p className="text-xs text-muted-foreground italic ml-6">
                  Nota: {item.special_instructions}
                </p>
              )}
            </div>
            <span className="text-muted-foreground">
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {statusInfo.nextStatus && (
          <Button
            onClick={() => handleUpdateStatus(statusInfo.nextStatus!)}
            disabled={isUpdating}
            className="flex-1"
          >
            {statusInfo.nextLabel}
          </Button>
        )}

        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
