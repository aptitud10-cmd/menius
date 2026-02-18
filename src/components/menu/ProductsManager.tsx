'use client';

import { useState, useTransition, useRef, lazy, Suspense } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, Sparkles,
  Loader2, Camera, Wand2, Package, Layers, ListPlus, ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import {
  createProduct, updateProduct, deleteProduct,
  createVariant, updateVariant, deleteVariant,
  createExtra, updateExtra, deleteExtra,
  createCategory,
} from '@/lib/actions/restaurant';
import { formatPrice, cn } from '@/lib/utils';
import type { Product, Category, ProductVariant, ProductExtra } from '@/types';

const MenuImportLazy = lazy(() => import('./MenuImport').then(m => ({ default: m.MenuImport })));

const AI_STYLES = [
  { id: 'professional', label: 'Profesional', desc: 'Fondo neutro, iluminacion suave' },
  { id: 'rustic', label: 'Rustico', desc: 'Mesa de madera, ambiente calido' },
  { id: 'modern', label: 'Moderno', desc: 'Minimalista, colores limpios' },
  { id: 'vibrant', label: 'Vibrante', desc: 'Colores saturados, dinamico' },
];

// ============================================================
// VARIANT / EXTRA INLINE EDITORS
// ============================================================

function VariantEditor({ variants, productId, onUpdate }: {
  variants: ProductVariant[];
  productId: string;
  onUpdate: (variants: ProductVariant[]) => void;
}) {
  const [items, setItems] = useState(variants);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price_delta: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const result = await createVariant(productId, {
      name: form.name,
      price_delta: parseFloat(form.price_delta) || 0,
      sort_order: items.length + 1,
    });
    if (result.variant) {
      const newItems = [...items, result.variant as ProductVariant];
      setItems(newItems);
      onUpdate(newItems);
    }
    setForm({ name: '', price_delta: '' });
    setAdding(false);
    setLoading(false);
  };

  const handleUpdate = async (v: ProductVariant) => {
    setLoading(true);
    await updateVariant(v.id, { name: form.name || v.name, price_delta: parseFloat(form.price_delta) || v.price_delta, sort_order: v.sort_order });
    const newItems = items.map(i => i.id === v.id ? { ...i, name: form.name || i.name, price_delta: parseFloat(form.price_delta) || i.price_delta } : i);
    setItems(newItems);
    onUpdate(newItems);
    setEditId(null);
    setForm({ name: '', price_delta: '' });
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    await deleteVariant(id);
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    onUpdate(newItems);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-200">Variantes</span>
          <span className="text-xs text-gray-400">(ej: tamano, termino de coccion)</span>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-400 py-2">Sin variantes. Los clientes veran solo el precio base.</p>
      )}

      <div className="space-y-1.5">
        {items.map((v) => (
          <div key={v.id} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            {editId === v.id ? (
              <>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="flex-1 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <input value={form.price_delta} onChange={e => setForm({ ...form, price_delta: e.target.value })} placeholder="+0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={() => handleUpdate(v)} disabled={loading} className="text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50">Guardar</button>
                <button onClick={() => { setEditId(null); setForm({ name: '', price_delta: '' }); }} className="text-xs text-gray-400">Cancelar</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-200 font-medium">{v.name}</span>
                <span className="text-sm text-gray-500 font-mono">
                  {v.price_delta > 0 ? `+$${v.price_delta.toFixed(2)}` : v.price_delta < 0 ? `-$${Math.abs(v.price_delta).toFixed(2)}` : 'Base'}
                </span>
                <button onClick={() => { setEditId(v.id); setForm({ name: v.name, price_delta: String(v.price_delta) }); }} className="p-1 rounded hover:bg-white/[0.08] text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(v.id)} className="p-1 rounded hover:bg-red-500/[0.08] text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 bg-blue-500/[0.06] rounded-lg px-3 py-2 border border-blue-500/[0.15]">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Grande, Medium Rare..." autoFocus className="flex-1 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <input value={form.price_delta} onChange={e => setForm({ ...form, price_delta: e.target.value })} placeholder="+0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <button onClick={handleAdd} disabled={loading || !form.name.trim()} className="text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50">{loading ? '...' : 'Agregar'}</button>
            <button onClick={() => { setAdding(false); setForm({ name: '', price_delta: '' }); }} className="text-xs text-gray-400">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtraEditor({ extras, productId, onUpdate }: {
  extras: ProductExtra[];
  productId: string;
  onUpdate: (extras: ProductExtra[]) => void;
}) {
  const [items, setItems] = useState(extras);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const result = await createExtra(productId, {
      name: form.name,
      price: parseFloat(form.price) || 0,
      sort_order: items.length + 1,
    });
    if (result.extra) {
      const newItems = [...items, result.extra as ProductExtra];
      setItems(newItems);
      onUpdate(newItems);
    }
    setForm({ name: '', price: '' });
    setAdding(false);
    setLoading(false);
  };

  const handleUpdate = async (ex: ProductExtra) => {
    setLoading(true);
    await updateExtra(ex.id, { name: form.name || ex.name, price: parseFloat(form.price) || ex.price, sort_order: ex.sort_order });
    const newItems = items.map(i => i.id === ex.id ? { ...i, name: form.name || i.name, price: parseFloat(form.price) || i.price } : i);
    setItems(newItems);
    onUpdate(newItems);
    setEditId(null);
    setForm({ name: '', price: '' });
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    await deleteExtra(id);
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    onUpdate(newItems);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-gray-200">Extras</span>
          <span className="text-xs text-gray-400">(ej: queso extra, tocino)</span>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-400 py-2">Sin extras. Agrega opciones adicionales para este producto.</p>
      )}

      <div className="space-y-1.5">
        {items.map((ex) => (
          <div key={ex.id} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            {editId === ex.id ? (
              <>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="flex-1 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                <button onClick={() => handleUpdate(ex)} disabled={loading} className="text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50">Guardar</button>
                <button onClick={() => { setEditId(null); setForm({ name: '', price: '' }); }} className="text-xs text-gray-400">Cancelar</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-200 font-medium">{ex.name}</span>
                <span className="text-sm text-emerald-400 font-mono">+${ex.price.toFixed(2)}</span>
                <button onClick={() => { setEditId(ex.id); setForm({ name: ex.name, price: String(ex.price) }); }} className="p-1 rounded hover:bg-white/[0.08] text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(ex.id)} className="p-1 rounded hover:bg-red-500/[0.08] text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 bg-emerald-500/[0.06] rounded-lg px-3 py-2 border border-emerald-500/[0.15]">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Extra queso, Tocino..." autoFocus className="flex-1 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" type="number" step="0.01" className="w-20 text-sm px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            <button onClick={handleAdd} disabled={loading || !form.name.trim()} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50">{loading ? '...' : 'Agregar'}</button>
            <button onClick={() => { setAdding(false); setForm({ name: '', price: '' }); }} className="text-xs text-gray-400">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EXPANDED PRODUCT EDITOR (DRAWER)
// ============================================================

function ProductEditor({ product, categories, onClose, onSave }: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const isEditing = !!product;
  const [tab, setTab] = useState<'info' | 'variants' | 'extras'>('info');
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStyle, setAiStyle] = useState('professional');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(product?.variants ?? []);
  const [localExtras, setLocalExtras] = useState<ProductExtra[]>(product?.extras ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imagenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Maximo 5MB'); return; }
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
    } catch (err: any) {
      setError(err.message ?? 'Error subiendo imagen');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const generateAIImage = async () => {
    if (!form.name.trim()) { setError('Escribe el nombre del producto primero'); return; }
    setGeneratingAI(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: form.name, description: form.description, style: aiStyle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImagePreview(data.url);
      setImageFile(null);
    } catch (err: any) {
      setError(err.message ?? 'Error generando imagen con IA');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    if (!form.category_id) { setError('Selecciona una categoria'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio invalido'); return; }

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage();
      if (imageUrl === null && imageFile) return;
    } else if (imagePreview && imagePreview.startsWith('http')) {
      if (!isEditing || product?.image_url !== imagePreview) {
        imageUrl = imagePreview;
      }
    }

    startTransition(async () => {
      if (isEditing && product) {
        const updateData: any = {
          name: form.name, description: form.description, price, category_id: form.category_id,
        };
        if (imageUrl) updateData.image_url = imageUrl;
        const result = await updateProduct(product.id, updateData);
        if (result.error) { setError(result.error); return; }
        onSave({
          ...product, name: form.name, description: form.description, price,
          category_id: form.category_id, variants: localVariants, extras: localExtras,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        });
      } else {
        const result = await createProduct({
          name: form.name, description: form.description, price, category_id: form.category_id, is_active: true,
        });
        if (result.error) { setError(result.error); return; }
        onSave({
          id: `temp-${Date.now()}`, restaurant_id: '', category_id: form.category_id,
          name: form.name, description: form.description, price, image_url: imageUrl ?? '',
          is_active: true, sort_order: 0, created_at: new Date().toISOString(),
          variants: [], extras: [],
        });
      }
    });
  };

  const tabs = [
    { id: 'info' as const, label: 'Informacion', icon: Package },
    ...(isEditing ? [
      { id: 'variants' as const, label: `Variantes (${localVariants.length})`, icon: Layers },
      { id: 'extras' as const, label: `Extras (${localExtras.length})`, icon: ListPlus },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0a0a0a] shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-base text-white">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[65px] z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-5 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-400'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-5">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Imagen</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden bg-white/[0.06] group">
                    <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="500px" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
                      <button onClick={() => fileRef.current?.click()} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-[#0a0a0a]/90 text-gray-200 hover:bg-[#0a0a0a] transition-all"><Camera className="w-4 h-4" /></button>
                      <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-[#0a0a0a]/90 text-red-600 hover:bg-[#0a0a0a] transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {generatingAI && (
                      <div className="absolute inset-0 bg-[#0a0a0a]/80 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                        <span className="text-sm font-medium text-purple-400">Generando con IA...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => fileRef.current?.click()} disabled={generatingAI} className="h-28 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-purple-400 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-purple-400 transition-all disabled:opacity-50">
                      <Camera className="w-5 h-5" /><span className="text-xs font-medium">Subir foto</span>
                    </button>
                    <button onClick={() => { if (!form.name.trim()) { setError('Escribe el nombre primero'); return; } setShowStylePicker(true); }} disabled={generatingAI} className="h-28 rounded-xl border-2 border-dashed border-violet-500/20 bg-violet-500/[0.04] hover:border-violet-400 flex flex-col items-center justify-center gap-2 text-violet-400 hover:text-violet-300 transition-all disabled:opacity-50">
                      {generatingAI ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs font-medium">Generando...</span></> : <><Sparkles className="w-5 h-5" /><span className="text-xs font-medium">Generar con IA</span></>}
                    </button>
                  </div>
                )}

                {showStylePicker && !imagePreview && (
                  <div className="mt-3 p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.15]">
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-violet-300">Estilo de imagen IA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {AI_STYLES.map((s) => (
                        <button key={s.id} onClick={() => setAiStyle(s.id)} className={cn('px-3 py-2 rounded-lg text-left transition-all text-xs', aiStyle === s.id ? 'bg-violet-600 text-white' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] border border-white/[0.08]')}>
                          <p className="font-medium">{s.label}</p>
                          <p className={cn('mt-0.5', aiStyle === s.id ? 'text-violet-200' : 'text-gray-500')}>{s.desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={generateAIImage} disabled={generatingAI} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                        {generatingAI ? <><Loader2 className="w-4 h-4 animate-spin" />Generando...</> : <><Sparkles className="w-4 h-4" />Generar</>}
                      </button>
                      <button onClick={() => setShowStylePicker(false)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] text-gray-400 text-sm hover:bg-white/[0.06] border border-white/[0.08]">Cancelar</button>
                    </div>
                  </div>
                )}

                {imagePreview && !generatingAI && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { setImagePreview(null); setImageFile(null); setShowStylePicker(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/[0.1] text-violet-400 text-xs font-medium hover:bg-violet-500/[0.15] border border-violet-500/[0.15]"><Sparkles className="w-3.5 h-3.5" />Regenerar con IA</button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 text-xs font-medium hover:bg-white/[0.06]"><Camera className="w-3.5 h-3.5" />Subir otra</button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Hamburguesa clasica" autoFocus className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe el producto..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 resize-none" />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Precio base *</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" min="0" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Categoria *</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Hint for variants/extras on new products */}
              {!isEditing && (
                <div className="bg-blue-500/[0.06] rounded-xl p-3 border border-blue-500/[0.15]">
                  <p className="text-xs text-blue-300">
                    <strong>Tip:</strong> Despues de crear el producto podras agregar variantes (tamanos, terminos de coccion) y extras (ingredientes adicionales) desde las pestanas de arriba.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VARIANTS TAB */}
          {tab === 'variants' && isEditing && product && (
            <VariantEditor
              variants={localVariants}
              productId={product.id}
              onUpdate={setLocalVariants}
            />
          )}

          {/* EXTRAS TAB */}
          {tab === 'extras' && isEditing && product && (
            <ExtraEditor
              extras={localExtras}
              productId={product.id}
              onUpdate={setLocalExtras}
            />
          )}
        </div>

        {/* Footer */}
        {tab === 'info' && (
          <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/[0.06] px-5 py-4 flex gap-2">
            <button onClick={handleSubmit} disabled={isPending || uploading || generatingAI} className="flex-1 px-5 py-3 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors">
              {uploading ? 'Subiendo imagen...' : isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl bg-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.08]">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PRODUCTS MANAGER
// ============================================================

export function ProductsManager({ initialProducts, categories, restaurantId, currency }: { initialProducts: Product[]; categories: Category[]; restaurantId?: string; currency?: string }) {
  const [products, setProducts] = useState(initialProducts);
  const [editorProduct, setEditorProduct] = useState<Product | null | 'new'>(null);
  const [isPending, startTransition] = useTransition();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showImport, setShowImport] = useState(false);

  const handleSave = (saved: Product) => {
    if (products.find(p => p.id === saved.id)) {
      setProducts(prev => prev.map(p => p.id === saved.id ? saved : p));
    } else {
      setProducts(prev => [...prev, saved]);
    }
    setEditorProduct(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Eliminar este producto?')) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleToggle = (p: Product) => {
    startTransition(async () => {
      await updateProduct(p.id, { is_active: !p.is_active });
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    });
  };

  const getCategoryName = (catId: string) => categories.find(c => c.id === catId)?.name ?? '';

  const filteredProducts = filterCategory === 'all' ? products : products.filter(p => p.category_id === filterCategory);
  const activeCount = products.filter(p => p.is_active).length;

  return (
    <div>
      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-gray-500">Primero crea una categoria</p>
          <p className="text-sm mt-1.5">Necesitas al menos una categoria antes de agregar productos</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditorProduct('new')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nuevo producto
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/[0.1] text-purple-400 text-sm font-medium hover:bg-purple-500/[0.1] transition-colors border border-purple-500/20"
              >
                <Sparkles className="w-4 h-4" /> Importar con IA
              </button>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-gray-400">{activeCount} activos de {products.length}</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="all">Todas las categorias</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Product List */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-gray-500">Sin productos</p>
              <p className="text-sm mt-1.5">Agrega productos a tu menu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 bg-[#0a0a0a] rounded-xl border px-4 py-3 transition-all hover: group cursor-pointer',
                    p.is_active ? 'border-white/[0.06]' : 'border-white/[0.06] opacity-60'
                  )}
                  onClick={() => setEditorProduct(p)}
                >
                  {p.image_url ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/[0.06] flex-shrink-0">
                      <Image src={p.image_url} alt={p.name} fill sizes="56px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
                      <ImagePlus className="w-5 h-5 text-gray-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-sm font-semibold truncate', !p.is_active && 'line-through text-gray-400')}>{p.name}</span>
                      {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 font-medium flex-shrink-0">Oculto</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-purple-400">{formatPrice(Number(p.price))}</span>
                      <span className="text-xs bg-white/[0.06] text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{getCategoryName(p.category_id)}</span>
                      {(p.variants?.length ?? 0) > 0 && (
                        <span className="text-[10px] bg-blue-500/[0.1] text-blue-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          {p.variants!.length} var
                        </span>
                      )}
                      {(p.extras?.length ?? 0) > 0 && (
                        <span className="text-[10px] bg-emerald-500/[0.1] text-emerald-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          {p.extras!.length} ext
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(p); }}
                      className={cn('p-2 rounded-lg transition-colors', p.is_active ? 'text-gray-400 hover:bg-white/[0.06]' : 'text-gray-300 hover:bg-white/[0.06]')}
                      title={p.is_active ? 'Ocultar' : 'Mostrar'}
                    >
                      {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-500/[0.08] hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editor Drawer */}
          {editorProduct !== null && (
            <ProductEditor
              product={editorProduct === 'new' ? null : editorProduct}
              categories={categories}
              onClose={() => setEditorProduct(null)}
              onSave={handleSave}
            />
          )}

          {/* AI Import Modal */}
          {showImport && (
            <MenuImportLazy
              existingCategories={categories.map(c => ({ id: c.id, name: c.name }))}
              restaurantId={restaurantId || ''}
              currency={currency || 'USD'}
              onComplete={() => window.location.reload()}
              onClose={() => setShowImport(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
