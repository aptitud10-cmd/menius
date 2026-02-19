'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, ShoppingBag, Users, TrendingUp, Clock, AlertTriangle,
  ExternalLink, Loader2, Shield,
} from 'lucide-react';

interface AdminStats {
  totalRestaurants: number;
  totalOrders: number;
  todayOrders: number;
  weekOrders: number;
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

export default function AdminPage() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => { fetchStats(); }, [fetchStats]);

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

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" /> Admin MENIUS
            </h1>
            <p className="text-sm text-gray-500 mt-1">Panel de administración del SaaS</p>
          </div>
          <Link href="/app" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard →
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Store className="w-5 h-5" />} label="Restaurantes" value={data.totalRestaurants} color="purple" />
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
                  <th className="text-left px-5 py-3 font-medium">Plan</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Trial</th>
                  <th className="text-right px-5 py-3 font-medium">Registrado</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.restaurants.map(r => {
                  const info = STATUS_LABELS[r.status] ?? STATUS_LABELS.none;
                  const trial = daysLeft(r.trial_end);
                  return (
                    <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <p className="text-white font-medium">{r.name}</p>
                        <p className="text-gray-600 text-xs">/{r.slug}</p>
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
                        <a
                          href={`/r/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-purple-400 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
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
