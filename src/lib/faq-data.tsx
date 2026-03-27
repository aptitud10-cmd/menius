import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LandingLocale } from './landing-translations';

export interface FaqCategory {
  id: string;
  title: string;
  icon: string;
  questions: { q: string; a: ReactNode }[];
}

const lnk = 'text-emerald-400 hover:text-emerald-300 transition-colors';

const es: FaqCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: '💡',
    questions: [
      { q: '¿Qué es MENIUS?', a: 'MENIUS es una plataforma SaaS todo-en-uno para restaurantes: menú digital con QR, pedidos en tiempo real, cocina KDS, asistente inteligente con IA (MENIUS AI), analytics avanzados, CRM de clientes, notificaciones WhatsApp y email, pagos con Stripe, y más. Todo por una tarifa mensual fija, sin comisiones por pedido.' },
      { q: '¿Necesito conocimientos técnicos para usar MENIUS?', a: 'No. MENIUS está diseñado para que cualquier persona pueda configurar su menú digital en minutos. Si sabes usar un celular, puedes usar MENIUS. Al crear tu cuenta se genera automáticamente un menú de ejemplo completo. Y si tienes dudas, MENIUS AI te guía paso a paso dentro del dashboard.' },
      { q: '¿Mis clientes necesitan descargar una app?', a: 'No. Tu menú funciona directamente en el navegador del celular. El cliente escanea el código QR y ve tu menú al instante, sin descargar nada ni registrarse. Es una Progressive Web App (PWA) ultrarrápida optimizada para móvil.' },
      { q: '¿En qué países funciona MENIUS?', a: 'MENIUS funciona en cualquier país del mundo. La plataforma soporta múltiples monedas (USD, MXN, COP, PEN, EUR, ARS, CLP y más) y tu menú puede estar en español o inglés. Los pagos online se procesan a través de Stripe, disponible en más de 46 países.' },
      { q: '¿MENIUS funciona para todo tipo de restaurante?', a: 'Sí. Funciona para taquerías, pizzerías, cafeterías, sushi bars, food trucks, panaderías, heladerías, bares, restaurantes de servicio completo, cocinas fantasma (dark kitchens), catering y cualquier negocio de alimentos y bebidas.' },
      { q: '¿Puedo ver un demo antes de registrarme?', a: <>Sí. Tenemos demos en vivo disponibles sin necesidad de crear cuenta. Puedes explorar un restaurante de ejemplo completo con menú, carrito, checkout y seguimiento de pedido. <Link href="/demo" className={lnk}>Ver demo en vivo →</Link></> },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración y Menú',
    icon: '⚙️',
    questions: [
      { q: '¿Cuánto tiempo toma configurar mi menú?', a: 'La configuración básica toma entre 15 y 30 minutos. Al crear tu restaurante, se genera un menú de ejemplo con categorías, productos y mesas que puedes editar. Solo necesitas reemplazar los datos de ejemplo con los tuyos.' },
      { q: '¿Puedo importar mi menú existente con IA?', a: 'Sí. MENIUS incluye una función de importación inteligente con IA. Puedes tomar una foto de tu menú impreso (carta, pizarra, PDF) y nuestra inteligencia artificial extrae automáticamente los nombres de platillos, descripciones y precios. Solo revisas, ajustas si es necesario, y listo.' },
      { q: '¿Puedo agregar fotos a mis productos?', a: 'Sí. Puedes subir tus propias fotos o usar nuestra inteligencia artificial (Google Gemini) para generar fotos profesionales de tus platillos automáticamente. Solo describe el platillo y la IA crea la imagen en segundos. Perfecto si no tienes fotógrafo profesional.' },
      { q: '¿Puedo agregar variantes y extras a mis productos?', a: 'Sí. Puedes agregar variantes (como tamaño: chico, mediano, grande) con diferencia de precio, y extras (como queso extra, tocino, aguacate) con precio adicional. Tus clientes los seleccionan al agregar el producto al carrito, igual que en las mejores apps de delivery.' },
      { q: '¿Puedo tener mi menú en inglés y español?', a: 'Sí. Cada restaurante puede configurar el idioma de su menú público (español o inglés) desde el dashboard. Esto cambia todos los textos de la interfaz del menú, el checkout, las confirmaciones y las notificaciones.' },
      { q: '¿Cómo funcionan los códigos QR?', a: 'MENIUS genera un código QR único para cada mesa de tu restaurante. Los imprimes y los colocas en las mesas. Cuando un cliente escanea el QR, ve tu menú con la mesa ya seleccionada automáticamente. También puedes compartir un enlace directo para pedidos de pickup o delivery.' },
      { q: '¿Puedo personalizar el diseño de mi menú?', a: 'Tu menú se genera automáticamente con un diseño profesional y optimizado para móvil. Incluye el nombre de tu restaurante, logo, categorías con navegación, fotos de productos, precios, y un carrito de compras integrado. Todo responsivo y rápido.' },
      { q: '¿Puedo conectar un dominio personalizado?', a: 'Sí. En los planes Pro y Business puedes conectar tu propio dominio (ej: menu.turestaurante.com) para que tus clientes accedan al menú con tu marca. La configuración es sencilla y viene con certificado SSL incluido.' },
      { q: '¿Puedo marcar mis productos con etiquetas dietéticas?', a: 'Sí. Puedes agregar etiquetas como 🌱 Vegetariano, 🌿 Vegano, 🌾 Sin Gluten, 🌶️ Picante y más a cada producto. Estas etiquetas aparecen visualmente en las tarjetas del menú y tus clientes pueden filtrar por ellas para encontrar rápidamente lo que se adapta a su dieta.' },
      { q: '¿Puedo configurar horarios de disponibilidad por categoría?', a: 'Sí. Cada categoría puede tener su propio horario de disponibilidad. Por ejemplo, "Desayunos" disponible de 7am a 11am, y "Comidas" de 12pm a 5pm. Fuera del horario establecido, la categoría se muestra como bloqueada en el menú pero sigue visible, evitando confusión en los clientes.' },
    ],
  },
  {
    id: 'pedidos',
    title: 'Pedidos y Operación',
    icon: '🛒',
    questions: [
      { q: '¿Cómo recibo los pedidos?', a: 'Los pedidos llegan en tiempo real a tu dashboard con un sonido de alerta. Ves un tablero Kanban donde puedes gestionar los pedidos: pendiente → preparando → listo → entregado. También puedes recibir notificaciones por WhatsApp y email en los planes Pro y Business.' },
      { q: '¿Funciona para dine-in, pickup y delivery?', a: 'Sí. Tú decides qué tipos de orden habilitar desde tu dashboard. Para dine-in, los clientes escanean el QR de la mesa. Para pickup, usan tu enlace directo. Para delivery, los clientes agregan su dirección de entrega al hacer el pedido.' },
      { q: '¿Los clientes pueden seguir el estado de su pedido?', a: 'Sí. Después de hacer un pedido, el cliente recibe una página de seguimiento en tiempo real donde ve el estado actualizado: pendiente, preparando, listo, entregado. La actualización es instantánea, sin necesidad de recargar la página. Para pedidos de delivery, además puede ver en un mapa la ubicación GPS del repartidor en tiempo real.' },
      { q: '¿Puedo recibir pedidos de múltiples mesas al mismo tiempo?', a: 'Sí. No hay límite en la cantidad de pedidos simultáneos. Cada pedido se identifica por mesa y llega a tu tablero en tiempo real. Tu equipo puede gestionar decenas de pedidos al mismo tiempo sin problemas.' },
      { q: '¿Puedo pausar la recepción de pedidos?', a: 'Sí. Desde el dashboard puedes desactivar temporalmente la recepción de pedidos (por ejemplo, cuando tu cocina está saturada o fuera de horario). Tus clientes verán un aviso de que el restaurante no está aceptando pedidos en ese momento.' },
      { q: '¿El dashboard incluye analytics y reportes?', a: 'Sí. El dashboard incluye métricas de pedidos, productos más vendidos, ingresos por período, hora pico, ticket promedio, y datos de rendimiento. Además, puedes preguntarle a MENIUS AI directamente: "¿Cuánto vendí esta semana?" y te responde con datos reales al instante.' },
      { q: '¿Qué pasa si hay un problema con un pedido?', a: 'Desde el dashboard puedes ver los detalles completos de cada pedido, las notas del cliente, y cambiar el estado manualmente. Si necesitas contactar al cliente, puedes ver su nombre y los datos que proporcionó al hacer el pedido.' },
      { q: '¿Mis clientes pueden ver el historial de sus pedidos?', a: 'Sí. Los clientes pueden consultar su historial ingresando el email con el que hicieron sus pedidos. Verán todas sus órdenes anteriores con estado, productos y precios, y tendrán la opción de volver a ordenar los mismos productos con un solo clic.' },
    ],
  },
  {
    id: 'precios',
    title: 'Precios y Facturación',
    icon: '💰',
    questions: [
      { q: '¿Hay comisiones por pedido?', a: 'No. MENIUS no cobra ninguna comisión ni porcentaje por cada pedido o venta. Pagas una tarifa mensual fija según tu plan y listo. El 100% de lo que vendes es tuyo (menos la tarifa estándar de Stripe si usas pagos online).' },
      { q: '¿Puedo usar MENIUS gratis?', a: <>Sí. MENIUS tiene un plan gratuito permanente (sin límite de tiempo y sin tarjeta de crédito). Incluye menú digital con QR para hasta 5 mesas, pedidos dine-in, hasta 50 pedidos por mes e importar menú desde foto con IA. También puedes explorar nuestros <Link href="/demo" className={lnk}>demos en vivo</Link> sin crear una cuenta.</> },
      { q: '¿Qué incluye el plan gratuito?', a: 'El plan Free incluye: menú digital con QR para hasta 5 mesas, solo dine-in, hasta 50 pedidos por mes, importar menú desde foto con IA y soporte por email. No requiere tarjeta de crédito y no vence. Tu dashboard, menú y datos nunca se pierden. Es un plan real y permanente, no un trial.' },
      { q: '¿Cuáles son los planes disponibles?', a: <>Ofrecemos cuatro planes: Free ($0/mes, siempre gratis); Starter ($39/mes) con menú digital, hasta 15 mesas, dine-in + pickup, MENIUS AI, generación de imágenes con IA y soporte por chat; Pro ($79/mes) con delivery, WhatsApp (500 msgs/mes), cocina KDS, analytics avanzado y promociones; y Business ($149/mes) con todo ilimitado, hasta 3 sucursales, WhatsApp (2,000 msgs/mes), dominio propio y soporte dedicado. Todos sin comisiones por pedido. <Link href="/#precios" className={lnk}>Ver planes y precios →</Link></> },
      { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir o bajar de plan cuando quieras desde tu dashboard. Los cambios se aplican inmediatamente y el cobro se ajusta de forma proporcional (prorrateado). Sin penalidades ni contratos.' },
      { q: '¿Cómo se procesan los pagos de la suscripción?', a: 'Los pagos se procesan de forma segura a través de Stripe, la plataforma de pagos utilizada por empresas como Google, Amazon y Shopify. Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express).' },
      { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. No hay contratos a largo plazo ni penalidades por cancelación. Puedes cancelar tu suscripción de pago en cualquier momento desde tu dashboard. Al cancelar, vuelves automáticamente al plan Free — tu cuenta, menú y datos permanecen intactos para siempre.' },
    ],
  },
  {
    id: 'pagos-clientes',
    title: 'Pagos de Clientes',
    icon: '💳',
    questions: [
      { q: '¿Mis clientes pueden pagar en línea?', a: 'Sí. MENIUS soporta dos pasarelas de pago según la moneda de tu restaurante: Stripe (para USD, MXN, EUR y la mayoría de monedas) y Wompi (para restaurantes en Colombia con moneda COP). Tus clientes pagan con tarjeta, PSE, Nequi o Daviplata directamente desde el menú. El sistema detecta automáticamente cuál usar.' },
      { q: '¿Qué es Wompi y cómo funciona?', a: 'Wompi es la pasarela de pagos de Bancolombia, ideal para restaurantes en Colombia. Soporta tarjetas de crédito/débito, PSE (transferencias bancarias), Nequi, Daviplata y pagos en efectivo (Efecty). Si tu restaurante usa pesos colombianos (COP), MENIUS redirige automáticamente a Wompi al momento del pago. Solo necesitas registrarte en comercios.wompi.co y agregar tus llaves en la configuración.' },
      { q: '¿También puedo aceptar pagos en efectivo?', a: 'Sí. Puedes habilitar ambas opciones: pago en efectivo y pago en línea. Tus clientes eligen cómo quieren pagar al hacer su pedido. Tú decides qué métodos de pago ofrecer según las necesidades de tu negocio.' },
      { q: '¿Stripe cobra comisión por transacción?', a: 'Stripe cobra su tarifa estándar por procesamiento de pagos (generalmente 2.9% + $0.30 USD por transacción en EE.UU., varía por país). Wompi tiene sus propias tarifas según tu negociación con Bancolombia. MENIUS no agrega ningún cargo adicional sobre las transacciones de ninguna pasarela.' },
      { q: '¿Es seguro el proceso de pago para mis clientes?', a: 'Absolutamente. Stripe tiene certificación PCI DSS Nivel 1 y Wompi está regulado por la Superintendencia Financiera de Colombia. Los datos de tarjeta nunca pasan por nuestros servidores — son procesados directamente por la pasarela con encriptación de extremo a extremo.' },
    ],
  },
  {
    id: 'ia',
    title: 'Inteligencia Artificial',
    icon: '✨',
    questions: [
      { q: '¿Qué es MENIUS AI?', a: 'MENIUS AI es un asistente inteligente integrado en tu dashboard, disponible 24/7. Puedes preguntarle sobre ventas, clientes, productos más vendidos, estrategias de negocio, y también pedirle que te guíe paso a paso en cualquier función del dashboard. Es como tener un consultor de negocio personalizado dentro de tu restaurante.' },
      { q: '¿Qué puedo preguntarle a MENIUS AI?', a: 'Prácticamente todo sobre tu negocio: "¿Cuánto vendí hoy?", "¿Cuál es mi producto estrella?", "¿Tengo pedidos pendientes?", "Sugiéreme una promoción para el fin de semana", "¿Cómo agrego un producto nuevo?", "¿Quién es mi mejor cliente?", "¿A qué hora tengo más pedidos?". MENIUS AI tiene acceso a tus datos reales y responde con información precisa.' },
      { q: '¿MENIUS AI tiene costo adicional?', a: 'No. MENIUS AI está incluido en todos los planes sin costo extra. Usa tecnología Google Gemini optimizada para ser eficiente y económica. Puedes hacer hasta 60 preguntas por hora sin limitaciones adicionales.' },
      { q: '¿Qué es la generación de fotos con IA?', a: 'MENIUS incluye inteligencia artificial que genera fotos profesionales de tus platillos. Describes el platillo (ej: "tacos al pastor con piña y cilantro en plato de barro") y la IA crea una imagen realista y atractiva en segundos. Ideal para restaurantes que no tienen fotógrafo profesional.' },
      { q: '¿Puedo importar mi menú con una foto?', a: 'Sí. La función OCR inteligente permite tomar una foto de tu menú impreso (carta, pizarra, PDF) y nuestra IA extrae automáticamente nombres de platillos, descripciones y precios. Solo revisas, ajustas si es necesario, y los productos se agregan a tu menú digital.' },
    ],
  },
  {
    id: 'integraciones',
    title: 'Integraciones y Tecnología',
    icon: '🔗',
    questions: [
      { q: '¿MENIUS se integra con WhatsApp?', a: 'Sí. Puedes recibir notificaciones de nuevos pedidos directamente en tu WhatsApp Business y contactar a tus clientes con un clic. Además, el sistema puede enviar confirmaciones automáticas de pedido vía WhatsApp.' },
      { q: '¿Puedo iniciar sesión con Google?', a: 'Sí. MENIUS soporta inicio de sesión con Google (OAuth). Puedes registrarte y acceder a tu cuenta con un solo clic usando tu cuenta de Google, sin necesidad de crear una contraseña. También funciona el registro tradicional con email y contraseña.' },
      { q: '¿MENIUS tiene CRM de clientes?', a: 'Sí. MENIUS incluye un CRM integrado que te permite ver el historial de pedidos de cada cliente, sus preferencias, frecuencia de visitas y datos de contacto. Puedes usar esta información para crear campañas de marketing personalizadas y fidelizar a tus clientes.' },
      { q: '¿Cómo funcionan los códigos QR?', a: 'MENIUS genera códigos QR elegantes y de alta resolución para cada mesa, listos para imprimir. Incluyen el nombre de tu restaurante, el número de mesa, y un diseño premium. Los imprimes y los colocas en las mesas. Cuando el cliente escanea, ve tu menú con la mesa ya seleccionada.' },
      { q: '¿Qué es la Cocina KDS?', a: 'KDS (Kitchen Display System) es una pantalla dedicada para la cocina de tu restaurante. Muestra los pedidos en tiempo real con todos los detalles: productos, variantes, extras, notas del cliente, y datos de contacto. El equipo de cocina puede marcar pedidos como "preparando" y "listo" directamente desde la pantalla.' },
      { q: '¿Puedo usar MENIUS como app en mi celular?', a: 'Sí. MENIUS es una Progressive Web App (PWA). Puedes "instalarla" en tu celular desde el navegador sin pasar por la App Store ni Google Play. Funciona como una app nativa con acceso rápido desde tu pantalla de inicio.' },
      { q: '¿Puedo gestionar múltiples ubicaciones?', a: 'Sí. El Plan Business permite gestionar varias sucursales desde una sola cuenta. Cada ubicación tiene su propio menú, QR, configuración y pedidos, pero puedes supervisar todo desde un dashboard centralizado.' },
      { q: '¿Qué tecnologías usa MENIUS?', a: 'MENIUS está construido con tecnología de última generación: Next.js (React) para el frontend, Supabase (PostgreSQL) para la base de datos con actualizaciones en tiempo real, Stripe para pagos seguros, Google Gemini para IA y generación de imágenes, y Resend para emails transaccionales. Todo alojado en Vercel para máxima velocidad global.' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing y Automatizaciones',
    icon: '📣',
    questions: [
      { q: '¿MENIUS tiene herramientas de marketing integradas?', a: 'Sí. MENIUS incluye un Marketing Hub completo con 4 módulos: Campañas de Email (newsletters y promociones), Redes Sociales con generador de posts con IA para Instagram, Facebook y TikTok, Campañas de SMS, y Automatizaciones con 9 secuencias preconfiguradas basadas en el comportamiento del cliente.' },
      { q: '¿Puedo enviar emails a mis clientes desde MENIUS?', a: 'Sí. El módulo de Campañas de Email te permite crear y enviar boletines, promociones y anuncios a toda tu base de clientes o segmentos específicos. Los emails tienen diseño profesional con tu marca. Puedes ver estadísticas de apertura y clics desde el dashboard.' },
      { q: '¿Qué son las Automatizaciones?', a: 'Son secuencias de emails que se activan automáticamente según el comportamiento de tus clientes. MENIUS incluye 9 automatizaciones preconfiguradas: bienvenida al cliente nuevo, reactivación de clientes inactivos, reconocimiento de clientes VIP, recordatorio de trial, entre otras. Solo las activas y trabajan solas 24/7.' },
      { q: '¿Puedo enviar SMS a mis clientes?', a: 'Sí. El módulo de Campañas SMS permite enviar mensajes de texto directamente a los celulares de tus clientes registrados. Ideal para promociones del día, happy hours, eventos especiales o comunicados urgentes. Requiere integración con Twilio desde la sección de Configuración.' },
      { q: '¿MENIUS puede generar posts para redes sociales con IA?', a: 'Sí. El generador de Social Media usa inteligencia artificial para crear captions optimizados para Instagram, Facebook y TikTok basados en tus productos o el contexto que le das. Sugiere hashtags relevantes y el mejor momento para publicar según tu audiencia.' },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones y Equipo',
    icon: '🏪',
    questions: [
      { q: '¿Qué es el Counter y cómo funciona?', a: 'El Counter es una pantalla táctil dedicada para el equipo de caja o encargado. Funciona como el cerebro de tu operación: ves todos los pedidos entrantes en tiempo real con alerta de sonido, los aceptas con un toque, ajustas el tiempo estimado de entrega (ETA), asignas repartidores, e imprimes tickets automáticamente. Los pedidos se organizan en tabs: Nuevos, En preparación, Listos, Programados e Historial. Para pedidos de dine-in, el Counter muestra el número de mesa del cliente.' },
      { q: '¿Cómo funciona el flujo de un pedido en mesa?', a: 'El cliente escanea el QR de su mesa → hace el pedido desde su celular → el pedido llega al Counter con el número de mesa → el encargado lo acepta → el ticket se imprime automáticamente → la cocina lo prepara (visible en KDS) → cuando está listo, alguien lo lleva a la mesa → el encargado marca el pedido como entregado.' },
      { q: '¿Cómo funciona el flujo de un pedido de pickup?', a: 'El cliente ordena desde tu enlace directo → llega al Counter → el encargado acepta con el tiempo estimado → la cocina prepara → marca "listo" en el KDS → el cliente recibe notificación automática por WhatsApp o email → pasa a recoger → el encargado marca "entregado".' },
      { q: '¿Cómo funciona el flujo de un pedido de delivery?', a: 'El cliente ordena con dirección de entrega → llega al Counter → el encargado acepta (el sistema sugiere el tiempo de entrega automáticamente según la distancia) → la cocina prepara → el encargado asigna un repartidor de tu pool → el repartidor recibe por WhatsApp un enlace para compartir su GPS → el cliente puede ver la ubicación del repartidor en tiempo real desde su página de seguimiento → el repartidor toma foto como comprobante de entrega → se marca como entregado.' },
      { q: '¿Puedo gestionar mis propios repartidores?', a: 'Sí. En Staff > Repartidores puedes agregar tu pool de repartidores con nombre y teléfono. Al asignar un delivery desde el Counter, aparece una lista para seleccionar al repartidor disponible. Al asignarlo, recibe automáticamente un WhatsApp con la dirección y un enlace de tracking para compartir su GPS en tiempo real.' },
      { q: '¿El cliente puede ver dónde está su repartidor?', a: 'Sí. El repartidor abre su enlace de tracking y acepta compartir su ubicación GPS. En la página de seguimiento del pedido, el cliente ve un mapa con la posición actualizada del repartidor en tiempo real. La ubicación se actualiza cada 10 segundos automáticamente.' },
      { q: '¿Los repartidores pueden subir foto como comprobante de entrega?', a: 'Sí. Desde la misma página de tracking, el repartidor puede tomar o subir una foto del pedido entregado. Esta foto queda registrada en el sistema y visible en el detalle de la orden desde el Counter. Ideal para evitar disputas y llevar control de cada entrega.' },
      { q: '¿Puedo recibir pedidos programados para más tarde?', a: 'Sí. Tus clientes pueden programar un pedido para una fecha y hora futura desde el checkout (opción "Programar para después"). El pedido aparece en el tab "Programados" del Counter con la hora programada visible. A la hora acordada, el sistema lo activa automáticamente como un pedido normal.' },
      { q: '¿Cómo funcionan las impresoras?', a: 'Cada dispositivo puede configurar qué tipo de ticket imprime (Configuración > Impresoras). Opciones: Recibo del cliente (ticket completo con precios y datos del pedido) y Ticket de cocina (solo artículos y cantidades, sin precios, con número de orden grande para que cocina lo vea fácilmente). Puedes activar uno, ambos, o ninguno por dispositivo. La impresión ocurre automáticamente al aceptar la orden desde el Counter.' },
      { q: '¿El Counter imprime automáticamente al aceptar un pedido?', a: 'Sí. Por defecto, al aceptar un pedido en el Counter, se imprime automáticamente el ticket según la configuración de impresoras del dispositivo. Si el dispositivo tiene habilitado el "Ticket de cocina", se imprime uno adicional para la cocina. También puedes imprimir manualmente desde el detalle de cualquier orden.' },
      { q: '¿MENIUS tiene control de inventario?', a: 'Sí. Desde el dashboard (Menú > Inventario) puedes activar el control de stock por producto. Defines la cantidad disponible y un umbral de alerta de stock bajo. Al realizarse un pedido, el stock se descuenta automáticamente. También puedes marcar productos como agotados con un toggle en tiempo real.' },
      { q: '¿Puedo tener diferentes roles para mi equipo?', a: 'Sí. MENIUS tiene un sistema de roles con 4 niveles: Administrador (acceso total), Gerente (todo excepto facturación), Staff (pedidos y menú) y Cocina (solo vista KDS). Cada miembro del equipo accede exactamente a lo que necesita según su función.' },
    ],
  },
  {
    id: 'reservaciones',
    title: 'Reservaciones',
    icon: '📅',
    questions: [
      { q: '¿MENIUS tiene sistema de reservaciones de mesa?', a: 'Sí. MENIUS incluye un sistema básico de reservaciones que puedes activar desde el dashboard (Reservaciones > Ajustes). Cuando está activo, tus clientes ven un formulario "Reservar una mesa" directamente en tu menú público, sin necesidad de llamar ni usar apps externas.' },
      { q: '¿Cómo activo las reservaciones en mi restaurante?', a: 'Ve a tu dashboard → menú lateral → Reservaciones → clic en "Ajustes" → activa el toggle "Activar reservaciones" → guarda. Desde ese momento, el formulario de reserva aparece en la parte inferior de tu menú público para todos tus clientes.' },
      { q: '¿Qué información solicita el formulario de reserva?', a: 'El cliente completa: nombre completo (obligatorio), número de personas, fecha y hora de la reserva, teléfono, correo electrónico, y notas especiales opcionales (alergias, ocasión especial, preferencia de mesa). El formulario es limpio y rápido de llenar desde el celular.' },
      { q: '¿Cómo gestiono las reservaciones recibidas?', a: 'Desde el dashboard → Reservaciones, ves todas las reservaciones organizadas por fecha. Puedes confirmar, rechazar o marcar como "no asistió" con un solo toque. La vista muestra nombre, hora, número de personas, teléfono y notas de cada reservación. También tiene estadísticas de cuántas tienes hoy y próximas.' },
      { q: '¿Los clientes reciben confirmación de su reservación?', a: 'Por ahora el sistema envía la solicitud al restaurante y muestra un mensaje de confirmación en pantalla. La confirmación formal al cliente (por WhatsApp o email) la hace el equipo del restaurante manualmente después de revisar disponibilidad. Una futura versión incluirá confirmaciones automáticas.' },
      { q: '¿Hay límite de reservaciones por día?', a: 'No. Puedes recibir y gestionar cualquier número de reservaciones sin límite. La vista del dashboard está optimizada para ver todas las reservaciones del día seleccionado, con navegación por fecha y una sección de próximas reservaciones.' },
    ],
  },
  {
    id: 'fidelizacion',
    title: 'Fidelización y API',
    icon: '🎁',
    questions: [
      { q: '¿MENIUS tiene programa de puntos o lealtad?', a: 'Sí. El módulo de Lealtad (disponible en planes Pro y Business) permite configurar un sistema de puntos por compra. Defines cuántos puntos se acumulan por peso/dólar gastado, el mínimo para canjear, y puedes ajustar los puntos de cada cliente directamente desde tu dashboard.' },
      { q: '¿Puedo conectar MENIUS con mis propias aplicaciones?', a: 'Sí. El Plan Business incluye acceso a la API de MENIUS con API Keys. Puedes generar llaves de acceso seguras desde Configuración > API Keys y usarlas para integrar tus propios sistemas, aplicaciones o herramientas externas con tu menú y datos de pedidos.' },
      { q: '¿MENIUS soporta múltiples sucursales?', a: 'Sí. El Plan Business incluye gestión de sucursales. Puedes crear múltiples ubicaciones bajo el mismo negocio, cada una con su propio menú, URL, QR, configuración y pedidos independientes. Todas se gestionan desde una sola cuenta en un dashboard centralizado.' },
      { q: '¿Cómo funciona el CRM de clientes?', a: 'El CRM registra automáticamente a cada cliente que hace un pedido. Puedes ver su historial completo, frecuencia de visitas, gasto total, y el sistema asigna etiquetas automáticas (Nuevo, Frecuente, VIP) según su comportamiento. Desde el CRM puedes contactarlos por WhatsApp o email con un clic.' },
    ],
  },
  {
    id: 'seguridad',
    title: 'Seguridad y Privacidad',
    icon: '🔒',
    questions: [
      { q: '¿Es seguro MENIUS?', a: 'Sí. Toda la comunicación está encriptada con SSL/TLS. Los pagos se procesan a través de Stripe (certificado PCI DSS Nivel 1). Los datos se almacenan en Supabase con Row-Level Security (RLS), lo que significa que cada restaurante solo puede ver sus propios datos. Implementamos headers de seguridad (HSTS, CSP), sanitización de inputs, y rate limiting.' },
      { q: '¿Qué datos recopilan de mis clientes?', a: <>Solo recopilamos la información estrictamente necesaria para procesar pedidos: nombre del cliente, artículos ordenados, y opcionalmente email y dirección de entrega. No usamos cookies de rastreo ni publicidad de terceros. Puedes leer nuestra <Link href="/privacy" className={lnk}>Política de Privacidad</Link> completa para más detalles.</> },
      { q: '¿Cumplen con regulaciones de privacidad?', a: 'Sí. MENIUS cumple con CCPA (California Consumer Privacy Act) y NY SHIELD Act. No vendemos ni compartimos datos personales con terceros para marketing. Solo compartimos datos con proveedores esenciales del servicio (Stripe para pagos, Supabase para base de datos, Resend para emails transaccionales).' },
      { q: '¿Mis datos están respaldados?', a: 'Sí. La base de datos tiene respaldos automáticos diarios gestionados por Supabase. Tu menú, productos, configuración y historial de pedidos están protegidos. Además, tu cuenta nunca se elimina aunque canceles tu suscripción — siempre puedes reactivar y recuperar todo.' },
    ],
  },
  {
    id: 'soporte',
    title: 'Soporte y Ayuda',
    icon: '🤝',
    questions: [
      { q: '¿Qué tipo de soporte ofrecen?', a: 'Todos los planes incluyen MENIUS AI, un asistente inteligente 24/7 que responde preguntas sobre el dashboard y tu negocio al instante. Además: Plan Starter tiene soporte por email (48h). Plan Pro tiene soporte prioritario por email (24h). Plan Business tiene soporte dedicado por WhatsApp y onboarding personalizado.' },
      { q: '¿Ofrecen servicio de configuración profesional?', a: <>Sí. Para restaurantes que prefieren no configurar nada por su cuenta, ofrecemos un servicio de Setup Profesional. Nuestro equipo configura tu menú completo, sube tus productos con fotos, configura métodos de pago, genera los códigos QR y te entrega todo funcionando. <Link href="/setup-profesional" className={lnk}>Más información sobre Setup Profesional →</Link></> },
      { q: '¿Puedo solicitar una demostración personalizada?', a: <>Sí. Si estás interesado en el Plan Business o tienes preguntas específicas sobre cómo MENIUS se adapta a tu restaurante, puedes contactarnos a <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a> para agendar una demostración personalizada.</> },
      { q: '¿Tienen tutoriales o guías?', a: <>Sí. Nuestro <Link href="/blog" className={lnk}>blog</Link> contiene guías detalladas y artículos sobre cómo aprovechar MENIUS. Además, MENIUS AI dentro del dashboard te explica paso a paso cómo usar cualquier función: &quot;¿Cómo agrego un producto?&quot;, &quot;¿Cómo creo un QR?&quot;. Es como tener un tutor personal 24/7.</> },
      { q: '¿Cómo reporto un error o sugiero una mejora?', a: <>Puedes reportar errores o enviar sugerencias directamente a <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a>. Leemos y respondemos todos los mensajes. Las sugerencias de mejora se evalúan y las más solicitadas se incorporan en futuras actualizaciones de la plataforma.</> },
    ],
  },
];

const en: FaqCategory[] = [
  {
    id: 'general',
    title: 'General',
    icon: '💡',
    questions: [
      { q: 'What is MENIUS?', a: 'MENIUS is an all-in-one SaaS platform for restaurants: digital menu with QR, real-time orders, kitchen KDS, AI-powered assistant (MENIUS AI), advanced analytics, built-in customer CRM, WhatsApp and email notifications, Stripe payments, and more. All for a fixed monthly fee, with zero per-order commissions.' },
      { q: 'Do I need technical skills to use MENIUS?', a: 'No. MENIUS is designed so anyone can set up their digital menu in minutes. If you can use a phone, you can use MENIUS. When you create your account, a complete sample menu is automatically generated. And if you have questions, MENIUS AI guides you step by step within the dashboard.' },
      { q: 'Do my customers need to download an app?', a: 'No. Your menu works directly in the phone\'s browser. The customer scans the QR code and sees your menu instantly, without downloading anything or signing up. It\'s an ultrafast Progressive Web App (PWA) optimized for mobile.' },
      { q: 'In which countries does MENIUS work?', a: 'MENIUS works in any country in the world. The platform supports multiple currencies (USD, MXN, COP, PEN, EUR, ARS, CLP and more) and your menu can be in Spanish or English. Online payments are processed through Stripe, available in over 46 countries.' },
      { q: 'Does MENIUS work for all types of restaurants?', a: 'Yes. It works for taco shops, pizzerias, cafés, sushi bars, food trucks, bakeries, ice cream shops, bars, full-service restaurants, ghost kitchens (dark kitchens), catering, and any food and beverage business.' },
      { q: 'Can I see a demo before signing up?', a: <>Yes. We have live demos available without creating an account. You can explore a complete sample restaurant with menu, cart, checkout, and order tracking. <Link href="/demo" className={lnk}>View live demo →</Link></> },
    ],
  },
  {
    id: 'configuracion',
    title: 'Setup & Menu',
    icon: '⚙️',
    questions: [
      { q: 'How long does it take to set up my menu?', a: 'Basic setup takes between 15 and 30 minutes. When you create your restaurant, a sample menu with categories, products, and tables is generated that you can edit. You just need to replace the sample data with yours.' },
      { q: 'Can I import my existing menu with AI?', a: 'Yes. MENIUS includes an AI-powered smart import feature. You can take a photo of your printed menu (paper menu, chalkboard, PDF) and our artificial intelligence automatically extracts dish names, descriptions, and prices. Just review, adjust if needed, and you\'re done.' },
      { q: 'Can I add photos to my products?', a: 'Yes. You can upload your own photos or use our artificial intelligence (Google Gemini) to automatically generate professional photos of your dishes. Just describe the dish and the AI creates the image in seconds. Perfect if you don\'t have a professional photographer.' },
      { q: 'Can I add variants and extras to my products?', a: 'Yes. You can add variants (like size: small, medium, large) with price differences, and extras (like extra cheese, bacon, avocado) with additional cost. Your customers select them when adding the product to their cart, just like in the best delivery apps.' },
      { q: 'Can I have my menu in English and Spanish?', a: 'Yes. Each restaurant can configure the language of its public menu (Spanish or English) from the dashboard. This changes all interface text in the menu, checkout, confirmations, and notifications.' },
      { q: 'How do QR codes work?', a: 'MENIUS generates a unique QR code for each table in your restaurant. You print them and place them on the tables. When a customer scans the QR, they see your menu with the table already selected automatically. You can also share a direct link for pickup or delivery orders.' },
      { q: 'Can I customize the design of my menu?', a: 'Your menu is automatically generated with a professional, mobile-optimized design. It includes your restaurant name, logo, categories with navigation, product photos, prices, and an integrated shopping cart. Everything is responsive and fast.' },
      { q: 'Can I connect a custom domain?', a: 'Yes. On Pro and Business plans you can connect your own domain (e.g., menu.yourrestaurant.com) so your customers access the menu under your brand. Setup is simple and comes with an included SSL certificate.' },
      { q: 'Can I label products with dietary tags?', a: 'Yes. You can add dietary tags like 🌱 Vegetarian, 🌿 Vegan, 🌾 Gluten-Free, 🌶️ Spicy, and more to each product. These tags appear visually on menu cards and customers can filter by them to quickly find options that match their dietary needs.' },
      { q: 'Can I set availability schedules per category?', a: 'Yes. Each category can have its own availability schedule. For example, "Breakfast" available from 7am to 11am, and "Lunch" from 12pm to 5pm. Outside the set hours, the category appears locked on the menu but remains visible, avoiding customer confusion.' },
    ],
  },
  {
    id: 'pedidos',
    title: 'Orders & Operations',
    icon: '🛒',
    questions: [
      { q: 'How do I receive orders?', a: 'Orders arrive in real time to your dashboard with an alert sound. You see a Kanban board where you can manage orders: pending → preparing → ready → delivered. You can also receive notifications via WhatsApp and email on Pro and Business plans.' },
      { q: 'Does it work for dine-in, pickup, and delivery?', a: 'Yes. You decide which order types to enable from your dashboard. For dine-in, customers scan the table QR. For pickup, they use your direct link. For delivery, customers add their delivery address when placing the order.' },
      { q: 'Can customers track their order status?', a: 'Yes. After placing an order, the customer receives a real-time tracking page where they see the updated status: pending, preparing, ready, delivered. Updates are instant, without needing to reload the page. For delivery orders, they can also see the driver\'s live GPS location on a map.' },
      { q: 'Can I receive orders from multiple tables at the same time?', a: 'Yes. There\'s no limit on simultaneous orders. Each order is identified by table and arrives at your board in real time. Your team can manage dozens of orders at the same time without issues.' },
      { q: 'Can I pause order reception?', a: 'Yes. From the dashboard you can temporarily disable order reception (for example, when your kitchen is overwhelmed or outside business hours). Your customers will see a notice that the restaurant is not accepting orders at the moment.' },
      { q: 'Does the dashboard include analytics and reports?', a: 'Yes. The dashboard includes order metrics, best-selling products, revenue by period, peak hours, average ticket, and performance data. Plus, you can ask MENIUS AI directly: "How much did I sell this week?" and it responds with real data instantly.' },
      { q: 'What happens if there\'s a problem with an order?', a: 'From the dashboard you can see the complete details of each order, customer notes, and manually change the status. If you need to contact the customer, you can see their name and the information they provided when placing the order.' },
      { q: 'Can customers view their order history?', a: 'Yes. Customers can look up their order history by entering the email they used to place orders. They\'ll see all previous orders with status, products, and prices, along with the option to reorder the same items with a single click.' },
    ],
  },
  {
    id: 'precios',
    title: 'Pricing & Billing',
    icon: '💰',
    questions: [
      { q: 'Are there per-order commissions?', a: 'No. MENIUS does not charge any commission or percentage on each order or sale. You pay a fixed monthly fee based on your plan and that\'s it. 100% of what you sell is yours (minus the standard Stripe fee if you use online payments).' },
      { q: 'Can I use MENIUS for free?', a: <>Yes. MENIUS has a permanent free plan — no time limit and no credit card needed. It includes a digital menu with QR codes for up to 5 tables, dine-in orders, up to 50 orders per month, and AI menu import from photo. You can also explore our <Link href="/demo" className={lnk}>live demos</Link> without creating an account.</> },
      { q: 'What does the free plan include?', a: 'The Free plan includes: digital menu with QR for up to 5 tables, dine-in only, up to 50 orders per month, AI menu import from photo, and email support. No credit card required and it never expires. Your dashboard, menu, and data are always preserved. It\'s a real, permanent plan — not a trial.' },
      { q: 'What plans are available?', a: <>We offer four plans: Free ($0/mo, forever free); Starter ($39/mo) with digital menu, up to 15 tables, dine-in + pickup, MENIUS AI, AI image generation, and chat support; Pro ($79/mo) with delivery, WhatsApp (500 msgs/mo), kitchen KDS, advanced analytics, and promotions; and Business ($149/mo) with everything unlimited, up to 3 locations, WhatsApp (2,000 msgs/mo), custom domain, and dedicated support. All with zero commissions. <Link href="/#precios" className={lnk}>View plans and pricing →</Link></> },
      { q: 'Can I change plans at any time?', a: 'Yes. You can upgrade or downgrade your plan whenever you want from your dashboard. Changes apply immediately and billing is adjusted proportionally (prorated). No penalties or contracts.' },
      { q: 'How are subscription payments processed?', a: 'Payments are processed securely through Stripe, the payment platform used by companies like Google, Amazon, and Shopify. We accept all major credit and debit cards (Visa, Mastercard, American Express).' },
      { q: 'Can I cancel at any time?', a: 'Yes. There are no long-term contracts or cancellation penalties. You can cancel your subscription at any time from your dashboard or the Stripe billing portal. Your account will remain active until the end of the already-paid period.' },
      { q: 'What happens if I cancel my paid plan?', a: 'When you cancel a paid subscription, you automatically return to the Free plan — your account, menu, and all data remain intact forever. You can re-subscribe at any time from your dashboard.' },
    ],
  },
  {
    id: 'pagos-clientes',
    title: 'Customer Payments',
    icon: '💳',
    questions: [
      { q: 'Can my customers pay online?', a: 'Yes. MENIUS supports two payment gateways depending on your restaurant\'s currency: Stripe (for USD, MXN, EUR, and most currencies) and Wompi (for restaurants in Colombia using COP). The system automatically detects which gateway to use based on your currency.' },
      { q: 'What is Wompi?', a: 'Wompi is Bancolombia\'s payment gateway, ideal for restaurants in Colombia. It supports credit/debit cards, PSE (bank transfers), Nequi, Daviplata, and cash payments (Efecty). If your restaurant uses Colombian pesos (COP), MENIUS automatically redirects to Wompi at checkout. Just register at comercios.wompi.co and add your keys in settings.' },
      { q: 'Can I also accept cash payments?', a: 'Yes. You can enable both options: cash payment and online payment. Your customers choose how they want to pay when placing their order. You decide which payment methods to offer based on your business needs.' },
      { q: 'Does Stripe charge a per-transaction fee?', a: 'Stripe charges its standard payment processing fee (generally 2.9% + $0.30 USD per transaction in the US, varies by country). Wompi has its own rates negotiated with Bancolombia. MENIUS does not add any additional charges on transactions from either gateway.' },
      { q: 'Is the payment process secure for my customers?', a: 'Absolutely. Stripe holds PCI DSS Level 1 certification and Wompi is regulated by Colombia\'s Superintendencia Financiera. Card data never passes through our servers — it\'s processed directly by the payment gateway with end-to-end encryption.' },
    ],
  },
  {
    id: 'ia',
    title: 'Artificial Intelligence',
    icon: '✨',
    questions: [
      { q: 'What is MENIUS AI?', a: 'MENIUS AI is an intelligent assistant integrated into your dashboard, available 24/7. You can ask it about sales, customers, best-selling products, business strategies, and also have it guide you step by step through any dashboard feature. It\'s like having a personalized business consultant inside your restaurant.' },
      { q: 'What can I ask MENIUS AI?', a: 'Practically everything about your business: "How much did I sell today?", "What\'s my star product?", "Do I have pending orders?", "Suggest a promotion for the weekend", "How do I add a new product?", "Who\'s my best customer?", "What time do I get the most orders?". MENIUS AI has access to your real data and responds with precise information.' },
      { q: 'Does MENIUS AI cost extra?', a: 'No. MENIUS AI is included in all plans at no extra cost. It uses Google Gemini technology optimized to be efficient and economical. You can ask up to 60 questions per hour with no additional limitations.' },
      { q: 'What is AI photo generation?', a: 'MENIUS includes artificial intelligence that generates professional photos of your dishes. You describe the dish (e.g., "tacos al pastor with pineapple and cilantro on a clay plate") and the AI creates a realistic and attractive image in seconds. Ideal for restaurants that don\'t have a professional photographer.' },
      { q: 'Can I import my menu with a photo?', a: 'Yes. The smart OCR feature lets you take a photo of your printed menu (paper menu, chalkboard, PDF) and our AI automatically extracts dish names, descriptions, and prices. Just review, adjust if needed, and the products are added to your digital menu.' },
    ],
  },
  {
    id: 'integraciones',
    title: 'Integrations & Technology',
    icon: '🔗',
    questions: [
      { q: 'Does MENIUS integrate with WhatsApp?', a: 'Yes. You can receive new order notifications directly on your WhatsApp Business and contact your customers with one click. Additionally, the system can send automatic order confirmations via WhatsApp.' },
      { q: 'Can I sign in with Google?', a: 'Yes. MENIUS supports Google sign-in (OAuth). You can sign up and access your account with a single click using your Google account, without needing to create a password. Traditional registration with email and password also works.' },
      { q: 'Does MENIUS have a customer CRM?', a: 'Yes. MENIUS includes a built-in CRM that lets you view each customer\'s order history, preferences, visit frequency, and contact information. You can use this data to create personalized marketing campaigns and build customer loyalty.' },
      { q: 'How do QR codes work?', a: 'MENIUS generates elegant, high-resolution QR codes for each table, ready to print. They include your restaurant name, table number, and a premium design. You print them and place them on tables. When the customer scans, they see your menu with the table already selected.' },
      { q: 'What is Kitchen KDS?', a: 'KDS (Kitchen Display System) is a dedicated screen for your restaurant\'s kitchen. It displays orders in real time with all details: products, variants, extras, customer notes, and contact information. The kitchen team can mark orders as "preparing" and "ready" directly from the screen.' },
      { q: 'Can I use MENIUS as an app on my phone?', a: 'Yes. MENIUS is a Progressive Web App (PWA). You can "install" it on your phone from the browser without going through the App Store or Google Play. It works like a native app with quick access from your home screen.' },
      { q: 'Can I manage multiple locations?', a: 'Yes. The Business Plan allows you to manage multiple branches from a single account. Each location has its own menu, QR codes, settings, and orders, but you can oversee everything from a centralized dashboard.' },
      { q: 'What technologies does MENIUS use?', a: 'MENIUS is built with cutting-edge technology: Next.js (React) for the frontend, Supabase (PostgreSQL) for the database with real-time updates, Stripe for secure payments, Google Gemini for AI and image generation, and Resend for transactional emails. All hosted on Vercel for maximum global speed.' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Automations',
    icon: '📣',
    questions: [
      { q: 'Does MENIUS have built-in marketing tools?', a: 'Yes. MENIUS includes a full Marketing Hub with 4 modules: Email Campaigns (newsletters and promotions), Social Media with AI post generator for Instagram, Facebook, and TikTok, SMS Campaigns, and Automations with 9 pre-built sequences based on customer behavior.' },
      { q: 'Can I send emails to my customers from MENIUS?', a: 'Yes. The Email Campaigns module lets you create and send newsletters, promotions, and announcements to your entire customer base or specific segments. Emails feature professional branded designs and you can track open rates and clicks from your dashboard.' },
      { q: 'What are Automations?', a: 'Automations are email sequences that trigger automatically based on your customers\' behavior. MENIUS includes 9 pre-built automations: new customer welcome, inactive customer reactivation, VIP customer recognition, trial reminder, and more. Just activate them and they work 24/7 on their own.' },
      { q: 'Can I send SMS messages to my customers?', a: 'Yes. The SMS Campaigns module lets you send text messages directly to your registered customers\' phones. Ideal for daily specials, happy hours, special events, or urgent announcements. Requires Twilio integration from your Settings section.' },
      { q: 'Can MENIUS generate social media posts with AI?', a: 'Yes. The Social Media generator uses AI to create optimized captions for Instagram, Facebook, and TikTok based on your products or any context you provide. It suggests relevant hashtags and the best time to post based on your audience.' },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operations & Team',
    icon: '🏪',
    questions: [
      { q: 'What is the Counter and how does it work?', a: 'The Counter is a dedicated touchscreen for your cashier or front-of-house manager. It\'s the brain of your operation: see all incoming orders in real time with sound alerts, accept them with a tap, set the estimated delivery time (ETA), assign drivers, and auto-print tickets. Orders are organized in tabs: New, Preparing, Ready, Scheduled, and History. For dine-in orders, the Counter shows the customer\'s table number.' },
      { q: 'How does a dine-in table order flow work?', a: 'Customer scans the table QR → places order from their phone → order arrives at Counter with table number → staff accepts it → ticket prints automatically → kitchen prepares it (visible on KDS) → when ready, someone brings it to the table → staff marks the order as delivered.' },
      { q: 'How does a pickup order flow work?', a: 'Customer orders from your direct link → arrives at Counter → staff accepts with estimated time → kitchen prepares → marks "ready" on KDS → customer receives automatic WhatsApp or email notification → customer comes to pick up → staff marks "delivered".' },
      { q: 'How does a delivery order flow work?', a: 'Customer orders with delivery address → arrives at Counter → staff accepts (system automatically suggests delivery time based on distance) → kitchen prepares → staff assigns a driver from your pool → driver receives a WhatsApp with the address and a GPS tracking link → customer can see the driver\'s real-time location on their tracking page → driver takes a proof-of-delivery photo → order is marked as delivered.' },
      { q: 'Can I manage my own delivery drivers?', a: 'Yes. Under Staff > Drivers you can add your driver pool with name and phone number. When assigning a delivery from the Counter, a list appears to select the available driver. Once assigned, they automatically receive a WhatsApp with the address and a tracking link to share their GPS location in real time.' },
      { q: 'Can the customer see where their driver is?', a: 'Yes. The driver opens their tracking link and accepts to share their GPS location. On the customer\'s order tracking page, they see a live map with the driver\'s updated position. Location updates every 10 seconds automatically.' },
      { q: 'Can drivers upload a proof-of-delivery photo?', a: 'Yes. From the same tracking page, the driver can take or upload a photo of the delivered order. This photo is saved in the system and visible in the order details from the Counter. Perfect for avoiding disputes and keeping a record of every delivery.' },
      { q: 'Can I receive orders scheduled for a future time?', a: 'Yes. Your customers can schedule an order for a future date and time from checkout (the "Schedule for later" option). The order appears in the Counter\'s "Scheduled" tab with the scheduled time visible. At the agreed time, the system automatically activates it as a normal order.' },
      { q: 'How do printers work?', a: 'Each device can configure which type of ticket to print (Settings > Printers). Options: Customer receipt (full ticket with prices and order details) and Kitchen ticket (items and quantities only, no prices, with a large order number for easy kitchen visibility). You can enable one, both, or neither per device. Printing happens automatically when accepting an order from the Counter.' },
      { q: 'Does the Counter auto-print when accepting an order?', a: 'Yes. By default, when you accept an order in the Counter, a ticket is automatically printed based on the device\'s printer configuration. If the device has "Kitchen ticket" enabled, an additional one prints for the kitchen. You can also print manually from the detail view of any order.' },
      { q: 'Does MENIUS have inventory control?', a: 'Yes. From the dashboard (Menu > Inventory) you can enable stock tracking per product. Set the available quantity and a low-stock alert threshold. When an order is placed, stock is automatically decremented. You can also mark products as sold out with a real-time toggle.' },
      { q: 'Can I set different roles for my team?', a: 'Yes. MENIUS has a role system with 4 levels: Administrator (full access), Manager (everything except billing), Staff (orders and menu), and Kitchen (KDS view only). Each team member accesses exactly what they need for their role.' },
    ],
  },
  {
    id: 'reservaciones',
    title: 'Reservations',
    icon: '📅',
    questions: [
      { q: 'Does MENIUS have a table reservation system?', a: 'Yes. MENIUS includes a built-in reservation system you can activate from the dashboard (Reservations > Settings). When enabled, your customers see a "Reserve a table" form directly on your public menu — no phone calls or third-party apps needed.' },
      { q: 'How do I enable reservations for my restaurant?', a: 'Go to your dashboard → sidebar → Reservations → click "Settings" → toggle on "Enable reservations" → save. From that moment, the reservation form appears at the bottom of your public menu for all your customers.' },
      { q: 'What information does the reservation form collect?', a: 'The customer fills in: full name (required), number of guests, date and time, phone number, email, and optional special notes (allergies, special occasion, seating preference). The form is clean and quick to fill on mobile.' },
      { q: 'How do I manage incoming reservations?', a: 'From the dashboard → Reservations, you see all reservations organized by date. You can confirm, reject, or mark as "no-show" with a single tap. The view shows each reservation\'s name, time, party size, phone, and notes. Stats show how many you have today and upcoming.' },
      { q: 'Is there a limit on daily reservations?', a: 'No. You can receive and manage any number of reservations without limit. The dashboard view is optimized to show all reservations for the selected day, with date navigation and an upcoming reservations section.' },
    ],
  },
  {
    id: 'fidelizacion',
    title: 'Loyalty & API',
    icon: '🎁',
    questions: [
      { q: 'Does MENIUS have a loyalty or points program?', a: 'Yes. The Loyalty module (available on Pro and Business plans) lets you set up a points-per-purchase system. Define how many points customers earn per dollar spent, the minimum to redeem, and you can manually adjust any customer\'s points directly from your dashboard.' },
      { q: 'Can I connect MENIUS to my own applications?', a: 'Yes. The Business Plan includes access to the MENIUS API with API Keys. You can generate secure access keys from Settings > API Keys and use them to integrate your own systems, applications, or custom tools with your menu and order data.' },
      { q: 'Does MENIUS support multiple locations?', a: 'Yes. The Business Plan includes branch management. You can create multiple locations under the same business, each with its own menu, URL, QR codes, settings, and independent orders. All managed from a single centralized dashboard account.' },
      { q: 'How does the customer CRM work?', a: 'The CRM automatically records every customer who places an order. You can see their full history, visit frequency, total spend, and the system automatically assigns tags (New, Frequent, VIP) based on their behavior. From the CRM you can contact them via WhatsApp or email with one click.' },
    ],
  },
  {
    id: 'seguridad',
    title: 'Security & Privacy',
    icon: '🔒',
    questions: [
      { q: 'Is MENIUS secure?', a: 'Yes. All communication is encrypted with SSL/TLS. Payments are processed through Stripe (PCI DSS Level 1 certified). Data is stored in Supabase with Row-Level Security (RLS), meaning each restaurant can only see its own data. We implement security headers (HSTS, CSP), input sanitization, and rate limiting.' },
      { q: 'What data do you collect from my customers?', a: <>We only collect information strictly necessary to process orders: customer name, items ordered, and optionally email and delivery address. We don&apos;t use tracking cookies or third-party advertising. You can read our full <Link href="/privacy" className={lnk}>Privacy Policy</Link> for more details.</> },
      { q: 'Do you comply with privacy regulations?', a: 'Yes. MENIUS complies with CCPA (California Consumer Privacy Act) and NY SHIELD Act. We do not sell or share personal data with third parties for marketing. We only share data with essential service providers (Stripe for payments, Supabase for database, Resend for transactional emails).' },
      { q: 'Is my data backed up?', a: 'Yes. The database has automatic daily backups managed by Supabase. Your menu, products, settings, and order history are protected. Plus, your account is never deleted even if you cancel your subscription — you can always reactivate and recover everything.' },
    ],
  },
  {
    id: 'soporte',
    title: 'Support & Help',
    icon: '🤝',
    questions: [
      { q: 'What kind of support do you offer?', a: 'All plans include MENIUS AI, an intelligent 24/7 assistant that answers questions about the dashboard and your business instantly. Additionally: Starter Plan has email support (48h). Pro Plan has priority email support (24h). Business Plan has dedicated WhatsApp support and personalized onboarding.' },
      { q: 'Do you offer professional setup service?', a: <>Yes. For restaurants that prefer not to set up anything themselves, we offer a Professional Setup service. Our team configures your complete menu, uploads your products with photos, sets up payment methods, generates QR codes, and delivers everything ready to go. <Link href="/setup-profesional" className={lnk}>More about Professional Setup →</Link></> },
      { q: 'Can I request a personalized demo?', a: <>Yes. If you&apos;re interested in the Business Plan or have specific questions about how MENIUS adapts to your restaurant, you can contact us at <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a> to schedule a personalized demo.</> },
      { q: 'Do you have tutorials or guides?', a: <>Yes. Our <Link href="/blog" className={lnk}>blog</Link> contains detailed guides and articles on how to make the most of MENIUS. Plus, MENIUS AI within the dashboard explains step by step how to use any feature: &quot;How do I add a product?&quot;, &quot;How do I create a QR?&quot;. It&apos;s like having a personal tutor 24/7.</> },
      { q: 'How do I report a bug or suggest an improvement?', a: <>You can report bugs or send suggestions directly to <a href="mailto:soporte@menius.app" className={lnk}>soporte@menius.app</a>. We read and respond to all messages. Improvement suggestions are evaluated and the most requested ones are incorporated into future platform updates.</> },
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
  };
  return {
    badge: 'Centro de Ayuda',
    title: 'Preguntas Frecuentes',
    subtitleSuffix: ' respuestas a las preguntas más comunes de dueños de restaurantes sobre MENIUS.',
    ctaTitle: '¿No encontraste tu respuesta?',
    ctaSubtitle: 'Escríbenos y nuestro equipo te responderá lo antes posible.',
    ctaDemo: 'Explorar el demo',
  };
}
