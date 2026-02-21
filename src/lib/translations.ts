// ============================================================
// MENIUS — UI Translations (es / en)
// Used by MenuShell to render in the restaurant's language
// ============================================================

export type Locale = 'es' | 'en';

export interface Translations {
  // Header & status
  open: string;
  closed: string;
  // Categories
  allCategories: string;
  // Product cards
  popular: string;
  addToCart: string;
  // Product modal
  variant: string;
  extras: string;
  specialNotes: string;
  specialNotesPlaceholder: string;
  add: string;
  // Cart
  yourCart: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  total: string;
  subtotal: string;
  discount: string;
  sendOrder: string;
  // Checkout
  checkout: string;
  yourName: string;
  yourNamePlaceholder: string;
  orderNotes: string;
  orderNotesPlaceholder: string;
  promoCode: string;
  promoCodePlaceholder: string;
  apply: string;
  confirmOrder: string;
  sending: string;
  backToCart: string;
  // Order confirmed
  orderSent: string;
  orderSentDesc: string;
  payNow: string;
  redirecting: string;
  trackOrder: string;
  backToMenu: string;
  // Reviews
  reviews: string;
  writeReview: string;
  beFirstReview: string;
  yourNameReview: string;
  whatDidYouThink: string;
  send: string;
  cancel: string;
  thankYouReview: string;
  addedToCart: string;
  // Bottom bar
  viewCart: string;
  items: string;
  // Info modal
  schedule: string;
  closedDay: string;
  noInfoAvailable: string;
  // Demo banner
  demoInteractive: string;
  wantThisForYours: string;
  createFree: string;
  // Footer
  poweredBy: string;
  createYourMenu: string;
  // Days
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  // Menu
  noProductsYet: string;
  customize: string;
  filterAll: string;
  filterPopular: string;
  filterWithOptions: string;
  // Search
  searchPlaceholder: string;
  noResults: string;
  // Order type
  orderType: string;
  dineIn: string;
  pickup: string;
  delivery: string;
  deliveryAddress: string;
  deliveryAddressPlaceholder: string;
  // Payment
  paymentMethod: string;
  payCash: string;
  payOnline: string;
  // Phone
  yourPhone: string;
  yourPhonePlaceholder: string;
  // Email
  yourEmail: string;
  yourEmailPlaceholder: string;
  // Cart panel
  myOrder: string;
  edit: string;
  clearCart: string;
  clearCartConfirm: string;
  // Order tracker
  backToMenuShort: string;
  optional: string;
  // Welcome screen
  welcomeTo: string;
  howToReceive: string;
  dineInDesc: string;
  pickupDesc: string;
  deliveryDesc: string;
}

const es: Translations = {
  open: 'Abierto',
  closed: 'Cerrado',
  allCategories: 'Todas',
  popular: 'Popular',
  addToCart: 'Agregar',
  variant: 'Variante',
  extras: 'Extras',
  specialNotes: 'Notas especiales',
  specialNotesPlaceholder: 'Notas especiales...',
  add: 'Agregar',
  yourCart: 'Tu carrito',
  cartEmpty: 'Tu carrito está vacío',
  cartEmptyDesc: 'Agrega productos del menú para comenzar tu pedido',
  total: 'Total',
  subtotal: 'Subtotal',
  discount: 'Descuento',
  sendOrder: 'Enviar pedido',
  checkout: 'Completar pedido',
  yourName: 'Tu nombre',
  yourNamePlaceholder: '¿Cómo te llamas?',
  orderNotes: 'Notas',
  orderNotesPlaceholder: 'Instrucciones especiales...',
  promoCode: 'Código de descuento',
  promoCodePlaceholder: 'Ej: BIENVENIDO20',
  apply: 'Aplicar',
  confirmOrder: 'Confirmar pedido',
  sending: 'Enviando...',
  backToCart: 'Volver al carrito',
  orderSent: '¡Pedido enviado!',
  orderSentDesc: 'Tu pedido está en camino a la cocina',
  payNow: 'Pagar ahora',
  redirecting: 'Redirigiendo...',
  trackOrder: 'Seguir mi pedido',
  backToMenu: 'Volver al menú',
  reviews: 'reseñas',
  writeReview: 'Escribir reseña',
  beFirstReview: 'Sé el primero en dejar una reseña',
  yourNameReview: 'Tu nombre',
  whatDidYouThink: '¿Qué te pareció?',
  send: 'Enviar',
  cancel: 'Cancelar',
  thankYouReview: '¡Gracias por tu reseña!',
  addedToCart: 'Agregado al carrito',
  viewCart: 'Ver carrito',
  items: 'items',
  schedule: 'Horario',
  closedDay: 'Cerrado',
  noInfoAvailable: 'No hay información adicional disponible',
  demoInteractive: 'Esto es un demo interactivo.',
  wantThisForYours: '¿Quieres esto para tu restaurante?',
  createFree: 'Crear gratis',
  poweredBy: 'Hecho con',
  createYourMenu: 'Crea tu menú digital gratis',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
  noProductsYet: 'Este menú aún no tiene productos',
  customize: 'Personalizar',
  filterAll: 'Todos',
  filterPopular: 'Populares',
  filterWithOptions: 'Con opciones',
  searchPlaceholder: 'Buscar platillos...',
  noResults: 'No se encontraron resultados',
  orderType: 'Tipo de orden',
  dineIn: 'En el restaurante',
  pickup: 'Para recoger',
  delivery: 'Delivery',
  deliveryAddress: 'Dirección de entrega',
  deliveryAddressPlaceholder: 'Calle, número, colonia...',
  paymentMethod: 'Método de pago',
  payCash: 'Pago en caja / efectivo',
  payOnline: 'Pagar en línea',
  yourPhone: 'Tu teléfono',
  yourPhonePlaceholder: 'Para confirmar por WhatsApp',
  yourEmail: 'Tu email',
  yourEmailPlaceholder: 'Para recibir confirmación',
  myOrder: 'Mi Pedido',
  edit: 'Editar',
  clearCart: 'Vaciar carrito',
  clearCartConfirm: '¿Vaciar todo?',
  backToMenuShort: 'Volver al menú',
  optional: 'opcional',
  welcomeTo: 'Bienvenido a',
  howToReceive: '¿Cómo deseas recibir tu pedido?',
  dineInDesc: 'Pide desde tu mesa',
  pickupDesc: 'Ordena y recoge en persona',
  deliveryDesc: 'Recibe en tu dirección',
};

