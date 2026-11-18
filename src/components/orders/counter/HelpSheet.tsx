'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Mail, MessageCircle, Phone, X } from 'lucide-react';
import qrcode from 'qrcode-generator';
import { C, RAISED } from './ui';
import { SUPPORT_CONTACT, supportWhatsAppUrl } from '@/lib/support-contact';

/**
 * Help and support, like the Help screen on the Uber Eats tablet: who to call,
 * quick how-to guides and what to read out to support.
 *
 * A counter tablet usually has no SIM and no WhatsApp, so the main way to
 * reach us is a QR the staff scans with their own phone. Inside the Android
 * app, tel: and mailto: links would make the WebView fail the page (the app
 * only hands http(s) links to other apps), so there they are plain text.
 */

type Lang = 'es' | 'en';

const TX = {
  es: {
    title: 'Ayuda',
    subtitle: 'Soporte de MENIUS',
    orderSubtitle: (n: string) => `Ayuda con el pedido #${n}`,
    scan: 'Escanéalo con tu celular para escribirnos por WhatsApp',
    openWhatsApp: 'Abrir WhatsApp',
    callOrWrite: 'Llamar o WhatsApp',
    email: 'Email',
    guides: 'Guías rápidas',
    device: 'Datos de esta tablet',
    deviceHint: 'Si nos llamas, léenos esto.',
    restaurant: 'Restaurante',
    app: 'App',
    browser: 'Navegador',
    connection: 'Conexión',
    online: 'En línea',
    offline: 'Sin conexión',
    language: 'Idioma',
    langName: 'Español',
    close: 'Cerrar',
    waGeneral: (r: string) => `Hola, escribo desde ${r}. `,
    waOrder: (r: string, n: string) => `Hola, escribo desde ${r} por el pedido #${n}. `,
  },
  en: {
    title: 'Help',
    subtitle: 'MENIUS support',
    orderSubtitle: (n: string) => `Help with order #${n}`,
    scan: 'Scan it with your phone to message us on WhatsApp',
    openWhatsApp: 'Open WhatsApp',
    callOrWrite: 'Call or WhatsApp',
    email: 'Email',
    guides: 'Quick guides',
    device: 'About this tablet',
    deviceHint: 'If you call us, read us this.',
    restaurant: 'Restaurant',
    app: 'App',
    browser: 'Browser',
    connection: 'Connection',
    online: 'Online',
    offline: 'Offline',
    language: 'Language',
    langName: 'English',
    close: 'Close',
    waGeneral: (r: string) => `Hi, this is ${r}. `,
    waOrder: (r: string, n: string) => `Hi, this is ${r} about order #${n}. `,
  },
} as const;

/** Each guide matches what the Counter shows today; update both together. */
const GUIDES: Record<Lang, { q: string; a: string }[]> = {
  es: [
    { q: 'Aceptar un pedido', a: 'Cuando suena, toca el pedido, elige en cuántos minutos estará listo y toca Aceptar. Sigue sonando hasta que lo aceptes o lo rechaces.' },
    { q: 'Marcar un plato agotado (86)', a: 'Menú ☰ → Agotados → toca el plato. Queda tachado y los clientes no lo pueden pedir. Tócalo otra vez cuando vuelva.' },
    { q: 'Pausar pedidos o ir más lento', a: 'Toca el estado de arriba (Abierto). "Ocupado" suma 10 o 20 minutos a cada pedido; "Pausar" deja de recibir pedidos por 30 min, 1 h, 2 h o hasta mañana.' },
    { q: 'Volver a imprimir un ticket', a: 'Abre el pedido y toca Imprimir. Para probar la impresora: Menú ☰ → Impresora.' },
    { q: 'No suena', a: 'Si arriba aparece un aviso de sonido, tócalo. Revisa el volumen de la tablet y el de Menú ☰ → Sonido y colores.' },
    { q: 'Dice "Sin conexión"', a: 'La tablet perdió internet: revisa el wifi. Los pedidos nuevos llegan solos cuando vuelve la conexión.' },
    { q: 'Ver pedidos ya cerrados', a: 'Toca Historial, arriba. Muestra los pedidos entregados y cancelados de las últimas horas, con buscador.' },
  ],
  en: [
    { q: 'Accept an order', a: 'When it rings, tap the order, choose how many minutes until it is ready and tap Accept. It keeps ringing until you accept or reject it.' },
    { q: 'Mark a dish sold out (86)', a: 'Menu ☰ → Out of stock → tap the dish. It is crossed out and customers can’t order it. Tap it again when it’s back.' },
    { q: 'Pause orders or slow down', a: 'Tap the status at the top (Open). "Busy" adds 10 or 20 minutes to every order; "Pause" stops new orders for 30 min, 1 h, 2 h or until tomorrow.' },
    { q: 'Reprint a ticket', a: 'Open the order and tap Print. To test the printer: Menu ☰ → Printer.' },
    { q: 'It doesn’t ring', a: 'If a sound notice shows at the top, tap it. Check the tablet volume and Menu ☰ → Sound & colors.' },
    { q: 'It says "Offline"', a: 'The tablet lost internet: check the wifi. New orders come in by themselves once it’s back.' },
    { q: 'See closed orders', a: 'Tap History at the top. It shows delivered and cancelled orders from the last few hours, with search.' },
  ],
};

