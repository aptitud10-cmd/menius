'use client';

import { useEffect, useState } from 'react';
import type { Order } from '@/types';
import {
  C, type CounterText, PREP_CHOICES, kindLabel, orderKind, money, parseItem, isAllergyText, stripNoteLabel,
} from './ui';

/**
 * Una sola alerta para todos los pedidos que llegan (estilo Uber, pero con el
 * pedido ya visible y aceptación en un toque). Muestra "N pedidos nuevos · 1 de N":
 * al aceptar o rechazar, aparece el siguiente aquí mismo. "Ver todos" cierra la
 * alerta y deja los pedidos como tarjetas verdes en la columna Nuevos.
 * Nunca acepta solo, salvo que esta tablet tenga activado auto-aceptar.
 */
export function NewOrdersAlert({
  queue, T, currency, defaultMins, autoAcceptSecs, soundOn, onAcknowledge, onAccept, onReject, onSeeAll,
}: {
  queue: Order[];
  T: CounterText;
  currency: string;
  defaultMins: (o: Order) => number;
  /** null = auto-aceptar apagado (por defecto). */
  autoAcceptSecs: number | null;
  soundOn: boolean;
  onAcknowledge: () => void;
  onAccept: (o: Order, mins: number) => void;
  onReject: (o: Order) => void;
  onSeeAll: () => void;
}) {
  const order = queue[0];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={T.newOrders(queue.length)}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: C.green, color: C.greenInk }}
      onPointerDown={onAcknowledge}
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
        soundOn={soundOn}
        onAccept={onAccept}
        onReject={onReject}
        onSeeAll={onSeeAll}
      />
    </div>
  );
}

function AlertBody({
  order, index, total, T, currency, initialMins, autoAcceptSecs, soundOn, onAccept, onReject, onSeeAll,
}: {
  order: Order; index: number; total: number; T: CounterText; currency: string;
  initialMins: number; autoAcceptSecs: number | null; soundOn: boolean;
  onAccept: (o: Order, mins: number) => void; onReject: (o: Order) => void; onSeeAll: () => void;
}) {
  const [mins, setMins] = useState(initialMins);
  const [left, setLeft] = useState<number | null>(autoAcceptSecs);
  const [fired, setFired] = useState(false);
  const kind = orderKind(order);
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
    <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] min-[880px]:grid-rows-1 min-[880px]:grid-cols-[1fr_400px] gap-5 p-5 min-[880px]:p-7"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>

      {/* Pedido */}
      <div className="min-h-0 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-[20px] font-extrabold">
          <span className="tabular-nums min-w-[44px] h-11 px-3 rounded-full inline-flex items-center justify-center text-[20px]" style={{ background: C.greenInk, color: '#fff' }}>
            {total}
          </span>
          <span>{T.newOrders(total)}</span>
          {total > 1 && <span className="font-semibold opacity-80">· {T.ofN(index, total)}</span>}
        </div>

        <h1 className="font-extrabold leading-[1.02] tracking-tight text-[44px] min-[880px]:text-[60px] break-words">
          {order.customer_name || '—'}
        </h1>

        <div className="flex items-center gap-3 flex-wrap text-[19px] min-[880px]:text-[24px] font-semibold">
          <span className="text-[15px] font-extrabold tracking-wide px-2.5 py-1 rounded-lg" style={{ background: '#fff', color: kind.color }}>
            {kindLabel(order, T)}
          </span>
          <span className="tabular-nums">{money(Number(order.total), currency)}</span>
          <span aria-hidden>·</span>
          <span>{paidOnline ? T.paidOnline : T.cash}</span>
        </div>
        {order.delivery_address && (
          <p className="-mt-2 text-[18px] min-[880px]:text-[22px] font-semibold leading-snug">{order.delivery_address}</p>
        )}

        {order.notes?.trim() && (
          <p className="text-[18px] font-extrabold rounded-xl px-4 py-2.5"
            style={isAllergyText(order.notes) ? { background: '#fff', color: C.red } : { background: 'rgba(255,255,255,.6)' }}>
            {isAllergyText(order.notes) ? `${T.allergy}: ` : `${T.orderNote}: `}{stripNoteLabel(order.notes)}
          </p>
        )}

        <ul className="min-h-0 overflow-y-auto rounded-2xl px-5 py-3 flex flex-col divide-y" style={{ background: 'rgba(255,255,255,.62)', borderColor: 'rgba(4,36,30,.12)' }}>
          {items.map((it, i) => (
            <li key={i} className="py-2.5 first:pt-1 last:pb-1" style={{ borderColor: 'rgba(4,36,30,.12)' }}>
              <p className="text-[20px] min-[880px]:text-[26px] font-bold leading-snug"><span className="tabular-nums font-extrabold">{it.qty}×</span> {it.name}{it.variant ? ` · ${it.variant}` : ''}</p>
              {(it.mods.length > 0 || it.extras.length > 0) && (
                <p className="text-[17px] min-[880px]:text-[20px] font-medium leading-snug pl-8 min-[880px]:pl-10" style={{ color: '#1B4A41' }}>
                  {[...it.mods.map((m) => m.option), ...it.extras.map((e) => e.name)].join(' · ')}
                </p>
              )}
              {it.notes && (
                <p className="text-[17px] min-[880px]:text-[20px] font-extrabold pl-8 min-[880px]:pl-10" style={{ color: isAllergyText(it.notes) ? C.red : C.greenInk }}>
                  {isAllergyText(it.notes) ? `${T.allergy}: ` : `${T.note}: `}{stripNoteLabel(it.notes)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Decisión */}
      <div className="rounded-3xl p-5 min-[880px]:p-6 flex flex-col gap-4 min-h-0" style={{ background: '#fff', color: C.ink }}>
        <p className="text-[17px] min-[880px]:text-[20px] font-bold" style={{ color: C.sub }}>{T.readyQuestion}</p>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={T.readyQuestion}>
          {choices.slice(0, 5).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={mins === c}
              onClick={() => { setMins(c); setLeft(autoAcceptSecs); }}
              className="h-16 min-[880px]:h-20 rounded-2xl flex flex-col items-center justify-center font-extrabold text-[22px] tabular-nums leading-none transition-colors"
              style={mins === c
                ? { background: C.black, color: '#fff' }
                : { background: C.surface, color: C.ink }}
            >
              {c}
              <span className="text-[12px] font-semibold mt-1 opacity-70">min</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { if (!fired) { setFired(true); onAccept(order, mins); } }}
          className="h-[84px] min-[880px]:h-[96px] rounded-2xl font-extrabold text-[26px] min-[880px]:text-[30px] transition-transform active:scale-[.98]"
          style={{ background: C.black, color: '#fff' }}
        >
          {T.acceptMin(mins)}
        </button>
        {left != null && left > 0 && (
          <p className="text-center text-[15px] font-semibold -mt-1" style={{ color: C.sub }}>{T.autoAcceptIn(left)}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onSeeAll}
            className="h-14 min-[880px]:h-16 rounded-xl font-bold text-[17px] min-[880px]:text-[19px]" style={{ background: C.surface, color: C.ink }}>
            {T.seeAll}
          </button>
          <button type="button" onClick={() => onReject(order)}
            className="h-14 min-[880px]:h-16 rounded-xl font-bold text-[17px] min-[880px]:text-[19px]" style={{ background: C.redSoft, color: C.red }}>
            {T.reject}
          </button>
        </div>
        {soundOn && <p className="text-center text-[14px] font-medium min-[880px]:mt-auto" style={{ color: C.faint }}>{T.tapToSilence}</p>}
      </div>
    </div>
  );
}
