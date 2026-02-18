'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Loader2,
  Calendar, Percent, Clock, XCircle, ArrowUpRight, ArrowDownRight, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
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
  statusCount: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-400',
  preparing: 'bg-violet-500',
  ready: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

function formatMoney(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/analytics?days=${days}`);
      const json = await res.json();
      setData(json);
    } catch {}
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm text-gray-400">Cargando analytics...</p>
      </div>
    );
  }

  const { summary, comparison, salesByDay, hourlyDistribution, statusCount, topProducts } = data;
  const maxRevenue = Math.max(...salesByDay.map(d => d.revenue), 1);
  const maxHourly = Math.max(...hourlyDistribution, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Métricas y rendimiento de tu restaurante</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] rounded-xl border border-white/[0.08] p-1">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                days === d
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={<DollarSign className="w-4 h-4" />}
          label="Ingresos"
          value={formatMoney(summary.totalRevenue)}
          change={comparison.revenueChange}
          color="emerald"
        />
        <KPICard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Órdenes"
          value={String(summary.totalOrders)}
          change={comparison.ordersChange}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Ticket promedio"
          value={formatMoney(summary.avgTicket)}
          change={comparison.ticketChange}
          color="violet"
        />
        <KPICard
          icon={<Percent className="w-4 h-4" />}
          label="Tasa de conversión"
          value={`${summary.conversionRate.toFixed(1)}%`}
          color="amber"
        />
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={<Clock className="w-3.5 h-3.5" />} label="Hora pico" value={summary.peakHour} />
        <MiniStat icon={<XCircle className="w-3.5 h-3.5" />} label="Cancelaciones" value={String(summary.cancelledOrders)} />
        <MiniStat icon={<Flame className="w-3.5 h-3.5" />} label="Descuentos" value={formatMoney(summary.totalDiscount)} />
      </div>

      {/* Sales Chart */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-sm">Ventas por día</h2>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/[0.2]" /> Órdenes</span>
          </div>
        </div>
        {salesByDay.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">Sin datos en este periodo</p>
        ) : (
          <div className="flex items-end gap-1.5 h-52">
            {salesByDay.map((d) => {
              const height = Math.max((d.revenue / maxRevenue) * 100, 6);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="hidden group-hover:block absolute -top-20 left-1/2 -translate-x-1/2 bg-gray-900 rounded-xl px-3.5 py-2.5 text-xs text-white z-10 whitespace-nowrap shadow-lg">
                    <p className="font-bold">{formatDayLabel(d.date)}</p>
                    <p className="text-gray-300">{d.orders} órdenes</p>
                    <p className="text-emerald-400 font-semibold">{formatMoney(d.revenue)}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                  </div>
                  <div
                    className="w-full bg-purple-500 rounded-t-lg transition-all duration-300 hover:bg-purple-400 cursor-pointer"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">
                    {formatDayLabel(d.date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly Distribution */}
      <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
        <h2 className="font-semibold text-sm mb-4">Distribución por hora</h2>
        <div className="flex items-end gap-px h-32">
          {hourlyDistribution.map((count, hour) => {
            const height = Math.max((count / maxHourly) * 100, 2);
            const isPeak = count === maxHourly && count > 0;
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="hidden group-hover:block absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 rounded-lg px-2.5 py-1.5 text-xs text-white z-10 whitespace-nowrap shadow-lg">
                  <p>{hour.toString().padStart(2, '0')}:00 — {count} órdenes</p>
                </div>
                <div
                  className={cn(
                    'w-full rounded-t transition-all duration-300 cursor-pointer',
                    isPeak ? 'bg-amber-400 hover:bg-amber-300' : 'bg-violet-400/60 hover:bg-violet-400'
                  )}
                  style={{ height: `${height}%` }}
                />
                {hour % 3 === 0 && (
                  <span className="text-[9px] text-gray-400">{hour.toString().padStart(2, '0')}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
          <h2 className="font-semibold text-sm mb-4">Estado de órdenes</h2>
          <div className="space-y-3">
            {Object.entries(statusCount)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const pct = summary.totalOrders > 0 ? (count / summary.totalOrders) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-400 font-medium">{STATUS_LABELS[status] ?? status}</span>
                      <span className="text-white font-semibold">{count} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
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
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
          <h2 className="font-semibold text-sm mb-4">Top productos</h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => {
                const pct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3 group">
                    <span className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0',
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-white/[0.06] text-gray-400' :
                      i === 2 ? 'bg-orange-50 text-orange-600' :
                      'bg-white/[0.04] text-gray-400'
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm text-gray-200 font-medium truncate">{p.name}</h4>
                        <span className="text-sm text-white font-bold flex-shrink-0 ml-2">{formatMoney(p.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-purple-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{p.qty}u</span>
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
  const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-50 text-blue-700' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', badge: 'bg-violet-50 text-violet-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-50 text-amber-700' },
  };

  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
        {change !== undefined && change !== null && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          )}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.06] px-4 py-3 flex items-center gap-3">
      <span className="text-gray-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
