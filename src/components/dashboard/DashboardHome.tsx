'use client';

import Link from 'next/link';
import {
  ClipboardList, ShoppingBag, QrCode, TrendingUp, ExternalLink,
  ArrowRight, Sparkles, AlertTriangle, CreditCard, Clock,
} from 'lucide-react';
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
  subscription?: {
    status: string;
    plan_id: string;
    trial_end?: string | null;
  } | null;
}

export function DashboardHome({ restaurant, stats, recentOrders, subscription }: DashboardHomeProps) {
  const kpis = [
    { label: 'Órdenes hoy', value: stats.ordersToday.toString(), icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', ringColor: 'ring-blue-100' },
    { label: 'Ventas hoy', value: formatPrice(stats.salesToday, restaurant.currency), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', ringColor: 'ring-emerald-100' },
    { label: 'Productos activos', value: stats.activeProducts.toString(), icon: ShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50', ringColor: 'ring-violet-100' },
    { label: 'Mesas activas', value: stats.activeTables.toString(), icon: QrCode, color: 'text-amber-600', bg: 'bg-amber-50', ringColor: 'ring-amber-100' },
  ];

  const isTrialing = subscription?.status === 'trialing';
  const trialDaysLeft = subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Bienvenido a {restaurant.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Aquí tienes un resumen de tu restaurante</p>
        </div>
        <Link
          href={`/r/${restaurant.slug}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-50 text-brand-700 text-sm font-medium hover:bg-brand-100 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver menú público
        </Link>
      </div>

      {/* Trial Banner */}
      {isTrialing && trialDaysLeft !== null && (
        <div className={cn(
          'rounded-2xl p-4 flex items-center justify-between gap-4',
          trialDaysLeft <= 3
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
            : 'bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              trialDaysLeft <= 3 ? 'bg-red-100' : 'bg-violet-100'
            )}>
              {trialDaysLeft <= 3
                ? <AlertTriangle className="w-5 h-5 text-red-600" />
                : <Sparkles className="w-5 h-5 text-violet-600" />
              }
            </div>
            <div className="min-w-0">
              <p className={cn('font-semibold text-sm', trialDaysLeft <= 3 ? 'text-red-800' : 'text-violet-800')}>
                {trialDaysLeft <= 3
                  ? `¡Tu prueba gratis termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}!`
                  : `${trialDaysLeft} días restantes de prueba gratis`
                }
              </p>
              <p className={cn('text-xs', trialDaysLeft <= 3 ? 'text-red-600' : 'text-violet-600')}>
                {trialDaysLeft <= 3
                  ? 'Elige un plan para no perder acceso'
                  : 'Disfruta todas las funciones mientras exploras MENIUS'
                }
              </p>
            </div>
          </div>
          <Link
            href="/app/billing"
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex-shrink-0',
              trialDaysLeft <= 3
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            )}
          >
            <CreditCard className="w-4 h-4" />
            Ver planes
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center ring-2', kpi.bg, kpi.ringColor)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pendingOrders > 0 && (
        <Link
          href="/app/orders"
          className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-amber-800">
                {stats.pendingOrders} {stats.pendingOrders === 1 ? 'orden pendiente' : 'órdenes pendientes'}
              </p>
              <p className="text-xs text-amber-600">Haz clic para gestionarlas</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
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
          <div className="p-10 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm font-medium">No hay órdenes aún</p>
            <p className="text-gray-300 text-xs mt-1">Comparte tu menú para empezar a recibir pedidos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
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
        <QuickLink href="/app/analytics" label="Ver analytics" icon={TrendingUp} />
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
        <Icon className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" />
      </div>
      <span className="font-medium text-sm text-gray-700">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
