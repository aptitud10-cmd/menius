'use client';

import { useState, useTransition, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Tag, GripVertical, Languages, X, Camera, ImageIcon, Clock, ChefHat, Store, LayoutGrid, List, Wand2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createCategory, updateCategory, deleteCategory, reorderCategories } from '@/lib/actions/restaurant';
import { UpgradePromptModal } from '@/components/dashboard/UpgradePromptModal';
import { useToast } from '@/components/dashboard/DashToast';
import { cn } from '@/lib/utils';
import { SUPPORTED_LOCALES, getLocaleFlag } from '@/lib/i18n';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { Category, ContentTranslation } from '@/types';

// 44x44 tap target on touch screens; desktop keeps the compact icon button.
const TOUCH_TARGET =
  'pointer-coarse:p-0 pointer-coarse:w-11 pointer-coarse:h-11 inline-flex items-center justify-center';

// Vercel rejects request bodies above ~4.5 MB before the upload route runs.
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024;

interface CategoriesManagerProps {
  initialCategories: Category[];
  defaultLocale: string;
  availableLocales: string[];
}

function SortableCategoryRow({
  cat,
  hasMultiLang,
  onToggle,
  onToggleKitchen,
  onCycleDisplay,
  onEdit,
  onDelete,
  onTranslate,
  onImageUpload,
  uploading,
}: {
  cat: Category;
  hasMultiLang: boolean;
  onToggle: () => void;
  onToggleKitchen: () => void;
  onCycleDisplay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTranslate: () => void;
  onImageUpload: (file: File) => void;
  uploading: boolean;
}) {
  const { t, locale } = useDashboardLocale();
  const imgRef = useRef<HTMLInputElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

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
        'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-3 hover:bg-gray-50/50 transition-colors group',
        isDragging && 'bg-white shadow-lg rounded-lg border border-gray-200'
      )}
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <button
          className="p-1 -ml-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none inline-flex items-center justify-center pointer-coarse:w-11 pointer-coarse:h-11 pointer-coarse:-ml-3"
          aria-label={locale === 'en' ? 'Drag to reorder' : 'Arrastrar para ordenar'}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <input
          ref={imgRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Reset so picking the same file again after an error retries.
            e.target.value = '';
            if (f) onImageUpload(f);
          }}
        />
        {cat.image_url ? (
          <button
            onClick={() => imgRef.current?.click()}
            disabled={uploading}
            className="relative w-7 h-7 pointer-coarse:w-11 pointer-coarse:h-11 rounded-md overflow-hidden bg-gray-100 shrink-0 group/img"
            title={t.editor_changeImage}
            aria-label={t.editor_changeImage}
          >
            <Image src={cat.image_url} alt="" aria-hidden="true" fill sizes="44px" className="object-cover" />
            <div className={cn(
              'absolute inset-0 flex items-center justify-center transition-colors',
              uploading ? 'bg-black/40' : 'bg-black/0 group-hover/img:bg-black/30 [@media(hover:none)]:bg-black/20',
            )}>
              {uploading
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Camera className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity" />}
            </div>
          </button>
        ) : (
          <button
            onClick={() => imgRef.current?.click()}
            disabled={uploading}
            className="w-7 h-7 pointer-coarse:w-11 pointer-coarse:h-11 rounded-md bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
            title={t.categories_uploadImage}
            aria-label={t.categories_uploadImage}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </button>
        )}
        <div className="min-w-0">
          <span className={cn('text-sm font-medium', cat.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>
            {cat.name}
          </span>
          {cat.available_from && cat.available_to && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
              <Clock className="w-2.5 h-2.5" />
              {cat.available_from} – {cat.available_to}
            </span>
          )}
        </div>
        {!cat.is_active && (
          <span className="dash-badge dash-badge-inactive text-[10px]">{t.categories_hidden}</span>
        )}
        {/* Va a la pantalla y al ticket de cocina, o se arma en el mostrador (bebidas,
            postres). Siempre visible: en tablet no hay hover. */}
        <button
          onClick={onToggleKitchen}
          className={cn(
            'ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold border transition-colors shrink-0',
            cat.send_to_kitchen === false
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
          )}
          title={locale === 'en'
            ? (cat.send_to_kitchen === false ? 'Made at the counter — not shown in the kitchen. Tap to send to the kitchen.' : 'Shown in the kitchen display and ticket. Tap if it’s made at the counter.')
            : (cat.send_to_kitchen === false ? 'Se arma en el mostrador: no sale en cocina. Tocá para mandarla a cocina.' : 'Sale en la pantalla y el ticket de cocina. Tocá si se arma en el mostrador.')}
        >
          {cat.send_to_kitchen === false
            ? <><Store className="w-3 h-3" />{locale === 'en' ? 'Counter' : 'Mostrador'}</>
            : <><ChefHat className="w-3 h-3" />{locale === 'en' ? 'Kitchen' : 'Cocina'}</>}
        </button>
        {/* Formato en el teléfono: Auto (grilla en menús chicos, lista en
            catálogos grandes) → Grilla → Lista. Tablet y desktop siempre grilla. */}
        <button
          onClick={onCycleDisplay}
          className={cn(
            'inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold border transition-colors shrink-0',
            cat.display_mode
              ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
          )}
          title={locale === 'en'
            ? 'How this category looks on phones. Grid = big photos, for dishes chosen by how they look (desserts). List = small photo, for dishes that look alike (burgers). Auto = grid on small menus, list on large ones. Tap to change.'
            : 'Cómo se ve esta categoría en el teléfono. Grilla = fotos grandes, para platos que se eligen por la foto (postres). Lista = foto chica, para platos que se parecen (hamburguesas). Auto = grilla en menús chicos, lista en grandes. Tocá para cambiar.'}
        >
          {cat.display_mode === 'grid'
            ? <><LayoutGrid className="w-3 h-3" />{locale === 'en' ? 'Grid' : 'Grilla'}</>
            : cat.display_mode === 'list'
              ? <><List className="w-3 h-3" />{locale === 'en' ? 'List' : 'Lista'}</>
              : <><Wand2 className="w-3 h-3" />Auto</>}
        </button>
      </div>
      {/* Always visible on touch screens (phone, tablet); with a mouse they
          appear on hover. 44x44 targets on coarse pointers. */}
      <div className="flex items-center gap-0.5 ml-auto transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
        {hasMultiLang && (
          <button onClick={onTranslate} className={cn('p-1.5 rounded-md hover:bg-gray-100 text-gray-400', TOUCH_TARGET)} title={t.categories_translate} aria-label={t.categories_translate}>
            <Languages className="w-3.5 h-3.5 pointer-coarse:w-4 pointer-coarse:h-4" />
          </button>
        )}
        <button onClick={onToggle} className={cn('p-1.5 rounded-md hover:bg-gray-100 text-gray-400', TOUCH_TARGET)} title={cat.is_active ? t.products_hide : t.products_show} aria-label={cat.is_active ? t.products_hide : t.products_show}>
          {cat.is_active ? <EyeOff className="w-3.5 h-3.5 pointer-coarse:w-4 pointer-coarse:h-4" /> : <Eye className="w-3.5 h-3.5 pointer-coarse:w-4 pointer-coarse:h-4" />}
        </button>
        <button onClick={onEdit} className={cn('p-1.5 rounded-md hover:bg-gray-100 text-gray-400', TOUCH_TARGET)} title={t.general_edit} aria-label={t.general_edit}>
          <Pencil className="w-3.5 h-3.5 pointer-coarse:w-4 pointer-coarse:h-4" />
        </button>
        <button onClick={onDelete} className={cn('p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500', TOUCH_TARGET)} title={t.general_delete} aria-label={t.general_delete}>
          <Trash2 className="w-3.5 h-3.5 pointer-coarse:w-4 pointer-coarse:h-4" />
        </button>
      </div>
    </div>
  );
}

