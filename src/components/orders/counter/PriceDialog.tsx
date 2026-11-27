'use client';

/**
 * Tanda 3 del Counter: cambiar el precio de un plato desde la pestaña "Menú".
 * Dos pasos: escribir el precio nuevo → revisar "antes → ahora" y confirmar.
 * Un cambio de más de ±50 % muestra un aviso y el botón dice "Sí, cambiar a…".
 * Si la tablet no tiene el PIN del dueño puesto, el servidor responde pin_required:
 * se abre el teclado del PIN y, al acertar, se reintenta solo. Quien abre el diálogo
 * (MenuView) vuelve a bloquear la tablet al terminar: el PIN no queda abierto.
 *
 * Capas: z-55 — debajo de la alerta de pedidos nuevos (z-60), que siempre tiene
 * que poder tocarse; el PIN de acá va en z-[56].
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { isBigChange, parsePrice } from '@/lib/price-change';
import { PinPad } from './OwnerPanelButton';
import { C, RAISED, type CounterText } from './ui';

export type PriceResult =
  | { kind: 'ok'; price: number; oldPrice: number }
  | { kind: 'pin' }
  | { kind: 'changed'; price: number }
  | { kind: 'error' };

/** POST /api/counter/price. Lo usan el diálogo y el "Deshacer". */
export async function postPrice(productId: string, price: number, expected: number, opts: { confirmBig?: boolean; isUndo?: boolean } = {}): Promise<PriceResult> {
  try {
    const res = await fetch('/api/counter/price', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product_id: productId, price, expected, confirm_big: opts.confirmBig === true, is_undo: opts.isUndo === true }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; price?: number; old_price?: number };
    if (res.ok && typeof data.price === 'number') return { kind: 'ok', price: data.price, oldPrice: data.old_price ?? expected };
    if (data.error === 'pin_required') return { kind: 'pin' };
    if (data.error === 'changed' && typeof data.price === 'number') return { kind: 'changed', price: data.price };
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

/** Vuelve a bloquear la tablet (cierra el desbloqueo de 10 min del PIN). Si falla, vence solo. */
export function relockTablet(): void {
  void fetch('/api/devices/panel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'lock' }),
  }).catch(() => {});
}

