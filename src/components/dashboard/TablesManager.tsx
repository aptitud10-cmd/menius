'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, QrCode, Download, Share2, Copy, Check, ExternalLink, Printer, Globe, Pencil, X, Users } from 'lucide-react';
import { createTable, updateTable, updateTableMeta, deleteTable } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { Table, TableStatus } from '@/types';

const TABLE_STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: 'Disponible', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
  occupied: { label: 'Ocupada', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
  reserved: { label: 'Reservada', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' },
};

interface TablesManagerProps {
  initialTables: Table[];
  restaurantSlug?: string;
  restaurantName?: string;
}

export function TablesManager({ initialTables, restaurantSlug, restaurantName }: TablesManagerProps) {
  const [tables, setTables] = useState(initialTables);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { t } = useDashboardLocale();

  const getNextTableName = () => {
    const numbers = tables
      .map((t) => {
        const match = t.name.match(/^Mesa\s+(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : tables.length + 1;
    return `Mesa ${next}`;
  };

  const handleShowForm = () => {
    setName(getNextTableName());
    setShowForm(true);
    setError('');
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError(t.tables_nameRequired); return; }

    startTransition(async () => {
      const result = await createTable({ name: name.trim() });
      if (result.error) { setError(result.error); return; }
      setName('');
      setShowForm(false);
      setError('');
      window.location.reload();
    });
  };

  const handleEdit = (id: string, newName: string) => {
    startTransition(async () => {
      const result = await updateTable(id, newName);
      if (result.error) return;
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
    });
  };

  const handleStatusChange = (id: string, status: TableStatus) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    startTransition(async () => {
      await updateTableMeta(id, { status });
    });
  };

  const handleCapacityChange = (id: string, capacity: number) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, capacity } : t));
    startTransition(async () => {
      await updateTableMeta(id, { capacity });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t.tables_deleteConfirm)) return;
    startTransition(async () => {
      await deleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    });
  };

  return (
    <div>
      {!showForm && (
        <button onClick={handleShowForm} className="mb-6 dash-btn-primary">
          <Plus className="w-4 h-4" /> {t.tables_newTable}
        </button>
      )}

      {showForm && (
        <div className="mb-6 dash-card p-5 space-y-4">
          <h3 className="font-semibold text-sm text-gray-900">{t.tables_createNewTable}</h3>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t.tables_placeholder} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="dash-input"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={isPending} className="dash-btn-primary">
              {t.tables_createTable}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="dash-btn-secondary">
              {t.general_cancel}
            </button>
          </div>
        </div>
      )}

      {/* General QR — Pickup & Delivery */}
      {restaurantSlug && (
        <GeneralQRCard slug={restaurantSlug} name={restaurantName || 'Mi Restaurante'} />
      )}

      {/* Table-specific QRs */}
      <div className="flex items-center justify-between gap-3 mb-4 mt-8">
        <div className="flex items-center gap-3">
          <QrCode className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.tables_qrPerTable}</h2>
        </div>
        {tables.length > 1 && (
          <button
            onClick={() => handlePrintAll(tables, restaurantName ?? '')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            {t.tables_printAll}
          </button>
        )}
      </div>

      {tables.length === 0 ? (
        <div className="dash-empty py-16">
          <QrCode className="dash-empty-icon" />
          <p className="dash-empty-title">{t.tables_noTables}</p>
          <p className="dash-empty-desc">{t.tables_noTablesDesc}</p>
          {!showForm && (
            <button onClick={handleShowForm} className="dash-btn-primary">
              <Plus className="w-4 h-4" /> {t.tables_createFirst}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <QRTableCard
              key={table.id}
              table={table}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onCapacityChange={handleCapacityChange}
              restaurantName={restaurantName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Print helpers ────────────────────────────────────────────────────────────

function buildPrintHtml(cards: Array<{ dataUrl: string; tableName: string; url: string }>, restaurantName: string) {
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const scanLabel = isEn ? 'Scan to order' : 'Escanea para ordenar';
  const items = cards.map(({ dataUrl, tableName }) => `
    <div class="card">
      <p class="restaurant">${restaurantName}</p>
      <img src="${dataUrl}" alt="${tableName}" />
      <p class="table-name">${tableName}</p>
      <p class="scan-label">${scanLabel}</p>
    </div>
  `).join('');
  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'es'}">
<head>
  <meta charset="utf-8" />
  <title>QR — ${restaurantName}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111827; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    .header { text-align: center; padding-bottom: 8mm; border-bottom: 1px solid #e5e7eb; margin-bottom: 6mm; }
    .header h1 { font-size: 16pt; font-weight: 700; }
    .header p { font-size: 9pt; color: #6b7280; margin-top: 2mm; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; }
    .card { border: 1.5px solid #e5e7eb; border-radius: 6mm; padding: 5mm 4mm 4mm; text-align: center; page-break-inside: avoid; }
    .restaurant { font-size: 7pt; font-weight: 600; color: #10b981; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2mm; }
    .card img { width: 100%; max-width: 58mm; height: auto; }
    .table-name { font-size: 16pt; font-weight: 900; color: #111827; margin-top: 3mm; letter-spacing: -0.01em; }
    .scan-label { font-size: 7.5pt; color: #9ca3af; margin-top: 1.5mm; }
    .footer { text-align: center; margin-top: 6mm; font-size: 7pt; color: #d1d5db; border-top: 1px solid #f3f4f6; padding-top: 3mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${restaurantName}</h1>
    <p>${scanLabel}</p>
  </div>
  <div class="grid">${items}</div>
  <div class="footer">menius.app</div>
</body>
</html>`;
}

async function handlePrintAll(tables: Table[], restaurantName: string) {
  const { generateBrandedCard } = await import('@/lib/styled-qr');
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const scanLabel = isEn ? 'Scan to order' : 'Escanea para ordenar';

  const cards = await Promise.all(
    tables.map(async (table) => {
      const canvas = await generateBrandedCard(
        table.qr_code_value ?? '#',
        table.name,
        restaurantName,
        scanLabel,
      );
      return { dataUrl: canvas.toDataURL('image/png'), tableName: table.name, url: table.qr_code_value ?? '' };
    }),
  );

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(buildPrintHtml(cards, restaurantName));
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

function QRTableCard({ table, onDelete, onEdit, onStatusChange, onCapacityChange, restaurantName }: {
  table: Table;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string) => void;
  onStatusChange: (id: string, status: TableStatus) => void;
  onCapacityChange: (id: string, capacity: number) => void;
  restaurantName?: string;
}) {
  const { t } = useDashboardLocale();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const brandedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);

  useEffect(() => {
    if (!qrContainerRef.current || table.qr_code_value === '#') return;
    import('@/lib/styled-qr').then(async ({ renderStyledQR, generateBrandedCard }) => {
      await renderStyledQR(qrContainerRef.current!, { data: table.qr_code_value, size: 200 });
      const card = await generateBrandedCard(
        table.qr_code_value,
        table.name,
        restaurantName ?? '',
        t.tables_scanToView
      );
      brandedCanvasRef.current = card;
      setQrReady(true);
    });
  }, [table.qr_code_value, table.name, restaurantName, t.tables_scanToView]);

  const downloadBrandedQR = () => {
    if (!brandedCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `menius-qr-${table.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = brandedCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const copyLink = async () => {
    if (table.qr_code_value === '#') return;
    try {
      await navigator.clipboard.writeText(table.qr_code_value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable or permission denied */ }
  };

  const shareLink = async () => {
    if (table.qr_code_value === '#') return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Menú - ${table.name}`,
          text: `Escanea o visita el enlace para ver el menú`,
          url: table.qr_code_value,
        });
      } catch { /* user cancelled or share unsupported */ }
    } else {
      copyLink();
    }
  };

  const printQR = () => {
    if (!brandedCanvasRef.current) return;
    const dataUrl = brandedCanvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildPrintHtml(
      [{ dataUrl, tableName: table.name, url: table.qr_code_value ?? '' }],
      restaurantName ?? '',
    ));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all overflow-hidden group">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim()) { onEdit(table.id, editName.trim()); setEditing(false); }
                if (e.key === 'Escape') { setEditName(table.name); setEditing(false); }
              }}
              autoFocus
              className="flex-1 px-2 py-1 rounded-lg bg-white/20 text-white text-sm font-bold placeholder-white/50 outline-none"
            />
            <button
              onClick={() => { if (editName.trim()) { onEdit(table.id, editName.trim()); setEditing(false); } }}
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={() => { setEditName(table.name); setEditing(false); }}
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">{table.name}</h3>
              {table.capacity && (
                <span className="text-[10px] text-white/70 font-medium flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> {table.capacity}
                </span>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3 h-3 text-white/70" />
              </button>
            </div>
            <StatusBadge status={table.status ?? 'available'} onSelect={(s) => onStatusChange(table.id, s)} />
          </>
        )}
      </div>

      {/* QR */}
      <div className="p-5 flex flex-col items-center">
        <div ref={qrContainerRef} className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center justify-center min-h-[200px] min-w-[200px]" />
        <p className="text-xs text-gray-500 text-center truncate max-w-[200px] mb-4">{table.qr_code_value}</p>

        {/* Actions */}
        {qrReady && (
          <div className="w-full space-y-2">
            <button
              onClick={downloadBrandedQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t.tables_downloadQR}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={printQR}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                {t.tables_print}
              </button>
              <button
                onClick={shareLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                {t.tables_share}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t.tables_copiedLink : t.tables_copy}
              </button>
            </div>

            <button
              onClick={() => window.open(table.qr_code_value, '_blank')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t.tables_viewLink}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="number"
            min={1}
            max={50}
            value={table.capacity ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v > 0) onCapacityChange(table.id, v);
            }}
            placeholder="Cap."
            className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <button
          onClick={() => onDelete(table.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title={t.tables_deleteTable}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, onSelect }: { status: TableStatus; onSelect: (s: TableStatus) => void }) {
  const { t } = useDashboardLocale();
  const [open, setOpen] = useState(false);
  const config = TABLE_STATUS_CONFIG[status];
  const statuses: TableStatus[] = ['available', 'occupied', 'reserved'];
  const statusLabels: Record<TableStatus, string> = { available: t.tables_available, occupied: t.tables_occupied, reserved: t.tables_reserved };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
        <span className="text-[10px] text-white font-medium">{statusLabels[status]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
            {statuses.map((s) => {
              const c = TABLE_STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors',
                    s === status ? 'bg-gray-50' : ''
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                  <span className={c.color}>{statusLabels[s]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── General QR Card (Pickup / Delivery / Sharing) ─── */

function GeneralQRCard({ slug, name }: { slug: string; name: string }) {
  const { t } = useDashboardLocale();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const brandedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  const menuUrl = `${appUrl}/${slug}`;

  useEffect(() => {
    if (!qrContainerRef.current || !menuUrl) return;
    import('@/lib/styled-qr').then(async ({ renderStyledQR, generateBrandedCard }) => {
      await renderStyledQR(qrContainerRef.current!, { data: menuUrl, size: 220 });
      const card = await generateBrandedCard(menuUrl, name, name, t.tables_orderFromPhone);
      brandedCanvasRef.current = card;
      setQrReady(true);
    });
  }, [menuUrl, name, t.tables_orderFromPhone]);

  const downloadQR = () => {
    if (!brandedCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `menius-qr-${slug}.png`;
    link.href = brandedCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable or permission denied */ }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Menú de ${name}`,
          text: `¡Mira nuestro menú digital! Pide y paga desde tu celular.`,
          url: menuUrl,
        });
      } catch { /* user cancelled or share unsupported */ }
    } else {
      copyLink();
    }
  };

  const printQR = () => {
    if (!brandedCanvasRef.current) return;
    const dataUrl = brandedCanvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildPrintHtml(
      [{ dataUrl, tableName: name, url: menuUrl }],
      name,
    ));
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Globe className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">{t.tables_generalQR}</h3>
            <p className="text-xs text-gray-500">{t.tables_generalQRDesc}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* QR */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div ref={qrContainerRef} className="bg-white rounded-xl p-3 mb-2 flex items-center justify-center min-h-[220px] min-w-[220px]" />
            <p className="text-[11px] text-gray-400 text-center truncate max-w-[220px]">{menuUrl}</p>
          </div>

          {/* Actions */}
          {qrReady && (
            <div className="flex-1 w-full space-y-2.5">
              <button
                onClick={downloadQR}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t.tables_downloadQR}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={printQR}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t.tables_print}
                </button>
                <button
                  onClick={shareNative}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t.tables_share}
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t.tables_copiedLink : t.tables_copy}
                </button>
              </div>

              <button
                onClick={() => window.open(menuUrl, '_blank')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 text-xs font-medium hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t.tables_openMenu}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
