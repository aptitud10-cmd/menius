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
    { label: 'Órdenes hoy', value: stats.ordersToday.toString(), icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/[0.1]', ring: 'ring-blue-500/20' },
    { label: 'Ventas hoy', value: formatPrice(stats.salesToday, restaurant.currency), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.1]', ring: 'ring-emerald-500/20' },
    { label: 'Productos activos', value: stats.activeProducts.toString(), icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-500/[0.1]', ring: 'ring-purple-500/20' },
    { label: 'Mesas activas', value: stats.activeTables.toString(), icon: QrCode, color: 'text-amber-400', bg: 'bg-amber-500/[0.1]', ring: 'ring-amber-500/20' },
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
          <h1 className="text-xl font-bold text-white">Bienvenido a {restaurant.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Aquí tienes un resumen de tu restaurante</p>
        </div>
        <Link
          href={`/r/${restaurant.slug}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/[0.1] text-purple-400 text-sm font-medium hover:bg-purple-500/[0.15] transition-colors border border-purple-500/[0.15]"
        >
          <ExternalLink className="w-4 h-4" />
          Ver menú público
        </Link>
      </div>

      {/* Trial Banner */}
      {isTrialing && trialDaysLeft !== null && (
        <div className={cn(
          'rounded-2xl p-4 flex items-center justify-between gap-4 border',
          trialDaysLeft <= 3
            ? 'bg-red-500/[0.06] border-red-500/[0.15]'
            : 'bg-purple-500/[0.06] border-purple-500/[0.15]'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              trialDaysLeft <= 3 ? 'bg-red-500/[0.15]' : 'bg-purple-500/[0.15]'
            )}>
              {trialDaysLeft <= 3
                ? <AlertTriangle className="w-5 h-5 text-red-400" />
                : <Sparkles className="w-5 h-5 text-purple-400" />
              }
            </div>
            <div className="min-w-0">
              <p className={cn('font-semibold text-sm', trialDaysLeft <= 3 ? 'text-red-300' : 'text-purple-300')}>
                {trialDaysLeft <= 3
                  ? `¡Tu prueba gratis termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}!`
                  : `${trialDaysLeft} días restantes de prueba gratis`
                }
              </p>
              <p className={cn('text-xs', trialDaysLeft <= 3 ? 'text-red-400/70' : 'text-purple-400/70')}>
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
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-purple-500 text-white hover:bg-purple-600'
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
          <div key={kpi.label} className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4 hover:border-white/[0.1] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center ring-2', kpi.bg, kpi.ring)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-white">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pendingOrders > 0 && (
        <Link
          href="/app/orders"
          className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.15] hover:bg-amber-500/[0.1] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/[0.15] flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-amber-300">
                {stats.pendingOrders} {stats.pendingOrders === 1 ? 'orden pendiente' : 'órdenes pendientes'}
              </p>
              <p className="text-xs text-amber-400/70">Haz clic para gestionarlas</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-500/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Recent orders */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06]">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-sm text-white">Últimas órdenes</h2>
          <Link href="/app/orders" className="text-xs text-purple-400 font-medium hover:text-purple-300 flex items-center gap-1 transition-colors">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm font-medium">No hay órdenes aún</p>
            <p className="text-gray-600 text-xs mt-1">Comparte tu menú para empezar a recibir pedidos</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentOrders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-gray-200 truncate">{order.customer_name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-600">{order.order_number} · {timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusCfg?.bg, statusCfg?.color)}>
                      {statusCfg?.label ?? order.status}
                    </span>
                    <span className="font-semibold text-sm text-white">{formatPrice(Number(order.total), restaurant.currency)}</span>
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
    <Link href={href} className="flex items-center gap-3 p-4 rounded-2xl bg-[#0a0a0a] border border-white/[0.06] hover:border-white/[0.1] transition-all group">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center group-hover:bg-purple-500/[0.1] transition-colors">
        <Icon className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
      </div>
      <span className="font-medium text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-700 ml-auto group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
