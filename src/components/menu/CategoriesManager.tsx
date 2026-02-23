'use client';

import { useState, useTransition, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Tag, GripVertical, Languages, X, Camera, ImageIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { SUPPORTED_LOCALES, getLocaleFlag } from '@/lib/i18n';
import type { Category } from '@/types';
import type { ContentTranslation } from '@/lib/i18n';

interface CategoriesManagerProps {
  initialCategories: Category[];
  defaultLocale: string;
  availableLocales: string[];
}

function SortableCategoryRow({
  cat,
  hasMultiLang,
  onToggle,
  onEdit,
  onDelete,
  onTranslate,
  onImageUpload,
}: {
  cat: Category;
  hasMultiLang: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTranslate: () => void;
  onImageUpload: (file: File) => void;
}) {
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
        'flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors group',
        isDragging && 'bg-white shadow-lg rounded-lg border border-gray-200'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="p-1 -ml-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
        {cat.image_url ? (
          <button onClick={() => imgRef.current?.click()} className="relative w-7 h-7 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 group/img" title="Cambiar imagen">
            <Image src={cat.image_url} alt="" fill sizes="28px" className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 flex items-center justify-center transition-colors">
              <Camera className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
            </div>
          </button>
        ) : (
          <button onClick={() => imgRef.current?.click()} className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0" title="Agregar imagen">
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        )}
        <span className={cn('text-sm font-medium', cat.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>
          {cat.name}
        </span>
        {!cat.is_active && (
          <span className="dash-badge dash-badge-inactive text-[10px]">Inactiva</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasMultiLang && (
          <button onClick={onTranslate} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title="Traducir">
            <Languages className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title={cat.is_active ? 'Ocultar' : 'Mostrar'}>
          {cat.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title="Editar">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar">
          <Trash2 className="w-3.5 h-3.5" />
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
  const [error, setError] = useState('');
  const [translatingCat, setTranslatingCat] = useState<Category | null>(null);
  const [isPending, startTransition] = useTransition();

  const extraLocales = availableLocales.filter((l) => l !== defaultLocale);
  const hasMultiLang = extraLocales.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => {
    setName('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Nombre requerido');
      return;
    }

    startTransition(async () => {
      if (editingId) {
        const result = await updateCategory(editingId, { name, sort_order: 0, is_active: true });
        if (result.error) { setError(result.error); return; }
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, name } : c));
      } else {
        const result = await createCategory({ name, sort_order: categories.length, is_active: true });
        if (result.error) { setError(result.error); return; }
        setCategories((prev) => [...prev, { id: `temp-${Date.now()}`, restaurant_id: '', name, sort_order: prev.length, is_active: true, created_at: new Date().toISOString() }]);
      }
      resetForm();
    });
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Los productos en ella también se eliminarán.')) return;
    startTransition(async () => {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    });
  };

  const handleToggle = (cat: Category) => {
    startTransition(async () => {
      await updateCategory(cat.id, { name: cat.name, sort_order: cat.sort_order, is_active: !cat.is_active });
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
    });
  };

  const handleImageUpload = async (catId: string, file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) return;
      const cat = categories.find((c) => c.id === catId);
      if (!cat) return;
      await updateCategory(catId, { name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active, image_url: data.url });
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, image_url: data.url } : c));
    } catch { /* ignore */ }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      startTransition(async () => {
        await reorderCategories(reordered.map((c) => c.id));
      });
      return reordered;
    });
  };

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 dash-btn-primary"
        >
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      )}

      {showForm && (
        <div className="mb-5 dash-card p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="dash-input"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={isPending} className="dash-btn-primary">
              {editingId ? 'Guardar' : 'Crear'}
            </button>
            <button onClick={resetForm} className="dash-btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="dash-empty py-20">
          <Tag className="dash-empty-icon" />
          <p className="dash-empty-title">Organiza tu menú con categorías</p>
          <p className="dash-empty-desc">Crea categorías como "Entradas", "Platos fuertes", "Bebidas" para organizar tus productos.</p>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="dash-btn-primary">
              <Plus className="w-4 h-4" /> Crear primera categoría
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
                  onEdit={() => handleEdit(cat)}
                  onDelete={() => handleDelete(cat.id)}
                  onTranslate={() => setTranslatingCat(cat)}
                  onImageUpload={(file) => handleImageUpload(cat.id, file)}
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

  const handleSave = () => {
    startTransition(async () => {
      await updateCategory(category.id, {
        name: category.name,
        sort_order: category.sort_order,
        is_active: category.is_active,
        translations,
      });
      onSave(category.id, translations);
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900">Traducir categoría</h2>
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
                    {localeInfo?.name ?? locale}
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

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
            <button onClick={onClose} className="dash-btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={isPending} className="dash-btn-primary">
              {isPending ? 'Guardando...' : 'Guardar traducciones'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
