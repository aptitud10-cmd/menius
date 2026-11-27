import { Fragment } from 'react';
import Link from 'next/link';
import { V2Page } from '@/components/landing-v2/V2Page';
import '@/components/landing-v2/lv2-help.css';
import type { LandingV2Locale } from '@/lib/landing-v2-copy';
import { TRIAL_DAYS } from '@/lib/plans';
import { SUPPORT_CONTACT, supportWhatsAppUrl } from '@/lib/support-contact';
import { SupportForm, type SupportFormText } from './SupportForm';

/**
 * /support (fase 3 del rediseño): soporte de una persona real. Arriba el
 * teléfono, WhatsApp, email y el horario (el mismo que figuraba antes en esta
 * página); el asistente del panel queda como canal secundario para quien ya
 * tiene cuenta. Las guías rápidas solo nombran lo que existe hoy en el panel.
 */

type Guide = { n: string; title: string; where: string[]; desc: string; link: { href: string; label: string } };
type Qa = { q: string; a: string };

const T: Record<LandingV2Locale, {
  badge: string;
  h1: string;
  h1Voice: string;
  lead: string;
  ctaWrite: string;
  myDashboard: string;
  cardK: string;
  hours: string;
  weekends: string;
  guidesTitle: string;
  guidesLead: string;
  guides: Guide[];
  assistB: string;
  assistT: string;
  assistCta: string;
  faqTitle: string;
  faqAll: string;
  faqs: Qa[];
  formTitle: string;
  formLead: string;
  points: { b: string; t: string }[];
  form: SupportFormText;
  statusQ: string;
  statusLink: string;
  talkQ: string;
}> = {
  en: {
    badge: 'Support',
    h1: 'Talk to us.',
    h1Voice: 'In English or Spanish.',
    lead: 'Call us, send a WhatsApp or write an email. We help with your menu, the Counter tablet, the printer and card payments.',
    ctaWrite: 'Send us a message',
    myDashboard: 'Go to my dashboard',
    cardK: 'Call or WhatsApp',
    hours: 'Monday to Friday, 9 am to 7 pm ET',
    weekends: 'Weekends, by email.',
    guidesTitle: 'Quick guides',
    guidesLead: 'What restaurants ask about most. The full step by step is in the quick start guide.',
    guides: [
      {
        n: '01',
        title: 'Create your menu',
        where: ['Dashboard', 'Menu', 'Products'],
        desc: 'Add your categories, then each dish with its price, description, photo, options and add-ons.',
        link: { href: '/start#menu', label: 'Step by step' },
      },
      {
        n: '02',
        title: 'AI photos',
        where: ['Products', 'a dish', 'Generate with AI'],
        desc: 'For dishes without a photo, included in Pro. If you’d rather use your real dishes, send us phone photos and we enhance them for $10 per dish.',
        link: { href: '/ai-fotos', label: 'How AI photos work' },
      },
      {
        n: '03',
        title: 'Counter tablet and printer',
        where: ['Dashboard', 'Counter / Caja'],
        desc: 'Install MENIUS Counter from Google Play on an Android tablet and connect it with a code. Pair the printer by Bluetooth and choose it under Printer, inside the app.',
        link: { href: '/start#counter', label: 'Step by step' },
      },
      {
        n: '04',
        title: 'Card payments with Stripe',
        where: ['Settings', 'Payment methods', 'Connect Stripe'],
        desc: 'Stripe asks for your business details and bank account. Payments go to your own Stripe account, and MENIUS takes 0%.',
        link: { href: '/start#payments', label: 'Step by step' },
      },
    ],
    assistB: 'Already have an account?',
    assistT: ' The assistant in your dashboard explains how to do things in MENIUS and answers questions about your sales. For everything else, call or write to us.',
    assistCta: 'Open the assistant',
    faqTitle: 'Common questions',
    faqAll: 'See all questions',
    faqs: [
      {
        q: 'What happens when my free trial ends?',
        a: `You get ${TRIAL_DAYS} days of Pro free, no card. If you don’t subscribe afterwards, your account moves to the Free plan: a menu with QR codes for up to 5 tables, up to 15 products and unlimited dine-in orders paid in cash. Your menu and your data stay.`,
      },
      {
        q: 'How do I add photos to my dishes?',
        a: 'Open the dish in Menu → Products and upload your own photo. For dishes without one, Pro can create an AI photo with Generate with AI. If you’d rather we handle it, send us phone photos of your dishes and we enhance them with AI for $10 per dish.',
      },
      {
        q: 'What tablet and printer do I need?',
        a: 'Any Android tablet with the Counter app from Google Play, plus a thermal printer (Bluetooth or Star CloudPRNT). We can get both for you at cost. On an iPad, a phone or a computer, the Counter also works in the browser.',
      },
      {
        q: 'Who pays the card fees?',
        a: 'You pay Stripe’s standard fee, about 2.9% + 30¢ per card payment, like any card terminal. MENIUS takes 0%, and your customer pays no extra service fee.',
      },
      {
        q: 'Where do I find my menu link and table QR codes?',
        a: 'Your link is in Settings, under Public menu link. The QR codes for your tables are in Tables & QRs, ready to download and print.',
      },
    ],
    formTitle: 'Write to us',
    formLead: 'We read every message and reply by email.',
    points: [
      { b: 'Monday to Friday, 9 am to 7 pm ET.', t: ' Weekends, by email.' },
      { b: 'Your information is private', t: ' and never shared.' },
    ],
    form: {
      title: 'Write to us',
      topic: 'Topic',
      topicNone: 'Choose a topic',
      topics: [
        { id: 'billing', label: 'Billing and plans' },
        { id: 'technical', label: 'Technical issue' },
        { id: 'menu', label: 'My menu or products' },
        { id: 'account', label: 'My account' },
        { id: 'feature', label: 'Suggestion' },
        { id: 'other', label: 'Other' },
      ],
      name: 'Your name',
      namePh: 'John Smith',
      email: 'Your email',
      emailPh: 'john@myrestaurant.com',
      message: 'How can we help?',
      messagePh: 'Tell us what happened, as clearly as you can.',
      send: 'Send message',
      sending: 'Sending…',
      sentTitle: 'Message sent',
      sentMsg: 'We got your message and will answer you by email.',
      again: 'Send another message',
      errTooMany: 'Too many messages in a few minutes. Try again in 10 minutes, or email us at',
      errDefault: 'We couldn’t send your message. Please email us at',
      errNetwork: 'Network error. Please email us at',
      optional: 'optional',
    },
    statusQ: 'Something not loading?',
    statusLink: 'Check the system status',
    talkQ: 'Rather talk?',
  },
  es: {
    badge: 'Soporte',
    h1: 'Habla con nosotros.',
    h1Voice: 'En inglés o en español.',
    lead: 'Llámanos, escríbenos por WhatsApp o mándanos un email. Te ayudamos con tu menú, la tablet Counter, la impresora y los pagos con tarjeta.',
    ctaWrite: 'Envíanos un mensaje',
    myDashboard: 'Ir a mi panel',
    cardK: 'Llámanos o escríbenos por WhatsApp',
    hours: 'Lunes a viernes, de 9 am a 7 pm, hora del Este',
    weekends: 'Fines de semana, por email.',
    guidesTitle: 'Guías rápidas',
    guidesLead: 'Lo que más nos preguntan los restaurantes. El paso a paso completo está en la guía de inicio.',
    guides: [
      {
        n: '01',
        title: 'Crea tu menú',
        where: ['Panel', 'Menú', 'Productos'],
        desc: 'Agrega tus categorías y luego cada plato con su precio, descripción, foto, opciones y agregados.',
        link: { href: '/start#menu', label: 'Paso a paso' },
      },
      {
        n: '02',
        title: 'Fotos con IA',
        where: ['Productos', 'un plato', 'Generar con IA'],
        desc: 'Para los platos sin foto, incluido en Pro. Si prefieres tus platos reales, nos mandas fotos del celular y las mejoramos por $10 por plato.',
        link: { href: '/ai-fotos', label: 'Cómo funcionan las fotos con IA' },
      },
      {
        n: '03',
        title: 'Tablet Counter e impresora',
        where: ['Panel', 'Caja / Counter'],
        desc: 'Instala MENIUS Counter desde Google Play en una tablet Android y conéctala con un código. Empareja la impresora por Bluetooth y elígela en Impresora, dentro de la app.',
        link: { href: '/start#counter', label: 'Paso a paso' },
      },
      {
        n: '04',
        title: 'Pagos con tarjeta (Stripe)',
        where: ['Configuración', 'Métodos de pago', 'Conectar Stripe'],
        desc: 'Stripe te pide los datos de tu negocio y tu cuenta bancaria. Los pagos llegan a tu propia cuenta de Stripe, y MENIUS cobra 0%.',
        link: { href: '/start#payments', label: 'Paso a paso' },
      },
    ],
    assistB: '¿Ya tienes cuenta?',
    assistT: ' El asistente de tu panel te explica cómo hacer cada cosa en MENIUS y responde preguntas sobre tus ventas. Para todo lo demás, llámanos o escríbenos.',
    assistCta: 'Abrir el asistente',
    faqTitle: 'Preguntas comunes',
    faqAll: 'Ver todas las preguntas',
    faqs: [
      {
        q: '¿Qué pasa cuando termina mi prueba gratis?',
        a: `Tienes ${TRIAL_DAYS} días de Pro gratis, sin tarjeta. Si después no te suscribes, tu cuenta pasa al plan Free: menú con QR para hasta 5 mesas, hasta 15 productos y pedidos en mesa ilimitados pagados en efectivo. Tu menú y tus datos se quedan.`,
      },
      {
        q: '¿Cómo agrego fotos a mis platos?',
        a: 'Abre el plato en Menú → Productos y sube tu propia foto. Para los platos sin foto, Pro puede crear una con IA desde Generar con IA. Si prefieres que nos encarguemos, nos mandas fotos de tus platos sacadas con el celular y las mejoramos con IA por $10 por plato.',
      },
      {
        q: '¿Qué tablet e impresora necesito?',
        a: 'Cualquier tablet Android con la app Counter de Google Play, y una impresora térmica (Bluetooth o Star CloudPRNT). Podemos conseguirte las dos a precio de costo. En iPad, celular o computadora, el Counter también funciona desde el navegador.',
      },
      {
        q: '¿Quién paga la comisión de la tarjeta?',
        a: 'Tú pagas la tarifa estándar de Stripe, cerca de 2.9% + 30¢ por pago con tarjeta, como cualquier terminal. MENIUS cobra 0%, y tu cliente no paga ningún cargo extra por servicio.',
      },
      {
        q: '¿Dónde encuentro el enlace de mi menú y los QR de las mesas?',
        a: 'Tu enlace está en Configuración, en Enlace público del menú. Los QR de tus mesas están en Mesas & QRs, listos para descargar e imprimir.',
      },
    ],
    formTitle: 'Escríbenos',
    formLead: 'Leemos cada mensaje y te respondemos por email.',
    points: [
      { b: 'Lunes a viernes, de 9 am a 7 pm, hora del Este.', t: ' Fines de semana, por email.' },
      { b: 'Tu información es privada', t: ' y nunca se comparte.' },
    ],
    form: {
      title: 'Escríbenos',
      topic: 'Tema',
      topicNone: 'Elige un tema',
      topics: [
        { id: 'billing', label: 'Facturación y planes' },
        { id: 'technical', label: 'Problema técnico' },
        { id: 'menu', label: 'Mi menú o productos' },
        { id: 'account', label: 'Mi cuenta' },
        { id: 'feature', label: 'Sugerencia' },
        { id: 'other', label: 'Otro' },
      ],
      name: 'Tu nombre',
      namePh: 'María García',
      email: 'Tu email',
      emailPh: 'maria@mirestaurante.com',
      message: '¿En qué te podemos ayudar?',
      messagePh: 'Cuéntanos qué pasó, lo más claro que puedas.',
      send: 'Enviar mensaje',
      sending: 'Enviando…',
      sentTitle: 'Mensaje enviado',
      sentMsg: 'Recibimos tu mensaje y te respondemos por email.',
      again: 'Enviar otro mensaje',
      errTooMany: 'Demasiados mensajes en pocos minutos. Intenta de nuevo en 10 minutos o escríbenos a',
      errDefault: 'No pudimos enviar tu mensaje. Escríbenos a',
      errNetwork: 'Error de red. Escríbenos a',
      optional: 'opcional',
    },
    statusQ: '¿Algo no carga?',
    statusLink: 'Revisa el estado del sistema',
    talkQ: '¿Prefieres hablar?',
  },
};

