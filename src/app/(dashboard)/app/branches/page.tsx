'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, ExternalLink, RefreshCw, Store, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  logo_url?: string | null;
  currency: string;
  created_at: string;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function BranchesPage() {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/branches');
      const data = await res.json();
      if (data.needsMigration) setNeedsMigration(true);
      setBranches(data.branches ?? []);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: slugify(name) }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) { setError(en ? 'Name and slug are required' : 'Nombre y slug requeridos'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/tenant/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (en ? 'Error creating branch' : 'Error creando sucursal')); return; }
      setBranches(prev => [...prev, data.branch]);
      setShowCreate(false);
      setForm({ name: '', slug: '', address: '', phone: '' });
    } catch {
      setError(en ? 'Connection error' : 'Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://menius.app';

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="dash-heading">{en ? 'Branches' : 'Sucursales'}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {en ? 'Manage multiple locations under one account.' : 'Gestiona múltiples ubicaciones bajo una misma cuenta.'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {en ? 'New branch' : 'Nueva sucursal'}
        </button>
      </div>

      {needsMigration && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-1">{en ? 'Migration required for advanced multi-branch' : 'Migración requerida para multi-sucursales avanzado'}</p>
          <p className="text-xs">{en ? 'Run' : 'Ejecuta'} <code className="font-mono bg-amber-100 px-1 rounded">supabase/migration-multi-location.sql</code> {en ? 'to enable branch linking.' : 'para habilitar la vinculación de sucursales.'}</p>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">{en ? 'New branch' : 'Nueva sucursal'}</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{en ? 'Name *' : 'Nombre *'}</label>
              <input
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder={en ? 'e.g. Downtown Branch' : 'Ej. Sucursal Centro'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Slug (URL) *</label>
              <div className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 focus-within:border-gray-900 bg-white">
                <span className="text-xs text-gray-400 flex-shrink-0">{appUrl}/</span>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="flex-1 text-sm focus:outline-none min-w-0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{en ? 'Address' : 'Dirección'}</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder={en ? 'e.g. 123 Main St' : 'Ej. Av. Principal 123'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{en ? 'Phone' : 'Teléfono'}</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 123 4567"
                type="tel"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
              {en ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 transition-colors"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : (en ? 'Create branch' : 'Crear sucursal')}
            </button>
          </div>
        </div>
      )}

      {/* Branches list */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Store className="w-12 h-12 opacity-30" />
            <p className="text-sm">{en ? 'No additional branches' : 'Sin sucursales adicionales'}</p>
            <p className="text-xs text-center max-w-[200px]">{en ? 'Create your second branch and manage both from this panel' : 'Crea tu segunda sucursal y gestiona ambas desde este panel'}</p>
          </div>
        ) : branches.map(b => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Store className="w-6 h-6 text-gray-400" />
              </div>
              <span className={cn('flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full', b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                {b.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {b.is_active ? (en ? 'Active' : 'Activa') : (en ? 'Inactive' : 'Inactiva')}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{b.name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-3">/{b.slug}</p>
            {b.address && (
              <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{b.address}</span>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <a
                href={`${appUrl}/${b.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {en ? 'View menu' : 'Ver menú'}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-1">{en ? 'How does multi-branch work?' : '¿Cómo funciona multi-sucursales?'}</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>{en ? 'Each branch has its own menu, schedule and orders' : 'Cada sucursal tiene su propio menú, horario y órdenes'}</li>
          <li>{en ? 'All branches share the same account and billing' : 'Todas comparten la misma cuenta y facturación'}</li>
          <li>{en ? 'Access the Counter and KDS of each branch separately' : 'Puedes acceder al Counter y KDS de cada una por separado'}</li>
          <li>{en ? 'Coming soon: consolidated reports across all branches' : 'Próximamente: reportes consolidados de todas las sucursales'}</li>
        </ul>
      </div>
    </div>
  );
}
