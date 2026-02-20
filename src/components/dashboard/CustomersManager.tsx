'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, MapPin, Tag, ChevronDown, MessageCircle, Users, TrendingUp, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  notes: string;
  tags: string[];
  created_at: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

type SortKey = 'last_order_at' | 'total_spent' | 'total_orders' | 'name';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'last_order_at', label: 'Última orden' },
  { value: 'total_spent', label: 'Mayor gasto' },
  { value: 'total_orders', label: 'Más órdenes' },
  { value: 'name', label: 'Nombre A-Z' },
];

export function CustomersManager({ currency }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('last_order_at');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');
  const [saving, setSaving] = useState(false);

  const limit = 30;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        sort: sortBy,
        order: sortBy === 'name' ? 'asc' : 'desc',
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/tenant/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchCustomers, search]);

  const selected = customers.find(c => c.id === selectedId);

  const openDetail = (c: Customer) => {
    setSelectedId(c.id);
    setEditNotes(c.notes || '');
    setEditTags((c.tags || []).join(', '));
  };

  const saveNotes = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch('/api/tenant/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          notes: editNotes,
          tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      fetchCustomers();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalPages = Math.ceil(total / limit);

  const topSpender = customers.length > 0
    ? customers.reduce((a, b) => a.total_spent > b.total_spent ? a : b)
    : null;
  const avgSpend = customers.length > 0
    ? customers.reduce((s, c) => s + c.total_spent, 0) / customers.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> Total clientes
          </div>
          <p className="text-xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> Gasto promedio
          </div>
          <p className="text-xl font-bold text-gray-900">{formatPrice(avgSpend, currency)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> Top cliente
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{topSpender?.name || '—'}</p>
          <p className="text-xs text-gray-500">{topSpender ? formatPrice(topSpender.total_spent, currency) : ''}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" /> Último pedido
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {customers[0]?.last_order_at ? formatDate(customers[0].last_order_at) : '—'}
          </p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as SortKey); setPage(1); }}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {search ? 'No se encontraron clientes' : 'Aún no hay clientes. Se crean automáticamente con cada pedido.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contacto</th>
                  <th className="text-right px-4 py-3 font-medium">Órdenes</th>
                  <th className="text-right px-4 py-3 font-medium">Total gastado</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Última orden</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Tags</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${selectedId === c.id ? 'bg-emerald-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="text-gray-900 font-medium truncate max-w-[200px]">{c.name || 'Sin nombre'}</p>
                      {c.address && <p className="text-gray-600 text-xs truncate max-w-[200px]">{c.address}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Mail className="w-3 h-3" /> {c.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{c.total_orders}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatPrice(c.total_spent, currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell">{formatDate(c.last_order_at)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {(c.tags || []).slice(0, 3).map(t => (
                          <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">{total} clientes</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-100 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selected.name || 'Sin nombre'}</h3>
              <p className="text-xs text-gray-500">Cliente desde {formatDate(selected.created_at)}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Órdenes</p>
              <p className="text-gray-900 font-semibold">{selected.total_orders}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Total gastado</p>
              <p className="text-emerald-600 font-semibold">{formatPrice(selected.total_spent, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Ticket promedio</p>
              <p className="text-gray-900 font-semibold">
                {selected.total_orders > 0
                  ? formatPrice(selected.total_spent / selected.total_orders, currency)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Última orden</p>
              <p className="text-gray-900 text-sm">{formatDate(selected.last_order_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {selected.phone && (
              <a
                href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {selected.phone && (
              <a
                href={`tel:${selected.phone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/20 transition-colors"
              >
                <Phone className="w-4 h-4" /> Llamar
              </a>
            )}
            {selected.email && (
              <a
                href={`mailto:${selected.email}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm hover:bg-violet-500/20 transition-colors"
              >
                <Mail className="w-4 h-4" /> Email
              </a>
            )}
          </div>

          {selected.address && (
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{selected.address}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5" /> Tags (separados por coma)
            </label>
            <input
              type="text"
              value={editTags}
              onChange={e => setEditTags(e.target.value)}
              placeholder="VIP, frecuente, delivery..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-2 block">Notas internas</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={3}
              placeholder="Alergias, preferencias, notas sobre este cliente..."
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
            />
          </div>

          <button
            onClick={saveNotes}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar notas y tags'}
          </button>
        </div>
      )}
    </div>
  );
}
