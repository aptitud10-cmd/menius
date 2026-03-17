'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { PrinterConfig, type PrinterConfigData } from '@/lib/printing/PrinterConfig';

interface PrinterSettingsSectionProps {
  locale?: string;
}

export function PrinterSettingsSection({ locale }: PrinterSettingsSectionProps) {
  const en = locale === 'en';
  const [cfg, setCfg] = useState<PrinterConfigData>(() => PrinterConfig.config);

  useEffect(() => PrinterConfig.subscribe(setCfg), []);

  const toggle = (key: keyof PrinterConfigData) => {
    PrinterConfig.update({ [key]: !cfg[key] });
  };

  const toggle_ = (key: keyof PrinterConfigData, label: string) => (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={cfg[key] as boolean}
        onClick={() => toggle(key)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
          cfg[key] ? 'bg-emerald-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            cfg[key] ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Printer className="w-5 h-5 text-gray-600" />
        <h2 className="text-base font-bold text-gray-900">
          {en ? 'Printer Settings (this device)' : 'Configuración de impresoras (este dispositivo)'}
        </h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {en
          ? 'These settings are saved per device. Each tablet or PC can configure its own printers independently.'
          : 'Esta configuración se guarda por dispositivo. Cada tablet o PC puede configurar sus propias impresoras de forma independiente.'}
      </p>
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-1">
        {toggle_('receiptEnabled', en ? 'Customer receipt (full ticket with prices)' : 'Recibo del cliente (ticket completo con precios)')}
        {toggle_('kitchenEnabled', en ? 'Kitchen ticket (items only, no prices)' : 'Ticket de cocina (solo artículos, sin precios)')}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {en
          ? 'If both are enabled, two print dialogs will open when you accept an order.'
          : 'Si ambas están activadas, se abrirán dos diálogos de impresión al aceptar una orden.'}
      </p>
    </div>
  );
}
