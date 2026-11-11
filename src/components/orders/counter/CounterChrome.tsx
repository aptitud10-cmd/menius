'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, History, Menu as MenuIcon, X } from 'lucide-react';
import type { Order } from '@/types';
import { C, type CounterText } from './ui';
import { OrderCard, type PrimaryKind } from './CounterBoard';

export type StoreState =
  | { kind: 'offline' }
  | { kind: 'reconnecting' }
  | { kind: 'paused'; minsLeft: number }
  | { kind: 'busy'; extra: number }
  | { kind: 'open' };

export function StatusPill({ state, T, onClick }: { state: StoreState; T: CounterText; onClick: () => void }) {
  const look = {
    offline: { bg: C.redSoft, fg: C.red, dot: C.red, text: T.offline },
    reconnecting: { bg: C.amberSoft, fg: C.amber, dot: C.amber, text: T.reconnecting },
    paused: { bg: C.amberSoft, fg: C.amber, dot: C.amber, text: state.kind === 'paused' ? T.paused(state.minsLeft) : '' },
    busy: { bg: C.amberSoft, fg: C.amber, dot: C.amber, text: state.kind === 'busy' ? T.busy(state.extra) : '' },
    open: { bg: C.greenSoft, fg: C.greenDeep, dot: C.green, text: T.receiving },
  }[state.kind];
  return (
    <button type="button" onClick={onClick}
      className="h-12 min-w-0 px-3 sm:px-4 rounded-full inline-flex items-center gap-2.5 font-bold text-[15px] sm:text-[16px] whitespace-nowrap"
      style={{ background: look.bg, color: look.fg }}>
      <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: look.dot, boxShadow: state.kind === 'open' ? `0 0 0 4px ${C.green}33` : undefined }} />
      {state.kind === 'open' ? (
        <>
          <span className="md:hidden">{T.receivingShort}</span>
          <span className="hidden md:inline truncate">{look.text}</span>
        </>
      ) : (
        <span className="truncate">{look.text}</span>
      )}
    </button>
  );
}

export type CounterViewMode = 'board' | 'scheduled' | 'history';

export function CounterTopBar({
  T, restaurantName, state, view, scheduledCount, onStatus, onView, onMenu,
}: {
  T: CounterText; restaurantName: string; state: StoreState; view: CounterViewMode; scheduledCount: number;
  onStatus: () => void; onView: (v: CounterViewMode) => void; onMenu: () => void;
}) {
  // En celular y tablet vertical los botones son solo ícono (48 px); el nombre
  // de la tienda sale desde 768 px: antes no cabían y "Menú" quedaba cortado fuera de la pantalla.
  const btn = 'flex-none h-12 min-w-12 px-3 lg:px-4 rounded-xl inline-flex items-center justify-center gap-2 font-bold text-[16px] whitespace-nowrap';
  return (
    <header className="flex-none flex items-center gap-2 sm:gap-3 px-3 sm:px-4 min-h-[68px] border-b" style={{ background: C.bg, borderColor: C.line, paddingTop: 'env(safe-area-inset-top)' }}>
      {view !== 'board' ? (
        <button type="button" onClick={() => onView('board')} className={btn} style={{ background: C.surface, color: C.ink }}>
          <ArrowLeft className="w-5 h-5" /> <span className="hidden md:inline">{T.backToBoard}</span>
        </button>
      ) : (
        <span className="hidden md:inline font-extrabold text-[19px] truncate max-w-[260px]" style={{ color: C.ink }}>{restaurantName}</span>
      )}
      <StatusPill state={state} T={T} onClick={onStatus} />
      <span className="flex-1 min-w-0" />
      {(scheduledCount > 0 || view === 'scheduled') && (
        <button type="button" onClick={() => onView('scheduled')} className={btn}
          style={view === 'scheduled' ? { background: C.black, color: '#fff' } : { background: C.surface, color: C.ink }}>
          <CalendarClock className="w-5 h-5" />
          <span className="hidden lg:inline">{T.scheduled}</span>
          <span className="tabular-nums">{scheduledCount}</span>
        </button>
      )}
      <button type="button" onClick={() => onView('history')} className={btn}
        style={view === 'history' ? { background: C.black, color: '#fff' } : { background: C.surface, color: C.ink }}>
        <History className="w-5 h-5" /> <span className="hidden lg:inline">{T.history}</span>
      </button>
      <button type="button" onClick={onMenu} className={btn} style={{ background: C.surface, color: C.ink }}>
        <MenuIcon className="w-5 h-5" /> <span className="hidden lg:inline">{T.menu}</span>
      </button>
    </header>
  );
}

