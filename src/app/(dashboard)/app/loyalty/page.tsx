'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Star, Users, TrendingUp, Settings2, RefreshCw, Check, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoyaltyConfig {
  enabled: boolean;
  points_per_peso: number;
  min_redeem_points: number;
  peso_per_point: number;
  welcome_points: number;
}

interface LoyaltyAccount {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  customer_email: string | null;
  points: number;
  lifetime_points: number;
  created_at: string;
}

export default function LoyaltyPage() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'members'>('config');
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/loyalty');
      const data = await res.json();
      if (data.needsMigration) { setNeedsMigration(true); setLoading(false); return; }
      setConfig(data.config ?? {
        enabled: false, points_per_peso: 1, min_redeem_points: 100, peso_per_point: 0.1, welcome_points: 0,
      });
      setAccounts(data.accounts ?? []);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch('/api/tenant/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const adjustAccount = async () => {
    if (!adjustId || !adjustPoints) return;
    setAdjusting(true);
    try {
      const res = await fetch('/api/tenant/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: adjustId,
          points: parseInt(adjustPoints),
          description: adjustNote || 'Ajuste manual',
          type: 'adjust',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => a.id === adjustId ? { ...a, points: data.new_balance } : a));
        setAdjustId(null);
        setAdjustPoints('');
        setAdjustNote('');
      }
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  if (needsMigration) {
    return (
      <div className="max-w-lg">
        <h1 className="dash-heading mb-2">Programa de Lealtad</h1>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <p className="text-sm font-bold text-amber-800 mb-2">Migración requerida</p>
          <p className="text-sm text-amber-700 mb-4">
            Ejecuta <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">supabase/migration-loyalty.sql</code> en tu base de datos Supabase para activar el sistema de lealtad.
          </p>
          <pre className="text-xs bg-gray-900 text-emerald-400 p-3 rounded-xl overflow-x-auto">
            {`-- En Supabase SQL Editor:\n-- Pega el contenido de migration-loyalty.sql`}
          </pre>
        </div>
      </div>
    );
  }

  const totalMembers = accounts.length;
  const totalPoints = accounts.reduce((s, a) => s + a.points, 0);
  const avgPoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="dash-heading">Programa de Lealtad</h1>
          <p className="text-sm text-gray-500 mt-1">Fideliza a tus clientes con puntos por cada compra.</p>
        </div>
        {config && (
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold', config.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
            <span className={cn('w-2 h-2 rounded-full', config.enabled ? 'bg-emerald-500' : 'bg-gray-400')} />
            {config.enabled ? 'Activo' : 'Inactivo'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Miembros', value: String(totalMembers), color: 'text-blue-500' },
          { icon: Star, label: 'Puntos activos', value: totalPoints.toLocaleString(), color: 'text-amber-500' },
          { icon: TrendingUp, label: 'Puntos promedio', value: String(avgPoints), color: 'text-violet-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
            <p className="text-xl font-black text-gray-900 tabular-nums">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['config', 'members'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all', activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}
          >
            {tab === 'config' ? <span className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Configuración</span> : <span className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Miembros ({totalMembers})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'config' && config && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 max-w-lg">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Programa activo</p>
              <p className="text-xs text-gray-500">Los clientes ganarán puntos en sus pedidos</p>
            </div>
            <button
              onClick={() => setConfig(c => c ? { ...c, enabled: !c.enabled } : c)}
              className={cn('w-12 h-6 rounded-full transition-colors relative', config.enabled ? 'bg-emerald-500' : 'bg-gray-200')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all', config.enabled ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
            </button>
          </div>

          <div className="border-t border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Puntos por peso gastado</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={config.points_per_peso}
                onChange={e => setConfig(c => c ? { ...c, points_per_peso: parseFloat(e.target.value) || 1 } : c)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Ej: 1 = 1 punto por cada $1 gastado</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Mínimo para canjear</label>
              <input
                type="number"
                min="1"
                value={config.min_redeem_points}
                onChange={e => setConfig(c => c ? { ...c, min_redeem_points: parseInt(e.target.value) || 100 } : c)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Valor por punto (pesos)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={config.peso_per_point}
                onChange={e => setConfig(c => c ? { ...c, peso_per_point: parseFloat(e.target.value) || 0.1 } : c)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Ej: 0.10 = 10 puntos equivalen a $1</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Puntos de bienvenida</label>
              <input
                type="number"
                min="0"
                value={config.welcome_points}
                onChange={e => setConfig(c => c ? { ...c, welcome_points: parseInt(e.target.value) || 0 } : c)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Guardado</> : 'Guardar cambios'}
          </button>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Gift className="w-10 h-10 opacity-30" />
              <p className="text-sm">Sin miembros todavía</p>
              <p className="text-xs text-center max-w-[200px]">Los clientes se registrarán automáticamente al hacer su primer pedido</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:grid grid-cols-[auto_80px_80px_100px_80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cliente</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Puntos</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Total vida</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Miembro desde</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Ajustar</p>
              </div>
              <div className="divide-y divide-gray-100">
                {accounts.map(a => (
                  <div key={a.id}>
                    <div className="grid sm:grid-cols-[auto_80px_80px_100px_80px] gap-4 px-5 py-3.5 items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.customer_name ?? 'Sin nombre'}</p>
                        <p className="text-xs text-gray-400">{a.customer_phone}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 tabular-nums text-center">{a.points.toLocaleString()}</p>
                      <p className="text-sm text-gray-500 tabular-nums text-center">{a.lifetime_points.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 text-center">{new Date(a.created_at).toLocaleDateString('es-MX')}</p>
                      <div className="flex items-center justify-center">
                        <button onClick={() => setAdjustId(adjustId === a.id ? null : a.id)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <Plus className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {adjustId === a.id && (
                      <div className="px-5 pb-4 flex items-center gap-2 bg-gray-50 border-t border-gray-100">
                        <input
                          type="number"
                          value={adjustPoints}
                          onChange={e => setAdjustPoints(e.target.value)}
                          placeholder="Puntos (ej. -50 o +100)"
                          className="w-36 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
                        />
                        <input
                          value={adjustNote}
                          onChange={e => setAdjustNote(e.target.value)}
                          placeholder="Nota (opcional)"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
                        />
                        <button
                          onClick={adjustAccount}
                          disabled={adjusting || !adjustPoints}
                          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                        >
                          {adjusting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Aplicar'}
                        </button>
                        <button onClick={() => setAdjustId(null)} className="p-2 text-gray-400 hover:text-gray-900">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
