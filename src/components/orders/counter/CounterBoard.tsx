'use client';

import { useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, MapPin, Navigation } from 'lucide-react';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';
import { KindTag } from './KindTag';
import { customerFlagLabel, type CustomerFlag } from '@/lib/customer-incidents';
import {
  C, type CounterText, shortName, minsSince, minsLeft, itemCount,
  orderAllergies, money, stripNoteLabel, scheduledWhen, waitingSince,
} from './ui';

export type PrimaryKind = 'accept' | 'ready' | 'serve' | 'dispatch' | 'deliver' | 'complete';

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
      // Delivery: "Salió" → el cliente recibe "va en camino" aunque el
      // repartidor no use su página (si la usa, su "Recogí" hace lo mismo).
      if (order.order_type === 'delivery') return { kind: 'dispatch', label: T.dispatched };
      return { kind: 'deliver', label: T.pickedUp };
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
    return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: C.ink }}>{T.scheduledFor(scheduledWhen(order.scheduled_for, T.locale))}</span>;
  }
  if (order.status === 'pending') {
    const m = Math.max(0, Math.floor((Date.now() - waitingSince(order as Order & { updated_at?: string | null })) / 60_000));
    return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: m >= 5 ? C.amber : C.sub }}>{T.minAgo(m)}</span>;
  }
  const pickedUpEarly = (order as Order & { driver_picked_up_at?: string | null }).driver_picked_up_at;
  if (pickedUpEarly && !['delivered', 'completed', 'cancelled'].includes(order.status)) {
    return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: C.sub }}>{T.minAgo(minsSince(pickedUpEarly))}</span>;
  }
  if (['confirmed', 'preparing', 'almost_ready'].includes(order.status)) {
    const left = minsLeft(order);
    if (left == null) return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: C.sub }}>{T.minAgo(minsSince(order.created_at))}</span>;
    if (left < 0) return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: C.red }}>{T.late(-left)}</span>;
    return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: left <= 3 ? C.amber : C.sub }}>{T.readyIn(left)}</span>;
  }
  // En camino: no "espera" en el local — cuánto hace que salió, sin alarma.
  const pickedUp = (order as Order & { driver_picked_up_at?: string | null }).driver_picked_up_at;
  if (order.status === 'out_for_delivery' || pickedUp) {
    const m = minsSince(pickedUp ?? (order.updated_at as string | undefined) ?? order.created_at);
    return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: C.sub }}>{T.minAgo(m)}</span>;
  }
  const since = minsSince((order.updated_at as string | undefined) ?? order.created_at);
  return <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: since >= 10 ? C.amber : C.sub }}>{T.waiting(since)}</span>;
}

/**
 * Delivery con repartidor: si todavía lo esperan o si ya va en camino. Sin esto
 * "Listo" y "En camino" se veían iguales y un toque cerraba el pedido con el
 * repartidor todavía en ruta.
 */
function DriverLine({ order, T, routeStop }: { order: Order; T: CounterText; routeStop?: { stop: number; of: number } }) {
  if (order.order_type !== 'delivery') return null;
  if (['delivered', 'completed', 'cancelled'].includes(order.status)) return null;
  const o = order as Order & { driver_picked_up_at?: string | null; driver_at_door_at?: string | null };
  // Repartidor que escaneó el QR sin que lo asignaran en la tablet: no tiene
  // nombre, pero sus marcas (recogí / en la puerta) sí — antes no se veía.
  if (!order.driver_name && !o.driver_picked_up_at && !o.driver_at_door_at) return null;
  const name = order.driver_name ? shortName(order.driver_name, order.driver_name) : T.driver;
  const base = o.driver_at_door_at ? `${T.driverAtDoor} · ${name}`
    : o.driver_picked_up_at || order.status === 'out_for_delivery' ? `${T.driverOnWay} · ${name}`
    : T.driverWaiting(name);
  const text = routeStop ? `${base} · ${T.routeStop(routeStop.stop, routeStop.of)}` : base;
  const moving = !!(o.driver_at_door_at || o.driver_picked_up_at || order.status === 'out_for_delivery');
  // Sin relleno: en camino / en la puerta en azul con ícono; esperando, en gris.
  return (
    <p className="flex items-center gap-2 text-[16px] font-semibold leading-snug" style={{ color: moving ? C.blue : C.sub }}>
      {moving && <Navigation className="w-4 h-4 flex-none" fill="currentColor" aria-hidden />}
      <span className="min-w-0">{text}</span>
    </p>
  );
}

