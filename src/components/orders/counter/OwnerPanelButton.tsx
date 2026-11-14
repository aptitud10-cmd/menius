'use client';

import { useEffect, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { C } from './ui';

/**
 * "Panel del dueño" al final del menú del Counter (brief sección 7). Va escondido
 * ahí a propósito: los empleados no lo tienen a mano en la barra de arriba.
 *
 * En una tablet vinculada pide el PIN del dueño (el servidor lo verifica, bloquea
 * 5 min al 5.º error y abre el panel 10 min). Con la sesión del dueño (su celular
 * o computadora) entra directo.
 */
export function OwnerPanelButton({ needsPin, en }: { needsPin: boolean; en: boolean }) {
  const [padOpen, setPadOpen] = useState(false);
  const label = en ? 'Owner panel' : 'Panel del dueño';

  if (!needsPin) {
    return (
      <a href="/app" className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] hover:border-[#CCCCCC] transition-colors text-left">
        <Lock className="w-4 h-4 text-[#555]" />
        <span className="text-[15px] font-semibold text-[#111]">{label}</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPadOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-[#EEEEEE] hover:border-[#CCCCCC] transition-colors text-left"
      >
        <Lock className="w-4 h-4 text-[#555]" />
        <span className="text-[15px] font-semibold text-[#111]">{label}</span>
        <span className="ml-auto text-[13px] text-[#55605C]">PIN</span>
      </button>
      {padOpen && <PinPad en={en} onClose={() => setPadOpen(false)} />}
    </>
  );
}

type PadState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'wrong'; left: number }
  | { kind: 'locked'; until: number }
  | { kind: 'noPin' }
  | { kind: 'error' };

export function PinPad({ en, onClose }: { en: boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [state, setState] = useState<PadState>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());

  const locked = state.kind === 'locked' && state.until > now;
  useEffect(() => {
    if (state.kind !== 'locked') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.kind]);

  const press = (d: string) => {
    if (locked || state.kind === 'checking') return;
    setPin(p => (p.length >= 6 ? p : p + d));
    if (state.kind === 'wrong' || state.kind === 'error') setState({ kind: 'idle' });
  };

  const submit = async () => {
    if (pin.length < 4 || locked || state.kind === 'checking') return;
    setState({ kind: 'checking' });
    try {
      const res = await fetch('/api/devices/panel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; attemptsLeft?: number; lockedUntil?: string };
      if (res.ok) {
        window.location.href = '/app';
        return;
      }
      setPin('');
      if (data.error === 'wrong_pin') setState({ kind: 'wrong', left: data.attemptsLeft ?? 0 });
      else if (data.error === 'locked_out' && data.lockedUntil) { setNow(Date.now()); setState({ kind: 'locked', until: new Date(data.lockedUntil).getTime() }); }
      else if (data.error === 'no_pin') setState({ kind: 'noPin' });
      else setState({ kind: 'error' });
    } catch {
      setPin('');
      setState({ kind: 'error' });
    }
  };

  const secsLeft = state.kind === 'locked' ? Math.max(0, Math.ceil((state.until - now) / 1000)) : 0;
  const mmss = `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')}`;

  const message =
    state.kind === 'wrong' ? (en ? `Wrong PIN · ${state.left} ${state.left === 1 ? 'try' : 'tries'} left` : `PIN incorrecto · te quedan ${state.left}`)
    : locked ? (en ? `Too many tries. Try again in ${mmss}` : `Demasiados intentos. Prueba en ${mmss}`)
    : state.kind === 'noPin' ? (en ? 'There is no PIN yet. The owner creates it in the dashboard → Counter, from their phone or computer.' : 'Todavía no hay PIN. El dueño lo crea en el panel → Counter, desde su celular o computadora.')
    : state.kind === 'error' ? (en ? 'Could not check the PIN. Try again.' : 'No se pudo revisar el PIN. Prueba otra vez.')
    : (en ? 'Enter the owner’s PIN' : 'Pon el PIN del dueño');
  const bad = state.kind === 'wrong' || locked || state.kind === 'error';

  const keyBase = 'h-16 rounded-2xl font-bold flex items-center justify-center select-none active:scale-[0.97] transition-transform disabled:opacity-40';
  const key = `${keyBase} text-[26px]`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(14,20,18,0.55)' }} role="dialog" aria-modal="true" aria-label={en ? 'Owner panel PIN' : 'PIN del panel del dueño'}>
      <div className="w-full max-w-[360px] rounded-3xl p-5 shadow-2xl" style={{ background: C.bg }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[19px] font-extrabold" style={{ color: C.ink }}>{en ? 'Owner panel' : 'Panel del dueño'}</p>
          <button type="button" onClick={onClose} aria-label={en ? 'Close' : 'Cerrar'} className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center" style={{ color: C.sub }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[15px] min-h-[44px] leading-snug" role="status" style={{ color: bad ? C.red : C.sub }}>{message}</p>

        <div className="flex justify-center gap-3 my-4" aria-hidden>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className="w-4 h-4 rounded-full transition-colors" style={{ background: i < pin.length ? C.ink : C.surface2 }} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button key={d} type="button" onClick={() => press(d)} disabled={locked} className={key} style={{ background: C.surface, color: C.ink }}>{d}</button>
          ))}
          <button type="button" onClick={() => setPin(p => p.slice(0, -1))} disabled={locked || pin.length === 0} className={key} style={{ background: C.bg, color: C.sub }} aria-label={en ? 'Delete' : 'Borrar'}>
            <Delete className="w-7 h-7" />
          </button>
          <button type="button" onClick={() => press('0')} disabled={locked} className={key} style={{ background: C.surface, color: C.ink }}>0</button>
          <button type="button" onClick={submit} disabled={locked || pin.length < 4 || state.kind === 'checking'} className={`${keyBase} text-[17px]`} style={{ background: C.black, color: '#fff' }}>
            {state.kind === 'checking' ? '…' : en ? 'Enter' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
