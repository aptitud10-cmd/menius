'use client';

import { useEffect, useRef, useState } from 'react';
import type { Order } from '@/types';
import {
  C, type CounterText, PREP_CHOICES, money, scheduledWhen, parseItem, isAllergyText, stripNoteLabel,
} from './ui';
import { KindTag } from './KindTag';
import { AllergyBlock } from './CounterBoard';

/**
 * Una sola alerta para todos los pedidos que llegan (estilo Uber, pero con el
 * pedido ya visible y aceptación en un toque). Muestra "N pedidos nuevos · 1 de N":
 * al aceptar o rechazar, aparece el siguiente aquí mismo. "Ver todos" cierra la
 * alerta y deja los pedidos como tarjetas en la columna Nuevos.
 * Nunca acepta solo, salvo que esta tablet tenga activado auto-aceptar.
 *
 * Diseño: la alarma del Reloj de iOS — fondo neutro, tipografía grande, un solo
 * botón de color. Para que se note desde lejos, al entrar un pedido el FONDO se
 * pone del color de acento ~2 s y se desvanece a la vista sobria. El pedido y
 * "Aceptar" se ven y se tocan desde el primer instante (el color va detrás).
 */
export function NewOrdersAlert({
  queue, T, currency, defaultMins, autoAcceptSecs, onAccept, onReject, onSeeAll,
}: {
  queue: Order[];
  T: CounterText;
  currency: string;
  defaultMins: (o: Order) => number;
  /** null = auto-aceptar apagado (por defecto). */
  autoAcceptSecs: number | null;
  onAccept: (o: Order, mins: number) => void;
  onReject: (o: Order) => void;
  onSeeAll: () => void;
}) {
  const order = queue[0];

  // Destello: al abrirse la alerta (estado inicial) y cada vez que llegan más pedidos.
  const [flash, setFlash] = useState({ key: 0, on: true });
  const prevLen = useRef(queue.length);
  useEffect(() => {
    if (queue.length > prevLen.current) setFlash((f) => ({ key: f.key + 1, on: true }));
    prevLen.current = queue.length;
  }, [queue.length]);
  useEffect(() => {
    if (!flash.on) return;
    const id = setTimeout(() => setFlash((f) => ({ ...f, on: false })), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T.newOrders(queue.length)}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: flash.on ? C.accent : C.bg,
        color: C.ink,
        top: 'var(--demo-offset, 0px)',
        transition: 'background-color .4s ease-out',
      }}
    >
      {/* key: cada pedido arranca con su propio tiempo y su propio contador */}
      <AlertBody
        key={order.id}
        order={order}
        index={1}
        total={queue.length}
        T={T}
        currency={currency}
        initialMins={defaultMins(order)}
        autoAcceptSecs={autoAcceptSecs}
        onAccept={onAccept}
        onReject={onReject}
        onSeeAll={onSeeAll}
        flashing={flash.on}
      />
    </div>
  );
}

/** Cuánto dura el fondo de color al entrar un pedido (después se desvanece en 400 ms). */
const FLASH_MS = 2000;

