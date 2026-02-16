'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { Plus, Trash2, QrCode, Download } from 'lucide-react';
import { createTable, deleteTable } from '@/lib/actions/restaurant';
import type { Table } from '@/types';

export function TablesManager({ initialTables }: { initialTables: Table[] }) {
  const [tables, setTables] = useState(initialTables);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name.trim()) { setError('Nombre requerido'); return; }

    startTransition(async () => {
      const result = await createTable({ name });
      if (result.error) { setError(result.error); return; }
      // Optimistic — will get real data on revalidation
      setTables((prev) => [...prev, {
        id: `temp-${Date.now()}`, restaurant_id: '', name, qr_code_value: '#', is_active: true, created_at: new Date().toISOString(),
      }]);
      setName('');
      setShowForm(false);
      setError('');
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    startTransition(async () => {
      await deleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    });
  };

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> Nueva mesa
        </button>
      )}

      {showForm && (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mesa 1, Barra 1, Terraza A" autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              Crear
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <QrCode className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin mesas</p>
          <p className="text-sm mt-1">Crea mesas para generar códigos QR</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map((table) => (
            <QRTableCard key={table.id} table={table} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function QRTableCard({ table, onDelete }: { table: Table; onDelete: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || table.qr_code_value === '#') return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, table.qr_code_value, { width: 160, margin: 2 }, () => {
        setQrReady(true);
      });
    });
  }, [table.qr_code_value]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qr-${table.name}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <h3 className="font-semibold text-sm mb-3">{table.name}</h3>
      <div className="flex justify-center mb-3">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>
      <p className="text-xs text-gray-400 mb-3 truncate">{table.qr_code_value}</p>
      <div className="flex gap-2 justify-center">
        {qrReady && (
          <button onClick={downloadQR} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
            <Download className="w-3.5 h-3.5" /> Descargar
          </button>
        )}
        <button onClick={() => onDelete(table.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
      </div>
    </div>
  );
}
