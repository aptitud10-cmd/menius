export type DashboardLocale = 'es' | 'en';

export interface DashboardTranslations {
  // Nav
  nav_home: string;
  nav_orders: string;
  nav_kds: string;
  nav_categories: string;
  nav_products: string;
  nav_tables: string;
  nav_promotions: string;
  nav_staff: string;
  nav_analytics: string;
  nav_billing: string;
  nav_settings: string;
  nav_viewMenu: string;
  nav_logout: string;
  nav_menu: string;
  nav_restaurant: string;
  nav_business: string;

  // Home
  home_welcome: string;
  home_subtitle: string;
  home_viewMenu: string;
  home_share: string;
  home_todayOrders: string;
  home_todayRevenue: string;
  home_activeProducts: string;
  home_tables: string;

  // Orders
  orders_title: string;
  orders_pending: string;
  orders_confirmed: string;
  orders_preparing: string;
  orders_ready: string;
  orders_delivered: string;
  orders_cancelled: string;
  orders_noOrders: string;
  orders_confirm: string;
  orders_prepare: string;
  orders_markReady: string;
  orders_deliver: string;

  // KDS
  kds_title: string;
  kds_live: string;
  kds_fullscreen: string;
  kds_exit: string;
  kds_noActive: string;
  kds_activeOrders: string;

  // Settings
  settings_title: string;
  settings_save: string;
  settings_saving: string;
  settings_saved: string;
  settings_customDomain: string;
  settings_basicInfo: string;
  settings_schedule: string;
  settings_closed: string;
  settings_notifications: string;

  // General
  general_delete: string;
  general_cancel: string;
  general_edit: string;
  general_add: string;
  general_search: string;
  general_loading: string;
  general_error: string;
  general_success: string;
  general_trial: string;
  general_trialExpires: string;
  general_upgrade: string;
}

const es: DashboardTranslations = {
  nav_home: 'Inicio',
  nav_orders: 'Órdenes',
  nav_kds: 'Cocina (KDS)',
  nav_categories: 'Categorías',
  nav_products: 'Productos',
  nav_tables: 'Mesas & QRs',
  nav_promotions: 'Promociones',
  nav_staff: 'Equipo',
  nav_analytics: 'Analytics',
  nav_billing: 'Facturación',
  nav_settings: 'Configuración',
  nav_viewMenu: 'Ver menú público',
  nav_logout: 'Cerrar sesión',
  nav_menu: 'Menú',
  nav_restaurant: 'Restaurante',
  nav_business: 'Negocio',

  home_welcome: '¡Bienvenido!',
  home_subtitle: 'Aquí tienes un resumen de tu restaurante hoy.',
  home_viewMenu: 'Ver menú',
  home_share: 'Compartir',
  home_todayOrders: 'Pedidos hoy',
  home_todayRevenue: 'Venta hoy',
  home_activeProducts: 'Productos activos',
  home_tables: 'Mesas',

  orders_title: 'Órdenes',
  orders_pending: 'Pendiente',
  orders_confirmed: 'Confirmada',
  orders_preparing: 'Preparando',
  orders_ready: 'Lista',
  orders_delivered: 'Entregada',
  orders_cancelled: 'Cancelada',
  orders_noOrders: 'No hay órdenes aún',
  orders_confirm: 'Confirmar',
  orders_prepare: 'Preparar',
  orders_markReady: 'Listo',
  orders_deliver: 'Entregar',

  kds_title: 'Cocina (KDS)',
  kds_live: 'En vivo',
  kds_fullscreen: 'Pantalla completa',
  kds_exit: 'Salir',
  kds_noActive: 'Sin órdenes activas',
  kds_activeOrders: 'órdenes activas',

  settings_title: 'Configuración',
  settings_save: 'Guardar cambios',
  settings_saving: 'Guardando...',
  settings_saved: 'Guardado',
  settings_customDomain: 'Dominio personalizado',
  settings_basicInfo: 'Información básica',
  settings_schedule: 'Horario de operación',
  settings_closed: 'Cerrado',
  settings_notifications: 'Notificaciones',

  general_delete: 'Eliminar',
  general_cancel: 'Cancelar',
  general_edit: 'Editar',
  general_add: 'Agregar',
  general_search: 'Buscar...',
  general_loading: 'Cargando...',
  general_error: 'Error',
  general_success: 'Éxito',
  general_trial: 'Prueba gratuita',
  general_trialExpires: 'Tu prueba expira en',
  general_upgrade: 'Actualizar plan',
};

const en: DashboardTranslations = {
  nav_home: 'Home',
  nav_orders: 'Orders',
  nav_kds: 'Kitchen (KDS)',
  nav_categories: 'Categories',
  nav_products: 'Products',
  nav_tables: 'Tables & QRs',
  nav_promotions: 'Promotions',
  nav_staff: 'Team',
  nav_analytics: 'Analytics',
  nav_billing: 'Billing',
  nav_settings: 'Settings',
  nav_viewMenu: 'View public menu',
  nav_logout: 'Log out',
  nav_menu: 'Menu',
  nav_restaurant: 'Restaurant',
  nav_business: 'Business',

  home_welcome: 'Welcome!',
  home_subtitle: "Here's a summary of your restaurant today.",
  home_viewMenu: 'View menu',
  home_share: 'Share',
  home_todayOrders: 'Orders today',
  home_todayRevenue: 'Revenue today',
  home_activeProducts: 'Active products',
  home_tables: 'Tables',

  orders_title: 'Orders',
  orders_pending: 'Pending',
  orders_confirmed: 'Confirmed',
  orders_preparing: 'Preparing',
  orders_ready: 'Ready',
  orders_delivered: 'Delivered',
  orders_cancelled: 'Cancelled',
  orders_noOrders: 'No orders yet',
  orders_confirm: 'Confirm',
  orders_prepare: 'Prepare',
  orders_markReady: 'Ready',
  orders_deliver: 'Deliver',

  kds_title: 'Kitchen (KDS)',
  kds_live: 'Live',
  kds_fullscreen: 'Fullscreen',
  kds_exit: 'Exit',
  kds_noActive: 'No active orders',
  kds_activeOrders: 'active orders',

  settings_title: 'Settings',
  settings_save: 'Save changes',
  settings_saving: 'Saving...',
  settings_saved: 'Saved',
  settings_customDomain: 'Custom domain',
  settings_basicInfo: 'Basic information',
  settings_schedule: 'Operating hours',
  settings_closed: 'Closed',
  settings_notifications: 'Notifications',

  general_delete: 'Delete',
  general_cancel: 'Cancel',
  general_edit: 'Edit',
  general_add: 'Add',
  general_search: 'Search...',
  general_loading: 'Loading...',
  general_error: 'Error',
  general_success: 'Success',
  general_trial: 'Free trial',
  general_trialExpires: 'Your trial expires in',
  general_upgrade: 'Upgrade plan',
};

const dashboardTranslations: Record<DashboardLocale, DashboardTranslations> = { es, en };

export function getDashboardTranslations(locale: DashboardLocale): DashboardTranslations {
  return dashboardTranslations[locale] ?? dashboardTranslations.es;
}
