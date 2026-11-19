/** @jsxRuntime automatic */
/**
 * Layout del ticket de 80 mm — v4, APROBADO por Pedro 2026-11-19 tras compararlo
 * con los tickets de Grubhub y Uber Eats de Buccaneer (maquetas y porqués en
 * .specify/docs/impresion/ticket-v2/). No se cambia por cuenta propia.
 *
 * Jerarquía por tamaño y aire, no por negro. Invertidos SOLO: el bloque de arriba
 * (tipo + hora + #número) y la alergia. Cobro en caja: gruesa = hay que cobrar,
 * fina = ya está pago. Tamaños en px sobre 576 px de ancho (203 dpi: 8 px ≈ 1 mm).
 * Satori: todo div con más de un hijo lleva display:flex. Solo Inter 700 y 900.
 *
 * ticket-html.ts (imprimir desde el navegador) es el mismo diseño: si tocás uno,
 * tocá el otro. La app Android (TicketV2.kt) todavía imprime el v3.
 */
import 'server-only';
import type { CSSProperties, ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import { formatPrice } from '@/lib/utils';
import { prettyPhone } from '@/lib/notifications/customer-email';
import { renderToPng, TICKET_WIDTH } from './render-png';
import { ticketStrings, type TicketStrings } from './ticket-i18n';
import type { TicketData, TicketItem, TicketLine } from './ticket-data';

const BLACK = '#000';
const WHITE = '#fff';
const PAD = 14;
/** Columna de la cantidad: el nombre del plato y sus líneas arrancan acá. */
const QTY_COL = 62;

/**
 * QR como SVG de módulos negros, en data URI para el <img> de satori (resvg lo
 * rasteriza nítido). Corrección M y 6 px por módulo (~22 mm impreso): se
 * escanea con el celular desde la bolsa.
 */
function qrDataUri(text: string): { uri: string; size: number } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  const vb = n + quiet * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges"><rect width="${vb}" height="${vb}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  return { uri: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, size: vb * 6 };
}

function Txt({ size, weight = 700, children, style }: { size: number; weight?: 700 | 900; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', fontSize: size, fontWeight: weight, lineHeight: 1.15, ...style }}>{children}</div>;
}

function Rule({ px = 3, my = 12 }: { px?: number; my?: number }) {
  return <div style={{ display: 'flex', height: px, background: BLACK, margin: `${my}px ${PAD}px` }} />;
}

function AlertIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 12, flexShrink: 0 }}>
      <path d="M12 2 L23 21 L1 21 Z" fill={WHITE} />
      <rect x="10.8" y="8" width="2.4" height="7" fill={BLACK} />
      <rect x="10.8" y="16.6" width="2.4" height="2.4" fill={BLACK} />
    </svg>
  );
}

/** "No onions" / "Sin cebolla": la palabra que quita va en 900, para que no se pase. */
const REMOVAL = /^(no|sin)\s+/i;

function ModLine({ l, money }: { l: TicketLine; money: (n: number) => string }) {
  const m = REMOVAL.exec(l.text);
  return (
    <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, lineHeight: 1.2, padding: `2px ${PAD}px 2px ${PAD + QTY_COL + (l.indent ? 26 : 0)}px` }}>
      <div style={{ display: 'flex', flex: 1, paddingRight: 12 }}>
        {l.indent ? <div style={{ display: 'flex', marginRight: 8, fontWeight: 900 }}>›</div> : null}
        {m ? <div style={{ display: 'flex', fontWeight: 900, marginRight: 8 }}>{m[1].toUpperCase()}</div> : null}
        <div style={{ display: 'flex' }}>{m ? l.text.slice(m[0].length) : l.text}</div>
      </div>
      {l.price > 0 ? <div style={{ display: 'flex', fontWeight: 900 }}>{`+${money(l.price)}`}</div> : null}
    </div>
  );
}

/** Cantidad en su columna; más de 1 en caja negra (que no salga una hamburguesa cuando son dos). */
function Qty({ n }: { n: number }) {
  const base: CSSProperties = { display: 'flex', width: 46, height: 42, alignItems: 'center', fontSize: 32, fontWeight: 900 };
  return n > 1
    ? <div style={{ ...base, background: BLACK, color: WHITE, justifyContent: 'center' }}>{String(n)}</div>
    : <div style={base}>{String(n)}</div>;
}

