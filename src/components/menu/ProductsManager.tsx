'use client';

import { useState, useTransition, lazy, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus, Trash2, Eye, EyeOff, Search, Package, Sparkles,
  ChevronRight, X,
} from 'lucide-react';
import { updateProduct, deleteProduct } from '@/lib/actions/restaurant';
import { formatPrice, cn } from '@/lib/utils';
import type { Product, Category } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';

const MenuImportLazy = lazy(() => import('./MenuImport').then(m => ({ default: m.MenuImport })));

export function ProductsManager({
  initialProducts,
  categories,
  restaurantId,
  currency,
}: {
  initialProducts: Product[];
  categories: Category[];
  restaurantId?: string;
  currency?: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [isPending, startTransition] = useTransition();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    });
  };

  const handleToggle = (p: Product) => {
    startTransition(async () => {
      await updateProduct(p.id, { is_active: !p.is_active });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    });
  };

  const handleBulkToggle = (active: boolean) => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => updateProduct(id, { is_active: active })));
      setProducts(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, is_active: active } : p));
      setSelectedIds(new Set());
    });
  };

  const handleBulkDelete = () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} productos?`)) return;
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => deleteProduct(id)));
      setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name ?? '';

  const filtered = products
    .filter(p => filterCategory === 'all' || p.category_id === filterCategory)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeCount = products.filter(p => p.is_active).length;
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  if (categories.length === 0) {
    return (
      <div className="dash-empty py-20">
        <Package className="dash-empty-icon" />
        <p className="dash-empty-title">Primero crea una categoría</p>
        <p className="dash-empty-desc">Necesitas al menos una categoría antes de agregar productos.</p>
        <Link href="/app/menu/categories" className="dash-btn-primary">
          Crear categoría
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Link href="/app/menu/products/new" className="dash-btn-primary">
            <Plus className="w-4 h-4" /> Nuevo producto
          </Link>
          <button
            onClick={() => setShowImport(true)}
            className="dash-btn-secondary"
          >
            <Sparkles className="w-4 h-4" /> Importar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{activeCount} activos de {products.length}</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="dash-input pl-9 pr-8 w-48"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilterCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            filterCategory === 'all'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          Todos ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter(p => p.category_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                filterCategory === c.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm animate-scale-in">
          <span className="font-medium">{selectedIds.size} seleccionados</span>
          <div className="h-4 w-px bg-gray-700" />
          <button onClick={() => handleBulkToggle(true)} className="hover:text-emerald-400 transition-colors">Activar</button>
          <button onClick={() => handleBulkToggle(false)} className="hover:text-yellow-400 transition-colors">Desactivar</button>
          <button onClick={handleBulkDelete} className="hover:text-red-400 transition-colors">Eliminar</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="dash-empty py-16">
          <Package className="dash-empty-icon" />
          <p className="dash-empty-title">
            {searchQuery ? 'Sin resultados' : 'Sin productos'}
          </p>
          <p className="dash-empty-desc">
            {searchQuery
              ? `No hay productos que coincidan con "${searchQuery}"`
              : 'Agrega tu primer producto para empezar.'}
          </p>
          {!searchQuery && (
            <Link href="/app/menu/products/new" className="dash-btn-primary">
              <Plus className="w-4 h-4" /> Crear producto
            </Link>
          )}
        </div>
      ) : (
        <div className="dash-card overflow-hidden">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-[2.5rem_1fr_8rem_6rem_5rem_5rem_4.5rem] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
              />
            </div>
            <div>Producto</div>
            <div>Categoría</div>
            <div>Precio</div>
            <div>Estado</div>
            <div>Opciones</div>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const isSelected = selectedIds.has(p.id);
              const modCount = p.modifier_groups?.length ?? 0;

              return (
                <div
                  key={p.id}
                  className={cn(
                    'group transition-colors',
                    isSelected ? 'bg-emerald-50/40' : 'hover:bg-gray-50/50',
                    !p.is_active && 'opacity-60'
                  )}
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[2.5rem_1fr_8rem_6rem_5rem_5rem_4.5rem] items-center gap-3 px-4 py-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
                      />
                    </div>
                    <Link href={`/app/menu/products/${p.id}`} className="flex items-center gap-3 min-w-0">
                      {p.image_url ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', p.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[280px]">{p.description}</p>
                        )}
                      </div>
                    </Link>
                    <div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getCategoryName(p.category_id)}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{formatPrice(Number(p.price))}</div>
                    <div>
                      <span className={cn('dash-badge', p.is_active ? 'dash-badge-active' : 'dash-badge-inactive')}>
                        {p.is_active ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                    <div>
                      {modCount > 0 && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          {modCount} grupo{modCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.preventDefault(); handleToggle(p); }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
                        title={p.is_active ? 'Ocultar' : 'Mostrar'}
                      >
                        {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(p.id); }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile row */}
                  <Link
                    href={`/app/menu/products/${p.id}`}
                    className="flex md:hidden items-center gap-3 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.preventDefault(); toggleSelect(p.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30 flex-shrink-0"
                    />
                    {p.image_url ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image src={p.image_url} alt={p.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-medium truncate', p.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>{p.name}</span>
                        {!p.is_active && <span className="dash-badge dash-badge-inactive text-[10px]">Oculto</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-emerald-600">{formatPrice(Number(p.price))}</span>
                        <span className="text-xs text-gray-400">{getCategoryName(p.category_id)}</span>
                        {modCount > 0 && <span className="text-[10px] text-emerald-600">{modCount}g</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showImport && (
        <Suspense fallback={null}>
          <MenuImportLazy
            existingCategories={categories.map(c => ({ id: c.id, name: c.name }))}
            restaurantId={restaurantId || ''}
            currency={currency || 'USD'}
            onComplete={() => window.location.reload()}
            onClose={() => setShowImport(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
