'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct } from '@/lib/actions/restaurant';
import { formatPrice } from '@/lib/utils';
import type { Product, Category } from '@/types';

export function ProductsManager({ initialProducts, categories }: { initialProducts: Product[]; categories: Category[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: categories[0]?.id ?? '' });
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category_id: categories[0]?.id ?? '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { setError('Nombre requerido'); return; }
    if (!form.category_id) { setError('Selecciona una categoría'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio inválido'); return; }

    startTransition(async () => {
      if (editingId) {
        const result = await updateProduct(editingId, {
          name: form.name, description: form.description, price, category_id: form.category_id, is_active: true,
        });
        if (result.error) { setError(result.error); return; }
        setProducts((prev) => prev.map((p) =>
          p.id === editingId ? { ...p, name: form.name, description: form.description, price, category_id: form.category_id } : p
        ));
      } else {
        const result = await createProduct({
          name: form.name, description: form.description, price, category_id: form.category_id, is_active: true,
        });
        if (result.error) { setError(result.error); return; }
        setProducts((prev) => [...prev, {
          id: `temp-${Date.now()}`, restaurant_id: '', category_id: form.category_id,
          name: form.name, description: form.description, price, image_url: '',
          is_active: true, sort_order: prev.length, created_at: new Date().toISOString(),
        }]);
      }
      resetForm();
    });
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: String(p.price), category_id: p.category_id });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    startTransition(async () => {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    });
  };

  const handleToggle = (p: Product) => {
    startTransition(async () => {
      await updateProduct(p.id, { is_active: !p.is_active });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    });
  };

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name ?? '';

  return (
    <div>
      {categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">Primero crea una categoría</p>
          <p className="text-sm mt-1">Necesitas al menos una categoría antes de agregar productos</p>
        </div>
      ) : (
        <>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">
              <Plus className="w-4 h-4" /> Nuevo producto
            </button>
          )}

          {showForm && (
            <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <input
                type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del producto" autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <textarea
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción (opcional)" rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Precio" min="0"
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <select
                  value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {editingId ? 'Guardar' : 'Crear'}
                </button>
                <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">Sin productos</p>
              <p className="text-sm mt-1">Agrega productos a tu menú</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${p.is_active ? '' : 'text-gray-400 line-through'}`}>{p.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{getCategoryName(p.category_id)}</span>
                    </div>
                    <span className="text-sm font-bold text-brand-600">{formatPrice(Number(p.price))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