function AlertBody({
  order, index, total, T, currency, initialMins, autoAcceptSecs, onAccept, onReject, onSeeAll, flashing,
}: {
  order: Order; index: number; total: number; T: CounterText; currency: string;
  initialMins: number; autoAcceptSecs: number | null;
  onAccept: (o: Order, mins: number) => void; onReject: (o: Order) => void; onSeeAll: () => void;
  /** Fondo en color de acento: el texto que va directo sobre el fondo pasa a onAccent. */
  flashing: boolean;
}) {
  // Texto apoyado directo en el fondo (no en tarjetas): legible sobre el acento y sobre el gris.
  const onBg = (normal: string) => ({ color: flashing ? C.onAccent : normal, transition: 'color .4s' });
  const [mins, setMins] = useState(initialMins);
  const [left, setLeft] = useState<number | null>(autoAcceptSecs);
  const [fired, setFired] = useState(false);
  const items = (order.items ?? []).map(parseItem);
  const paidOnline = (order as { payment_status?: string }).payment_status === 'paid';

  useEffect(() => {
    if (left == null) return;
    if (left <= 0) {
      if (!fired) { setFired(true); onAccept(order, mins); }
      return;
    }
    const id = setTimeout(() => setLeft((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [left, fired, onAccept, order, mins]);

  const choices = PREP_CHOICES.includes(mins as (typeof PREP_CHOICES)[number])
    ? PREP_CHOICES
    : ([...PREP_CHOICES, mins].sort((a, b) => a - b) as number[]);

  return (
    <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] min-[880px]:grid-rows-1 min-[880px]:grid-cols-[1fr_420px] gap-5 min-[880px]:gap-7 p-5 min-[880px]:p-7"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>

      {/* Pedido */}
      <div className="min-h-0 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center h-10 px-[18px] rounded-full text-[19px] font-semibold tabular-nums"
            style={flashing
              ? { background: C.onAccent, color: C.accent, transition: 'background-color .4s, color .4s' }
              : { background: C.accent, color: C.onAccent, transition: 'background-color .4s, color .4s' }}>
            {T.newOrders(total)}
          </span>
          {total > 1 && <span className="text-[19px] font-medium tabular-nums" style={onBg(C.sub)}>{T.ofN(index, total)}</span>}
        </div>

        <h1 className="mt-1 font-bold leading-[1.05] tracking-[-0.03em] text-[40px] min-[880px]:text-[56px] break-words" style={onBg(C.ink)}>
          {order.customer_name || '—'}
        </h1>

        <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[19px] min-[880px]:text-[22px] font-medium" style={onBg(C.ink)}>
          <KindTag order={order} T={T} size="lg" color={flashing ? C.onAccent : undefined} />
          <span className="tabular-nums">{money(Number(order.total), currency)}</span>
          <span aria-hidden style={onBg(C.faint)}>·</span>
          <span>{paidOnline ? T.paidOnline : T.cash}</span>
        </div>
        {order.scheduled_for && (
          <p className="self-start text-[18px] min-[880px]:text-[20px] font-semibold rounded-xl px-3.5 py-1.5" style={{ background: C.fill, color: C.ink }}>
            {T.scheduledFor(scheduledWhen(order.scheduled_for, T.locale))}
          </p>
        )}
        {order.delivery_address && (
          <p className="-mt-1 text-[18px] min-[880px]:text-[20px] font-medium leading-snug" style={onBg(C.sub)}>{order.delivery_address}</p>
        )}

        {order.notes?.trim() && (isAllergyText(order.notes)
          ? <AllergyBlock T={T} text={order.notes} size="lg" />
          : (
            <p className="text-[18px] min-[880px]:text-[19px] font-semibold rounded-[14px] px-4 py-2.5 leading-snug" style={{ background: C.surface, color: C.ink }}>
              <span className="font-medium" style={{ color: C.sub }}>{T.orderNote}:</span> {stripNoteLabel(order.notes)}
            </p>
          ))}

        <ul className="mt-1.5 min-h-0 overflow-y-auto overscroll-contain rounded-[22px] px-5 min-[880px]:px-6 pt-1.5 flex flex-col" style={{ background: C.surface }}>
          {items.map((it, i) => (
            <li key={i} className={`py-3.5 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: C.line }}>
              <p className="flex items-baseline justify-between gap-4 text-[20px] min-[880px]:text-[24px] font-semibold tracking-[-0.015em] leading-snug">
                <span className="min-w-0"><span className="tabular-nums" style={{ color: C.sub }}>{it.qty}×</span> {it.name}{it.variant ? ` · ${it.variant}` : ''}</span>
                <span className="tabular-nums font-medium tracking-normal text-[17px] min-[880px]:text-[19px] shrink-0" style={{ color: C.sub }}>
                  {money(it.lines.length + it.extras.length > 0 ? it.basePrice : it.lineTotal, currency)}
                </span>
              </p>
              {/* Una línea por cosa, como se dice en la cocina, con su precio (lib/modifier-lines). */}
              {[...it.lines, ...it.extras.map((e) => ({ text: `+ ${e.name}`, price: e.price, indent: false }))].map((line, k) => (
                <p key={k} className={`flex justify-between gap-4 text-[17px] min-[880px]:text-[19px] font-normal leading-[1.45] ${line.indent ? 'pl-14 min-[880px]:pl-16' : 'pl-8 min-[880px]:pl-10'}`} style={{ color: C.sub }}>
                  <span className="min-w-0">{line.text}</span>
                  {line.price > 0 && <span className="tabular-nums shrink-0">{money(line.price, currency)}</span>}
                </p>
              ))}
              {it.notes && (isAllergyText(it.notes) ? (
                <p className="mt-1.5 ml-8 min-[880px]:ml-10 inline-flex rounded-[10px] px-3 py-1 text-[17px] min-[880px]:text-[19px] font-semibold"
                  style={{ background: C.critical, color: C.onCritical }}>
                  <span><b className="font-bold">{T.allergy}:</b> {stripNoteLabel(it.notes)}</span>
                </p>
              ) : (
                <p className="mt-1 ml-8 min-[880px]:ml-10 text-[17px] min-[880px]:text-[19px] font-semibold" style={{ color: C.ink }}>
                  <span className="font-medium" style={{ color: C.sub }}>{T.note}:</span> {stripNoteLabel(it.notes)}
                </p>
              ))}
            </li>
          ))}
          {/* Borde de scroll: la lista se desvanece abajo en vez de cortar una línea por la mitad. */}
          <li aria-hidden className="sticky bottom-0 -mt-3 h-8 shrink-0 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${C.surface})` }} />
        </ul>
      </div>

      {/* Decisión */}
      <div className="self-end min-[880px]:self-start rounded-[28px] p-5 min-[880px]:p-6 flex flex-col gap-4 min-[880px]:gap-[18px] min-h-0" style={{ background: C.surface, color: C.ink }}>
        <p className="text-[17px] min-[880px]:text-[19px] font-semibold tracking-[-0.01em]">{T.readyQuestion}</p>
        <div className="grid grid-cols-5 gap-0.5 p-1 rounded-2xl" role="radiogroup" aria-label={T.readyQuestion} style={{ background: C.fill }}>
          {choices.slice(0, 5).map((c) => {
            const on = mins === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { setMins(c); setLeft(autoAcceptSecs); }}
                className="h-16 min-[880px]:h-[72px] rounded-xl flex flex-col items-center justify-center text-[24px] min-[880px]:text-[26px] tracking-[-0.02em] tabular-nums leading-none"
                style={on
                  ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                  : { color: C.ink, fontWeight: 500 }}
              >
                {c}
                <span className="text-[13px] font-medium tracking-normal mt-1" style={{ color: on ? C.ink : C.sub }}>min</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => { if (!fired) { setFired(true); onAccept(order, mins); } }}
          className="mt-1.5 h-[80px] min-[880px]:h-[92px] rounded-[20px] font-semibold text-[26px] min-[880px]:text-[28px] tracking-[-0.015em] transition-transform active:scale-[.98]"
          style={{ background: C.accent, color: C.onAccent }}
        >
          {T.acceptMin(mins)}
        </button>
        {left != null && left > 0 && (
          <p className="text-center text-[15px] font-medium -mt-1" style={{ color: C.sub }}>{T.autoAcceptIn(left)}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onSeeAll}
            className="h-14 min-[880px]:h-[60px] rounded-2xl font-semibold text-[17px] min-[880px]:text-[18px]" style={{ background: C.fill, color: C.ink }}>
            {T.seeAll}
          </button>
          <button type="button" onClick={() => onReject(order)}
            className="h-14 min-[880px]:h-[60px] rounded-2xl font-semibold text-[17px] min-[880px]:text-[18px]" style={{ background: C.fill, color: C.destructive }}>
            {T.reject}
          </button>
        </div>
      </div>
    </div>
  );
}
