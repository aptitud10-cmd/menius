'use client';

import { useState, useRef, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X, Save, Loader2, Check, Camera, Trash2,
  ImagePlus, Eye, EyeOff, PackageCheck, PackageX, Sparkles, Link2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { updateProduct } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Product, Category, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { ModifierGroupsEditor } from '@/components/menu/ModifierGroupsEditor';
import { MediaPicker } from '@/components/menu/MediaPicker';

interface Props {
  product: Product;
  categories: Category[];
  currency: string;
  locale: string;
  onClose: () => void;
}

export function OwnerProductEditModal({ product, categories, currency, locale, onClose }: Props) {
  const router = useRouter();
  const en = locale === 'en';

  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? '',
    price: String(product.price),
    category_id: product.category_id,
    is_active: product.is_active,
    in_stock: product.in_stock ?? true,
    is_featured: product.is_featured ?? false,
    is_new: product.is_new ?? false,
    dietary_tags: (product.dietary_tags ?? []) as DietaryTag[],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
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

  const busy = uploading || isPending || aiGenerating;
  const selectedCategory = categories.find(c => c.id === form.category_id);

  const handleAIGenerate = useCallback(async () => {
    if (!form.name.trim()) return;
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
      if (!res.ok) throw new Error(data.error || 'Error');
      setGalleryUrl(data.url);
      setImagePreview(data.url);
      setImageFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAiGenerating(false);
    }
  }, [form.name, form.description, selectedCategory?.name]);

  const handleUrlSubmit = useCallback(() => {
    const url = urlValue.trim();
    if (!url) return;
    try { new URL(url); } catch { setError(en ? 'Invalid URL' : 'URL inválida'); return; }
    setGalleryUrl(url);
    setImagePreview(url);
    setImageFile(null);
    setUrlValue('');
    setShowUrlInput(false);
  }, [urlValue, en]);

  const handleGallerySelect = useCallback((url: string) => {
    setGalleryUrl(url);
    setImagePreview(url);
    setImageFile(null);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setError(en ? 'Max 5 MB' : 'Máximo 5 MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setGalleryUrl(null);
    setError('');
  }, [en]);

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
      setError(err instanceof Error ? err.message : 'Upload error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError(en ? 'Name required' : 'Nombre requerido'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError(en ? 'Invalid price' : 'Precio inválido'); return; }

    let imageUrl: string | null = galleryUrl;
    if (!imageUrl && imageFile) {
      imageUrl = await uploadImage();
      if (imageUrl === null && imageFile) return;
    }

    startTransition(async () => {
      try {
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
        };
        if (imageUrl) data.image_url = imageUrl;
        const res = await updateProduct(product.id, data);
        if (res.error) { setError(res.error); return; }
        setSaved(true);
        setTimeout(() => { router.refresh(); onClose(); }, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      }
    });
  };

  const toggleTag = (tag: DietaryTag) => {
    setForm(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(dt => dt !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setGalleryUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-4 z-[101] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-4xl lg:max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{form.name || product.name}</h2>
            <p className="text-xs text-gray-500">{en ? 'Edit product' : 'Editar producto'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              {en ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors',
                saved ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600',
                busy && 'opacity-60'
              )}
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {en ? 'Uploading...' : 'Subiendo...'}</>
               : isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> {en ? 'Saving...' : 'Guardando...'}</>
               : saved ? <><Check className="w-4 h-4" /> {en ? 'Saved!' : '¡Guardado!'}</>
               : <><Save className="w-4 h-4" /> {en ? 'Save' : 'Guardar'}</>}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Body — two columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left column */}
              <div className="lg:col-span-2 space-y-5">
                {/* Name & description */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">{en ? 'Basic info' : 'Información básica'}</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Name' : 'Nombre'}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Description' : 'Descripción'}</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                    />
                  </div>
                </div>

                {/* Image */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">{en ? 'Image' : 'Imagen'}</h3>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                  {imagePreview ? (
                    <div className="relative group">
                      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-100">
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" unoptimized={imagePreview.startsWith('blob:')} />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 flex-wrap p-2">
                        <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                          <Camera className="w-4 h-4 inline mr-1" /> {en ? 'Change' : 'Cambiar'}
                        </button>
                        <button onClick={() => setGalleryOpen(true)} className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                          <ImagePlus className="w-4 h-4 inline mr-1" /> {en ? 'Gallery' : 'Galería'}
                        </button>
                        <button onClick={handleAIGenerate} disabled={aiGenerating} className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50">
                          {aiGenerating ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 inline mr-1" />} AI
                        </button>
                        <button onClick={removeImage} className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 inline mr-1" /> {en ? 'Remove' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/9] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3">
                      <ImagePlus className="w-8 h-8 text-gray-400" />
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          {en ? 'Upload' : 'Subir'}
                        </button>
                        <button onClick={() => setGalleryOpen(true)} className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                          {en ? 'Gallery' : 'Galería'}
                        </button>
                        <button onClick={handleAIGenerate} disabled={aiGenerating} className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50">
                          {aiGenerating ? <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 inline mr-1" />} AI
                        </button>
                        <button onClick={() => setShowUrlInput(true)} className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                          <Link2 className="w-3.5 h-3.5 inline mr-1" /> URL
                        </button>
                      </div>
                      {showUrlInput && (
                        <div className="flex items-center gap-2 w-full max-w-md px-4">
                          <input type="url" value={urlValue} onChange={e => setUrlValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') setShowUrlInput(false); }} placeholder={en ? 'Paste image URL...' : 'Pegar URL de imagen...'} className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-400" autoFocus />
                          <button onClick={handleUrlSubmit} className="px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">OK</button>
                          <button onClick={() => { setShowUrlInput(false); setUrlValue(''); }} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modifier Groups */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">{en ? 'Variants & Extras' : 'Variantes y Extras'}</h3>
                  <ModifierGroupsEditor
                    productId={product.id}
                    groups={product.modifier_groups ?? []}
                    locale={locale as 'es' | 'en'}
                    currency={currency}
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Price */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{en ? 'Price' : 'Precio'}</h3>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-200 pl-8 pr-4 py-2.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{en ? 'Category' : 'Categoría'}</h3>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Status toggles */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{en ? 'Status' : 'Estado'}</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'is_active' as const, icon: form.is_active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />, label: en ? 'Visible' : 'Visible' },
                      { key: 'in_stock' as const, icon: form.in_stock ? <PackageCheck className="w-4 h-4 text-emerald-600" /> : <PackageX className="w-4 h-4 text-red-500" />, label: en ? 'In stock' : 'En stock' },
                      { key: 'is_featured' as const, icon: <span className="text-base">🔥</span>, label: en ? 'Featured' : 'Destacado' },
                      { key: 'is_new' as const, icon: <span className="text-base">🆕</span>, label: en ? 'New' : 'Nuevo' },
                    ].map(({ key, icon, label }) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="flex items-center gap-2 text-sm text-gray-700">{icon} {label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form[key]}
                          onClick={() => setForm(prev => ({ ...prev, [key]: !prev[key] }))}
                          className={cn('relative w-11 h-6 rounded-full transition-colors', form[key] ? 'bg-emerald-500' : 'bg-gray-300')}
                        >
                          <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm', form[key] && 'translate-x-5')} />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dietary tags */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{en ? 'Dietary tags' : 'Etiquetas dietéticas'}</h3>
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
                            active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                          )}
                        >
                          {tag.emoji} {locale === 'en' ? tag.labelEn : tag.labelEs}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <MediaPicker open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelect={handleGallerySelect} />
    </>
  );
}
