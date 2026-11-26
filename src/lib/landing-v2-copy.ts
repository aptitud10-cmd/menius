/**
 * Textos de la landing nueva (`/`, src/components/landing-v2).
 *
 * EN = texto exacto de la maqueta aprobada (.specify/docs/landing-rediseno/maqueta).
 * ES = español neutro con tuteo. Los datos de la demo (The Grill House, Maria G.,
 * #021, horas, montos) son iguales en los dos idiomas: es el mismo pedido.
 *
 * Los precios del plan salen de plans.ts; los de setup y sitio web no están en
 * plans.ts (no son suscripción) y viven acá.
 */
import { PLANS, TRIAL_DAYS } from '@/lib/plans';

export type LandingV2Locale = 'en' | 'es';

/** El idioma de la landing sale de la cookie `menius_locale`; inglés por defecto (como el middleware). */
export function resolveLandingV2Locale(cookieValue: string | undefined): LandingV2Locale {
  return cookieValue === 'es' ? 'es' : 'en';
}

/** $1,490 — siempre con formato en-US (mismo resultado en servidor y cliente). */
export function usd(n: number): string {
  const abs = Math.round(Math.abs(n)).toLocaleString('en-US');
  return `${n < 0 ? '−' : ''}$${abs}`;
}

export const PRO_MONTHLY = PLANS.pro.price.monthly;
export const PRO_ANNUAL = PLANS.pro.price.annual;
export const SETUP_TIERS = [299, 499, 899] as const;
export const WEBSITE_PRICE = 1200;

export interface CalcCopy {
  salesLabel: string;
  chargeLabel: string;
  commissionLine: string;
  cardLine: string;
  proLine: string;
  keepLabel: string;
  perMonth: string;
  /** Plantilla: {third} y {breakeven} se reemplazan con montos. */
  note: string;
  /** Cuando mover un tercio todavía no cubre el plan. {third} = lo que falta. */
  noteShort: string;
  chipsLabel: string;
}

export interface QA {
  q: string;
  a: string;
}

export interface FeatureGroup {
  title: string;
  items: string[];
}

export interface LandingV2Copy {
  meta: { title: string; description: string; ogAlt: string; schemaDescription: string; siteDescription: string };
  nav: {
    how: string;
    pricing: string;
    demo: string;
    signIn: string;
    tryPro: string;
    openMenu: string;
    closeMenu: string;
    mainNav: string;
  };
  hero: {
    h1: string;
    h1Voice: string;
    leadWide: string;
    leadPhone: string;
    talk: string;
    cue: string;
    counterAlt: string;
    photoAlt: string;
  };
  zero: { h2: string; perMonth: string; small: string };
  story: {
    h2: string;
    lead: string;
    order: { h3: string; p: string; menuAlt: string; dishAlt: string };
    print: { h3: string; p: string; counterAlt: string; ticketAlt: string };
    kitchen: { h3: string; p: string; fullAlt: string; cropAlt: string; allDayAlt: string };
    driver: { h3: string; p: string; alt: string };
    delivered: { h3: string; p: string; alt: string };
  };
  site: { when: string; h2: string; lead: string; priceNote: string; desktopAlt: string; phoneAlt: string };
  month: {
    label: string;
    h2: string;
    lead: string;
    calc: CalcCopy;
    vsH3: string;
    verdict: string;
    diffs: { b: string; t: string }[];
    cmpHead: [string, string, string];
    cmpRows: { label: string; us: string; apps: string; chownow: string }[];
    cmpSource: string;
    cmpCaption: string;
  };
  setup: {
    label: string;
    h2: string;
    lead: string;
    steps: { h: string; p: string }[];
    talk: string;
    tiersTitle: string;
    tiers: [string, string, string];
    free: string;
  };
  pricing: {
    label: string;
    h2: string;
    perMonth: string;
    altPre: string;
    altBold: string;
    altPost: string;
    zeroBold: string;
    zeroRest: string;
    small: string;
    groups: FeatureGroup[];
    foot: { b: string; t: string }[];
  };
  faq: { label: string; h2: string; side: string; items: QA[] };
  closing: { when: string; h2: string; h2Voice: string; small: string; cap: string; alt: string };
  footer: {
    callOr: string;
    product: string;
    company: string;
    legal: string;
    faq: string;
    blog: string;
    setup: string;
    status: string;
    contact: string;
    terms: string;
    privacy: string;
    accessibility: string;
    cookies: string;
    language: string;
  };
  sticky: { b: string; t: string; close: string };
}

