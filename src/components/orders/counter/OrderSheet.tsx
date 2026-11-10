'use client';

import { useState, type ReactNode } from 'react';
import { Printer, MoreHorizontal, X, Phone, Send, Pencil, Bike, History, Ban, MapPin } from 'lucide-react';
import type { Order } from '@/types';
import {
  C, type CounterText, PREP_CHOICES, money, parseItem, isAllergyText, stripNoteLabel,
  minsSince, minsLeft, isClosed,
} from './ui';
import { KindTag } from './KindTag';
import { primaryAction, type PrimaryKind } from './CounterBoard';

export interface SheetMoreActions {
  onResendNotice?: () => void;
  onEditItems?: () => void;
  onAssignDriver?: () => void;
  onCancel?: () => void;
}

export function OrderSheet({
  order, T, currency, taxLabel, busy, acceptMins, onClose, onPrint, onAccept, onPrimary, onAdjustEta,
  more, historySlot,
}: {
  order: Order; T: CounterText; currency: string; taxLabel?: string; busy: boolean;
  acceptMins: number;
  onClose: () => void;
  onPrint: () => void;
  onAccept: (o: Order, mins: number) => void;
  onPrimary: (o: Order, kind: PrimaryKind) => void;
  /** total de minutos desde que se creó el pedido */
  onAdjustEta: (o: Order, totalMins: number) => void;
  more: SheetMoreActions;
  historySlot?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mins, setMins] = useState(acceptMins);
  const items = (order.items ?? []).map(parseItem);
  const action = primaryAction(order, T, mins);
  const shortNum = order.order_number?.split('-').pop() ?? '';
  const paidOnline = (order as { payment_status?: string }).payment_status === 'paid';
  const isPrep = ['confirmed', 'preparing', 'almost_ready'].includes(order.status);
  const left = minsLeft(order);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const phone = order.customer_phone?.trim();

  const moreItems: { label: string; icon: ReactNode; onClick?: () => void; href?: string; danger?: boolean }[] = [];
  if (phone) moreItems.push({ label: T.callCustomer, icon: <Phone className="w-5 h-5" />, href: `tel:${phone.replace(/[^\d+]/g, '')}` });
  if (more.onResendNotice) moreItems.push({ label: T.resendNotice, icon: <Send className="w-5 h-5" />, onClick: more.onResendNotice });
  if (more.onEditItems) moreItems.push({ label: T.editItems, icon: <Pencil className="w-5 h-5" />, onClick: more.onEditItems });
  if (more.onAssignDriver) moreItems.push({ label: T.assignDriver, icon: <Bike className="w-5 h-5" />, onClick: more.onAssignDriver });
  if (historySlot) moreItems.push({ label: T.statusHistory, icon: <History className="w-5 h-5" />, onClick: () => setShowHistory((v) => !v) });
  if (more.onCancel) moreItems.push({ label: order.status === 'pending' ? T.rejectOrder : T.cancelOrder, icon: <Ban className="w-5 h-5" />, onClick: more.onCancel, danger: true });

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={order.customer_name || T.customer}>
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: 'rgba(14,20,18,.45)' }} onClick={onClose} />

      <div className="relative h-full w-full min-[880px]:w-[min(820px,90vw)] flex flex-col shadow-2xl" style={{ background: C.bg, color: C.ink }}>
        {/* Encabezado */}
        <header className="flex-none flex items-center gap-3 px-5 min-h-[80px] border-b" style={{ borderColor: C.line, paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-extrabold text-[26px] leading-tight truncate">{order.customer_name || '—'}</h2>
              <KindTag order={order} T={T} />
            </div>
            <p className="text-[15px] tabular-nums" style={{ color: C.sub }}>
              #{shortNum} · {T.minAgo(minsSince(order.created_at))}
              {order.scheduled_for && ` · ${T.scheduledFor(new Date(order.scheduled_for).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}`}
            </p>
          </div>
          <button type="button" onClick={onPrint} className="h-14 px-4 rounded-xl inline-flex items-center gap-2 font-bold text-[16px]" style={{ background: C.surface }}>
            <Printer className="w-5 h-5" /> <span className="hidden sm:inline">{T.print}</span>
          </button>
          {moreItems.length > 0 && (
            <div className="relative">
              <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}
                className="h-14 px-4 rounded-xl inline-flex items-center gap-2 font-bold text-[16px]" style={{ background: C.surface }}>
                <MoreHorizontal className="w-5 h-5" /> <span className="hidden sm:inline">{T.more}</span>
              </button>
              {moreOpen && (
                <>
                  <button type="button" aria-label={T.close} className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-[64px] z-20 w-[300px] rounded-2xl p-2 shadow-xl border" style={{ background: C.bg, borderColor: C.line }}>
                    {moreItems.map((m, i) => {
                      const cls = 'w-full h-14 px-3 rounded-xl flex items-center gap-3 text-[17px] font-semibold text-left';
                      const style = { color: m.danger ? C.red : C.ink };
                      return m.href ? (
                        <a key={i} href={m.href} className={cls} style={style} onClick={() => setMoreOpen(false)}>{m.icon}{m.label}</a>
                      ) : (
                        <button key={i} type="button" className={cls} style={style}
                          onClick={() => { setMoreOpen(false); m.onClick?.(); }}>
                          {m.icon}{m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="h-14 px-4 rounded-xl inline-flex items-center gap-2 font-bold text-[16px]" style={{ background: C.surface }}>
            <X className="w-5 h-5" /> <span className="hidden sm:inline">{T.close}</span>
          </button>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 min-[880px]:grid-cols-[1fr_280px] gap-5 p-5">
            <div className="min-w-0 flex flex-col gap-3">
              {order.notes?.trim() && (
                <p className="text-[18px] font-extrabold rounded-xl px-4 py-3 leading-snug"
                  style={isAllergyText(order.notes) ? { background: C.redSoft, color: C.red } : { background: C.amberSoft, color: C.amber }}>
                  {isAllergyText(order.notes) ? `${T.allergy}: ` : `${T.orderNote}: `}{stripNoteLabel(order.notes)}
                </p>
              )}
              <ul className="flex flex-col">
                {items.map((it, i) => (
                  <li key={i} className="grid grid-cols-[44px_1fr_auto] gap-3 py-3.5 border-b" style={{ borderColor: C.line }}>
                    <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center font-extrabold text-[20px] tabular-nums" style={{ background: C.surface }}>{it.qty}</span>
                    <div className="min-w-0">
                      <p className="text-[20px] font-bold leading-snug">{it.name}{it.variant ? ` · ${it.variant}` : ''}</p>
                      {it.notes && (
                        <p className="mt-1.5 text-[17px] font-extrabold rounded-lg px-2.5 py-1.5 leading-snug"
                          style={isAllergyText(it.notes) ? { background: C.redSoft, color: C.red } : { background: C.amberSoft, color: C.amber }}>
                          {isAllergyText(it.notes) ? `${T.allergy}: ` : `${T.note}: `}{stripNoteLabel(it.notes)}
                        </p>
                      )}
                      {it.mods.map((m, k) => (
                        <p key={`m${k}`} className="text-[17px] leading-snug mt-0.5" style={{ color: C.sub }}>
                          {m.option}{m.delta > 0 ? <span className="tabular-nums"> · +{money(m.delta, currency)}</span> : null}
                        </p>
                      ))}
                      {it.extras.map((e, k) => (
                        <p key={`e${k}`} className="text-[17px] leading-snug mt-0.5" style={{ color: C.sub }}>
                          + {e.name}{e.price > 0 ? <span className="tabular-nums"> · +{money(e.price, currency)}</span> : null}
                        </p>
                      ))}
                    </div>
                    <span className="text-[16px] tabular-nums pt-0.5" style={{ color: C.sub }}>{money(it.lineTotal, currency)}</span>
                  </li>
                ))}
              </ul>
              {order.include_utensils && <p className="text-[16px] font-semibold" style={{ color: C.sub }}>{T.utensilsYes}</p>}
              {showHistory && historySlot}
            </div>

            <aside className="flex flex-col gap-3">
              {isPrep && left != null && (
                <Box k={T.time}>
                  <p className="text-[22px] font-extrabold tabular-nums" style={{ color: left < 0 ? C.red : C.ink }}>
                    {left < 0 ? T.late(-left) : T.readyIn(left)}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {[5, 10, 15, 20].map((add) => (
                      <button key={add} type="button" disabled={busy}
                        onClick={() => onAdjustEta(order, minsSince(order.created_at) + Math.max(0, left) + add)}
                        className="h-12 rounded-lg font-bold text-[16px] tabular-nums disabled:opacity-50" style={{ background: C.bg, color: C.ink }}>
                        +{add}
                      </button>
                    ))}
                  </div>
                </Box>
              )}

              <Box k={T.customer}>
                <p className="text-[18px] font-bold">{order.customer_name || '—'}</p>
                {phone && <p className="text-[16px] tabular-nums select-text" style={{ color: C.sub }}>{phone}</p>}
              </Box>

              {order.order_type === 'delivery' && order.delivery_address && (
                <Box k={T.address}>
                  <p className="text-[16px] leading-snug select-text">{order.delivery_address}</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address)}`} target="_blank" rel="noopener noreferrer"
                    className="mt-1.5 h-11 rounded-lg inline-flex items-center justify-center gap-2 font-bold text-[15px]" style={{ background: C.bg, color: C.ink }}>
                    <MapPin className="w-4 h-4" /> {T.openMap}
                  </a>
                  {order.driver_name && (
                    <p className="text-[15px] mt-1.5" style={{ color: C.sub }}>
                      {T.driver}: <b style={{ color: C.ink }}>{order.driver_name}</b>
                      {order.driver_at_door_at ? ` · ${T.driverAtDoor}` : order.driver_picked_up_at ? ` · ${T.driverOnWay}` : ''}
                    </p>
                  )}
                </Box>
              )}

              <Box k={T.payment}>
                <p className="text-[17px] font-bold">{paidOnline ? T.paidOnline : T.cash}</p>
                <dl className="mt-1 text-[15px] flex flex-col gap-0.5" style={{ color: C.sub }}>
                  {Math.abs(subtotal - Number(order.total)) > 0.009 && <Row k={T.subtotal} v={money(subtotal, currency)} />}
                  {(order.tax_amount ?? 0) > 0 && <Row k={taxLabel || T.tax} v={money(order.tax_amount!, currency)} />}
                  {(order.delivery_fee ?? 0) > 0 && <Row k={T.deliveryFee} v={money(order.delivery_fee!, currency)} />}
                  {(order.discount_amount ?? 0) > 0 && <Row k={T.discount} v={`−${money(order.discount_amount!, currency)}`} />}
                  {(order.tip_amount ?? 0) > 0 && <Row k={T.tip} v={money(order.tip_amount!, currency)} />}
                </dl>
                <div className="flex items-baseline justify-between mt-1.5 pt-1.5 border-t" style={{ borderColor: C.line }}>
                  <span className="text-[15px] font-bold">{T.total}</span>
                  <span className="text-[26px] font-extrabold tabular-nums">{money(Number(order.total), currency)}</span>
                </div>
              </Box>
            </aside>
          </div>
        </div>

        {/* Acción principal: siempre abajo, siempre del mismo tamaño */}
        {!isClosed(order) && action && (
          <footer className="flex-none border-t px-5 pt-4 flex flex-col gap-3" style={{ borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {order.status === 'pending' && (
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={T.readyQuestion}>
                {PREP_CHOICES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={mins === c} onClick={() => setMins(c)}
                    className="h-14 rounded-xl font-extrabold text-[19px] tabular-nums"
                    style={mins === c ? { background: C.black, color: '#fff' } : { background: C.surface, color: C.ink }}>
                    {c} <span className="text-[13px] font-semibold opacity-70">min</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => (action.kind === 'accept' ? onAccept(order, mins) : onPrimary(order, action.kind))}
              className="h-[76px] rounded-2xl font-extrabold text-[24px] transition-transform active:scale-[.99] disabled:opacity-50"
              style={action.kind === 'accept' ? { background: C.green, color: C.greenInk } : { background: C.black, color: '#fff' }}
            >
              {action.label}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Box({ k, children }: { k: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl p-4 flex flex-col" style={{ background: C.surface }}>
      <h3 className="text-[13px] font-bold uppercase tracking-wider mb-1" style={{ color: C.sub }}>{k}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3"><dt>{k}</dt><dd className="tabular-nums">{v}</dd></div>
  );
}
