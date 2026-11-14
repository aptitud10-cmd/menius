/** @jsxRuntime automatic */
/**
 * Layout del ticket de 80 mm (SPEC impresión §6 — diseño APROBADO por William
 * 2026-11-14; no se cambia por cuenta propia).
 *
 * Invertidos (fondo negro): franja de canal, bloque #003, banner de alergia,
 * COLLECT CASH y el #003 de abajo. Tamaños en px sobre 576 px de ancho
 * (203 dpi: 128 px ≈ 16 mm). Satori: todo div con más de un hijo lleva display:flex.
 */
import 'server-only';
import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/utils';
import { prettyPhone } from '@/lib/notifications/customer-email';
import { renderToPng, TICKET_WIDTH } from './render-png';
import { ticketStrings, type TicketStrings } from './ticket-i18n';
import type { TicketData, TicketItem } from './ticket-data';

const BLACK = '#000';
const WHITE = '#fff';
const PAD = 10;

function amount(n: number, currency: string): string {
  const digits = new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Rule() {
  return <div style={{ display: 'flex', height: 3, background: BLACK, margin: `14px ${PAD}px` }} />;
}

function Inverted({ children, size, center }: { children: ReactNode; size: number; center?: boolean }) {
  return (
    <div style={{
      display: 'flex', background: BLACK, color: WHITE, fontSize: size, fontWeight: 900,
      padding: `4px ${PAD + 6}px`, justifyContent: center ? 'center' : 'flex-start', lineHeight: 1.15,
    }}>
      {children}
    </div>
  );
}

function Boxed({ children, size, thick }: { children: ReactNode; size: number; thick?: boolean }) {
  return (
    <div style={{
      display: 'flex', border: `${thick ? 6 : 3}px solid ${BLACK}`, margin: `8px ${PAD}px`,
      padding: '6px 12px', fontSize: size, fontWeight: 900, lineHeight: 1.2,
    }}>
      {children}
    </div>
  );
}

function AlertIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
      <path d="M12 2 L23 21 L1 21 Z" fill={WHITE} />
      <rect x="10.8" y="8" width="2.4" height="7" fill={BLACK} />
      <rect x="10.8" y="16.6" width="2.4" height="2.4" fill={BLACK} />
    </svg>
  );
}

function Row({ left, right, size, weight = 700, indent = 0 }: {
  left: string; right?: string; size: number; weight?: 700 | 900; indent?: number;
}) {
  return (
    <div style={{ display: 'flex', fontSize: size, fontWeight: weight, padding: `1px ${PAD}px 1px ${PAD + indent}px`, lineHeight: 1.2 }}>
      <div style={{ display: 'flex', flex: 1, paddingRight: 12 }}>{left}</div>
      {right ? <div style={{ display: 'flex' }}>{right}</div> : null}
    </div>
  );
}

function Item({ item, t, currency }: { item: TicketItem; t: TicketStrings; currency: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 6 }}>
      <Row left={`${item.qty}x ${item.name}`} right={amount(item.lineTotal, currency)} size={26} weight={900} />
      {item.lines.map((l, i) => (
        <Row key={i} left={l.text} right={l.price > 0 ? amount(l.price, currency) : undefined} size={22} indent={l.indent ? 56 : 32} />
      ))}
      {item.notes ? <Boxed size={22}>{`${t.note}: ${item.notes}`}</Boxed> : null}
    </div>
  );
}