const pro = usd(PRO_MONTHLY);
const proYear = usd(PRO_ANNUAL);

const en: LandingV2Copy = {
  meta: {
    title: 'Commission-free online ordering for restaurants',
    description: `Your own ordering page, a Counter tablet that rings, printed tickets and a kitchen screen. ${pro} a month, 0% commission. ${TRIAL_DAYS}-day free trial.`,
    ogAlt: 'MENIUS — Commission-free online ordering for restaurants',
    schemaDescription: `Commission-free online ordering for independent restaurants: your own ordering page, Counter tablet app, printed tickets, kitchen display and live delivery tracking. ${pro} a month, 0% MENIUS commission.`,
    siteDescription: 'Commission-free online ordering for restaurants',
  },
  nav: {
    how: 'How it works',
    pricing: 'Pricing',
    demo: 'Live demo',
    signIn: 'Sign in',
    tryPro: 'Try Pro free',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mainNav: 'Main',
  },
  hero: {
    h1: 'Your own online ordering,',
    h1Voice: 'without the app cut.',
    leadWide: `Delivery apps take up to 30% of every order. Orders from your own page go straight to your counter. ${pro} a month, 0% commission.`,
    leadPhone: `Apps take up to 30%. Here, orders go straight to your counter. ${pro} a month, 0% commission.`,
    talk: 'Talk to a real person',
    cue: 'Order #021 just came in at The Grill House. Follow it to the front door.',
    counterAlt: 'The Counter tablet with a new delivery order from Maria Gonzalez, ready to accept',
    photoAlt: 'The Counter tablet and the ticket printer on a restaurant counter',
  },
  zero: {
    h2: 'commission on every order. Delivery, pickup or dine-in.',
    perMonth: 'a month, flat. Month-to-month, no contract.',
    small: 'You pay Stripe’s card fee, about 2.9% + 30¢. Your customer pays no extra service fee.',
  },
  story: {
    h2: 'One order, start to finish.',
    lead: 'Friday night at The Grill House. This is order #021, from Maria’s phone to her front door.',
    order: {
      h3: 'Maria orders from your page.',
      p: 'Your menu, your photos, your prices. Pickup, delivery or dine-in by QR, paid by card or cash.',
      menuAlt: 'The Grill House ordering page',
      dishAlt: 'Cheeseburger Deluxe open on the ordering page',
    },
    print: {
      h3: 'You tap Accept. The ticket prints.',
      p: 'The tablet rings until someone accepts; if nobody does in 15 minutes, the order cancels and refunds itself. The ticket comes out of your thermal printer with a QR your driver scans.',
      counterAlt: 'The Counter tablet: ready in 15 minutes, Accept',
      ticketAlt: 'Printed ticket for order #021',
    },
    kitchen: {
      h3: 'The kitchen sees it on screen.',
      p: 'Big type, “no lettuce” in red, one tap on Ready when it’s done.',
      fullAlt: 'Kitchen display with order #021 for Maria G.',
      cropAlt: 'Order #021 for Maria G. on the kitchen display',
      allDayAlt: 'All Day: what the kitchen has to make right now',
    },
    driver: {
      h3: 'Your driver heads out.',
      p: 'The driver gets the address and the route. Maria gets a live link.',
      alt: 'Live tracking: on the way, about 13 minutes',
    },
    delivered: {
      h3: 'Delivered. Maria is your customer now.',
      p: 'Her name, her phone and her order stay on your list, not an app’s.',
      alt: 'Delivered at 7:34 PM, with Order the same again',
    },
  },
  site: {
    when: 'Next morning',
    h2: 'Maria finds you on your own site.',
    lead: 'Not a listing next to your competitors. Your name, your photos, and an Order button that goes to your page.',
    priceNote: 'one-time, optional',
    desktopAlt: 'The Grill House website on desktop',
    phoneAlt: 'The Grill House website on a phone',
  },
  month: {
    label: 'End of the month',
    h2: 'What you keep.',
    lead: 'Honest math: we take out the card fee and our own price.',
    calc: {
      salesLabel: 'Your monthly sales on delivery apps',
      chargeLabel: 'What the apps charge you',
      commissionLine: 'Commission you stop paying',
      cardLine: 'Card processing (~3%)',
      proLine: 'MENIUS Pro',
      keepLabel: 'You keep',
      perMonth: '/ month',
      note: 'If all of those orders move to your page. Move a third and you keep about {third}. Below about {breakeven} a month in app sales, MENIUS doesn’t pay for itself on commission alone.',
      noteShort: 'If all of those orders move to your page. Move a third and you’d still be about {third} short. Below about {breakeven} a month in app sales, MENIUS doesn’t pay for itself on commission alone.',
      chipsLabel: 'App commission',
    },
    vsH3: 'Before you decide: side by side.',
    verdict: 'Keep the apps for discovery. Move your regulars to direct.',
    diffs: [
      { b: 'No contract', t: 'Month-to-month. Leave any month.' },
      { b: 'Your customer list', t: 'Names and phones stay with you.' },
      { b: 'A real person', t: 'We set it up and pick up the phone.' },
    ],
    cmpHead: ['MENIUS Pro', 'Uber Eats / DoorDash', 'ChowNow'],
    cmpRows: [
      { label: 'What you pay', us: `${pro} a month, flat`, apps: '15–30% of each order', chownow: '$249–$449 a month + setup' },
      { label: 'Card processing', us: '~2.9% + 30¢ (Stripe)', apps: 'Part of the commission', chownow: '2.95% + 29¢' },
      { label: 'Your customers', us: 'Yours', apps: 'Theirs', chownow: 'Yours' },
      { label: 'Your brand', us: 'Your page, your domain', apps: 'Listed next to competitors', chownow: 'Branded site and app' },
      { label: 'Contract', us: 'Month‑to‑month', apps: 'None', chownow: 'Monthly or annual, 30‑day notice' },
    ],
    cmpSource: 'Sources: DoorDash and Uber Eats merchant pricing, 2026 (15–30% depending on plan). ChowNow pricing page (get.chownow.com/pricing), Nov 2026.',
    cmpCaption: 'MENIUS Pro compared with Uber Eats, DoorDash and ChowNow',
  },
  setup: {
    label: 'Before your first order',
    h2: 'We set it up for you.',
    lead: 'On-site or by video call. You don’t type a single price.',
    steps: [
      { h: 'We load your menu and photos.', p: 'Every dish, option and price, checked with you.' },
      { h: 'We set up the tablet and printer.', p: 'At cost, and they’re yours to keep.' },
      { h: 'We train your staff.', p: 'On-site or by video call, in English or Spanish.' },
      { h: 'You go live.', p: 'In 3 to 14 days, depending on your menu.' },
    ],
    talk: 'Talk to a real person',
    tiersTitle: 'One-time setup, by menu size',
    tiers: ['Up to 80 dishes', '81 to 200 dishes', '201 dishes or more'],
    free: 'Free with the annual plan.',
  },
  pricing: {
    label: 'Every month',
    h2: 'One plan. Everything in it.',
    perMonth: '/ month',
    altPre: 'or ',
    altBold: `${proYear} a year`,
    altPost: ': 2 months free, and setup is free.',
    zeroBold: '0% MENIUS commission.',
    zeroRest: ' You only pay Stripe’s card fee.',
    small: `${TRIAL_DAYS} days, no card. Month-to-month, cancel anytime.`,
    groups: [
      { title: 'Online ordering', items: ['Your ordering page, on your domain', 'Pickup, delivery and dine-in by QR', 'Card payments through Stripe', 'Menu in several languages'] },
      { title: 'In the restaurant', items: ['Counter tablet app that rings until accepted', 'Printed tickets: Bluetooth or Star CloudPRNT', 'Kitchen display screen', 'Soups and specials of the day'] },
      { title: 'Delivery', items: ['Your own drivers and delivery zone', 'Driver web app with live GPS', 'Live tracking for your customers'] },
      { title: 'Marketing', items: ['Automatic emails, you choose which', 'AI photos for dishes without one', 'Your customer list is yours'] },
    ],
    foot: [
      { b: 'Tablet and printer at cost.', t: ' We get them for you, and they’re yours.' },
      { b: 'Only need dine-in?', t: ' The Free plan takes dine-in orders for up to 15 dishes, cash only, free forever.' },
    ],
  },
  faq: {
    label: 'Any time',
    h2: 'Questions owners ask.',
    side: 'Not here? A person answers, in English or Spanish.',
    items: [
      { q: 'Do I have to leave Uber Eats or DoorDash?', a: 'No. Keep them to reach new customers. MENIUS is for the people who already know you: your link goes on bags, receipts and your Google profile.' },
      { q: 'Who pays the card fees?', a: 'You pay Stripe’s standard fee, about 2.9% + 30¢ per card payment, like any card terminal. MENIUS takes 0%, and your customer pays no extra service fee.' },
      { q: 'What tablet and printer do I need?', a: 'Any Android tablet with the Counter app from Google Play, plus a thermal printer (Bluetooth or Star CloudPRNT). We can get both for you at cost.' },
      { q: 'Is there a contract?', a: 'No. Pro is month-to-month and you can cancel anytime. The annual plan is optional and includes free setup.' },
      { q: 'When do I get paid?', a: 'Card payments land in your own Stripe account. Stripe deposits to your bank, usually in 2 business days.' },
      { q: 'What if the internet goes down?', a: 'Your ordering page lives in the cloud. The tablet catches up when it reconnects, and an order nobody accepts in 15 minutes is cancelled and refunded on its own.' },
    ],
  },
  closing: {
    when: 'Tonight',
    h2: 'The next order',
    h2Voice: 'is yours.',
    small: `${TRIAL_DAYS} days free, no card. We set it up with you.`,
    cap: 'Order #022 is ringing.',
    alt: 'The Counter tablet with the next order, #022 for Sofia Ramirez, waiting to be accepted',
  },
  footer: {
    callOr: 'Call or WhatsApp.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    faq: 'FAQ',
    blog: 'Blog',
    setup: 'Setup',
    status: 'Status',
    contact: 'Contact',
    terms: 'Terms',
    privacy: 'Privacy',
    accessibility: 'Accessibility',
    cookies: 'Cookies',
    language: 'Language',
  },
  sticky: { b: `${TRIAL_DAYS} days free`, t: 'No card. No contract.', close: 'Close' },
};