function Item({ item, t, money, first }: { item: TicketItem; t: TicketStrings; money: (n: number) => string; first: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {first ? null : <div style={{ display: 'flex', height: 2, background: BLACK, margin: `10px ${PAD}px 10px ${PAD + QTY_COL}px` }} />}
      <div style={{ display: 'flex', padding: `0 ${PAD}px`, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', width: QTY_COL }}><Qty n={item.qty} /></div>
        <Txt size={30} weight={900} style={{ flex: 1, paddingRight: 12, paddingTop: 4 }}>{item.name}</Txt>
        <Txt size={26} style={{ paddingTop: 6 }}>{money(item.lineTotal)}</Txt>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
        {item.lines.map((l, i) => <ModLine key={i} l={l} money={money} />)}
      </div>
      {/* La nota cuelga de su plato: entre dos platos iguales no se sabe de cuál es. */}
      {item.notes ? (
        <div style={{ display: 'flex', border: `3px solid ${BLACK}`, margin: `8px ${PAD}px 0 ${PAD + QTY_COL}px`, padding: '6px 10px', alignItems: 'baseline' }}>
          <Txt size={20} weight={900} style={{ letterSpacing: 1, marginRight: 10 }}>{t.noteLabel}</Txt>
          <Txt size={26} weight={900} style={{ flex: 1 }}>{item.notes}</Txt>
        </div>
      ) : null}
    </div>
  );
}

/** Lo de la derecha del bloque negro: mesa, programado o la hora de listo. */
function heroSide(d: TicketData, t: TicketStrings): [string, string] | null {
  if (d.tableName) return [t.table, d.tableName];
  if (d.scheduledDay && d.scheduledTime) return [d.scheduledDay, d.scheduledTime];
  if (d.readyAt) return [t.readyBy, d.readyAt];
  return null;
}

function OrderTicket({ d }: { d: TicketData }) {
  const t = ticketStrings(d.locale);
  const money = (n: number) => formatPrice(n, d.restaurant.currency);
  const side = heroSide(d, t);

  // Una fila por concepto; envío, descuento y propina solo si el pedido los tiene.
  const totalRows: [string, string][] = [
    [t.subtotal, money(d.totals.subtotal)],
    ...(d.totals.tax > 0 ? [[d.restaurant.taxLabel, money(d.totals.tax)] as [string, string]] : []),
    ...(d.totals.deliveryFee > 0 ? [[t.delivery, money(d.totals.deliveryFee)] as [string, string]] : []),
    ...(d.totals.discount > 0 ? [[t.discount, `-${money(d.totals.discount)}`] as [string, string]] : []),
    ...(d.totals.tip > 0 ? [[t.tip, money(d.totals.tip)] as [string, string]] : []),
  ];
  const TOTALS_COL = 330;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: TICKET_WIDTH, background: WHITE, color: BLACK, fontFamily: 'Inter', paddingTop: 12, paddingBottom: 40 }}>
      {/* 1. Línea chica: el restaurante ya sabe quién es, no es el héroe. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `0 ${PAD}px 10px` }}>
        <Txt size={26} weight={900} style={{ flex: 1, paddingRight: 12 }}>{d.restaurant.name.toUpperCase()}</Txt>
        <Txt size={22} style={{ flexShrink: 0 }}>{t.orderVia[d.channel]}</Txt>
      </div>

      {d.kind === 'reprint' ? (
        <div style={{ display: 'flex', border: `6px solid ${BLACK}`, margin: `0 ${PAD - 6}px 8px`, padding: '6px 12px', fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
          {`${t.reprint}  ${d.reprintedAt ?? ''}`}
        </div>
      ) : null}

      {/* 2. UN bloque invertido: lo que se lee a 2 m. */}
      <div style={{ display: 'flex', flexDirection: 'column', background: BLACK, color: WHITE, padding: `10px ${PAD + 4}px 12px`, margin: `0 ${PAD - 6}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Txt size={42} weight={900} style={{ letterSpacing: 1 }}>{t.orderType[d.orderType]}</Txt>
            {d.scheduledDay ? (
              <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 6, border: `3px solid ${WHITE}`, padding: '2px 8px', fontSize: 22, fontWeight: 900 }}>{t.scheduled}</div>
            ) : null}
          </div>
          {side ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: 12 }}>
              <Txt size={22} weight={900}>{side[0]}</Txt>
              <Txt size={42} weight={900} style={{ whiteSpace: 'nowrap' }}>{side[1]}</Txt>
            </div>
          ) : null}
        </div>
        <Txt size={140} weight={900} style={{ lineHeight: 1, marginTop: 4, letterSpacing: -2 }}>{`#${d.shortNumber}`}</Txt>
      </div>

      {/* 3. El nombre se dice en voz alta: grande y fuera del negro. */}
      {d.customerName ? (
        <Txt size={56} weight={900} style={{ lineHeight: 1.05, padding: `12px ${PAD}px 0` }}>{d.customerName}</Txt>
      ) : null}

      {/* 4. Alergia: el otro invertido. Seguridad, no decoración. */}
      {d.allergy ? (
        <div style={{ display: 'flex', alignItems: 'center', background: BLACK, color: WHITE, padding: `8px ${PAD + 4}px`, margin: `12px ${PAD - 6}px 0` }}>
          <AlertIcon size={38} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Txt size={22} weight={900} style={{ letterSpacing: 1 }}>{t.allergy}</Txt>
            <Txt size={30} weight={900}>{d.allergy}</Txt>
          </div>
        </div>
      ) : null}

      {/* 5. Delivery: dirección, teléfono, indicaciones y QR arriba (Pedro 2026-11-18). */}
      {d.delivery ? (
        <div style={{ display: 'flex', flexDirection: 'column', margin: `14px ${PAD}px 0` }}>
          <Txt size={22} weight={900} style={{ letterSpacing: 1 }}>{t.deliverTo}</Txt>
          <Txt size={34} weight={900} style={{ marginTop: 2 }}>{d.delivery.address}</Txt>
          {d.delivery.phone ? <Txt size={30} style={{ marginTop: 4 }}>{prettyPhone(d.delivery.phone)}</Txt> : null}
          {d.delivery.instructions ? (
            <div style={{ display: 'flex', flexDirection: 'column', border: `3px solid ${BLACK}`, padding: '8px 12px', marginTop: 10 }}>
              <Txt size={20} weight={900} style={{ letterSpacing: 1 }}>{t.instructions}</Txt>
              <Txt size={26} weight={900} style={{ marginTop: 2 }}>{d.delivery.instructions}</Txt>
            </div>
          ) : null}
          {d.delivery.driverUrl ? (() => {
            const q = qrDataUri(d.delivery.driverUrl);
            return (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                <img src={q.uri} width={q.size} height={q.size} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: 14 }}>
                  <Txt size={30} weight={900}>{t.driverTitle}</Txt>
                  <Txt size={24} style={{ marginTop: 4 }}>{t.driverHint}</Txt>
                </div>
              </div>
            );
          })() : null}
        </div>
      ) : null}

      {/* 6. Platos: título de sección, columna de cantidad, nombre grande, precio a la derecha. */}
      <Txt size={32} weight={900} style={{ padding: `18px ${PAD}px 0` }}>{t.itemCount(d.itemCount)}</Txt>
      <Rule px={3} my={10} />
      {d.items.map((item, i) => <Item key={i} item={item} t={t} money={money} first={i === 0} />)}
      {d.orderNotes ? (
        <div style={{ display: 'flex', flexDirection: 'column', border: `3px solid ${BLACK}`, margin: `14px ${PAD}px 0`, padding: '6px 10px' }}>
          <Txt size={20} weight={900} style={{ letterSpacing: 1 }}>{t.orderNote}</Txt>
          <Txt size={26} weight={900}>{d.orderNotes}</Txt>
        </div>
      ) : null}

      {/* 7. Al embolsar: cubiertos. SÍ invertido (hay que hacer algo), NO plano. */}
      <Rule px={3} my={14} />
      <div style={{ display: 'flex', padding: `0 ${PAD}px`, alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={26}>{t.utensilsLabel}</Txt>
        {d.includeUtensils
          ? <div style={{ display: 'flex', background: BLACK, color: WHITE, padding: '2px 14px', fontSize: 30, fontWeight: 900 }}>{t.yes}</div>
          : <Txt size={30} weight={900} style={{ paddingRight: 14 }}>{t.no}</Txt>}
      </div>

      {/* 8. Totales en una columna a la derecha, con símbolo. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', padding: `0 ${PAD}px`, marginTop: 4 }}>
        <div style={{ display: 'flex', alignSelf: 'stretch', height: 2, background: BLACK, margin: '14px 0 12px' }} />
        {totalRows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', width: TOTALS_COL, justifyContent: 'space-between', padding: '1px 0' }}>
            <Txt size={24}>{label}</Txt>
            <Txt size={24}>{value}</Txt>
          </div>
        ))}
        <div style={{ display: 'flex', width: TOTALS_COL, height: 3, background: BLACK, margin: '8px 0' }} />
        <div style={{ display: 'flex', width: TOTALS_COL, justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt size={30} weight={900}>{t.total}</Txt>
          <Txt size={36} weight={900}>{money(d.totals.total)}</Txt>
        </div>
      </div>

      {/* 9. Cobro: caja gruesa = cobrar; fina = ya está pago. */}
      {d.payment.kind === 'collect_cash' ? (
        <div style={{ display: 'flex', border: `6px solid ${BLACK}`, margin: `16px ${PAD}px 0`, padding: '8px 14px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Txt size={30} weight={900} style={{ whiteSpace: 'nowrap' }}>{t.collectCashTitle}</Txt>
            <Txt size={22} style={{ marginTop: 2 }}>{t.cashWho[d.orderType]}</Txt>
          </div>
          <Txt size={46} weight={900} style={{ whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>{money(d.payment.amount)}</Txt>
        </div>
      ) : d.payment.kind === 'paid' ? (
        <div style={{ display: 'flex', flexDirection: 'column', border: `3px solid ${BLACK}`, margin: `16px ${PAD}px 0`, padding: '8px 14px' }}>
          <Txt size={34} weight={900}>{t.paidTitle}</Txt>
          <Txt size={22} style={{ marginTop: 2 }}>{t.doNotCharge}</Txt>
        </div>
      ) : (
        <div style={{ display: 'flex', border: `6px solid ${BLACK}`, margin: `16px ${PAD}px 0`, padding: '8px 14px', fontSize: 30, fontWeight: 900, lineHeight: 1.2 }}>
          {t.verifyPayment}
        </div>
      )}

      {/* 10. Pie: cuándo entró y el número largo; gracias y "pide directo" para el cliente. */}
      <Rule px={2} my={16} />
      <div style={{ display: 'flex', padding: `0 ${PAD}px`, justifyContent: 'space-between' }}>
        <Txt size={22}>{`${t.placed} ${d.placedShort}`}</Txt>
        <Txt size={22} style={{ marginLeft: 12 }}>{d.orderNumber}</Txt>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 22, padding: `0 ${PAD}px` }}>
        <Txt size={24} style={{ textAlign: 'center' }}>{t.thanks(d.restaurant.name)}</Txt>
        {d.restaurant.orderDirectUrl ? <Txt size={26} weight={900} style={{ marginTop: 6 }}>{`${t.orderDirect}: ${d.restaurant.orderDirectUrl}`}</Txt> : null}
        <Txt size={20} style={{ marginTop: 12 }}>{t.poweredBy}</Txt>
      </div>
    </div>
  );
}

export type TestTicketData = Pick<TicketData, 'locale' | 'placedAt'> & { restaurant: Pick<TicketData['restaurant'], 'name'> };

function TestTicket({ d }: { d: TestTicketData }) {
  const t = ticketStrings(d.locale);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: TICKET_WIDTH, background: WHITE, color: BLACK, fontFamily: 'Inter', paddingTop: 8, paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'center', fontSize: 40, fontWeight: 900, padding: `0 ${PAD}px 10px` }}>{d.restaurant.name.toUpperCase()}</div>
      <div style={{ display: 'flex', background: BLACK, color: WHITE, fontSize: 72, fontWeight: 900, padding: `4px ${PAD + 6}px`, justifyContent: 'center', lineHeight: 1.15 }}>{t.testPrint}</div>
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, padding: `12px ${PAD}px 0` }}>{t.testPrintBody}</div>
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, padding: `4px ${PAD}px 0` }}>Ñ á é í ó ú ü — ¿? ¡! $ # @ & ½</div>
      <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, padding: `12px ${PAD}px 0` }}>{d.placedAt}</div>
      <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, padding: `4px ${PAD}px 0` }}>{t.poweredBy}</div>
    </div>
  );
}

/** Ticket → PNG 1-bit de 576 px de ancho, listo para CloudPRNT (image/png). */
export function renderTicketPng(d: TicketData): Promise<Buffer> {
  return renderToPng(d.kind === 'test' ? <TestTicket d={d} /> : <OrderTicket d={d} />);
}

/** Ticket de prueba ("Imprimir prueba", F3): solo necesita el restaurante. */
export function renderTestTicketPng(d: TestTicketData): Promise<Buffer> {
  return renderToPng(<TestTicket d={d} />);
}
