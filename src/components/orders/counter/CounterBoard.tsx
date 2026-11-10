'use client';

import { useState } from 'react';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';
import { KindTag } from './KindTag';
import {
  C, type CounterText, orderKind, shortName, minsSince, minsLeft, itemCount,
  orderAllergies, money, stripNoteLabel, scheduledWhen,
} from './ui';

export type PrimaryKind = 'accept' | 'ready' | 'serve' | 'deliver' | 'complete';

/** La única acción principal de cada estado. Siempre la misma etiqueta y lugar. */
export function primaryAction(order: Order, T: CounterText, acceptMins: number): { kind: PrimaryKind; label: string } | null {
  const dineIn = order.order_type === 'dine_in';
  switch (order.status) {
    case 'pending':
      return { kind: 'accept', label: T.acceptMin(acceptMins) };
    case 'confirmed':
    case 'preparing':
    case 'almost_ready':
      return dineIn ? { kind: 'serve', label: T.serve } : { kind: 'ready', label: T.ready };
    case 'ready':
      if (dineIn) return { kind: 'serve', label: T.serve };
      return { kind: 'deliver', label: order.order_type === 'pickup' ? T.pickedUp : T.delivered };
    case 'out_for_delivery':
      return { kind: 'deliver', label: T.delivered };
    case 'served':
      return { kind: 'complete', label: T.closeTable };
    default:
      return null;
  }
}

function TimeBadge({ order, T }: { order: Order; T: CounterText }) {
  if (order.status === 'pending' && order.scheduled_for) {
    // Programado: lo que importa es la hora pactada, no cuándo se hizo el pedido.
    return <span className="tabular-nums font-extrabold text-[16px]" style={{ color: C.ink }}>{T.scheduledFor(scheduledWhen(order.scheduled_for))}</span>;
  }
  if (order.status === 'pending') {
    const m = minsSince(order.created_at);
    return <span className="tabular-nums font-bold text-[16px]" style={{ color: m >= 5 ? C.amber : C.sub }}>{T.minAgo(m)}</span>;
  }
  if (['confirmed', 'preparing', 'almost_ready'].includes(order.status)) {
    const left = minsLeft(order);
    if (left == null) return <span className="tabular-nums font-bold text-[16px]" style={{ color: C.sub }}>{T.minAgo(minsSince(order.created_at))}</span>;
    if (left < 0) return <span className="tabular-nums font-extrabold text-[16px]" style={{ color: C.red }}>{T.late(-left)}</span>;
    return <span className="tabular-nums font-bold text-[16px]" style={{ color: left <= 3 ? C.amber : C.sub }}>{T.readyIn(left)}</span>;
  }
  const since = minsSince((order.updated_at as string | undefined) ?? order.created_at);
  return <span className="tabular-nums font-bold text-[16px]" style={{ color: since >= 10 ? C.amber : C.sub }}>{T.waiting(since)}</span>;
}

