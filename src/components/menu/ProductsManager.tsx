'use client';

import { useState, useTransition, useRef, useEffect, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus, Trash2, Eye, EyeOff, Search, Package, Sparkles,
  ChevronRight, X, GripVertical,
  PackageX, PackageCheck, ImagePlus, Copy, SlidersHorizontal, Zap,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createProduct, updateProduct, deleteProduct, reorderProducts, toggleProductStock,
  createVariant, createExtra, createModifierGroup, createModifierOption,
} from '@/lib/actions/restaurant';
import { formatPrice, cn } from '@/lib/utils';
import type { Product, Category } from '@/types';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

const MenuImportLazy = lazy(() => import('./MenuImport').then(m => ({ default: m.MenuImport })));
const BulkImageUploadLazy = lazy(() => import('./BulkImageUpload').then(m => ({ default: m.BulkImageUpload })));
const BulkAIImageGenerateLazy = lazy(() => import('./BulkAIImageGenerate').then(m => ({ default: m.BulkAIImageGenerate })));
const AdminBulkRegenerateLazy = lazy(() => import('./AdminBulkRegenerate').then(m => ({ default: m.AdminBulkRegenerate })));

// Admin debug feature — read from env so the UUID is not baked into the client bundle
const ADMIN_REGEN_RESTAURANT_ID = process.env.NEXT_PUBLIC_ADMIN_REGEN_RESTAURANT_ID ?? '';

// ─── Inline price cell ──────────────────────────────────────────

function InlinePriceCell({
  price,
  currency,
  onSave,
}: {
  price: number;
  currency: string;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(price));
  const [flash, setFlash] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useDashboardLocale();

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const save = () => {
    const n = parseFloat(value);
    if (!isNaN(n) && n >= 0 && n !== price) {
      onSave(n);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setValue(String(price)); setEditing(false); }
        }}
        onBlur={save}
        className="w-20 px-2 py-0.5 text-sm border border-emerald-400 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    );
  }

  return (
    <button
      onClick={() => { setValue(String(price)); setEditing(true); }}
      className={cn(
        'text-sm font-medium px-2 py-0.5 rounded transition-all cursor-text',
        flash ? 'bg-emerald-50 text-emerald-700' : 'text-gray-900 hover:bg-gray-100'
      )}
      title={t.products_clickEditPrice}
    >
      {formatPrice(price, currency)}
    </button>
  );
}

// ─── Main products manager ──────────────────────────────────────

