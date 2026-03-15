'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList, ShoppingBag, QrCode, TrendingUp, ExternalLink,
  ArrowRight, Sparkles, AlertTriangle, CreditCard, Clock,
  Copy, Check, Share2, MessageCircle, BarChart3, PieChart, Flame,
  ArrowUpRight, ArrowDownRight, XCircle, DollarSign, Target,
} from 'lucide-react';
import { formatPrice, timeAgo, ORDER_STATUS_CONFIG, cn } from '@/lib/utils';
import { OnboardingChecklist } from './OnboardingChecklist';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { Order, Restaurant } from '@/types';

interface AnalyticsData {
  chartData: { date: string; label: string; orders: number; revenue: number }[];
  hourlyData: { hour: string; count: number }[];
  topProducts: { name: string; qty: number }[];
  orderTypeCounts: { dine_in: number; pickup: number; delivery: number };
}

interface DashboardHomeProps {
  restaurant: Restaurant;
  lowStockProducts?: { id: string; name: string; stock_qty: number; low_stock_threshold: number }[];
  stats: {
    ordersToday: number;
    salesToday: number;
    activeProducts: number;
    activeTables: number;
    pendingOrders: number;
    cancelledToday: number;
    avgOrderToday: number;
    salesYesterday: number;
    ordersYesterday: number;
    revenueByType: { dine_in: number; pickup: number; delivery: number };
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
  freeTier?: { ordersToday: number; dailyLimit: number } | null;
}

export function DashboardHome({ restaurant, lowStockProducts, stats, recentOrders, subscription, onboarding, analytics, freeTier }: DashboardHomeProps) {
  const { t } = useDashboardLocale();
  const salesDelta = stats.salesYesterday > 0
    ? ((stats.salesToday - stats.salesYesterday) / stats.salesYesterday) * 100
    : stats.salesToday > 0 ? 100 : 0;
  const ordersDelta = stats.ordersYesterday > 0
    ? ((stats.ordersToday - stats.ordersYesterday) / stats.ordersYesterday) * 100
    : stats.ordersToday > 0 ? 100 : 0;
  const cancelRate = stats.ordersToday > 0 ? (stats.cancelledToday / stats.ordersToday) * 100 : 0;

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
          <p className="text-sm text-gray-500 mt-1">{t.home_subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareMenuButton slug={restaurant.slug} name={restaurant.name} />
          <Link
            href={`/${restaurant.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors border border-emerald-200"
          >
            <ExternalLink className="w-4 h-4" />
            {t.home_viewMenu}
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
                  ? `${t.home_trialEndsIn} ${trialDaysLeft} ${trialDaysLeft !== 1 ? t.home_trialDays : t.home_trialDay}!`
                  : `${trialDaysLeft} ${t.home_trialDaysLeft}`
                }
              </p>
              <p className={cn('text-xs', trialDaysLeft <= 3 ? 'text-red-500/80' : 'text-emerald-600/80')}>
                {trialDaysLeft <= 3
                  ? t.home_trialChoosePlan
                  : t.home_trialEnjoy
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
            {t.home_viewPlans}
          </Link>
        </div>
      )}

      {/* Free tier banner — owner only, never shown to customers */}
      {freeTier && (
        <div className={cn(
          'rounded-2xl p-4 flex items-center justify-between gap-4 border',
          freeTier.ordersToday >= freeTier.dailyLimit
            ? 'bg-red-500/[0.06] border-red-500/[0.15]'
            : freeTier.ordersToday >= freeTier.dailyLimit - 1
            ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-50 border-gray-200'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              freeTier.ordersToday >= freeTier.dailyLimit ? 'bg-red-500/[0.15]' : 'bg-amber-100'
            )}>
              {freeTier.ordersToday >= freeTier.dailyLimit
                ? <AlertTriangle className="w-5 h-5 text-red-400" />
                : <Clock className="w-5 h-5 text-amber-600" />
              }
            </div>
            <div className="min-w-0">
              <p className={cn('font-semibold text-sm', freeTier.ordersToday >= freeTier.dailyLimit ? 'text-red-700' : 'text-gray-800')}>
                {freeTier.ordersToday >= freeTier.dailyLimit
                  ? 'Límite diario alcanzado — tu menú no acepta más pedidos hoy'
                  : `Plan gratuito · ${freeTier.dailyLimit - freeTier.ordersToday} de ${freeTier.dailyLimit} pedido${freeTier.dailyLimit - freeTier.ordersToday !== 1 ? 's' : ''} disponible${freeTier.dailyLimit - freeTier.ordersToday !== 1 ? 's' : ''} hoy`
                }
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Suscríbete para recibir pedidos ilimitados y eliminar este límite.
              </p>
            </div>
          </div>
          <Link
            href="/app/billing"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex-shrink-0"
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

      {/* Revenue Goal */}
      <RevenueGoal salesToday={stats.salesToday} currency={restaurant.currency} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t.home_salesToday}
          value={formatPrice(stats.salesToday, restaurant.currency)}
          icon={TrendingUp}
          color="text-emerald-500"
          bg="bg-emerald-500/[0.1]"
          delta={salesDelta}
          deltaLabel={t.home_vsYesterday}
        />
        <KPICard
          label={t.home_ordersToday}
          value={stats.ordersToday.toString()}
          icon={ClipboardList}
          color="text-blue-500"
          bg="bg-blue-500/[0.1]"
          delta={ordersDelta}
          deltaLabel={t.home_vsYesterday}
        />
        <KPICard
          label={t.home_avgTicket}
          value={formatPrice(stats.avgOrderToday, restaurant.currency)}
          icon={DollarSign}
          color="text-indigo-500"
          bg="bg-indigo-500/[0.1]"
        />
        <KPICard
          label={t.home_cancellations}
          value={`${stats.cancelledToday}`}
          icon={XCircle}
          color="text-red-400"
          bg="bg-red-500/[0.1]"
          extra={cancelRate > 0 ? `${cancelRate.toFixed(0)}% ${t.home_rate}` : undefined}
        />
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
                {stats.pendingOrders} {stats.pendingOrders === 1 ? t.home_pendingOrder : t.home_pendingOrders}
              </p>
              <p className="text-xs text-amber-600/70">{t.home_clickToManage}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600/50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Low stock alert */}
      {(lowStockProducts ?? []).length > 0 && (
        <div className="rounded-2xl bg-orange-500/[0.06] border border-orange-500/[0.15] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-orange-700">
                {lowStockProducts!.length} {lowStockProducts!.length !== 1 ? t.home_lowStockProducts : t.home_lowStockSingular}
              </p>
              <p className="text-xs text-orange-600/70">{t.home_checkInventory}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {lowStockProducts!.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate">{p.name}</span>
                <span className={cn('font-bold tabular-nums', p.stock_qty <= 0 ? 'text-red-600' : 'text-orange-600')}>
                  {p.stock_qty <= 0 ? t.home_outOfStock : `${p.stock_qty} ${t.home_units}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="dash-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[15px] text-gray-900">{t.home_recentOrders}</h2>
          <Link href="/app/orders" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 transition-colors">
            {t.home_viewAll} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="dash-empty py-10">
            <ClipboardList className="dash-empty-icon w-8 h-8" />
            <p className="dash-empty-title text-sm">{t.home_noOrdersYet}</p>
            <p className="dash-empty-desc text-xs">{t.home_noOrdersDesc}</p>
            <Link
              href="/app/tables"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              {t.nav_tables ?? 'Ver QR de mesas'}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700 truncate">{order.customer_name || t.home_noName}</p>
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
        <QuickLink href="/app/orders" label={t.home_manageOrders} icon={ClipboardList} />
        <QuickLink href="/app/menu/products" label={t.home_editMenu} icon={ShoppingBag} />
        <QuickLink href="/app/tables" label={t.home_tablesQR} icon={QrCode} />
      </div>

      {/* Getting started CTA for new restaurants */}
      {stats.activeProducts === 0 && (
        <EmptyRestaurantCTA restaurantSlug={restaurant.slug} />
      )}
    </div>
  );
}

function KPICard({
  label, value, icon: Icon, color, bg, delta, deltaLabel, extra,
}: {
  label: string; value: string; icon: any; color: string; bg: string;
  delta?: number; deltaLabel?: string; extra?: string;
}) {
  const isUp = delta !== undefined && delta >= 0;
  return (
    <div className="dash-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
      </div>
      <p className="text-[1.75rem] font-bold tracking-tight text-gray-900 leading-none">{value}</p>
      {delta !== undefined && deltaLabel && (
        <div className="flex items-center gap-1 mt-2">
          {isUp ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
          <span className={cn('text-xs font-semibold', isUp ? 'text-emerald-600' : 'text-red-500')}>
            {isUp ? '+' : ''}{delta.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-400">{deltaLabel}</span>
        </div>
      )}
      {extra && <p className="text-xs text-gray-400 mt-1.5">{extra}</p>}
    </div>
  );
}

function RevenueGoal({ salesToday, currency }: { salesToday: number; currency: string }) {
  const { t } = useDashboardLocale();
  const [goal, setGoal] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseFloat(localStorage.getItem('menius-daily-goal') ?? '0');
  });
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const save = () => {
    const v = parseFloat(input);
    if (v > 0) { setGoal(v); localStorage.setItem('menius-daily-goal', String(v)); }
    setEditing(false);
  };

  const pct = goal > 0 ? Math.min((salesToday / goal) * 100, 100) : 0;
  const reached = pct >= 100;

  return (
    <div className="dash-card p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', reached ? 'bg-emerald-50' : 'bg-gray-50')}>
            <Target className={cn('w-4 h-4', reached ? 'text-emerald-500' : 'text-gray-400')} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-700">{t.home_dailyGoal}</p>
            {goal > 0 && <p className="text-[11px] text-gray-400">{pct.toFixed(0)}% {t.home_completed}</p>}
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-gray-400">$</span>
            <input value={input} onChange={e => setInput(e.target.value)} type="number" min="1" autoFocus
              onKeyDown={e => e.key === 'Enter' && save()}
              className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <button onClick={save} className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-bold">OK</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400">✕</button>
          </div>
        ) : goal > 0 ? (
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold', reached ? 'text-emerald-600' : 'text-gray-900')}>
              {formatPrice(salesToday, currency)}
              <span className="text-gray-400 font-normal"> / {formatPrice(goal, currency)}</span>
            </span>
            <button onClick={() => { setEditing(true); setInput(String(goal)); }} className="text-[11px] text-gray-400 hover:text-gray-600">✎</button>
          </div>
        ) : (
          <button onClick={() => { setEditing(true); setInput('1000'); }} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
            {t.home_setGoal}
          </button>
        )}
      </div>
      {goal > 0 && (
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', reached ? 'bg-emerald-500' : pct >= 75 ? 'bg-emerald-400' : 'bg-emerald-300')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {reached && <p className="text-[11px] text-emerald-600 font-semibold mt-1.5">{t.home_goalReached}</p>}
    </div>
  );
}

function EmptyRestaurantCTA({ restaurantSlug }: { restaurantSlug: string }) {
  const { t } = useDashboardLocale();
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
      setError(t.home_errorGenerating);
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
        {seeded ? t.home_sampleMenuCreated : t.home_restaurantReady}
      </h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
        {seeded
          ? t.home_sampleMenuDesc
          : t.home_readyDesc}
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
                {t.home_generating}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t.home_loadSampleMenu}
              </>
            )}
          </button>
          <Link
            href="/app/menu/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            {t.home_addManually}
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
            {t.home_viewMyProducts}
          </Link>
          <Link
            href={`/${restaurantSlug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {t.home_viewMyMenu}
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
  const { t } = useDashboardLocale();
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const { chartData, hourlyData, topProducts, orderTypeCounts } = analytics;

  const totalWeekRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalWeekOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const maxVal = Math.max(...chartData.map((d) => (chartMode === 'revenue' ? d.revenue : d.orders)), 1);

  const totalOrders = orderTypeCounts.dine_in + orderTypeCounts.pickup + orderTypeCounts.delivery;
  const orderTypeSlices = [
    { label: t.analytics_dineIn, value: orderTypeCounts.dine_in, color: '#10b981' },
    { label: t.analytics_pickup, value: orderTypeCounts.pickup, color: '#6366f1' },
    { label: t.analytics_delivery, value: orderTypeCounts.delivery, color: '#f59e0b' },
  ].filter((s) => s.value > 0);

  const maxHourly = Math.max(...hourlyData.map((h) => h.count), 1);
  const peakHour = hourlyData.reduce((best, h) => (h.count > best.count ? h : best), hourlyData[0]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-[15px] text-gray-900">{t.analytics_title}</h2>
        <span className="text-xs text-gray-400 ml-1">{t.analytics_last7days}</span>
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
                {chartMode === 'revenue' ? t.analytics_revenue7d : t.analytics_orders7d}
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
                {t.analytics_revenue}
              </button>
              <button
                onClick={() => setChartMode('orders')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  chartMode === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t.analytics_orders}
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.analytics_orderType}</p>
          </div>
          {totalOrders === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-gray-400">{t.analytics_noDataYet}</p>
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.analytics_topProducts}</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">{t.analytics_noDataYet}</p>
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
                        <span className="text-xs font-semibold text-gray-500 tabular-nums ml-2">{p.qty} {t.home_units}</span>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.analytics_peakHours}</p>
            </div>
            {peakHour && peakHour.count > 0 && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                {t.analytics_peak}: {peakHour.hour}
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
  const { t } = useDashboardLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `/${slug}`;

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
    const text = encodeURIComponent(`${name} — ${menuUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url: menuUrl });
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
        {t.home_share}
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
              {copied ? t.home_copied : t.home_copyLink}
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
              {t.home_moreOptions}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
