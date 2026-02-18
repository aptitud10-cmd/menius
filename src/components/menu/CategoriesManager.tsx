'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/restaurant';
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
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-4 bg-[#0a0a0a] rounded-xl border border-white/[0.08] p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
            >
              {editingId ? 'Guardar' : 'Crear'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.08]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Sin categorías</p>
          <p className="text-sm mt-1">Crea tu primera categoría para organizar tu menú</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-xl border border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${cat.is_active ? 'text-white' : 'text-gray-400 line-through'}`}>
                  {cat.name}
                </span>
                {!cat.is_active && (
                  <span className="text-xs bg-white/[0.06] text-gray-500 px-2 py-0.5 rounded">Inactiva</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggle(cat)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
                  {cat.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg hover:bg-red-500/[0.08] text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
