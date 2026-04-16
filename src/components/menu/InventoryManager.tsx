'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Package, AlertTriangle, CheckCircle, ToggleLeft, ToggleRight, Search, TrendingDown } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

interface ProductRow {
  id: string;
  name: string;
  in_stock: boolean;
  stock_qty: number | null;
  low_stock_threshold: number | null;
  track_inventory: boolean;
  price: number;
  category_id: string | null;
  image_url: string | null;
}

interface InventoryManagerProps {
  initialProducts: ProductRow[];
  restaurantId: string;
  currency: string;
}

export function InventoryManager({ initialProducts, restaurantId, currency }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'tracked' | 'low' | 'out'>('all');
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const fmt = (n: number) => formatPrice(n, currency);

  const filtered = useMemo(() => {
    let list = products;
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'tracked') list = list.filter(p => p.track_inventory);
    if (filter === 'low') list = list.filter(p => p.track_inventory && p.stock_qty !== null && p.stock_qty > 0 && p.stock_qty <= (p.low_stock_threshold ?? 5));
    if (filter === 'out') list = list.filter(p => !p.in_stock || (p.track_inventory && p.stock_qty !== null && p.stock_qty <= 0));
    return list;
  }, [products, search, filter]);

  const stats = useMemo(() => ({
    total: products.length,
    tracked: products.filter(p => p.track_inventory).length,
    low: products.filter(p => p.track_inventory && p.stock_qty !== null && p.stock_qty > 0 && p.stock_qty <= (p.low_stock_threshold ?? 5)).length,
    out: products.filter(p => !p.in_stock || (p.track_inventory && p.stock_qty !== null && p.stock_qty <= 0)).length,
  }), [products]);

  async function patchProduct(id: string, patch: Partial<ProductRow>) {
    setSaving(prev => new Set([...Array.from(prev), id]));
    try {
      const res = await fetch(`/api/tenant/menu/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, restaurant_id: restaurantId }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
      }
    } finally {
      setSaving(prev => { const s = new Set(Array.from(prev)); s.delete(id); return s; });
    }
  }

  async function toggleStock(p: ProductRow) {
    await patchProduct(p.id, { in_stock: !p.in_stock });
  }

  async function toggleTracking(p: ProductRow) {
    await patchProduct(p.id, { track_inventory: !p.track_inventory });
  }

  async function updateQty(p: ProductRow, qty: number) {
    await patchProduct(p.id, { stock_qty: Math.max(0, qty) });
  }

  async function updateThreshold(p: ProductRow, threshold: number) {
    await patchProduct(p.id, { low_stock_threshold: Math.max(1, threshold) });
  }

  const getStatus = (p: ProductRow) => {
    if (!p.in_stock) return 'out';
    if (p.track_inventory && p.stock_qty !== null && p.stock_qty <= 0) return 'out';
    if (p.track_inventory && p.stock_qty !== null && p.stock_qty <= (p.low_stock_threshold ?? 5)) return 'low';
    if (p.track_inventory) return 'ok';
    return 'manual';
  };

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Productos', value: stats.total, icon: Package, color: 'bg-gray-100 text-gray-600', key: 'all' },
          { label: 'Rastreados', value: stats.tracked, icon: ToggleRight, color: 'bg-blue-50 text-blue-600', key: 'tracked' },
          { label: 'Stock bajo', value: stats.low, icon: TrendingDown, color: 'bg-amber-50 text-amber-600', key: 'low' },
          { label: 'Sin stock', value: stats.out, icon: AlertTriangle, color: 'bg-red-50 text-red-600', key: 'out' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key as typeof filter ? 'all' : s.key as typeof filter)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
              filter === s.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-transparent bg-white hover:border-gray-200'
            )}
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', filter === s.key ? 'bg-white/10' : s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className={cn('text-2xl font-black tabular-nums', filter === s.key ? 'text-white' : 'text-gray-900')}>{s.value}</p>
              <p className={cn('text-xs font-medium', filter === s.key ? 'text-white/70' : 'text-gray-500')}>{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[auto_80px_120px_100px_100px_80px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Producto</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Precio</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Cantidad</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Mín. alerta</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Rastrear</p>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Disponible</p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Sin productos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(p => {
              const status = getStatus(p);
              const isSaving = saving.has(p.id);
              return (
                <div key={p.id} className={cn('transition-colors', isSaving && 'opacity-60')}>
                  {/* ── Mobile card ── */}
                  <div className="sm:hidden flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
                    {p.image_url ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mt-0.5">
                        <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Package className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0', {
                          'bg-red-100 text-red-600': status === 'out',
                          'bg-amber-100 text-amber-600': status === 'low',
                          'bg-emerald-100 text-emerald-600': status === 'ok',
                          'bg-gray-100 text-gray-500': status === 'manual',
                        })}>
                          {status === 'out' && <><AlertTriangle className="w-2.5 h-2.5" />Sin stock</>}
                          {status === 'low' && <><TrendingDown className="w-2.5 h-2.5" />Stock bajo</>}
                          {status === 'ok' && <><CheckCircle className="w-2.5 h-2.5" />En stock</>}
                          {status === 'manual' && <>Manual</>}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(Number(p.price))}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Qty stepper */}
                        {p.track_inventory ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(p, (p.stock_qty ?? 0) - 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-sm font-bold">−</button>
                            <input
                              type="number" min="0"
                              value={p.stock_qty ?? ''}
                              onChange={e => updateQty(p, parseInt(e.target.value) || 0)}
                              className="w-12 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-gray-900"
                            />
                            <button onClick={() => updateQty(p, (p.stock_qty ?? 0) + 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-sm font-bold">+</button>
                          </div>
                        ) : null}
                        {/* Track toggle */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400">Rastrear</span>
                          <button onClick={() => toggleTracking(p)} className={cn('transition-colors', p.track_inventory ? 'text-emerald-500' : 'text-gray-300')}>
                            {p.track_inventory ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                        </div>
                        {/* Available toggle */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400">Disponible</span>
                          <button onClick={() => toggleStock(p)} className={cn('transition-colors', p.in_stock ? 'text-emerald-500' : 'text-gray-300')}>
                            {p.in_stock ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Desktop row ── */}
                  <div className="hidden sm:grid sm:grid-cols-[auto_80px_120px_100px_100px_80px] gap-4 px-5 py-3.5 items-center">
                    {/* Product */}
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image src={p.image_url} alt={p.name} fill sizes="36px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-base opacity-30">🍽️</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full', {
                          'bg-red-100 text-red-600': status === 'out',
                          'bg-amber-100 text-amber-600': status === 'low',
                          'bg-emerald-100 text-emerald-600': status === 'ok',
                          'bg-gray-100 text-gray-500': status === 'manual',
                        })}>
                          {status === 'out' && <><AlertTriangle className="w-2.5 h-2.5" /> Sin stock</>}
                          {status === 'low' && <><TrendingDown className="w-2.5 h-2.5" /> Stock bajo</>}
                          {status === 'ok' && <><CheckCircle className="w-2.5 h-2.5" /> En stock</>}
                          {status === 'manual' && <>Manual</>}
                        </span>
                      </div>
                    </div>
                    {/* Price */}
                    <p className="text-sm font-medium text-gray-600 tabular-nums text-center">{fmt(Number(p.price))}</p>
                    {/* Quantity */}
                    <div className="flex items-center justify-center">
                      {p.track_inventory ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(p, (p.stock_qty ?? 0) - 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-sm font-bold">−</button>
                          <input type="number" min="0" value={p.stock_qty ?? ''} onChange={e => updateQty(p, parseInt(e.target.value) || 0)} className="w-14 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-gray-900" />
                          <button onClick={() => updateQty(p, (p.stock_qty ?? 0) + 1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-sm font-bold">+</button>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                    {/* Threshold */}
                    <div className="flex items-center justify-center">
                      {p.track_inventory ? (
                        <input type="number" min="1" value={p.low_stock_threshold ?? 5} onChange={e => updateThreshold(p, parseInt(e.target.value) || 5)} className="w-16 text-center text-sm font-medium text-gray-900 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:border-gray-900" />
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                    {/* Track toggle */}
                    <div className="flex items-center justify-center">
                      <button onClick={() => toggleTracking(p)} className={cn('transition-colors', p.track_inventory ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400')}>
                        {p.track_inventory ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                    </div>
                    {/* In stock toggle */}
                    <div className="flex items-center justify-center">
                      <button onClick={() => toggleStock(p)} className={cn('transition-colors', p.in_stock ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400')}>
                        {p.in_stock ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        Los cambios se guardan automáticamente. Al activar &quot;Rastrear&quot; el inventario se descuenta con cada orden.
      </p>
    </div>
  );
}
