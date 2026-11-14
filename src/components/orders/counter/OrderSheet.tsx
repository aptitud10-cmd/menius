'use client';

import { useState, type ReactNode } from 'react';
import { Printer, MoreHorizontal, X, Phone, Send, Pencil, Bike, History, Ban, MapPin } from 'lucide-react';
import type { Order } from '@/types';
import {
  C, RAISED, type CounterText, PREP_CHOICES, money, parseItem, isAllergyText, stripNoteLabel,
  minsSince, minsLeft, isClosed,
} from './ui';
import { KindTag } from './KindTag';
import { primaryAction, CustomerFlagLine, AllergyBlock, type PrimaryKind } from './CounterBoard';

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
  const drv = order as Order & { driver_delivered_at?: string | null; delivery_photo_url?: string | null };

  const moreItems: { label: string; icon: ReactNode; onClick?: () => void; href?: string; danger?: boolean }[] = [];
  if (phone) moreItems.push({ label: T.callCustomer, icon: <Phone className="w-5 h-5" />, href: `tel:${phone.replace(/[^\d+]/g, '')}` });
  if (more.onResendNotice) moreItems.push({ label: T.resendNotice, icon: <Send className="w-5 h-5" />, onClick: more.onResendNotice });
  if (more.onEditItems) moreItems.push({ label: T.editItems, icon: <Pencil className="w-5 h-5" />, onClick: more.onEditItems });
  if (more.onAssignDriver) moreItems.push({ label: T.assignDriver, icon: <Bike className="w-5 h-5" />, onClick: more.onAssignDriver });
  if (historySlot) moreItems.push({ label: T.statusHistory, icon: <History className="w-5 h-5" />, onClick: () => setShowHistory((v) => !v) });
  if (more.onCancel) moreItems.push({ label: order.status === 'pending' ? T.rejectOrder : T.cancelOrder, icon: <Ban className="w-5 h-5" />, onClick: more.onCancel, danger: true });

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={order.customer_name || T.customer}>
      <button type="button" aria-label={T.close} className="absolute inset-0 cursor-default" style={{ background: C.scrim }} onClick={onClose} />

      <div className="relative h-full w-full min-[880px]:w-[min(820px,90vw)] flex flex-col" style={{ background: C.bg, color: C.ink, boxShadow: `-1px 0 0 ${C.raisedEdge}, -24px 0 48px rgba(0,0,0,.28)` }}>
        {/* Encabezado */}
        <header className="flex-none flex items-center gap-3 px-5 min-h-[80px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-bold text-[26px] leading-tight tracking-[-0.02em] truncate">{order.customer_name || '—'}</h2>
              <KindTag order={order} T={T} />
            </div>
            <p className="text-[16px] font-medium tabular-nums" style={{ color: C.sub }}>
              #{shortNum} · {T.minAgo(minsSince(order.created_at))}
              {order.scheduled_for && ` · ${T.scheduledFor(new Date(order.scheduled_for).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}`}
            </p>
          </div>
          <button type="button" onClick={onPrint} className="h-12 px-4 rounded-full inline-flex items-center gap-2 font-semibold text-[16px]" style={{ background: C.fill, color: C.ink }}>
            <Printer className="w-5 h-5" /> <span className="hidden sm:inline">{T.print}</span>
          </button>
          {moreItems.length > 0 && (
            <div className="relative">
              <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}
                className="h-12 px-4 rounded-full inline-flex items-center gap-2 font-semibold text-[16px]" style={{ background: C.fill, color: C.ink }}>
                <MoreHorizontal className="w-5 h-5" /> <span className="hidden sm:inline">{T.more}</span>
              </button>
              {moreOpen && (
                <>
                  <button type="button" aria-label={T.close} className="fixed inset-0 z-10 cursor-default" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-[60px] z-20 w-[300px] rounded-2xl p-2" style={RAISED}>
                    {moreItems.map((m, i) => {
                      const cls = 'w-full h-14 px-3 rounded-xl flex items-center gap-3 text-[17px] font-semibold text-left';
                      const style = { color: m.danger ? C.destructive : C.ink };
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
          <button type="button" onClick={onClose} className="h-12 px-4 rounded-full inline-flex items-center gap-2 font-semibold text-[16px]" style={{ background: C.fill, color: C.ink }}>
            <X className="w-5 h-5" /> <span className="hidden sm:inline">{T.close}</span>
          </button>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 min-[880px]:grid-cols-[1fr_280px] gap-5 p-5">
            <div className="min-w-0 flex flex-col gap-3">
              <CustomerFlagLine order={order} T={T} />
              {order.notes?.trim() && (isAllergyText(order.notes)
                ? <AllergyBlock T={T} text={order.notes} size="lg" />
                : (
                  <p className="text-[18px] font-semibold rounded-xl px-4 py-3 leading-snug" style={{ background: C.surface, color: C.ink }}>
                    <span className="font-medium" style={{ color: C.sub }}>{T.orderNote}:</span> {stripNoteLabel(order.notes)}
                  </p>
                ))}
              <ul className="flex flex-col rounded-[22px] px-4" style={{ background: C.surface }}>
                {items.map((it, i) => (
                  <li key={i} className={`grid grid-cols-[44px_1fr] gap-3 py-3.5 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: C.line }}>
                    <span className="w-11 h-11 rounded-xl inline-flex items-center justify-center font-bold text-[20px] tabular-nums" style={{ background: C.fill, color: C.ink }}>{it.qty}</span>
                    <div className="min-w-0">
                      {/* Con opciones: precio base arriba, cada cosa con su precio y el total del plato
                          abajo (Pedro 2026-11-13). Sin opciones: el total al lado del nombre. */}
                      <p className="flex justify-between gap-4 text-[20px] font-semibold tracking-[-0.01em] leading-snug">
                        <span className="min-w-0">{it.name}{it.variant ? ` · ${it.variant}` : ''}</span>
                        <span className="text-[17px] font-medium tracking-normal tabular-nums pt-0.5 shrink-0" style={{ color: C.sub }}>
                          {money(it.lines.length + it.extras.length > 0 ? it.basePrice : it.lineTotal, currency)}
                        </span>
                      </p>
                      {it.notes && (isAllergyText(it.notes) ? (
                        <div className="mt-1.5"><AllergyBlock T={T} text={it.notes} /></div>
                      ) : (
                        <p className="mt-1.5 text-[17px] font-semibold leading-snug" style={{ color: C.ink }}>
                          <span className="font-medium" style={{ color: C.sub }}>{T.note}:</span> {stripNoteLabel(it.notes)}
                        </p>
                      ))}
                      {it.lines.map((line, k) => (
                        <p key={`m${k}`} className={`flex justify-between gap-4 text-[17px] leading-snug mt-1 ${line.indent ? 'pl-6' : ''}`} style={{ color: C.ink }}>
                          <span className="min-w-0">{line.text}</span>
                          {line.price > 0 && <span className="tabular-nums shrink-0" style={{ color: C.sub }}>{money(line.price, currency)}</span>}
                        </p>
                      ))}
                      {it.extras.map((e, k) => (
                        <p key={`e${k}`} className="flex justify-between gap-4 text-[17px] leading-snug mt-1" style={{ color: C.ink }}>
                          <span className="min-w-0">+ {e.name}</span>
                          {e.price > 0 && <span className="tabular-nums shrink-0" style={{ color: C.sub }}>{money(e.price, currency)}</span>}
                        </p>
                      ))}
                      {it.lines.length + it.extras.length > 0 && (
                        <p className="flex justify-between gap-4 text-[17px] font-semibold mt-2 pt-2 border-t" style={{ borderColor: C.line }}>
                          <span>{it.qty > 1 ? `${it.qty} × ${money(it.lineTotal / it.qty, currency)}` : T.itemTotal}</span>
                          <span className="tabular-nums">{money(it.lineTotal, currency)}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {order.include_utensils && <p className="text-[16px] font-medium" style={{ color: C.sub }}>{T.utensilsYes}</p>}
              {showHistory && historySlot}
            </div>

            <aside className="flex flex-col gap-3">
              {isPrep && left != null && (
                <Box k={T.time}>
                  <p className="text-[22px] font-bold tabular-nums" style={{ color: left < 0 ? C.red : C.ink }}>
                    {left < 0 ? T.late(-left) : T.readyIn(left)}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                    {[5, 10, 15, 20].map((add) => (
                      <button key={add} type="button" disabled={busy}
                        // Minutos desde la ACEPTACIÓN (como minsLeft, el email y el seguimiento):
                        // transcurrido + lo que faltaba (0 si ya estaba atrasado) + lo agregado.
                        // Antes sumaba también la espera en Nuevos (created_at).
                        onClick={() => onAdjustEta(order, (Number(order.estimated_ready_minutes ?? 0) - left) + Math.max(0, left) + add)}
                        className="h-12 rounded-xl font-semibold text-[16px] tabular-nums disabled:opacity-50" style={{ background: C.fill, color: C.ink }}>
                        +{add}
                      </button>
                    ))}
                  </div>
                </Box>
              )}

              <Box k={T.customer}>
                <p className="text-[18px] font-semibold">{order.customer_name || '—'}</p>
                {phone && <p className="text-[16px] tabular-nums select-text" style={{ color: C.sub }}>{phone}</p>}
              </Box>

              {order.order_type === 'delivery' && order.delivery_address && (
                <Box k={T.address}>
                  <p className="text-[16px] leading-snug select-text">{order.delivery_address}</p>
                  <a href={mapsUrl(order)} target="_blank" rel="noopener noreferrer"
                    className="mt-1.5 h-11 rounded-xl inline-flex items-center justify-center gap-2 font-semibold text-[15px]" style={{ background: C.fill, color: C.ink }}>
                    <MapPin className="w-4 h-4" /> {T.openMap}
                  </a>
                  {(order.driver_name || order.driver_picked_up_at || drv.driver_delivered_at) && (
                    <p className="text-[15px] mt-1.5" style={{ color: C.sub }}>
                      {T.driver}{order.driver_name ? <>: <b style={{ color: C.ink }}>{order.driver_name}</b></> : ''}
                      {drv.driver_delivered_at
                        ? ` · ${T.delivered} ${new Date(drv.driver_delivered_at).toLocaleTimeString(T.locale, { hour: '2-digit', minute: '2-digit' })}`
                        : order.driver_at_door_at ? ` · ${T.driverAtDoor}` : order.driver_picked_up_at ? ` · ${T.driverOnWay}` : ''}
                    </p>
                  )}
                  {/* Prueba de entrega: si el cliente dice "no me llegó", acá está la foto. */}
                  {drv.delivery_photo_url && (
                    <a href={drv.delivery_photo_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                      <span className="text-[13px] font-semibold" style={{ color: C.sub }}>{T.deliveryPhoto}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={drv.delivery_photo_url} alt={T.deliveryPhoto} className="mt-1 w-full max-h-48 object-cover rounded-lg" />
                    </a>
                  )}
                </Box>
              )}

              <Box k={T.payment}>
                <p className="text-[17px] font-semibold">{paidOnline ? T.paidOnline : T.cash}</p>
                <dl className="mt-1 text-[15px] flex flex-col gap-0.5" style={{ color: C.sub }}>
                  {Math.abs(subtotal - Number(order.total)) > 0.009 && <Row k={T.subtotal} v={money(subtotal, currency)} />}
                  {(order.tax_amount ?? 0) > 0 && <Row k={taxLabel || T.tax} v={money(order.tax_amount!, currency)} />}
                  {(order.delivery_fee ?? 0) > 0 && <Row k={T.deliveryFee} v={money(order.delivery_fee!, currency)} />}
                  {(order.discount_amount ?? 0) > 0 && <Row k={T.discount} v={`−${money(order.discount_amount!, currency)}`} />}
                  {(order.tip_amount ?? 0) > 0 && <Row k={T.tip} v={money(order.tip_amount!, currency)} />}
                </dl>
                <div className="flex items-baseline justify-between mt-1.5 pt-1.5 border-t" style={{ borderColor: C.line }}>
                  <span className="text-[15px] font-semibold">{T.total}</span>
                  <span className="text-[26px] font-bold tracking-[-0.02em] tabular-nums">{money(Number(order.total), currency)}</span>
                </div>
              </Box>
            </aside>
          </div>
        </div>

        {/* Acción principal: siempre abajo, siempre del mismo tamaño */}
        {!isClosed(order) && action && (
          <footer className="flex-none px-5 pt-4 flex flex-col gap-3" style={{ background: C.surface, boxShadow: `0 -1px 0 ${C.line}`, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {order.status === 'pending' && (
              <div className="grid grid-cols-5 gap-0.5 p-1 rounded-2xl" role="radiogroup" aria-label={T.readyQuestion} style={{ background: C.fill }}>
                {PREP_CHOICES.map((c) => {
                  const on = mins === c;
                  return (
                    <button key={c} type="button" role="radio" aria-checked={on} onClick={() => setMins(c)}
                      className="h-12 rounded-xl text-[19px] tabular-nums"
                      style={on
                        ? { background: C.thumb, color: C.ink, boxShadow: C.thumbShadow, fontWeight: 700 }
                        : { color: C.ink, fontWeight: 500 }}>
                      {c} <span className="text-[13px] font-medium" style={{ color: on ? C.ink : C.sub }}>min</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => (action.kind === 'accept' ? onAccept(order, mins) : onPrimary(order, action.kind))}
              className="h-[76px] rounded-[20px] font-semibold text-[24px] tracking-[-0.015em] transition-transform active:scale-[.99] disabled:opacity-50"
              style={action.kind === 'accept' ? { background: C.accent, color: C.onAccent } : { background: C.fill, color: C.ink }}
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
    <section className="rounded-[22px] p-4 flex flex-col" style={{ background: C.surface }}>
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: C.sub }}>{k}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3"><dt>{k}</dt><dd className="tabular-nums">{v}</dd></div>
  );
}

/**
 * Google Maps del pedido: con las coordenadas que se guardaron al pedir (punto
 * exacto, sirve aunque la dirección escrita sea ambigua); si no hay, por texto.
 */
function mapsUrl(order: Order) {
  const o = order as Order & { delivery_lat?: number | null; delivery_lng?: number | null };
  if (typeof o.delivery_lat === 'number' && typeof o.delivery_lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${o.delivery_lat},${o.delivery_lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address ?? '')}`;
}
