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
      { q: '¿Qué es MENIUS?', a: 'MENIUS es una plataforma SaaS todo-en-uno para restaurantes: menú digital con QR, pedidos en tiempo real, cocina KDS, asistente inteligente con IA (MENIUS AI), analytics avanzados, notificaciones WhatsApp y email, Google Maps integrado, pagos con Stripe, y más. Todo por una tarifa mensual fija, sin comisiones por pedido.' },
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
    ],
  },
  {
    id: 'pedidos',
    title: 'Pedidos y Operación',
    icon: '🛒',
    questions: [
      { q: '¿Cómo recibo los pedidos?', a: 'Los pedidos llegan en tiempo real a tu dashboard con un sonido de alerta. Ves un tablero Kanban donde puedes gestionar los pedidos: pendiente → preparando → listo → entregado. También puedes recibir notificaciones por WhatsApp y email en los planes Pro y Business.' },
      { q: '¿Funciona para dine-in, pickup y delivery?', a: 'Sí. Tú decides qué tipos de orden habilitar desde tu dashboard. Para dine-in, los clientes escanean el QR de la mesa. Para pickup, usan tu enlace directo. Para delivery, los clientes agregan su dirección de entrega al hacer el pedido.' },
      { q: '¿Los clientes pueden seguir el estado de su pedido?', a: 'Sí. Después de hacer un pedido, el cliente recibe una página de seguimiento en tiempo real donde ve el estado actualizado: pendiente, preparando, listo, entregado. La actualización es instantánea, sin necesidad de recargar la página.' },
      { q: '¿Puedo recibir pedidos de múltiples mesas al mismo tiempo?', a: 'Sí. No hay límite en la cantidad de pedidos simultáneos. Cada pedido se identifica por mesa y llega a tu tablero en tiempo real. Tu equipo puede gestionar decenas de pedidos al mismo tiempo sin problemas.' },
      { q: '¿Puedo pausar la recepción de pedidos?', a: 'Sí. Desde el dashboard puedes desactivar temporalmente la recepción de pedidos (por ejemplo, cuando tu cocina está saturada o fuera de horario). Tus clientes verán un aviso de que el restaurante no está aceptando pedidos en ese momento.' },
      { q: '¿El dashboard incluye analytics y reportes?', a: 'Sí. El dashboard incluye métricas de pedidos, productos más vendidos, ingresos por período, hora pico, ticket promedio, y datos de rendimiento. Además, puedes preguntarle a MENIUS AI directamente: "¿Cuánto vendí esta semana?" y te responde con datos reales al instante.' },
      { q: '¿Qué pasa si hay un problema con un pedido?', a: 'Desde el dashboard puedes ver los detalles completos de cada pedido, las notas del cliente, y cambiar el estado manualmente. Si necesitas contactar al cliente, puedes ver su nombre y los datos que proporcionó al hacer el pedido.' },
    ],
  },
  {
    id: 'precios',
    title: 'Precios y Facturación',
    icon: '💰',
    questions: [
      { q: '¿Hay comisiones por pedido?', a: 'No. MENIUS no cobra ninguna comisión ni porcentaje por cada pedido o venta. Pagas una tarifa mensual fija según tu plan y listo. El 100% de lo que vendes es tuyo (menos la tarifa estándar de Stripe si usas pagos online).' },
      { q: '¿Puedo probar MENIUS antes de pagar?', a: <>Sí. Todos los planes incluyen 14 días de prueba gratuita con acceso a todas las funciones. No necesitas tarjeta de crédito para empezar. También puedes explorar nuestros <Link href="/demo" className={lnk}>demos en vivo</Link> sin crear una cuenta.</> },
      { q: '¿Qué pasa después de los 14 días de prueba?', a: 'Al terminar la prueba, eliges el plan que prefieras y continúas sin interrupciones. Si no eliges un plan, tu cuenta se pausa temporalmente, pero nunca pierdes tus datos, menú ni configuración. Puedes reactivar en cualquier momento.' },
      { q: '¿Cuáles son los planes disponibles?', a: <>Ofrecemos tres planes: Starter ($39/mes) con menú digital, QR elegantes, MENIUS AI, Google Maps y login con Google; Pro ($79/mes) con delivery, WhatsApp, cocina KDS, analytics avanzado y promociones; y Business ($149/mes) con todo ilimitado, dominio propio y soporte dedicado. Todos sin comisiones por pedido. <Link href="/#precios" className={lnk}>Ver planes y precios →</Link></> },
      { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir o bajar de plan cuando quieras desde tu dashboard. Los cambios se aplican inmediatamente y el cobro se ajusta de forma proporcional (prorrateado). Sin penalidades ni contratos.' },
      { q: '¿Cómo se procesan los pagos de la suscripción?', a: 'Los pagos se procesan de forma segura a través de Stripe, la plataforma de pagos utilizada por empresas como Google, Amazon y Shopify. Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express).' },
      { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. No hay contratos a largo plazo ni penalidades por cancelación. Puedes cancelar tu suscripción en cualquier momento desde tu dashboard o el portal de facturación de Stripe. Tu cuenta permanecerá activa hasta el final del período ya pagado.' },
    ],
  },
  {
    id: 'pagos-clientes',
    title: 'Pagos de Clientes',
    icon: '💳',
    questions: [
      { q: '¿Mis clientes pueden pagar en línea?', a: 'Sí. Puedes habilitar pagos en línea a través de Stripe. Tus clientes pagan con tarjeta de crédito o débito directamente desde el menú. El dinero se deposita automáticamente en tu cuenta bancaria según el calendario de Stripe.' },
      { q: '¿También puedo aceptar pagos en efectivo?', a: 'Sí. Puedes habilitar ambas opciones: pago en efectivo y pago en línea. Tus clientes eligen cómo quieren pagar al hacer su pedido. Tú decides qué métodos de pago ofrecer según las necesidades de tu negocio.' },
      { q: '¿Stripe cobra comisión por transacción?', a: 'Stripe cobra su tarifa estándar por procesamiento de pagos (generalmente 2.9% + $0.30 USD por transacción en EE.UU., varía por país). Esta es la tarifa de Stripe, no de MENIUS. MENIUS no agrega ningún cargo adicional sobre las transacciones.' },
      { q: '¿Es seguro el proceso de pago para mis clientes?', a: 'Absolutamente. Stripe cuenta con certificación PCI DSS Nivel 1, el estándar más alto de seguridad en la industria de pagos. Los datos de tarjeta nunca pasan por nuestros servidores — son procesados directamente por Stripe con encriptación de extremo a extremo.' },
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
      { q: '¿Google Maps está integrado?', a: 'Sí. La tienda pública de tu restaurante muestra automáticamente un mapa de Google Maps con tu ubicación. Tus clientes pueden ver exactamente dónde estás y obtener direcciones. Solo necesitas configurar tu dirección en el dashboard.' },
      { q: '¿Cómo funcionan los códigos QR?', a: 'MENIUS genera códigos QR elegantes y de alta resolución para cada mesa, listos para imprimir. Incluyen el nombre de tu restaurante, el número de mesa, y un diseño premium. Los imprimes y los colocas en las mesas. Cuando el cliente escanea, ve tu menú con la mesa ya seleccionada.' },
      { q: '¿Qué es la Cocina KDS?', a: 'KDS (Kitchen Display System) es una pantalla dedicada para la cocina de tu restaurante. Muestra los pedidos en tiempo real con todos los detalles: productos, variantes, extras, notas del cliente, y datos de contacto. El equipo de cocina puede marcar pedidos como "preparando" y "listo" directamente desde la pantalla.' },
      { q: '¿Puedo usar MENIUS como app en mi celular?', a: 'Sí. MENIUS es una Progressive Web App (PWA). Puedes "instalarla" en tu celular desde el navegador sin pasar por la App Store ni Google Play. Funciona como una app nativa con acceso rápido desde tu pantalla de inicio.' },
      { q: '¿Puedo gestionar múltiples ubicaciones?', a: 'Sí. El Plan Business permite gestionar varias sucursales desde una sola cuenta. Cada ubicación tiene su propio menú, QR, configuración y pedidos, pero puedes supervisar todo desde un dashboard centralizado.' },
      { q: '¿Qué tecnologías usa MENIUS?', a: 'MENIUS está construido con tecnología de última generación: Next.js 14 (React) para el frontend, Supabase (PostgreSQL) para la base de datos con actualizaciones en tiempo real, Stripe para pagos seguros, Google Gemini para IA, Google Maps para ubicación, y Resend para emails transaccionales. Todo alojado en Vercel para máxima velocidad global.' },
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
      { q: 'What is MENIUS?', a: 'MENIUS is an all-in-one SaaS platform for restaurants: digital menu with QR, real-time orders, kitchen KDS, AI-powered assistant (MENIUS AI), advanced analytics, WhatsApp and email notifications, integrated Google Maps, Stripe payments, and more. All for a fixed monthly fee, with zero per-order commissions.' },
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
    ],
  },
  {
    id: 'pedidos',
    title: 'Orders & Operations',
    icon: '🛒',
    questions: [
      { q: 'How do I receive orders?', a: 'Orders arrive in real time to your dashboard with an alert sound. You see a Kanban board where you can manage orders: pending → preparing → ready → delivered. You can also receive notifications via WhatsApp and email on Pro and Business plans.' },
      { q: 'Does it work for dine-in, pickup, and delivery?', a: 'Yes. You decide which order types to enable from your dashboard. For dine-in, customers scan the table QR. For pickup, they use your direct link. For delivery, customers add their delivery address when placing the order.' },
      { q: 'Can customers track their order status?', a: 'Yes. After placing an order, the customer receives a real-time tracking page where they see the updated status: pending, preparing, ready, delivered. Updates are instant, without needing to reload the page.' },
      { q: 'Can I receive orders from multiple tables at the same time?', a: 'Yes. There\'s no limit on simultaneous orders. Each order is identified by table and arrives at your board in real time. Your team can manage dozens of orders at the same time without issues.' },
      { q: 'Can I pause order reception?', a: 'Yes. From the dashboard you can temporarily disable order reception (for example, when your kitchen is overwhelmed or outside business hours). Your customers will see a notice that the restaurant is not accepting orders at the moment.' },
      { q: 'Does the dashboard include analytics and reports?', a: 'Yes. The dashboard includes order metrics, best-selling products, revenue by period, peak hours, average ticket, and performance data. Plus, you can ask MENIUS AI directly: "How much did I sell this week?" and it responds with real data instantly.' },
      { q: 'What happens if there\'s a problem with an order?', a: 'From the dashboard you can see the complete details of each order, customer notes, and manually change the status. If you need to contact the customer, you can see their name and the information they provided when placing the order.' },
    ],
  },
  {
    id: 'precios',
    title: 'Pricing & Billing',
    icon: '💰',
    questions: [
      { q: 'Are there per-order commissions?', a: 'No. MENIUS does not charge any commission or percentage on each order or sale. You pay a fixed monthly fee based on your plan and that\'s it. 100% of what you sell is yours (minus the standard Stripe fee if you use online payments).' },
      { q: 'Can I try MENIUS before paying?', a: <>Yes. All plans include a 14-day free trial with access to all features. No credit card required to get started. You can also explore our <Link href="/demo" className={lnk}>live demos</Link> without creating an account.</> },
      { q: 'What happens after the 14-day trial?', a: 'When the trial ends, you choose the plan you prefer and continue without interruptions. If you don\'t choose a plan, your account is temporarily paused, but you never lose your data, menu, or settings. You can reactivate at any time.' },
      { q: 'What plans are available?', a: <>We offer three plans: Starter ($39/mo) with digital menu, elegant QR codes, MENIUS AI, Google Maps, and Google login; Pro ($79/mo) with delivery, WhatsApp, kitchen KDS, advanced analytics, and promotions; and Business ($149/mo) with everything unlimited, custom domain, and dedicated support. All with zero per-order commissions. <Link href="/#precios" className={lnk}>View plans and pricing →</Link></> },
      { q: 'Can I change plans at any time?', a: 'Yes. You can upgrade or downgrade your plan whenever you want from your dashboard. Changes apply immediately and billing is adjusted proportionally (prorated). No penalties or contracts.' },
      { q: 'How are subscription payments processed?', a: 'Payments are processed securely through Stripe, the payment platform used by companies like Google, Amazon, and Shopify. We accept all major credit and debit cards (Visa, Mastercard, American Express).' },
      { q: 'Can I cancel at any time?', a: 'Yes. There are no long-term contracts or cancellation penalties. You can cancel your subscription at any time from your dashboard or the Stripe billing portal. Your account will remain active until the end of the already-paid period.' },
    ],
  },
  {
    id: 'pagos-clientes',
    title: 'Customer Payments',
    icon: '💳',
    questions: [
      { q: 'Can my customers pay online?', a: 'Yes. You can enable online payments through Stripe. Your customers pay with credit or debit card directly from the menu. The money is automatically deposited into your bank account according to Stripe\'s schedule.' },
      { q: 'Can I also accept cash payments?', a: 'Yes. You can enable both options: cash payment and online payment. Your customers choose how they want to pay when placing their order. You decide which payment methods to offer based on your business needs.' },
      { q: 'Does Stripe charge a per-transaction fee?', a: 'Stripe charges its standard payment processing fee (generally 2.9% + $0.30 USD per transaction in the US, varies by country). This is Stripe\'s fee, not MENIUS\'s. MENIUS does not add any additional charges on transactions.' },
      { q: 'Is the payment process secure for my customers?', a: 'Absolutely. Stripe holds PCI DSS Level 1 certification, the highest security standard in the payments industry. Card data never passes through our servers — it\'s processed directly by Stripe with end-to-end encryption.' },
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
      { q: 'Is Google Maps integrated?', a: 'Yes. Your restaurant\'s public storefront automatically displays a Google Maps map with your location. Your customers can see exactly where you are and get directions. You just need to configure your address in the dashboard.' },
      { q: 'How do QR codes work?', a: 'MENIUS generates elegant, high-resolution QR codes for each table, ready to print. They include your restaurant name, table number, and a premium design. You print them and place them on tables. When the customer scans, they see your menu with the table already selected.' },
      { q: 'What is Kitchen KDS?', a: 'KDS (Kitchen Display System) is a dedicated screen for your restaurant\'s kitchen. It displays orders in real time with all details: products, variants, extras, customer notes, and contact information. The kitchen team can mark orders as "preparing" and "ready" directly from the screen.' },
      { q: 'Can I use MENIUS as an app on my phone?', a: 'Yes. MENIUS is a Progressive Web App (PWA). You can "install" it on your phone from the browser without going through the App Store or Google Play. It works like a native app with quick access from your home screen.' },
      { q: 'Can I manage multiple locations?', a: 'Yes. The Business Plan allows you to manage multiple branches from a single account. Each location has its own menu, QR codes, settings, and orders, but you can oversee everything from a centralized dashboard.' },
      { q: 'What technologies does MENIUS use?', a: 'MENIUS is built with cutting-edge technology: Next.js 14 (React) for the frontend, Supabase (PostgreSQL) for the database with real-time updates, Stripe for secure payments, Google Gemini for AI, Google Maps for location, and Resend for transactional emails. All hosted on Vercel for maximum global speed.' },
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