/**
 * Cliente marcado (customer-incidents): un pedido anterior no lo recibió o no
 * lo pagó. El restaurante decide si llamar, aceptar o rechazar.
 */
export function CustomerFlagLine({ order, T, size = 'md' }: { order: Order; T: CounterText; size?: 'md' | 'lg' }) {
  const flag = (order as Order & { customer_flag?: CustomerFlag | null }).customer_flag;
  if (!flag || flag.incident_count <= 0 || order.status === 'cancelled') return null;
  const lg = size === 'lg';
  return (
    <p className={lg
      ? 'flex items-center gap-2.5 rounded-[14px] px-4 py-3 text-[18px] min-[880px]:text-[19px] font-semibold leading-snug'
      : 'flex items-center gap-2 rounded-xl px-3 py-2.5 text-[16px] font-semibold leading-snug'}
      style={{ background: C.warnBg, color: C.warnText, boxShadow: `inset ${lg ? 4 : 3}px 0 0 ${C.warnBar}` }}>
      <AlertTriangle className={lg ? 'w-[22px] h-[22px] flex-none' : 'w-[18px] h-[18px] flex-none'} strokeWidth={2.4} aria-hidden />
      <span className="min-w-0">{customerFlagLabel(flag, T.locale.startsWith('en'))}</span>
    </p>
  );
}

/** Pickup: el cliente tocó "Ya llegué" en su seguimiento. */
function ArrivedLine({ order, T }: { order: Order; T: CounterText }) {
  if (order.order_type !== 'pickup' || !order.customer_arrived_at) return null;
  if (['delivered', 'completed', 'cancelled'].includes(order.status)) return null;
  return (
    // Pide acción: lleva fondo, pero no sólido.
    <p className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[16px] font-semibold"
      style={{ background: `color-mix(in srgb, ${C.violet} 12%, ${C.surface})`, color: C.violet }}>
      <MapPin className="w-[18px] h-[18px] flex-none" strokeWidth={2.4} aria-hidden />
      {T.customerArrived}
    </p>
  );
}

/**
 * Alergia: el ÚNICO bloque rojo sólido de la pantalla, igual en Claro y Oscuro.
 * Tiene que verse a dos metros.
 */
export function AllergyBlock({ T, text, size = 'md' }: { T: CounterText; text: string; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <p className={cn('flex items-start gap-2 rounded-xl font-semibold leading-snug', lg ? 'px-4 py-3 text-[19px]' : 'px-3 py-2.5 text-[17px]')}
      style={{ background: C.critical, color: C.onCritical }}>
      <AlertOctagon className={cn('flex-none mt-px', lg ? 'w-[22px] h-[22px]' : 'w-[19px] h-[19px]')} strokeWidth={2.4} aria-hidden />
      <span className="min-w-0"><b className="font-bold">{T.allergy}:</b> {stripNoteLabel(text)}</span>
    </p>
  );
}

