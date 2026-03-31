'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Loader2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { useToast } from '@/components/dashboard/DashToast';

interface KDSStation {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Props {
  initialStations: KDSStation[];
  restaurantId: string;
}

const PRESET_COLORS = [
  '#06c167', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export function KDSStationsSettings({ initialStations, restaurantId }: Props) {
  const { locale } = useDashboardLocale();
  const isEn = locale === 'en';
  const { success: toastSuccess, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const [stations, setStations] = useState<KDSStation[]>(initialStations);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#06c167');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      setAdding(true);
      try {
        const res = await fetch('/api/tenant/kds-stations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim(), color: newColor, position: stations.length }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          toastError(data.error ?? (isEn ? 'Error creating station' : 'Error al crear estación'));
          return;
        }
        setStations(prev => [...prev, data.station]);
        setNewName('');
        setNewColor('#06c167');
        toastSuccess(isEn ? 'Station created' : 'Estación creada');
      } catch {
        toastError(isEn ? 'Unexpected error' : 'Error inesperado');
      } finally {
        setAdding(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(isEn ? 'Delete this station? Products assigned to it will be unassigned.' : '¿Eliminar esta estación? Los productos asignados quedarán sin estación.')) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tenant/kds-stations?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || data.error) {
          toastError(data.error ?? (isEn ? 'Error deleting station' : 'Error al eliminar'));
          return;
        }
        setStations(prev => prev.filter(s => s.id !== id));
        toastSuccess(isEn ? 'Station deleted' : 'Estación eliminada');
      } catch {
        toastError(isEn ? 'Unexpected error' : 'Error inesperado');
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleMove = async (id: string, dir: 'up' | 'down') => {
    const idx = stations.findIndex(s => s.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === stations.length - 1) return;
    const newArr = [...stations];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
    const reordered = newArr.map((s, i) => ({ ...s, position: i }));
    setStations(reordered);
    await fetch('/api/tenant/kds-stations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reorder: reordered.map(s => ({ id: s.id, position: s.position })) }),
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🍳</span>
        <h2 className="text-sm font-semibold text-gray-900">
          {isEn ? 'KDS Stations' : 'Estaciones KDS'}
        </h2>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        {isEn
          ? 'Define kitchen stations (e.g. Grill, Bar, Salads). Assign products to stations so KDS can filter by station.'
          : 'Define estaciones de cocina (ej. Parrilla, Barra, Ensaladas). Asigna productos a estaciones para filtrar en el KDS.'}
      </p>

      {/* Station list */}
      {stations.length === 0 ? (
        <p className="text-sm text-gray-400 mb-5 italic">
          {isEn ? 'No stations yet. Add one below.' : 'Sin estaciones. Agrega una abajo.'}
        </p>
      ) : (
        <div className="space-y-2 mb-5">
          {stations.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.name}</span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => handleMove(s.id, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => handleMove(s.id, 'down')} disabled={idx === stations.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id || isPending}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new station */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-600 mb-3">
          {isEn ? 'Add station' : 'Agregar estación'}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={isEn ? 'e.g. Grill, Bar, Salads…' : 'Ej: Parrilla, Barra, Ensaladas…'}
            className="dash-input flex-1"
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn('w-6 h-6 rounded-full border-2 transition-all', newColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding || isPending}
            className="dash-btn-primary flex-shrink-0"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{isEn ? 'Add' : 'Agregar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