const es: LandingV2Copy = {
  meta: {
    title: 'Pedidos en línea sin comisión para restaurantes',
    description: `Tu propia página de pedidos, una tablet que suena, tickets impresos y pantalla de cocina. ${pro} al mes, 0% de comisión. Prueba gratis de ${TRIAL_DAYS} días.`,
    ogAlt: 'MENIUS — Pedidos en línea sin comisión para restaurantes',
    schemaDescription: `Pedidos en línea sin comisión para restaurantes independientes: tu propia página de pedidos, la app Counter para tablet, tickets impresos, pantalla de cocina y seguimiento del delivery en vivo. ${pro} al mes, 0% de comisión de MENIUS.`,
    siteDescription: 'Pedidos en línea sin comisión para restaurantes',
  },
  nav: {
    how: 'Cómo funciona',
    pricing: 'Precios',
    demo: 'Demo en vivo',
    signIn: 'Iniciar sesión',
    tryPro: 'Prueba Pro gratis',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    mainNav: 'Principal',
  },
  hero: {
    h1: 'Tu propia página de pedidos,',
    h1Voice: 'sin pagar comisión.',
    leadWide: `Las apps de delivery se quedan con hasta el 30% de cada pedido. Los pedidos de tu propia página llegan directo a tu mostrador. ${pro} al mes, 0% de comisión.`,
    leadPhone: `Las apps cobran hasta el 30%. Aquí, los pedidos llegan directo a tu mostrador. ${pro} al mes, 0% de comisión.`,
    talk: 'Habla con una persona real',
    cue: 'Acaba de entrar el pedido #021 en The Grill House. Síguelo hasta la puerta.',
    counterAlt: 'La tablet Counter con un pedido nuevo de delivery de Maria Gonzalez, listo para aceptar',
    photoAlt: 'La tablet Counter y la impresora de tickets en el mostrador de un restaurante',
  },
  zero: {
    h2: 'de comisión en cada pedido. Delivery, para llevar o en el local.',
    perMonth: 'al mes, fijo. Mes a mes, sin contrato.',
    small: 'Tú pagas la comisión de tarjeta de Stripe, cerca de 2.9% + 30¢. Tu cliente no paga ningún cargo extra por servicio.',
  },
  story: {
    h2: 'Un pedido, de principio a fin.',
    lead: 'Viernes por la noche en The Grill House. Este es el pedido #021, del teléfono de Maria hasta la puerta de su casa.',
    order: {
      h3: 'Maria pide desde tu página.',
      p: 'Tu menú, tus fotos, tus precios. Para llevar, delivery o en mesa con QR, con tarjeta o en efectivo.',
      menuAlt: 'La página de pedidos de The Grill House',
      dishAlt: 'El Cheeseburger Deluxe abierto en la página de pedidos',
    },
    print: {
      h3: 'Tocas Aceptar. Sale el ticket.',
      p: 'La tablet suena hasta que alguien acepta; si nadie lo hace en 15 minutos, el pedido se cancela y se reembolsa solo. El ticket sale de tu impresora térmica con un QR que escanea tu repartidor.',
      counterAlt: 'La tablet Counter: listo en 15 minutos, Aceptar',
      ticketAlt: 'Ticket impreso del pedido #021',
    },
    kitchen: {
      h3: 'La cocina lo ve en pantalla.',
      p: 'Letra grande, “sin lechuga” en rojo y un toque en Listo cuando está terminado.',
      fullAlt: 'Pantalla de cocina con el pedido #021 de Maria G.',
      cropAlt: 'El pedido #021 de Maria G. en la pantalla de cocina',
      allDayAlt: 'All Day: lo que la cocina tiene que preparar ahora',
    },
    driver: {
      h3: 'Sale tu repartidor.',
      p: 'El repartidor recibe la dirección y la ruta; Maria, un enlace en vivo.',
      alt: 'Seguimiento en vivo: en camino, unos 13 minutos',
    },
    delivered: {
      h3: 'Entregado. Maria ahora es tu clienta.',
      p: 'Su nombre, su teléfono y su pedido quedan en tu lista, no en la de una app.',
      alt: 'Entregado a las 7:34 PM, con el botón para pedir lo mismo otra vez',
    },
  },
  site: {
    when: 'Al día siguiente',
    h2: 'Maria te encuentra en tu propio sitio.',
    lead: 'No una ficha junto a tu competencia. Tu nombre, tus fotos y un botón para pedir que lleva a tu página.',
    priceNote: 'pago único, opcional',
    desktopAlt: 'El sitio web de The Grill House en una computadora',
    phoneAlt: 'El sitio web de The Grill House en un teléfono',
  },
  month: {
    label: 'Fin de mes',
    h2: 'Lo que te queda.',
    lead: 'Cuentas honestas: restamos la comisión de tarjeta y nuestro propio precio.',
    calc: {
      salesLabel: 'Tus ventas mensuales en apps de delivery',
      chargeLabel: 'Lo que te cobran las apps',
      commissionLine: 'Comisión que dejas de pagar',
      cardLine: 'Tarjeta (~3%)',
      proLine: 'MENIUS Pro',
      keepLabel: 'Te quedas con',
      perMonth: '/ mes',
      note: 'Si todos esos pedidos pasan a tu página. Si pasa un tercio, te quedas con unos {third}. Con menos de unos {breakeven} al mes en ventas por apps, MENIUS no se paga solo con la comisión que ahorras.',
      noteShort: 'Si todos esos pedidos pasan a tu página. Si pasa solo un tercio, todavía te faltarían unos {third}. Con menos de unos {breakeven} al mes en ventas por apps, MENIUS no se paga solo con la comisión que ahorras.',
      chipsLabel: 'Comisión de las apps',
    },
    vsH3: 'Antes de decidir: lado a lado.',
    verdict: 'Usa las apps para que te descubran. Pasa a tus clientes de siempre al pedido directo.',
    diffs: [
      { b: 'Sin contrato', t: 'Mes a mes. Te vas el mes que quieras.' },
      { b: 'Tu lista de clientes', t: 'Los nombres y teléfonos se quedan contigo.' },
      { b: 'Una persona real', t: 'Lo configuramos y contestamos el teléfono.' },
    ],
    cmpHead: ['MENIUS Pro', 'Uber Eats / DoorDash', 'ChowNow'],
    cmpRows: [
      { label: 'Lo que pagas', us: `${pro} al mes, fijo`, apps: '15–30% de cada pedido', chownow: '$249–$449 al mes + instalación' },
      { label: 'Procesamiento de tarjeta', us: '~2.9% + 30¢ (Stripe)', apps: 'Incluido en la comisión', chownow: '2.95% + 29¢' },
      { label: 'Tus clientes', us: 'Tuyos', apps: 'De ellos', chownow: 'Tuyos' },
      { label: 'Tu marca', us: 'Tu página, tu dominio', apps: 'Junto a tu competencia', chownow: 'Sitio y app con tu marca' },
      { label: 'Contrato', us: 'Mes a mes', apps: 'Ninguno', chownow: 'Mensual o anual, aviso de 30 días' },
    ],
    cmpSource: 'Fuentes: precios para comercios de DoorDash y Uber Eats, 2026 (15–30% según el plan). Página de precios de ChowNow (get.chownow.com/pricing), nov. 2026.',
    cmpCaption: 'MENIUS Pro comparado con Uber Eats, DoorDash y ChowNow',
  },
  setup: {
    label: 'Antes de tu primer pedido',
    h2: 'Lo configuramos por ti.',
    lead: 'En tu local o por videollamada. No escribes ni un solo precio.',
    steps: [
      { h: 'Cargamos tu menú y tus fotos.', p: 'Cada plato, opción y precio, revisado contigo.' },
      { h: 'Instalamos la tablet y la impresora.', p: 'A precio de costo, y son tuyas.' },
      { h: 'Capacitamos a tu equipo.', p: 'En tu local o por videollamada, en inglés o en español.' },
      { h: 'Empiezas a vender.', p: 'Listo en 3 a 14 días, según tu menú.' },
    ],
    talk: 'Habla con una persona real',
    tiersTitle: 'Configuración única, según el tamaño del menú',
    tiers: ['Hasta 80 platos', 'De 81 a 200 platos', '201 platos o más'],
    free: 'Gratis con el plan anual.',
  },
  pricing: {
    label: 'Cada mes',
    h2: 'Un plan. Todo incluido.',
    perMonth: '/ mes',
    altPre: 'o ',
    altBold: `${proYear} al año`,
    altPost: ': 2 meses gratis y la configuración es gratis.',
    zeroBold: '0% de comisión de MENIUS.',
    zeroRest: ' Solo pagas la comisión de tarjeta de Stripe.',
    small: `${TRIAL_DAYS} días, sin tarjeta. Mes a mes, cancela cuando quieras.`,
    groups: [
      { title: 'Pedidos en línea', items: ['Tu página de pedidos, en tu dominio', 'Para llevar, delivery y en mesa con QR', 'Pagos con tarjeta a través de Stripe', 'Menú en varios idiomas'] },
      { title: 'En el restaurante', items: ['App Counter para tablet que suena hasta que aceptas', 'Tickets impresos: Bluetooth o Star CloudPRNT', 'Pantalla de cocina', 'Sopas y especiales del día'] },
      { title: 'Delivery', items: ['Tus propios repartidores y tu zona de entrega', 'App web para repartidores con GPS en vivo', 'Seguimiento en vivo para tus clientes'] },
      { title: 'Marketing', items: ['Correos automáticos, tú eliges cuáles', 'Fotos con IA para platos sin foto', 'Tu lista de clientes es tuya'] },
    ],
    foot: [
      { b: 'Tablet e impresora a precio de costo.', t: ' Te las conseguimos y son tuyas.' },
      { b: '¿Solo necesitas pedidos en mesa?', t: ' El plan Free toma pedidos en mesa con hasta 15 platos, solo en efectivo, gratis para siempre.' },
    ],
  },
  faq: {
    label: 'Cuando quieras',
    h2: 'Lo que preguntan los dueños.',
    side: '¿No está aquí? Te responde una persona, en inglés o en español.',
    items: [
      { q: '¿Tengo que dejar Uber Eats o DoorDash?', a: 'No. Quédate con ellas para llegar a clientes nuevos. MENIUS es para la gente que ya te conoce: tu enlace va en las bolsas, en los recibos y en tu perfil de Google.' },
      { q: '¿Quién paga las comisiones de tarjeta?', a: 'Tú pagas la tarifa estándar de Stripe, cerca de 2.9% + 30¢ por pago con tarjeta, como con cualquier terminal. MENIUS cobra 0% y tu cliente no paga ningún cargo extra por servicio.' },
      { q: '¿Qué tablet e impresora necesito?', a: 'Cualquier tablet Android con la app Counter de Google Play y una impresora térmica (Bluetooth o Star CloudPRNT). Podemos conseguirte ambas a precio de costo.' },
      { q: '¿Hay contrato?', a: 'No. Pro es mes a mes y puedes cancelar cuando quieras. El plan anual es opcional e incluye la configuración gratis.' },
      { q: '¿Cuándo recibo el dinero?', a: 'Los pagos con tarjeta llegan a tu propia cuenta de Stripe. Stripe deposita en tu banco, normalmente en 2 días hábiles.' },
      { q: '¿Y si se cae el internet?', a: 'Tu página de pedidos vive en la nube. La tablet se pone al día cuando se reconecta, y un pedido que nadie acepta en 15 minutos se cancela y se reembolsa solo.' },
    ],
  },
  closing: {
    when: 'Esta noche',
    h2: 'El próximo pedido',
    h2Voice: 'es tuyo.',
    small: `${TRIAL_DAYS} días gratis, sin tarjeta. Lo configuramos contigo.`,
    cap: 'Está sonando el pedido #022.',
    alt: 'La tablet Counter con el siguiente pedido, el #022 de Sofia Ramirez, esperando que lo acepten',
  },
  footer: {
    callOr: 'Llama o escribe por WhatsApp.',
    product: 'Producto',
    company: 'Empresa',
    legal: 'Legal',
    faq: 'Preguntas',
    blog: 'Blog',
    setup: 'Configuración',
    status: 'Estado',
    contact: 'Contacto',
    terms: 'Términos',
    privacy: 'Privacidad',
    accessibility: 'Accesibilidad',
    cookies: 'Cookies',
    language: 'Idioma',
  },
  sticky: { b: `${TRIAL_DAYS} días gratis`, t: 'Sin tarjeta.', close: 'Cerrar' },
};

const COPY: Record<LandingV2Locale, LandingV2Copy> = { en, es };

export function getLandingV2Copy(locale: LandingV2Locale): LandingV2Copy {
  return COPY[locale];
}

/** Cuentas de la calculadora (las mismas que muestra la maqueta: $10,000 al 20% → $1,551). */
export function calcKeep(sales: number, appPct: number, proMonthly: number = PRO_MONTHLY) {
  const commission = sales * (appPct / 100);
  const card = sales * 0.03;
  const keep = commission - card - proMonthly;
  const third = commission / 3 - card / 3 - proMonthly;
  // Ventas por apps a partir de las cuales el ahorro cubre el plan, redondeado a $10.
  const breakeven = Math.round(proMonthly / (appPct / 100 - 0.03) / 10) * 10;
  return { commission, card, keep, third, breakeven };
}