export default function PublicSupportPage({ locale }: { locale: LandingV2Locale }) {
  const t = T[locale];
  const wa = supportWhatsAppUrl();

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph help-hero">
          <div className="wrap">
            <div>
              <span className="stamp label">{t.badge}</span>
              <h1>
                {t.h1} <span className="voice">{t.h1Voice}</span>
              </h1>
              <p className="lead">{t.lead}</p>
              <div className="row">
                <a className="btn btn-primary" href="#contact">{t.ctaWrite}</a>
                <Link className="tlink" href="/app">{t.myDashboard}</Link>
              </div>
            </div>
            <aside className="contact" aria-label={t.cardK}>
              <p className="k">{t.cardK}</p>
              <a className="big" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
              <div className="alt">
                {wa && (
                  <a className="tlink" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                )}
                <a className="tlink" href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
              </div>
              <p className="hours">
                <b>{t.hours}</b>
                {t.weekends}
              </p>
            </aside>
          </div>
        </header>

        <section className="chap tight alt" aria-labelledby="sg-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="sg-h" className="h-a">{t.guidesTitle}</h2>
              <p className="lead">{t.guidesLead}</p>
            </div>
            <ol className="guides">
              {t.guides.map((g) => (
                <li key={g.n}>
                  <span className="n" aria-hidden="true">{g.n}</span>
                  <h3>{g.title}</h3>
                  <p className="where">
                    {g.where.map((w, i) => (
                      <Fragment key={w}>
                        {i > 0 && ' '}
                        <span>{i > 0 && <><i aria-hidden="true">→</i>{' '}</>}{i === g.where.length - 1 ? <b>{w}</b> : w}</span>
                      </Fragment>
                    ))}
                  </p>
                  <p>{g.desc}</p>
                  <Link className="tlink" href={g.link.href}>{g.link.label}</Link>
                </li>
              ))}
            </ol>
            <div className="assist">
              <p>
                <b>{t.assistB}</b>
                {t.assistT}
              </p>
              <Link className="tlink" href="/app">{t.assistCta}</Link>
            </div>
          </div>
        </section>

        <section className="chap tight" aria-labelledby="sq-h">
          <div className="wrap">
            <div className="sfaq">
              <h2 id="sq-h" className="h-b">{t.faqTitle}</h2>
              {t.faqs.map((f, i) => (
                <details key={f.q} className="q" open={i === 0}>
                  <summary>{f.q}</summary>
                  <div className="a">{f.a}</div>
                </details>
              ))}
              <p className="faq-all">
                <Link className="tlink" href="/faq">{t.faqAll}</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="chap tight alt" id="contact" aria-labelledby="sc-h">
          <div className="wrap req-grid">
            <div>
              <h2 id="sc-h" className="h-b">{t.formTitle}</h2>
              <p className="lead sup-form-lead">{t.formLead}</p>
              <ul className="sup-points">
                {t.points.map((p) => (
                  <li key={p.b}><b>{p.b}</b>{p.t}</li>
                ))}
                <li>
                  <b>{t.talkQ}</b>{' '}
                  <a className="sup-tel" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
                </li>
                <li>
                  <b>{t.statusQ}</b>{' '}
                  <Link className="sup-tel" href="/status">{t.statusLink}</Link>
                </li>
              </ul>
            </div>
            <SupportForm t={t.form} />
          </div>
        </section>

      </main>
    </V2Page>
  );
}
