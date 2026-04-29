'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, ShoppingBag, TrendingUp, Clock, AlertTriangle,
  ExternalLink, Loader2, Shield, Megaphone, Sparkles, Activity, UserPlus, Mail,
  CreditCard, TrendingDown, Bell, LogIn,
} from 'lucide-react';
import type { ActivityEvent } from '@/app/api/admin/activity/route';

interface AdminStats {
  totalRestaurants: number;
  totalOrders: number;
  todayOrders: number;
  weekOrders: number;
  newThisWeek: number;
  planCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  trialExpiringSoon: number;
  weeklySignups: { week: string; count: number }[];
  restaurants: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    plan: string;
    status: string;
    trial_end: string | null;
    currency: string;
    owner_email: string;
    owner_name: string;
  }[];
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Starter',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Business',
  none: 'Sin plan',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Trial', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  active: { label: 'Activo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  past_due: { label: 'Vencido', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  none: { label: 'Sin sub', color: 'text-gray-500 bg-white/[0.04] border-white/[0.08]' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const EVENT_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  order: <ShoppingBag className="w-3.5 h-3.5" />,
  signup: <UserPlus className="w-3.5 h-3.5" />,
  payment_failed: <CreditCard className="w-3.5 h-3.5" />,
  trial_ending: <Clock className="w-3.5 h-3.5" />,
  cancellation: <TrendingDown className="w-3.5 h-3.5" />,
  churn_risk: <AlertTriangle className="w-3.5 h-3.5" />,
};
const SEV_COLOR: Record<ActivityEvent['severity'], string> = {
  danger: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
};
const SEV_DOT: Record<ActivityEvent['severity'], string> = {
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400/60',
};

export default function AdminPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState<ActivityEvent[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [search, setSearch] = useState('');
  const [impersonating, setImpersonating] = useState<string | null>(null);

  async function impersonate(restaurantId: string, restaurantName: string) {
    if (impersonating) return;
    if (!confirm(`Vas a entrar al dashboard de "${restaurantName}" como su dueño. Tu sesión actual será reemplazada. ¿Continuar?`)) return;
    setImpersonating(restaurantId);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      const json = await res.json();
      if (!res.ok || !json.actionLink) {
        alert(`Error: ${json.error ?? 'No se pudo generar el acceso'}`);
        setImpersonating(null);
        return;
      }
      window.location.href = json.actionLink;
    } catch (e) {
      alert(`Error de red: ${e instanceof Error ? e.message : 'desconocido'}`);
      setImpersonating(null);
    }
  }

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        setError('No tienes acceso al panel de administración.');
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }, []);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity');
      const json = await res.json();
      setFeed(json.events ?? []);
      setUrgentCount((json.events ?? []).filter((e: ActivityEvent) => e.severity === 'danger').length);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); fetchFeed(); }, [fetchStats, fetchFeed]);

  // Poll feed every 30s
  useEffect(() => {
    const id = setInterval(fetchFeed, 30_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Acceso denegado</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <Link href="/app" className="inline-block mt-6 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors">
            Ir al dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const daysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    const days = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredRestaurants = data.restaurants.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.owner_email.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070707]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-semibold text-white">MENIUS Admin</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar restaurante, slug o email…"
              className="w-full px-3 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Link href="/admin/alerts" className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors">
              <Bell className="w-3.5 h-3.5" /> Alertas
              {urgentCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                  {urgentCount}
                </span>
              )}
            </Link>
            <Link href="/admin/metrics" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors">
              <TrendingUp className="w-3.5 h-3.5" /> Métricas
            </Link>
            <Link href="/admin/health" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors">
              <Activity className="w-3.5 h-3.5" /> Salud
            </Link>

            <span className="w-px h-5 bg-white/[0.08] mx-1" />

            <Link href="/admin/users" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors">
              <UserPlus className="w-3.5 h-3.5" /> Usuarios
            </Link>
            <Link href="/admin/support" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-300 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5" /> Soporte
            </Link>

            <span className="w-px h-5 bg-white/[0.08] mx-1" />

            <Link href="/admin/marketing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-xs text-purple-200 transition-colors">
              <Megaphone className="w-3.5 h-3.5" /> Marketing
            </Link>
            <Link href="/admin/social-generator" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-xs text-purple-200 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Social AI
            </Link>
            <Link href="/admin/onboarding" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-xs text-purple-200 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Onboarding AI
            </Link>

            <span className="w-px h-5 bg-white/[0.08] mx-1" />

            <Link href="/app" className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-gray-400 hover:text-white transition-colors">
              Mi Dashboard →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Resumen general</h1>
          <p className="text-xs text-gray-500 mt-0.5">Estado del SaaS · {new Date().toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<Store className="w-5 h-5" />} label="Restaurantes" value={data.totalRestaurants} color="purple" />
          <StatCard icon={<UserPlus className="w-5 h-5" />} label="Nuevos esta semana" value={data.newThisWeek ?? 0} color="indigo" />
          <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Pedidos totales" value={data.totalOrders} color="blue" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Pedidos hoy" value={data.todayOrders} color="emerald" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Pedidos semana" value={data.weekOrders} color="amber" />
        </div>

        {/* Alerts */}
        {data.trialExpiringSoon > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              <strong>{data.trialExpiringSoon}</strong> restaurante{data.trialExpiringSoon > 1 ? 's' : ''} con trial que vence en 3 días o menos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Plans distribution */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Por plan</h3>
            <div className="space-y-3">
              {Object.entries(data.planCounts).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{PLAN_LABELS[plan] ?? plan}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
              {Object.keys(data.planCounts).length === 0 && (
                <p className="text-sm text-gray-600">Sin datos</p>
              )}
            </div>
          </div>

          {/* Status distribution */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Por estado</h3>
            <div className="space-y-3">
              {Object.entries(data.statusCounts).map(([status, count]) => {
                const info = STATUS_LABELS[status] ?? STATUS_LABELS.none;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${info.color}`}>{info.label}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly signups */}
          <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Registros por semana</h3>
            <div className="space-y-3">
              {data.weeklySignups.map(w => (
                <div key={w.week} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{w.week}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.max(5, (w.count / Math.max(...data.weeklySignups.map(x => x.count), 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white w-6 text-right">{w.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed widget */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Actividad reciente</h3>
              {urgentCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 font-semibold">
                  {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Link href="/admin/alerts" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
              Ver todo →
            </Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {feed.length === 0 ? (
              <p className="px-5 py-4 text-xs text-gray-600">Cargando actividad…</p>
            ) : feed.slice(0, 8).map(event => (
              <div key={event.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[event.severity]}`} />
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.04] ${SEV_COLOR[event.severity]}`}>
                  {EVENT_ICON[event.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate">{event.title}</p>
                  <p className="text-[10px] text-gray-600 truncate">{event.restaurant_name ?? event.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-600">{timeAgo(event.created_at)}</span>
                  {event.restaurant_id && (
                    <Link
                      href={`/admin/restaurant?id=${event.restaurant_id}`}
                      className="text-[10px] text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restaurants table */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Restaurantes recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Restaurante</th>
                  <th className="text-left px-5 py-3 font-medium">Dueño</th>
                  <th className="text-left px-5 py-3 font-medium">Plan</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Trial</th>
                  <th className="text-right px-5 py-3 font-medium">Registrado</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-600">Sin resultados para "{search}"</td></tr>
                )}
                {filteredRestaurants.map(r => {
                  const info = STATUS_LABELS[r.status] ?? STATUS_LABELS.none;
                  const trial = daysLeft(r.trial_end);
                  const isNew = (Date.now() - new Date(r.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-white font-medium flex items-center gap-1.5">
                              {r.name}
                              {isNew && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold">NUEVO</span>}
                            </p>
                            <p className="text-gray-600 text-xs">/{r.slug} · {r.currency}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {r.owner_name && <p className="text-gray-300 text-sm">{r.owner_name}</p>}
                        {r.owner_email && (
                          <a href={`mailto:${r.owner_email}`} className="text-gray-500 text-xs hover:text-purple-400 transition-colors">
                            {r.owner_email}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400">{PLAN_LABELS[r.plan] ?? r.plan}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${info.color}`}>{info.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {trial !== null ? (
                          <span className={trial <= 3 ? 'text-amber-400 font-semibold' : 'text-gray-500'}>
                            {trial > 0 ? `${trial}d` : 'Vencido'}
                          </span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => impersonate(r.id, r.name)}
                            disabled={impersonating !== null}
                            title="Entrar al dashboard de este restaurante"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {impersonating === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                            Entrar
                          </button>
                          <Link
                            href={`/admin/restaurant?id=${r.id}`}
                            className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white transition-colors"
                          >
                            Detalle
                          </Link>
                          <a
                            href={`/${r.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-purple-400 transition-colors"
                            title="Ver menú público"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };
  const c = colors[color] ?? colors.purple;

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] p-4">
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        <span className={c.text}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
