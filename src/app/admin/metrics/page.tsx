'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowLeft,
  DollarSign, Users, ShoppingBag, Zap, AlertTriangle,
  ExternalLink, Activity, Target, ChevronUp, ChevronDown,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MonthlyTrend { month: string; mrr: number; newSubs: number }
interface TopRestaurant {
  id: string; name: string; slug: string;
  country_code: string; currency: string; created_at: string;
  order_count_30d: number; plan_id: string; sub_status: string;
}
interface RecentSignup { id: string; name: string; slug: string; created_at: string; country_code: string }

interface Metrics {
  // Stripe
  mrr: number; mrrLastMonth: number; mrrGrowth: number; arr: number;
  activeSubscriptions: number; trialingSubscriptions: number;
  newSubscriptionsThisMonth: number; churnedThisMonth: number;
  churnRate: number; planBreakdown: Record<string, number>;
  monthlyTrend: MonthlyTrend[];
  applicationFeesThisMonth: number;
  // Supabase
  totalActiveRestaurants: number; newRestaurantsThisMonth: number;
  engagedRestaurants: number; atRiskRestaurants: number;
  ordersThisMonth: number; ordersThisWeek: number; ordersToday: number; totalOrders: number;
  weeklySignups: { week: string; count: number }[];
  topRestaurants: TopRestaurant[];
  recentSignups: RecentSignup[];
  paidRestaurants: number; avgOrdersPerRestaurant: number;
  activeAlerts: number; conversionRate: number;
  stripeError?: string; supabaseError?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  business: '#f59e0b',
  pro: '#8b5cf6',
  starter: '#3b82f6',
  free: '#6b7280',
  none: '#374151',
  growth: '#10b981',
};