export function PriceDialog({ T, name, productId, price, format, symbol, onClose, onSaved, onChangedElsewhere, onPinUsed }: {
  T: CounterText;
  name: string;
  productId: string;
  /** El precio que la persona ve ahora (tal cual viene de la base). */
  price: number;
  format: (n: number) => string;
  /** Símbolo de la moneda de la tienda para el campo ("$"). */
  symbol: string;
  onClose: () => void;
  onSaved: (oldPrice: number, newPrice: number) => void;
  /** Otra tablet o el panel lo cambió: la lista se pone al día con este precio. */
  onChangedElsewhere: (price: number) => void;
  /** Se puso el PIN: MenuView vuelve a bloquear la tablet cuando termina. */
  onPinUsed: () => void;
}) {
  const en = T.locale.startsWith('en');
  const [current, setCurrent] = useState(price);
  const [raw, setRaw] = useState(price.toFixed(2));
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const next = parsePrice(raw);
  const big = next !== null && isBigChange(current, next);
  const pct = next !== null && current > 0 ? Math.round(((next - current) / current) * 100) : 0;
  const pctText = `${pct > 0 ? '+' : ''}${pct} %`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pinOpen && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pinOpen, busy]);

  useEffect(() => {
    if (step === 'edit') { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [step]);

  const review = () => {
    if (next === null) { setMsg(T.pInvalid); return; }
    if (Math.abs(next - current) < 0.004) { setMsg(T.pSame); return; }
    setMsg(null);
    setStep('confirm');
  };

  const save = async () => {
    if (next === null || busy) return;
    setBusy(true);
    setMsg(null);
    const r = await postPrice(productId, next, current, { confirmBig: big });
    setBusy(false);
    if (r.kind === 'ok') { onSaved(r.oldPrice, r.price); return; }
    if (r.kind === 'pin') { setPinOpen(true); return; }
    if (r.kind === 'changed') {
      setCurrent(r.price);
      setRaw(r.price.toFixed(2));
      setStep('edit');
      setMsg(T.pChanged(format(r.price)));
      onChangedElsewhere(r.price);
      return;
    }
    setMsg(T.mFailed);
  };

  const btn = 'h-14 rounded-xl px-5 text-[17px] font-bold disabled:opacity-50';

  return (
    <>
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4" style={{ background: C.scrim }}
        role="dialog" aria-modal="true" aria-label={T.pEdit(name)}>
        <div className="w-full max-w-[440px] rounded-[26px] p-5" style={RAISED}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold uppercase tracking-[.04em]" style={{ color: C.sub }}>{T.pPinTitle}</p>
              <h3 className="mt-1 text-[21px] font-bold leading-tight tracking-[-0.01em]" style={{ color: C.ink }}>{name}</h3>
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label={T.close}
              className="flex-none w-11 h-11 -mr-2 -mt-1 rounded-xl flex items-center justify-center" style={{ color: C.sub }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'edit' ? (
            <>
              <p className="mt-4 text-[16px]" style={{ color: C.sub }}>
                {T.pNow} <b className="tabular-nums" style={{ color: C.ink }}>{format(current)}</b>
              </p>
              <label className="mt-3 block">
                <span className="block text-[15px] font-semibold mb-1.5" style={{ color: C.ink }}>{T.pNew}</span>
                <span className="flex items-center gap-2 h-16 rounded-[16px] px-4 focus-within:ring-2"
                  style={{ background: C.surface, boxShadow: `inset 0 0 0 1px ${C.lineStrong}`, ['--tw-ring-color' as string]: C.ink }}>
                  <span className="text-[26px] font-semibold" style={{ color: C.sub }} aria-hidden>{symbol}</span>
                  <input ref={inputRef} value={raw} inputMode="decimal" autoComplete="off" enterKeyHint="next"
                    onChange={(e) => { setRaw(e.target.value); setMsg(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') review(); }}
                    aria-invalid={msg === T.pInvalid}
                    className="flex-1 min-w-0 bg-transparent outline-hidden text-[30px] font-bold tabular-nums" style={{ color: C.ink }} />
                </span>
              </label>
              <p className="mt-2 min-h-[44px] text-[15px] leading-snug" role="status" style={{ color: msg ? C.destructive : C.sub }}>
                {msg ?? T.pHint}
              </p>
              <div className="mt-1 flex gap-2.5">
                <button type="button" onClick={onClose} className={`${btn} flex-none`} style={{ background: C.fill, color: C.ink }}>{T.pBack}</button>
                <button type="button" onClick={review} disabled={next === null} className={`${btn} flex-1`} style={{ background: C.inverse, color: C.onInverse }}>
                  {T.pReview}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-[.04em]" style={{ color: C.sub }}>{T.pBefore}</p>
                  <p className="mt-0.5 text-[24px] font-semibold tabular-nums line-through decoration-2" style={{ color: C.sub }}>{format(current)}</p>
                </div>
                <ArrowRight className="w-6 h-6" strokeWidth={2.4} style={{ color: C.sub }} aria-hidden />
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-[.04em]" style={{ color: C.sub }}>{T.pAfter}</p>
                  <p className="mt-0.5 text-[32px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>{next !== null ? format(next) : ''}</p>
                </div>
              </div>
              {big && (
                <p className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[16px] font-semibold leading-snug" role="alert"
                  style={{ background: C.warnBg, color: C.destructive }}>
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-none" strokeWidth={2.4} />
                  {T.pBig(pctText)}
                </p>
              )}
              <p className="mt-3 min-h-[24px] text-[15px] leading-snug" role="status" style={{ color: C.destructive }}>
                {msg}
              </p>
              <div className="mt-1 flex gap-2.5">
                <button type="button" onClick={() => { setStep('edit'); setMsg(null); }} disabled={busy} className={`${btn} flex-none`} style={{ background: C.fill, color: C.ink }}>
                  {T.pBack}
                </button>
                <button type="button" onClick={save} disabled={busy || next === null} className={`${btn} flex-1`}
                  style={big ? { background: C.destructive, color: '#fff' } : { background: C.accent, color: C.onAccent }}>
                  {busy ? '…' : next !== null ? (big ? T.pBigConfirm(format(next)) : T.pConfirm(format(next))) : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {pinOpen && (
        <PinPad en={en} title={T.pPinTitle} layer="z-56" onClose={() => setPinOpen(false)}
          onUnlocked={() => { setPinOpen(false); onPinUsed(); void save(); }} />
      )}
    </>
  );
}
