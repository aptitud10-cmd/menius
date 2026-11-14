'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { isValidPin } from '@/lib/panel-pin-shared';

interface PinStatus {
  hasPin: boolean;
  updatedAt: string | null;
  log: { created_at: string; success: boolean }[];
}

const COPY = {
  es: {
    title: 'PIN del panel',
    note: 'Desde la tablet del Counter, "Panel del dueño" (al final del menú ☰) pide este PIN. Abre el panel 10 min; cobros, Stripe, llaves, reembolsos, staff y tablets siguen cerrados en la tablet. Al 5.º error se bloquea 5 min.',
    none: 'Sin PIN: la tablet no puede abrir el panel.',
    active: 'PIN activo',
    changedOn: 'cambiado el',
    create: 'Crear PIN',
    change: 'Cambiar PIN',
    remove: 'Quitar PIN',
    confirmRemove: '¿Seguro? Toca otra vez',
    pin: 'PIN nuevo (4 a 6 números)',
    repeat: 'Repite el PIN',
    save: 'Guardar',
    cancel: 'Cancelar',
    mismatch: 'Los dos PIN no coinciden.',
    invalid: 'El PIN tiene que ser de 4 a 6 números.',
    failed: 'No se pudo guardar. Intenta de nuevo.',
    recent: 'Últimas entradas desde la tablet',
    ok: 'Entró',
    wrong: 'PIN incorrecto',
  },
  en: {
    title: 'Panel PIN',
    note: 'On the Counter tablet, "Owner panel" (at the end of the ☰ menu) asks for this PIN. It opens the dashboard for 10 min; payments, Stripe, keys, refunds, staff and tablets stay closed on the tablet. After 5 wrong tries it locks for 5 min.',
    none: 'No PIN: the tablet cannot open the dashboard.',
    active: 'PIN active',
    changedOn: 'changed on',
    create: 'Create PIN',
    change: 'Change PIN',
    remove: 'Remove PIN',
    confirmRemove: 'Sure? Tap again',
    pin: 'New PIN (4 to 6 digits)',
    repeat: 'Repeat the PIN',
    save: 'Save',
    cancel: 'Cancel',
    mismatch: 'The two PINs do not match.',
    invalid: 'The PIN must be 4 to 6 digits.',
    failed: 'Could not save. Try again.',
    recent: 'Latest entries from the tablet',
    ok: 'Opened',
    wrong: 'Wrong PIN',
  },
} as const;

/** El dueño crea, cambia o quita el PIN. No aparece en la tablet (la API la rechaza). */
export function PanelPinCard() {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';
  const c = COPY[en ? 'en' : 'es'];
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/devices/pin', { cache: 'no-store' });
      if (!res.ok) return;
      setStatus((await res.json()) as PinStatus);
    } catch { /* sin red: la tarjeta no aparece */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!status) return null;

  const save = async () => {
    if (!isValidPin(pin)) { setError(c.invalid); return; }
    if (pin !== repeat) { setError(c.mismatch); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/devices/pin', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setEditing(false);
      setPin('');
      setRepeat('');
      await load();
    } catch {
      setError(c.failed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmRemove) { setConfirmRemove(true); window.setTimeout(() => setConfirmRemove(false), 4000); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/devices/pin', { method: 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
      await load();
    } catch {
      setError(c.failed);
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  };

  const fmt = new Intl.DateTimeFormat(en ? 'en-US' : 'es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const day = new Intl.DateTimeFormat(en ? 'en-US' : 'es', { day: 'numeric', month: 'short' });
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const input = 'dash-input text-lg tracking-[0.4em] font-mono';

  return (
    <div className="dash-card p-6">
      <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
        <KeyRound className="w-4 h-4 text-gray-400" />
        {c.title}
      </h2>
      <p className="text-xs text-gray-500 leading-relaxed flex items-start gap-1.5 mb-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-px" />
        {c.note}
      </p>

      {editing ? (
        <div className="space-y-3 max-w-xs">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">{c.pin}</span>
            <input value={pin} onChange={e => setPin(digits(e.target.value))} type="password" inputMode="numeric" autoComplete="new-password" className={input} autoFocus />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">{c.repeat}</span>
            <input value={repeat} onChange={e => setRepeat(digits(e.target.value))} type="password" inputMode="numeric" autoComplete="new-password" className={input}
              onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={busy} className="min-h-[44px] px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50">{c.save}</button>
            <button type="button" onClick={() => { setEditing(false); setPin(''); setRepeat(''); setError(null); }} className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">{c.cancel}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-700 flex-1 min-w-[180px]">
            {status.hasPin
              ? <><span className="font-semibold text-emerald-700">{c.active}</span>{status.updatedAt && <span className="text-gray-500"> · {c.changedOn} {day.format(new Date(status.updatedAt))}</span>}</>
              : <span className="text-gray-500">{c.none}</span>}
          </p>
          <button type="button" onClick={() => { setEditing(true); setError(null); }} className="min-h-[40px] px-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            {status.hasPin ? c.change : c.create}
          </button>
          {status.hasPin && (
            <button type="button" onClick={() => void remove()} disabled={busy}
              className={`min-h-[40px] px-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 ${confirmRemove ? 'border-red-500 bg-red-500 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              {confirmRemove ? c.confirmRemove : c.remove}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-3" role="alert">{error}</p>}

      {status.log.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">{c.recent}</p>
          <ul className="space-y-1">
            {status.log.map((l, i) => (
              <li key={i} className="text-xs flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${l.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={l.success ? 'text-gray-700' : 'text-red-700'}>{l.success ? c.ok : c.wrong}</span>
                <span className="text-gray-400">· {fmt.format(new Date(l.created_at))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
