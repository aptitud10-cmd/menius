'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, Navigation } from 'lucide-react';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';
import { KindTag } from './KindTag';
import { customerFlagLabel, type CustomerFlag } from '@/lib/customer-incidents';
import { shortOrderNumber } from '@/lib/orders/short-number';
import {
  C, type CounterText, shortName, minsSince, minsLeft, itemCount,
  orderAllergies, money, stripNoteLabel, scheduledWhen, waitingSince,
  PICKUP_WAIT_WARN_MINS,
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

export type TimeLevel = 'plain' | 'warn' | 'late';

/**
 * Tiempo de un pedido y qué tan urgente es (maqueta aprobada 2026-11-21,
 * .specify/docs/counter-auditoria/atrasos-prop.png). Los límites son los de siempre;
 * lo nuevo es cómo se muestra: en ámbar o rojo pasa a ser una ficha que se lee a 1 m.
 * ink = hora pactada de un programado (texto negro, sin alarma).
 */
export function orderTime(order: Order, T: CounterText): { text: string; level: TimeLevel; ink?: boolean } {
  // Terminado (Historial): nada espera. Antes caía al final ("esperando N min") y un pickup
  // entregado pasaba a rojo a los 60 min — y el chequeo de atrasos hacía sonar la alarma.
  if ((['delivered', 'completed', 'cancelled'] as string[]).includes(order.status)) {
    const at = new Date((order.updated_at as string | undefined) ?? order.created_at);
    return { text: at.toLocaleTimeString(T.locale, { hour: 'numeric', minute: '2-digit' }), level: 'plain' };
  }
  if (order.status === 'pending' && order.scheduled_for) {
    // Programado: lo que importa es la hora pactada, no cuándo se hizo el pedido.
    return { text: T.scheduledFor(scheduledWhen(order.scheduled_for, T.locale)), level: 'plain', ink: true };
  }
  if (order.status === 'pending') {
    const m = Math.max(0, Math.floor((Date.now() - waitingSince(order as Order & { updated_at?: string | null })) / 60_000));
    return { text: T.minAgo(m), level: m >= 5 ? 'warn' : 'plain' };
  }
  const pickedUpEarly = (order as Order & { driver_picked_up_at?: string | null }).driver_picked_up_at;
  if (pickedUpEarly && !['delivered', 'completed', 'cancelled'].includes(order.status)) {
    return { text: T.minAgo(minsSince(pickedUpEarly)), level: 'plain' };
  }
  if (['confirmed', 'preparing', 'almost_ready'].includes(order.status)) {
    const left = minsLeft(order);
    if (left == null) return { text: T.minAgo(minsSince(order.created_at)), level: 'plain' };
    if (left < 0) return { text: T.late(-left), level: 'late' };
    return { text: T.readyIn(left), level: left <= 3 ? 'warn' : 'plain' };
  }
  // En camino: no "espera" en el local — cuánto hace que salió, sin alarma.
  const pickedUp = (order as Order & { driver_picked_up_at?: string | null }).driver_picked_up_at;
  if (order.status === 'out_for_delivery' || pickedUp) {
    return { text: T.minAgo(minsSince(pickedUp ?? (order.updated_at as string | undefined) ?? order.created_at)), level: 'plain' };
  }
  const since = minsSince((order.updated_at as string | undefined) ?? order.created_at);
  // Pickup: ámbar a los 15, nunca rojo (a los 30 el cron lo da por retirado). El
  // resto (delivery esperando repartidor) avisa a los 10.
  const level: TimeLevel = order.order_type === 'pickup'
    ? (since >= PICKUP_WAIT_WARN_MINS ? 'warn' : 'plain')
    : (since >= 10 ? 'warn' : 'plain');
  return { text: T.waiting(since), level };
}

/** A tiempo: texto gris al lado del nombre, como siempre. */
function TimeText({ info }: { info: ReturnType<typeof orderTime> }) {
  return (
    <span className="tabular-nums font-semibold text-[16px] whitespace-nowrap" style={{ color: info.ink ? C.ink : C.sub }}>
      {info.text}
    </span>
  );
}

/** Por vencer (ámbar con borde) o atrasado (rojo relleno): ficha en su propia fila. */
function TimeChip({ info }: { info: ReturnType<typeof orderTime> }) {
  const late = info.level === 'late';
  const Icon = late ? AlertTriangle : Clock;
  return (
    <span className="self-start inline-flex items-center gap-1.5 h-9 px-3 rounded-full tabular-nums text-[18px] font-bold whitespace-nowrap"
      style={late
        ? { background: C.critical, color: C.onCritical }
        : { background: C.warnBg, color: C.warnText, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${C.warnText} 35%, transparent)` }}>
      <Icon className="w-[18px] h-[18px] flex-none" strokeWidth={2.4} aria-hidden />
      {info.text.charAt(0).toUpperCase() + info.text.slice(1)}
    </span>
  );
}

/** Barra roja de 6 px a la izquierda de un pedido atrasado. critical (no red): en Oscuro red es rosado y el blanco no se lee. */
const LATE_BAR = `inset 6px 0 0 ${C.critical}`;

/** Pickup en Listo desde hace ≥30 min y sin pago online (eso va por reembolso). */
export function canMarkNoShow(order: Order): boolean {
  if (order.order_type !== 'pickup' || order.status !== 'ready') return false;
  if ((order as { payment_status?: string }).payment_status === 'paid') return false;
  return minsSince((order.updated_at as string | undefined) ?? order.created_at) >= PICKUP_WAIT_WARN_MINS;
}

/**
 * Delivery con repartidor: si todavía lo esperan o si ya va en camino. Sin esto
 * "Listo" y "En camino" se veían iguales y un toque cerraba el pedido con el
 * repartidor todavía en ruta.
 */
function driverInfo(order: Order, T: CounterText, routeStop?: { stop: number; of: number }): { text: string; moving: boolean } | null {
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
  return { text, moving };
}

function DriverLine({ order, T, routeStop }: { order: Order; T: CounterText; routeStop?: { stop: number; of: number } }) {
  const info = driverInfo(order, T, routeStop);
  if (!info) return null;
  const { text, moving } = info;
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
  order, T, currency, acceptMins, busy, onOpen, onPrimary, onNoShow, routeStop,
}: {
  order: Order; T: CounterText; currency: string; acceptMins: number; busy: boolean;
  onOpen: () => void; onPrimary: (kind: PrimaryKind) => void;
  /** Solo en el tablero: "No vino a buscarlo" en un pickup envejecido. */
  onNoShow?: () => void;
  routeStop?: { stop: number; of: number };
}) {
  const isNew = order.status === 'pending';
  const allergies = orderAllergies(order);
  const action = primaryAction(order, T, acceptMins);
  const shortNum = shortOrderNumber(order.order_number);
  const paidOnline = (order as { payment_status?: string }).payment_status === 'paid';
  const time = orderTime(order, T);

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
      style={{ background: C.surface, boxShadow: time.level === 'late' ? LATE_BAR : undefined }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-[22px] leading-tight tracking-[-0.015em] truncate" style={{ color: C.ink }}>
          {shortName(order.customer_name, '—')}
        </span>
        {time.level === 'plain' && <TimeText info={time} />}
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

      {time.level !== 'plain' && <TimeChip info={time} />}

      <CustomerFlagLine order={order} T={T} />
      <DriverLine order={order} T={T} routeStop={routeStop} />

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

      {/* Secundario y callado a propósito: cancela la venta y marca al cliente,
          así que no pesa lo mismo que "Recogido". Se deshace desde el aviso. */}
      {onNoShow && canMarkNoShow(order) && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); onNoShow(); }}
          className="-mt-1 -mb-2 h-11 self-center px-3 text-[16px] font-medium underline underline-offset-4 decoration-1 disabled:opacity-50"
          style={{ color: C.sub }}
        >
          {T.noShow}
        </button>
      )}
    </div>
  );
}

type ColKey = 'new' | 'prep' | 'ready';

/** Ancho de las 3 columnas. Por debajo (tablet parada, celular) va la lista "Ahora". */
const WIDE_QUERY = '(min-width: 880px)';
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => true);
}

/** Pickup en efectivo sin pagar: el mostrador cobra al entregar. */
function collectsAtCounter(order: Order): boolean {
  return order.order_type === 'pickup' && order.payment_method === 'cash'
    && (order as { payment_status?: string }).payment_status !== 'paid';
}

type BoardProps = {
  T: CounterText; currency: string;
  newOrders: Order[]; prepOrders: Order[]; readyOrders: Order[];
  busyIds: Set<string>;
  acceptMinsFor: (o: Order) => number;
  onOpen: (o: Order) => void;
  onPrimary: (o: Order, kind: PrimaryKind) => void;
  onNoShow?: (o: Order) => void;
  routeStops?: Map<string, { stop: number; of: number }>;
};

/**
 * Fila de la lista "Ahora": un pedido que ya se aceptó. Nombre y tiempo arriba;
 * tipo, número y lo que no se puede pasar (alergia, cobrar, repartidor) abajo;
 * el botón de siempre a la derecha (gris: el verde es solo para Aceptar).
 */
function CompactRow({ order, T, currency, busy, fresh, tight, onOpen, onPrimary, onNoShow, routeStop }: {
  order: Order; T: CounterText; currency: string; busy: boolean; fresh?: string;
  /** Columna de la tablet acostada (~400 px): botón más angosto para que el nombre no se corte. */
  tight?: boolean;
  onOpen: () => void; onPrimary: (kind: PrimaryKind) => void; onNoShow?: () => void;
  routeStop?: { stop: number; of: number };
}) {
  const action = primaryAction(order, T, 0);
  const allergies = orderAllergies(order);
  const driver = driverInfo(order, T, routeStop);
  const time = orderTime(order, T);
  return (
    <div
      role="button"
      tabIndex={0}
      data-order-id={order.id}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={cn('flex items-center pr-3 py-3 min-h-[80px] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-black/20',
        tight ? 'gap-2.5 pl-4' : 'gap-3.5 max-[479px]:gap-2.5 pl-5 max-[479px]:pl-4')}
      style={{
        background: fresh ? `color-mix(in srgb, ${C.accent} 12%, ${C.surface})` : C.surface, transition: 'background-color .6s',
        boxShadow: time.level === 'late' ? LATE_BAR : undefined,
      }}
    >
      <div className="flex-1 min-w-0">
        {fresh && (
          <p className="mb-0.5 text-[12px] font-bold uppercase tracking-[.06em]" style={{ color: C.accentText }}>✓ {fresh}</p>
        )}
        <div className="flex items-baseline gap-3">
          <span className="min-w-0 truncate font-bold text-[20px] max-[479px]:text-[18px] leading-tight tracking-[-0.015em]" style={{ color: C.ink }}>
            {shortName(order.customer_name, '—')}
          </span>
          {time.level === 'plain' && <span className="ml-auto shrink-0"><TimeText info={time} /></span>}
        </div>
        <div className="mt-1 flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[16px] font-medium" style={{ color: C.sub }}>
          <KindTag order={order} T={T} />
          <span className="tabular-nums">#{shortOrderNumber(order.order_number)}</span>
          {allergies.length > 0 && (
            // La alergia no se apaga al aceptar: sigue en rojo sólido.
            <span className="max-w-full truncate rounded-lg px-2 py-0.5 text-[15px] font-bold" style={{ background: C.critical, color: C.onCritical }}>
              {T.allergy}: {stripNoteLabel(allergies[0])}
            </span>
          )}
          {collectsAtCounter(order) && order.status === 'ready' && (
            <span className="rounded-lg px-2 py-px text-[15px] font-bold whitespace-nowrap" style={{ color: C.ink, boxShadow: `inset 0 0 0 2px ${C.ink}` }}>
              {T.collect(money(Number(order.total), currency))}
            </span>
          )}
          {driver && (
            <span className="min-w-0 truncate font-semibold" style={{ color: driver.moving ? C.blue : C.sub }}>{driver.text}</span>
          )}
        </div>
        {time.level !== 'plain' && <div className="mt-1.5 flex"><TimeChip info={time} /></div>}
        {onNoShow && canMarkNoShow(order) && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => { e.stopPropagation(); onNoShow(); }}
            className="mt-1 h-9 -ml-1 px-1 text-[15px] font-medium underline underline-offset-4 decoration-1 disabled:opacity-50"
            style={{ color: C.sub }}
          >
            {T.noShow}
          </button>
        )}
      </div>
      {action && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); onPrimary(action.kind); }}
          className={cn('flex-none h-14 rounded-[14px] font-semibold transition-transform active:scale-[.97] disabled:opacity-50',
            tight ? 'w-[104px] text-[16px]' : 'w-[128px] max-[479px]:w-[104px] text-[17px] max-[479px]:text-[16px]')}
          style={{ background: C.fill, color: C.ink }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Lista "Ahora" (tablet parada y celular, Pedro 2026-11-19): antes se veía UNA
 * pestaña y lo aceptado "se escondía" en Preparando/Listos. Ahora todo a la
 * vista, en el orden del trabajo: Nuevos (tarjeta completa) → Preparando →
 * Listos (filas). Lo que acaba de cambiar de sección queda resaltado 3 s.
 * Un pedido nuevo con la lista bajada no la mueve (scroll anchoring del
 * navegador): aparece la píldora "↑ 1 nuevo".
 */
function NarrowList({ T, currency, newOrders, prepOrders, readyOrders, busyIds, acceptMinsFor, onOpen, onPrimary, onNoShow, routeStops }: BoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resaltado de lo que cambió de sección (aceptado → Preparando, listo → Listos).
  const [fresh, setFresh] = useState<Record<string, 'prep' | 'ready'>>({});
  const sectionOf = useRef<Map<string, ColKey> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const now = new Map<string, ColKey>();
    newOrders.forEach((o) => now.set(o.id, 'new'));
    prepOrders.forEach((o) => now.set(o.id, 'prep'));
    readyOrders.forEach((o) => now.set(o.id, 'ready'));
    const prev = sectionOf.current;
    sectionOf.current = now;
    if (!prev) return;
    const moved: [string, 'prep' | 'ready'][] = [];
    now.forEach((sec, id) => {
      const before = prev.get(id);
      if (before && before !== sec && sec !== 'new') moved.push([id, sec]);
    });
    if (moved.length === 0) return;
    setFresh((f) => ({ ...f, ...Object.fromEntries(moved) }));
    timers.current.push(setTimeout(() => setFresh((f) => {
      const n = { ...f };
      moved.forEach(([id]) => { delete n[id]; });
      return n;
    }), 3000));
    // Si quedó fuera de la vista, llevarla a la vista (no se mueve si ya se ve).
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-order-id="${moved[0][0]}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [newOrders, prepOrders, readyOrders]);

  // "↑ 1 nuevo": pedido que entró mientras la lista estaba bajada.
  const [unseen, setUnseen] = useState(0);
  const seenNew = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = newOrders.map((o) => o.id);
    if (!seenNew.current) { seenNew.current = new Set(ids); return; }
    const seen = seenNew.current;
    const added = ids.filter((id) => !seen.has(id));
    ids.forEach((id) => seen.add(id));
    if (added.length > 0 && (scrollRef.current?.scrollTop ?? 0) > 40) setUnseen((u) => u + added.length);
  }, [newOrders]);

  const sections: { key: ColKey; title: string; orders: Order[] }[] = [
    { key: 'new', title: T.colNew, orders: newOrders },
    { key: 'prep', title: T.colPrep, orders: prepOrders },
    { key: 'ready', title: T.colReady, orders: readyOrders },
  ];
  const empty = sections.every((sec) => sec.orders.length === 0);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col" style={{ background: C.bg }}>
      <div
        ref={scrollRef}
        onScroll={(e) => { if (unseen && e.currentTarget.scrollTop < 40) setUnseen(0); }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 max-[479px]:px-3 pb-6"
      >
        {empty ? (
          <p className="px-4 py-16 text-center text-[17px] font-medium" style={{ color: C.sub }}>{T.emptyAll}</p>
        ) : sections.map((sec) => sec.orders.length === 0 ? null : (
          <section key={sec.key} aria-label={sec.title}>
            <h2 className="flex items-center gap-2 px-1.5 pt-4 pb-2.5 text-[14px] font-bold uppercase tracking-[.07em]" style={{ color: C.sub }}>
              {sec.title}
              {sec.key === 'new' ? (
                <span className="tabular-nums min-w-[24px] h-[24px] px-1.5 rounded-full text-[14px] font-semibold inline-flex items-center justify-center"
                  style={{ background: C.accent, color: C.onAccent }}>{sec.orders.length}</span>
              ) : (
                <span className="tabular-nums" style={{ color: C.ink }}>{sec.orders.length}</span>
              )}
            </h2>
            {sec.key === 'new' ? (
              <div className="flex flex-col gap-3">
                {sec.orders.map((o) => (
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
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] overflow-hidden flex flex-col gap-px" style={{ background: C.line }}>
                {sec.orders.map((o) => (
                  <CompactRow
                    key={o.id}
                    order={o}
                    T={T}
                    currency={currency}
                    busy={busyIds.has(o.id)}
                    fresh={fresh[o.id] === 'prep' ? T.justAccepted : fresh[o.id] === 'ready' ? T.justReady : undefined}
                    onOpen={() => onOpen(o)}
                    onPrimary={(kind) => onPrimary(o, kind)}
                    onNoShow={onNoShow ? () => onNoShow(o) : undefined}
                    routeStop={routeStops?.get(o.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      {unseen > 0 && (
        <button
          type="button"
          onClick={() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); setUnseen(0); }}
          className="absolute left-1/2 -translate-x-1/2 top-3 h-11 px-5 rounded-full text-[16px] font-bold shadow-lg"
          style={{ background: C.accent, color: C.onAccent }}
        >
          ↑ {T.newAbove(unseen)}
        </button>
      )}
    </div>
  );
}

export function CounterBoard(props: BoardProps) {
  const wide = useWide();
  if (!wide) return <NarrowList {...props} />;
  return <WideBoard {...props} />;
}

/** Tablet acostada (≥880 px): las 3 columnas de siempre. */
function WideBoard({ T, currency, newOrders, prepOrders, readyOrders, busyIds, acceptMinsFor, onOpen, onPrimary, onNoShow, routeStops }: BoardProps) {
  const cols: { key: ColKey; title: string; empty: string; orders: Order[] }[] = [
    { key: 'new', title: T.colNew, empty: T.emptyNew, orders: newOrders },
    { key: 'prep', title: T.colPrep, empty: T.emptyPrep, orders: prepOrders },
    { key: 'ready', title: T.colReady, empty: T.emptyReady, orders: readyOrders },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: C.bg }}>
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-5 px-5 pt-2">
        {cols.map((c) => (
          <section key={c.key} aria-label={c.title} className="min-h-0 flex flex-col">
            <header className="flex items-baseline gap-2.5 px-1 pb-3.5">
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
              ) : c.key === 'new' ? (
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
              ) : (
                // Mismas filas que la tablet parada: Preparando y Listos se leen igual en las dos posiciones.
                <div className="shrink-0 rounded-[22px] overflow-hidden flex flex-col gap-px" style={{ background: C.line }}>
                  {c.orders.map((o) => (
                    <CompactRow
                      key={o.id}
                      order={o}
                      T={T}
                      currency={currency}
                      busy={busyIds.has(o.id)}
                      tight
                      onOpen={() => onOpen(o)}
                      onPrimary={(kind) => onPrimary(o, kind)}
                      onNoShow={onNoShow ? () => onNoShow(o) : undefined}
                      routeStop={routeStops?.get(o.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
