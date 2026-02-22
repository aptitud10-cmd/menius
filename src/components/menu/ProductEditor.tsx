'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft, Camera, Trash2, Loader2, Plus, Save, X,
  Package, ChevronRight, Check,
} from 'lucide-react';
import {
  createProduct, updateProduct, createCategory,
} from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Product, Category, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { ModifierGroupsEditor } from './ModifierGroupsEditor';

export function ProductEditor({
  product,
  categories: initialCategories,
}: {
  product: Product | null;
  categories: Category[];
}) {
  const router = useRouter();
  const isEditing = !!product;
  const [categories, setCategories] = useState(initialCategories);

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
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
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
    } catch (err: any) {
      setError(err.message ?? 'Error subiendo imagen');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    if (!form.category_id) { setError('Selecciona una categoría'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio inválido'); return; }

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
          name: form.name, description: form.description, price,
          category_id: form.category_id, dietary_tags: form.dietary_tags,
        };
        if (imageUrl) updateData.image_url = imageUrl;
        const result = await updateProduct(product.id, updateData);
        if (result.error) { setError(result.error); return; }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const result = await createProduct({
          name: form.name, description: form.description, price,
          category_id: form.category_id, is_active: true,
          dietary_tags: form.dietary_tags,
        });
        if (result.error) { setError(result.error); return; }
        if (result.id) {
          router.push(`/app/menu/products/${result.id}`);
        } else {
          router.push('/app/menu/products');
        }
      }
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const result = await createCategory({
      name: newCategoryName,
      sort_order: categories.length,
      is_active: true,
    });
    if (result.success && result.id) {
      const newCat: Category = {
        id: result.id, name: result.name!, restaurant_id: '',
        sort_order: categories.length, is_active: true, created_at: '',
      };
      setCategories(prev => [...prev, newCat]);
      setForm(prev => ({ ...prev, category_id: result.id! }));
    }
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const isBusy = isPending || uploading;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/app/menu/products')}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <nav className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
              <Link href="/app/menu/products" className="hover:text-gray-600 transition-colors">Productos</Link>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-gray-900 font-medium truncate">
                {isEditing ? product.name : 'Nuevo producto'}
              </span>
            </nav>
            <span className="sm:hidden text-sm font-medium text-gray-900 truncate">
              {isEditing ? product.name : 'Nuevo producto'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/app/menu/products')}
              className="dash-btn-secondary text-sm py-1.5 px-3"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isBusy}
              className={cn(
                'dash-btn-primary text-sm py-1.5 px-4',
                saved && 'bg-emerald-600'
              )}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Subiendo...</>
              ) : isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              ) : saved ? (
                <><Check className="w-4 h-4" />Guardado</>
              ) : (
                <><Save className="w-4 h-4" />{isEditing ? 'Guardar' : 'Crear'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6 pb-12">
        {/* Left column — Product info (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic info */}
          <div className="dash-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Información</h3>
            <div className="space-y-4">
              <div>
                <label className="dash-label mb-1.5 block">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Hamburguesa clásica"
                  autoFocus
                  className="dash-input"
                />
              </div>
              <div>
                <label className="dash-label mb-1.5 block">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe el producto..."
                  rows={3}
                  className="dash-input resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="dash-label mb-1.5 block">Precio base *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    className="dash-input"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="dash-label">Categoría *</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      + Nueva
                    </button>
                  </div>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nombre de categoría"
                        autoFocus
                        className="dash-input flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateCategory();
                          if (e.key === 'Escape') setShowNewCategory(false);
                        }}
                      />
                      <button onClick={handleCreateCategory} className="dash-btn-primary px-2.5 py-1.5">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="dash-btn-secondary px-2.5 py-1.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="dash-select"
                    >
                      {categories.length === 0 && <option value="">Sin categorías</option>}
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="dash-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Imagen</h3>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

            {imagePreview ? (
              <div className="relative w-full h-56 rounded-lg overflow-hidden bg-gray-100 group">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="600px" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3">
                  <button onClick={() => fileRef.current?.click()} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="opacity-0 group-hover:opacity-100 p-2.5 rounded-lg bg-white text-red-600 hover:bg-red-50 transition-all shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-lg border-2 border-dashed border-gray-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-emerald-600 transition-all"
              >
                <Camera className="w-6 h-6" />
                <span className="text-sm font-medium">Subir foto del producto</span>
                <span className="text-xs text-gray-400">JPG, PNG hasta 5MB</span>
              </button>
            )}
          </div>

          {/* Dietary tags */}
          <div className="dash-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Etiquetas dietéticas</h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => {
                const isSelected = form.dietary_tags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      dietary_tags: isSelected
                        ? prev.dietary_tags.filter(t => t !== tag.id)
                        : [...prev.dietary_tags, tag.id],
                    }))}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.labelEs}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — Modifiers (40%) */}
        <div className="lg:col-span-2">
          <div className="dash-card p-5 lg:sticky lg:top-16">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Opciones y modificadores</h3>

            {isEditing && product ? (
              <ModifierGroupsEditor
                groups={product.modifier_groups ?? []}
                productId={product.id}
              />
            ) : (
              <div className="text-center py-10">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Crea el producto primero</p>
                <p className="text-xs text-gray-400 mt-1">
                  Después de crear el producto podrás agregar opciones como Tamaño, Extras, Salsas, etc.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
