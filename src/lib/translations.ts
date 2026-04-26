// ============================================================
// MENIUS — UI Translations (es / en)
// Used by MenuShell to render in the restaurant's language
// ============================================================

export type Locale = string;

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
  placeOrder: string;
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
  /** Long menus (e.g. store override): scroll to top */
  backToTop: string;
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
  // Cart — dynamic strings
  reorderLastOrder: string;
  tapToRemove: string;
  youMayAlsoLike: string;
  peopleAlsoOrder: string;
  freeDelivery: string;
  // Product sheet
  maxReached: string;
  added: string;
  updateItem: string;
  editItem: string;
  // Product card
  soldOut: string;
  unavailable: string;
  addedShort: string;
  // Favorites
  favoritesTitle: string;
  noFavoritesYet: string;
  noFavoritesHint: string;
  // Diet filter
  noDietMatch: string;
  viewFullMenu: string;
  // Reviews section
  customersTestimonial: string;
  // Restaurant info footer
  addressLabel: string;
  getDirections: string;
  open24h: string;
  phoneLabel: string;
  sendWhatsApp: string;
  // Catalog & search
  resultSingular: string;
  resultPlural: string;
  tryDifferentSearch: string;
  // Cart toasts
  addedCartSuffix: string;
  // Limits
  ordersLimitReached: string;
  // Popular section title
  popularItems: string;
  // Review page
  reviewSelectRating: string;
  reviewAnonymous: string;
  reviewError: string;
  reviewHelp: string;
  reviewAppreciate: string;
  reviewTapStar: string;
  reviewYourName: string;
  reviewAnonymousPlaceholder: string;
  reviewComments: string;
  reviewTellUs: string;
  reviewSubmitting: string;
  reviewSubmit: string;
  reviewThankYou: string;
  reviewThankYouHelp: string;
  reviewThankYouAppreciate: string;
  starLabel1: string;
  starLabel2: string;
  starLabel3: string;
  starLabel4: string;
  starLabel5: string;
  // Install banner (PWA)
  installApp: string;
  installQuickAccess: string;
  installClose: string;
  installInstalling: string;
  installAdd: string;
  installIosTitle: string;
  installIosThen: string;
  installIosAddToHome: string;
  // Menu update banner
  menuUpdated: string;
  menuReload: string;
  // Payment success / orden error page
  paymentReceived: string;
  paymentSuccess: string;
  paymentPreparing: string;
  paymentWhatsNext: string;
  paymentRestaurantReceived: string;
  paymentEmailConfirmation: string;
  paymentRetryView: string;
  paymentViewStatus: string;
  orderLoadError: string;
  orderLoadErrorDesc: string;
  tryAgain: string;
  // Order history
  myOrders: string;
  orderHistorySearch: string;
  orderHistoryDesc: string;
  orderInvalidEmail: string;
  orderConnectionError: string;
  orderNotFound: string;
  orderNotFoundDesc: string;
  orderMakeOrder: string;
  orderReordered: string;
  orderReorder: string;
  statusPending: string;
  statusConfirmed: string;
  statusPreparing: string;
  statusReady: string;
  statusDelivered: string;
  statusCancelled: string;
  // MenuShell
  browseCategoriesAriaLabel: string;
  skipToMenu: string;
  scrollLeftAriaLabel: string;
  scrollRightAriaLabel: string;
  youreAt: string;
  dismiss: string;
  tryDifferentKeyword: string;
  todayLabel: string;
  yesterdayLabel: string;
  daysAgoLabel: string;
  weeksAgoLabel: string;
  seeOnGoogleMaps: string;
  closeSearch: string;
  clearSearch: string;
  clearFilters: string;
  continueOrderItems: string;
  ordersPaused: string;
  changeLanguageAriaLabel: string;
  exploreMenu: string;
  itemsUpdatedAlert: string;
  // CheckoutPageClient — validation
  validationNameRequired: string;
  validationNameMinLength: string;
  validationPhoneRequired: string;
  validationPhoneInvalid: string;
  validationEmailRequired: string;
  validationEmailInvalid: string;
  validationAddressRequired: string;
  validationErrorPromo: string;
  validationNamePhoneRequired: string;
  validationEmailRequiredOrder: string;
  validationDeliveryAddressRequired: string;
  // CheckoutPageClient — network errors
  noConnectionRetry: string;
  noConnectionPayment: string;
  // CheckoutPageClient — notes prefix
  arrivesLabel: string;
  // CheckoutPageClient — demo/payment step
  securePayment: string;
  testModeDemo: string;
  orderSummaryLabel: string;
  nameOnCard: string;
  cardFullNamePlaceholder: string;
  cardInformation: string;
  processingLabel: string;
  payAmountPrefix: string;
  backToForm: string;
  secureEncryptedPayment: string;
  termsLabel: string;
  privacyLabel: string;
  // CheckoutPageClient — confirmation
  redirectingToTracking: string;
  estimatedDelivery: string;
  readyInApprox: string;
  payWithWompi: string;
  payWithMercadoPago: string;
  trackOrderLive: string;
  shareWithFriends: string;
  hungerModeMsg: string;
  // CheckoutPageClient — form header/sections
  payLabel: string;
  secureLabel: string;
  yourOrderSection: string;
  yourInfoSection: string;
  infoSaved: string;
  emailHint: string;
  includeUtensils: string;
  scheduleForLater: string;
  rememberMeLabel: string;
  paymentSection: string;
  // CheckoutPageClient — loyalty
  youHavePoints: string;
  ofDiscount: string;
  loyaltyApplied: string;
  redeemLabel: string;
  havePromoCode: string;
  applyingLabel: string;
  addTipQuestion: string;
  // CheckoutPageClient — CTA / footer
  retryingLabel: string;
  completeFormToContinue: string;
  placeOrderAriaLabel: string;
  retryLabel: string;
  // CheckoutPageClient — dine_in fields
  tableQuestion: string;
  arrivalTimeQuestion: string;
  tablePlaceholder: string;
  decreaseQuantity: string;
  increaseQuantity: string;
  // CheckoutPageClient — totals
  deliveryLabel: string;
  freeLabel: string;
  tipLabel: string;
  includedLabel: string;
  pointsLabel: string;
  // ReservationWidget
  reserveTable: string;
  reservationSubmitted: string;
  reservationConfirmDesc: string;
  reservationConnectionError: string;
  labelName: string;
  labelNamePlaceholder: string;
  labelGuests: string;
  labelDate: string;
  labelTime: string;
  labelTimeSelect: string;
  labelPhone: string;
  labelEmail: string;
  labelNotes: string;
  labelNotesPlaceholder: string;
  reservationSubmitting: string;
  reservationBookTable: string;
  // CartPanel — aria-labels
  closeCart: string;
  confirmRemove: string;
  removeItem: string;
  // DeliveryMap
  mapDeliveryAddress: string;
  mapRemaining: string;
  mapCalculating: string;
  mapDriverOnWay: (eta: number) => string;
  mapDriverLive: string;
  mapOpenInMaps: string;
  // ProductCardDesktop / ProductCardMobile — aria-labels & badges
  addToFavorites: string;
  removeFromFavorites: string;
  productNew: string;
  ariaCustomize: (name: string) => string;
  ariaAdd: (name: string) => string;
  // MenuHeaderMobile — aria-labels
  goBack: string;
  searchProducts: string;
  // RepeatOrderButton
  repeatLastOrder: string;
  repeatYourLastOrder: string;
  repeatOrderNumber: (n: string | number) => string;
  repeatSomeUnavailable: string;
  repeatPriceUpdated: string;
  repeatAddItemsToCart: (n: number) => string;
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
  placeOrder: 'Ordenar',
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
  items: 'artículos',
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
  backToTop: 'Volver arriba',
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
  reorderLastOrder: 'Repetir último pedido',
  tapToRemove: 'Toca − de nuevo para eliminar',
  youMayAlsoLike: 'También te puede gustar',
  peopleAlsoOrder: 'También piden con esto',
  freeDelivery: 'Gratis',
  maxReached: 'Máximo alcanzado',
  added: '✓ Agregado',
  updateItem: 'Actualizar',
  editItem: 'Editar producto',
  soldOut: 'Agotado',
  unavailable: 'No disponible',
  addedShort: 'Listo',
  favoritesTitle: 'Favoritos',
  noFavoritesYet: 'Aún no tienes favoritos',
  noFavoritesHint: 'Toca el ♥ en un producto para guardarlo',
  noDietMatch: 'No hay productos con esta dieta',
  viewFullMenu: 'Ver todo el menú',
  customersTestimonial: 'Lo que dicen nuestros clientes',
  addressLabel: 'Dirección',
  getDirections: 'Cómo llegar',
  open24h: 'Abierto 24 Horas',
  phoneLabel: 'Teléfono',
  sendWhatsApp: 'Enviar mensaje',
  resultSingular: 'resultado',
  resultPlural: 'resultados',
  tryDifferentSearch: 'Intenta con otro término',
  addedCartSuffix: 'se agregó al carrito',
  ordersLimitReached: 'No aceptamos pedidos por el momento. Vuelve mañana.',
  popularItems: 'Populares',
  reviewSelectRating: 'Por favor selecciona una calificación.',
  reviewAnonymous: 'Anónimo',
  reviewError: 'Algo salió mal. Intenta de nuevo.',
  reviewHelp: 'Tu reseña nos ayuda a mejorar.',
  reviewAppreciate: `Apreciamos tu opinión sobre`,
  reviewTapStar: 'Toca una estrella para calificar',
  reviewYourName: 'Tu nombre',
  reviewAnonymousPlaceholder: 'Anónimo',
  reviewComments: 'Comentarios (opcional)',
  reviewTellUs: 'Cuéntanos tu experiencia…',
  reviewSubmitting: 'Enviando…',
  reviewSubmit: 'Enviar reseña',
  reviewThankYou: '¡Gracias!',
  reviewThankYouHelp: 'Tu reseña nos ayuda a mejorar.',
  reviewThankYouAppreciate: 'Apreciamos tu opinión sobre',
  starLabel1: 'Muy malo',
  starLabel2: 'Malo',
  starLabel3: 'Regular',
  starLabel4: 'Bueno',
  starLabel5: '¡Excelente!',
  installApp: 'Instalar app de',
  installQuickAccess: 'Acceso rápido desde tu pantalla de inicio',
  installClose: 'Cerrar',
  installInstalling: 'Instalando…',
  installAdd: 'Agregar a pantalla de inicio',
  installIosTitle: 'Instala en tu iPhone',
  installIosThen: 'y luego',
  installIosAddToHome: '"Agregar a pantalla de inicio"',
  menuUpdated: 'Menú actualizado',
  menuReload: 'Actualizar',
  paymentReceived: '¡Pago recibido!',
  paymentSuccess: 'Tu pago fue procesado exitosamente.',
  paymentPreparing: 'El restaurante ha recibido tu pedido y lo está preparando.',
  paymentWhatsNext: '¿Qué sigue?',
  paymentRestaurantReceived: 'El restaurante recibió tu pedido',
  paymentEmailConfirmation: 'Si dejaste tu email, recibirás un comprobante',
  paymentRetryView: 'Puedes volver a intentar ver el estado de tu pedido',
  paymentViewStatus: 'Ver estado del pedido',
  orderLoadError: 'No se pudo cargar el pedido',
  orderLoadErrorDesc: 'Hubo un problema al cargar el estado de tu pedido. Por favor intenta de nuevo.',
  tryAgain: 'Intentar de nuevo',
  myOrders: 'Mis pedidos',
  orderHistorySearch: 'Consulta tu historial',
  orderHistoryDesc: 'Ingresa el email que usaste al hacer tu pedido y veremos tus órdenes anteriores.',
  orderInvalidEmail: 'Ingresa un email válido',
  orderConnectionError: 'Error de conexión. Intenta de nuevo.',
  orderNotFound: 'Sin pedidos encontrados',
  orderNotFoundDesc: 'No encontramos pedidos con ese email en',
  orderMakeOrder: 'Hacer un pedido',
  orderReordered: '¡Agregado!',
  orderReorder: 'Volver a pedir',
  statusPending: 'Pendiente',
  statusConfirmed: 'Confirmado',
  statusPreparing: 'Preparando',
  statusReady: 'Listo',
  statusDelivered: 'Entregado',
  statusCancelled: 'Cancelado',
  // MenuShell
  browseCategoriesAriaLabel: 'Ver categorías',
  skipToMenu: 'Ir al menú',
  scrollLeftAriaLabel: 'Desplazar izquierda',
  scrollRightAriaLabel: 'Desplazar derecha',
  youreAt: 'Estás en',
  dismiss: 'Cerrar',
  tryDifferentKeyword: 'Intenta con otra palabra o revisa la ortografía',
  todayLabel: 'Hoy',
  yesterdayLabel: 'Ayer',
  daysAgoLabel: 'Hace {n} días',
  weeksAgoLabel: 'Hace {n} sem',
  seeOnGoogleMaps: 'Ver en Google Maps',
  closeSearch: 'Cerrar búsqueda',
  clearSearch: 'Borrar búsqueda',
  clearFilters: 'Limpiar filtros',
  continueOrderItems: 'Continúa tu pedido ({n} items)',
  ordersPaused: 'Los pedidos están temporalmente pausados',
  changeLanguageAriaLabel: 'Cambiar idioma',
  exploreMenu: 'Explorar Menú',
  itemsUpdatedAlert: 'Algunos productos fueron actualizados — agrégalos nuevamente para elegir las opciones requeridas.',
  // CheckoutPageClient — validation
  validationNameRequired: 'El nombre es obligatorio',
  validationNameMinLength: 'Mínimo 2 caracteres',
  validationPhoneRequired: 'El teléfono es obligatorio',
  validationPhoneInvalid: 'Teléfono no válido',
  validationEmailRequired: 'El email es obligatorio para recibir tu confirmación',
  validationEmailInvalid: 'Email no válido',
  validationAddressRequired: 'La dirección es obligatoria para delivery',
  validationErrorPromo: 'Error validando código',
  validationNamePhoneRequired: 'Nombre y teléfono son requeridos',
  validationEmailRequiredOrder: 'Email requerido para recibir tu confirmación de pedido',
  validationDeliveryAddressRequired: 'Dirección de entrega requerida',
  // CheckoutPageClient — network errors
  noConnectionRetry: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  noConnectionPayment: 'Sin conexión al iniciar el pago. Revisa tu red e inténtalo.',
  // CheckoutPageClient — notes prefix
  arrivesLabel: 'Llega',
  // CheckoutPageClient — demo/payment step
  securePayment: 'Pago seguro',
  testModeDemo: '🧪 MODO DEMO — Sin cobro real. Datos pre-llenados.',
  orderSummaryLabel: 'Resumen del pedido',
  nameOnCard: 'Nombre en la tarjeta',
  cardFullNamePlaceholder: 'Nombre completo',
  cardInformation: 'Información de tarjeta',
  processingLabel: 'Procesando…',
  payAmountPrefix: 'Pagar',
  backToForm: 'Volver al formulario',
  secureEncryptedPayment: 'Pago seguro y cifrado',
  termsLabel: 'Términos',
  privacyLabel: 'Privacidad',
  // CheckoutPageClient — confirmation
  redirectingToTracking: 'Redirigiendo al seguimiento…',
  estimatedDelivery: 'Entrega estimada',
  readyInApprox: 'Listo en aprox.',
  payWithWompi: 'Pagar con Wompi',
  payWithMercadoPago: 'Pagar con MercadoPago',
  trackOrderLive: 'Seguir mi pedido en vivo',
  shareWithFriends: 'Compartir con amigos',
  hungerModeMsg: 'hambre mode: ON 😤🍽️\nPedí en *{name}* — ¿alguien más quiere algo?\n👇 Pide aquí: {url}',
  // CheckoutPageClient — form header/sections
  payLabel: 'Pagar',
  secureLabel: 'Seguro',
  yourOrderSection: '1 · Tu pedido',
  yourInfoSection: '2 · Tus datos',
  infoSaved: '👋 Datos guardados',
  emailHint: 'Te enviaremos la confirmación y actualizaciones de tu pedido.',
  includeUtensils: 'Incluir cubiertos y servilletas',
  scheduleForLater: 'Programar para después',
  rememberMeLabel: 'Recordar mis datos para la próxima vez',
  paymentSection: '3 · Forma de pago',
  // CheckoutPageClient — loyalty
  youHavePoints: 'Tienes {n} puntos',
  ofDiscount: 'de descuento',
  loyaltyApplied: '✓ Aplicado',
  redeemLabel: 'Canjear',
  havePromoCode: '¿Tienes un código de descuento?',
  applyingLabel: 'Aplicando…',
  addTipQuestion: '¿Deseas dejar propina?',
  // CheckoutPageClient — CTA / footer
  retryingLabel: 'Reintentando…',
  completeFormToContinue: 'Completa nombre, teléfono y email para continuar',
  placeOrderAriaLabel: 'Confirmar orden',
  retryLabel: 'Reintentar',
  // CheckoutPageClient — dine_in fields
  tableQuestion: '¿En qué mesa estás?',
  arrivalTimeQuestion: '¿A qué hora planeas llegar?',
  tablePlaceholder: 'Ej: Mesa 4, Terraza, Barra…',
  decreaseQuantity: 'Reducir cantidad',
  increaseQuantity: 'Aumentar cantidad',
  // CheckoutPageClient — totals
  deliveryLabel: 'Envío',
  freeLabel: 'Gratis',
  tipLabel: 'Propina',
  includedLabel: 'incluido',
  pointsLabel: 'Puntos',
  // ReservationWidget
  reserveTable: 'Reservar una mesa',
  reservationSubmitted: '¡Reservación enviada!',
  reservationConfirmDesc: 'Te confirmaremos pronto por teléfono o correo.',
  reservationConnectionError: 'Error de conexión. Intenta de nuevo.',
  labelName: 'Tu nombre *',
  labelNamePlaceholder: 'Nombre completo',
  labelGuests: 'Personas *',
  labelDate: 'Fecha *',
  labelTime: 'Hora *',
  labelTimeSelect: 'Seleccionar',
  labelPhone: 'Teléfono',
  labelEmail: 'Correo electrónico',
  labelNotes: 'Notas especiales (opcional)',
  labelNotesPlaceholder: 'Alergias, ocasiones especiales, preferencia de mesa...',
  reservationSubmitting: 'Enviando...',
  reservationBookTable: 'Reservar mesa',
  // CartPanel — aria-labels
  closeCart: 'Cerrar carrito',
  confirmRemove: 'Confirmar eliminar',
  removeItem: 'Eliminar',
  // DeliveryMap
  mapDeliveryAddress: 'Dirección de entrega',
  mapRemaining: 'restantes',
  mapCalculating: 'Calculando…',
  mapDriverOnWay: (eta: number) => `Repartidor en camino · ~${eta} min`,
  mapDriverLive: 'Repartidor en camino · ubicación en tiempo real',
  mapOpenInMaps: 'Abrir en Google Maps',
  // ProductCardDesktop / ProductCardMobile — aria-labels & badges
  addToFavorites: 'Agregar a favoritos',
  removeFromFavorites: 'Quitar de favoritos',
  productNew: 'NUEVO',
  ariaCustomize: (name: string) => `Personalizar ${name}`,
  ariaAdd: (name: string) => `Agregar ${name}`,
  goBack: 'Atrás',
  searchProducts: 'Buscar',
  repeatLastOrder: 'Pedir lo mismo',
  repeatYourLastOrder: 'Tu último pedido',
  repeatOrderNumber: (n) => `Pedido #${n}`,
  repeatSomeUnavailable: 'Algunos productos ya no están disponibles',
  repeatPriceUpdated: 'Precio actualizado',
  repeatAddItemsToCart: (n) => `Agregar ${n} productos al carrito`,
};

