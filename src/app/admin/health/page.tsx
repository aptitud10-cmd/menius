'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  TrendingUp, DollarSign, Store, ShoppingBag, Users,
  ArrowLeft, RefreshCw, Loader2, Shield,
} from 'lucide-react';

interface HealthData {
  checkedAt: string;
  platform: {
    mrrEstimate: number;
    revenue7d: number;
    revenue30d: number;
    activeRests7d: number;
    activeRests30d: number;
    totalActiveRests: number;
  };
  alerts: {
    stuckOrders: { count: number; items: { id: string; order_number: string; total: number; created_at: string }[] };
    emptyMenus: { count: number; items: { id: string; name: string; slug: string; created_at: string }[] };
    inactiveRests: { count: number; items: { id: string; name: string; slug: string }[] };
    trialsExpiring: {
      count: number;
      items: { restaurant_id: string; trial_end: string; plan_id: string; daysLeft: number }[];
    };
    recentCancellations: {
      count: number;
      items: { restaurant_id: string; canceled_at: string; plan_id: string }[];
    };
  };
  subscriptions: Record<string, number>;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AlertBadge({ count, label, color }: { count: number; label: string; color: 'red' | 'amber' | 'blue' | 'green' }) {
  const colors = {
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors[color]}`}>
      {count === 0
        ? <CheckCircle className="w-4 h-4 shrink-0" />
        : <AlertTriangle className="w-4 h-4 shrink-0" />
      }
      <span className="text-sm font-semibold">{count}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchHealth = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/health');
      if (res.status === 403) { setError('No autorizado'); setLoading(false); return; }
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center">
        <div>
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white font-bold text-lg">{error}</p>
          <Link href="/admin" className="inline-block mt-4 px-4 py-2 bg-white/[0.06] text-gray-300 rounded-xl text-sm">Volver</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlerts =
    data.alerts.stuckOrders.count +
    data.alerts.emptyMenus.count +
    data.alerts.trialsExpiring.count +
    data.alerts.recentCancellations.count;

  const healthScore = Math.max(0, 100 - totalAlerts * 5);
  const scoreColor = healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-400" /> Salud de la Plataforma
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Última actualización: {new Date(data.checkedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Health score + alert summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="col-span-2 md:col-span-1 bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5 flex flex-col items-center justify-center text-center">
            <p className={`text-5xl font-black tabular-nums ${scoreColor}`}>{healthScore}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Health Score</p>
            <p className="text-[11px] text-gray-700 mt-1">{totalAlerts} alertas activas</p>
          </div>
          <AlertBadge count={data.alerts.stuckOrders.count} label="pedidos atascados" color={data.alerts.stuckOrders.count > 0 ? 'red' : 'green'} />
          <AlertBadge count={data.alerts.trialsExpiring.count} label="trials por vencer" color={data.alerts.trialsExpiring.count > 0 ? 'amber' : 'green'} />
          <AlertBadge count={data.alerts.recentCancellations.count} label="cancelaciones (7d)" color={data.alerts.recentCancellations.count > 0 ? 'red' : 'green'} />
        </div>

        {/* Platform KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KpiCard icon={<DollarSign className="w-4 h-4" />} label="MRR estimado" value={fmtMoney(data.platform.mrrEstimate)} color="emerald" />
          <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Ingresos 7d" value={fmtMoney(data.platform.revenue7d)} color="blue" />
          <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Ingresos 30d" value={fmtMoney(data.platform.revenue30d)} color="purple" />
          <KpiCard icon={<Store className="w-4 h-4" />} label="Rests. activos" value={String(data.platform.totalActiveRests)} color="amber" />
          <KpiCard icon={<ShoppingBag className="w-4 h-4" />} label="Con pedidos 7d" value={String(data.platform.activeRests7d)} color="blue" />
          <KpiCard icon={<Users className="w-4 h-4" />} label="Con pedidos 30d" value={String(data.platform.activeRests30d)} color="purple" />
        </div>

        {/* Subscription health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Section title="Estado de suscripciones" icon={<Shield className="w-4 h-4 text-purple-400" />}>
            <div className="space-y-2">
              {Object.entries(data.subscriptions).map(([status, count]) => {
                const statusConfig: Record<string, { label: string; bar: string }> = {
                  active: { label: 'Activos', bar: 'bg-emerald-500' },
                  trialing: { label: 'Trial', bar: 'bg-amber-500' },
                  canceled: { label: 'Cancelados', bar: 'bg-red-500' },
                  past_due: { label: 'Vencidos', bar: 'bg-orange-500' },
                  incomplete: { label: 'Incompletos', bar: 'bg-gray-500' },
                };
                const total = Object.values(data.subscriptions).reduce((a, b) => a + b, 0);
                const cfg = statusConfig[status] ?? { label: status, bar: 'bg-gray-600' };
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-gray-400 shrink-0">{cfg.label}</span>
                    <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-white w-8 text-right">{count}</span>
                    <span className="text-xs text-gray-600 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Trials expiring */}
          <Section
            title={`Trials por vencer (7 días)`}
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            badge={data.alerts.trialsExpiring.count}
          >
            {data.alerts.trialsExpiring.items.length === 0 ? (
              <EmptyState icon="✅" text="Sin trials próximos a vencer" />
            ) : (
              <div className="space-y-2">
                {data.alerts.trialsExpiring.items.map((t) => (
                  <div key={t.restaurant_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 text-xs truncate flex-1">{t.restaurant_id.slice(0, 8)}…</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 mx-2">{t.plan_id}</span>
                    <span className={`text-xs font-bold tabular-nums ${t.daysLeft <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
                      {t.daysLeft}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Stuck orders */}
          <Section
            title="Pedidos atascados >24h en 'pending'"
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            badge={data.alerts.stuckOrders.count}
            badgeColor="red"
          >
            {data.alerts.stuckOrders.items.length === 0 ? (
              <EmptyState icon="✅" text="Sin pedidos atascados" />
            ) : (
              <div className="space-y-2">
                {data.alerts.stuckOrders.items.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm border border-red-500/10 rounded-lg px-3 py-2 bg-red-500/5">
                    <span className="font-mono text-red-300 text-xs">#{o.order_number}</span>
                    <span className="text-gray-400 text-xs">{fmtMoney(Number(o.total))}</span>
                    <span className="text-red-400 text-xs">
                      {Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60))}h atrás
                    </span>
                  </div>
                ))}
                {data.alerts.stuckOrders.count > data.alerts.stuckOrders.items.length && (
                  <p className="text-xs text-gray-600 text-center">
                    +{data.alerts.stuckOrders.count - data.alerts.stuckOrders.items.length} más
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* Recent cancellations */}
          <Section
            title="Cancelaciones recientes (7 días)"
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            badge={data.alerts.recentCancellations.count}
            badgeColor="red"
          >
            {data.alerts.recentCancellations.items.length === 0 ? (
              <EmptyState icon="✅" text="Sin cancelaciones recientes" />
            ) : (
              <div className="space-y-2">
                {data.alerts.recentCancellations.items.map((c) => (
                  <div key={c.restaurant_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 text-xs truncate flex-1">{c.restaurant_id.slice(0, 8)}…</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 mx-2">{c.plan_id}</span>
                    <span className="text-red-400 text-xs">
                      {new Date(c.canceled_at ?? '').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Empty menus */}
          <Section
            title="Restaurantes sin productos activos"
            icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
            badge={data.alerts.emptyMenus.count}
            badgeColor="amber"
          >
            {data.alerts.emptyMenus.items.length === 0 ? (
              <EmptyState icon="✅" text="Todos tienen productos" />
            ) : (
              <div className="space-y-2">
                {data.alerts.emptyMenus.items.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{r.name}</p>
                      <p className="text-gray-600 text-xs">/{r.slug}</p>
                    </div>
                    <span className="text-gray-600 text-xs ml-3 shrink-0">
                      {new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                    </span>
                    <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer"
                      className="ml-3 text-[10px] text-purple-400 hover:text-purple-300 underline shrink-0">
                      ver
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Inactive restaurants */}
          <Section
            title="Restaurantes sin pedidos en 30 días"
            icon={<Store className="w-4 h-4 text-gray-400" />}
            badge={data.alerts.inactiveRests.count}
            badgeColor="amber"
          >
            {data.alerts.inactiveRests.items.length === 0 ? (
              <EmptyState icon="✅" text="Todos tienen actividad reciente" />
            ) : (
              <div className="space-y-2">
                {data.alerts.inactiveRests.items.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{r.name}</p>
                      <p className="text-gray-600 text-xs">/{r.slug}</p>
                    </div>
                    <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer"
                      className="ml-3 text-[10px] text-purple-400 hover:text-purple-300 underline shrink-0">
                      ver
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

      </div>
    </div>
  );
}

function Section({
  title, icon, children, badge, badgeColor = 'amber',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  badgeColor?: 'red' | 'amber';
}) {
  const badgeColors = {
    red: 'bg-red-500/20 text-red-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };
  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>{badge}</span>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };
  const c = colors[color] ?? colors.purple;
  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
      <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center mb-2`}>
        <span className={c.text}>{icon}</span>
      </div>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
