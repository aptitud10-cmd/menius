'use client';

import { useState, useTransition, useRef, useEffect, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus, Trash2, Eye, EyeOff, Search, Package, Sparkles,
  ChevronRight, X, Save, Camera, Loader2, Check, Layers, GripVertical,
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
  createProduct, updateProduct, deleteProduct, createCategory, reorderProducts,
} from '@/lib/actions/restaurant';
import { formatPrice, cn } from '@/lib/utils';
import type { Product, Category, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { ModifierGroupsEditor } from './ModifierGroupsEditor';

const MenuImportLazy = lazy(() => import('./MenuImport').then(m => ({ default: m.MenuImport })));

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
      title="Click para editar precio"
    >
      {formatPrice(price, currency)}
    </button>
  );
}

// ─── Side panel (Toast-style) ───────────────────────────────────

function ProductSidePanel({
  product,
  categories,
  currency,
  onSave,
  onClose,
  onCategoryCreated,
}: {
  product: Product | null;
  categories: Category[];
  currency: string;
  onSave: (p: Product) => void;
  onClose: () => void;
  onCategoryCreated: (c: Category) => void;
}) {
  const isEditing = !!product;
  const modCount = product?.modifier_groups?.length ?? 0;
  const [tab, setTab] = useState<'info' | 'options'>('info');

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
    dietary_tags: (product?.dietary_tags ?? []) as DietaryTag[],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      name: product?.name ?? '',
      description: product?.description ?? '',
      price: product ? String(product.price) : '',
      category_id: product?.category_id ?? categories[0]?.id ?? '',
      dietary_tags: (product?.dietary_tags ?? []) as DietaryTag[],
    });
    setImagePreview(product?.image_url || null);
    setImageFile(null);
    setError('');
    setSaved(false);
    setTab('info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error subiendo imagen';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    if (!form.category_id) { setError('Selecciona categoría'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio inválido'); return; }

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (imageUrl === null && imageFile) return;
    }

    startTransition(async () => {
      if (isEditing && product) {
        const data: Record<string, unknown> = {
          name: form.name, description: form.description, price,
          category_id: form.category_id, dietary_tags: form.dietary_tags,
        };
        if (imageUrl) data.image_url = imageUrl;
        const res = await updateProduct(product.id, data);
        if (res.error) { setError(res.error); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSave({
          ...product,
          name: form.name,
          description: form.description,
          price,
          category_id: form.category_id,
          dietary_tags: form.dietary_tags,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        });
      } else {
        const res = await createProduct({
          name: form.name, description: form.description, price,
          category_id: form.category_id, is_active: true, dietary_tags: form.dietary_tags,
        });
        if (res.error) { setError(res.error); return; }
        onSave({
          id: res.id || `temp-${Date.now()}`,
          restaurant_id: '',
          category_id: form.category_id,
          name: form.name,
          description: form.description,
          price,
          image_url: imageUrl ?? '',
          is_active: true,
          dietary_tags: form.dietary_tags,
          sort_order: 0,
          created_at: new Date().toISOString(),
          modifier_groups: [],
        });
      }
    });
  };

  const handleCreateCat = async () => {
    if (!newCatName.trim()) return;
    const res = await createCategory({
      name: newCatName, sort_order: categories.length, is_active: true,
    });
    if (res.success && res.id) {
      const cat: Category = {
        id: res.id, name: res.name!, restaurant_id: '',
        sort_order: categories.length, is_active: true, created_at: '',
      };
      onCategoryCreated(cat);
      setForm(f => ({ ...f, category_id: res.id! }));
    }
    setNewCatName('');
    setShowNewCat(false);
  };

  const busy = isPending || uploading;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/15 z-40"
        style={{ animation: 'fadeIn 0.15s ease-out both' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header + Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between px-5 pt-3.5 pb-0">
            <h2 className="font-semibold text-[15px] text-gray-900 truncate">
              {isEditing ? product.name : 'Nuevo producto'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {isEditing && (
            <div className="flex gap-0 px-5 mt-2">
              <button
                onClick={() => setTab('info')}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                  tab === 'info'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600',
                )}
              >
                Información
              </button>
              <button
                onClick={() => setTab('options')}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                  tab === 'options'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600',
                )}
              >
                Opciones {modCount > 0 && <span className="ml-1 text-[11px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">{modCount}</span>}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* ── Tab: Info ── */}
          {(tab === 'info' || !isEditing) && (
            <>
              <div>
                <label className="dash-label mb-1.5 block">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Huevos rancheros"
                  autoFocus={!isEditing}
                  className="dash-input"
                />
              </div>

              <div>
                <label className="dash-label mb-1.5 block">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe el producto..."
                  rows={2}
                  className="dash-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="dash-label mb-1.5 block">Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    className="dash-input"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="dash-label">Categoría *</label>
                    <button onClick={() => setShowNewCat(true)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      + Nueva
                    </button>
                  </div>
                  {showNewCat ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="Categoría"
                        autoFocus
                        className="dash-input flex-1 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreateCat();
                          if (e.key === 'Escape') setShowNewCat(false);
                        }}
                      />
                      <button onClick={handleCreateCat} className="dash-btn-primary px-2 py-1">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value })}
                      className="dash-select"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="dash-label mb-1.5 block">Imagen</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                {imagePreview ? (
                  <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-100 group">
                    <Image src={imagePreview} alt="" fill className="object-cover" sizes="400px" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                      <button onClick={() => fileRef.current?.click()} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-opacity">
                        <Camera className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white text-red-600 hover:bg-red-50 shadow-sm transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-gray-200 hover:border-emerald-400 flex items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-medium">Subir foto</span>
                  </button>
                )}
              </div>

              <div>
                <label className="dash-label mb-1.5 block">Etiquetas</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_TAGS.map(tag => {
                    const sel = form.dietary_tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => setForm(f => ({
                          ...f,
                          dietary_tags: sel
                            ? f.dietary_tags.filter(t => t !== tag.id)
                            : [...f.dietary_tags, tag.id],
                        }))}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                          sel
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        {tag.emoji} {tag.labelEs}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isEditing && (
                <div className="text-center py-6 text-gray-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Primero guarda el producto</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Después podrás agregar opciones (Tamaño, Extras, Salsas...)
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Tab: Options (Modifiers) ── */}
          {tab === 'options' && isEditing && product && (
            <ModifierGroupsEditor
              groups={product.modifier_groups ?? []}
              productId={product.id}
              onUpdate={groups => onSave({ ...product, modifier_groups: groups })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="dash-btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className={cn('dash-btn-primary', saved && 'bg-emerald-600')}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
            ) : isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : saved ? (
              <><Check className="w-4 h-4" /> Guardado</>
            ) : isEditing ? (
              <><Save className="w-4 h-4" /> Guardar</>
            ) : (
              <><Plus className="w-4 h-4" /> Crear</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main products manager ──────────────────────────────────────

export function ProductsManager({
  initialProducts,
  categories: initialCategories,
  restaurantId,
  currency,
}: {
  initialProducts: Product[];
  categories: Category[];
  restaurantId?: string;
  currency?: string;
}) {
  const curr = currency || 'USD';
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [panel, setPanel] = useState<Product | 'new' | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialCategories.map(c => c.id)),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [showImport, setShowImport] = useState(false);

  const toggleCat = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleSave = (saved: Product) => {
    const exists = products.find(p => p.id === saved.id);
    if (exists) {
      setProducts(prev =>
        prev.map(p =>
          p.id === saved.id
            ? { ...saved, modifier_groups: saved.modifier_groups ?? p.modifier_groups }
            : p,
        ),
      );
    } else {
      setProducts(prev => [...prev, saved]);
      setExpanded(prev => { const s = new Set(Array.from(prev)); s.add(saved.category_id); return s; });
    }
    if (panel === 'new') setPanel(saved);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    const prev = products;
    setProducts(p => p.filter(x => x.id !== id));
    if (panel && typeof panel !== 'string' && panel.id === id) setPanel(null);
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res?.error) setProducts(prev);
    });
  };

  const handleToggle = (p: Product) => {
    setProducts(prev =>
      prev.map(x => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)),
    );
    startTransition(async () => {
      const res = await updateProduct(p.id, { is_active: !p.is_active });
      if (res?.error) {
        setProducts(prev =>
          prev.map(x => (x.id === p.id ? { ...x, is_active: p.is_active } : x)),
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
    if (!confirm(`¿Eliminar ${selected.size} productos?`)) return;
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

  const onCatCreated = (c: Category) => {
    setCategories(prev => [...prev, c]);
    setExpanded(prev => { const s = new Set(Array.from(prev)); s.add(c.id); return s; });
  };

  const q = search.toLowerCase();
  const grouped = categories.map(cat => ({
    cat,
    items: products
      .filter(p => p.category_id === cat.id)
      .filter(p => !q || p.name.toLowerCase().includes(q)),
  }));
  const totalFiltered = grouped.reduce((s, g) => s + g.items.length, 0);
  const activeCount = products.filter(p => p.is_active).length;

  if (categories.length === 0) {
    return (
      <div className="dash-empty py-20">
        <Package className="dash-empty-icon" />
        <p className="dash-empty-title">Primero crea una categoría</p>
        <p className="dash-empty-desc">Necesitas al menos una categoría.</p>
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
          <button onClick={() => setPanel('new')} className="dash-btn-primary">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
          <button onClick={() => setShowImport(true)} className="dash-btn-secondary">
            <Sparkles className="w-4 h-4" /> Importar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {activeCount} activos · {products.length} total
          </span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm animate-scale-in">
          <span className="font-medium">{selected.size} seleccionados</span>
          <div className="h-4 w-px bg-gray-700" />
          <button onClick={() => handleBulkToggle(true)} className="hover:text-emerald-400 transition-colors">
            Activar
          </button>
          <button onClick={() => handleBulkToggle(false)} className="hover:text-yellow-400 transition-colors">
            Desactivar
          </button>
          <button onClick={handleBulkDelete} className="hover:text-red-400 transition-colors">
            Eliminar
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
          <p className="dash-empty-title">Sin resultados</p>
          <p className="dash-empty-desc">
            No hay productos que coincidan con &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="dash-empty py-20">
          <Package className="dash-empty-icon" />
          <p className="dash-empty-title">Sin productos</p>
          <p className="dash-empty-desc">Crea tu primer producto para empezar.</p>
          <button onClick={() => setPanel('new')} className="dash-btn-primary">
            <Plus className="w-4 h-4" /> Crear producto
          </button>
        </div>
      ) : (
        <div className="dash-card overflow-hidden">
          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_6rem_5rem_4.5rem_3.5rem] items-center gap-2 px-4 py-2 bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <div />
            <div>Producto</div>
            <div>Precio</div>
            <div>Estado</div>
            <div>Opciones</div>
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
                    panel={panel}
                    setPanel={setPanel}
                    handlePriceSave={handlePriceSave}
                    handleToggle={handleToggle}
                    handleDelete={handleDelete}
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

      {/* Side panel */}
      {panel !== null && (
        <ProductSidePanel
          product={panel === 'new' ? null : panel}
          categories={categories}
          currency={curr}
          onSave={handleSave}
          onClose={() => setPanel(null)}
          onCategoryCreated={onCatCreated}
        />
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
    </div>
  );
}

// ─── Sortable product list per category ────────────────────────

function SortableProductList({
  catId,
  catProducts,
  selected,
  toggleSel,
  panel,
  setPanel,
  handlePriceSave,
  handleToggle,
  handleDelete,
  curr,
  products,
  setProducts,
  startTransition,
}: {
  catId: string;
  catProducts: Product[];
  selected: Set<string>;
  toggleSel: (id: string) => void;
  panel: Product | 'new' | null;
  setPanel: (p: Product | 'new' | null) => void;
  handlePriceSave: (id: string, v: number) => void;
  handleToggle: (p: Product) => void;
  handleDelete: (id: string) => void;
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
            isPanelActive={!!(panel && typeof panel !== 'string' && panel.id === p.id)}
            setPanel={setPanel}
            handlePriceSave={handlePriceSave}
            handleToggle={handleToggle}
            handleDelete={handleDelete}
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
  isPanelActive,
  setPanel,
  handlePriceSave,
  handleToggle,
  handleDelete,
  curr,
}: {
  p: Product;
  isSel: boolean;
  toggleSel: (id: string) => void;
  isPanelActive: boolean;
  setPanel: (p: Product | 'new' | null) => void;
  handlePriceSave: (id: string, v: number) => void;
  handleToggle: (p: Product) => void;
  handleDelete: (id: string) => void;
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
        isPanelActive
          ? 'bg-emerald-50/40'
          : isSel
            ? 'bg-blue-50/30'
            : 'hover:bg-gray-50/50',
        !p.is_active && 'opacity-60',
      )}
    >
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1.5rem_2rem_1fr_6rem_5rem_4.5rem_3.5rem] items-center gap-2 px-4 py-2.5">
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
        <button
          onClick={() => setPanel(p)}
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
        </button>
        <InlinePriceCell price={Number(p.price)} currency={curr} onSave={v => handlePriceSave(p.id, v)} />
        <span className={cn('dash-badge text-[11px]', p.is_active ? 'dash-badge-active' : 'dash-badge-inactive')}>
          {p.is_active ? 'Activo' : 'Oculto'}
        </span>
        <div>
          {modCount > 0 ? (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{modCount}g</span>
          ) : (
            <span className="text-[11px] text-gray-300">&mdash;</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => handleToggle(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400" title={p.is_active ? 'Ocultar' : 'Mostrar'}>
            {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <button onClick={() => setPanel(p)} className="flex md:hidden items-center gap-3 px-4 py-3 w-full text-left">
        {p.image_url ? (
          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <Image src={p.image_url} alt={p.name} fill sizes="44px" className="object-cover" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', p.is_active ? 'text-gray-900' : 'text-gray-500')}>{p.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatPrice(Number(p.price), curr)}
            {modCount > 0 && ` · ${modCount} grupos`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </button>
    </div>
  );
}
