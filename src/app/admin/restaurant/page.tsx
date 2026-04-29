'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, ShoppingBag, TrendingUp, Users,
  DollarSign, Clock, AlertTriangle, CheckCircle, XCircle,
  Package, Tag, Mail, Phone, Globe, Calendar, CreditCard,
  RefreshCw, ChevronRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface RestaurantDetail {
  restaurant: {
    id: string; name: string; slug: string; currency: string;
    country_code: string; is_active: boolean; created_at: string;
    notification_email: string; phone: string;
    commission_plan: boolean | null;
    ownerEmail: string; ownerName: string; lastSignIn: string | null;
  };
  subscription: {
    plan_id: string; status: string; trial_end: string | null;
    stripe_customer_id: string | null; current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  stats: {
    totalOrders: number; ordersThisMonth: number; ordersThisWeek: number;
    ordersToday: number; revenueThisMonth: number; productCount: number;
    categoryCount: number; stripeMrr: number; daysSinceLastOrder: number | null;
  };
  recentOrders: {
    id: string; order_number: string; customer_name: string;
    total: number; status: string; created_at: string; payment_method: string;
  }[];
  dailyOrders: { day: string; count: number; revenue: number }[];
  stripePayments: { date: string; amount: number; status: string }[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  business: '#f59e0b', pro: '#8b5cf6', starter: '#3b82f6',
  free: '#6b7280', none: '#374151',
};
const PLAN_LABELS: Record<string, string> = {
  business: 'Business', pro: 'Pro', starter: 'Starter', free: 'Free', none: 'Sin plan',
};
const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  trialing: { label: 'Trial', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  past_due: { label: 'Vencido', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  canceled: { label: 'Cancelado', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  none: { label: 'Sin sub', cls: 'text-gray-500 bg-white/[0.04] border-white/[0.08]' },
};
const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  confirmed: { label: 'Confirmado', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  preparing: { label: 'Preparando', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  ready: { label: 'Listo', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  delivered: { label: 'Entregado', cls: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
  cancelled: { label: 'Cancelado', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return <div className="h-12 flex items-center text-xs text-gray-700">Sin datos</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((d, i) => {
        const h = Math.max(4, (d.count / max) * 44);
        const isToday = i === data.length - 1;
        return (
          <div key={d.day} className="flex-1 group relative">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${h}px`,
                background: isToday ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
              {d.count} pedidos
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({
  icon, label, value, accent = '#8b5cf6', alert,
}: {
  icon: React.ReactNode; label: string; value: string; accent?: string; alert?: boolean;
}) {
  return (
    <div className={`bg-[#0d0d0d] border rounded-xl p-4 ${alert ? 'border-red-500/30' : 'border-white/[0.07]'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}18` }}>
          <span style={{ color: accent }} className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
        </div>
      </div>
      <p className={`text-xl font-bold tabular-nums ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RestaurantDetailPage() {
  const params = useSearchParams();
  const restaurantId = params.get('id');

  const [data, setData] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingCommission, setTogglingCommission] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/restaurant-detail?id=${restaurantId}`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setData(json);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  async function toggleCommission(enable: boolean) {
    if (!restaurantId || togglingCommission) return;
    const action = enable ? 'activar' : 'desactivar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} plan comisión 4% para este restaurante?`)) return;
    setTogglingCommission(true);
    try {
      const res = await fetch('/api/admin/toggle-commission-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, enable }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(`Error: ${json.error ?? 'No se pudo actualizar'}`);
      } else {
        await load();
      }
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : 'desconocido'}`);
    }
    setTogglingCommission(false);
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <p className="text-gray-500 text-sm">No se especificó restaurante.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-600">Cargando datos del restaurante…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{error || 'Sin datos'}</p>
          <Link href="/admin" className="inline-block mt-4 text-xs text-purple-400 hover:text-purple-300">← Admin</Link>
        </div>
      </div>
    );
  }

  const { restaurant, subscription, stats, recentOrders, dailyOrders, stripePayments } = data;
  const subStatus = subscription?.status ?? 'none';
  const subMeta = STATUS_META[subStatus] ?? STATUS_META.none;
  const planColor = PLAN_COLORS[subscription?.plan_id ?? 'none'] ?? '#6b7280';
  const planLabel = PLAN_LABELS[subscription?.plan_id ?? 'none'] ?? 'Sin plan';
  const trialDaysLeft = subscription?.trial_end
    ? Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86400000)
    : null;
  const atRisk = stats.daysSinceLastOrder !== null && stats.daysSinceLastOrder >= 7;
  const currency = restaurant.currency?.toUpperCase() || 'USD';

  const fmt = (n: number) =>
    new Intl.NumberFormat('es', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#070707]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 text-sm transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
            <p className="text-sm font-semibold text-white truncate max-w-[200px]">{restaurant.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${subMeta.cls}`}>{subMeta.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Recargar
            </button>
            <a
              href={`/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Ver menú
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Profile card ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Info */}
          <div className="lg:col-span-2 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{restaurant.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  menius.app/{restaurant.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: planColor }}>{planLabel}</span>
                {!restaurant.is_active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 text-red-400 bg-red-500/10">
                    Inactivo
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                {restaurant.ownerName && (
                  <p className="flex items-center gap-2 text-gray-400">
                    <Users className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    {restaurant.ownerName}
                  </p>
                )}
                {restaurant.ownerEmail && (
                  <a href={`mailto:${restaurant.ownerEmail}`} className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    {restaurant.ownerEmail}
                  </a>
                )}
                {restaurant.phone && (
                  <p className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    {restaurant.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  Registrado {new Date(restaurant.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {restaurant.lastSignIn && (
                  <p className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    Último login {new Date(restaurant.lastSignIn).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
                <p className="flex items-center gap-2 text-gray-400">
                  <Globe className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  {restaurant.country_code || '—'} · {currency}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Suscripción</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Plan</span>
                <span className="text-sm font-bold" style={{ color: planColor }}>{planLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Estado</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${subMeta.cls}`}>{subMeta.label}</span>
              </div>
              {stats.stripeMrr > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">MRR</span>
                  <span className="text-sm font-bold text-emerald-400">${stats.stripeMrr.toFixed(0)}/mes</span>
                </div>
              )}
              {trialDaysLeft !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Trial</span>
                  <span className={`text-sm font-bold ${trialDaysLeft <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
                    {trialDaysLeft > 0 ? `${trialDaysLeft} días` : 'Vencido'}
                  </span>
                </div>
              )}
              {subscription?.current_period_end && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Próximo cobro</span>
                  <span className="text-xs text-gray-400">
                    {new Date(subscription.current_period_end).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
              {subscription?.cancel_at_period_end && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> Cancelación programada
                </div>
              )}
            </div>

            {/* Plan Comisión 4% — interno, solo admin */}
            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Plan Comisión 4%</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Uso interno · 4% por orden online</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${restaurant.commission_plan ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] border-white/[0.08] text-gray-500'}`}>
                  {restaurant.commission_plan ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <button
                onClick={() => toggleCommission(!restaurant.commission_plan)}
                disabled={togglingCommission}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  restaurant.commission_plan
                    ? 'bg-red-600/20 border border-red-500/20 text-red-300 hover:bg-red-600/30'
                    : 'bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-600/30'
                }`}
              >
                {togglingCommission
                  ? 'Actualizando…'
                  : restaurant.commission_plan
                    ? 'Desactivar plan 4%'
                    : 'Activar plan 4%'}
              </button>
            </div>

            {/* Quick actions */}
            <div className="mt-5 pt-4 border-t border-white/[0.05] space-y-2">
              <a
                href={`mailto:${restaurant.ownerEmail}`}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/20 text-xs text-purple-300 hover:bg-purple-600/30 transition-colors font-medium"
              >
                <Mail className="w-3.5 h-3.5" /> Enviar email al dueño
              </a>
              <a
                href={`https://dashboard.stripe.com/customers/${subscription?.stripe_customer_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" /> Ver en Stripe
              </a>
            </div>
          </div>
        </div>

        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {(atRisk || trialDaysLeft !== null && trialDaysLeft <= 3 || subscription?.status === 'past_due' || subscription?.cancel_at_period_end) && (
          <div className="space-y-2">
            {atRisk && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Sin pedidos en {stats.daysSinceLastOrder} días — posible churn
              </div>
            )}
            {trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft >= 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Trial vence en {trialDaysLeft} días — candidato a conversión
              </div>
            )}
            {subscription?.status === 'past_due' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                Pago vencido — revisar en Stripe
              </div>
            )}
            {subscription?.cancel_at_period_end && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Cancelación programada al final del período
              </div>
            )}
          </div>
        )}

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatChip icon={<ShoppingBag />} label="Pedidos hoy" value={String(stats.ordersToday)} accent="#3b82f6" />
          <StatChip icon={<TrendingUp />} label="Pedidos este mes" value={String(stats.ordersThisMonth)} accent="#8b5cf6" />
          <StatChip icon={<DollarSign />} label={`Revenue 30d (${currency})`} value={fmt(stats.revenueThisMonth)} accent="#10b981" />
          <StatChip
            icon={<Clock />}
            label="Último pedido"
            value={stats.daysSinceLastOrder === null ? 'Nunca' : stats.daysSinceLastOrder === 0 ? 'Hoy' : `Hace ${stats.daysSinceLastOrder}d`}
            accent="#f59e0b"
            alert={atRisk}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatChip icon={<Package />} label="Productos activos" value={String(stats.productCount)} accent="#6366f1" />
          <StatChip icon={<Tag />} label="Categorías" value={String(stats.categoryCount)} accent="#ec4899" />
          <StatChip icon={<ShoppingBag />} label="Pedidos totales" value={stats.totalOrders.toLocaleString()} accent="#14b8a6" />
          <StatChip icon={<ShoppingBag />} label="Pedidos esta semana" value={String(stats.ordersThisWeek)} accent="#f97316" />
        </div>

        {/* ── Activity chart ───────────────────────────────────────────── */}
        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Pedidos últimos 30 días</p>
            <p className="text-xs text-gray-600">{stats.ordersThisMonth} total</p>
          </div>
          <Sparkline data={dailyOrders} />
        </div>

        {/* ── Recent orders + Payments ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent orders */}
          <div className="lg:col-span-2 bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Últimas órdenes</p>
              <a
                href={`/app/orders`}
                className="text-[10px] text-gray-600 hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recentOrders.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-700 text-center">Sin órdenes</p>
              ) : recentOrders.map(order => {
                const meta = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
                return (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium">
                          #{order.order_number}
                          {order.customer_name && (
                            <span className="text-gray-500 font-normal"> · {order.customer_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                      <span className="text-sm font-bold text-white tabular-nums">{fmt(order.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stripe payments */}
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">Pagos Stripe</p>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {stripePayments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-700 text-center">Sin pagos</p>
              ) : stripePayments.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">
                      {new Date(p.date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === 'succeeded'
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />
                    }
                    <span className="text-sm font-bold text-white tabular-nums">${p.amount.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
