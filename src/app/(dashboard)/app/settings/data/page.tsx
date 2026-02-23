'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2, AlertTriangle, Shield, FileJson } from 'lucide-react';

export default function DataPrivacyPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menius-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo exportar los datos. Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmation !== 'ELIMINAR') {
      setDeleteError('Escribe exactamente ELIMINAR para confirmar.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar cuenta.');
        setDeleting(false);
        return;
      }
      router.push('/login?deleted=1');
    } catch {
      setDeleteError('Error de red. Intenta de nuevo.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="dash-heading mb-1">Datos y Privacidad</h1>
        <p className="text-sm text-gray-500">
          Gestiona tus datos personales y los de tu restaurante de acuerdo al GDPR y leyes de privacidad.
        </p>
      </div>

      {/* Export Section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Exportar mis datos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Descarga una copia completa de todos tus datos: restaurante, menú, órdenes, clientes y configuración.
            </p>
          </div>
        </div>
        <ul className="space-y-1 text-xs text-gray-500 ml-13 pl-1">
          {['Información del restaurante', 'Menú completo (categorías, productos)', 'Historial de órdenes', 'Base de clientes', 'Datos de suscripción'].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <FileJson className="w-4 h-4" />
          {exporting ? 'Preparando exportación...' : 'Descargar mis datos (JSON)'}
        </button>
      </div>

      {/* Delete Section */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Eliminar cuenta</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Elimina permanentemente tu cuenta, restaurante, menú, clientes e historial de órdenes. Esta acción es <strong>irreversible</strong>.
            </p>
          </div>
        </div>

        {!showDeleteModal ? (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar mi cuenta
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
            <p className="text-sm text-red-700 font-medium">
              Para confirmar, escribe <span className="font-mono font-bold">ELIMINAR</span> en el campo de abajo:
            </p>
            <input
              type="text"
              value={confirmation}
              onChange={e => { setConfirmation(e.target.value); setDeleteError(''); }}
              placeholder="ELIMINAR"
              className="w-full bg-white border border-red-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 font-mono"
            />
            {deleteError && (
              <p className="text-xs text-red-600">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting || confirmation !== 'ELIMINAR'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setConfirmation(''); setDeleteError(''); }}
                className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Tienes derechos sobre tus datos según el GDPR (Reglamento General de Protección de Datos). Para más información consulta nuestra{' '}
        <a href="/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>.
      </p>
    </div>
  );
}
