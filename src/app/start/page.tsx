import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { V2Page } from '@/components/landing-v2/V2Page';
import '@/components/landing-v2/lv2-help.css';
import { getLandingV2Copy, resolveLandingV2Locale, type LandingV2Locale } from '@/lib/landing-v2-copy';
import { TRIAL_DAYS } from '@/lib/plans';
import { SUPPORT_CONTACT } from '@/lib/support-contact';

/**
 * /start (fase 3 del rediseño): guía honesta en dos caminos. (a) Lo haces tú,
 * con los pasos y los nombres reales del panel y de la app Counter;
 * (b) lo hacemos nosotros (setup profesional, "3 a 14 días según tu menú").
 * Sin promesas de tiempo para el camino propio.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  return locale === 'en'
    ? {
        title: 'Getting started',
        description: `Two ways to start with MENIUS: set it up yourself from your dashboard with ${TRIAL_DAYS} days of Pro free, or let our team do it in 3 to 14 days.`,
        alternates: { canonical: '/start' },
        robots: { index: true, follow: true },
      }
    : {
        title: 'Primeros pasos',
        description: `Dos formas de empezar con MENIUS: configúralo tú desde tu panel con ${TRIAL_DAYS} días de Pro gratis, o deja que nuestro equipo lo haga en 3 a 14 días.`,
        alternates: { canonical: '/start' },
        robots: { index: true, follow: true },
      };
}

type Step = {
  id: string;
  title: string;
  where: string[];
  desc: string;
  tasks: string[];
  tip?: string;
  link?: { href: string; label: string };
};

const T: Record<LandingV2Locale, {
  badge: string;
  h1: string;
  lead: string;
  aStamp: string;
  aTitle: string;
  aDesc: string;
  aPoints: string[];
  aSteps: string;
  bStamp: string;
  bTitle: string;
  bDesc: string;
  bPoints: string[];
  bPrice: string;
  bCta: string;
  diyTitle: string;
  diyLead: string;
  steps: Step[];
  setupTitle: string;
  setupLead: string;
  setupSteps: { h: string; p: string }[];
  setupCta: string;
  askTitle: string;
  askText: string;
  askSupport: string;
}> = {
  en: {
    badge: 'Getting started',
    h1: 'Two ways to get started.',
    lead: 'Set up MENIUS yourself from your dashboard, or let our team do it for you. This is what each path looks like.',
    aStamp: 'You do it',
    aTitle: 'Set it up yourself',
    aDesc: `Start with ${TRIAL_DAYS} days of Pro free, no card. You load the menu and connect everything from your dashboard.`,
    aPoints: ['Create your account and your menu', 'Connect Stripe for card payments', 'Install the Counter app and link the printer', 'Share your link'],
    aSteps: 'See the 5 steps',
    bStamp: 'We do it',
    bTitle: 'Professional setup',
    bDesc: 'We load your menu, set up the tablet and printer, and train your staff.',
    bPoints: ['Every dish, option and price, checked with you', 'Tablet and printer at cost, and they’re yours', 'Training on-site or by video call', 'In 3 to 14 days, depending on your menu'],
    bPrice: 'One-time fee by menu size: $299, $499 or $899. Free with the annual plan.',
    bCta: 'See Professional Setup',
    diyTitle: 'Your 5 steps',
    diyLead: 'Each step tells you where it is in your dashboard. If you get stuck, call or message us.',
    steps: [
      {
        id: 'account',
        title: 'Create your account',
        where: ['menius.app', 'Try Pro free'],
        desc: `Sign up with your email or Google. You get ${TRIAL_DAYS} days of Pro free, no card. After that you subscribe to Pro or stay on the Free plan.`,
        tasks: [
          'Choose your type of business',
          'Write your restaurant’s name and pick your link (menius.app/your-restaurant)',
          'Add your first dishes now, or skip and do it in the next step',
        ],
        link: { href: '/signup', label: 'Create my account' },
      },
      {
        id: 'menu',
        title: 'Load your menu',
        where: ['Dashboard', 'Menu', 'Categories · Products'],
        desc: 'Create your categories first, then each dish with its price.',
        tasks: [
          'Categories: Breakfast, Burgers, Drinks… in the order your customers read them',
          'Each dish: name, description, price, and options or add-ons if it has them',
          'Photos: upload your own. For dishes without one, Generate with AI creates one (Pro)',
          'In Settings, add your logo, cover photo and brand color',
        ],
        tip: 'A bad photo hurts more than no photo. If a picture doesn’t look like what you serve, leave the dish without one.',
        link: { href: '/ai-fotos', label: 'How AI photos work' },
      },
      {
        id: 'payments',
        title: 'Turn on orders and connect Stripe',
        where: ['Dashboard', 'Settings'],
        desc: 'Choose how you take orders and how your customers pay.',
        tasks: [
          'Order types: pickup, delivery and dine-in by QR. For delivery, set your fee and your area',
          'Operating hours: the days and times you take orders',
          'Payment methods: enable cash if you take it, and tap Connect Stripe for card payments',
          'Stripe asks for your business details and bank account; card payments go to your own Stripe account',
        ],
        tip: 'Stripe has to verify your identity and your bank. Do it early, so card payments are ready when you open.',
      },
      {
        id: 'counter',
        title: 'Install the Counter app and link the printer',
        where: ['Dashboard', 'Counter / Caja'],
        desc: 'Orders arrive on an Android tablet that rings until someone accepts them, and the ticket prints.',
        tasks: [
          'On the tablet (Android 9 or later), install MENIUS Counter from Google Play',
          'Open the app: it shows a code. Scan it with your phone, or tap Connect a tablet in your dashboard, and approve it',
          'Bluetooth printer: pair it in Android Settings → Bluetooth, then in the app open Printer and tap Choose paired printer',
          'Star CloudPRNT printer: add it in your dashboard under Settings → Printers',
        ],
        tip: 'No Android tablet yet? The Counter also works in the browser of any tablet, phone or computer. We can get the tablet and printer for you at cost.',
      },
      {
        id: 'share',
        title: 'Test it and share your link',
        where: ['Dashboard', 'Settings', 'Public menu link'],
        desc: 'Place a test order from your phone before you tell your customers.',
        tasks: [
          'Order from your phone and check that the tablet rings and the ticket prints',
          'Share your link on Instagram, Google and WhatsApp',
          'Print the QR codes for your tables from Tables & QRs',
        ],
      },
    ],
    setupTitle: 'Or we set it up for you',
    setupLead: 'Our team does all of it with you. You keep cooking.',
    setupSteps: [
      { h: 'We load your menu and photos.', p: 'Every dish, option and price, checked with you.' },
      { h: 'We set up the tablet and printer.', p: 'At cost, and they’re yours to keep.' },
      { h: 'We train your staff.', p: 'On-site or by video call, in English or Spanish.' },
      { h: 'You go live.', p: 'In 3 to 14 days, depending on your menu.' },
    ],
    setupCta: 'See Professional Setup',
    askTitle: 'Stuck on a step?',
    askText: 'Call us or send a WhatsApp. A real person answers, in English or Spanish.',
    askSupport: 'More ways to get help',
  },
  es: {
    badge: 'Primeros pasos',
    h1: 'Dos formas de empezar.',
    lead: 'Configura MENIUS tú mismo desde tu panel, o deja que nuestro equipo lo haga por ti. Así es cada camino.',
    aStamp: 'Lo haces tú',
    aTitle: 'Configúralo tú',
    aDesc: `Empiezas con ${TRIAL_DAYS} días de Pro gratis, sin tarjeta. Cargas el menú y conectas todo desde tu panel.`,
    aPoints: ['Crea tu cuenta y tu menú', 'Conecta Stripe para cobrar con tarjeta', 'Instala la app Counter y vincula la impresora', 'Comparte tu enlace'],
    aSteps: 'Ver los 5 pasos',
    bStamp: 'Lo hacemos nosotros',
    bTitle: 'Setup profesional',
    bDesc: 'Cargamos tu menú, instalamos la tablet y la impresora, y capacitamos a tu equipo.',
    bPoints: ['Cada plato, opción y precio, revisado contigo', 'Tablet e impresora a precio de costo, y son tuyas', 'Capacitación en tu local o por videollamada', 'Listo en 3 a 14 días, según tu menú'],
    bPrice: 'Pago único según el tamaño de tu menú: $299, $499 o $899. Gratis con el plan anual.',
    bCta: 'Ver el Setup profesional',
    diyTitle: 'Tus 5 pasos',
    diyLead: 'Cada paso te dice dónde está en tu panel. Si te trabas, llámanos o escríbenos.',
    steps: [
      {
        id: 'account',
        title: 'Crea tu cuenta',
        where: ['menius.app', 'Prueba Pro gratis'],
        desc: `Regístrate con tu email o con Google. Tienes ${TRIAL_DAYS} días de Pro gratis, sin tarjeta. Después te suscribes a Pro o sigues en el plan Free.`,
        tasks: [
          'Elige tu tipo de negocio',
          'Escribe el nombre de tu restaurante y elige tu enlace (menius.app/tu-restaurante)',
          'Agrega tus primeros platos ahora, o sáltalo y hazlo en el siguiente paso',
        ],
        link: { href: '/signup', label: 'Crear mi cuenta' },
      },
      {
        id: 'menu',
        title: 'Carga tu menú',
        where: ['Panel', 'Menú', 'Categorías · Productos'],
        desc: 'Primero crea tus categorías y luego cada plato con su precio.',
        tasks: [
          'Categorías: Desayunos, Hamburguesas, Bebidas… en el orden en que las lee tu cliente',
          'Cada plato: nombre, descripción, precio, y opciones o agregados si los tiene',
          'Fotos: sube las tuyas. Para los platos sin foto, Generar con IA crea una (Pro)',
          'En Configuración, agrega tu logo, tu foto de portada y el color de tu marca',
        ],
        tip: 'Una mala foto resta más que ninguna. Si una imagen no se parece a lo que sirves, deja el plato sin foto.',
        link: { href: '/ai-fotos', label: 'Cómo funcionan las fotos con IA' },
      },
      {
        id: 'payments',
        title: 'Activa los pedidos y conecta Stripe',
        where: ['Panel', 'Configuración'],
        desc: 'Elige cómo recibes pedidos y cómo te pagan tus clientes.',
        tasks: [
          'Tipos de orden: para llevar, delivery y en mesa con QR. Para delivery, define tu tarifa y tu zona',
          'Horario de operación: los días y horas en que recibes pedidos',
          'Métodos de pago: activa efectivo si lo aceptas, y toca Conectar Stripe para cobrar con tarjeta',
          'Stripe te pide los datos de tu negocio y tu cuenta bancaria; los pagos con tarjeta llegan a tu propia cuenta de Stripe',
        ],
        tip: 'Stripe tiene que verificar tu identidad y tu banco. Hazlo con tiempo, para que los pagos con tarjeta estén listos cuando abras.',
      },
      {
        id: 'counter',
        title: 'Instala la app Counter y vincula la impresora',
        where: ['Panel', 'Caja / Counter'],
        desc: 'Los pedidos llegan a una tablet Android que suena hasta que alguien los acepta, y el ticket se imprime.',
        tasks: [
          'En la tablet (Android 9 o superior), instala MENIUS Counter desde Google Play',
          'Abre la app: muestra un código. Escanéalo con tu celular, o toca Conectar una tablet en tu panel, y apruébalo',
          'Impresora Bluetooth: emparéjala en Ajustes de Android → Bluetooth y luego, en la app, abre Impresora y toca Elegir impresora emparejada',
          'Impresora Star CloudPRNT: agrégala en tu panel, en Configuración → Impresoras',
        ],
        tip: '¿Todavía no tienes tablet Android? El Counter también funciona en el navegador de cualquier tablet, celular o computadora. Podemos conseguirte la tablet y la impresora a precio de costo.',
      },
      {
        id: 'share',
        title: 'Pruébalo y comparte tu enlace',
        where: ['Panel', 'Configuración', 'Enlace público del menú'],
        desc: 'Haz un pedido de prueba desde tu celular antes de avisarles a tus clientes.',
        tasks: [
          'Pide desde tu celular y revisa que la tablet suene y el ticket se imprima',
          'Comparte tu enlace en Instagram, Google y WhatsApp',
          'Imprime los QR de tus mesas desde Mesas & QRs',
        ],
      },
    ],
    setupTitle: 'O lo configuramos por ti',
    setupLead: 'Nuestro equipo lo hace todo contigo. Tú sigues cocinando.',
    setupSteps: [
      { h: 'Cargamos tu menú y tus fotos.', p: 'Cada plato, opción y precio, revisado contigo.' },
      { h: 'Instalamos la tablet y la impresora.', p: 'A precio de costo, y son tuyas.' },
      { h: 'Capacitamos a tu equipo.', p: 'En tu local o por videollamada, en inglés o en español.' },
      { h: 'Empiezas a vender.', p: 'Listo en 3 a 14 días, según tu menú.' },
    ],
    setupCta: 'Ver el Setup profesional',
    askTitle: '¿Te trabaste en un paso?',
    askText: 'Llámanos o escríbenos por WhatsApp. Te atiende una persona real, en inglés o en español.',
    askSupport: 'Más formas de pedir ayuda',
  },
};

function Where({ parts }: { parts: string[] }) {
  return (
    <p className="where">
      {parts.map((w, i) => (
        <Fragment key={w}>
          {i > 0 && ' '}
          <span>
            {i > 0 && <><i aria-hidden="true">→</i>{' '}</>}
            {i === parts.length - 1 ? <b>{w}</b> : w}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

export default async function StartPage() {
  const cookieStore = await cookies();
  const locale = resolveLandingV2Locale(cookieStore.get('menius_locale')?.value);
  const t = T[locale];
  const tryPro = getLandingV2Copy(locale).nav.tryPro;

  return (
    <V2Page locale={locale}>
      <main id="main-content">
        <header className="ph ph-split">
          <div className="wrap">
            <div>
              <span className="stamp label">{t.badge}</span>
              <h1>{t.h1}</h1>
            </div>
            <p className="lead">{t.lead}</p>
          </div>
        </header>

        <section className="chap tight paths-sec" aria-label={t.h1}>
          <div className="wrap paths">
            <article className="path">
              <span className="stamp label">{t.aStamp}</span>
              <h2>{t.aTitle}</h2>
              <p>{t.aDesc}</p>
              <ul className="ticks">
                {t.aPoints.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <div className="acts">
                <Link className="btn btn-primary" href="/signup">{tryPro}</Link>
                <a className="tlink" href="#steps">{t.aSteps}</a>
              </div>
            </article>
            <article className="path dark">
              <span className="stamp label inv">{t.bStamp}</span>
              <h2>{t.bTitle}</h2>
              <p>{t.bDesc}</p>
              <ul className="ticks">
                {t.bPoints.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <p className="price-line">{t.bPrice}</p>
              <div className="acts">
                <Link className="tlink" href="/setup-profesional">{t.bCta}</Link>
              </div>
            </article>
          </div>
        </section>

        <section className="chap tight alt" id="steps" aria-labelledby="st-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="st-h" className="h-a">{t.diyTitle}</h2>
              <p className="lead">{t.diyLead}</p>
            </div>
            <ol className="walk">
              {t.steps.map((s, i) => (
                <li key={s.id} id={s.id}>
                  <div className="n">
                    <span className="stamp" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="body">
                    <h3>{s.title}</h3>
                    <Where parts={s.where} />
                    <p>{s.desc}</p>
                    <ul className="ticks">
                      {s.tasks.map((task) => <li key={task}>{task}</li>)}
                    </ul>
                  </div>
                  {(s.tip || s.link) && (
                    <div className="side">
                      {s.tip && <p className="tip">{s.tip}</p>}
                      {s.link && (
                        <p className="go">
                          <Link className="tlink" href={s.link.href}>{s.link.label}</Link>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="chap tight" id="setup" aria-labelledby="su-h">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="su-h" className="h-a">{t.setupTitle}</h2>
              <p className="lead">{t.setupLead}</p>
            </div>
            <ol className="steps4 grid2">
              {t.setupSteps.map((s, i) => (
                <li key={s.h}>
                  <span className="n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </li>
              ))}
            </ol>
            <p className="faq-all">
              <Link className="tlink" href="/setup-profesional">{t.setupCta}</Link>
            </p>

            <section className="ask band-dark" aria-labelledby="sa-h">
              <div>
                <h2 id="sa-h">{t.askTitle}</h2>
                <p>{t.askText}</p>
              </div>
              <div className="acts">
                <a className="big" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
                <Link className="tlink" href="/support">{t.askSupport}</Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    </V2Page>
  );
}
