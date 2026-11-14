'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tablet, ShieldCheck } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface ConnectedTablet {
  id: string;
  connectedAt: string;
  lastActiveAt: string;
  app: boolean;
}

const COPY = {
  es: {
    title: 'Tablets conectadas',
    note: 'Usan solo el Counter; con el PIN del panel abren el panel 10 min, pero nunca cobros, reembolsos ni llaves. Si pierdes una tablet, desconéctala aquí.',
    tablet: 'Tablet',
    app: 'App MENIUS Counter',
    browser: 'Navegador',
    connected: 'Conectada el',
    active: 'activa',
    disconnect: 'Desconectar',
    confirm: '¿Seguro? Toca otra vez',
    failed: 'No se pudo desconectar. Intenta de nuevo.',
    now: 'ahora',
    minAgo: (n: number) => `hace ${n} min`,
    hAgo: (n: number) => `hace ${n} h`,
    dAgo: (n: number) => `hace ${n} d`,
  },
  en: {
    title: 'Connected tablets',
    note: 'They only use the Counter; with the panel PIN they open the dashboard for 10 min, but never payments, refunds or keys. If you lose a tablet, disconnect it here.',
    tablet: 'Tablet',
    app: 'MENIUS Counter app',
    browser: 'Browser',
    connected: 'Connected on',
    active: 'active',
    disconnect: 'Disconnect',
    confirm: 'Sure? Tap again',
    failed: 'Could not disconnect. Try again.',
    now: 'now',
    minAgo: (n: number) => `${n} min ago`,
    hAgo: (n: number) => `${n} h ago`,
    dAgo: (n: number) => `${n} d ago`,
  },
} as const;

/** Lista de tablets vinculadas con código; no ocupa lugar si no hay ninguna. */
export function ConnectedTablets() {
  const { locale } = useDashboardLocale();
  const c = COPY[locale === 'en' ? 'en' : 'es'];
  const [tablets, setTablets] = useState<ConnectedTablet[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/devices/sessions', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { tablets?: ConnectedTablet[] };
      setTablets(data.tablets ?? []);
    } catch { /* la lista es informativa: sin red simplemente no aparece */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const disconnect = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); setError(null); return; }
    setBusyId(id);
    try {
      const res = await fetch('/api/devices/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      setTablets((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError(c.failed);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  if (tablets.length === 0) return null;

  const dateFmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es', { day: 'numeric', month: 'short' });
  const ago = (iso: string) => {
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (min < 2) return c.now;
    if (min < 60) return c.minAgo(min);
    if (min < 48 * 60) return c.hAgo(Math.round(min / 60));
    return c.dAgo(Math.round(min / 1440));
  };

  return (
    <div className="dash-card p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Tablet className="w-4 h-4 text-gray-400" />
          {c.title}
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{tablets.length}</span>
        </h2>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed flex items-start gap-1.5 mb-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-px" />
        {c.note}
      </p>

      <ul className="divide-y divide-gray-100">
        {tablets.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Tablet className="w-4 h-4 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {c.tablet} {tablets.length - i} <span className="font-normal text-gray-500">· {t.app ? c.app : c.browser}</span>
              </p>
              <p className="text-xs text-gray-500 truncate">
                {c.connected} {dateFmt.format(new Date(t.connectedAt))} · {c.active} {ago(t.lastActiveAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => disconnect(t.id)}
              disabled={busyId === t.id}
              className={`flex-shrink-0 min-h-[40px] px-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 ${
                confirmId === t.id
                  ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {confirmId === t.id ? c.confirm : c.disconnect}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-red-600 mt-3" role="alert">{error}</p>}
    </div>
  );
}