export function OrderCard({
  order, T, currency, acceptMins, busy, onOpen, onPrimary, routeStop,
}: {
  order: Order; T: CounterText; currency: string; acceptMins: number; busy: boolean;
  onOpen: () => void; onPrimary: (kind: PrimaryKind) => void;
  routeStop?: { stop: number; of: number };
}) {
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
        // shrink-0: en la columna con scroll, el WebView de la tablet (Tab A11) encogía
        // las tarjetas a ~28 px y el botón quedaba encima de la siguiente.
        'relative shrink-0 rounded-[22px] px-5 pt-[18px] pb-5 flex flex-col gap-3 text-left cursor-pointer outline-none',
        'focus-visible:ring-4 focus-visible:ring-black/20',
      )}
      // Siempre la misma superficie: lo "nuevo" lo dicen el botón Aceptar y el contador de la columna.
      style={{ background: C.surface }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-[22px] leading-tight tracking-[-0.015em] truncate" style={{ color: C.ink }}>
          {shortName(order.customer_name, '—')}
        </span>
        <TimeBadge order={order} T={T} />
      </div>

      {/* El total va fijo a la derecha (sin "·"): así la fila no se parte por un total
          largo en el celular, y si algo baja de línea nunca empieza con un punto suelto. */}
      <div className="flex items-start justify-between gap-3 text-[16px] max-[479px]:text-[15px] font-medium" style={{ color: C.sub }}>
        {/* En el celular la fila puede partirse: sin "·" (separa el espacio), para que
            ninguna línea empiece con un punto suelto. */}
        <div className="min-w-0 flex items-center gap-x-2 max-[479px]:gap-x-2.5 gap-y-0.5 flex-wrap">
          <KindTag order={order} T={T} />
          <span className="tabular-nums">#{shortNum}</span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap"><span aria-hidden className="max-[479px]:hidden" style={{ color: C.faint }}>·</span>{T.items(itemCount(order))}</span>
          {paidOnline && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 flex-none" strokeWidth={2.4} aria-hidden />{T.paidOnline}
            </span>
          )}
        </div>
        {isNew && (
          <span className="shrink-0 tabular-nums font-semibold whitespace-nowrap" style={{ color: C.ink }}>{money(Number(order.total), currency)}</span>
        )}
      </div>

      <CustomerFlagLine order={order} T={T} />
      <DriverLine order={order} T={T} routeStop={routeStop} />
      <ArrivedLine order={order} T={T} />

      {allergies.length > 0 && <AllergyBlock T={T} text={allergies[0]} />}

      {action && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); onPrimary(action.kind); }}
          className="mt-0.5 h-[52px] rounded-[14px] font-semibold text-[18px] transition-transform active:scale-[.98] disabled:opacity-50"
          style={action.kind === 'accept'
            ? { background: C.accent, color: C.onAccent }
            : { background: C.fill, color: C.ink }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type ColKey = 'new' | 'prep' | 'ready';

export function CounterBoard({
  T, currency, newOrders, prepOrders, readyOrders, busyIds, acceptMinsFor, onOpen, onPrimary, routeStops,
}: {
  T: CounterText; currency: string;
  newOrders: Order[]; prepOrders: Order[]; readyOrders: Order[];
  busyIds: Set<string>;
  acceptMinsFor: (o: Order) => number;
  onOpen: (o: Order) => void;
  onPrimary: (o: Order, kind: PrimaryKind) => void;
  routeStops?: Map<string, { stop: number; of: number }>;
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
      {/* Selector de columna (solo angosto): control segmentado */}
      <div className="min-[880px]:hidden px-4 pt-2">
        <div role="tablist" className="flex gap-0.5 p-1 rounded-2xl" style={{ background: C.fill }}>
          {cols.map((c) => {
            const on = mobileCol === c.key;
            return (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMobileCol(c.key)}
                className="flex-auto min-w-0 h-11 px-2 max-[379px]:px-1 rounded-xl text-[16px] max-[379px]:text-[15px] flex items-center justify-center gap-1.5 max-[379px]:gap-1"
                style={on
                  ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                  : { color: C.ink, fontWeight: 500 }}
              >
                <span className="truncate">{c.title}</span>
                {c.key === 'new' && c.orders.length > 0 ? (
                  <span className="flex-none tabular-nums min-w-[24px] h-[24px] px-1.5 rounded-full text-[14px] font-semibold inline-flex items-center justify-center"
                    style={{ background: C.accent, color: C.onAccent }}>
                    {c.orders.length}
                  </span>
                ) : (
                  <span className="flex-none tabular-nums font-medium" style={{ color: C.sub }}>{c.orders.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 min-[880px]:grid-cols-3 gap-5 px-4 min-[880px]:px-5 pt-3 min-[880px]:pt-2">
        {cols.map((c) => (
          <section key={c.key} aria-label={c.title} className={cn('min-h-0 flex-col', mobileCol === c.key ? 'flex' : 'hidden min-[880px]:flex')}>
            <header className="hidden min-[880px]:flex items-baseline gap-2.5 px-1 pb-3.5">
              <h2 className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: C.ink }}>{c.title}</h2>
              {c.key === 'new' && c.orders.length > 0 ? (
                <span className="self-center tabular-nums min-w-[26px] h-[26px] px-2 rounded-full text-[16px] font-semibold inline-flex items-center justify-center"
                  style={{ background: C.accent, color: C.onAccent }}>
                  {c.orders.length}
                </span>
              ) : (
                <span className="tabular-nums text-[24px] font-medium tracking-[-0.02em]" style={{ color: C.sub }}>{c.orders.length}</span>
              )}
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-3 pb-4">
              {c.orders.length === 0 ? (
                <p className="px-4 py-10 text-center text-[17px] font-medium" style={{ color: C.sub }}>
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
                    routeStop={routeStops?.get(o.id)}
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