const en: Translations = {
  open: 'Open',
  closed: 'Closed',
  allCategories: 'All',
  popular: 'Popular',
  addToCart: 'Add',
  variant: 'Size',
  extras: 'Add-ons',
  specialNotes: 'Special notes',
  specialNotesPlaceholder: 'Special instructions...',
  add: 'Add',
  yourCart: 'Your cart',
  cartEmpty: 'Your cart is empty',
  cartEmptyDesc: 'Browse the menu and add items to get started',
  total: 'Total',
  subtotal: 'Subtotal',
  discount: 'Discount',
  sendOrder: 'Place order',
  checkout: 'Complete order',
  yourName: 'Your name',
  yourNamePlaceholder: 'What\'s your name?',
  orderNotes: 'Notes',
  orderNotesPlaceholder: 'Special instructions...',
  promoCode: 'Promo code',
  promoCodePlaceholder: 'e.g. WELCOME20',
  apply: 'Apply',
  confirmOrder: 'Confirm order',
  sending: 'Sending...',
  backToCart: 'Back to cart',
  orderSent: 'Order placed!',
  orderSentDesc: 'Your order is on its way to the kitchen',
  payNow: 'Pay now',
  redirecting: 'Redirecting...',
  trackOrder: 'Track my order',
  backToMenu: 'Back to menu',
  reviews: 'reviews',
  writeReview: 'Write a review',
  beFirstReview: 'Be the first to leave a review',
  yourNameReview: 'Your name',
  whatDidYouThink: 'How was your experience?',
  send: 'Submit',
  cancel: 'Cancel',
  thankYouReview: 'Thank you for your review!',
  addedToCart: 'Added to cart',
  viewCart: 'View cart',
  items: 'items',
  schedule: 'Hours',
  closedDay: 'Closed',
  noInfoAvailable: 'No additional information available',
  demoInteractive: 'This is an interactive demo.',
  wantThisForYours: 'Want this for your restaurant?',
  createFree: 'Start free',
  poweredBy: 'Powered by',
  createYourMenu: 'Create your digital menu for free',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  noProductsYet: 'This menu has no products yet',
  customize: 'Customize',
  filterAll: 'All',
  filterPopular: 'Popular',
  filterWithOptions: 'With options',
  searchPlaceholder: 'Search dishes...',
  noResults: 'No results found',
  orderType: 'Order type',
  dineIn: 'Dine in',
  pickup: 'Pickup',
  delivery: 'Delivery',
  deliveryAddress: 'Delivery address',
  deliveryAddressPlaceholder: 'Street, number, apt...',
  paymentMethod: 'Payment method',
  payCash: 'Pay at counter / cash',
  payOnline: 'Pay online',
  yourPhone: 'Your phone',
  yourPhonePlaceholder: 'To confirm via WhatsApp',
  yourEmail: 'Your email',
  yourEmailPlaceholder: 'To receive confirmation',
  myOrder: 'My Order',
  edit: 'Edit',
  clearCart: 'Clear cart',
  clearCartConfirm: 'Clear all items?',
  backToMenuShort: 'Back to menu',
  optional: 'optional',
  welcomeTo: 'Welcome to',
  howToReceive: 'How would you like your order?',
  dineInDesc: 'Order from your table',
  pickupDesc: 'Order ahead and pick up',
  deliveryDesc: 'Get it delivered to you',
};

const translations: Record<Locale, Translations> = { es, en };

export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.es;
}
