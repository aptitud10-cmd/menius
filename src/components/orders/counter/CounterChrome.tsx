'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, History, Menu as MenuIcon, Palette, X } from 'lucide-react';
import type { Order } from '@/types';
import { C, RAISED, type CounterText } from './ui';
import { OrderCard, type PrimaryKind } from './CounterBoard';

export type StoreState =
  | { kind: 'offline' }
  | { kind: 'reconnecting' }
  | { kind: 'paused'; minsLeft: number }
  | { kind: 'busy'; extra: number }
  | { kind: 'open' };

export function StatusPill({ state, T, onClick }: { state: StoreState; T: CounterText; onClick: () => void }) {
  // Abierto = gris tranquilo con el punto verde. Pausado/ocupado = aviso suave.
  // Sin conexión es el único caso en que la píldora grita.
  const look = {
    offline: { bg: C.critical, fg: C.onCritical, dot: C.onCritical, text: T.offline },
    reconnecting: { bg: C.warnBg, fg: C.warnText, dot: C.warnBar, text: T.reconnecting },
    paused: { bg: C.warnBg, fg: C.warnText, dot: C.warnBar, text: state.kind === 'paused' ? T.paused(state.minsLeft) : '' },
    busy: { bg: C.warnBg, fg: C.warnText, dot: C.warnBar, text: state.kind === 'busy' ? T.busy(state.extra) : '' },
    open: { bg: C.fill, fg: C.ink, dot: C.status, text: T.receiving },
  }[state.kind];
  return (
    <button type="button" onClick={onClick}
      className="h-11 min-w-0 pl-4 pr-[18px] rounded-full inline-flex items-center gap-2.5 font-semibold text-[16px] whitespace-nowrap"
      style={{ background: look.bg, color: look.fg }}>
      <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: look.dot }} />
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
  T, restaurantName, state, view, scheduledCount, onStatus, onView, onMenu, onCustomize,
}: {
  T: CounterText; restaurantName: string; state: StoreState; view: CounterViewMode; scheduledCount: number;
  onStatus: () => void; onView: (v: CounterViewMode) => void; onMenu: () => void;
  /** Sonido, colores y volumen (panel lateral). */
  onCustomize?: () => void;
}) {
  // En celular y tablet vertical los botones son solo ícono (48 px); el nombre
  // de la tienda sale desde 768 px: antes no cabían y "Menú" quedaba cortado fuera de la pantalla.
  const btn = 'flex-none h-11 min-w-11 px-3 lg:pl-4 lg:pr-[18px] rounded-full inline-flex items-center justify-center gap-2 font-semibold text-[16px] whitespace-nowrap';
  const idle = { background: C.fill, color: C.ink };
  const active = { background: C.inverse, color: C.onInverse };
  return (
    <header className="flex-none flex items-center gap-2 sm:gap-3 px-3 sm:px-5 min-h-[72px]" style={{ background: C.bg, paddingTop: 'env(safe-area-inset-top)' }}>
      {view !== 'board' ? (
        <button type="button" onClick={() => onView('board')} className={btn} style={idle} aria-label={T.backToBoard}>
          <ArrowLeft className="w-5 h-5" strokeWidth={2.2} /> <span className="hidden md:inline">{T.backToBoard}</span>
        </button>
      ) : (
        <span className="hidden md:inline font-bold text-[22px] tracking-[-0.015em] truncate max-w-[260px] mr-1.5" style={{ color: C.ink }}>{restaurantName}</span>
      )}
      <StatusPill state={state} T={T} onClick={onStatus} />
      <span className="flex-1 min-w-0" />
      {(scheduledCount > 0 || view === 'scheduled') && (
        <button type="button" onClick={() => onView('scheduled')} className={btn} aria-label={`${T.scheduled} ${scheduledCount}`}
          style={view === 'scheduled' ? active : idle}>
          <CalendarClock className="w-5 h-5" strokeWidth={2.2} />
          <span className="hidden lg:inline">{T.scheduled}</span>
          <span className="tabular-nums">{scheduledCount}</span>
        </button>
      )}
      <button type="button" onClick={() => onView('history')} className={btn} aria-label={T.history}
        style={view === 'history' ? active : idle}>
        <History className="w-5 h-5" strokeWidth={2.2} /> <span className="hidden lg:inline">{T.history}</span>
      </button>
      {onCustomize && (
        <button type="button" onClick={onCustomize} className={btn} style={idle} aria-label={T.customize}>
          <Palette className="w-5 h-5" strokeWidth={2.2} /> <span className="hidden lg:inline">{T.customize}</span>
        </button>
      )}
      <button type="button" onClick={onMenu} className={btn} style={idle} aria-label={T.menu}>
        <MenuIcon className="w-5 h-5" strokeWidth={2.2} /> <span className="hidden lg:inline">{T.menu}</span>
      </button>
    </header>
  );
}