/** QR as an inline SVG: crisp at any size, no image request. */
function Qr({ text, size }: { text: string; size: number }) {
  const { n, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { n: count + 4, path: d };
  }, [text]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true" className="rounded-xl">
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

export function HelpSheet({
  lang, restaurantName, offline, inApp, appVersion, orderNumber, onClose,
}: {
  lang: Lang;
  restaurantName: string;
  offline: boolean;
  /** Inside the MENIUS Counter Android app. */
  inApp: boolean;
  appVersion?: string | null;
  /** Opened from an order: the WhatsApp message names it. */
  orderNumber?: string | null;
  onClose: () => void;
}) {
  const tx = TX[lang];
  const [open, setOpen] = useState<number | null>(null);
  const waText = orderNumber ? tx.waOrder(restaurantName, orderNumber) : tx.waGeneral(restaurantName);
  const wa = supportWhatsAppUrl(waText);
  const { email, phoneE164, phoneDisplay } = SUPPORT_CONTACT;

  const row = 'flex items-center gap-3 min-h-[56px] px-4 rounded-2xl text-[17px] font-semibold';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={tx.title}>
      <button type="button" aria-label={tx.close} className="absolute inset-0 cursor-default" style={{ background: C.scrim }} onClick={onClose} />
      <div className="relative w-full max-w-[640px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[28px] p-6 flex flex-col gap-6" style={RAISED}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[24px] font-bold tracking-[-0.02em]">{tx.title}</h2>
            <p className="text-[16px] font-medium mt-0.5" style={{ color: C.sub }}>
              {orderNumber ? tx.orderSubtitle(orderNumber) : tx.subtitle}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={tx.close} className="w-12 h-12 flex-none rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contacto */}
        <section className="flex flex-col gap-3">
          {wa && (
            <div className="flex items-center gap-5 p-4 rounded-2xl" style={{ background: C.fill }}>
              {/* On a phone you are already holding the phone: no QR, just the button. */}
              <div className="hidden sm:block flex-none"><Qr text={wa} size={152} /></div>
              <div className="min-w-0 flex-1 flex flex-col gap-3">
                <p className="hidden sm:block text-[17px] font-semibold leading-snug">{tx.scan}</p>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="self-stretch sm:self-start justify-center whitespace-nowrap inline-flex items-center gap-2 h-12 px-5 rounded-full text-[17px] font-semibold" style={{ background: C.accent, color: C.onAccent }}>
                  <MessageCircle className="w-5 h-5" /> {tx.openWhatsApp}
                </a>
              </div>
            </div>
          )}
          {phoneE164 && (
            inApp ? (
              <div className={row} style={{ background: C.fill }}>
                <Phone className="w-5 h-5 flex-none" style={{ color: C.sub }} />
                <span className="flex-1">{tx.callOrWrite}</span>
                <span className="tabular-nums select-all whitespace-nowrap">{phoneDisplay || phoneE164}</span>
              </div>
            ) : (
              <a href={`tel:${phoneE164}`} className={row} style={{ background: C.fill, color: C.ink }}>
                <Phone className="w-5 h-5 flex-none" style={{ color: C.sub }} />
                <span className="flex-1">{tx.callOrWrite}</span>
                <span className="tabular-nums whitespace-nowrap">{phoneDisplay || phoneE164}</span>
              </a>
            )
          )}
          {inApp ? (
            <div className={row} style={{ background: C.fill }}>
              <Mail className="w-5 h-5 flex-none" style={{ color: C.sub }} />
              <span className="flex-1">{tx.email}</span>
              <span className="select-all font-medium">{email}</span>
            </div>
          ) : (
            <a href={`mailto:${email}`} className={row} style={{ background: C.fill, color: C.ink }}>
              <Mail className="w-5 h-5 flex-none" style={{ color: C.sub }} />
              <span className="flex-1">{tx.email}</span>
              <span className="font-medium">{email}</span>
            </a>
          )}
        </section>

        {/* Guías */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold" style={{ color: C.sub }}>{tx.guides}</h3>
          <div className="rounded-2xl overflow-hidden" style={{ background: C.fill }}>
            {GUIDES[lang].map((g, i) => {
              const isOpen = open === i;
              return (
                <div key={g.q} className="border-t first:border-t-0" style={{ borderColor: C.line }}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full min-h-[56px] px-4 flex items-center justify-between gap-3 text-left text-[17px] font-semibold">
                    {g.q}
                    <ChevronDown className="w-5 h-5 flex-none transition-transform" style={{ color: C.sub, transform: isOpen ? 'rotate(180deg)' : undefined }} />
                  </button>
                  {isOpen && <p className="px-4 pb-4 -mt-1 text-[16px] leading-relaxed" style={{ color: C.sub }}>{g.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Datos para soporte */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[15px] font-semibold" style={{ color: C.sub }}>{tx.device}</h3>
          <dl className="rounded-2xl px-4 py-2 text-[16px]" style={{ background: C.fill }}>
            {[
              [tx.restaurant, restaurantName],
              [tx.app, inApp ? `MENIUS Counter ${appVersion ?? ''}`.trim() : tx.browser],
              [tx.connection, offline ? tx.offline : tx.online],
              [tx.language, tx.langName],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-t first:border-t-0" style={{ borderColor: C.line }}>
                <dt style={{ color: C.sub }}>{k}</dt>
                <dd className="font-semibold text-right" style={k === tx.connection && offline ? { color: C.critical } : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[14px]" style={{ color: C.sub }}>{tx.deviceHint}</p>
        </section>
      </div>
    </div>
  );
}