/** Estado de la tienda (como la píldora "Open" de Uber): Ocupado y Pausar en un solo lugar. */
export function StoreStatusSheet({
  T, isPaused, pauseLeft, busyExtra, onBusy, onPause, onResume, onClose,
}: {
  T: CounterText; isPaused: boolean; pauseLeft: number; busyExtra: number;
  onBusy: (m: number) => void; onPause: (mins: number) => void; onResume: () => void; onClose: () => void;
}) {
  const opt = 'h-14 rounded-xl font-bold text-[17px]';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={T.storeStatus}>
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: 'rgba(14,20,18,.45)' }} onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-3xl p-6 flex flex-col gap-5 shadow-2xl" style={{ background: C.bg, color: C.ink }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-extrabold">{T.storeStatus}</h2>
            <p className="text-[16px] mt-0.5" style={{ color: isPaused ? C.amber : C.sub }}>
              {isPaused ? T.paused(pauseLeft) : busyExtra > 0 ? T.busy(busyExtra) : T.storeOpen}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={T.close} className="w-12 h-12 rounded-xl inline-flex items-center justify-center" style={{ background: C.surface }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold" style={{ color: C.sub }}>{T.busyMode}</h3>
          <div className="grid grid-cols-3 gap-2">
            {[0, 10, 20].map((m) => (
              <button key={m} type="button" onClick={() => onBusy(m)} className={opt}
                style={busyExtra === m ? { background: C.black, color: '#fff' } : { background: C.surface, color: C.ink }}>
                {m === 0 ? T.normal : `+${m} min`}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold" style={{ color: C.sub }}>{T.pauseOrders}</h3>
          {isPaused ? (
            <button type="button" onClick={onResume} className="h-16 rounded-2xl font-extrabold text-[20px]" style={{ background: C.green, color: C.greenInk }}>
              {T.resume}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 30, l: T.min(30) }, { v: 60, l: T.hours(1) }, { v: 120, l: T.hours(2) }, { v: 9999, l: T.untilTomorrow }].map((o) => (
                <button key={o.v} type="button" onClick={() => onPause(o.v)} className={opt} style={{ background: C.amberSoft, color: C.amber }}>
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Programados / Historial: la misma tarjeta del tablero, en una grilla. */
export function OrdersListView({
  T, currency, orders, mode, busyIds, acceptMinsFor, onOpen, onPrimary,
}: {
  T: CounterText; currency: string; orders: Order[]; mode: 'scheduled' | 'history';
  busyIds: Set<string>; acceptMinsFor: (o: Order) => number;
  onOpen: (o: Order) => void; onPrimary: (o: Order, kind: PrimaryKind) => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) => (o.customer_name ?? '').toLowerCase().includes(s) || (o.order_number ?? '').toLowerCase().includes(s));
  }, [orders, q]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 pt-4" style={{ background: C.bg }}>
      <div className="flex items-center gap-3">
        <h2 className="text-[22px] font-extrabold" style={{ color: C.ink }}>{mode === 'scheduled' ? T.scheduled : T.history}</h2>
        {mode === 'history' && (
          <input
            id="counter-history-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T.search}
            className="ml-auto h-12 w-full max-w-[360px] rounded-xl px-4 text-[16px] outline-none focus:ring-2"
            style={{ background: C.surface, color: C.ink }}
          />
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
        {list.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed px-4 py-10 text-center text-[17px] font-semibold" style={{ borderColor: C.line, color: C.faint }}>
            {mode === 'scheduled' ? T.noScheduled : T.noHistory}
          </p>
        ) : (
          <div className="grid gap-3 grid-cols-1 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
            {list.map((o) => (
              <OrderCard key={o.id} order={o} T={T} currency={currency} acceptMins={acceptMinsFor(o)} busy={busyIds.has(o.id)}
                onOpen={() => onOpen(o)} onPrimary={(k) => onPrimary(o, k)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Aviso abajo a la izquierda, fuera de la zona de los botones principales. */
export function CounterToast({ text, tone, actionLabel, onAction }: {
  text: string; tone: 'ok' | 'error'; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div role="status" aria-live="polite"
      className="fixed z-[60] left-4 bottom-4 max-w-[min(520px,calc(100vw-2rem))] rounded-2xl pl-5 pr-2 py-2 flex items-center gap-4 shadow-2xl"
      style={{ background: tone === 'error' ? C.red : C.black, color: '#fff', marginBottom: 'env(safe-area-inset-bottom)' }}>
      <span className="text-[16px] font-semibold py-2">{text}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="h-12 px-4 rounded-xl font-extrabold text-[16px]" style={{ background: 'rgba(255,255,255,.16)' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
