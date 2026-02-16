'use client';

import Link from 'next/link';
import { ClipboardList, ShoppingBag, QrCode, TrendingUp, ExternalLink, ArrowRight } from 'lucide-react';
import { formatPrice, timeAgo } from '@/lib/utils';
import { ORDER_STATUS_CONFIG } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Order, Restaurant } from '@/types';

interface DashboardHomeProps {
  restaurant: Restaurant;
  stats: {
    ordersToday: number;
    salesToday: number;
    activeProducts: number;
    activeTables: number;
    pendingOrders: number;
  };
  recentOrders: Order[];
}

export function DashboardHome({ restaurant, stats, recentOrders }: DashboardHomeProps) {
  const kpis = [
    { label: 'Órdenes hoy', value: stats.ordersToday.toString(), icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ventas hoy', value: formatPrice(stats.salesToday, restaurant.currency), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Productos activos', value: stats.activeProducts.toString(), icon: ShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Mesas activas', value: stats.activeTables.toString(), icon: QrCode, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold">Bienvenido a {restaurant.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aquí tienes un resumen de tu restaurante</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pendingOrders > 0 && (
        <Link
          href="/app/orders"
          className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-amber-800">
                {stats.pendingOrders} {stats.pendingOrders === 1 ? 'orden pendiente' : 'órdenes pendientes'}
              </p>
              <p className="text-xs text-amber-600">Haz clic para gestionarlas</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400" />
        </Link>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm">Últimas órdenes</h2>
          <Link href="/app/orders" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No hay órdenes aún. Comparte tu menú para empezar a recibir pedidos.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium truncate">{order.customer_name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-400">{order.order_number} · {timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusCfg?.bg, statusCfg?.color)}>
                      {statusCfg?.label ?? order.status}
                    </span>
                    <span className="font-semibold text-sm">{formatPrice(Number(order.total), restaurant.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink href="/app/orders" label="Gestionar órdenes" icon={ClipboardList} />
        <QuickLink href="/app/menu/products" label="Editar menú" icon={ShoppingBag} />
        <QuickLink href={`/r/${restaurant.slug}`} label="Ver menú público" icon={ExternalLink} external />
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon, external }: { href: string; label: string; icon: any; external?: boolean }) {
  const cls = "flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all group";
  const content = (
    <>
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-brand-50">
        <Icon className="w-5 h-5 text-gray-400 group-hover:text-brand-600" />
      </div>
      <span className="font-medium text-sm text-gray-700">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-brand-600" />
    </>
  );

  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
  }
  return <Link href={href} className={cls}>{content}</Link>;
}
