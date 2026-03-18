'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Loader2,
  Calendar, Percent, Clock, XCircle, ArrowUpRight, ArrowDownRight, Flame, Download, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface AnalyticsData {
  currency: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    totalDiscount: number;
    completedOrders: number;
    cancelledOrders: number;
    conversionRate: number;
    peakHour: string;
  };
  comparison: {
    revenueChange: number | null;
    ordersChange: number | null;
    ticketChange: number | null;
  };
  salesByDay: { date: string; orders: number; revenue: number }[];
  hourlyDistribution: number[];
  weeklyHeatmap?: number[][];
  statusCount: Record<string, number>;
  orderTypeCount?: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
}

function getStatusLabels(t: ReturnType<typeof useDashboardLocale>['t']): Record<string, string> {
  return {
    pending: t.analytics_statusPending,
    confirmed: t.analytics_statusConfirmed,
    preparing: t.analytics_statusPreparing,
    ready: t.analytics_statusReady,
    delivered: t.analytics_statusDelivered,
    completed: t.analytics_statusCompleted,
    cancelled: t.analytics_statusCancelled,
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-400',
  preparing: 'bg-violet-500',
  ready: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

function formatMoney(v: number, currency = 'MXN') {
  const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'es-ES' : 'es-MX';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
}

function formatDayLabel(dateStr: string, locale: 'es' | 'en') {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', { weekday: 'short', day: 'numeric' });
}

type PeriodPreset = 7 | 14 | 30 | 'custom';

function formatDateForInput(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AnalyticsPage() {
  const { t, locale } = useDashboardLocale();
  const STATUS_LABELS = getStatusLabels(t);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodPreset>(7);
  const [customStart, setCustomStart] = useState(() => formatDateForInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [customEnd, setCustomEnd] = useState(() => formatDateForInput(new Date()));

  const fetchData = useCallback(async () => {
    if (period === 'custom' && customStart > customEnd) {
      setError(t.analytics_startBeforeEnd);
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = period === 'custom'
        ? `start=${customStart}&end=${customEnd}`
        : `days=${period}`;
      const res = await fetch(`/api/tenant/analytics?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!res.ok) throw new Error(t.analytics_errorLoading);
      setData(json);
    } catch (err) {
      console.error('[Analytics] fetchData failed:', err);
      setError(err instanceof Error ? err.message : t.analytics_errorUnknown);
      setData(null);
    }
    setLoading(false);
  }, [period, customStart, customEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-gray-500">{t.analytics_loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-red-500">{error ?? t.analytics_noDataLoaded}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
        >
          {t.analytics_retry}
        </button>
      </div>
    );
  }

  const { currency, summary, comparison, salesByDay, hourlyDistribution, weeklyHeatmap, statusCount, orderTypeCount, topProducts } = data;
  const fmt = (v: number) => formatMoney(v, currency);
  const maxRevenue = Math.max(...salesByDay.map(d => d.revenue), 1);
  const maxHourly = Math.max(...hourlyDistribution, 1);
  const maxHeatmap = weeklyHeatmap ? Math.max(...weeklyHeatmap.flatMap(r => r), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="dash-heading">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.analytics_subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 p-1">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                  period === d
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {d}d
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === 'custom'
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {t.analytics_custom}
            </button>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">{t.analytics_start}</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">{t.analytics_end}</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <a
              href={period === 'custom' ? `/api/tenant/reports?start=${customStart}&end=${customEnd}&format=csv` : `/api/tenant/reports?period=${period}&format=csv`}
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title={t.analytics_exportCsv}
            >
              <Download className="w-4 h-4" />
            </a>
            <a
              href={period === 'custom' ? `/api/tenant/reports?start=${customStart}&end=${customEnd}&format=html` : `/api/tenant/reports?period=${period}&format=html`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title={t.analytics_reportPdf}
            >
              <FileText className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<DollarSign className="w-4 h-4" />}
          label={t.analytics_income}
          value={fmt(summary.totalRevenue)}
          change={comparison.revenueChange}
          color="emerald"
        />
        <KPICard
          icon={<ShoppingBag className="w-4 h-4" />}
          label={t.analytics_ordersLabel}
          value={String(summary.totalOrders)}
          change={comparison.ordersChange}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-4 h-4" />}
          label={t.analytics_avgTicket}
          value={fmt(summary.avgTicket)}
          change={comparison.ticketChange}
          color="violet"
        />
        <KPICard
          icon={<Percent className="w-4 h-4" />}
          label={t.analytics_conversionRate}
          value={`${summary.conversionRate.toFixed(1)}%`}
          color="amber"
        />
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Clock className="w-3.5 h-3.5" />} label={t.analytics_peakHourLabel} value={summary.peakHour} />
        <MiniStat icon={<XCircle className="w-3.5 h-3.5" />} label={t.analytics_cancellationsLabel} value={String(summary.cancelledOrders)} />
        <MiniStat icon={<Flame className="w-3.5 h-3.5" />} label={t.analytics_discountsLabel} value={fmt(summary.totalDiscount)} />
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm text-gray-900">{t.analytics_salesByDay}</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {t.analytics_income}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" /> {t.analytics_ordersLegend}</span>
          </div>
        </div>
        {salesByDay.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12">{t.analytics_noDataPeriod}</p>
        ) : (
          <div className="flex items-end gap-1.5 h-52">
            {salesByDay.map((d) => {
              const height = Math.max((d.revenue / maxRevenue) * 100, 6);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="hidden group-hover:block absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 rounded-xl px-3.5 py-2.5 text-xs text-white z-10 whitespace-nowrap shadow-lg">
                    <p className="font-bold">{formatDayLabel(d.date, locale)}</p>
                    <p className="text-gray-200">{d.orders} {t.analytics_ordersLegend}</p>
                    <p className="text-emerald-400 font-semibold">{fmt(d.revenue)}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300 hover:bg-emerald-400 cursor-pointer"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-500 truncate w-full text-center mt-1">
                    {formatDayLabel(d.date, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly Heatmap */}
      {weeklyHeatmap ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-1 text-gray-900">{locale === 'en' ? 'Order heatmap' : 'Heatmap de órdenes'}</h2>
          <p className="text-xs text-gray-400 mb-4">{locale === 'en' ? 'Intensity by day of week and hour' : 'Intensidad por día de semana y hora'}</p>
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              {/* Hour labels */}
              <div className="flex mb-1 pl-8">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
                    {h % 4 === 0 ? `${h}h` : ''}
                  </div>
                ))}
              </div>
              {(locale === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']).map((day, dow) => (
                <div key={dow} className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] text-gray-400 w-7 flex-shrink-0 text-right pr-1">{day}</span>
                  <div className="flex flex-1 gap-px">
                    {weeklyHeatmap[dow].map((count, hour) => {
                      const intensity = count === 0 ? 0 : 0.15 + (count / maxHeatmap) * 0.85;
                      return (
                        <div
                          key={hour}
                          title={`${day} ${hour.toString().padStart(2, '0')}:00 — ${count} ${locale === 'en' ? 'orders' : 'órdenes'}`}
                          className="flex-1 h-5 rounded-sm cursor-default transition-opacity"
                          style={{ backgroundColor: count === 0 ? '#F3F4F6' : `rgba(16,185,129,${intensity})` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-[10px] text-gray-400">{locale === 'en' ? 'Less' : 'Menos'}</span>
                {[0.1, 0.3, 0.5, 0.75, 1].map((i) => (
                  <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(16,185,129,${i})` }} />
                ))}
                <span className="text-[10px] text-gray-400">{locale === 'en' ? 'More' : 'Más'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.analytics_hourlyDist}</h2>
          <div className="flex items-end gap-px h-32">
            {hourlyDistribution.map((count, hour) => {
              const height = Math.max((count / maxHourly) * 100, 2);
              const isPeak = count === maxHourly && count > 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="hidden group-hover:block absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 rounded-lg px-2.5 py-1.5 text-xs text-white z-10 whitespace-nowrap shadow-lg">
                    <p>{hour.toString().padStart(2, '0')}:00 — {count} {t.analytics_ordersLegend}</p>
                  </div>
                  <div
                    className={cn('w-full rounded-t transition-all duration-300 cursor-pointer', isPeak ? 'bg-amber-400 hover:bg-amber-300' : 'bg-violet-400/60 hover:bg-violet-400')}
                    style={{ height: `${height}%` }}
                  />
                  {hour % 3 === 0 && <span className="text-[9px] text-gray-500">{hour.toString().padStart(2, '0')}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversion funnel + Order types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4 text-gray-900">{locale === 'en' ? 'Conversion funnel' : 'Embudo de conversión'}</h2>
          {(() => {
            const total = summary.totalOrders;
            const confirmed = total - (statusCount.pending ?? 0);
            const preparing = confirmed - (statusCount.confirmed ?? 0);
            const completed = summary.completedOrders;
            const steps = [
              { label: locale === 'en' ? 'Received' : 'Recibidas', count: total, color: '#6366f1' },
              { label: locale === 'en' ? 'Accepted' : 'Aceptadas', count: confirmed, color: '#3b82f6' },
              { label: locale === 'en' ? 'In kitchen' : 'En cocina', count: preparing, color: '#f59e0b' },
              { label: locale === 'en' ? 'Completed' : 'Completadas', count: completed, color: '#10b981' },
            ];
            const max = Math.max(total, 1);
            return (
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{s.label}</span>
                      <span className="font-bold text-gray-900 tabular-nums">
                        {s.count} <span className="text-xs text-gray-400 font-normal">({total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%)</span>
                      </span>
                    </div>
                    <div className="h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${(s.count / max) * 100}%`, backgroundColor: s.color, opacity: 0.85 - i * 0.05 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Order Types */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4 text-gray-900">{locale === 'en' ? 'Order type' : 'Tipo de orden'}</h2>
          {orderTypeCount && Object.keys(orderTypeCount).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(orderTypeCount).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = summary.totalOrders > 0 ? (count / summary.totalOrders) * 100 : 0;
                const labels: Record<string, string> = locale === 'en'
                  ? { dine_in: '🍽️ Dine-in', pickup: '🛍️ Pickup', delivery: '🛵 Delivery' }
                  : { dine_in: '🍽️ Mesa', pickup: '🛍️ Para llevar', delivery: '🛵 Delivery' };
                const colors: Record<string, string> = { dine_in: 'bg-violet-500', pickup: 'bg-blue-500', delivery: 'bg-amber-500' };
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-500 font-medium">{labels[type] ?? type}</span>
                      <span className="font-semibold text-gray-900">{count} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', colors[type] ?? 'bg-gray-400')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{locale === 'en' ? 'No data' : 'Sin datos'}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.analytics_orderStatus}</h2>
          <div className="space-y-3">
            {Object.entries(statusCount)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = summary.totalOrders > 0 ? (count / summary.totalOrders) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-500 font-medium">{STATUS_LABELS[status] ?? status}</span>
                      <span className="text-gray-900 font-semibold">{count} <span className="text-gray-500 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', STATUS_COLORS[status] ?? 'bg-gray-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.analytics_topProductsLabel}</h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">{t.analytics_noDataShort}</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3 group">
                    <span className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0',
                      i === 0 ? 'bg-amber-500/[0.1] text-amber-400' :
                      i === 1 ? 'bg-gray-100 text-gray-500' :
                      i === 2 ? 'bg-orange-500/[0.1] text-orange-400' :
                      'bg-gray-50 text-gray-500'
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm text-gray-700 font-medium truncate">{p.name}</h4>
                        <span className="text-sm text-gray-900 font-bold flex-shrink-0 ml-2">{fmt(p.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{p.qty}u</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon, label, value, change, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number | null;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: 'bg-emerald-500/[0.1]', icon: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/[0.1]', icon: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/[0.1]', icon: 'text-violet-400' },
    amber: { bg: 'bg-amber-500/[0.1]', icon: 'text-amber-400' },
  };

  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
        {change !== undefined && change !== null && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            change >= 0 ? 'bg-emerald-500/[0.1] text-emerald-400' : 'bg-red-500/[0.1] text-red-400'
          )}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
      <span className="text-gray-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold truncate text-gray-900">{value}</p>
      </div>
    </div>
  );
}