/** Banda fija mientras el modo demo está activo (los pedidos son de mentira). */
export function DemoBanner({ T, onExit }: { T: CounterText; onExit: () => void }) {
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[70] flex items-center justify-center gap-3 px-4 font-semibold text-[16px]"
      style={{ background: C.inverse, color: C.onInverse, height: 'calc(48px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}>
      <span>{T.demoBanner}</span>
      <button type="button" onClick={onExit} className="h-10 px-4 rounded-full font-semibold"
        style={{ background: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
        {T.demoExit}
      </button>
    </div>
  );
}

/** Estado de la tienda (como la píldora "Open" de Uber): Ocupado y Pausar en un solo lugar. */
export function StoreStatusSheet({
  T, isPaused, pauseLeft, busyExtra, onBusy, onPause, onResume, onClose,
}: {
  T: CounterText; isPaused: boolean; pauseLeft: number; busyExtra: number;
  onBusy: (m: number) => void; onPause: (mins: number) => void; onResume: () => void; onClose: () => void;
}) {
  const opt = 'h-14 rounded-xl font-semibold text-[17px]';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={T.storeStatus}>
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: C.scrim }} onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-[28px] p-6 flex flex-col gap-5" style={RAISED}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-bold tracking-[-0.02em]">{T.storeStatus}</h2>
            <p className="text-[16px] font-medium mt-0.5" style={{ color: isPaused ? C.amber : C.sub }}>
              {isPaused ? T.paused(pauseLeft) : busyExtra > 0 ? T.busy(busyExtra) : T.storeOpen}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={T.close} className="w-12 h-12 rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold" style={{ color: C.sub }}>{T.busyMode}</h3>
          {/* Control segmentado: pista gris, el elegido "levantado". */}
          <div role="radiogroup" aria-label={T.busyMode} className="grid grid-cols-3 gap-0.5 p-1 rounded-2xl" style={{ background: C.fill }}>
            {[0, 10, 20].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={busyExtra === m} onClick={() => onBusy(m)}
                className="h-12 rounded-xl text-[17px] tabular-nums"
                style={busyExtra === m
                  ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                  : { color: C.ink, fontWeight: 500 }}>
                {m === 0 ? T.normal : `+${m} min`}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold" style={{ color: C.sub }}>{T.pauseOrders}</h3>
          {isPaused ? (
            <button type="button" onClick={onResume} className="h-16 rounded-2xl font-semibold text-[20px]" style={{ background: C.accent, color: C.onAccent }}>
              {T.resume}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 30, l: T.min(30) }, { v: 60, l: T.hours(1) }, { v: 120, l: T.hours(2) }, { v: 9999, l: T.untilTomorrow }].map((o) => (
                <button key={o.v} type="button" onClick={() => onPause(o.v)} className={opt} style={{ background: C.fill, color: C.ink }}>
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
    <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 min-[880px]:px-5 pt-2" style={{ background: C.bg }}>
      <div className="flex items-center gap-3">
        <h2 className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: C.ink }}>{mode === 'scheduled' ? T.scheduled : T.history}</h2>
        {mode === 'history' && (
          <input
            id="counter-history-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T.search}
            className="ml-auto h-12 w-full max-w-[360px] rounded-xl px-4 text-[16px] outline-none focus:ring-2"
            style={{ background: C.surface, color: C.ink, boxShadow: `inset 0 0 0 1px ${C.lineStrong}` }}
          />
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-[17px] font-medium" style={{ color: C.sub }}>
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
      style={{ background: tone === 'error' ? C.critical : C.inverse, color: tone === 'error' ? C.onCritical : C.onInverse, marginBottom: 'env(safe-area-inset-bottom)' }}>
      <span className="text-[16px] font-semibold py-2">{text}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="h-12 px-4 rounded-xl font-semibold text-[16px]" style={{ background: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
