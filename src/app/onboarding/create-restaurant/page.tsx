'use client';

import { useState } from 'react';
import { createRestaurant } from '@/lib/actions/restaurant';
import { createRestaurantSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';

export default function CreateRestaurantPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = createRestaurantSchema.safeParse({
      name,
      slug,
      timezone: 'America/Mexico_City',
      currency: 'MXN',
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await createRestaurant(parsed.data);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            <span className="text-brand-600">MEN</span>IUS
          </span>
          <h1 className="text-xl font-bold mt-4">Crea tu restaurante</h1>
          <p className="text-gray-500 text-sm mt-1">Configura tu espacio para empezar a recibir pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del restaurante</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              placeholder="Mi Restaurante"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del menú</label>
            <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500">
              <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-400 border-r border-gray-200">
                menius.app/r/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                placeholder="mi-restaurante"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear restaurante'}
          </button>
        </form>
      </div>
    </div>
  );
}