export function ProductsManager({
  initialProducts,
  categories: initialCategories,
  restaurantId,
  currency,
  defaultLocale = 'es',
  availableLocales = ['es'],
}: {
  initialProducts: Product[];
  categories: Category[];
  restaurantId?: string;
  currency?: string;
  defaultLocale?: string;
  availableLocales?: string[];
}) {
  const curr = currency || 'USD';
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialCategories.map(c => c.id)),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden'>('all');
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showImport, setShowImport] = useState(false);
  const [showBulkImages, setShowBulkImages] = useState(false);
  const [showBulkAI, setShowBulkAI] = useState(false);
  const [showAdminRegen, setShowAdminRegen] = useState(false);
  const { t } = useDashboardLocale();

  const toggleCat = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.products_deleteConfirm)) return;
    const prev = products;
    setProducts(p => p.filter(x => x.id !== id));
    startTransition(async () => {
      try {
        const res = await deleteProduct(id);
        if (res?.error) { setProducts(prev); }
      } catch { setProducts(prev); }
    });
  };

  const handleDuplicate = (p: Product) => {
    const tempId = `temp-dup-${Date.now()}`;
    const newProduct: Product = {
      ...p,
      id: tempId,
      name: `${p.name} (${t.products_copy})`,
      sort_order: products.length,
    };
    setProducts(prev => [...prev, newProduct]);
    startTransition(async () => {
      const res = await createProduct({
        name: newProduct.name,
        description: p.description ?? '',
        price: Number(p.price),
        category_id: p.category_id,
        is_active: true,
        dietary_tags: p.dietary_tags,
      });
      if (res?.error || !res?.id) {
        setProducts(prev => prev.filter(x => x.id !== tempId));
        return;
      }
      const newId = res.id;
      // Copy variants
      const variants = (p as any).variants ?? [];
      for (const v of variants) {
        await createVariant(newId, { name: v.name, price_delta: v.price_delta, sort_order: v.sort_order });
      }
      // Copy extras
      const extras = (p as any).extras ?? [];
      for (const e of extras) {
        await createExtra(newId, { name: e.name, price: e.price, sort_order: e.sort_order });
      }
      // Copy modifier groups and their options
      const groups = (p.modifier_groups ?? []) as any[];
      for (const g of groups) {
        const gRes = await createModifierGroup(newId, {
          name: g.name,
          selection_type: g.selection_type,
          min_select: g.min_select,
          max_select: g.max_select,
          is_required: g.is_required,
          sort_order: g.sort_order,
        });
        const newGroupId = (gRes as any)?.group?.id;
        if (newGroupId) {
          for (const opt of g.options ?? []) {
            await createModifierOption(newGroupId, {
              name: opt.name,
              price_delta: opt.price_delta,
              is_default: opt.is_default,
              sort_order: opt.sort_order,
            });
          }
        }
      }
      window.location.reload();
    });
  };

  const handleToggle = (p: Product) => {
    setProducts(prev =>
      prev.map(x => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)),
    );
    startTransition(async () => {
      try {
        const res = await updateProduct(p.id, { is_active: !p.is_active });
        if (res?.error) {
          setProducts(prev =>
            prev.map(x => (x.id === p.id ? { ...x, is_active: p.is_active } : x)),
          );
        }
      } catch {
        setProducts(prev =>
          prev.map(x => (x.id === p.id ? { ...x, is_active: p.is_active } : x)),
        );
      }
    });
  };

  const handleStockToggle = (p: Product) => {
    const newStock = !(p.in_stock !== false);
    setProducts(prev =>
      prev.map(x => (x.id === p.id ? { ...x, in_stock: newStock } : x)),
    );
    startTransition(async () => {
      const res = await toggleProductStock(p.id, newStock);
      if (res?.error) {
        setProducts(prev =>
          prev.map(x => (x.id === p.id ? { ...x, in_stock: p.in_stock } : x)),
        );
      }
    });
  };

  const handlePriceSave = (id: string, price: number) => {
    const oldPrice = products.find(p => p.id === id)?.price;
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, price } : p)));
    startTransition(async () => {
      const res = await updateProduct(id, { price });
      if (res?.error && oldPrice !== undefined) {
        setProducts(prev => prev.map(p => (p.id === id ? { ...p, price: oldPrice } : p)));
      }
    });
  };

  const handleBulkToggle = (active: boolean) => {
    const prev = products;
    const ids = new Set(selected);
    setProducts(p => p.map(x => (ids.has(x.id) ? { ...x, is_active: active } : x)));
    setSelected(new Set());
    startTransition(async () => {
      const results = await Promise.all(
        Array.from(ids).map(id => updateProduct(id, { is_active: active })),
      );
      if (results.some(r => r?.error)) setProducts(prev);
    });
  };

  const handleBulkDelete = () => {
    if (!confirm(t.products_deleteMultiConfirm.replace('{n}', String(selected.size)))) return;
    const prev = products;
    const ids = new Set(selected);
    setProducts(p => p.filter(x => !ids.has(x.id)));
    setSelected(new Set());
    startTransition(async () => {
      const results = await Promise.all(
        Array.from(ids).map(id => deleteProduct(id)),
      );
      if (results.some(r => r?.error)) setProducts(prev);
    });
  };

  const toggleSel = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const q = search.toLowerCase();
  const activeFilterCount = (filterCategory !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterStock !== 'all' ? 1 : 0);
  const clearFilters = () => { setFilterCategory('all'); setFilterStatus('all'); setFilterStock('all'); };

  const grouped = categories
    .filter(cat => filterCategory === 'all' || cat.id === filterCategory)
    .map(cat => ({
      cat,
      items: products
        .filter(p => p.category_id === cat.id)
        .filter(p => !q || p.name.toLowerCase().includes(q))
        .filter(p => filterStatus === 'all' || (filterStatus === 'active' ? p.is_active : !p.is_active))
        .filter(p => filterStock === 'all' || (filterStock === 'in_stock' ? p.in_stock !== false : p.in_stock === false)),
    }));
  const totalFiltered = grouped.reduce((s, g) => s + g.items.length, 0);
  const activeCount = products.filter(p => p.is_active).length;
  const outOfStockCount = products.filter(p => p.in_stock === false).length;

  if (categories.length === 0) {
    return (
      <div className="dash-empty py-20">
        <Package className="dash-empty-icon" />
        <p className="dash-empty-title">{t.products_createCategoryFirst}</p>
        <p className="dash-empty-desc">{t.products_needCategory}</p>
        <Link href="/app/menu/categories" className="dash-btn-primary">
          {t.products_createCategory}
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
            <Plus className="w-4 h-4" /> {t.products_new}
          </Link>
          <button onClick={() => setShowBulkImages(true)} className="dash-btn-secondary">
            <ImagePlus className="w-4 h-4" /> {t.products_photos}
          </button>
          <button
            onClick={() => setShowBulkAI(true)}
            className="dash-btn-secondary"
            title={products.filter(p => !p.image_url).length > 0
              ? `${products.filter(p => !p.image_url).length} productos sin imagen`
              : 'Todos los productos tienen imagen'}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="hidden sm:inline">{t.products_bulkAI}</span>
            {products.filter(p => !p.image_url).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                {products.filter(p => !p.image_url).length}
              </span>
            )}
          </button>
          <button onClick={() => setShowImport(true)} className="dash-btn-secondary">
            <Sparkles className="w-4 h-4" /> {t.products_importAI}
          </button>
          {ADMIN_REGEN_RESTAURANT_ID && restaurantId === ADMIN_REGEN_RESTAURANT_ID && (
            <button
              onClick={() => setShowAdminRegen(true)}
              className="dash-btn-secondary border-amber-300 text-amber-700 hover:bg-amber-50"
              title="Admin: regenerar todas las imágenes con Imagen 4"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Regen. masiva</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:inline">
            {activeCount} {t.products_active} · {products.length} {t.products_total}
            {outOfStockCount > 0 && <span className="text-red-400"> · {outOfStockCount} {t.products_outOfStock}</span>}
          </span>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={cn(
              'dash-btn-secondary relative',
              showFilters && 'bg-gray-100 border-gray-300',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{t.products_filters}</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.general_search}
              className="dash-input pl-9 pr-8 w-44"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 bg-white border border-gray-200 rounded-xl">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.products_category}</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="dash-input py-1.5 text-sm min-w-[140px]"
            >
              <option value="all">{t.products_allFem}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.products_status}</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'hidden')}
              className="dash-input py-1.5 text-sm min-w-[120px]"
            >
              <option value="all">{t.products_all}</option>
              <option value="active">{t.products_activeFilter}</option>
              <option value="hidden">{t.products_hidden}</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.products_stock}</label>
            <select
              value={filterStock}
              onChange={e => setFilterStock(e.target.value as 'all' | 'in_stock' | 'out_of_stock')}
              className="dash-input py-1.5 text-sm min-w-[120px]"
            >
              <option value="all">{t.products_all}</option>
              <option value="in_stock">{t.products_inStock}</option>
              <option value="out_of_stock">{t.products_outOfStockFilter}</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 mt-4"
            >
              {t.products_clearFilters}
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm animate-scale-in">
          <span className="font-medium">{selected.size} {t.products_selected}</span>
          <div className="h-4 w-px bg-gray-700" />
          <button onClick={() => handleBulkToggle(true)} className="hover:text-emerald-400 transition-colors">
            {t.products_activate}
          </button>
          <button onClick={() => handleBulkToggle(false)} className="hover:text-yellow-400 transition-colors">
            {t.products_deactivate}
          </button>
          <button onClick={handleBulkDelete} className="hover:text-red-400 transition-colors">
            {t.products_delete}
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hierarchical table */}
      {totalFiltered === 0 && search ? (
        <div className="dash-empty py-16">
          <Search className="dash-empty-icon" />
          <p className="dash-empty-title">{t.products_noResults}</p>
          <p className="dash-empty-desc">
            No hay productos que coincidan con &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="dash-empty py-20">
          <Package className="dash-empty-icon" />
          <p className="dash-empty-title">{t.products_noProducts}</p>
          <p className="dash-empty-desc">{t.products_noProductsDesc}</p>
          <Link href="/app/menu/products/new" className="dash-btn-primary">
            <Plus className="w-4 h-4" /> {t.products_createProduct}
          </Link>
        </div>
      ) : (
        <div className="dash-card overflow-hidden">
          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_6rem_4.5rem_4rem_4.5rem_5rem] items-center gap-2 px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div />
            <div>{t.products_product}</div>
            <div>{t.products_price}</div>
            <div>{t.products_status}</div>
            <div>{t.products_stock}</div>
            <div>{t.products_options}</div>
            <div />
          </div>

          {/* Category groups */}
          {grouped.map(({ cat, items: catProducts }) => {
            const isExp = expanded.has(cat.id);
            const totalInCat = products.filter(p => p.category_id === cat.id).length;
            if (totalInCat === 0 && !search) return null;

            return (
              <div key={cat.id}>
                {/* Category header */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-b border-gray-100 transition-colors text-left"
                >
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      isExp && 'rotate-90',
                    )}
                  />
                  <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                  <span className="text-xs text-gray-400 ml-1">({totalInCat})</span>
                </button>

                {/* Product rows */}
                {isExp && (
                  <SortableProductList
                    catId={cat.id}
                    catProducts={catProducts}
                    selected={selected}
                    toggleSel={toggleSel}
                    handlePriceSave={handlePriceSave}
                    handleToggle={handleToggle}
                    handleStockToggle={handleStockToggle}
                    handleDelete={handleDelete}
                    handleDuplicate={handleDuplicate}
                    curr={curr}
                    products={products}
                    setProducts={setProducts}
                    startTransition={startTransition}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Import */}
      {showImport && (
        <Suspense fallback={null}>
          <MenuImportLazy
            existingCategories={categories.map(c => ({ id: c.id, name: c.name }))}
            restaurantId={restaurantId || ''}
            currency={curr}
            onComplete={() => window.location.reload()}
            onClose={() => setShowImport(false)}
          />
        </Suspense>
      )}

      {/* Bulk Image Upload */}
      {showBulkImages && (
        <Suspense fallback={null}>
          <BulkImageUploadLazy
            products={products}
            onComplete={(updated) => {
              setProducts(prev =>
                prev.map(p => {
                  const newUrl = updated.get(p.id);
                  return newUrl ? { ...p, image_url: newUrl } : p;
                }),
              );
            }}
            onClose={() => setShowBulkImages(false)}
          />
        </Suspense>
      )}

      {/* Bulk AI Image Generate */}
      {showBulkAI && (
        <Suspense fallback={null}>
          <BulkAIImageGenerateLazy
            products={products}
            categories={categories}
            onComplete={(updated) => {
              setProducts(prev =>
                prev.map(p => {
                  const newUrl = updated.get(p.id);
                  return newUrl ? { ...p, image_url: newUrl } : p;
                }),
              );
            }}
            onClose={() => setShowBulkAI(false)}
          />
        </Suspense>
      )}

      {/* Admin bulk image regeneration when NEXT_PUBLIC_ADMIN_REGEN_RESTAURANT_ID matches this restaurant */}
      {showAdminRegen && restaurantId && (
        <Suspense fallback={null}>
          <AdminBulkRegenerateLazy
            restaurantId={restaurantId}
            onClose={() => setShowAdminRegen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─── Sortable product list per category ────────────────────────

function SortableProductList({
  catId,
  catProducts,
  selected,
  toggleSel,
  handlePriceSave,
  handleToggle,
  handleStockToggle,
  handleDelete,
  handleDuplicate,
  curr,
  products,
  setProducts,
  startTransition,
}: {
  catId: string;
  catProducts: Product[];
  selected: Set<string>;
  toggleSel: (id: string) => void;
  handlePriceSave: (id: string, v: number) => void;
  handleToggle: (p: Product) => void;
  handleStockToggle: (p: Product) => void;
  handleDelete: (id: string) => void;
  handleDuplicate: (p: Product) => void;
  curr: string;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  startTransition: (cb: () => void) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = catProducts.findIndex((p) => p.id === active.id);
    const newIndex = catProducts.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(catProducts, oldIndex, newIndex);

    setProducts((prev) => {
      const others = prev.filter((p) => p.category_id !== catId);
      return [...others, ...reordered.map((p, i) => ({ ...p, sort_order: i }))].sort((a, b) => a.sort_order - b.sort_order);
    });

    startTransition(async () => {
      await reorderProducts(reordered.map((p) => p.id));
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={catProducts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {catProducts.map((p) => (
          <SortableProductRow
            key={p.id}
            p={p}
            isSel={selected.has(p.id)}
            toggleSel={toggleSel}
            handlePriceSave={handlePriceSave}
            handleToggle={handleToggle}
            handleStockToggle={handleStockToggle}
            handleDelete={handleDelete}
            handleDuplicate={handleDuplicate}
            curr={curr}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableProductRow({
  p,
  isSel,
  toggleSel,
  handlePriceSave,
  handleToggle,
  handleStockToggle,
  handleDelete,
  handleDuplicate,
  curr,
}: {
  p: Product;
  isSel: boolean;
  toggleSel: (id: string) => void;
  handlePriceSave: (id: string, v: number) => void;
  handleToggle: (p: Product) => void;
  handleStockToggle: (p: Product) => void;
  handleDelete: (id: string) => void;
  handleDuplicate: (p: Product) => void;
  curr: string;
}) {
  const modCount = p.modifier_groups?.length ?? 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });
  const { t } = useDashboardLocale();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border-b border-gray-50 transition-colors',
        isDragging && 'bg-white shadow-lg rounded-lg border border-gray-200',
        isSel
          ? 'bg-blue-50/30'
          : 'hover:bg-gray-50/50',
        !p.is_active && 'opacity-60',
        p.in_stock === false && p.is_active && 'opacity-75',
      )}
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1.5rem_2rem_1fr_6rem_4.5rem_4rem_4.5rem_5rem] items-center gap-2 px-4 py-2.5">
        <button
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <input
          type="checkbox"
          checked={isSel}
          onChange={() => toggleSel(p.id)}
          className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
        />
        <Link
          href={`/app/menu/products/${p.id}`}
          className="flex items-center gap-3 min-w-0 text-left"
        >
          {p.image_url ? (
            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image src={p.image_url} alt={p.name} fill sizes="36px" className="object-cover" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-gray-400" />
            </div>
          )}
          <span className={cn('text-sm font-medium truncate hover:text-emerald-600 transition-colors', p.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>
            {p.name}
          </span>
        </Link>
        <InlinePriceCell price={Number(p.price)} currency={curr} onSave={v => handlePriceSave(p.id, v)} />
        <span className={cn('dash-badge text-[11px]', p.is_active ? 'dash-badge-active' : 'dash-badge-inactive')}>
          {p.is_active ? t.products_activeStatus : t.products_hiddenStatus}
        </span>
        <button
          onClick={() => handleStockToggle(p)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all',
            p.in_stock === false
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
          )}
          title={p.in_stock === false ? t.products_markAvailable : t.products_markOutOfStock}
        >
          {p.in_stock === false ? (
            <><PackageX className="w-3 h-3" /> {t.products_outOfStockStatus}</>
          ) : (
            <><PackageCheck className="w-3 h-3" /> {t.products_inStockStatus}</>
          )}
        </button>
        <div>
          {modCount > 0 ? (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{modCount}g</span>
          ) : (
            <span className="text-[11px] text-gray-300">&mdash;</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleDuplicate(p)} className="p-1 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-500" title={t.products_duplicate}>
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleToggle(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400" title={p.is_active ? t.products_hide : t.products_show}>
            {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title={t.general_delete}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <div className="flex md:hidden items-center gap-3 px-4 py-3 w-full">
        <Link href={`/app/menu/products/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {p.image_url ? (
            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image src={p.image_url} alt={p.name} fill sizes="44px" className="object-cover" />
              {p.in_stock === false && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <PackageX className="w-4 h-4 text-red-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn('text-sm font-medium truncate', p.is_active ? 'text-gray-900' : 'text-gray-500')}>{p.name}</p>
              {p.in_stock === false && (
                <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full flex-shrink-0">{t.products_outOfStockStatus}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatPrice(Number(p.price), curr)}
              {modCount > 0 && ` · ${modCount} ${t.products_groups}`}
            </p>
          </div>
        </Link>
        <button
          onClick={() => handleStockToggle(p)}
          className={cn(
            'p-1.5 rounded-lg transition-colors flex-shrink-0',
            p.in_stock === false ? 'text-red-400 hover:bg-red-50' : 'text-emerald-400 hover:bg-emerald-50'
          )}
          title={p.in_stock === false ? t.products_markAvailable : t.products_markOutOfStock}
        >
          {p.in_stock === false ? <PackageX className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}
