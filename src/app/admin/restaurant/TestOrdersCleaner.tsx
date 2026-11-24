'use client';

/**
 * "Pedidos de prueba" en /admin/restaurant: elegir y borrar, con respaldo que se
 * descarga solo antes de recargar. Ver lib/orders/test-orders.ts.
 */

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface Row {
  id: string; order_number: string; customer_name: string | null; total: number;
  status: string; payment_method: string | null; payment_status: string | null;
  created_at: string; deletable: boolean;
}

function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function TestOrdersCleaner({ restaurantId, slug, fmt, onDone }: {
  restaurantId: string; slug: string; fmt: (n: number) => string; onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/test-orders?restaurantId=${restaurantId}`, { cache: 'no-store' });
      const j = (await r.json()) as { orders?: Row[]; error?: string };
      if (!r.ok || !j.orders) throw new Error(j.error ?? String(r.status));
      setRows(j.orders); setSel(new Set());
    } catch (e) {
      setMsg({ text: `No se pudo cargar: ${e instanceof Error ? e.message : String(e)}`, ok: false });
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const deletable = (rows ?? []).filter((r) => r.deletable);
  const allOn = deletable.length > 0 && deletable.every((r) => sel.has(r.id));

  const remove = async () => {
    if (sel.size === 0) return;
    const total = (rows ?? []).filter((r) => sel.has(r.id)).reduce((s, r) => s + Number(r.total || 0), 0);
    if (!window.confirm(`¿Borrar ${sel.size} pedido(s) de prueba (${fmt(total)})?\n\nSe descarga un respaldo antes. Esto no se puede deshacer desde la app.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/test-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, orderIds: Array.from(sel) }),
      });
      const j = (await r.json()) as { deleted?: number; backup?: unknown; error?: string };
      if (!r.ok || !j.backup) throw new Error(j.error ?? String(r.status));
      downloadJson(`respaldo-pedidos-prueba-${slug}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`, j.backup);
      setMsg({ text: `Borrados ${j.deleted}. El respaldo se descargó.`, ok: true });
      onDone();
      await load();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-white">Pedidos de prueba</p>
          <p className="text-xs text-gray-600 mt-0.5">Solo admin. Los cobrados con tarjeta no se pueden borrar: se cancelan o reembolsan.</p>
        </div>
        <div className="flex items-center gap-2">
          {rows && deletable.length > 0 && (
            <button type="button" disabled={busy}
              onClick={() => setSel(allOn ? new Set() : new Set(deletable.map((r) => r.id)))}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 hover:text-white disabled:opacity-50">
              {allOn ? 'Quitar selección' : `Seleccionar todos (${deletable.length})`}
            </button>
          )}
          {rows ? (
            <button type="button" disabled={busy || sel.size === 0} onClick={remove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-medium disabled:opacity-40">
              <Trash2 className="w-3 h-3" /> Borrar {sel.size > 0 ? sel.size : ''}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={load}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 hover:text-white disabled:opacity-50">
              {busy ? 'Cargando…' : 'Ver pedidos'}
            </button>
          )}
        </div>
      </div>
      {msg && (
        <p className={`px-5 py-2.5 text-xs border-b border-white/[0.06] ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
      {rows && (
        rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-700 text-center">Sin pedidos</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
            {rows.map((r) => (
              <label key={r.id} className={`px-5 py-2.5 flex items-center gap-3 ${r.deletable ? 'cursor-pointer hover:bg-white/[0.02]' : 'opacity-50'}`}>
                <input type="checkbox" disabled={!r.deletable || busy} checked={sel.has(r.id)} onChange={() => toggle(r.id)}
                  className="w-4 h-4 accent-red-500 flex-shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-white truncate">
                  #{r.order_number}
                  {r.customer_name && <span className="text-gray-500"> · {r.customer_name}</span>}
                </span>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] text-gray-500 w-16 text-right flex-shrink-0">{r.deletable ? r.status : 'cobrado'}</span>
                <span className="text-sm font-bold text-white tabular-nums w-20 text-right flex-shrink-0">{fmt(Number(r.total || 0))}</span>
              </label>
            ))}
          </div>
        )
      )}
    </div>
  );
}
