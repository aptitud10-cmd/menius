'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Tag } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

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
        // Refresh will happen via revalidation, optimistic add:
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
        <div className="dash-card overflow-hidden divide-y divide-gray-100">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <Tag className={cn('w-4 h-4', cat.is_active ? 'text-gray-400' : 'text-gray-300')} />
                <span className={cn('text-sm font-medium', cat.is_active ? 'text-gray-900' : 'text-gray-500 line-through')}>
                  {cat.name}
                </span>
                {!cat.is_active && (
                  <span className="dash-badge dash-badge-inactive text-[10px]">Inactiva</span>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleToggle(cat)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title={cat.is_active ? 'Ocultar' : 'Mostrar'}>
                  {cat.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400" title="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
