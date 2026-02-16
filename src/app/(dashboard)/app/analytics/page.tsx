'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Loader2, Calendar, Percent } from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    totalDiscount: number;
    completedOrders: number;
  };
  salesByDay: { date: string; orders: number; revenue: number }[];
  statusCount: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  ready: 'bg-purple-500',
  delivered: 'bg-emerald-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

function formatMoney(v: number) {
  return '$' + v.toFixed(2);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tenant/analytics?days=${days}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const { summary, salesByDay, statusCount, topProducts } = data;
  const maxRevenue = Math.max(...salesByDay.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-brand-500" />
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-500" />
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${days === d ? 'bg-brand-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={<ShoppingBag className="w-5 h-5" />} label="Total Órdenes" value={String(summary.totalOrders)} color="text-blue-400" />
        <KPICard icon={<DollarSign className="w-5 h-5" />} label="Ingresos" value={formatMoney(summary.totalRevenue)} color="text-emerald-400" />
        <KPICard icon={<TrendingUp className="w-5 h-5" />} label="Ticket Promedio" value={formatMoney(summary.avgTicket)} color="text-amber-400" />
        <KPICard icon={<Percent className="w-5 h-5" />} label="Descuentos" value={formatMoney(summary.totalDiscount)} color="text-red-400" />
      </div>

      {/* Sales Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Ventas por Día</h2>
        {salesByDay.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">Sin datos en este periodo</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {salesByDay.map((d) => {
              const height = Math.max((d.revenue / maxRevenue) * 100, 4);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="hidden group-hover:block absolute -top-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white z-10 whitespace-nowrap">
                    <p className="font-bold">{d.date}</p>
                    <p>{d.orders} órdenes</p>
                    <p>{formatMoney(d.revenue)}</p>
                  </div>
                  <div
                    className="w-full bg-brand-500/80 rounded-t-md transition-all hover:bg-brand-400"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-zinc-600 truncate w-full text-center">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Estado de Órdenes</h2>
          <div className="space-y-3">
            {Object.entries(statusCount).map(([status, count]) => {
              const pct = summary.totalOrders > 0 ? (count / summary.totalOrders) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">{STATUS_LABELS[status] ?? status}</span>
                    <span className="text-zinc-300 font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-zinc-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Top Productos</h2>
          {topProducts.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-white font-medium truncate">{p.name}</h4>
                    <p className="text-xs text-zinc-500">{p.qty} unidades</p>
                  </div>
                  <span className="text-sm text-emerald-400 font-bold">{formatMoney(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
