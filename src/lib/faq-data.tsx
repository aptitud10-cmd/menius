import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LandingLocale } from './landing-translations';

/**
 * FAQ de /faq. Recorte para EE.UU. (2026-11-26, fase 2 del rediseño):
 * 64 preguntas en 7 categorías. La decisión por pregunta (mantener, corregir o
 * quitar) está en .specify/docs/landing-rediseno/fase2/CONTENIDO-FAQ.md.
 * No promete lo que la landing ya no vende (reservas, puntos, generador de
 * posts, inventario, importar el menú desde una foto) ni afirma cumplimiento
 * legal (CCPA, NY SHIELD): solo buenas prácticas de privacidad.
 */
export interface FaqCategory {
  id: string;
  title: string;
  icon: string;
  questions: { q: string; a: ReactNode }[];
}

/** Extract plain text from a ReactNode tree — used for search + JSON-LD. */
export function extractFaqText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractFaqText).join('');
  if (typeof node === 'object' && 'props' in (node as object)) {
    return extractFaqText((node as { props: { children: ReactNode } }).props.children);
  }
  return '';
}

const es: FaqCategory[] = [
  {
    id: 'start',
    title: 'Primeros pasos',
    icon: '',
    questions: [
      { q: '¿Qué es MENIUS?', a: 'Pedidos en línea sin comisión para restaurantes: tu propia página de pedidos, una tablet Counter que suena, tickets impresos y una pantalla de cocina. $149 al mes, 0% de comisión de MENIUS.' },
      { q: '¿Necesito conocimientos técnicos para usar MENIUS?', a: 'No. Lo configuramos contigo, en tu local o por videollamada: cargamos tu menú y tus precios, instalamos la tablet y la impresora, y capacitamos a tu equipo.' },
      { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Tu menú se abre en el navegador del celular. Tus clientes escanean tu QR o tocan tu enlace, y piden y pagan sin descargar nada ni registrarse.' },
      { q: '¿MENIUS es para restaurantes en Estados Unidos?', a: 'Sí. MENIUS está hecho para restaurantes independientes en Estados Unidos: precios en dólares, pagos con tarjeta a través de Stripe y soporte por teléfono en inglés o en español. Tu menú puede mostrarse en varios idiomas.' },
      { q: '¿MENIUS funciona para todo tipo de restaurante?', a: 'Sí. Diners, parrillas, pizzerías, cafeterías, panaderías, bares, food trucks y restaurantes de servicio completo. Si recibes pedidos para llevar, de delivery o en mesa, te sirve.' },
      { q: '¿Puedo ver un demo antes de registrarme?', a: <>Sí. Tenemos demos en vivo disponibles sin necesidad de crear cuenta. Puedes explorar un restaurante de ejemplo completo con menú, carrito, checkout y seguimiento de pedido. <Link href="/demo">Ver demo en vivo →</Link></> },
      { q: '¿Cuánto tardo en empezar a recibir pedidos?', a: 'Listo en 3 a 14 días, según tu menú. Cargamos tu menú, instalamos la tablet y la impresora, y capacitamos a tu equipo contigo.' },
      { q: '¿Ofrecen servicio de configuración profesional?', a: <>Sí. Cargamos tu menú, instalamos la tablet y la impresora, y capacitamos a tu equipo, en tu local o por videollamada. Es un pago único según el tamaño del menú ($299, $499 o $899), gratis con el plan anual. <Link href="/setup-profesional">Más sobre la configuración profesional →</Link></> },
    ],
  },
  {
    id: 'menu',
    title: 'Tu menú',
    icon: '',
    questions: [
      { q: '¿Puedo agregar fotos a mis platos?', a: 'Sí. Sube tus propias fotos desde el panel. Para los platos sin foto, Pro puede crear una foto con IA. Si prefieres que nos encarguemos, nos mandas fotos de tus platos sacadas con el celular y las mejoramos con IA por $10 por plato.' },
      { q: '¿Puedo agregar variantes y extras a mis productos?', a: 'Sí. Puedes agregar variantes (como tamaño: chico, mediano, grande) con diferencia de precio, y extras (como queso extra, tocino, aguacate) con precio adicional. Tus clientes los seleccionan al agregar el producto al carrito, igual que en las mejores apps de delivery.' },
      { q: '¿Mi menú puede estar en más de un idioma?', a: 'Sí. Tu menú puede mostrarse en varios idiomas, y cada cliente lo ve en el suyo.' },
      { q: '¿Cómo funcionan los códigos QR?', a: 'MENIUS genera un código QR único para cada mesa de tu restaurante. Los imprimes y los colocas en las mesas. Cuando un cliente escanea el QR, ve tu menú con la mesa ya seleccionada automáticamente. También puedes compartir un enlace directo para pedidos de pickup o delivery.' },
      { q: '¿Puedo personalizar el diseño de mi menú?', a: 'Sí, en parte: desde el dashboard eliges tu logo, tu foto de portada y el color de tu marca. El resto del diseño lo pone MENIUS: un menú profesional, rápido y pensado para el celular, con categorías, fotos, precios y carrito integrado.' },
      { q: '¿Puedo conectar un dominio personalizado?', a: 'Sí. En el plan Pro puedes conectar tu propio dominio (ej: menu.turestaurante.com) para que tus clientes accedan al menú con tu marca. Nos escribes y lo configuramos por ti, con certificado SSL incluido.' },
      { q: '¿Puedo marcar mis productos con etiquetas dietéticas?', a: 'Sí. Puedes agregar etiquetas como 🌱 Vegetariano, 🌿 Vegano, 🌾 Sin Gluten, 🌶️ Picante y más a cada producto. Estas etiquetas aparecen visualmente en las tarjetas del menú y tus clientes pueden filtrar por ellas para encontrar rápidamente lo que se adapta a su dieta.' },
      { q: '¿Puedo configurar horarios de disponibilidad por categoría?', a: 'Sí. Cada categoría puede tener su propio horario de disponibilidad. Por ejemplo, "Desayunos" disponible de 7am a 11am, y "Comidas" de 12pm a 5pm. Fuera del horario establecido, la categoría se muestra como bloqueada en el menú pero sigue visible, evitando confusión en los clientes.' },
    ],
  },
  {
    id: 'orders',
    title: 'Pedidos y el Counter',
    icon: '',
    questions: [
      { q: '¿Cómo recibo los pedidos?', a: 'En el Counter, una app para tablet Android. Suena hasta que alguien acepta el pedido; si nadie lo acepta en 15 minutos, el pedido se cancela y se reembolsa solo. Cuando lo aceptas, se imprime el ticket y la cocina lo ve en pantalla.' },
      { q: '¿Funciona para dine-in, pickup y delivery?', a: 'Sí. Tú decides qué tipos de orden habilitar desde tu dashboard. Para dine-in, los clientes escanean el QR de la mesa. Para pickup, usan tu enlace directo. Para delivery, los clientes agregan su dirección de entrega al hacer el pedido; las entregas las hacen tus propios repartidores y el costo de envío lo fijas tú. Pickup y delivery están incluidos en el plan Pro.' },
      { q: '¿Puedo pausar la recepción de pedidos?', a: 'Sí. Desde el dashboard puedes desactivar temporalmente la recepción de pedidos (por ejemplo, cuando tu cocina está saturada o fuera de horario). Tus clientes verán un aviso de que el restaurante no está aceptando pedidos en ese momento.' },
      { q: '¿Qué pasa si hay un problema con un pedido?', a: 'Desde el dashboard puedes ver los detalles completos de cada pedido, las notas del cliente, y cambiar el estado manualmente. Si necesitas contactar al cliente, puedes ver su nombre y los datos que proporcionó al hacer el pedido.' },
      { q: '¿Mis clientes pueden ver el historial de sus pedidos?', a: 'Sí. Los clientes pueden consultar su historial ingresando el email con el que hicieron sus pedidos. Verán todas sus órdenes anteriores con estado, productos y precios, y tendrán la opción de volver a ordenar los mismos productos con un solo clic.' },
      { q: '¿Cómo recibo notificaciones de pedidos?', a: 'La tablet Counter suena con cada pedido nuevo hasta que alguien lo acepta, y además te llega un email.' },
      { q: '¿Qué es la Cocina KDS?', a: 'Una pantalla para tu cocina. Los pedidos aparecen en letra grande con cada opción y nota, los pedidos especiales en rojo, y un toque en Listo cuando está terminado. Sirve cualquier tablet o monitor con navegador.' },
      { q: '¿Hay una app?', a: 'Tu equipo usa la app Counter en una tablet Android, desde Google Play. Tu panel funciona en cualquier navegador, en el celular o en la computadora. Tus clientes no necesitan ninguna app.' },
      { q: '¿Qué es el Counter y cómo funciona?', a: 'El Counter es una app para tablet Android para tu mostrador. Los pedidos nuevos suenan hasta que alguien los acepta; eliges el tiempo de preparación, asignas un repartidor y se imprime el ticket. Los pedidos se organizan en pestañas: Nuevos, En preparación, Listos, Programados e Historial. Los pedidos en mesa muestran el número de mesa.' },
      { q: '¿Cómo funciona el flujo de un pedido en mesa?', a: 'El cliente escanea el QR de su mesa → hace el pedido desde su celular → el pedido llega al Counter con el número de mesa → el encargado lo acepta → el ticket se imprime automáticamente → la cocina lo prepara (visible en KDS) → cuando está listo, alguien lo lleva a la mesa → el encargado marca el pedido como entregado.' },
      { q: '¿Cómo funciona el flujo de un pedido de pickup?', a: 'El cliente ordena desde tu enlace directo → llega al Counter → el encargado acepta con el tiempo estimado → la cocina prepara → marca "listo" en el KDS → el cliente recibe notificación automática por email → pasa a recoger → el encargado marca "entregado".' },
      { q: '¿Puedo recibir pedidos programados para más tarde?', a: 'Sí. Tus clientes pueden programar un pedido para una fecha y hora futura desde el checkout (opción "Programar para después"). El pedido aparece en el tab "Programados" del Counter con la hora programada visible. A la hora acordada, el sistema lo activa automáticamente como un pedido normal.' },
      { q: '¿Cómo funcionan las impresoras?', a: 'El Counter imprime en una impresora térmica por Bluetooth o Star CloudPRNT. Cada dispositivo puede imprimir el recibo del cliente, el ticket de cocina (sin precios, con el número de pedido grande), ambos o ninguno.' },
      { q: '¿El Counter imprime automáticamente al aceptar un pedido?', a: 'Sí. Por defecto, al aceptar un pedido en el Counter, se imprime automáticamente el ticket según la configuración de impresoras del dispositivo. Si el dispositivo tiene habilitado el "Ticket de cocina", se imprime uno adicional para la cocina. También puedes imprimir manualmente desde el detalle de cualquier orden.' },
      { q: '¿Cómo usa MENIUS mi equipo?', a: 'Tu equipo trabaja en la tablet de pedidos (Counter): la vinculas una vez con un código desde tu panel y queda lista, sin crear cuentas para cada empleado. Esa tablet solo abre el Counter; el panel de administración (menú, precios, facturación) queda en la cuenta del dueño.' },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    icon: '',
    questions: [
      { q: '¿Los clientes pueden seguir el estado de su pedido?', a: 'Sí. Después de hacer un pedido, el cliente recibe una página de seguimiento en tiempo real donde ve el estado actualizado: pendiente, preparando, listo, entregado. La actualización es instantánea, sin necesidad de recargar la página. Para pedidos de delivery, además puede ver en un mapa la ubicación GPS del repartidor en tiempo real.' },
      { q: '¿La app del repartidor funciona sin internet?', a: 'Sí, para las acciones y estados. Si el repartidor pierde señal en un túnel o zona sin cobertura, las acciones que realice (confirmar recogida, marcar entrega, actualizar estado) se guardan automáticamente en su celular y se sincronizan solas en cuanto recupera la señal. La foto de comprobante de entrega es la excepción: necesita conexión activa para subirse. La app también puede instalarse en la pantalla de inicio del celular con un solo toque.' },
      { q: '¿Cómo funciona el flujo de un pedido de delivery?', a: 'El cliente ordena con dirección de entrega → llega al Counter → el encargado acepta (el sistema sugiere el tiempo de entrega automáticamente según la distancia) → la cocina prepara → el encargado asigna un repartidor de tu pool → el repartidor recibe un enlace para compartir su GPS → el cliente puede ver la ubicación del repartidor en tiempo real desde su página de seguimiento → el repartidor toma foto como comprobante de entrega → se marca como entregado.' },
      { q: '¿Puedo gestionar mis propios repartidores?', a: 'Sí. En Staff > Repartidores puedes agregar tu pool de repartidores con nombre y teléfono. Al asignar un delivery desde el Counter, aparece una lista para seleccionar al repartidor disponible. Al asignarlo, recibe un enlace con la dirección de entrega y un enlace de tracking para compartir su GPS en tiempo real.' },
      { q: '¿El cliente puede ver dónde está su repartidor?', a: 'Sí. El repartidor abre su enlace de tracking y acepta compartir su ubicación GPS. En la página de seguimiento del pedido, el cliente ve un mapa con la posición actualizada del repartidor en tiempo real. La ubicación se actualiza cada 10 segundos automáticamente.' },
      { q: '¿Los repartidores pueden subir foto como comprobante de entrega?', a: 'Sí. Desde la misma página de tracking, el repartidor puede tomar o subir una foto del pedido entregado. Esta foto queda registrada en el sistema y visible en el detalle de la orden desde el Counter. Ideal para evitar disputas y llevar control de cada entrega.' },
    ],
  },
  {
    id: 'pricing',
    title: 'Precios y pagos',
    icon: '',
    questions: [
      { q: '¿MENIUS cobra comisión por pedido?', a: 'No. Pro tiene 0% de comisión de MENIUS. Pagas la tarifa estándar de tarjeta de Stripe, cerca de 2.9% + 30¢, que se descuenta de cada pago. Los pedidos en efectivo también son 0%. El plan Free no acepta pagos en línea.' },
      { q: '¿Puedo usar MENIUS gratis?', a: <>Sí. Al registrarte tienes 14 días de Pro gratis, sin tarjeta. Si después no te suscribes, pasas al plan gratuito permanente: menú digital con QR para hasta 5 mesas, hasta 15 productos y pedidos ilimitados en mesa pagados en efectivo. También puedes explorar nuestros <Link href="/demo">demos en vivo</Link> sin crear una cuenta.</> },
      { q: '¿Qué incluye el plan gratuito?', a: 'El plan Free incluye: menú digital con QR para hasta 5 mesas, hasta 15 productos, pedidos ilimitados en mesa (dine-in) pagados en efectivo y soporte por email. No requiere tarjeta de crédito y no vence. Pickup, delivery, pagos online, IA y analytics están en el plan Pro.' },
      { q: '¿Cuáles son los planes disponibles?', a: <>Hay dos planes: Free ($0/mes, pedidos en mesa ilimitados, solo efectivo) y Pro ($149/mes o $1,490/año, todo incluido, con 0% de comisión de MENIUS en pagos online). Al registrarte tienes 14 días de Pro gratis, sin tarjeta. <Link href="/#pricing">Ver planes y precios →</Link></> },
      { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes pasar de Free a Pro, cambiar entre pago mensual y anual, o volver a Free cuando quieras desde tu dashboard. Los cambios se aplican inmediatamente y el cobro se ajusta de forma proporcional (prorrateado). Sin penalidades ni contratos.' },
      { q: '¿Cómo se procesan los pagos de la suscripción?', a: 'Tu suscripción se cobra a través de Stripe. Aceptamos todas las tarjetas de crédito y débito principales.' },
      { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. No hay contratos a largo plazo ni penalidades por cancelación. Puedes cancelar tu suscripción de pago en cualquier momento desde tu dashboard. Al cancelar, sigues en Pro hasta el final del período que ya pagaste y luego pasas automáticamente al plan Free. Tu cuenta, tu menú y tus datos quedan intactos, y puedes volver a suscribirte cuando quieras.' },
      { q: '¿Mis clientes pueden pagar en línea?', a: 'Sí. Pagan con tarjeta en tu página de pedidos, a través de Stripe. El dinero va a tu propia cuenta de Stripe, y el nombre de tu restaurante aparece en el resumen de su tarjeta.' },
      { q: '¿También puedo aceptar pagos en efectivo?', a: 'Sí. Puedes habilitar ambas opciones: pago en efectivo y pago en línea. Tus clientes eligen cómo quieren pagar al hacer su pedido. Tú decides qué métodos de pago ofrecer según las necesidades de tu negocio.' },
      { q: '¿Cuánto cobran Stripe y MENIUS por transacción?', a: 'MENIUS cobra 0%. Stripe cobra 2.9% + 30¢ por pago con tarjeta en USD (más 1.5% en tarjetas internacionales), que se descuenta automáticamente de cada pago. Los pagos en efectivo no tienen cargos nuestros.' },
      { q: '¿Es seguro el proceso de pago para mis clientes?', a: 'Sí. Los datos de la tarjeta van directo a Stripe, que tiene certificación PCI DSS Nivel 1. Nunca pasan por nuestros servidores.' },
    ],
  },
  {
    id: 'customers',
    title: 'Marketing y tus clientes',
    icon: '',
    questions: [
      { q: '¿MENIUS incluye reportes?', a: 'Sí. Pedidos, platos más vendidos, ingresos por período, horas pico y ticket promedio, y puedes exportar reportes a PDF o CSV.' },
      { q: '¿Qué es MENIUS AI?', a: 'Un asistente en tu panel que responde con tus datos reales: “¿Cuánto vendí esta semana?”, “¿Cuál es mi plato más vendido?”. También te explica cómo usar cualquier parte de MENIUS. Solo consulta: los cambios los haces tú.' },
      { q: '¿MENIUS AI tiene costo adicional?', a: 'No. MENIUS AI está incluido en el plan Pro sin costo extra. Funciona con Claude, el modelo de IA de Anthropic. En Pro puedes hacerle hasta 120 preguntas por hora.' },
      { q: '¿MENIUS tiene herramientas de marketing integradas?', a: 'Sí: correos automáticos (una bienvenida para clientes nuevos, un recordatorio para los que no han vuelto y un agradecimiento para los habituales), y tú eliges cuáles están activos. También puedes enviar campañas por email a tu lista de clientes.' },
      { q: '¿Puedo enviar emails a mis clientes desde MENIUS?', a: 'Sí. El módulo de Campañas de Email te permite crear y enviar boletines, promociones y anuncios a toda tu base de clientes o segmentos específicos. Los emails tienen diseño profesional con tu marca. Después de enviar ves cuántos emails salieron.' },
      { q: '¿Qué son las Automatizaciones?', a: 'Son secuencias de emails que se activan automáticamente según el comportamiento de tus clientes. MENIUS incluye automatizaciones preconfiguradas: bienvenida al cliente nuevo, reactivación de clientes inactivos, reconocimiento de clientes VIP, entre otras. Solo las activas y trabajan solas 24/7.' },
      { q: '¿La lista de clientes es mía?', a: 'Sí. Cada cliente que pide queda guardado con su nombre, teléfono e historial de pedidos, y se etiqueta solo (Nuevo, Frecuente, VIP). Es tu lista, no la de una app.' },
    ],
  },
  {
    id: 'account',
    title: 'Cuenta, seguridad y soporte',
    icon: '',
    questions: [
      { q: '¿Puedo iniciar sesión con Google?', a: 'Sí. MENIUS soporta inicio de sesión con Google (OAuth). Puedes registrarte y acceder a tu cuenta con un solo clic usando tu cuenta de Google, sin necesidad de crear una contraseña. También funciona el registro tradicional con email y contraseña.' },
      { q: '¿Puedo gestionar múltiples ubicaciones?', a: 'Hoy no. Cada cuenta de MENIUS corresponde a un restaurante, y la gestión de varias sucursales desde una sola cuenta no está incluida en el plan Pro.' },
      { q: '¿Es seguro MENIUS?', a: 'Sí. Toda la comunicación está encriptada con SSL/TLS. Los pagos se procesan a través de Stripe (certificado PCI DSS Nivel 1). Los datos se almacenan en Supabase con Row-Level Security (RLS), lo que significa que cada restaurante solo puede ver sus propios datos. Implementamos headers de seguridad (HSTS, CSP), sanitización de inputs, y rate limiting.' },
      { q: '¿Qué datos recopilan de mis clientes?', a: <>Solo recopilamos la información estrictamente necesaria para procesar pedidos: nombre del cliente, artículos ordenados, y opcionalmente email y dirección de entrega. No usamos cookies de rastreo ni publicidad de terceros. Puedes leer nuestra <Link href="/privacy">Política de Privacidad</Link> completa para más detalles.</> },
      { q: '¿Cómo cuidan la privacidad?', a: 'Seguimos buenas prácticas de privacidad. No vendemos ni compartimos datos personales con terceros para marketing. Solo compartimos datos con proveedores esenciales del servicio (Stripe para pagos, Supabase para base de datos, Resend para emails transaccionales).' },
      { q: '¿Qué pasa con mis datos si cancelo?', a: 'Si cancelas Pro, tu cuenta sigue en el plan Free con todos tus datos. Si quieres que borremos tus datos, escríbenos a soporte@menius.app y los eliminamos.' },
      { q: '¿Qué tipo de soporte ofrecen?', a: 'Soporte por teléfono, WhatsApp o email, en inglés o en español. El número está al pie de cada página.' },
      { q: '¿Puedo solicitar una demostración personalizada?', a: <>Sí. Escríbenos a <a href="mailto:soporte@menius.app">soporte@menius.app</a> o llámanos, y te mostramos MENIUS en tu local o por videollamada.</> },
      { q: '¿Cómo reporto un error o sugiero una mejora?', a: <>Puedes reportar errores o enviar sugerencias directamente a <a href="mailto:soporte@menius.app">soporte@menius.app</a>. Leemos y respondemos todos los mensajes. Las sugerencias de mejora se evalúan y las más solicitadas se incorporan en futuras actualizaciones de la plataforma.</> },
    ],
  },
];

const en: FaqCategory[] = [
  {
    id: 'start',
    title: 'Getting started',
    icon: '',
    questions: [
      { q: 'What is MENIUS?', a: 'Commission-free online ordering for restaurants: your own ordering page, a Counter tablet that rings, printed tickets and a kitchen screen. $149 a month, 0% MENIUS commission.' },
      { q: 'Do I need technical skills to use MENIUS?', a: 'No. We set it up with you, on-site or by video call: we load your menu and prices, set up the tablet and printer, and train your staff.' },
      { q: 'Do my customers need to download an app?', a: 'No. Your menu opens in the phone’s browser. Customers scan your QR or tap your link, then order and pay without downloading anything or signing up.' },
      { q: 'Is MENIUS for restaurants in the U.S.?', a: 'Yes. MENIUS is built for independent restaurants in the United States: prices in dollars, card payments through Stripe, and phone support in English or Spanish. Your menu can be shown in several languages.' },
      { q: 'Does MENIUS work for all types of restaurants?', a: 'Yes. Diners, grills, pizzerias, cafés, bakeries, bars, food trucks and full-service restaurants. If you take pickup, delivery or dine-in orders, it fits.' },
      { q: 'Can I see a demo before signing up?', a: <>Yes. We have live demos available without creating an account. You can explore a complete sample restaurant with menu, cart, checkout, and order tracking. <Link href="/demo">View live demo →</Link></> },
      { q: 'How long does it take to go live?', a: 'In 3 to 14 days, depending on your menu. We load your menu, set up the tablet and printer, and train your staff with you.' },
      { q: 'Do you offer professional setup service?', a: <>Yes. We load your menu, set up the tablet and printer, and train your staff, on-site or by video call. It’s a one-time fee by menu size ($299, $499 or $899), free with the annual plan. <Link href="/setup-profesional">More about Professional Setup →</Link></> },
    ],
  },
  {
    id: 'menu',
    title: 'Your menu',
    icon: '',
    questions: [
      { q: 'Can I add photos to my dishes?', a: 'Yes. Upload your own photos from the dashboard. For dishes without one, Pro can create an AI photo. If you’d rather we handle it, send us phone photos of your dishes and we enhance them with AI for $10 per dish.' },
      { q: 'Can I add variants and extras to my products?', a: 'Yes. You can add variants (like size: small, medium, large) with price differences, and extras (like extra cheese, bacon, avocado) with additional cost. Your customers select them when adding the product to their cart, just like in the best delivery apps.' },
      { q: 'Can my menu be in more than one language?', a: 'Yes. Your menu can be shown in several languages, and each customer sees it in theirs.' },
      { q: 'How do QR codes work?', a: 'MENIUS generates a unique QR code for each table in your restaurant. You print them and place them on the tables. When a customer scans the QR, they see your menu with the table already selected automatically. You can also share a direct link for pickup or delivery orders.' },
      { q: 'Can I customize the design of my menu?', a: 'Partly, yes: from the dashboard you choose your logo, cover photo and brand color. MENIUS takes care of the rest of the design — a professional, fast, mobile-first menu with categories, photos, prices and a built-in cart.' },
      { q: 'Can I connect a custom domain?', a: 'Yes. On the Pro plan you can connect your own domain (e.g., menu.yourrestaurant.com) so your customers access the menu under your brand. Just write to us and we set it up for you, SSL certificate included.' },
      { q: 'Can I label products with dietary tags?', a: 'Yes. You can add dietary tags like 🌱 Vegetarian, 🌿 Vegan, 🌾 Gluten-Free, 🌶️ Spicy, and more to each product. These tags appear visually on menu cards and customers can filter by them to quickly find options that match their dietary needs.' },
      { q: 'Can I set availability schedules per category?', a: 'Yes. Each category can have its own availability schedule. For example, "Breakfast" available from 7am to 11am, and "Lunch" from 12pm to 5pm. Outside the set hours, the category appears locked on the menu but remains visible, avoiding customer confusion.' },
    ],
  },
  {
    id: 'orders',
    title: 'Orders & the Counter',
    icon: '',
    questions: [
      { q: 'How do I receive orders?', a: 'On the Counter, an Android tablet app. It rings until someone accepts the order; if nobody does in 15 minutes, the order cancels and refunds itself. When you accept, the ticket prints and the kitchen sees it on screen.' },
      { q: 'Does it work for dine-in, pickup, and delivery?', a: 'Yes. You decide which order types to enable from your dashboard. For dine-in, customers scan the table QR. For pickup, they use your direct link. For delivery, customers add their delivery address when placing the order; deliveries are made by your own drivers and you set the delivery fee. Pickup and delivery are included in the Pro plan.' },
      { q: 'Can I pause incoming orders?', a: 'Yes. From the dashboard you can temporarily stop taking orders (for example, when the kitchen is slammed or you’re closed). Customers will see a notice that the restaurant isn’t accepting orders right now.' },
      { q: 'What happens if there’s a problem with an order?', a: 'From the dashboard you can see the complete details of each order, customer notes, and manually change the status. If you need to contact the customer, you can see their name and the information they provided when placing the order.' },
      { q: 'Can customers view their order history?', a: 'Yes. Customers can look up their order history by entering the email they used to place orders. They’ll see all previous orders with status, products, and prices, along with the option to reorder the same items with a single click.' },
      { q: 'How do I receive order notifications?', a: 'The Counter tablet rings with every new order until someone accepts it, and you also get an email.' },
      { q: 'What is Kitchen KDS?', a: 'A screen for your kitchen. Orders show up in big type with every option and note, special requests in red, and one tap on Ready when it’s done. Any tablet or monitor with a browser works.' },
      { q: 'Is there an app?', a: 'Your staff uses the Counter app on an Android tablet, from Google Play. Your dashboard works in any browser, on a phone or a computer. Your customers don’t need an app.' },
      { q: 'What is the Counter and how does it work?', a: 'The Counter is an Android tablet app for your front counter. New orders ring until someone accepts; you choose the ready time, assign a driver, and the ticket prints. Orders are organized in tabs: New, Preparing, Ready, Scheduled and History. Dine-in orders show the table number.' },
      { q: 'How does a dine-in table order flow work?', a: 'Customer scans the table QR → places order from their phone → order arrives at Counter with table number → staff accepts it → ticket prints automatically → kitchen prepares it (visible on KDS) → when ready, someone brings it to the table → staff marks the order as delivered.' },
      { q: 'How does a pickup order flow work?', a: 'Customer orders from your direct link → arrives at Counter → staff accepts with estimated time → kitchen prepares → marks "ready" on KDS → customer receives automatic email notification → customer comes to pick up → staff marks "delivered".' },
      { q: 'Can I receive orders scheduled for a future time?', a: 'Yes. Your customers can schedule an order for a future date and time from checkout (the "Schedule for later" option). The order appears in the Counter’s "Scheduled" tab with the scheduled time visible. At the agreed time, the system automatically activates it as a normal order.' },
      { q: 'How do printers work?', a: 'The Counter prints to a thermal printer over Bluetooth or Star CloudPRNT. Each device can print the customer receipt, the kitchen ticket (no prices, big order number), both, or neither.' },
      { q: 'Does the Counter auto-print when accepting an order?', a: 'Yes. By default, when you accept an order in the Counter, a ticket is automatically printed based on the device’s printer configuration. If the device has "Kitchen ticket" enabled, an additional one prints for the kitchen. You can also print manually from the detail view of any order.' },
      { q: 'How does my staff use MENIUS?', a: 'Your staff works on the order tablet (Counter): you link it once with a code from your dashboard and it is ready, no accounts needed for each employee. That tablet only opens the Counter; the admin dashboard (menu, prices, billing) stays on the owner account.' },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    icon: '',
    questions: [
      { q: 'Can customers track their order status?', a: 'Yes. After placing an order, the customer receives a real-time tracking page where they see the updated status: pending, preparing, ready, delivered. Updates are instant, without needing to reload the page. For delivery orders, they can also see the driver’s live GPS location on a map.' },
      { q: 'Does the driver app work without internet?', a: 'Yes, for actions and status updates. If a driver loses signal in a tunnel or dead zone, whatever they do (confirming pickup, marking the delivery, updating the status) is saved on their phone and syncs automatically as soon as they’re back online. The one exception is the proof-of-delivery photo, which needs a connection to upload. The app can also be added to the phone’s home screen with a single tap.' },
      { q: 'How does a delivery order flow work?', a: 'Customer orders with delivery address → arrives at Counter → staff accepts (system automatically suggests delivery time based on distance) → kitchen prepares → staff assigns a driver from your pool → driver receives a link with the address and GPS tracking → customer can see the driver’s real-time location on their tracking page → driver takes a proof-of-delivery photo → order is marked as delivered.' },
      { q: 'Can I manage my own delivery drivers?', a: 'Yes. Under Staff > Drivers you can add your driver pool with name and phone number. When assigning a delivery from the Counter, a list appears to select the available driver. Once assigned, they receive a link with the delivery address and a tracking link to share their GPS location in real time.' },
      { q: 'Can the customer see where their driver is?', a: 'Yes. The driver opens their tracking link and agrees to share their GPS location. On the customer’s order tracking page, they see a live map with the driver’s updated position. Location updates every 10 seconds automatically.' },
      { q: 'Can drivers upload a proof-of-delivery photo?', a: 'Yes. From the same tracking page, the driver can take or upload a photo of the delivered order. This photo is saved in the system and visible in the order details from the Counter. Perfect for avoiding disputes and keeping a record of every delivery.' },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & payments',
    icon: '',
    questions: [
      { q: 'Does MENIUS charge a commission per order?', a: 'No. Pro has 0% MENIUS commission. You pay Stripe’s standard card fee, about 2.9% + 30¢, deducted from each payment. Cash orders are 0% too. The Free plan doesn’t take online payments.' },
      { q: 'Can I use MENIUS for free?', a: <>Yes. When you sign up you get 14 days of Pro free, no credit card needed. If you don&apos;t subscribe afterwards, you move to the permanent free plan: a digital menu with QR codes for up to 5 tables, up to 15 products, and unlimited dine-in orders paid in cash. You can also explore our <Link href="/demo">live demos</Link> without creating an account.</> },
      { q: 'What does the free plan include?', a: 'The Free plan includes: digital menu with QR for up to 5 tables, up to 15 products, unlimited dine-in orders paid in cash, and email support. No credit card required and it never expires. Pickup, delivery, online payments, AI, and analytics are on the Pro plan.' },
      { q: 'What plans are available?', a: <>There are two plans: Free ($0/mo, unlimited dine-in orders, cash only) and Pro ($149/mo or $1,490/yr, everything included, with 0% MENIUS commission on online payments). When you sign up you get 14 days of Pro free, no credit card needed. <Link href="/#pricing">View plans and pricing →</Link></> },
      { q: 'Can I change plans at any time?', a: 'Yes. You can move from Free to Pro, switch between monthly and annual billing, or go back to Free whenever you want from your dashboard. Changes apply immediately and billing is adjusted proportionally (prorated). No penalties or contracts.' },
      { q: 'How are subscription payments processed?', a: 'Your subscription is billed through Stripe. We accept all major credit and debit cards.' },
      { q: 'Can I cancel at any time?', a: 'Yes. There are no long-term contracts or cancellation fees. You can cancel your paid subscription anytime from your dashboard. You keep Pro until the end of the period you’ve already paid for, then automatically move to the Free plan. Your account, menu and data stay intact, and you can re-subscribe whenever you like.' },
      { q: 'Can my customers pay online?', a: 'Yes. They pay by card on your ordering page, through Stripe. The money goes to your own Stripe account, and your restaurant’s name shows on their card statement.' },
      { q: 'Can I also accept cash payments?', a: 'Yes. You can enable both options: cash payment and online payment. Your customers choose how they want to pay when placing their order. You decide which payment methods to offer based on your business needs.' },
      { q: 'How much do Stripe and MENIUS charge per transaction?', a: 'MENIUS charges 0%. Stripe charges 2.9% + 30¢ per card payment in USD (plus 1.5% on international cards), deducted automatically from each payment. Cash payments carry no fees from us.' },
      { q: 'Is the payment process secure for my customers?', a: 'Yes. Card details go straight to Stripe, which is PCI DSS Level 1 certified. They never pass through our servers.' },
    ],
  },
  {
    id: 'customers',
    title: 'Marketing & your customers',
    icon: '',
    questions: [
      { q: 'Does MENIUS include reports?', a: 'Yes. Orders, best sellers, revenue by period, peak hours and average ticket, and you can export reports to PDF or CSV.' },
      { q: 'What is MENIUS AI?', a: 'An assistant in your dashboard that answers with your real data: “How much did I sell this week?”, “What’s my best seller?”. It also explains how to use any part of MENIUS. It only reads: changes you make yourself.' },
      { q: 'Does MENIUS AI cost extra?', a: 'No. MENIUS AI is included in the Pro plan at no extra cost. It runs on Claude, Anthropic’s AI model. On Pro you can ask it up to 120 questions per hour.' },
      { q: 'Does MENIUS have built-in marketing tools?', a: 'Yes: automatic emails (a welcome for new customers, a nudge for those who haven’t come back, a thank-you for regulars), and you choose which ones are on. You can also send email campaigns to your customer list.' },
      { q: 'Can I send emails to my customers from MENIUS?', a: 'Yes. The Email Campaigns module lets you create and send newsletters, promotions, and announcements to your entire customer base or specific segments. Emails feature professional branded designs. After sending, you see how many emails went out.' },
      { q: 'What are Automations?', a: 'Automations are email sequences that trigger automatically based on your customers’ behavior. MENIUS includes pre-built automations: new customer welcome, inactive customer reactivation, VIP customer recognition, and more. Just activate them and they work 24/7 on their own.' },
      { q: 'Do I keep my customer list?', a: 'Yes. Every customer who orders is saved with their name, phone and order history, and tagged automatically (New, Frequent, VIP). It’s your list, not an app’s.' },
    ],
  },
  {
    id: 'account',
    title: 'Account, security & support',
    icon: '',
    questions: [
      { q: 'Can I sign in with Google?', a: 'Yes. MENIUS supports Google sign-in (OAuth). You can sign up and access your account with a single click using your Google account, without needing to create a password. Traditional registration with email and password also works.' },
      { q: 'Can I manage multiple locations?', a: 'Not today. Each MENIUS account is for one restaurant, and managing multiple branches from a single account is not included in the Pro plan.' },
      { q: 'Is MENIUS secure?', a: 'Yes. All communication is encrypted with SSL/TLS. Payments are processed through Stripe (PCI DSS Level 1 certified). Data is stored in Supabase with Row-Level Security (RLS), meaning each restaurant can only see its own data. We implement security headers (HSTS, CSP), input sanitization, and rate limiting.' },
      { q: 'What data do you collect from my customers?', a: <>We only collect information strictly necessary to process orders: customer name, items ordered, and optionally email and delivery address. We don&apos;t use tracking cookies or third-party advertising. You can read our full <Link href="/privacy">Privacy Policy</Link> for more details.</> },
      { q: 'How do you handle privacy?', a: 'We follow privacy best practices. We do not sell or share personal data with third parties for marketing. We only share data with essential service providers (Stripe for payments, Supabase for database, Resend for transactional emails).' },
      { q: 'What happens to my data if I cancel?', a: 'If you cancel Pro, your account stays on the Free plan with all your data. If you want your data deleted, write to soporte@menius.app and we’ll delete it.' },
      { q: 'What kind of support do you offer?', a: 'Support by phone, WhatsApp or email, in English or Spanish. The number is at the bottom of every page.' },
      { q: 'Can I request a personalized demo?', a: <>Yes. Write to <a href="mailto:soporte@menius.app">soporte@menius.app</a> or call us, and we’ll walk you through MENIUS on-site or by video call.</> },
      { q: 'How do I report a bug or suggest an improvement?', a: <>You can report bugs or send suggestions directly to <a href="mailto:soporte@menius.app">soporte@menius.app</a>. We read and respond to all messages. Improvement suggestions are evaluated and the most requested ones are incorporated into future platform updates.</> },
    ],
  },
];

export function getFaqCategories(locale: LandingLocale): FaqCategory[] {
  return locale === 'en' ? en : es;
}

export function getFaqPageText(locale: LandingLocale) {
  if (locale === 'en') return {
    badge: 'Help Center',
    title: 'Frequently Asked Questions',
    subtitleSuffix: ' answers to the most common questions from restaurant owners about MENIUS.',
    ctaTitle: "Didn't find your answer?",
    ctaSubtitle: 'Contact us and our team will respond as soon as possible.',
    ctaDemo: 'Explore the demo',
    categories: 'Categories',
    categoriesLabel: 'FAQ categories',
    questions: (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`,
  };
  return {
    badge: 'Centro de Ayuda',
    title: 'Preguntas Frecuentes',
    subtitleSuffix: ' respuestas a las preguntas más comunes de dueños de restaurantes sobre MENIUS.',
    ctaTitle: '¿No encontraste tu respuesta?',
    ctaSubtitle: 'Escríbenos y nuestro equipo te responderá lo antes posible.',
    ctaDemo: 'Explorar el demo',
    categories: 'Categorías',
    categoriesLabel: 'Categorías de preguntas',
    questions: (n: number) => `${n} ${n === 1 ? 'pregunta' : 'preguntas'}`,
  };
}
