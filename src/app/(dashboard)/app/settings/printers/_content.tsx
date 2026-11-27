'use client';

import { useState, useEffect, useCallback } from 'react';
import { Printer as PrinterIcon, Plus, Copy, Check, AlertTriangle, RefreshCw, Trash2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { Printer } from '@/types';
import type { PrintersStatusResponse, PrinterStatus } from '@/lib/printing/printer-status';
import {
  createPrinter, rotatePrinterToken, updatePrinterSettings, deletePrinter, printTest,
} from '@/lib/actions/printers';

type OrderType = 'delivery' | 'pickup' | 'dine_in';
const ORDER_TYPES: OrderType[] = ['delivery', 'pickup', 'dine_in'];
const STATUS_EVERY_MS = 15_000;

function useT(en: boolean) {
  return {
    title: en ? 'Printers' : 'Impresoras',
    sub: en
      ? 'Tickets print by themselves on the counter printer (Star CloudPRNT), even if the tablet is off.'
      : 'Los tickets salen solos en la impresora del mostrador (Star CloudPRNT), aunque la tablet esté apagada.',
    add: en ? 'Add printer' : 'Agregar impresora',
    empty: en ? 'No printer yet' : 'Todavía no hay impresora',
    emptySub: en ? 'Add one and paste its URL into the printer setup.' : 'Agrega una y pega su URL en la configuración de la impresora.',
    urlTitle: en ? 'Copy this URL into the printer now' : 'Copia esta URL en la impresora ahora',
    urlSub: en ? "It's shown only once. If you lose it, create a new one with “New URL”." : 'Se muestra una sola vez. Si la pierdes, crea otra con “Nueva URL”.',
    steps: en
      ? ['Plug the printer into the router with the network cable and turn it on.', 'Hold the FEED button while turning it on: it prints its IP address.', 'Open that IP in a browser on the same Wi-Fi → CloudPRNT → Enable.', 'Paste the URL in “Server URL”, polling every 5 seconds, and save.', 'Come back here: it shows “Online” within a minute. Print a test.']
      : ['Conecta la impresora al router con el cable de red y préndela.', 'Mantén el botón FEED al prenderla: imprime su dirección IP.', 'Abre esa IP en un navegador en el mismo WiFi → CloudPRNT → Enable.', 'Pega la URL en “Server URL”, consulta cada 5 segundos, y guarda.', 'Vuelve aquí: en menos de un minuto dice “En línea”. Imprime una prueba.'],
    savedClose: en ? "I've pasted it — close" : 'Ya la pegué — cerrar',
    online: en ? 'Online' : 'En línea',
    offline: en ? 'Offline' : 'Desconectada',
    never: en ? 'Not connected yet' : 'Sin conectar todavía',
    lastSeen: (t: string) => (en ? `Last seen ${t}` : `Última señal ${t}`),
    waiting: (n: number) => (en ? `${n} waiting to print` : `${n} esperando para imprimir`),
    failed: (n: number) => (en ? `${n} failed` : `${n} fallaron`),
    active: en ? 'On' : 'Encendida',
    printOn: en ? 'Print' : 'Imprimir',
    onAccept: en ? 'When accepted' : 'Al aceptar',
    onCreate: en ? 'As soon as it arrives' : 'Apenas llega',
    onAcceptHint: en ? 'Recommended: rejected orders never print.' : 'Recomendado: lo rechazado no se imprime.',
    copies: en ? 'Copies' : 'Copias',
    types: en ? 'Orders' : 'Pedidos',
    typeLabel: { delivery: 'Delivery', pickup: en ? 'Pickup' : 'Para recoger', dine_in: en ? 'Dine-in' : 'En mesa' } as Record<OrderType, string>,
    test: en ? 'Print test' : 'Imprimir prueba',
    testSent: en ? 'Test sent — it prints in a few seconds' : 'Prueba enviada — sale en unos segundos',
    rotate: en ? 'New URL' : 'Nueva URL',
    rotateConfirm: en ? 'The current URL stops working. You will have to paste the new one into the printer. Continue?' : 'La URL actual deja de funcionar y tendrás que pegar la nueva en la impresora. ¿Seguir?',
    remove: en ? 'Remove' : 'Quitar',
    removeConfirm: en ? 'Remove this printer? Its pending tickets are discarded.' : '¿Quitar esta impresora? Sus tickets pendientes se descartan.',
    error: en ? 'Something went wrong. Try again.' : 'Algo salió mal. Intenta de nuevo.',
  };
}

function ago(iso: string | null, en: boolean): string {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return en ? 'just now' : 'recién';
  const m = Math.round(s / 60);
  if (m < 60) return en ? `${m} min ago` : `hace ${m} min`;
  return new Date(iso).toLocaleString(en ? 'en-US' : 'es-MX', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function PrintersContent({ initialPrinters, initialStatus }: { initialPrinters: Printer[]; initialStatus: PrintersStatusResponse }) {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';
  const t = useT(en);
  const [printers, setPrinters] = useState(initialPrinters);
  const [status, setStatus] = useState(initialStatus);
  const [reveal, setReveal] = useState<{ printerId: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/printers/status', { cache: 'no-store' });
      if (res.ok) setStatus(await res.json());
    } catch { /* sin red: queda el último estado */ }
  }, []);

  useEffect(() => {
    const id = setInterval(refreshStatus, STATUS_EVERY_MS);
    return () => clearInterval(id);
  }, [refreshStatus]);

  const run = async <T,>(key: string, fn: () => Promise<{ ok: true } & T | { ok: false; error: string }>, onOk: (r: T) => void) => {
    setBusy(key); setError(''); setNotice(null);
    try {
      const r = await fn();
      if (r.ok) onOk(r as unknown as T); else setError(t.error);
    } catch { setError(t.error); } finally { setBusy(null); }
  };

  const add = () => run<{ printer: Printer; serverUrl: string }>('add', () => createPrinter({}), (r) => {
    setPrinters((p) => [...p, r.printer]);
    setReveal({ printerId: r.printer.id, url: r.serverUrl });
    void refreshStatus();
  });

  const save = (p: Printer, patch: Partial<Pick<Printer, 'is_active' | 'print_on' | 'copies' | 'order_types'>>) =>
    run<{ printer: Printer }>(`save-${p.id}`, () => updatePrinterSettings({ printerId: p.id, ...patch }), (r) => {
      setPrinters((list) => list.map((x) => (x.id === p.id ? r.printer : x)));
      void refreshStatus();
    });

  const rotate = (p: Printer) => {
    if (!window.confirm(t.rotateConfirm)) return;
    void run<{ serverUrl: string }>(`rotate-${p.id}`, () => rotatePrinterToken({ printerId: p.id }), (r) => setReveal({ printerId: p.id, url: r.serverUrl }));
  };

  const remove = (p: Printer) => {
    if (!window.confirm(t.removeConfirm)) return;
    void run<Record<never, never>>(`remove-${p.id}`, () => deletePrinter({ printerId: p.id }), () => {
      setPrinters((list) => list.filter((x) => x.id !== p.id));
      if (reveal?.printerId === p.id) setReveal(null);
    });
  };

  const test = (p: Printer) => run<{ jobs: number }>(`test-${p.id}`, () => printTest({ printerId: p.id }), () => setNotice(t.testSent));

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sin portapapeles */ }
  };

  const statusOf = (id: string): PrinterStatus | undefined => status.printers.find((s) => s.printerId === id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="dash-heading">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.sub}</p>
        </div>
        <button onClick={add} disabled={busy === 'add'} className="dash-btn-primary shrink-0">
          {busy === 'add' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t.add}
        </button>
      </div>

      {reveal && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{t.urlTitle}</p>
              <p className="text-xs text-amber-800 mt-0.5">{t.urlSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-200 px-4 py-3">
            <code className="flex-1 text-xs font-mono text-gray-900 break-all">{reveal.url}</code>
            <button onClick={() => copy(reveal.url)} className="shrink-0 p-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors" aria-label="Copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-[13px] text-amber-900">
            {t.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <button onClick={() => setReveal(null)} className="text-xs font-semibold text-amber-800 hover:text-amber-950">{t.savedClose}</button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 font-medium">{notice}</p>}

      {printers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-14 gap-2 text-center px-6">
          <PrinterIcon className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-800">{t.empty}</p>
          <p className="text-sm text-gray-600">{t.emptySub}</p>
        </div>
      ) : (
        printers.map((p) => {
          const s = statusOf(p.id);
          const online = s?.state === 'online';
          return (
            <div key={p.id} className={cn('bg-white rounded-2xl border border-gray-200 p-5 space-y-4', !p.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <PrinterIcon className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-900">{p.name}</p>
                  <p className="text-[13px] flex items-center gap-1.5 mt-0.5">
                    <span className={cn('w-2 h-2 rounded-full', online ? 'bg-emerald-500' : p.last_poll_at ? 'bg-red-500' : 'bg-gray-300')} />
                    <span className={cn('font-semibold', online ? 'text-emerald-700' : p.last_poll_at ? 'text-red-600' : 'text-gray-700')}>
                      {online ? t.online : p.last_poll_at ? t.offline : t.never}
                    </span>
                    {!online && p.last_poll_at && <span className="text-gray-600">· {t.lastSeen(ago(s?.lastPollAt ?? p.last_poll_at, en))}</span>}
                  </p>
                  {(s?.queuedCount || s?.failedCount) ? (
                    <p className="text-[13px] font-semibold text-red-600 mt-0.5">
                      {[s.queuedCount ? t.waiting(s.queuedCount) : null, s.failedCount ? t.failed(s.failedCount) : null].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 cursor-pointer shrink-0">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={p.is_active} disabled={busy === `save-${p.id}`}
                    onChange={(e) => save(p, { is_active: e.target.checked })} />
                  {t.active}
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">{t.printOn}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['accepted', 'created'] as const).map((v) => (
                      <button key={v} type="button" onClick={() => p.print_on !== v && save(p, { print_on: v })}
                        className={cn('h-10 rounded-xl border text-[13px] font-semibold transition-colors',
                          p.print_on === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-800 hover:border-gray-400')}>
                        {v === 'accepted' ? t.onAccept : t.onCreate}
                      </button>
                    ))}
                  </div>
                  {p.print_on === 'accepted' && <p className="text-xs text-gray-600 mt-1">{t.onAcceptHint}</p>}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">{t.copies}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button" onClick={() => p.copies !== n && save(p, { copies: n })}
                        className={cn('h-10 rounded-xl border text-[13px] font-bold tabular-nums transition-colors',
                          p.copies === n ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-800 hover:border-gray-400')}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">{t.types}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ORDER_TYPES.map((ty) => {
                      const on = p.order_types.includes(ty);
                      const next = on ? p.order_types.filter((x) => x !== ty) : [...p.order_types, ty];
                      return (
                        <button key={ty} type="button" disabled={on && p.order_types.length === 1}
                          onClick={() => save(p, { order_types: next })}
                          className={cn('h-10 rounded-xl border text-[13px] font-semibold transition-colors disabled:cursor-not-allowed',
                            on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-800 hover:border-gray-400')}>
                          {t.typeLabel[ty]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => test(p)} disabled={!p.is_active || busy === `test-${p.id}`} className="dash-btn-secondary">
                  {busy === `test-${p.id}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PrinterIcon className="w-4 h-4" />} {t.test}
                </button>
                <button type="button" onClick={() => rotate(p)} disabled={busy === `rotate-${p.id}`} className="dash-btn-secondary">
                  <KeyRound className="w-4 h-4" /> {t.rotate}
                </button>
                <button type="button" onClick={() => remove(p)} disabled={busy === `remove-${p.id}`}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 h-10 rounded-xl text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" /> {t.remove}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
