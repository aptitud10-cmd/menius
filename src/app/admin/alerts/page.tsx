'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertTriangle, XCircle, Clock, UserPlus,
  ShoppingBag, CreditCard, TrendingDown, CheckCircle,
  RefreshCw, ExternalLink, Mail, ChevronRight,
} from 'lucide-react';
import type { ActivityEvent } from '@/app/api/admin/activity/route';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertsData {
  events: ActivityEvent[];
  generatedAt: string;
}

type Filter = 'all' | 'danger' | 'warning' | 'info';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const TYPE_META: Record<ActivityEvent['type'], { icon: React.ReactNode; label: string }> = {
  order: { icon: <ShoppingBag className="w-4 h-4" />, label: 'Orden' },
  signup: { icon: <UserPlus className="w-4 h-4" />, label: 'Registro' },
  payment_failed: { icon: <CreditCard className="w-4 h-4" />, label: 'Pago' },
  trial_ending: { icon: <Clock className="w-4 h-4" />, label: 'Trial' },
  cancellation: { icon: <TrendingDown className="w-4 h-4" />, label: 'Baja' },
  churn_risk: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Riesgo' },
};

const SEV_STYLE: Record<ActivityEvent['severity'], { dot: string; border: string; bg: string; text: string }> = {
  danger: { dot: 'bg-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400' },
  warning: { dot: 'bg-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  info: { dot: 'bg-blue-400', border: 'border-transparent', bg: '', text: 'text-blue-400' },
};

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: ActivityEvent }) {
  const meta = TYPE_META[event.type];
  const sev = SEV_STYLE[event.severity];
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`relative flex items-start gap-4 px-5 py-4 border-b border-white/[0.04] ${sev.bg} hover:bg-white/[0.02] transition-colors group`}>
      {/* Severity dot */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
      </div>

      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sev.bg || 'bg-white/[0.04]'} border ${sev.border || 'border-white/[0.08]'}`}>
        <span className={sev.text}>{meta.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-snug">{event.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>
          </div>
          <span className="text-[10px] text-gray-600 flex-shrink-0 mt-0.5">{timeAgo(event.created_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {event.restaurant_id && (
            <Link
              href={`/admin/restaurant?id=${event.restaurant_id}`}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.1] text-gray-400 hover:text-white transition-colors"
            >
              Detalle <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          {event.restaurant_slug && (
            <a
              href={`/${event.restaurant_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.1] text-gray-400 hover:text-white transition-colors"
            >
              Ver menú <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {(event.type === 'trial_ending' || event.type === 'cancellation' || event.type === 'payment_failed') && (
            <a
              href={`mailto:?subject=Hola desde MENIUS&body=`}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-purple-600/20 border border-purple-500/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
            >
              <Mail className="w-3 h-3" /> Email
            </a>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-gray-600 hover:text-gray-400 transition-colors ml-auto"
          >
            <CheckCircle className="w-3 h-3" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/activity');
      const json = await res.json();
      setData(json);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const events = (data?.events ?? []).filter(e => filter === 'all' || e.severity === filter);
  const counts = {
    danger: (data?.events ?? []).filter(e => e.severity === 'danger').length,
    warning: (data?.events ?? []).filter(e => e.severity === 'warning').length,
    info: (data?.events ?? []).filter(e => e.severity === 'info').length,
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#070707]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 text-sm transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Admin
            </Link>
            <span className="text-gray-800">/</span>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h1 className="text-sm font-semibold text-white">Alertas & Actividad</h1>
            </div>
            {counts.danger > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-semibold">
                {counts.danger} urgente{counts.danger > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data?.generatedAt && (
              <span className="text-xs text-gray-600">
                {new Date(data.generatedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {([
            { key: 'all', label: 'Todo', count: (data?.events ?? []).length },
            { key: 'danger', label: 'Urgente', count: counts.danger },
            { key: 'warning', label: 'Atención', count: counts.warning },
            { key: 'info', label: 'Info', count: counts.info },
          ] as { key: Filter; label: string; count: number }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === tab.key
                  ? 'bg-white/[0.08] border border-white/[0.12] text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab.key === 'danger' ? 'bg-red-500/20 text-red-400'
                  : tab.key === 'warning' ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/[0.06] text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0d0d0d] border border-red-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Urgente</p>
            </div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{counts.danger}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">pagos fallidos · cancelaciones · churn</p>
          </div>
          <div className="bg-[#0d0d0d] border border-amber-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Atención</p>
            </div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{counts.warning}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">trials por vencer · inactividad</p>
          </div>
          <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actividad (6h)</p>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{counts.info}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">órdenes · registros recientes</p>
          </div>
        </div>

        {/* Event list */}
        <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-xs font-semibold text-white">
              {filter === 'all' ? 'Todos los eventos' : filter === 'danger' ? 'Eventos urgentes' : filter === 'warning' ? 'Requieren atención' : 'Actividad reciente'}
            </p>
            <p className="text-[10px] text-gray-600">hover para acciones</p>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/40" />
              <p className="text-sm text-gray-600">Sin eventos en este filtro</p>
            </div>
          ) : (
            events.map(event => <EventCard key={event.id} event={event} />)
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-gray-600 px-1">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Urgente — acción inmediata</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Atención — próximos días</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Info — actividad normal</span>
        </div>

      </div>
    </div>
  );
}
