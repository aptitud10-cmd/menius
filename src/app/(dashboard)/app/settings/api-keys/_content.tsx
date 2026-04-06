'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  raw?: string;
}

export default function ApiKeysContent() {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/api-keys');
      const data = await res.json();
      if (res.ok) setKeys(data.keys ?? []);
      else setError(data.error ?? (en ? 'Error loading keys' : 'Error cargando keys'));
    } catch {
      setError(en ? 'Connection error' : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [en]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/tenant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (en ? 'Error creating key' : 'Error creando key')); return; }
      setNewRawKey(data.key.raw);
      setKeys(prev => [data.key, ...prev]);
      setNewKeyName('');
      setShowCreate(false);
    } catch {
      setError(en ? 'Connection error' : 'Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/tenant/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setKeys(prev => prev.filter(k => k.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="dash-heading">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            {en ? 'Programmatic access to your restaurant for external integrations.' : 'Acceso programático a tu restaurante para integraciones externas.'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {en ? 'New key' : 'Nueva key'}
        </button>
      </div>

      {/* New key revealed banner */}
      {newRawKey && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">{en ? 'Copy your API Key now!' : '¡Copia tu API Key ahora!'}</p>
              <p className="text-xs text-amber-700 mt-0.5">{en ? "You won't see it again. Store it somewhere safe." : 'No volverás a verla completa. Guárdala en un lugar seguro.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-4 py-3">
            <code className="flex-1 text-xs font-mono text-gray-800 break-all">{newRawKey}</code>
            <button
              onClick={() => handleCopy(newRawKey)}
              className="flex-shrink-0 p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewRawKey(null)}
            className="mt-3 text-xs text-amber-600 hover:text-amber-800 transition-colors"
          >
            {en ? "I've saved it — close" : 'La guardé — cerrar'}
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">{en ? 'New API Key' : 'Nueva API Key'}</h3>
          <div className="flex gap-2">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={en ? 'e.g. POS Integration, Custom Webhook…' : 'Ej. Integración POS, Webhook custom…'}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : (en ? 'Create' : 'Crear')}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}

      {/* Keys list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" /> {en ? 'Loading…' : 'Cargando…'}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Key className="w-10 h-10 opacity-30" />
            <p className="text-sm">{en ? 'No API keys yet' : 'Sin API keys todavía'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map(k => (
              <div key={k.id} className={cn('flex items-center gap-4 px-5 py-4', !k.is_active && 'opacity-50')}>
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{k.prefix}…</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">
                    {en ? 'Created' : 'Creada'} {new Date(k.created_at).toLocaleDateString(en ? 'en-US' : 'es-MX')}
                  </p>
                  {k.last_used_at && (
                    <p className="text-xs text-emerald-500">
                      {en ? 'Used' : 'Usada'} {new Date(k.last_used_at).toLocaleDateString(en ? 'en-US' : 'es-MX')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  {deletingId === k.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Docs */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{en ? 'How to use it?' : '¿Cómo usarla?'}</h3>
        <p className="text-xs text-gray-600 mb-3">{en ? 'Include the header in your requests:' : 'Incluye el header en tus requests:'}</p>
        <code className="block text-xs font-mono bg-gray-900 text-emerald-400 px-4 py-3 rounded-xl">
          Authorization: Bearer mk_live_…
        </code>
        <p className="text-xs text-gray-500 mt-3">
          Base URL: <span className="font-mono text-gray-700">{typeof window !== 'undefined' ? window.location.origin : 'https://menius.app'}/api/v1/</span>
        </p>
      </div>
    </div>
  );
}
