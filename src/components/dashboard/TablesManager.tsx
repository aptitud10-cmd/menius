'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, QrCode, Download, Share2, Copy, Check, ExternalLink, Printer, Globe, MessageCircle, Pencil, X } from 'lucide-react';
import { createTable, updateTable, deleteTable } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';

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
    if (!name.trim()) { setError('Nombre requerido'); return; }

    startTransition(async () => {
      const result = await createTable({ name: name.trim() });
      if (result.error) { setError(result.error); return; }
      setTables((prev) => [...prev, {
        id: `temp-${Date.now()}`, restaurant_id: '', name: name.trim(), qr_code_value: '#', is_active: true, created_at: new Date().toISOString(),
      }]);
      setName('');
      setShowForm(false);
      setError('');
    });
  };

  const handleEdit = (id: string, newName: string) => {
    startTransition(async () => {
      const result = await updateTable(id, newName);
      if (result.error) return;
      setTables((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
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
          onClick={handleShowForm}
          className="mb-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nueva mesa
        </button>
      )}

      {showForm && (
        <div className="mb-6 bg-[#0a0a0a] rounded-2xl border border-white/[0.08] p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white">Crear nueva mesa</h3>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mesa 1, Barra 1, Terraza A" autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-3 rounded-xl border border-white/[0.08] text-sm bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={isPending} className="px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
              Crear mesa
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.08] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* General QR — Pickup & Delivery */}
      {restaurantSlug && (
        <GeneralQRCard slug={restaurantSlug} name={restaurantName || 'Mi Restaurante'} />
      )}

      {/* Table-specific QRs */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <QrCode className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">QR por mesa (Dine-in)</h2>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <QrCode className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-gray-400">Sin mesas</p>
          <p className="text-sm mt-1.5">Crea mesas para generar códigos QR personalizados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <QRTableCard key={table.id} table={table} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function QRTableCard({ table, onDelete, onEdit }: { table: Table; onDelete: (id: string) => void; onEdit: (id: string, name: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);

  useEffect(() => {
    if (!canvasRef.current || table.qr_code_value === '#') return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, table.qr_code_value, {
        width: 200,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }, () => {
        setQrReady(true);
        generateBrandedQR();
      });
    });
  }, [table.qr_code_value]);

  const generateBrandedQR = useCallback(() => {
    if (!canvasRef.current || !brandedCanvasRef.current) return;

    const qrCanvas = canvasRef.current;
    const canvas = brandedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const headerHeight = 60;
    const footerHeight = 50;
    const qrSize = qrCanvas.width;
    const totalWidth = qrSize + padding * 2;
    const totalHeight = headerHeight + qrSize + footerHeight + padding;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, totalWidth, totalHeight, 20);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, totalWidth, 0);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(1, '#6d28d9');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, totalWidth, headerHeight + 10, [20, 20, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(table.name, totalWidth / 2, headerHeight / 2 + 6);

    ctx.drawImage(qrCanvas, padding, headerHeight + 10, qrSize, qrSize);

    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const footerY = headerHeight + qrSize + 20;
    ctx.fillText('MENIUS', totalWidth / 2, footerY + 18);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillText('Escanea para ver el menú', totalWidth / 2, footerY + 36);
  }, [table.name]);

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
    } catch {}
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
      } catch {}
    } else {
      copyLink();
    }
  };

  const printQR = () => {
    if (!brandedCanvasRef.current) return;
    const dataUrl = brandedCanvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>QR - ${table.name}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff;">
          <img src="${dataUrl}" style="max-width:400px;width:100%;" />
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all overflow-hidden group">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between">
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
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3 h-3 text-white/70" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/80 font-medium">Activo</span>
            </div>
          </>
        )}
      </div>

      {/* QR */}
      <div className="p-5 flex flex-col items-center">
        <div className="bg-white/[0.04] rounded-xl p-3 mb-3">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>
        <canvas ref={brandedCanvasRef} className="hidden" />
        <p className="text-xs text-gray-500 text-center truncate max-w-[200px] mb-4">{table.qr_code_value}</p>

        {/* Actions */}
        {qrReady && (
          <div className="w-full space-y-2">
            <button
              onClick={downloadBrandedQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={printQR}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
              <button
                onClick={shareLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Compartir
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <button
              onClick={() => window.open(table.qr_code_value, '_blank')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-gray-400 text-xs font-medium hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver enlace
            </button>
          </div>
        )}
      </div>

      {/* Footer - Delete */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <button
          onClick={() => onDelete(table.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-red-400 text-xs font-medium hover:bg-red-500/[0.08] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar mesa
        </button>
      </div>
    </div>
  );
}

/* ─── General QR Card (Pickup / Delivery / Sharing) ─── */

function GeneralQRCard({ slug, name }: { slug: string; name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const menuUrl = `${appUrl}/r/${slug}`;

  useEffect(() => {
    if (!canvasRef.current || !menuUrl) return;
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, menuUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }, () => {
        setQrReady(true);
        generateBrandedQR();
      });
    });
  }, [menuUrl]);

  const generateBrandedQR = useCallback(() => {
    if (!canvasRef.current || !brandedCanvasRef.current) return;

    const qrCanvas = canvasRef.current;
    const canvas = brandedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const headerHeight = 70;
    const footerHeight = 55;
    const qrSize = qrCanvas.width;
    const totalWidth = qrSize + padding * 2;
    const totalHeight = headerHeight + qrSize + footerHeight + padding;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, 0, totalWidth, totalHeight, 20);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, totalWidth, 0);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(1, '#6d28d9');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, totalWidth, headerHeight + 10, [20, 20, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, totalWidth / 2, headerHeight / 2);
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Escanea para ver el menú', totalWidth / 2, headerHeight / 2 + 18);

    ctx.drawImage(qrCanvas, padding, headerHeight + 10, qrSize, qrSize);

    ctx.fillStyle = '#7c3aed';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    const footerY = headerHeight + qrSize + 20;
    ctx.fillText('MENIUS', totalWidth / 2, footerY + 18);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillText('Pide y paga desde tu celular', totalWidth / 2, footerY + 36);
  }, [name]);

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
    } catch {}
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Menú de ${name}`,
          text: `¡Mira nuestro menú digital! Pide y paga desde tu celular.`,
          url: menuUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`¡Mira el menú de ${name}! Pide directo desde tu celular:\n${menuUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const printQR = () => {
    if (!brandedCanvasRef.current) return;
    const dataUrl = brandedCanvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>QR — ${name}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fff;">
          <img src="${dataUrl}" style="max-width:400px;width:100%;" />
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-purple-500/[0.12] flex items-center justify-center">
            <Globe className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">QR General — Pickup & Delivery</h3>
            <p className="text-xs text-gray-500">Comparte este QR en redes sociales, stickers, tarjetas, flyers</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* QR */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="bg-white rounded-xl p-3 mb-2">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
            <canvas ref={brandedCanvasRef} className="hidden" />
            <p className="text-[11px] text-gray-600 text-center truncate max-w-[220px]">{menuUrl}</p>
          </div>

          {/* Actions */}
          {qrReady && (
            <div className="flex-1 w-full space-y-2.5">
              <button
                onClick={downloadQR}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar QR
              </button>

              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Compartir por WhatsApp
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={printQR}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={shareNative}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Compartir
                </button>
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-400 text-xs font-medium hover:bg-white/[0.06] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>

              <button
                onClick={() => window.open(menuUrl, '_blank')}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 text-xs font-medium hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir menú
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
