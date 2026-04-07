'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Metrics {
  // Stripe
  mrr: number;
  mrrLastMonth: number;
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  churnedThisMonth: number;
  churnRate: number;
  planBreakdown: Record<string, number>;
  // Supabase
  totalActiveRestaurants: number;
  newRestaurantsThisMonth: number;
  engagedRestaurants: number;
  atRiskRestaurants: number;
  ordersThisMonth: number;
  ordersThisWeek: number;
  weeklySignups: { week: string; count: number }[];
  activeAlerts: number;
  // Errors
  stripeError?: string;
  supabaseError?: string;
}

// Simple SVG sparkline
function Sparkline({ data, color = '#7c3aed' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120;
  const h = 36;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts.join(' ')} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <polygon
        points={`0,${h} ${pts.join(' ')} ${w},${h}`}
        fill={color}
        fillOpacity="0.1"
      />
    </svg>
  );
}

// Progress bar
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Stat({
  label, value, sub, delta, color = '#7c3aed', large
}: {
  label: string; value: string; sub?: string; delta?: number; color?: string; large?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold text-white ${large ? 'text-3xl' : 'text-2xl'}`} style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      {delta !== undefined && (
        <p className={`text-xs mt-1 font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs mes anterior
        </p>
      )}
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const mrrDelta = metrics
    ? metrics.mrrLastMonth > 0
      ? ((metrics.mrr - metrics.mrrLastMonth) / metrics.mrrLastMonth) * 100
      : 0
    : 0;

  const weeklyData = metrics?.weeklySignups.map(w => w.count) ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">← Admin</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-xl font-bold text-white">📊 Métricas de negocio</h1>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-600 mt-1">Actualizado: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dev"
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            🤖 Dev Tool
          </Link>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Cargando…' : '↺ Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          ❌ Error: {error}
        </div>
      )}

      {loading && !metrics && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando métricas de Stripe y Supabase…</p>
          </div>
        </div>
      )}

      {metrics && (
        <>
          {/* ─── REVENUE ─────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">💰 Ingresos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="MRR"
                value={`$${metrics.mrr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                sub="Ingreso mensual recurrente"
                delta={mrrDelta}
                color="#10b981"
                large
              />
              <Stat
                label="Suscripciones activas"
                value={String(metrics.activeSubscriptions)}
                sub={`+${metrics.newSubscriptionsThisMonth} este mes`}
                color="#7c3aed"
              />
              <Stat
                label="Churn este mes"
                value={String(metrics.churnedThisMonth)}
                sub={`${metrics.churnRate}% tasa de churn`}
                color={metrics.churnedThisMonth > 2 ? '#ef4444' : '#6b7280'}
              />
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-2">ARR estimado</p>
                <p className="text-2xl font-bold text-white" style={{ color: '#f59e0b' }}>
                  ${(metrics.mrr * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-600 mt-1">Ingreso anual recurrente</p>
              </div>
            </div>
          </section>

          {/* ─── PLAN BREAKDOWN ──────────────────────────────────── */}
          {Object.keys(metrics.planBreakdown).length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">📋 Distribución de planes</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="space-y-3">
                  {Object.entries(metrics.planBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([plan, count]) => (
                      <div key={plan} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-40 truncate">{plan}</span>
                        <div className="flex-1">
                          <Bar value={count} max={metrics.activeSubscriptions} color="#7c3aed" />
                        </div>
                        <span className="text-xs text-gray-300 w-8 text-right font-mono">{count}</span>
                        <span className="text-[10px] text-gray-600 w-10 text-right">
                          {metrics.activeSubscriptions > 0
                            ? Math.round((count / metrics.activeSubscriptions) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* ─── STORES ──────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">🏪 Tiendas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Tiendas activas"
                value={String(metrics.totalActiveRestaurants)}
                sub={`+${metrics.newRestaurantsThisMonth} este mes`}
                color="#7c3aed"
              />
              <Stat
                label="Comprometidas"
                value={String(metrics.engagedRestaurants)}
                sub="Con pedidos en 30 días"
                color="#10b981"
              />
              <Stat
                label="En riesgo"
                value={String(metrics.atRiskRestaurants)}
                sub="Sin pedidos en 30 días"
                color={metrics.atRiskRestaurants > 5 ? '#ef4444' : '#f59e0b'}
              />
              <Stat
                label="Alertas activas"
                value={String(metrics.activeAlerts)}
                sub="En monitor de sistema"
                color={metrics.activeAlerts > 0 ? '#ef4444' : '#6b7280'}
              />
            </div>
          </section>

          {/* ─── ORDERS ──────────────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">🛒 Pedidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat label="Este mes" value={metrics.ordersThisMonth.toLocaleString()} color="#06b6d4" />
              <Stat label="Esta semana" value={metrics.ordersThisWeek.toLocaleString()} color="#06b6d4" />
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-2">Engagement rate</p>
                <p className="text-2xl font-bold" style={{ color: '#06b6d4' }}>
                  {metrics.totalActiveRestaurants > 0
                    ? Math.round((metrics.engagedRestaurants / metrics.totalActiveRestaurants) * 100)
                    : 0}%
                </p>
                <Bar
                  value={metrics.engagedRestaurants}
                  max={metrics.totalActiveRestaurants}
                  color="#06b6d4"
                />
              </div>
            </div>
          </section>

          {/* ─── GROWTH SPARKLINE ────────────────────────────────── */}
          {weeklyData.length > 1 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">📈 Crecimiento semanal (registros)</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-end gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {weeklyData[weeklyData.length - 1]}
                    </p>
                    <p className="text-xs text-gray-500">esta semana</p>
                  </div>
                  <Sparkline data={weeklyData} color="#7c3aed" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {metrics.weeklySignups.map((w, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="w-8 rounded-sm mx-auto mb-1"
                        style={{
                          height: `${Math.max(4, (w.count / Math.max(...weeklyData, 1)) * 48)}px`,
                          background: i === weeklyData.length - 1 ? '#7c3aed' : '#374151',
                        }}
                      />
                      <p className="text-[9px] text-gray-600 whitespace-nowrap">{w.week}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{w.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ─── HEALTH OVERVIEW ─────────────────────────────────── */}
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">🩺 Estado general</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              {[
                {
                  label: 'Retención (engaged / total)',
                  value: metrics.totalActiveRestaurants > 0
                    ? Math.round((metrics.engagedRestaurants / metrics.totalActiveRestaurants) * 100) : 0,
                  max: 100,
                  color: '#10b981',
                  good: 70,
                },
                {
                  label: 'Conversión trial → pago (proxied)',
                  value: metrics.activeSubscriptions,
                  max: Math.max(metrics.totalActiveRestaurants, 1),
                  color: '#7c3aed',
                  good: 50,
                },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className={`text-xs font-mono ${item.value >= item.good ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.value}
                      {item.max === 100 ? '%' : `/${item.max}`}
                    </span>
                  </div>
                  <Bar value={item.value} max={item.max} color={item.value >= item.good ? '#10b981' : '#f59e0b'} />
                </div>
              ))}
            </div>
          </section>

          {/* Errors */}
          {(metrics.stripeError || metrics.supabaseError) && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 space-y-1">
              {metrics.stripeError && <p>⚠ Stripe: {metrics.stripeError}</p>}
              {metrics.supabaseError && <p>⚠ Supabase: {metrics.supabaseError}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