const PLAN_LABELS: Record<string, string> = {
  business: 'Business', pro: 'Pro', starter: 'Starter',
  free: 'Free', none: 'Sin plan', growth: 'Growth',
};

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  trialing: { label: 'Trial', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  past_due: { label: 'Vencido', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  canceled: { label: 'Cancelado', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  none: { label: 'Free', cls: 'text-gray-500 bg-white/[0.03] border-white/[0.06]' },
};

const REFRESH_INTERVAL = 60; // seconds

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, delta, icon, accent = '#8b5cf6', large,
}: {
  label: string; value: string; sub?: string;
  delta?: number; icon?: React.ReactNode; accent?: string; large?: boolean;
}) {
  const up = delta !== undefined && delta >= 0;
  return (
    <div className="relative bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5 overflow-hidden group hover:border-white/[0.12] transition-colors">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(circle at 0% 0%, ${accent}08 0%, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{label}</p>
          {icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
              <span style={{ color: accent }}>{icon}</span>
            </div>
          )}
        </div>
        <p className={`font-bold text-white tabular-nums ${large ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)}% vs mes anterior
          </div>
        )}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: MonthlyTrend[] }) {
  const max = Math.max(...data.map(d => d.mrr), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max(4, (d.mrr / max) * 100);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex flex-col justify-end" style={{ height: '96px' }}>
              <div
                className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-90"
                style={{
                  height: `${h}%`,
                  background: isLast
                    ? 'linear-gradient(to top, #7c3aed, #a855f7)'
                    : 'rgba(255,255,255,0.06)',
                  boxShadow: isLast ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
                }}
              />
              {d.mrr > 0 && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  ${d.mrr.toFixed(0)}
                </div>
              )}
            </div>
            <p className="text-[9px] text-gray-600 whitespace-nowrap">{d.month}</p>
          </div>
        );
      })}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono text-gray-300">{value.toLocaleString()} <span className="text-gray-600">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function CountryFlag({ code }: { code?: string }) {
  if (!code) return <span className="text-gray-600 text-xs">🌐</span>;
  const flags: Record<string, string> = {
    MX: '🇲🇽', CO: '🇨🇴', US: '🇺🇸', CA: '🇨🇦',
    AR: '🇦🇷', PE: '🇵🇪', CL: '🇨🇱', EC: '🇪🇨', VE: '🇻🇪',
  };
  return <span className="text-sm">{flags[code.toUpperCase()] ?? '🌐'}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : REFRESH_INTERVAL));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const mrrFormatted = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#070707]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 transition-colors text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin
            </Link>
            <span className="text-gray-800">/</span>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h1 className="text-sm font-semibold text-white">Dashboard de negocio</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {metrics?.activeAlerts ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-400 font-medium">{metrics.activeAlerts} alerta{metrics.activeAlerts > 1 ? 's' : ''}</span>
              </div>
            ) : null}
            {lastUpdated && (
              <span className="text-xs text-gray-600">
                actualizado {lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white hover:border-white/[0.14] transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando…' : `${countdown}s`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Errors ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {metrics?.stripeError && (
          <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
            ⚠ Stripe: {metrics.stripeError}
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && !metrics && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">Cargando Stripe + Supabase…</p>
            </div>
          </div>
        )}

        {metrics && (
          <div className="space-y-8">

            {/* ── Row 1: Hero KPIs ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="MRR"
                value={mrrFormatted(metrics.mrr)}
                sub={`ARR estimado ${mrrFormatted(metrics.arr)}`}
                delta={metrics.mrrGrowth}
                icon={<DollarSign className="w-4 h-4" />}
                accent="#10b981"
                large
              />
              <KpiCard
                label="Suscripciones activas"
                value={String(metrics.activeSubscriptions)}
                sub={`+${metrics.newSubscriptionsThisMonth} este mes · ${metrics.trialingSubscriptions} en trial`}
                icon={<Users className="w-4 h-4" />}
                accent="#8b5cf6"
              />
              <KpiCard
                label="Pedidos hoy"
                value={metrics.ordersToday.toLocaleString()}
                sub={`${metrics.ordersThisMonth.toLocaleString()} este mes`}
                icon={<ShoppingBag className="w-4 h-4" />}
                accent="#3b82f6"
              />
              <KpiCard
                label="Comisiones Growth"
                value={`$${metrics.applicationFeesThisMonth.toFixed(2)}`}
                sub="Este mes (Stripe Connect)"
                icon={<Zap className="w-4 h-4" />}
                accent="#f59e0b"
              />
            </div>

            {/* ── Row 2: MRR Trend + Funnel ───────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* MRR Trend — 3 cols */}
              <div className="lg:col-span-3 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Tendencia MRR</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-white">{mrrFormatted(metrics.mrr)}</p>
                      <div className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${metrics.mrrGrowth >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {metrics.mrrGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(metrics.mrrGrowth).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">últimos 6 meses</p>
                </div>
                {metrics.monthlyTrend.length > 0 ? (
                  <BarChart data={metrics.monthlyTrend} />
                ) : (
                  <div className="h-28 flex items-center justify-center text-sm text-gray-700">Sin datos de tendencia</div>
                )}
              </div>

              {/* Conversion Funnel — 2 cols */}
              <div className="lg:col-span-2 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-5">Funnel de conversión</p>
                <div className="space-y-4">
                  <FunnelBar
                    label="Restaurantes registrados"
                    value={metrics.totalActiveRestaurants}
                    total={metrics.totalActiveRestaurants}
                    color="#6366f1"
                  />
                  <FunnelBar
                    label="Con actividad (30d)"
                    value={metrics.engagedRestaurants}
                    total={metrics.totalActiveRestaurants}
                    color="#8b5cf6"
                  />
                  <FunnelBar
                    label="Con suscripción paga"
                    value={metrics.paidRestaurants}
                    total={metrics.totalActiveRestaurants}
                    color="#a855f7"
                  />
                </div>
                <div className="mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">Conversión</p>
                    <p className="text-lg font-bold text-purple-400">{metrics.conversionRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 mb-0.5">En riesgo</p>
                    <p className={`text-lg font-bold ${metrics.atRiskRestaurants > 5 ? 'text-red-400' : 'text-amber-400'}`}>
                      {metrics.atRiskRestaurants}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 3: Plan breakdown + Churn + Weekly signups ──────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan distribution */}
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Distribución de planes</p>
                <div className="space-y-3">
                  {Object.entries(metrics.planBreakdown).sort(([, a], [, b]) => b - a).map(([plan, count]) => {
                    const total = metrics.activeSubscriptions || 1;
                    const pct = Math.round((count / total) * 100);
                    const color = PLAN_COLORS[plan.toLowerCase().split('_')[0]] ?? '#6b7280';
                    return (
                      <div key={plan}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-400">{PLAN_LABELS[plan.toLowerCase()] ?? plan}</span>
                          <span className="text-xs font-mono text-gray-300">{count} <span className="text-gray-600">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(metrics.planBreakdown).length === 0 && (
                    <p className="text-sm text-gray-700">Sin datos de Stripe</p>
                  )}
                </div>
              </div>

              {/* Churn & Health */}
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Salud del negocio</p>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Churn rate', value: `${metrics.churnRate}%`,
                      sub: `${metrics.churnedThisMonth} cancelados este mes`,
                      good: metrics.churnRate < 5, warn: metrics.churnRate >= 5 && metrics.churnRate < 10,
                    },
                    {
                      label: 'Retención (30d)', value: `${metrics.totalActiveRestaurants > 0 ? Math.round((metrics.engagedRestaurants / metrics.totalActiveRestaurants) * 100) : 0}%`,
                      sub: `${metrics.engagedRestaurants} de ${metrics.totalActiveRestaurants} activos`,
                      good: (metrics.engagedRestaurants / Math.max(metrics.totalActiveRestaurants, 1)) > 0.6,
                      warn: false,
                    },
                    {
                      label: 'Avg órdenes / rest.', value: String(metrics.avgOrdersPerRestaurant),
                      sub: `${metrics.ordersThisMonth.toLocaleString()} pedidos este mes`,
                      good: metrics.avgOrdersPerRestaurant > 10, warn: false,
                    },
                  ].map(item => (
                    <div key={item.label} className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{item.sub}</p>
                      </div>
                      <span className={`text-base font-bold ${item.good ? 'text-emerald-400' : item.warn ? 'text-amber-400' : 'text-red-400'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly signups bar chart */}
              <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Registros semanales</p>
                  <span className="text-xs text-gray-600">+{metrics.newRestaurantsThisMonth} este mes</span>
                </div>
                <div className="flex items-end gap-1.5 h-20">
                  {metrics.weeklySignups.map((w, i) => {
                    const maxC = Math.max(...metrics.weeklySignups.map(x => x.count), 1);
                    const isLast = i === metrics.weeklySignups.length - 1;
                    const h = Math.max(6, (w.count / maxC) * 72);
                    return (
                      <div key={w.week} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${h}px`,
                            background: isLast ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                          }}
                        />
                        <p className="text-[8px] text-gray-700 whitespace-nowrap">{w.week}</p>
                        <p className="text-[9px] text-gray-500 font-mono">{w.count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Row 4: Top restaurants table ────────────────────────────── */}
            <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <p className="text-sm font-semibold text-white">Top restaurantes (últimos 30 días)</p>
                </div>
                <p className="text-xs text-gray-600">por volumen de pedidos</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-gray-600 text-[10px] uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">#</th>
                      <th className="text-left px-5 py-3 font-medium">Restaurante</th>
                      <th className="text-left px-5 py-3 font-medium">Plan</th>
                      <th className="text-left px-5 py-3 font-medium">Estado</th>
                      <th className="text-right px-5 py-3 font-medium">Pedidos 30d</th>
                      <th className="text-right px-5 py-3 font-medium">País</th>
                      <th className="text-right px-5 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topRestaurants.map((r, i) => {
                      const subInfo = SUB_STATUS[r.sub_status] ?? SUB_STATUS.none;
                      const planColor = PLAN_COLORS[r.plan_id] ?? '#6b7280';
                      const isNew = (Date.now() - new Date(r.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                      return (
                        <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                          <td className="px-5 py-3 text-gray-600 font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-white font-medium flex items-center gap-1.5 text-sm">
                                  {r.name}
                                  {isNew && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-semibold tracking-wide">
                                      NEW
                                    </span>
                                  )}
                                </p>
                                <p className="text-gray-600 text-xs mt-0.5">/{r.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium" style={{ color: planColor }}>
                              {PLAN_LABELS[r.plan_id] ?? r.plan_id}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${subInfo.cls}`}>
                              {subInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-sm font-bold tabular-nums ${r.order_count_30d > 50 ? 'text-emerald-400' : r.order_count_30d > 10 ? 'text-white' : 'text-gray-500'}`}>
                              {r.order_count_30d.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <CountryFlag code={r.country_code} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/restaurant?id=${r.id}`}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-white transition-colors"
                              >
                                Detalle
                              </Link>
                              <a
                                href={`/${r.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:text-purple-400 transition-colors inline-flex"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {metrics.topRestaurants.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-700">Sin datos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Footer stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total órdenes históricas', value: metrics.totalOrders.toLocaleString(), icon: '📦' },
                { label: 'Órdenes esta semana', value: metrics.ordersThisWeek.toLocaleString(), icon: '📅' },
                { label: 'En trial ahora', value: String(metrics.trialingSubscriptions), icon: '⏳' },
                { label: 'Avg órdenes/restaurante', value: String(metrics.avgOrdersPerRestaurant), icon: '📊' },
              ].map(item => (
                <div key={item.label} className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-white font-bold text-base tabular-nums">{item.value}</p>
                    <p className="text-[10px] text-gray-600">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
