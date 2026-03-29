'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, Loader2, Shield, UserPlus, Mail,
  Store, Search, RefreshCw, Copy, Check,
} from 'lucide-react';

interface UserRow {
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
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Trial', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  active: { label: 'Activo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  past_due: { label: 'Vencido', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  none: { label: 'Sin sub', color: 'text-gray-500 bg-white/[0.04] border-white/[0.08]' },
};

const PLAN_LABELS: Record<string, string> = {
  basic: 'Starter', starter: 'Starter', pro: 'Pro',
  business: 'Business', enterprise: 'Business', none: 'Sin plan',
};

const CURRENCY_FLAG: Record<string, string> = {
  USD: '🇺🇸', COP: '🇨🇴', MXN: '🇲🇽', ARS: '🇦🇷', CLP: '🇨🇱',
  PEN: '🇵🇪', BRL: '🇧🇷', EUR: '🇪🇺', GBP: '🇬🇧', VES: '🇻🇪',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) { setError('No tienes acceso.'); setLoading(false); return; }
      const json = await res.json();
      if (json.error) { setError(json.error); } else { setUsers(json.restaurants ?? []); }
    } catch { setError('Error de conexión'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.owner_email.toLowerCase().includes(q) || u.owner_name.toLowerCase().includes(q) || u.slug.includes(q);
  });

  const newThisWeek = users.filter(u => Date.now() - new Date(u.created_at).getTime() < 7 * 24 * 60 * 60 * 1000);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(null), 2000);
  };

  const daysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    return Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">{error}</p>
        <Link href="/admin" className="inline-block mt-4 text-sm text-purple-400 hover:text-purple-300">← Volver al admin</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-400" /> Usuarios registrados
              </h1>
              <p className="text-sm text-gray-500 mt-1">{users.length} restaurantes · {newThisWeek.length} nuevos esta semana</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {/* New this week highlight */}
        {newThisWeek.length > 0 && (
          <div className="mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Nuevos esta semana ({newThisWeek.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {newThisWeek.map(u => (
                <div key={u.id} className="bg-[#0a0a0a] rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{u.name}</p>
                      <p className="text-gray-600 text-xs">/{u.slug}</p>
                    </div>
                    <span className="text-lg flex-shrink-0">{CURRENCY_FLAG[u.currency] ?? '🌍'}</span>
                  </div>
                  {u.owner_name && <p className="text-gray-400 text-sm">{u.owner_name}</p>}
                  {u.owner_email && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <a href={`mailto:${u.owner_email}`} className="text-indigo-400 text-xs hover:text-indigo-300 truncate">
                        {u.owner_email}
                      </a>
                      <button onClick={() => copyEmail(u.owner_email)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
                        {copied === u.owner_email ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <a href={`/${u.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-purple-400 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + table */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mr-auto">
              <Store className="w-4 h-4 text-gray-500" /> Todos los restaurantes
            </h3>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 w-72">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, slug…"
                className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Restaurante</th>
                  <th className="text-left px-5 py-3 font-medium">Dueño / Email</th>
                  <th className="text-left px-5 py-3 font-medium">País</th>
                  <th className="text-left px-5 py-3 font-medium">Plan</th>
                  <th className="text-left px-5 py-3 font-medium">Estado</th>
                  <th className="text-right px-5 py-3 font-medium">Trial</th>
                  <th className="text-right px-5 py-3 font-medium">Registrado</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-gray-600 text-sm">
                      {search ? 'Sin resultados para esa búsqueda' : 'Sin restaurantes registrados'}
                    </td>
                  </tr>
                )}
                {filtered.map(r => {
                  const info = STATUS_LABELS[r.status] ?? STATUS_LABELS.none;
                  const trial = daysLeft(r.trial_end);
                  const isNew = Date.now() - new Date(r.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
                  return (
                    <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <p className="text-white font-medium flex items-center gap-1.5">
                          {r.name}
                          {isNew && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold">NUEVO</span>}
                        </p>
                        <p className="text-gray-600 text-xs">/{r.slug}</p>
                      </td>
                      <td className="px-5 py-3">
                        {r.owner_name && <p className="text-gray-300 text-sm">{r.owner_name}</p>}
                        {r.owner_email ? (
                          <div className="flex items-center gap-1.5">
                            <a href={`mailto:${r.owner_email}`} className="text-gray-500 text-xs hover:text-purple-400 transition-colors flex items-center gap-1">
                              <Mail className="w-3 h-3" />{r.owner_email}
                            </a>
                            <button onClick={() => copyEmail(r.owner_email)} className="text-gray-700 hover:text-gray-400">
                              {copied === r.owner_email ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-700 text-xs">Sin email</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-lg">{CURRENCY_FLAG[r.currency] ?? '🌍'}</span>
                        <span className="text-gray-500 text-xs ml-1.5">{r.currency}</span>
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
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-purple-400 transition-colors">
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