function OrderTicket({ d }: { d: TicketData }) {
  const t = ticketStrings(d.locale);
  const c = d.restaurant.currency;
  const totalsLine = [
    `${t.subtotal} ${amount(d.totals.subtotal, c)}`,
    d.totals.tax > 0 ? `${d.restaurant.taxLabel} ${amount(d.totals.tax, c)}` : null,
    d.totals.deliveryFee > 0 ? `${t.delivery} ${amount(d.totals.deliveryFee, c)}` : null,
    d.totals.discount > 0 ? `${t.discount} -${amount(d.totals.discount, c)}` : null,
  ].filter(Boolean).join(' · ');

  const sideOfNumber = d.tableName ? `${t.table} ${d.tableName}` : d.readyAt ? `${t.ready} ${d.readyAt}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: TICKET_WIDTH, background: WHITE, color: BLACK, fontFamily: 'Inter', paddingTop: 8, paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center', fontSize: 40, fontWeight: 900, padding: `0 ${PAD}px 10px`, lineHeight: 1.1 }}>
        {d.restaurant.name.toUpperCase()}
      </div>

      <Inverted size={30}>{`${t.channel[d.channel]} · ${t.orderType[d.orderType]}`}</Inverted>

      {d.kind === 'reprint' ? (
        <Boxed size={26} thick>{`${t.reprint}  ${d.reprintedAt ?? ''}`}</Boxed>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', background: BLACK, color: WHITE, padding: `6px ${PAD + 6}px 10px`, marginTop: d.kind === 'reprint' ? 0 : 8 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flex: 1, fontSize: 128, fontWeight: 900, lineHeight: 1 }}>{`#${d.shortNumber}`}</div>
          {sideOfNumber ? <div style={{ display: 'flex', fontSize: 32, fontWeight: 900 }}>{sideOfNumber}</div> : null}
        </div>
        {d.customerName ? <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, lineHeight: 1.1 }}>{d.customerName}</div> : null}
      </div>

      {d.allergy ? (
        <div style={{ display: 'flex', alignItems: 'center', background: BLACK, color: WHITE, fontSize: 30, fontWeight: 900, padding: `6px ${PAD + 6}px`, marginTop: 6 }}>
          <AlertIcon size={34} />
          <div style={{ display: 'flex', flex: 1 }}>{`${t.allergy}: ${d.allergy}`}</div>
        </div>
      ) : null}

      {d.scheduledFor ? (
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 900, padding: `8px ${PAD}px 0` }}>{`${t.scheduled} ${d.scheduledFor}`}</div>
      ) : null}
      <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, padding: `8px ${PAD}px 0` }}>{t.utensils(d.includeUtensils)}</div>

      <Rule />
      {d.items.map((item, i) => <Item key={i} item={item} t={t} currency={c} />)}
      {d.orderNotes ? <Boxed size={24}>{`${t.note}: ${d.orderNotes}`}</Boxed> : null}
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 900, padding: `6px ${PAD}px 0` }}>{t.itemsCheckBag(d.itemCount)}</div>

      <Rule />
      <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 22, fontWeight: 700, padding: `0 ${PAD}px`, lineHeight: 1.25 }}>{totalsLine}</div>
      <Row left={t.total} right={amount(d.totals.total, c)} size={30} weight={900} />

      {d.payment.kind === 'paid' ? <Boxed size={30}>{t.paid}</Boxed> : null}
      {d.payment.kind === 'collect_cash' ? (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Inverted size={34}>{t.collectCash(formatPrice(d.payment.amount, c))}</Inverted>
        </div>
      ) : null}
      {d.payment.kind === 'verify' ? <Boxed size={30} thick>{t.verifyPayment}</Boxed> : null}

      {d.delivery ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Rule />
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 900, padding: `0 ${PAD}px`, lineHeight: 1.15 }}>{d.delivery.address}</div>
          {d.delivery.phone ? <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, padding: `4px ${PAD}px 0` }}>{prettyPhone(d.delivery.phone)}</div> : null}
          {d.delivery.instructions ? <Boxed size={24}>{d.delivery.instructions}</Boxed> : null}
        </div>
      ) : null}

      <Rule />
      <Inverted size={72} center>{`#${d.shortNumber}`}</Inverted>
      <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, padding: `8px ${PAD}px 0` }}>{`${d.orderNumber} · ${t.placed} ${d.placedAt}`}</div>
      <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, padding: `4px ${PAD}px 0` }}>{`${t.orderDirect}: ${d.restaurant.orderDirectUrl}`}</div>
      <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, padding: `4px ${PAD}px 0` }}>{t.poweredBy}</div>
    </div>
  );
}

function TestTicket({ d }: { d: Pick<TicketData, 'locale' | 'restaurant' | 'placedAt'> }) {
  const t = ticketStrings(d.locale);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: TICKET_WIDTH, background: WHITE, color: BLACK, fontFamily: 'Inter', paddingTop: 8, paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'center', fontSize: 40, fontWeight: 900, padding: `0 ${PAD}px 10px` }}>{d.restaurant.name.toUpperCase()}</div>
      <Inverted size={72} center>{t.testPrint}</Inverted>
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
