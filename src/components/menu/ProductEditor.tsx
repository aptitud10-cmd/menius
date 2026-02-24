'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Loader2, Check, Camera, Trash2, X,
  ImagePlus, Eye, EyeOff, PackageCheck, PackageX, Languages, Sparkles, Link2,
} from 'lucide-react';
import { createProduct, updateProduct, deleteProduct } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/dashboard/DashToast';
import type { Product, Category, DietaryTag, ContentTranslation } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { getLocaleFlag, getLocaleLabel } from '@/lib/i18n';
import { ModifierGroupsEditor } from './ModifierGroupsEditor';
import { MediaPicker } from './MediaPicker';

interface Props {
  product: Product | null;
  categories: Category[];
  currency: string;
  defaultLocale?: string;
  availableLocales?: string[];
}

export function ProductEditor({
  product,
  categories,
  currency,
  defaultLocale = 'es',
  availableLocales = ['es'],
}: Props) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const isEditing = !!product;
  const hasMultiLang = availableLocales.length > 1;

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
    is_active: product?.is_active ?? true,
    in_stock: product?.in_stock ?? true,
    is_featured: product?.is_featured ?? false,
    is_new: product?.is_new ?? false,
    dietary_tags: (product?.dietary_tags ?? []) as DietaryTag[],
  });

  const [translations, setTranslations] = useState<Record<string, ContentTranslation>>(
    product?.translations ?? {},
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  const selectedCategory = categories.find(c => c.id === form.category_id);
  const busy = uploading || isPending || aiGenerating;

  const handleAIGenerate = useCallback(async () => {
    if (!form.name.trim()) { setError('Ingresa el nombre del producto primero'); return; }
    setAiGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.name,
          description: form.description,
          category: selectedCategory?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando imagen');
      setGalleryUrl(data.url);
      setImagePreview(data.url);
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando imagen con IA');
    } finally {
      setAiGenerating(false);
    }
  }, [form.name, form.description, selectedCategory?.name]);

  const handleUrlSubmit = useCallback(() => {
    const url = urlValue.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setError('URL inválida');
      return;
    }
    setGalleryUrl(url);
    setImagePreview(url);
    setImageFile(null);
    setUrlValue('');
    setShowUrlInput(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [urlValue]);

  const handleGallerySelect = useCallback((url: string) => {
    setGalleryUrl(url);
    setImagePreview(url);
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setGalleryUrl(null);
    setError('');
  }, []);

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
      setError(err instanceof Error ? err.message : 'Error subiendo imagen');
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

    let imageUrl: string | null = galleryUrl;
    if (!imageUrl && imageFile) {
      imageUrl = await uploadImage();
      if (imageUrl === null && imageFile) return;
    }

    startTransition(async () => {
      try {
        if (isEditing && product) {
          const data: Record<string, unknown> = {
            name: form.name,
            description: form.description,
            price,
            category_id: form.category_id,
            is_active: form.is_active,
            in_stock: form.in_stock,
            is_featured: form.is_featured,
            is_new: form.is_new,
            dietary_tags: form.dietary_tags,
            translations: Object.keys(translations).length > 0 ? translations : null,
          };
          if (imageUrl) data.image_url = imageUrl;
          const res = await updateProduct(product.id, data);
          if (res.error) { setError(res.error); toastError(res.error); return; }
          setSaved(true);
          toastSuccess('Producto actualizado');
          setTimeout(() => { setSaved(false); router.push('/app/menu/products'); }, 1200);
        } else {
          const res = await createProduct({
            name: form.name,
            description: form.description,
            price,
            category_id: form.category_id,
            is_active: form.is_active,
            is_new: form.is_new,
            dietary_tags: form.dietary_tags,
            ...(imageUrl ? { image_url: imageUrl } : {}),
          });
          if (res.error) { setError(res.error); toastError(res.error); return; }
          setSaved(true);
          toastSuccess('Producto creado');
          setTimeout(() => router.push('/app/menu/products'), 1200);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      }
    });
  };

  const handleDelete = () => {
    if (!product || !confirm('¿Eliminar este producto permanentemente?')) return;
    startTransition(async () => {
      try {
        const res = await deleteProduct(product.id);
        if (res?.error) { setError(res.error); return; }
        router.push('/app/menu/products');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar');
      }
    });
  };

  const toggleTag = (tag: DietaryTag) => {
    setForm(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setGalleryUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/app/menu/products')}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {isEditing ? form.name || product.name : 'Nuevo producto'}
              </h1>
              <p className="text-xs text-gray-500">
                {isEditing ? 'Editar producto' : 'Crear producto'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={busy}
                className="dash-btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
            <button
              onClick={() => router.push('/app/menu/products')}
              className="dash-btn-secondary"
            >
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
              ) : (
                <><Save className="w-4 h-4" /> {isEditing ? 'Guardar' : 'Crear producto'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: Main info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic info card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Información básica</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Tacos al Pastor"
                    className="dash-input"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el producto..."
                    rows={4}
                    className="dash-input resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Image card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Imagen</h2>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative group">
                  <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized={imagePreview.startsWith('blob:')}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 flex-wrap p-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                      <Camera className="w-4 h-4 inline mr-1" /> Cambiar
                    </button>
                    <button
                      onClick={() => setGalleryOpen(true)}
                      className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <ImagePlus className="w-4 h-4 inline mr-1" /> Galería
                    </button>
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating}
                      className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                    >
                      {aiGenerating ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 inline mr-1" />} IA
                    </button>
                    <button
                      onClick={removeImage}
                      className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3">
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Subir imagen
                    </button>
                    <button
                      onClick={() => setGalleryOpen(true)}
                      className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Elegir de galería
                    </button>
                    <button
                      onClick={handleAIGenerate}
                      disabled={aiGenerating}
                      className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      {aiGenerating ? <><Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" /> Generando...</> : <><Sparkles className="w-3.5 h-3.5 inline mr-1" /> Generar con IA</>}
                    </button>
                    <button
                      onClick={() => setShowUrlInput(true)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5 inline mr-1" /> Desde URL
                    </button>
                  </div>
                  {showUrlInput && (
                    <div className="flex items-center gap-2 w-full max-w-md px-4">
                      <input
                        type="url"
                        value={urlValue}
                        onChange={e => setUrlValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') setShowUrlInput(false); }}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="dash-input flex-1 text-sm"
                        autoFocus
                      />
                      <button onClick={handleUrlSubmit} className="px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                        OK
                      </button>
                      <button onClick={() => { setShowUrlInput(false); setUrlValue(''); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-gray-400">PNG, JPG hasta 5MB</span>
                </div>
              )}
            </div>

            {/* Modifier Groups */}
            {isEditing && product && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Grupos de modificadores</h2>
                <ModifierGroupsEditor
                  productId={product.id}
                  groups={product.modifier_groups ?? []}
                />
              </div>
            )}

            {/* Translations */}
            {hasMultiLang && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  <Languages className="w-4 h-4 inline mr-1.5" />
                  Traducciones
                </h2>
                <div className="space-y-4">
                  {availableLocales
                    .filter(l => l !== defaultLocale)
                    .map(locale => (
                      <div key={locale} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{getLocaleFlag(locale)}</span>
                          <span className="text-sm font-medium text-gray-700">{getLocaleLabel(locale)}</span>
                        </div>
                        <div className="space-y-3">
                          <input
                            value={translations[locale]?.name ?? ''}
                            onChange={e =>
                              setTranslations(prev => ({
                                ...prev,
                                [locale]: { ...prev[locale], name: e.target.value },
                              }))
                            }
                            placeholder={form.name || 'Nombre traducido...'}
                            className="dash-input"
                          />
                          <textarea
                            value={translations[locale]?.description ?? ''}
                            onChange={e =>
                              setTranslations(prev => ({
                                ...prev,
                                [locale]: { ...prev[locale], description: e.target.value },
                              }))
                            }
                            placeholder={form.description || 'Descripción traducida...'}
                            rows={2}
                            className="dash-input resize-none"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Metadata */}
          <div className="space-y-6">

            {/* Status card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Estado</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    {form.is_active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    Visible en menú
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_active}
                    onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      form.is_active ? 'bg-emerald-500' : 'bg-gray-300',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                      form.is_active && 'translate-x-5',
                    )} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    {form.in_stock ? <PackageCheck className="w-4 h-4 text-emerald-600" /> : <PackageX className="w-4 h-4 text-red-500" />}
                    En stock
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.in_stock}
                    onClick={() => setForm(prev => ({ ...prev, in_stock: !prev.in_stock }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      form.in_stock ? 'bg-emerald-500' : 'bg-gray-300',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                      form.in_stock && 'translate-x-5',
                    )} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-base">🔥</span>
                    Destacado
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_featured}
                    onClick={() => setForm(prev => ({ ...prev, is_featured: !prev.is_featured }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      form.is_featured ? 'bg-orange-500' : 'bg-gray-300',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                      form.is_featured && 'translate-x-5',
                    )} />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-base">🆕</span>
                    Nuevo
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_new}
                    onClick={() => setForm(prev => ({ ...prev, is_new: !prev.is_new }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      form.is_new ? 'bg-blue-500' : 'bg-gray-300',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                      form.is_new && 'translate-x-5',
                    )} />
                  </button>
                </label>
              </div>
            </div>

            {/* Pricing card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Precio</h2>
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="dash-input pl-8 text-lg font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Category card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Categoría</h2>
              <select
                value={form.category_id}
                onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                className="dash-input"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedCategory && (
                <p className="mt-2 text-xs text-gray-500">
                  Los productos de esta categoría aparecen bajo "{selectedCategory.name}" en el menú.
                </p>
              )}
            </div>

            {/* Dietary tags card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Etiquetas dietéticas</h2>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => {
                  const active = form.dietary_tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        active
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                      )}
                    >
                      {tag.emoji} {defaultLocale === 'en' ? tag.labelEn : tag.labelEs}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaPicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