export function CategoriesManager({ initialCategories, defaultLocale, availableLocales }: CategoriesManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [error, setError] = useState('');
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; reason?: string; suggestedPlan?: 'pro' }>({ open: false });
  const [translatingCat, setTranslatingCat] = useState<Category | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { t, locale } = useDashboardLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const L = (es: string, en: string) => (locale === 'en' ? en : es);

  const extraLocales = availableLocales.filter((l) => l !== defaultLocale);
  const hasMultiLang = extraLocales.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => {
    setName('');
    setAvailableFrom('');
    setAvailableTo('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError(t.categories_nameRequired);
      return;
    }

    const from = availableFrom || null;
    const to = availableTo || null;

    startTransition(async () => {
      if (editingId) {
        // Keep the category's place and visibility: this form only edits the
        // name and hours (sending 0/true moved it to the top and unhid it).
        const current = categories.find((c) => c.id === editingId);
        const result = await updateCategory(editingId, {
          name,
          sort_order: current?.sort_order ?? 0,
          is_active: current?.is_active ?? true,
          available_from: from,
          available_to: to,
        });
        if (result.error) { setError(result.error); return; }
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, name, available_from: from, available_to: to } : c));
      } else {
        const result = await createCategory({ name, sort_order: categories.length, is_active: true, available_from: from, available_to: to });
        if (result.error) {
          if ((result as any).limitReached) {
            setUpgradeModal({ open: true, reason: result.error, suggestedPlan: 'pro' });
            return;
          }
          setError(result.error); return;
        }
        // Real id from the server: hiding, deleting or adding a photo right
        // after creating must target the saved row, not a temporary one.
        const newId = 'id' in result && result.id ? result.id : null;
        if (!newId) { window.location.reload(); return; }
        setCategories((prev) => [...prev, { id: newId, restaurant_id: '', name, sort_order: prev.length, is_active: true, created_at: new Date().toISOString(), available_from: from, available_to: to }]);
      }
      resetForm();
    });
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setAvailableFrom(cat.available_from ?? '');
    setAvailableTo(cat.available_to ?? '');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.categories_deleteConfirm)) return;
    const snapshot = categories;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    startTransition(async () => {
      try {
        const res = await deleteCategory(id);
        if (res?.error) throw new Error(res.error);
      } catch {
        setCategories(snapshot);
        toastError(L('No se pudo borrar la categoría. Probá de nuevo.', 'Couldn’t delete the category. Please try again.'));
      }
    });
  };

  const handleToggle = (cat: Category) => {
    const next = !cat.is_active;
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: next } : c));
    startTransition(async () => {
      try {
        const res = await updateCategory(cat.id, { name: cat.name, sort_order: cat.sort_order, is_active: next });
        if (res?.error) throw new Error(res.error);
      } catch {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: cat.is_active } : c));
        toastError(next
          ? L('No se pudo mostrar la categoría. Sigue oculta.', 'Couldn’t show the category. It’s still hidden.')
          : L('No se pudo ocultar la categoría. Sigue visible en la tienda.', 'Couldn’t hide the category. It’s still visible in the store.'));
      }
    });
  };

  const handleToggleKitchen = (cat: Category) => {
    const next = cat.send_to_kitchen === false;
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, send_to_kitchen: next } : c));
    startTransition(async () => {
      try {
        const res = await updateCategory(cat.id, { name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active, send_to_kitchen: next });
        if (res?.error) throw new Error(res.error);
      } catch {
        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, send_to_kitchen: !next } : c));
        toastError(L('No se pudo cambiar Cocina/Mostrador. Probá de nuevo.', 'Couldn’t change Kitchen/Counter. Please try again.'));
      }
    });
  };

  const handleCycleDisplay = (cat: Category) => {
    const prev = cat.display_mode ?? null;
    const next = prev === null ? 'grid' : prev === 'grid' ? 'list' : null;
    setCategories((all) => all.map((c) => c.id === cat.id ? { ...c, display_mode: next } : c));
    startTransition(async () => {
      try {
        const res = await updateCategory(cat.id, { name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active, display_mode: next });
        if (res?.error) throw new Error(res.error);
      } catch {
        setCategories((all) => all.map((c) => c.id === cat.id ? { ...c, display_mode: prev } : c));
        toastError(L('No se pudo cambiar el formato. Probá de nuevo.', 'Couldn’t change the layout. Please try again.'));
      }
    });
  };

  const handleImageUpload = async (catId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toastError(L('Ese archivo no es una imagen.', 'That file is not an image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toastError(L('La foto pesa más de 4,5 MB. Elegí una más liviana.', 'The photo is larger than 4.5 MB. Pick a smaller one.'));
      return;
    }
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploadingId(catId);
    try {
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      // Oversized bodies come back as plain text, not JSON.
      const data: { url?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? `HTTP ${res.status}`);
      const saved = await updateCategory(catId, { name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active, image_url: data.url });
      if (saved?.error) throw new Error(saved.error);
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, image_url: data.url } : c));
      toastSuccess(L('Foto guardada', 'Photo saved'));
    } catch {
      toastError(L('No se pudo subir la foto. Probá de nuevo.', 'Couldn’t upload the photo. Please try again.'));
    } finally {
      setUploadingId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let reordered: typeof categories = [];
    setCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      // Renumber like reorderCategories does on the server (sort_order = index):
      // the other buttons send sort_order back and would restore the old order.
      reordered = arrayMove(prev, oldIndex, newIndex).map((c, i) => ({ ...c, sort_order: i }));
      return reordered;
    });
    startTransition(async () => {
      const result = await reorderCategories(reordered.map((c) => c.id));
      if (result?.error) toastError(t.categories_reorderError);
      else toastSuccess(t.categories_reorderSaved);
    });
  };

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 dash-btn-primary"
        >
          <Plus className="w-4 h-4" /> {t.categories_new}
        </button>
      )}

      {showForm && (
        <div className="mb-5 dash-card p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.categories_namePlaceholder}
            className="dash-input"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {/* Time-based availability (optional) */}
          <div>
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" />
              Disponibilidad por horario (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="dash-input flex-1 text-sm"
                placeholder="Desde"
              />
              <span className="text-gray-400 text-sm shrink-0">–</span>
              <input
                type="time"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="dash-input flex-1 text-sm"
                placeholder="Hasta"
              />
              {(availableFrom || availableTo) && (
                <button
                  type="button"
                  onClick={() => { setAvailableFrom(''); setAvailableTo(''); }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  title="Quitar horario"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Dejar en blanco para mostrar siempre. Ejemplo: Desayunos de 07:00 a 11:00.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={isPending} className="dash-btn-primary">
              {editingId ? t.general_save : t.categories_create}
            </button>
            <button onClick={resetForm} className="dash-btn-secondary">
              {t.general_cancel}
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="dash-empty py-20">
          <Tag className="dash-empty-icon" />
          <p className="dash-empty-title">{t.categories_noCategories}</p>
          <p className="dash-empty-desc">{t.categories_noCategoriesDesc}</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="dash-btn-primary">
              <Plus className="w-4 h-4" /> {t.categories_createFirst}
            </button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="dash-card overflow-hidden divide-y divide-gray-100">
              {categories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  cat={cat}
                  hasMultiLang={hasMultiLang}
                  onToggle={() => handleToggle(cat)}
                  onToggleKitchen={() => handleToggleKitchen(cat)}
                  onCycleDisplay={() => handleCycleDisplay(cat)}
                  onEdit={() => handleEdit(cat)}
                  onDelete={() => handleDelete(cat.id)}
                  onTranslate={() => setTranslatingCat(cat)}
                  onImageUpload={(file) => handleImageUpload(cat.id, file)}
                  uploading={uploadingId === cat.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Translation modal */}
      {translatingCat && (
        <TranslationModal
          category={translatingCat}
          defaultLocale={defaultLocale}
          extraLocales={extraLocales}
          onClose={() => setTranslatingCat(null)}
          onSave={(id, translations) => {
            setCategories((prev) => prev.map((c) => c.id === id ? { ...c, translations } : c));
            setTranslatingCat(null);
          }}
        />
      )}

      <UpgradePromptModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false })}
        reason={upgradeModal.reason}
        suggestedPlan={upgradeModal.suggestedPlan}
      />
    </div>
  );
}

function TranslationModal({
  category, defaultLocale, extraLocales, onClose, onSave,
}: {
  category: Category;
  defaultLocale: string;
  extraLocales: string[];
  onClose: () => void;
  onSave: (id: string, translations: Record<string, ContentTranslation>) => void;
}) {
  const existing = category.translations ?? {};
  const [translations, setTranslations] = useState<Record<string, ContentTranslation>>(() => {
    const init: Record<string, ContentTranslation> = {};
    for (const locale of extraLocales) {
      init[locale] = { name: existing[locale]?.name ?? '' };
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState('');
  const { t, locale } = useDashboardLocale();

  const handleSave = () => {
    setSaveError('');
    startTransition(async () => {
      try {
        const res = await updateCategory(category.id, {
          name: category.name,
          sort_order: category.sort_order,
          is_active: category.is_active,
          translations,
        });
        if (res?.error) throw new Error(res.error);
        onSave(category.id, translations);
      } catch {
        // Keep the modal open with the typed text so nothing is lost.
        setSaveError(locale === 'en' ? 'Couldn’t save the translation. Please try again.' : 'No se pudo guardar la traducción. Probá de nuevo.');
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900">{t.categories_translate}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{category.name}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {extraLocales.map((locale) => {
              const localeInfo = SUPPORTED_LOCALES.find((l) => l.code === locale);
              const flag = getLocaleFlag(locale);
              return (
                <div key={locale}>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                    <span>{flag}</span>
                    {localeInfo?.label ?? locale}
                  </label>
                  <input
                    type="text"
                    value={translations[locale]?.name ?? ''}
                    onChange={(e) => setTranslations((prev) => ({
                      ...prev,
                      [locale]: { ...prev[locale], name: e.target.value },
                    }))}
                    placeholder={category.name}
                    className="dash-input"
                  />
                </div>
              );
            })}
          </div>

          {saveError && <p className="px-5 pb-2 text-sm text-red-600" role="alert">{saveError}</p>}
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
            <button onClick={onClose} className="dash-btn-secondary">{t.general_cancel}</button>
            <button onClick={handleSave} disabled={isPending} className="dash-btn-primary">
              {isPending ? t.editor_saving : t.categories_translationSave}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
