'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList, ShoppingBag, QrCode, TrendingUp, ExternalLink,
  ArrowRight, Sparkles, AlertTriangle, CreditCard, Clock,
  Copy, Check, Share2, MessageCircle, BarChart3, PieChart, Flame,
} from 'lucide-react';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { OnboardingChecklist } from './OnboardingChecklist';
import type { Order, Restaurant } from '@/types';

interface AnalyticsData {
  chartData: { date: string; label: string; orders: number; revenue: number }[];
  hourlyData: { hour: string; count: number }[];
  topProducts: { name: string; qty: number }[];
  orderTypeCounts: { dine_in: number; pickup: number; delivery: number };
}

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
  onboarding?: {
    hasLogo: boolean;
    hasProfile: boolean;
    hasHours: boolean;
    hasProducts: boolean;
    hasTables: boolean;
    hasOrders: boolean;
  };
  analytics?: AnalyticsData;
}

export function DashboardHome({ restaurant, stats, recentOrders, subscription, onboarding, analytics }: DashboardHomeProps) {
  const kpis = [
    { label: 'Órdenes hoy', value: stats.ordersToday.toString(), icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/[0.1]', ring: 'ring-blue-500/20' },
    { label: 'Ventas hoy', value: formatPrice(stats.salesToday, restaurant.currency), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.1]', ring: 'ring-emerald-500/20' },
    { label: 'Productos activos', value: stats.activeProducts.toString(), icon: ShoppingBag, color: 'text-indigo-500', bg: 'bg-indigo-500/[0.1]', ring: 'ring-indigo-500/20' },
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
          <h1 className="dash-heading">{restaurant.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de hoy</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareMenuButton slug={restaurant.slug} name={restaurant.name} />
          <Link
            href={`/r/${restaurant.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors border border-emerald-200"
          >
            <ExternalLink className="w-4 h-4" />
            Ver menú
          </Link>
        </div>
      </div>

      {/* Trial Banner */}
      {isTrialing && trialDaysLeft !== null && (
        <div className={cn(
          'rounded-2xl p-4 flex items-center justify-between gap-4 border',
          trialDaysLeft <= 3
            ? 'bg-red-500/[0.06] border-red-500/[0.15]'
            : 'bg-emerald-50 border-emerald-200'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              trialDaysLeft <= 3 ? 'bg-red-500/[0.15]' : 'bg-emerald-50'
            )}>
              {trialDaysLeft <= 3
                ? <AlertTriangle className="w-5 h-5 text-red-400" />
                : <Sparkles className="w-5 h-5 text-emerald-600" />
              }
            </div>
            <div className="min-w-0">
              <p className={cn('font-semibold text-sm', trialDaysLeft <= 3 ? 'text-red-700' : 'text-emerald-700')}>
                {trialDaysLeft <= 3
                  ? `¡Tu prueba gratis termina en ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''}!`
                  : `${trialDaysLeft} días restantes de prueba gratis`
                }
              </p>
              <p className={cn('text-xs', trialDaysLeft <= 3 ? 'text-red-500/80' : 'text-emerald-600/80')}>
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
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            <CreditCard className="w-4 h-4" />
            Ver planes
          </Link>
        </div>
      )}

      {/* Onboarding Checklist */}
      {onboarding && (
        <OnboardingChecklist restaurantSlug={restaurant.slug} steps={onboarding} />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="dash-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-medium text-gray-500">{kpi.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
            </div>
            <p className="text-[1.75rem] font-bold tracking-tight text-gray-900 leading-none">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Analytics */}
      {analytics && <AnalyticsSection analytics={analytics} currency={restaurant.currency} />}

      {/* Pending alert */}
      {stats.pendingOrders > 0 && (
        <Link
          href="/app/orders"
          className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.15] hover:bg-amber-500/[0.1] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-amber-700">
                {stats.pendingOrders} {stats.pendingOrders === 1 ? 'orden pendiente' : 'órdenes pendientes'}
              </p>
              <p className="text-xs text-amber-600/70">Haz clic para gestionarlas</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Recent orders */}
      <div className="dash-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[15px] text-gray-900">Últimas órdenes</h2>
          <Link href="/app/orders" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 transition-colors">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="dash-empty py-10">
            <ClipboardList className="dash-empty-icon w-8 h-8" />
            <p className="dash-empty-title text-sm">No hay órdenes aún</p>
            <p className="dash-empty-desc text-xs">Comparte tu menú QR para empezar a recibir pedidos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700 truncate">{order.customer_name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{order.order_number} · {timeAgo(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', statusCfg?.bg, statusCfg?.color)}>
                      {statusCfg?.label ?? order.status}
                    </span>
                    <span className="font-semibold text-sm text-gray-900">{formatPrice(Number(order.total), restaurant.currency)}</span>
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
        <QuickLink href="/app/tables" label="Mesas y QR" icon={QrCode} />
      </div>

      {/* Getting started CTA for new restaurants */}
      {stats.activeProducts === 0 && (
        <EmptyRestaurantCTA restaurantSlug={restaurant.slug} />
      )}
    </div>
  );
}

function EmptyRestaurantCTA({ restaurantSlug }: { restaurantSlug: string }) {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState('');

  const handleSeed = async () => {
    setSeeding(true);
    setError('');
    try {
      const { reseedMyRestaurant } = await import('@/lib/actions/restaurant');
      const result = await reseedMyRestaurant();
      if (result?.error) {
        setError(result.error);
      } else {
        setSeeded(true);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      setError('Error al generar datos de ejemplo');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-gray-50 p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {seeded ? '¡Menú de ejemplo creado!' : 'Tu restaurante está listo'}
      </h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
        {seeded
          ? 'Ya tienes categorías, productos y mesas de ejemplo. Edítalos desde tu dashboard.'
          : 'Puedes agregar productos manualmente o cargar un menú de ejemplo para ver cómo funciona.'}
      </p>
      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}
      {!seeded && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {seeding ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Cargar menú de ejemplo
              </>
            )}
          </button>
          <Link
            href="/app/menu/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Agregar manualmente
          </Link>
        </div>
      )}
      {seeded && (
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/app/menu/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Ver mis productos
          </Link>
          <Link
            href={`/r/${restaurantSlug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver mi menú
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <Link href={href} className="dash-card flex items-center gap-3 p-4 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
        <Icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
      </div>
      <span className="font-medium text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
      <ArrowRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

/* ─── Analytics Section ─── */

function AnalyticsSection({ analytics, currency }: { analytics: AnalyticsData; currency: string }) {
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const { chartData, hourlyData, topProducts, orderTypeCounts } = analytics;

  const totalWeekRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalWeekOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const maxVal = Math.max(...chartData.map((d) => (chartMode === 'revenue' ? d.revenue : d.orders)), 1);

  const totalOrders = orderTypeCounts.dine_in + orderTypeCounts.pickup + orderTypeCounts.delivery;
  const orderTypeSlices = [
    { label: 'En local', value: orderTypeCounts.dine_in, color: '#10b981' },
    { label: 'Para llevar', value: orderTypeCounts.pickup, color: '#6366f1' },
    { label: 'Delivery', value: orderTypeCounts.delivery, color: '#f59e0b' },
  ].filter((s) => s.value > 0);

  const maxHourly = Math.max(...hourlyData.map((h) => h.count), 1);
  const peakHour = hourlyData.reduce((best, h) => (h.count > best.count ? h : best), hourlyData[0]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-[15px] text-gray-900">Analytics</h2>
        <span className="text-xs text-gray-400 ml-1">Últimos 7 días</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue / Orders chart */}
        <div className="lg:col-span-2 dash-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {chartMode === 'revenue' ? formatPrice(totalWeekRevenue, currency) : totalWeekOrders}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {chartMode === 'revenue' ? 'Ingresos en 7 días' : 'Órdenes en 7 días'}
              </p>
            </div>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => setChartMode('revenue')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  chartMode === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Ingresos
              </button>
              <button
                onClick={() => setChartMode('orders')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  chartMode === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Órdenes
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div className="mt-4 flex items-end gap-2 h-40">
            {chartData.map((d) => {
              const val = chartMode === 'revenue' ? d.revenue : d.orders;
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              const isToday = d.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[11px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {chartMode === 'revenue' ? formatPrice(val, currency) : val}
                  </span>
                  <div className="w-full relative">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all duration-300 min-h-[4px]',
                        isToday ? 'bg-emerald-500' : 'bg-emerald-200 group-hover:bg-emerald-400'
                      )}
                      style={{ height: `${Math.max(pct, 3)}%`, maxHeight: '128px', minHeight: `${Math.max(pct * 1.28, 4)}px` }}
                    />
                  </div>
                  <span className={cn('text-[11px] font-medium', isToday ? 'text-emerald-600' : 'text-gray-400')}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order types donut */}
        <div className="dash-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de orden</p>
          </div>
          {totalOrders === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-400">Sin datos aún</p>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center">
                <DonutChart slices={orderTypeSlices} total={totalOrders} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {orderTypeSlices.map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-600">{s.label}</span>
                    <span className="text-xs font-semibold text-gray-900">{Math.round((s.value / totalOrders) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos populares</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sin datos aún</p>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const pct = (p.qty / topProducts[0].qty) * 100;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                        <span className="text-xs font-semibold text-gray-500 tabular-nums ml-2">{p.qty} uds</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-emerald-400' : 'bg-emerald-300'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hourly distribution */}
        <div className="dash-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horarios pico</p>
            </div>
            {peakHour && peakHour.count > 0 && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                Pico: {peakHour.hour}
              </span>
            )}
          </div>
          <div className="flex items-end gap-px h-28">
            {hourlyData.map((h) => {
              const pct = maxHourly > 0 ? (h.count / maxHourly) * 100 : 0;
              const hour = parseInt(h.hour);
              const isActive = hour >= 8 && hour <= 22;
              if (!isActive && h.count === 0) return null;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                  <span className="text-[9px] font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.count}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t transition-all duration-200 min-h-[2px]',
                      h.count === peakHour?.count && h.count > 0
                        ? 'bg-emerald-500'
                        : h.count > 0
                          ? 'bg-emerald-200 group-hover:bg-emerald-400'
                          : 'bg-gray-100'
                    )}
                    style={{ height: `${Math.max(pct * 1.12, 2)}px` }}
                  />
                  {hour % 3 === 0 && (
                    <span className="text-[9px] text-gray-400">{hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SVG Donut ─── */

function DonutChart({ slices, total }: { slices: { label: string; value: number; color: string }[]; total: number }) {
  const size = 100;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {slices.map((slice) => {
        const pct = slice.value / total;
        const dashLength = pct * circumference;
        const dashGap = circumference - dashLength;
        const currentOffset = offset;
        offset += dashLength;
        return (
          <circle
            key={slice.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${dashGap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

function ShareMenuButton({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${slug}` : `/r/${slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[DashboardHome] copyLink failed:', err);
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`¡Mira el menú de ${name}! Pide directo desde tu celular:\n${menuUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Menú de ${name}`,
          text: `¡Mira nuestro menú digital!`,
          url: menuUrl,
        });
      } catch (err) {
        console.error('[DashboardHome] shareNative failed:', err);
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Compartir
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
            <button
              onClick={() => { copyLink(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-500" />}
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
            <button
              onClick={() => { shareWhatsApp(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              WhatsApp
            </button>
            <button
              onClick={() => { shareNative(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4 text-gray-500" />
              Más opciones
            </button>
          </div>
        </>
      )}
    </div>
  );
}