const en: Translations = {
  open: 'Open',
  closed: 'Closed',
  allCategories: 'All',
  popular: 'Popular',
  addToCart: 'Add',
  variant: 'Variant',
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
  placeOrder: 'Place order',
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
  backToTop: 'Back to top',
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
  reorderLastOrder: 'Reorder last order',
  tapToRemove: 'Tap − again to remove',
  youMayAlsoLike: 'You may also like',
  peopleAlsoOrder: 'People also order',
  freeDelivery: 'Free',
  maxReached: 'Max reached',
  added: '✓ Added',
  updateItem: 'Update',
  editItem: 'Edit item',
  soldOut: 'Sold out',
  unavailable: 'Unavailable',
  addedShort: 'Added',
  favoritesTitle: 'Favorites',
  noFavoritesYet: 'No favorites yet',
  noFavoritesHint: 'Tap ♥ on a product to save it',
  noDietMatch: 'No products match this diet',
  viewFullMenu: 'View full menu',
  customersTestimonial: 'What our customers say',
  addressLabel: 'Address',
  getDirections: 'Get directions',
  open24h: 'Open 24 hours',
  phoneLabel: 'Phone',
  sendWhatsApp: 'Send message',
  resultSingular: 'result',
  resultPlural: 'results',
  tryDifferentSearch: 'Try a different search term',
  addedCartSuffix: 'added to cart',
  ordersLimitReached: 'Not accepting orders right now. Come back tomorrow.',
  popularItems: 'Popular items',
  reviewSelectRating: 'Please select a rating.',
  reviewAnonymous: 'Anonymous',
  reviewError: 'Something went wrong. Please try again.',
  reviewHelp: 'Your review helps us improve.',
  reviewAppreciate: 'We appreciate your feedback for',
  reviewTapStar: 'Tap a star to rate',
  reviewYourName: 'Your name',
  reviewAnonymousPlaceholder: 'Anonymous',
  reviewComments: 'Comments (optional)',
  reviewTellUs: 'Tell us about your experience…',
  reviewSubmitting: 'Submitting…',
  reviewSubmit: 'Submit review',
  reviewThankYou: 'Thank you!',
  reviewThankYouHelp: 'Your review helps us improve.',
  reviewThankYouAppreciate: 'We appreciate your feedback for',
  starLabel1: 'Terrible',
  starLabel2: 'Bad',
  starLabel3: 'OK',
  starLabel4: 'Good',
  starLabel5: 'Excellent!',
  installApp: 'Install',
  installQuickAccess: 'Quick access from your home screen',
  installClose: 'Close',
  installInstalling: 'Installing…',
  installAdd: 'Add to home screen',
  installIosTitle: 'Install on your iPhone',
  installIosThen: 'then',
  installIosAddToHome: '"Add to Home Screen"',
  menuUpdated: 'Menu updated',
  menuReload: 'Reload',
  paymentReceived: 'Payment received!',
  paymentSuccess: 'Your payment was processed successfully.',
  paymentPreparing: 'The restaurant has received your order and is preparing it.',
  paymentWhatsNext: "What's next?",
  paymentRestaurantReceived: 'The restaurant received your order',
  paymentEmailConfirmation: 'If you left your email, you will receive a confirmation',
  paymentRetryView: 'You can retry viewing your order status below',
  paymentViewStatus: 'View order status',
  orderLoadError: 'Could not load your order',
  orderLoadErrorDesc: 'There was a problem loading your order status. Please try again.',
  tryAgain: 'Try again',
  myOrders: 'My orders',
  orderHistorySearch: 'Check your history',
  orderHistoryDesc: 'Enter the email you used when placing your order and we will show your previous orders.',
  orderInvalidEmail: 'Please enter a valid email',
  orderConnectionError: 'Connection error. Please try again.',
  orderNotFound: 'No orders found',
  orderNotFoundDesc: 'We could not find orders with that email at',
  orderMakeOrder: 'Place an order',
  orderReordered: 'Added!',
  orderReorder: 'Reorder',
  statusPending: 'Pending',
  statusConfirmed: 'Confirmed',
  statusPreparing: 'Preparing',
  statusReady: 'Ready',
  statusDelivered: 'Delivered',
  statusCancelled: 'Cancelled',
  // MenuShell
  browseCategoriesAriaLabel: 'Browse categories',
  skipToMenu: 'Skip to menu',
  scrollLeftAriaLabel: 'Scroll left',
  scrollRightAriaLabel: 'Scroll right',
  youreAt: `You're at`,
  dismiss: 'Dismiss',
  tryDifferentKeyword: 'Try a different keyword or check the spelling',
  todayLabel: 'Today',
  yesterdayLabel: 'Yesterday',
  daysAgoLabel: '{n} days ago',
  weeksAgoLabel: '{n}w ago',
  seeOnGoogleMaps: 'See on Google Maps',
  closeSearch: 'Close search',
  clearSearch: 'Clear search',
  clearFilters: 'Clear filters',
  continueOrderItems: 'Continue your order ({n} items)',
  ordersPaused: 'Orders are temporarily paused',
  changeLanguageAriaLabel: 'Change language',
  exploreMenu: 'Explore Menu',
  itemsUpdatedAlert: 'Some items were updated — please add them again to select the required options.',
  // CheckoutPageClient — validation
  validationNameRequired: 'Name is required',
  validationNameMinLength: 'Minimum 2 characters',
  validationPhoneRequired: 'Phone is required',
  validationPhoneInvalid: 'Invalid phone number',
  validationEmailRequired: 'Email is required to receive your confirmation',
  validationEmailInvalid: 'Invalid email',
  validationAddressRequired: 'Delivery address is required',
  validationErrorPromo: 'Error validating code',
  validationNamePhoneRequired: 'Name and phone required',
  validationEmailRequiredOrder: 'Email required to receive your order confirmation',
  validationDeliveryAddressRequired: 'Delivery address required',
  // CheckoutPageClient — network errors
  noConnectionRetry: 'No connection. Check your network and try again.',
  noConnectionPayment: 'Could not reach the server to start payment. Check your connection.',
  // CheckoutPageClient — notes prefix
  arrivesLabel: 'Arrives',
  // CheckoutPageClient — demo/payment step
  securePayment: 'Secure payment',
  testModeDemo: '🧪 TEST MODE — No real charge. Data pre-filled.',
  orderSummaryLabel: 'Order summary',
  nameOnCard: 'Name on card',
  cardFullNamePlaceholder: 'Full name',
  cardInformation: 'Card information',
  processingLabel: 'Processing…',
  payAmountPrefix: 'Pay',
  backToForm: 'Back to form',
  secureEncryptedPayment: 'Secure encrypted payment',
  termsLabel: 'Terms',
  privacyLabel: 'Privacy',
  // CheckoutPageClient — confirmation
  redirectingToTracking: 'Redirecting to tracking…',
  estimatedDelivery: 'Estimated delivery',
  readyInApprox: 'Ready in approx.',
  payWithWompi: 'Pay with Wompi',
  payWithMercadoPago: 'Pay with MercadoPago',
  trackOrderLive: 'Track my order live',
  shareWithFriends: 'Share with friends',
  hungerModeMsg: 'hunger mode: ON 😤🍽️\nJust ordered at *{name}* — anyone else want something?\n👇 Order here: {url}',
  // CheckoutPageClient — form header/sections
  payLabel: 'Pay',
  secureLabel: 'Secure',
  yourOrderSection: '1 · Your order',
  yourInfoSection: '2 · Your info',
  infoSaved: '👋 Info saved',
  emailHint: "We'll send you order confirmation and updates.",
  includeUtensils: 'Include utensils & napkins',
  scheduleForLater: 'Schedule for later',
  rememberMeLabel: 'Remember my info for next time',
  paymentSection: '3 · Payment',
  // CheckoutPageClient — loyalty
  youHavePoints: 'You have {n} points',
  ofDiscount: 'discount',
  loyaltyApplied: '✓ Applied',
  redeemLabel: 'Redeem',
  havePromoCode: 'Have a promo code?',
  applyingLabel: 'Applying…',
  addTipQuestion: 'Add a tip?',
  // CheckoutPageClient — CTA / footer
  retryingLabel: 'Retrying…',
  completeFormToContinue: 'Enter your name, phone and email to continue',
  placeOrderAriaLabel: 'Place order',
  retryLabel: 'Retry',
  // CheckoutPageClient — dine_in fields
  tableQuestion: 'Which table are you at?',
  arrivalTimeQuestion: 'What time do you plan to arrive?',
  tablePlaceholder: 'E.g. Table 4, Patio, Bar…',
  decreaseQuantity: 'Decrease quantity',
  increaseQuantity: 'Increase quantity',
  // CheckoutPageClient — totals
  deliveryLabel: 'Delivery',
  freeLabel: 'Free',
  tipLabel: 'Tip',
  includedLabel: 'included',
  pointsLabel: 'Points',
  // ReservationWidget
  reserveTable: 'Reserve a table',
  reservationSubmitted: 'Reservation submitted!',
  reservationConfirmDesc: "We'll confirm shortly by phone or email.",
  reservationConnectionError: 'Connection error. Please try again.',
  labelName: 'Your name *',
  labelNamePlaceholder: 'Full name',
  labelGuests: 'Guests *',
  labelDate: 'Date *',
  labelTime: 'Time *',
  labelTimeSelect: 'Select',
  labelPhone: 'Phone',
  labelEmail: 'Email',
  labelNotes: 'Special notes (optional)',
  labelNotesPlaceholder: 'Allergies, special occasions, seating preference...',
  reservationSubmitting: 'Submitting...',
  reservationBookTable: 'Book table',
  // CartPanel — aria-labels
  closeCart: 'Close cart',
  confirmRemove: 'Confirm remove',
  removeItem: 'Remove',
  // DeliveryMap
  mapDeliveryAddress: 'Delivery address',
  mapRemaining: 'away',
  mapCalculating: 'Calculating…',
  mapDriverOnWay: (eta: number) => `Driver on the way · ~${eta} min`,
  mapDriverLive: 'Driver on the way · live location',
  mapOpenInMaps: 'Open in Google Maps',
  // ProductCardDesktop / ProductCardMobile — aria-labels & badges
  addToFavorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
  productNew: 'NEW',
  ariaCustomize: (name: string) => `Customize ${name}`,
  ariaAdd: (name: string) => `Add ${name}`,
  goBack: 'Back',
  searchProducts: 'Search',
  repeatLastOrder: 'Repeat last order',
  repeatYourLastOrder: 'Your last order',
  repeatOrderNumber: (n) => `Order #${n}`,
  repeatSomeUnavailable: 'Some items are no longer available',
  repeatPriceUpdated: 'Price updated',
  repeatAddItemsToCart: (n) => `Add ${n} items to cart`,
};

const translations: Record<string, Translations> = { es, en };

export function getTranslations(locale: Locale): Translations {
  return translations[locale] ?? translations.es;
}
