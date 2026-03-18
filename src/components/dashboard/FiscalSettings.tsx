'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';

interface FiscalData {
  fiscal_rfc?: string | null;
  fiscal_razon_social?: string | null;
  fiscal_regimen_fiscal?: string | null;
  fiscal_lugar_expedicion?: string | null;
}

interface FiscalSettingsProps {
  restaurantId: string;
  initialData: FiscalData;
}

const REGIMEN_OPTIONS = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
  { value: '626', label: '626 — Simplificado de Confianza (RESICO)' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '608', label: '608 — Demás ingresos' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
];

export function FiscalSettings({ restaurantId, initialData }: FiscalSettingsProps) {
  const [form, setForm] = useState({
    fiscal_rfc: initialData.fiscal_rfc ?? '',
    fiscal_razon_social: initialData.fiscal_razon_social ?? '',
    fiscal_regimen_fiscal: initialData.fiscal_regimen_fiscal ?? '601',
    fiscal_lugar_expedicion: initialData.fiscal_lugar_expedicion ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/tenant/restaurant', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fiscal_rfc: form.fiscal_rfc.trim().toUpperCase() || null,
            fiscal_razon_social: form.fiscal_razon_social.trim() || null,
            fiscal_regimen_fiscal: form.fiscal_regimen_fiscal || null,
            fiscal_lugar_expedicion: form.fiscal_lugar_expedicion.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? 'Error al guardar');
          return;
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } catch {
        setError('Error de conexión');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Datos fiscales (CFDI)</h2>
        <p className="text-xs text-gray-500">
          Configura los datos de tu empresa para emitir facturas CFDI 4.0 a tus clientes.
          Requiere cuenta en{' '}
          <a href="https://facturama.mx" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
            facturama.mx
          </a>
          {' '}y las variables de entorno <code className="text-xs bg-gray-100 px-1 rounded">FACTURAMA_USER</code> / <code className="text-xs bg-gray-100 px-1 rounded">FACTURAMA_PASSWORD</code>.
        </p>
      </div>

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">RFC emisor</label>
          <input
            value={form.fiscal_rfc}
            onChange={e => setForm(f => ({ ...f, fiscal_rfc: e.target.value.toUpperCase() }))}
            placeholder="XAXX010101000"
            maxLength={13}
            className="dash-input uppercase"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Razón social</label>
          <input
            value={form.fiscal_razon_social}
            onChange={e => setForm(f => ({ ...f, fiscal_razon_social: e.target.value }))}
            placeholder="Nombre o razón social del emisor"
            className="dash-input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Régimen fiscal</label>
          <select
            value={form.fiscal_regimen_fiscal}
            onChange={e => setForm(f => ({ ...f, fiscal_regimen_fiscal: e.target.value }))}
            className="dash-input bg-white"
          >
            {REGIMEN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Código postal del lugar de expedición</label>
          <input
            value={form.fiscal_lugar_expedicion}
            onChange={e => setForm(f => ({ ...f, fiscal_lugar_expedicion: e.target.value }))}
            placeholder="06600"
            maxLength={5}
            inputMode="numeric"
            className="dash-input"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className={cn(
          'px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-900 text-white hover:bg-gray-800',
          isPending && 'opacity-60 cursor-not-allowed'
        )}
      >
        {saved ? '✓ Guardado' : isPending ? 'Guardando…' : 'Guardar datos fiscales'}
      </button>
    </div>
  );
}
