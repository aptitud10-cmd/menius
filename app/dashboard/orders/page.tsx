'use client'

import { useEffect, useState } from 'react'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { OrderCard } from '@/components/dashboard/OrderCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getRestaurantOrders, 
  subscribeToOrders,
  OrderWithDetails,
  OrderStatus,
  OrderType,
  getOrdersCountByStatus
} from '@/lib/restaurant'
import { mockRestaurant } from '@/lib/mockData'
import { Loader2, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listas' },
  { value: 'completed', label: 'Completadas' }
]

const orderTypeFilters: { value: OrderType | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Recoger' },
  { value: 'dine_in', label: 'Comer aquí' }
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all')
  const [counts, setCounts] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0
  })

  const loadOrders = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }
      
      if (typeFilter !== 'all') {
        filters.orderType = typeFilter
      }

      const data = await getRestaurantOrders(mockRestaurant.id, filters)
      setOrders(data)

      // Load counts
      const countsData = await getOrdersCountByStatus(mockRestaurant.id)
      setCounts(countsData)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Error al cargar órdenes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()

    // Subscribe to real-time updates
    const channel = subscribeToOrders(
      mockRestaurant.id,
      (newOrder) => {
        toast.success(`Nueva orden #${newOrder.order_number}`, {
          icon: '🔔',
          duration: 5000
        })
        loadOrders()
      },
      (updatedOrder) => {
        loadOrders()
      }
    )

    return () => {
      channel.unsubscribe()
    }
  }, [statusFilter, typeFilter])

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar restaurantName={mockRestaurant.name} />

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="container mx-auto px-4 py-8 lg:py-6">
          {/* Header */}
          <div className="mb-8 mt-16 lg:mt-0">
            <h1 className="text-3xl font-bold mb-2">Órdenes</h1>
            <p className="text-muted-foreground">
              Gestiona todas las órdenes de tu restaurante
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-sm text-muted-foreground mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600">{counts.pending}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-sm text-muted-foreground mb-1">Preparando</p>
              <p className="text-3xl font-bold text-orange-600">{counts.preparing}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-sm text-muted-foreground mb-1">Listas</p>
              <p className="text-3xl font-bold text-green-600">{counts.ready}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-sm text-muted-foreground mb-1">Hoy</p>
              <p className="text-3xl font-bold text-primary">
                {counts.pending + counts.confirmed + counts.preparing + counts.ready}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Status filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estado:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value as OrderStatus | 'all')}
                  >
                    {filter.label}
                    {filter.value !== 'all' && filter.value !== 'completed' && (
                      <Badge variant="secondary" className="ml-2">
                        {counts[filter.value as keyof typeof counts]}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Order type filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tipo:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {orderTypeFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={typeFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(filter.value as OrderType | 'all')}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border">
              <p className="text-muted-foreground mb-2">No hay órdenes</p>
              <p className="text-sm text-muted-foreground">
                Las nuevas órdenes aparecerán aquí automáticamente
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onStatusUpdate={loadOrders}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