export function OrderCard({
  order, T, currency, acceptMins, busy, onOpen, onPrimary,
}: {
  order: Order; T: CounterText; currency: string; acceptMins: number; busy: boolean;
  onOpen: () => void; onPrimary: (kind: PrimaryKind) => void;
}) {
  const kind = orderKind(order);
  const isNew = order.status === 'pending';
  const allergies = orderAllergies(order);
  const action = primaryAction(order, T, acceptMins);
  const shortNum = order.order_number?.split('-').pop() ?? '';
  const paidOnline = (order as { payment_status?: string }).payment_status === 'paid';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={cn(
        'relative rounded-2xl pl-5 pr-4 pt-3.5 pb-3.5 flex flex-col gap-2.5 text-left cursor-pointer transition-colors outline-none',
        'focus-visible:ring-4 focus-visible:ring-black/20',
      )}
      style={{
        background: isNew ? C.greenSoft : C.surface,
        boxShadow: isNew ? `inset 0 0 0 2px ${C.green}` : undefined,
      }}
    >
      {/* Borde del tipo de pedido: se reconoce sin leer */}
      <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full" style={{ background: kind.color }} />

      <div className="flex items-baseline justify-between gap-3">
        <span className="font-extrabold text-[22px] leading-tight tracking-tight truncate" style={{ color: C.ink }}>
          {shortName(order.customer_name, '—')}
        </span>
        <TimeBadge order={order} T={T} />
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[15px]" style={{ color: C.sub }}>
        <KindTag order={order} T={T} />
        <span className="tabular-nums">#{shortNum}</span>
        <span aria-hidden>·</span>
        <span>{T.items(itemCount(order))}</span>
        {isNew && <><span aria-hidden>·</span><span className="tabular-nums font-semibold" style={{ color: C.ink }}>{money(Number(order.total), currency)}</span></>}
        {paidOnline && <span className="text-[13px] font-bold px-2 py-0.5 rounded-md" style={{ background: C.greenSoft, color: C.greenDeep }}>{T.paidOnline}</span>}
      </div>

      {allergies.length > 0 && (
        <p className="text-[15px] font-extrabold rounded-lg px-2.5 py-1.5 leading-snug" style={{ background: C.redSoft, color: C.red }}>
          {T.allergy}: {stripNoteLabel(allergies[0])}
        </p>
      )}

      {action && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); onPrimary(action.kind); }}
          className="h-14 rounded-xl font-extrabold text-[18px] transition-transform active:scale-[.98] disabled:opacity-50"
          style={action.kind === 'accept'
            ? { background: C.green, color: C.greenInk }
            : { background: C.black, color: '#fff' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type ColKey = 'new' | 'prep' | 'ready';

export function CounterBoard({
  T, currency, newOrders, prepOrders, readyOrders, busyIds, acceptMinsFor, onOpen, onPrimary,
}: {
  T: CounterText; currency: string;
  newOrders: Order[]; prepOrders: Order[]; readyOrders: Order[];
  busyIds: Set<string>;
  acceptMinsFor: (o: Order) => number;
  onOpen: (o: Order) => void;
  onPrimary: (o: Order, kind: PrimaryKind) => void;
}) {
  // En pantallas angostas (tablet vertical, celular) se ve una columna a la vez.
  const [mobileCol, setMobileCol] = useState<ColKey>('new');
  const cols: { key: ColKey; title: string; empty: string; orders: Order[] }[] = [
    { key: 'new', title: T.colNew, empty: T.emptyNew, orders: newOrders },
    { key: 'prep', title: T.colPrep, empty: T.emptyPrep, orders: prepOrders },
    { key: 'ready', title: T.colReady, empty: T.emptyReady, orders: readyOrders },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: C.bg }}>
      {/* Selector de columna (solo angosto) */}
      <div className="min-[880px]:hidden flex gap-2 px-4 pt-3">
        {cols.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setMobileCol(c.key)}
            className="flex-1 h-12 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2"
            style={mobileCol === c.key ? { background: C.black, color: '#fff' } : { background: C.surface, color: C.ink }}
          >
            {c.title}
            <span
              className="tabular-nums min-w-[26px] h-[26px] px-1.5 rounded-full text-[14px] font-extrabold inline-flex items-center justify-center"
              style={c.key === 'new' && c.orders.length > 0
                ? { background: C.green, color: C.greenInk }
                : { background: mobileCol === c.key ? 'rgba(255,255,255,.2)' : C.surface2 }}
            >
              {c.orders.length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 min-[880px]:grid-cols-3 gap-4 px-4 pt-3 min-[880px]:pt-4">
        {cols.map((c) => (
          <section key={c.key} aria-label={c.title} className={cn('min-h-0 flex-col', mobileCol === c.key ? 'flex' : 'hidden min-[880px]:flex')}>
            <header className="hidden min-[880px]:flex items-center gap-2.5 px-1 pb-3">
              <h2 className="text-[18px] font-extrabold" style={{ color: C.ink }}>{c.title}</h2>
              <span
                className="tabular-nums min-w-[28px] h-7 px-2 rounded-full text-[15px] font-extrabold inline-flex items-center justify-center"
                style={c.key === 'new' && c.orders.length > 0 ? { background: C.green, color: C.greenInk } : { background: C.surface2, color: C.ink }}
              >
                {c.orders.length}
              </span>
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-3 pb-4">
              {c.orders.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed px-4 py-8 text-center text-[16px] font-semibold" style={{ borderColor: C.line, color: C.faint }}>
                  {c.empty}
                </p>
              ) : (
                c.orders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    T={T}
                    currency={currency}
                    acceptMins={acceptMinsFor(o)}
                    busy={busyIds.has(o.id)}
                    onOpen={() => onOpen(o)}
                    onPrimary={(kind) => onPrimary(o, kind)}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
