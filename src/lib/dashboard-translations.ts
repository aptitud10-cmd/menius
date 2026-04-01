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
  nav_support: string;
  nav_logout: string;
  nav_menu: string;
  nav_restaurant: string;
  nav_business: string;
  nav_gallery: string;
  nav_customers: string;
  nav_reviews: string;
  nav_marketing: string;
  nav_dataPrivacy: string;
  nav_openMenu: string;
  nav_closeMenu: string;
  nav_counter: string;
  nav_inventory: string;
  nav_loyalty: string;
  nav_branches: string;

  // Counter / Caja
  counter_title: string;
  counter_pending: string;
  counter_inProgress: string;
  counter_newOrder: string;
  counter_newOrders: string;
  counter_noOrders: string;
  counter_noOrdersDesc: string;
  counter_selectOrder: string;
  counter_selectOrderDesc: string;
  counter_accept: string;
  counter_accepting: string;
  counter_reject: string;
  counter_rejecting: string;
  counter_preparing: string;
  counter_markReady: string;
  counter_deliver: string;
  counter_complete: string;
  counter_updating: string;
  counter_etaLabel: string;
  counter_orderItems: string;
  counter_customer: string;
  counter_phone: string;
  counter_email: string;
  counter_notes: string;
  counter_address: string;
  counter_agoMin: string;
  counter_poweredBy: string;
  counter_autoPrint: string;
  counter_sound: string;
  counter_notifWA: string;
  counter_notifSMS: string;
  counter_notifEmail: string;
  counter_delivery: string;
  counter_pickup: string;
  counter_dineIn: string;
  counter_cash: string;
  counter_online: string;
  counter_printBtn: string;
  counter_printing: string;
  counter_printed: string;
  counter_printerError: string;
  counter_printerRetry: string;

  // Counter Hub page
  counter_hub_subtitle: string;
  counter_hub_browserTitle: string;
  counter_hub_browserDesc: string;
  counter_hub_browserSpec1: string;
  counter_hub_browserSpec2: string;
  counter_hub_browserSpec3: string;
  counter_hub_openCounter: string;
  counter_hub_tabletMode: string;
  counter_hub_recommended: string;
  counter_hub_nativeTitle: string;
  counter_hub_nativeDesc: string;
  counter_hub_nativeSpec1: string;
  counter_hub_nativeSpec2: string;
  counter_hub_nativeSpec3: string;
  counter_hub_downloadApk: string;
  counter_hub_installTitle: string;
  counter_hub_installStep1: string;
  counter_hub_installStep2: string;
  counter_hub_installStep3: string;
  counter_hub_installStep4: string;
  counter_hub_hardwareTitle: string;
  counter_hub_tabletLabel: string;
  counter_hub_printerLabel: string;
  counter_hub_specOS: string;
  counter_hub_specOSValue: string;
  counter_hub_specScreen: string;
  counter_hub_specScreenValue: string;
  counter_hub_specRAM: string;
  counter_hub_specRAMValue: string;
  counter_hub_specType: string;
  counter_hub_specTypeValue: string;
  counter_hub_specPaper: string;
  counter_hub_specPaperValue: string;
  counter_hub_specConn: string;
  counter_hub_specConnValue: string;
  counter_hub_wifiLabel: string;
  counter_hub_wifiNote: string;

  // Home
  home_welcome: string;
  home_subtitle: string;
  home_viewMenu: string;
  home_share: string;
  home_todayOrders: string;
  home_todayRevenue: string;
  home_activeProducts: string;
  home_tables: string;
  home_salesToday: string;
  home_ordersToday: string;
  home_avgTicket: string;
  home_cancellations: string;
  home_vsYesterday: string;
  home_rate: string;
  home_pendingOrder: string;
  home_pendingOrders: string;
  home_clickToManage: string;
  home_lowStockProducts: string;
  home_lowStockSingular: string;
  home_checkInventory: string;
  home_outOfStock: string;
  home_units: string;
  home_recentOrders: string;
  home_viewAll: string;
  home_noOrdersYet: string;
  home_noOrdersDesc: string;
  home_noName: string;
  home_manageOrders: string;
  home_editMenu: string;
  home_tablesQR: string;
  home_trialEndsIn: string;
  home_trialDaysLeft: string;
  home_trialDay: string;
  home_trialDays: string;
  home_trialChoosePlan: string;
  home_trialEnjoy: string;
  home_trialDowngradeNote: string;
  home_viewPlans: string;
  home_dailyGoal: string;
  home_completed: string;
  home_setGoal: string;
  home_goalReached: string;
  home_sampleMenuCreated: string;
  home_restaurantReady: string;
  home_sampleMenuDesc: string;
  home_readyDesc: string;
  home_generating: string;
  home_loadSampleMenu: string;
  home_addManually: string;
  home_viewMyProducts: string;
  home_viewMyMenu: string;
  home_errorGenerating: string;
  home_copyLink: string;
  home_copied: string;
  home_moreOptions: string;

  // Analytics section
  analytics_title: string;
  analytics_last7days: string;
  analytics_revenue7d: string;
  analytics_orders7d: string;
  analytics_revenue: string;
  analytics_orders: string;
  analytics_orderType: string;
  analytics_noDataYet: string;
  analytics_dineIn: string;
  analytics_pickup: string;
  analytics_delivery: string;
  analytics_topProducts: string;
  analytics_peakHours: string;
  analytics_peak: string;

  // Notifications
  notif_enable: string;
  notif_enableDesc: string;
  notif_activate: string;
  notif_notNow: string;
  notif_mute: string;
  notif_unmute: string;
  notif_newOrder: string;
  notif_viewOrders: string;

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
  orders_dineIn: string;
  orders_pickup: string;
  orders_delivery: string;
  orders_cash: string;
  orders_paidOnline: string;
  orders_pendingPlural: string;
  orders_salesToday: string;
  orders_ordersToday: string;
  orders_searchPlaceholder: string;
  orders_today: string;
  orders_thisWeek: string;
  orders_thisMonth: string;
  orders_all: string;
  orders_allTypes: string;
  orders_kanban: string;
  orders_history: string;
  orders_emptyDesc: string;
  orders_noCompleted: string;
  orders_withFilter: string;
  orders_selected: string;
  orders_advanceStatus: string;
  orders_notify: string;
  orders_newOrder: string;
  orders_product: string;
  orders_less: string;
  orders_details: string;
  orders_print: string;
  orders_customer: string;
  orders_products: string;
  orders_variant: string;
  orders_customerNotes: string;
  orders_total: string;

  // KDS
  kds_title: string;
  kds_live: string;
  kds_fullscreen: string;
  kds_exit: string;
  kds_noActive: string;
  kds_activeOrders: string;
  kds_pending: string;
  kds_preparing: string;
  kds_ready: string;
  kds_empty: string;
  kds_emptyDesc: string;
  kds_start: string;
  kds_readyToServe: string;
  kds_ago: string;
  kds_time: string;
  kds_table: string;
  kds_customer: string;
  kds_notes: string;
  kds_accept: string;
  kds_prepare: string;
  kds_markReady: string;
  kds_deliver: string;
  kds_pickup: string;
  kds_delivery: string;
  kds_cash: string;
  kds_online: string;
  kds_spicy: string;
  kds_dairyFree: string;
  kds_autoConfirm: string;
  kds_autoPrint: string;
  kds_sound: string;
  kds_pause: string;
  kds_searchPlaceholder: string;
  kds_activeTab: string;
  kds_history: string;
  kds_all: string;
  kds_noHistory: string;
  kds_today: string;
  kds_orderSingular: string;
  kds_orderPlural: string;
  kds_avgTime: string;
  kds_searchKey: string;
  kds_queued: string;
  kds_undo: string;
  kds_pauseOrders: string;
  kds_30min: string;
  kds_1hour: string;
  kds_2hours: string;
  kds_new: string;
  kds_product: string;
  kds_less: string;
  kds_details: string;
  kds_delivered: string;
  kds_cancelled: string;
  kds_recover: string;
  kds_reprint: string;
  kds_collapse: string;
  kds_sendSms: string;
  kds_smsReadyLabel: string;
  kds_smsPreparingLabel: string;
  kds_smsDelayLabel: string;
  kds_smsArriveLabel: string;
  kds_smsThanksLabel: string;
  kds_customMsgPlaceholder: string;
  kds_customMsg: string;
  kds_send: string;
  kds_sendError: string;
  kds_connError: string;
  kds_msgSent: string;
  kds_msgsSent: string;
  kds_newOrderTitle: string;
  kds_newOrdersTitle: string;
  kds_tapToView: string;
  kds_busyMode: string;
  kds_busyModeDesc: string;
  kds_busyNormal: string;

  // Tables
  tables_newTable: string;
  tables_createNewTable: string;
  tables_nameRequired: string;
  tables_createTable: string;
  tables_placeholder: string;
  tables_available: string;
  tables_occupied: string;
  tables_reserved: string;
  tables_qrPerTable: string;
  tables_noTables: string;
  tables_noTablesDesc: string;
  tables_createFirst: string;
  tables_downloadQR: string;
  tables_print: string;
  tables_share: string;
  tables_copiedLink: string;
  tables_copy: string;
  tables_viewLink: string;
  tables_deleteTable: string;
  tables_deleteConfirm: string;
  tables_generalQR: string;
  tables_generalQRDesc: string;
  tables_shareWhatsApp: string;
  tables_openMenu: string;
  tables_scanToView: string;
  tables_orderFromPhone: string;
  tables_printAll: string;

  // Products
  products_new: string;
  products_photos: string;
  products_importAI: string;
  products_active: string;
  products_total: string;
  products_outOfStock: string;
  products_filters: string;
  products_category: string;
  products_status: string;
  products_stock: string;
  products_all: string;
  products_allFem: string;
  products_activeFilter: string;
  products_hidden: string;
  products_inStock: string;
  products_outOfStockFilter: string;
  products_clearFilters: string;
  products_selected: string;
  products_activate: string;
  products_deactivate: string;
  products_delete: string;
  products_noResults: string;
  products_noMatch: string;
  products_noProducts: string;
  products_noProductsDesc: string;
  products_createProduct: string;
  products_createCategoryFirst: string;
  products_needCategory: string;
  products_createCategory: string;
  products_product: string;
  products_price: string;
  products_options: string;
  products_activeStatus: string;
  products_hiddenStatus: string;
  products_outOfStockStatus: string;
  products_inStockStatus: string;
  products_markAvailable: string;
  products_markOutOfStock: string;
  products_duplicate: string;
  products_hide: string;
  products_show: string;
  products_deleteConfirm: string;
  products_deleteMultiConfirm: string;
  products_clickEditPrice: string;
  products_groups: string;
  products_copy: string;
  products_bulkAI: string;

  // Product Editor
  editor_back: string;
  editor_newProduct: string;
  editor_editProduct: string;
  editor_save: string;
  editor_saving: string;
  editor_saved: string;
  editor_create: string;
  editor_creating: string;
  editor_name: string;
  editor_namePlaceholder: string;
  editor_nameRequired: string;
  editor_description: string;
  editor_descPlaceholder: string;
  editor_price: string;
  editor_pricePlaceholder: string;
  editor_category: string;
  editor_selectCategory: string;
  editor_image: string;
  editor_uploadImage: string;
  editor_changeImage: string;
  editor_removeImage: string;
  editor_generateAI: string;
  editor_generatingAI: string;
  editor_fromGallery: string;
  editor_fromURL: string;
  editor_pasteURL: string;
  editor_apply: string;
  editor_visibility: string;
  editor_visible: string;
  editor_hiddenLabel: string;
  editor_stockLabel: string;
  editor_inStockLabel: string;
  editor_outOfStockLabel: string;
  editor_featured: string;
  editor_isNew: string;
  editor_dietaryTags: string;
  editor_translations: string;
  editor_deleteProduct: string;
  editor_deleteConfirm: string;
  editor_deleting: string;
  editor_modifierGroups: string;
  editor_legacyVariants: string;
  editor_legacyExtras: string;
  editor_legacyHint: string;
  editor_legacyDeleteConfirm: string;
  editor_basicInfo: string;
  editor_uploading: string;
  editor_productUpdated: string;
  editor_productCreated: string;
  editor_unexpectedError: string;
  editor_errorDeleting: string;
  editor_invalidURL: string;
  editor_onlyImages: string;
  editor_maxFileSize: string;
  editor_errorUploadingImage: string;
  editor_priceInvalid: string;
  editor_fileFormats: string;
  editor_errorGeneratingImage: string;
  editor_visibleInMenu: string;
  editor_categoryNote: string;
  editor_aiLabel: string;
  editor_translatedNamePlaceholder: string;
  editor_translatedDescPlaceholder: string;

  // Categories
  categories_title: string;
  categories_new: string;
  categories_namePlaceholder: string;
  categories_nameRequired: string;
  categories_create: string;
  categories_creating: string;
  categories_noCategories: string;
  categories_noCategoriesDesc: string;
  categories_createFirst: string;
  categories_deleteConfirm: string;
  categories_active: string;
  categories_hidden: string;
  categories_translate: string;
  categories_uploadImage: string;
  categories_translationName: string;
  categories_translationSave: string;

  // Modifier Groups
  modifiers_title: string;
  modifiers_newGroup: string;
  modifiers_noGroups: string;
  modifiers_noGroupsDesc: string;
  modifiers_type: string;
  modifiers_single: string;
  modifiers_singleDesc: string;
  modifiers_multi: string;
  modifiers_required: string;
  modifiers_min: string;
  modifiers_max: string;
  modifiers_creating: string;
  modifiers_createGroup: string;
  modifiers_options: string;
  modifiers_choose1Required: string;
  modifiers_choose1Optional: string;
  modifiers_chooseRange: string;
  modifiers_upTo: string;
  modifiers_base: string;
  modifiers_addOption: string;
  modifiers_optionPlaceholder: string;
  modifiers_deleteGroupConfirm: string;
  modifiers_save: string;
  modifiers_pickTemplate: string;
  modifiers_templateSize: string;
  modifiers_templateSizeDesc: string;
  modifiers_templateExtras: string;
  modifiers_templateExtrasDesc: string;
  modifiers_templatePrep: string;
  modifiers_templatePrepDesc: string;
  modifiers_templateSides: string;
  modifiers_templateSidesDesc: string;
  modifiers_templateCustom: string;
  modifiers_templateCustomDesc: string;
  modifiers_priceHint: string;
  modifiers_singleLabel: string;
  modifiers_multiLabel: string;
  modifiers_minHelper: string;
  modifiers_maxHelper: string;
  modifiers_displayList: string;
  modifiers_displayGrid: string;
  modifiers_displayHint: string;

  // AI Chat
  chat_title: string;
  chat_subtitle: string;
  chat_welcome: string;
  chat_welcomeDesc: string;
  chat_placeholder: string;
  chat_newConversation: string;
  chat_quickLabel: string;
  chat_disclaimer: string;
  chat_errorConnection: string;
  chat_errorLimit: string;
  chat_q1: string;
  chat_q2: string;
  chat_q3: string;
  chat_q4: string;
  chat_q5: string;
  chat_q6: string;
  chat_q7: string;
  chat_q8: string;

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
  settings_logo: string;
  settings_logoDesc: string;
  settings_changeLogo: string;
  settings_uploadLogo: string;
  settings_banner: string;
  settings_bannerDesc: string;
  settings_uploadBanner: string;
  settings_bannerRecommended: string;
  settings_change: string;
  settings_remove: string;
  settings_publicURL: string;
  settings_restaurantName: string;
  settings_phone: string;
  settings_description: string;
  settings_descPlaceholder: string;
  settings_address: string;
  settings_addressPlaceholder: string;
  settings_latitude: string;
  settings_longitude: string;
  settings_email: string;
  settings_website: string;
  settings_regional: string;
  settings_timezone: string;
  settings_currency: string;
  settings_mainLanguage: string;
  settings_mainLanguageDesc: string;
  settings_additionalLanguages: string;
  settings_additionalLanguagesDesc: string;
  settings_primary: string;
  settings_addLanguage: string;
  settings_addLanguageSelect: string;
  settings_languageSelectorNote: string;
  settings_orderTypes: string;
  settings_orderTypesDesc: string;
  settings_dineIn: string;
  settings_pickup: string;
  settings_delivery: string;
  settings_deliveryTime: string;
  settings_deliveryFee: string;
  settings_paymentMethods: string;
  settings_paymentMethodsDesc: string;
  settings_cash: string;
  settings_card: string;
  settings_onlinePayment: string;
  settings_stripeConnect: string;
  settings_stripeConnectDesc: string;
  settings_stripeConnected: string;
  settings_stripeNotConnected: string;
  settings_stripeConnect_btn: string;
  settings_stripeConnecting: string;
  settings_stripeDashboard: string;
  settings_notificationsTitle: string;
  settings_notificationsDesc: string;
  settings_enableNotifications: string;
  settings_whatsappNumber: string;
  settings_emailNotification: string;
  settings_scheduleTitle: string;
  settings_scheduleDesc: string;
  settings_onlyImages: string;
  settings_maxSize: string;
  settings_errorSaving: string;
  settings_days_monday: string;
  settings_days_tuesday: string;
  settings_days_wednesday: string;
  settings_days_thursday: string;
  settings_days_friday: string;
  settings_days_saturday: string;
  settings_days_sunday: string;
  settings_domainTitle: string;
  settings_domainDesc: string;
  settings_domainPlaceholder: string;
  settings_domainVerified: string;
  settings_domainPending: string;
  settings_domainInstructions: string;
  settings_domainCNAME: string;
  settings_uploadError: string;
  settings_bannerFormatNote: string;
  settings_generateBannerAI: string;
  settings_generatingBannerAI: string;
  settings_dineInDesc: string;
  settings_pickupDesc: string;
  settings_deliveryDesc: string;
  settings_deliveryFeeNote: string;
  settings_cashDesc: string;
  settings_onlinePaymentDesc: string;
  settings_stripeVerifying: string;
  settings_stripeReady: string;
  settings_stripePendingVerify: string;
  settings_stripeRedirecting: string;
  settings_stripeCompleteVerify: string;
  settings_timeTo: string;
  settings_openDay: string;
  settings_closeDay: string;
  settings_24h: string;
  settings_enabled: string;
  settings_disabled: string;
  settings_whatsappOrdersLabel: string;
  settings_whatsappOrdersDesc: string;
  settings_emailNotificationLabel: string;
  settings_emailNotificationDesc: string;
  settings_notificationsOffDesc: string;
  settings_unsavedChanges: string;
  settings_dnsRequired: string;
  settings_dnsType: string;
  settings_dnsName: string;
  settings_dnsValue: string;
  settings_dnsPropagation: string;
  settings_domainActive: string;
  settings_domainVerifyDNS: string;
  settings_domainVerifying: string;
  settings_domainNetworkError: string;
  settings_domain: string;

  // Onboarding
  onboarding_title: string;
  onboarding_stepsOf: string;
  onboarding_allComplete: string;
  onboarding_allCompleteDesc: string;
  onboarding_uploadLogo: string;
  onboarding_uploadLogoDesc: string;
  onboarding_completeProfile: string;
  onboarding_completeProfileDesc: string;
  onboarding_setSchedule: string;
  onboarding_setScheduleDesc: string;
  onboarding_customizeMenu: string;
  onboarding_customizeMenuDesc: string;
  onboarding_generateQR: string;
  onboarding_generateQRDesc: string;
  onboarding_firstOrder: string;
  onboarding_firstOrderDesc: string;
  onboarding_openCounter: string;
  onboarding_openCounterDesc: string;
  onboarding_configurePrinter: string;
  onboarding_configurePrinterDesc: string;
  onboarding_installPWA: string;
  onboarding_installPWADesc: string;

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
  general_save: string;
  general_close: string;
  general_confirm: string;
  general_back: string;
  general_next: string;
  general_yes: string;
  general_no: string;

  // Pages
  page_orders: string;
  page_tables: string;
  page_products: string;
  page_newProduct: string;
  page_editProduct: string;
  page_categories: string;
  page_analytics: string;
  page_billing: string;
  page_settings: string;
  page_settingsData: string;
  page_staff: string;
  page_customers: string;
  page_reviews: string;
  page_promotions: string;
  page_marketing: string;
  page_media: string;
  page_subscriptionExpired: string;
  page_verifyEmail: string;

  // Reviews
  reviews_average: string;
  reviews_total: string;
  reviews_visible: string;
  reviews_hidden: string;
  reviews_distribution: string;
  reviews_noReviews: string;
  reviews_noReviewsDesc: string;
  reviews_hideReview: string;
  reviews_showReview: string;

  // Customers
  customers_total: string;
  customers_avgSpend: string;
  customers_topCustomer: string;
  customers_lastOrder: string;
  customers_searchPlaceholder: string;
  customers_sortLastOrder: string;
  customers_sortMostSpent: string;
  customers_sortMostOrders: string;
  customers_sortNameAZ: string;
  customers_noName: string;
  customers_noResults: string;
  customers_empty: string;
  customers_customerSince: string;
  customers_close: string;
  customers_ordersLabel: string;
  customers_totalSpent: string;
  customers_avgTicket: string;
  customers_call: string;
  customers_tagsLabel: string;
  customers_tagsPlaceholder: string;
  customers_internalNotes: string;
  customers_notesPlaceholder: string;
  customers_saveNotesTags: string;
  customers_saving: string;
  customers_all: string;
  customers_paginationLabel: string;
  customers_previous: string;
  customers_next: string;
  customers_customerCol: string;
  customers_contactCol: string;
  customers_ordersCol: string;
  customers_totalSpentCol: string;
  customers_lastOrderCol: string;
  customers_tagsCol: string;

  // Media Gallery
  media_title: string;
  media_stored: string;
  media_imageSingular: string;
  media_imagesPlural: string;
  media_search: string;
  media_uploading: string;
  media_upload: string;
  media_errorLoading: string;
  media_onlyImages: string;
  media_maxSize: string;
  media_uploaded: string;
  media_deleted: string;
  media_urlCopied: string;
  media_copyFailed: string;
  media_noResults: string;
  media_noImages: string;
  media_tryOtherTerm: string;
  media_uploadFirst: string;
  media_deleteConfirm: string;
  media_errorDeleting: string;
  media_errorUploading: string;
  media_copyUrl: string;
  media_download: string;
  media_delete: string;

  // Marketing
  marketing_title: string;
  marketing_subtitle: string;
  marketing_tabEmail: string;
  marketing_tabSocial: string;
  marketing_tabSms: string;
  marketing_tabAutomations: string;

  // Email Campaigns
  email_totalCustomers: string;
  email_withEmail: string;
  email_reachable: string;
  email_willReceive: string;
  email_quickTemplates: string;
  email_generateAI: string;
  email_aiDesc: string;
  email_campaignType: string;
  email_extraInstructions: string;
  email_generateContent: string;
  email_generating: string;
  email_compose: string;
  email_audience: string;
  email_subject: string;
  email_message: string;
  email_buttonText: string;
  email_sending: string;
  email_sendCampaign: string;
  email_subjectRequired: string;
  email_errorSending: string;
  email_connectionError: string;
  email_errorGenerating: string;
  email_sentResult: string;
  email_failed: string;
  email_variablesHint: string;
  email_msgVariablesHint: string;
  email_typePromo: string;
  email_typeReactivation: string;
  email_typeNewProduct: string;
  email_typeVipThanks: string;
  email_typeSeasonal: string;
  email_filterAll: string;
  email_filterAllDesc: string;
  email_filterVip: string;
  email_filterVipDesc: string;
  email_filterInactive: string;
  email_filterInactiveDesc: string;
  email_filterRecent: string;
  email_filterRecentDesc: string;
  email_filterBigSpenders: string;
  email_filterBigSpendersDesc: string;
  email_tplPromo: string;
  email_tplMissYou: string;
  email_tplNewProduct: string;
  email_tplVipThanks: string;

  // SMS Campaigns
  sms_totalCustomers: string;
  sms_withPhone: string;
  sms_reachable: string;
  sms_willReceive: string;
  sms_serviceTitle: string;
  sms_serviceDesc: string;
  sms_quickTemplates: string;
  sms_generateAI: string;
  sms_generating: string;
  sms_compose: string;
  sms_audience: string;
  sms_message: string;
  sms_sending: string;
  sms_sendCampaign: string;
  sms_messageRequired: string;
  sms_errorSending: string;
  sms_connectionError: string;
  sms_errorGenerating: string;
  sms_sentResult: string;
  sms_variables: string;
  sms_filterAll: string;
  sms_filterAllDesc: string;
  sms_filterVip: string;
  sms_filterVipDesc: string;
  sms_filterInactive: string;
  sms_filterInactiveDesc: string;
  sms_filterRecent: string;
  sms_filterRecentDesc: string;
  sms_tplPromo: string;
  sms_tplMissYou: string;
  sms_tplNewDish: string;
  sms_tplThanks: string;

  // Social Media
  social_choosePlatform: string;
  social_generatePost: string;
  social_postType: string;
  social_extraInstructions: string;
  social_generateButton: string;
  social_generating: string;
  social_captionText: string;
  social_copyAll: string;
  social_copied: string;
  social_imageIdea: string;
  social_generateImage: string;
  social_generatingImage: string;
  social_downloadImage: string;
  social_imageError: string;
  social_bestTime: string;
  social_proTip: string;
  social_regenerate: string;
  social_typePromo: string;
  social_typeNewDish: string;
  social_typeDailySpecial: string;
  social_typeBehindScenes: string;
  social_typeCustomerReview: string;
  social_typeGeneral: string;
  social_typeEvent: string;
  social_typeStory: string;

  // Automations
  auto_active: string;
  auto_paused: string;
  auto_configuredMsg: string;
  auto_enableMsg: string;
  auto_restaurantToClient: string;
  auto_platformToOwner: string;
  auto_infoText: string;
  auto_statusActive: string;
  auto_statusInactive: string;
  auto_reasonNotifOff: string;
  auto_reasonNoEmail: string;
  auto_reasonNoWhatsApp: string;
  auto_reasonNoChannels: string;
  auto_orderConfirmTitle: string;
  auto_orderConfirmDesc: string;
  auto_orderConfirmTrigger: string;
  auto_orderStatusTitle: string;
  auto_orderStatusDesc: string;
  auto_orderStatusTrigger: string;
  auto_ownerAlertTitle: string;
  auto_ownerAlertDesc: string;
  auto_welcomeTitle: string;
  auto_welcomeDesc: string;
  auto_reactivationTitle: string;
  auto_reactivationDesc: string;
  auto_reviewRequestTitle: string;
  auto_reviewRequestDesc: string;
  auto_trialExpiringTitle: string;
  auto_trialExpiringDesc: string;
  auto_setupIncompleteTitle: string;
  auto_setupIncompleteDesc: string;
  auto_noOrdersTitle: string;
  auto_noOrdersDesc: string;
  auto_cronTrigger: string;
  auto_eachNewOrder: string;
  auto_statusChangeTrigger: string;

  // Trial Banner
  trial_endsToday: string;
  trial_daysOfTrial: string;
  trial_dayOfTrial: string;
  free_planBanner: string;
  free_planUpgrade: string;

  // Command Palette
  cmd_searchPlaceholder: string;
  cmd_noResults: string;
  cmd_navigate: string;
  cmd_go: string;
  cmd_closeKey: string;
  cmd_sectionNav: string;
  cmd_sectionActions: string;
  cmd_createProduct: string;
  cmd_createCategory: string;
  cmd_createTable: string;
  cmd_exportData: string;

  // Analytics (extended)
  analytics_subtitle: string;
  analytics_custom: string;
  analytics_start: string;
  analytics_end: string;
  analytics_loading: string;
  analytics_errorLoading: string;
  analytics_errorUnknown: string;
  analytics_noDataLoaded: string;
  analytics_retry: string;
  analytics_startBeforeEnd: string;
  analytics_income: string;
  analytics_ordersLabel: string;
  analytics_avgTicket: string;
  analytics_conversionRate: string;
  analytics_peakHourLabel: string;
  analytics_cancellationsLabel: string;
  analytics_discountsLabel: string;
  analytics_salesByDay: string;
  analytics_ordersLegend: string;
  analytics_noDataPeriod: string;
  analytics_hourlyDist: string;
  analytics_orderStatus: string;
  analytics_topProductsLabel: string;
  analytics_noDataShort: string;
  analytics_statusPending: string;
  analytics_statusConfirmed: string;
  analytics_statusPreparing: string;
  analytics_statusReady: string;
  analytics_statusDelivered: string;
  analytics_statusCompleted: string;
  analytics_statusCancelled: string;
  analytics_exportCsv: string;
  analytics_reportPdf: string;

  // Billing (extended)
  billing_title: string;
  billing_subtitle: string;
  billing_subscriptionActivated: string;
  billing_processCancelled: string;
  billing_noCheckout: string;
  billing_connectionError: string;
  billing_statusTrialing: string;
  billing_statusActive: string;
  billing_statusPastDue: string;
  billing_statusCanceled: string;
  billing_statusUnpaid: string;
  billing_statusIncomplete: string;
  billing_invPaid: string;
  billing_invOpen: string;
  billing_invUncollectible: string;
  billing_invVoid: string;
  billing_invDraft: string;
  billing_unlimited: string;
  billing_planLabel: string;
  billing_trialPeriod: string;
  billing_daysRemaining: string;
  billing_dayRemaining: string;
  billing_nextBilling: string;
  billing_cancelsAt: string;
  billing_cancelEnd: string;
  billing_trialDowngradeNote: string;
  billing_currentUsage: string;
  billing_productsLabel: string;
  billing_tablesLabel: string;
  billing_teamLabel: string;
  billing_paymentHistory: string;
  billing_viewAll: string;
  billing_invoice: string;
  billing_downloadPdf: string;
  billing_redirecting: string;
  billing_manageSubscription: string;
  billing_updatePayment: string;
  billing_subscribeNow: string;
  billing_upgradeTitle: string;
  billing_upgradeDesc: string;
  billing_freePlanLabel: string;
  billing_freePrice: string;
  billing_upgradeHeading: string;
  billing_upgradeHeadingDesc: string;
  billing_noSubscription: string;
  billing_choosePlan: string;
  billing_perMonth: string;
  billing_perYear: string;
  billing_monthEquiv: string;

  // Staff
  staff_title: string;
  staff_inviteMember: string;
  staff_fullName: string;
  staff_email: string;
  staff_role: string;
  staff_invite: string;
  staff_cancel: string;
  staff_noMembers: string;
  staff_noMembersDesc: string;
  staff_deleteConfirm: string;
  staff_toggleActivate: string;
  staff_toggleDeactivate: string;
  staff_changeRoleConfirm: string;
  staff_roleAdmin: string;
  staff_roleManager: string;
  staff_roleStaff: string;
  staff_roleKitchen: string;
  staff_statusPending: string;
  staff_statusActive: string;
  staff_statusInactive: string;

  // Promotions
  promo_title: string;
  promo_newPromotion: string;
  promo_code: string;
  promo_description: string;
  promo_discountType: string;
  promo_percentage: string;
  promo_fixedAmount: string;
  promo_value: string;
  promo_minOrder: string;
  promo_maxUses: string;
  promo_unlimited: string;
  promo_expiresAt: string;
  promo_createPromotion: string;
  promo_cancel: string;
  promo_noPromos: string;
  promo_noPromosDesc: string;
  promo_discount: string;
  promo_uses: string;
  promo_expires: string;
  promo_activate: string;
  promo_deactivate: string;
  promo_deleteConfirm: string;
  promo_errorSaving: string;

  // Data & Privacy
  data_title: string;
  data_subtitle: string;
  data_exportTitle: string;
  data_exportDesc: string;
  data_restaurantInfo: string;
  data_fullMenu: string;
  data_orderHistory: string;
  data_customerBase: string;
  data_subscriptionData: string;
  data_downloading: string;
  data_downloadJson: string;
  data_deleteTitle: string;
  data_deleteDesc: string;
  data_deleteButton: string;
  data_deleteConfirmText: string;
  data_deleting: string;
  data_confirmDeletion: string;
  data_cancelButton: string;
  data_gdprNote: string;
  data_privacyLink: string;
  data_errorExport: string;
  data_errorDelete: string;
  data_networkError: string;
  data_typeConfirm: string;

  // Subscription Expired
  expired_title: string;
  expired_desc: string;
  expired_errorPayment: string;
  expired_connectionError: string;
  expired_logout: string;

  // Verify Email
  verify_title: string;
  verify_desc: string;
  verify_sent: string;
  verify_resend: string;
  verify_resending: string;
  verify_logout: string;
}

const es: DashboardTranslations = {
  // Nav
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
  nav_support: 'Centro de ayuda',
  nav_logout: 'Cerrar sesión',
  nav_menu: 'Menú',
  nav_restaurant: 'Restaurante',
  nav_business: 'Negocio',
  nav_gallery: 'Galería',
  nav_customers: 'Clientes',
  nav_reviews: 'Reseñas',
  nav_marketing: 'Marketing',
  nav_dataPrivacy: 'Datos y Privacidad',
  nav_openMenu: 'Abrir menú',
  nav_closeMenu: 'Cerrar menú',
  nav_counter: 'Caja / Counter',
  nav_inventory: 'Inventario',
  nav_loyalty: 'Lealtad',
  nav_branches: 'Sucursales',

  // Counter / Caja
  counter_title: 'Vista de Caja',
  counter_pending: 'Pendiente',
  counter_inProgress: 'En proceso',
  counter_newOrder: 'NUEVA ORDEN',
  counter_newOrders: 'NUEVAS ÓRDENES',
  counter_noOrders: 'Sin órdenes pendientes',
  counter_noOrdersDesc: 'Las órdenes aparecen aquí en tiempo real',
  counter_selectOrder: 'Selecciona una orden',
  counter_selectOrderDesc: 'Toca una orden en el panel izquierdo para ver los detalles',
  counter_accept: 'ACEPTAR',
  counter_accepting: 'Aceptando...',
  counter_reject: 'RECHAZAR',
  counter_rejecting: 'Rechazando...',
  counter_preparing: 'EN PREPARACIÓN',
  counter_markReady: 'MARCAR LISTO',
  counter_deliver: 'ENTREGADO',
  counter_complete: 'Orden completada',
  counter_updating: 'Actualizando...',
  counter_etaLabel: 'Tiempo estimado',
  counter_orderItems: 'Artículos',
  counter_customer: 'Cliente',
  counter_phone: 'Teléfono',
  counter_email: 'Email',
  counter_notes: 'Notas',
  counter_address: 'Dirección de entrega',
  counter_agoMin: 'min',
  counter_poweredBy: 'Powered by MENIUS',
  counter_autoPrint: 'Auto-imprimir',
  counter_sound: 'Sonido',
  counter_notifWA: 'WhatsApp',
  counter_notifSMS: 'SMS',
  counter_notifEmail: 'Email',
  counter_delivery: 'Delivery',
  counter_pickup: 'Recoger',
  counter_dineIn: 'Mesa',
  counter_cash: 'Efectivo',
  counter_online: 'En línea',
  counter_printBtn: 'Imprimir orden',
  counter_printing: 'Imprimiendo…',
  counter_printed: 'Impreso',
  counter_printerError: 'Impresora no conectada',
  counter_printerRetry: 'Reintentar impresión',

  // Counter Hub page
  counter_hub_subtitle: 'Gestiona tus órdenes en tiempo real desde cualquier dispositivo',
  counter_hub_browserTitle: 'Counter en navegador',
  counter_hub_browserDesc: 'Funciona en cualquier celular, tablet o computadora con Chrome o Safari. Sin instalar nada.',
  counter_hub_browserSpec1: 'Cualquier dispositivo con navegador',
  counter_hub_browserSpec2: 'Impresión desde ajustes del navegador',
  counter_hub_browserSpec3: 'Actualización instantánea',
  counter_hub_openCounter: 'Abrir Counter',
  counter_hub_tabletMode: 'Modo tablet (pantalla completa)',
  counter_hub_recommended: 'Recomendado',
  counter_hub_nativeTitle: 'App nativa Android',
  counter_hub_nativeDesc: 'Instala la app en tu tablet Android. Más rápida, con notificaciones y soporte completo de impresora Bluetooth.',
  counter_hub_nativeSpec1: 'Notificaciones de nuevas órdenes',
  counter_hub_nativeSpec2: 'Impresora Bluetooth sin diálogo',
  counter_hub_nativeSpec3: 'Funciona sin abrir el navegador',
  counter_hub_downloadApk: 'Descargar APK (Android)',
  counter_hub_installTitle: 'Cómo instalar la app en la tablet',
  counter_hub_installStep1: 'En la tablet Android, abre Chrome y ve al link de descarga del APK.',
  counter_hub_installStep2: 'Si Android pregunta "¿Instalar de fuente desconocida?", acepta. Es seguro.',
  counter_hub_installStep3: 'Una vez instalada, abre la app MENIUS Counter.',
  counter_hub_installStep4: 'Inicia sesión con tu cuenta de MENIUS. La app se conecta automáticamente a tus órdenes.',
  counter_hub_hardwareTitle: 'Hardware recomendado',
  counter_hub_tabletLabel: 'Tablet',
  counter_hub_printerLabel: 'Impresora térmica',
  counter_hub_specOS: 'Sistema',
  counter_hub_specOSValue: 'Android 9 o superior',
  counter_hub_specScreen: 'Pantalla',
  counter_hub_specScreenValue: '10" o más (orientación horizontal)',
  counter_hub_specRAM: 'RAM',
  counter_hub_specRAMValue: '3 GB mínimo (4 GB recomendado)',
  counter_hub_specType: 'Tipo',
  counter_hub_specTypeValue: 'Térmica ESC/POS',
  counter_hub_specPaper: 'Papel',
  counter_hub_specPaperValue: '58 mm o 80 mm',
  counter_hub_specConn: 'Conexión',
  counter_hub_specConnValue: 'Bluetooth 4.0+ o WiFi',
  counter_hub_wifiLabel: 'Conexión a internet:',
  counter_hub_wifiNote: 'La tablet debe estar conectada a WiFi para recibir órdenes en tiempo real. Se recomienda WiFi de 2.4 GHz o 5 GHz estable en el área de caja.',

  // Home
  home_welcome: '¡Bienvenido!',
  home_subtitle: 'Aquí tienes un resumen de tu restaurante hoy.',
  home_viewMenu: 'Ver menú',
  home_share: 'Compartir',
  home_todayOrders: 'Pedidos hoy',
  home_todayRevenue: 'Venta hoy',
  home_activeProducts: 'Productos activos',
  home_tables: 'Mesas',
  home_salesToday: 'Ventas hoy',
  home_ordersToday: 'Órdenes hoy',
  home_avgTicket: 'Ticket promedio',
  home_cancellations: 'Cancelaciones',
  home_vsYesterday: 'vs ayer',
  home_rate: 'tasa',
  home_pendingOrder: 'orden pendiente',
  home_pendingOrders: 'órdenes pendientes',
  home_clickToManage: 'Haz clic para gestionarlas',
  home_lowStockProducts: 'productos con stock bajo',
  home_lowStockSingular: 'producto con stock bajo',
  home_checkInventory: 'Revisa el inventario',
  home_outOfStock: 'Agotado',
  home_units: 'uds',
  home_recentOrders: 'Últimas órdenes',
  home_viewAll: 'Ver todas',
  home_noOrdersYet: 'No hay órdenes aún',
  home_noOrdersDesc: 'Comparte tu menú QR para empezar a recibir pedidos',
  home_noName: 'Sin nombre',
  home_manageOrders: 'Gestionar órdenes',
  home_editMenu: 'Editar menú',
  home_tablesQR: 'Mesas y QR',
  home_trialEndsIn: '¡Tu prueba gratis termina en',
  home_trialDaysLeft: 'días restantes de prueba gratis',
  home_trialDay: 'día',
  home_trialDays: 'días',
  home_trialChoosePlan: 'Suscríbete ahora para conservar el acceso completo',
  home_trialEnjoy: 'Estás probando el plan Starter gratis. Al terminar, pasarás al plan Free sin cobros.',
  home_trialDowngradeNote: 'Sin suscripción, continuarás en el plan Free (gratis para siempre).',
  home_viewPlans: 'Ver planes',
  home_dailyGoal: 'Meta del día',
  home_completed: 'completado',
  home_setGoal: '+ Establecer meta',
  home_goalReached: '🎉 ¡Meta alcanzada!',
  home_sampleMenuCreated: '¡Menú de ejemplo creado!',
  home_restaurantReady: 'Tu restaurante está listo',
  home_sampleMenuDesc: 'Ya tienes categorías, productos y mesas de ejemplo. Edítalos desde tu dashboard.',
  home_readyDesc: 'Puedes agregar productos manualmente o cargar un menú de ejemplo para ver cómo funciona.',
  home_generating: 'Generando...',
  home_loadSampleMenu: 'Cargar menú de ejemplo',
  home_addManually: 'Agregar manualmente',
  home_viewMyProducts: 'Ver mis productos',
  home_viewMyMenu: 'Ver mi menú',
  home_errorGenerating: 'Error al generar datos de ejemplo',
  home_copyLink: 'Copiar link',
  home_copied: 'Copiado',
  home_moreOptions: 'Más opciones',

  // Analytics
  analytics_title: 'Analytics',
  analytics_last7days: 'Últimos 7 días',
  analytics_revenue7d: 'Ingresos en 7 días',
  analytics_orders7d: 'Órdenes en 7 días',
  analytics_revenue: 'Ingresos',
  analytics_orders: 'Órdenes',
  analytics_orderType: 'Tipo de orden',
  analytics_noDataYet: 'Sin datos aún',
  analytics_dineIn: 'En local',
  analytics_pickup: 'Para llevar',
  analytics_delivery: 'Delivery',
  analytics_topProducts: 'Productos populares',
  analytics_peakHours: 'Horarios pico',
  analytics_peak: 'Pico',

  // Notifications
  notif_enable: 'Activar notificaciones',
  notif_enableDesc: 'Recibe alertas cuando llegue un nuevo pedido.',
  notif_activate: 'Activar',
  notif_notNow: 'Ahora no',
  notif_mute: 'Silenciar notificaciones',
  notif_unmute: 'Activar sonido',
  notif_newOrder: 'Nueva orden',
  notif_viewOrders: 'Ver pedidos',

  // Orders
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
  orders_dineIn: 'En restaurante',
  orders_pickup: 'Para recoger',
  orders_delivery: 'Delivery',
  orders_cash: 'Efectivo',
  orders_paidOnline: 'Pagado online',
  orders_pendingPlural: 'Pendientes',
  orders_salesToday: 'Venta hoy',
  orders_ordersToday: 'Órdenes hoy',
  orders_searchPlaceholder: 'Buscar orden, cliente...',
  orders_today: 'Hoy',
  orders_thisWeek: '7 días',
  orders_thisMonth: '30 días',
  orders_all: 'Todo',
  orders_allTypes: 'Todos los tipos',
  orders_kanban: 'Kanban',
  orders_history: 'Historial',
  orders_emptyDesc: 'Comparte tu menú QR con tus clientes para empezar a recibir pedidos en tiempo real.',
  orders_noCompleted: 'No hay órdenes completadas',
  orders_withFilter: 'con ese filtro',
  orders_selected: 'seleccionadas',
  orders_advanceStatus: 'Avanzar estado',
  orders_notify: 'Notificar',
  orders_newOrder: 'Nueva orden',
  orders_product: 'Producto',
  orders_less: 'Menos',
  orders_details: 'Detalles',
  orders_print: 'Imprimir',
  orders_customer: 'Cliente',
  orders_products: 'Productos',
  orders_variant: 'Variante',
  orders_customerNotes: 'Notas del cliente',
  orders_total: 'Total',

  // KDS
  kds_title: 'Cocina (KDS)',
  kds_live: 'En vivo',
  kds_fullscreen: 'Pantalla completa',
  kds_exit: 'Salir',
  kds_noActive: 'Sin órdenes activas',
  kds_activeOrders: 'órdenes activas',
  kds_pending: 'Pendiente',
  kds_preparing: 'En preparación',
  kds_ready: 'Listo',
  kds_empty: 'No hay órdenes activas',
  kds_emptyDesc: 'Aparecen en tiempo real',
  kds_start: 'Iniciar',
  kds_readyToServe: 'Listo para entregar',
  kds_ago: 'hace',
  kds_time: 'Tiempo',
  kds_table: 'Mesa',
  kds_customer: 'Cliente',
  kds_notes: 'Notas',
  kds_accept: 'ACEPTAR',
  kds_prepare: 'PREPARAR',
  kds_markReady: 'LISTA',
  kds_deliver: 'ENTREGAR',
  kds_pickup: 'Pickup',
  kds_delivery: 'Delivery',
  kds_cash: 'Efectivo',
  kds_online: 'En línea',
  kds_spicy: 'PICANTE',
  kds_dairyFree: 'LÁCTEOS',
  kds_autoConfirm: 'Auto-confirmar',
  kds_autoPrint: 'Auto-imprimir',
  kds_sound: 'Sonido',
  kds_pause: 'Pausar',
  kds_searchPlaceholder: 'Buscar orden, cliente, teléfono...',
  kds_activeTab: 'Activas',
  kds_history: 'Historial',
  kds_all: 'Todos',
  kds_noHistory: 'Sin historial',
  kds_today: 'Hoy',
  kds_orderSingular: 'orden',
  kds_orderPlural: 'órdenes',
  kds_avgTime: 'Tiempo prom',
  kds_searchKey: 'Buscar',
  kds_queued: 'en cola',
  kds_undo: 'DESHACER',
  kds_pauseOrders: 'Pausar órdenes',
  kds_30min: '30 min',
  kds_1hour: '1 hora',
  kds_2hours: '2 horas',
  kds_new: 'Nueva',
  kds_product: 'Producto',
  kds_less: 'Menos',
  kds_details: 'Detalles',
  kds_delivered: 'Entregado',
  kds_cancelled: 'Cancelado',
  kds_recover: 'RECUPERAR',
  kds_reprint: 'Reimprimir',
  kds_collapse: 'Colapsar',
  kds_sendSms: 'Enviar SMS',
  kds_smsReadyLabel: '✅ Tu orden está lista',
  kds_smsPreparingLabel: '👨‍🍳 Estamos preparando',
  kds_smsDelayLabel: '⏰ Demora',
  kds_smsArriveLabel: '🏪 Ya puedes pasar',
  kds_smsThanksLabel: '🙏 Gracias',
  kds_customMsgPlaceholder: 'Escribe tu mensaje...',
  kds_customMsg: '✏️ Mensaje personalizado',
  kds_send: 'Enviar',
  kds_sendError: 'Error al enviar',
  kds_connError: 'Error de conexión',
  kds_msgSent: 'mensaje enviado',
  kds_msgsSent: 'mensajes enviados',
  kds_newOrderTitle: 'Nueva Orden',
  kds_newOrdersTitle: 'Nuevas Órdenes',
  kds_tapToView: 'Toca para ver →',
  kds_busyMode: 'Busy Mode',
  kds_busyModeDesc: 'Agrega minutos extra de preparación sin detener los pedidos.',
  kds_busyNormal: 'Normal (sin extra)',

  // Tables
  tables_newTable: 'Nueva mesa',
  tables_createNewTable: 'Crear nueva mesa',
  tables_nameRequired: 'Nombre requerido',
  tables_createTable: 'Crear mesa',
  tables_placeholder: 'Ej: Mesa 1, Barra 1, Terraza A',
  tables_available: 'Disponible',
  tables_occupied: 'Ocupada',
  tables_reserved: 'Reservada',
  tables_qrPerTable: 'QR por mesa (Dine-in)',
  tables_noTables: 'Sin mesas configuradas',
  tables_noTablesDesc: 'Crea mesas para generar códigos QR personalizados que tus clientes escanean para pedir.',
  tables_createFirst: 'Crear primera mesa',
  tables_downloadQR: 'Descargar QR',
  tables_print: 'Imprimir',
  tables_share: 'Compartir',
  tables_copiedLink: '¡Copiado!',
  tables_copy: 'Copiar',
  tables_viewLink: 'Ver enlace',
  tables_deleteTable: 'Eliminar mesa',
  tables_deleteConfirm: '¿Eliminar esta mesa?',
  tables_generalQR: 'QR General — Pickup & Delivery',
  tables_generalQRDesc: 'Comparte este QR en redes sociales, stickers, tarjetas, flyers',
  tables_shareWhatsApp: 'Compartir por WhatsApp',
  tables_openMenu: 'Abrir menú',
  tables_scanToView: 'Escanea el código para ver el menú',
  tables_orderFromPhone: 'Pide y paga desde tu celular',
  tables_printAll: 'Imprimir todas',

  // Products
  products_new: 'Nuevo producto',
  products_photos: 'Fotos',
  products_importAI: 'Importar menu con IA',
  products_active: 'activos',
  products_total: 'total',
  products_outOfStock: 'agotados',
  products_filters: 'Filtros',
  products_category: 'Categoría',
  products_status: 'Estado',
  products_stock: 'Stock',
  products_all: 'Todos',
  products_allFem: 'Todas',
  products_activeFilter: 'Activos',
  products_hidden: 'Ocultos',
  products_inStock: 'En stock',
  products_outOfStockFilter: 'Agotados',
  products_clearFilters: 'Limpiar filtros',
  products_selected: 'seleccionados',
  products_activate: 'Activar',
  products_deactivate: 'Desactivar',
  products_delete: 'Eliminar',
  products_noResults: 'Sin resultados',
  products_noMatch: 'No hay productos que coincidan con',
  products_noProducts: 'Sin productos',
  products_noProductsDesc: 'Crea tu primer producto para empezar.',
  products_createProduct: 'Crear producto',
  products_createCategoryFirst: 'Primero crea una categoría',
  products_needCategory: 'Necesitas al menos una categoría.',
  products_createCategory: 'Crear categoría',
  products_product: 'Producto',
  products_price: 'Precio',
  products_options: 'Opciones',
  products_activeStatus: 'Activo',
  products_hiddenStatus: 'Oculto',
  products_outOfStockStatus: 'Agotado',
  products_inStockStatus: 'En stock',
  products_markAvailable: 'Marcar disponible',
  products_markOutOfStock: 'Marcar agotado',
  products_duplicate: 'Duplicar',
  products_hide: 'Ocultar',
  products_show: 'Mostrar',
  products_deleteConfirm: '¿Eliminar este producto?',
  products_deleteMultiConfirm: '¿Eliminar {n} productos?',
  products_clickEditPrice: 'Click para editar precio',
  products_groups: 'grupos',
  products_copy: 'copia',
  products_bulkAI: 'Fotos con IA',

  // Product Editor
  editor_back: 'Volver',
  editor_newProduct: 'Nuevo producto',
  editor_editProduct: 'Editar producto',
  editor_save: 'Guardar',
  editor_saving: 'Guardando...',
  editor_saved: '¡Guardado!',
  editor_create: 'Crear producto',
  editor_creating: 'Creando...',
  editor_name: 'Nombre',
  editor_namePlaceholder: 'Ej: Hamburguesa clásica',
  editor_nameRequired: 'Ingresa el nombre del producto primero',
  editor_description: 'Descripción',
  editor_descPlaceholder: 'Describe tu producto...',
  editor_price: 'Precio',
  editor_pricePlaceholder: '0.00',
  editor_category: 'Categoría',
  editor_selectCategory: 'Selecciona una categoría',
  editor_image: 'Imagen',
  editor_uploadImage: 'Subir imagen',
  editor_changeImage: 'Cambiar imagen',
  editor_removeImage: 'Quitar imagen',
  editor_generateAI: 'Generar con IA',
  editor_generatingAI: 'Generando...',
  editor_fromGallery: 'De galería',
  editor_fromURL: 'Desde URL',
  editor_pasteURL: 'Pega la URL de la imagen',
  editor_apply: 'Aplicar',
  editor_visibility: 'Visibilidad',
  editor_visible: 'Visible',
  editor_hiddenLabel: 'Oculto',
  editor_stockLabel: 'Disponibilidad',
  editor_inStockLabel: 'En stock',
  editor_outOfStockLabel: 'Agotado',
  editor_featured: 'Destacado',
  editor_isNew: 'Nuevo',
  editor_dietaryTags: 'Etiquetas dietéticas',
  editor_translations: 'Traducciones',
  editor_deleteProduct: 'Eliminar producto',
  editor_deleteConfirm: '¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.',
  editor_deleting: 'Eliminando...',
  editor_modifierGroups: 'Grupos de opciones',
  editor_legacyVariants: 'Variantes existentes',
  editor_legacyExtras: 'Extras existentes',
  editor_legacyHint: 'Estas opciones fueron creadas con el sistema anterior. Puedes eliminarlas aquí.',
  editor_legacyDeleteConfirm: '¿Eliminar esta opción?',
  editor_basicInfo: 'Información básica',
  editor_uploading: 'Subiendo...',
  editor_productUpdated: 'Producto actualizado',
  editor_productCreated: 'Producto creado',
  editor_unexpectedError: 'Error inesperado',
  editor_errorDeleting: 'Error al eliminar',
  editor_invalidURL: 'URL inválida',
  editor_onlyImages: 'Solo imágenes',
  editor_maxFileSize: 'Máximo 5MB',
  editor_errorUploadingImage: 'Error subiendo imagen',
  editor_priceInvalid: 'Precio inválido',
  editor_fileFormats: 'PNG, JPG hasta 5MB',
  editor_errorGeneratingImage: 'Error generando imagen con IA',
  editor_visibleInMenu: 'Visible en menú',
  editor_categoryNote: 'Los productos de esta categoría aparecen bajo "{name}" en el menú.',
  editor_aiLabel: 'IA',
  editor_translatedNamePlaceholder: 'Nombre traducido...',
  editor_translatedDescPlaceholder: 'Descripción traducida...',

  // Categories
  categories_title: 'Categorías',
  categories_new: 'Nueva categoría',
  categories_namePlaceholder: 'Nombre de la categoría',
  categories_nameRequired: 'Nombre requerido',
  categories_create: 'Crear',
  categories_creating: 'Creando...',
  categories_noCategories: 'Sin categorías',
  categories_noCategoriesDesc: 'Crea categorías para organizar tu menú.',
  categories_createFirst: 'Crear primera categoría',
  categories_deleteConfirm: '¿Eliminar esta categoría? Se eliminarán también todos los productos asociados.',
  categories_active: 'Activa',
  categories_hidden: 'Oculta',
  categories_translate: 'Traducir',
  categories_uploadImage: 'Subir imagen',
  categories_translationName: 'Nombre traducido',
  categories_translationSave: 'Guardar traducción',

  // Modifier Groups
  modifiers_title: 'Extras y Opciones',
  modifiers_newGroup: 'Nuevo grupo',
  modifiers_noGroups: 'Sin grupos de opciones',
  modifiers_noGroupsDesc: 'Agrega opciones como Tamaño, Extras, Salsas...',
  modifiers_type: '¿Cuántas puede elegir?',
  modifiers_single: 'El cliente escoge UNA',
  modifiers_singleDesc: 'Escoge UNA',
  modifiers_multi: 'El cliente escoge VARIAS',
  modifiers_required: 'Obligatorio',
  modifiers_min: 'Mínimo a elegir',
  modifiers_max: 'Máximo a elegir',
  modifiers_creating: 'Creando...',
  modifiers_createGroup: 'Crear grupo',
  modifiers_options: 'opciones',
  modifiers_choose1Required: 'Elige 1 (requerido)',
  modifiers_choose1Optional: 'Elige 1 (opcional)',
  modifiers_chooseRange: 'Elige {min}-{max} (requerido)',
  modifiers_upTo: 'Hasta {max} (opcional)',
  modifiers_base: 'Incluido',
  modifiers_addOption: 'Agregar opción',
  modifiers_optionPlaceholder: 'Ej: Grande, Queso extra...',
  modifiers_deleteGroupConfirm: 'Eliminar este grupo y todas sus opciones?',
  modifiers_save: 'Guardar',
  modifiers_pickTemplate: 'Escoge una plantilla para comenzar rápido:',
  modifiers_templateSize: 'Tamaño',
  modifiers_templateSizeDesc: 'Pequeño, Mediano, Grande',
  modifiers_templateExtras: 'Extras / Toppings',
  modifiers_templateExtrasDesc: 'Tocino, Queso, Aguacate',
  modifiers_templatePrep: 'Preparación',
  modifiers_templatePrepDesc: 'Término medio, Bien cocido',
  modifiers_templateSides: 'Acompañamiento',
  modifiers_templateSidesDesc: 'Papas, Ensalada, Arroz',
  modifiers_templateCustom: 'Personalizado',
  modifiers_templateCustomDesc: 'Crear desde cero',
  modifiers_priceHint: '$0.00 = incluido',
  modifiers_singleLabel: 'El cliente escoge UNA',
  modifiers_multiLabel: 'El cliente escoge VARIAS',
  modifiers_minHelper: 'Mínimo a elegir',
  modifiers_maxHelper: 'Máximo a elegir',
  modifiers_displayList: 'Lista',
  modifiers_displayGrid: 'Cuadrícula',
  modifiers_displayHint: 'Recomendado para nombres cortos',

  // AI Chat
  chat_title: 'MENIUS AI',
  chat_subtitle: 'Tu asistente inteligente',
  chat_welcome: '¡Hola! Soy MENIUS AI',
  chat_welcomeDesc: 'Tu socio de negocio y chef consultor. Pregúntame sobre ventas, clientes, recetas, estrategias o cómo usar el dashboard.',
  chat_placeholder: 'Pregúntame lo que quieras...',
  chat_newConversation: 'Nueva conversación',
  chat_quickLabel: 'Preguntas rápidas',
  chat_disclaimer: 'MENIUS AI puede cometer errores. Verifica la información importante.',
  chat_errorConnection: 'Error de conexión. Intenta de nuevo.',
  chat_errorLimit: 'Has alcanzado el límite de mensajes. Intenta en unos minutos.',
  chat_q1: '¿Cómo va mi día?',
  chat_q2: '¿Qué puedo mejorar?',
  chat_q3: 'Sugiéreme una promoción',
  chat_q4: '¿Cómo agrego un producto?',
  chat_q5: '¿Quiénes son mis mejores clientes?',
  chat_q6: 'Ideas de marketing para mi restaurante',
  chat_q7: '¿Cómo configuro el delivery?',
  chat_q8: 'Ayuda con un problema técnico',

  // Settings
  settings_title: 'Configuración',
  settings_save: 'Guardar cambios',
  settings_saving: 'Guardando...',
  settings_saved: 'Guardado',
  settings_customDomain: 'Dominio personalizado',
  settings_basicInfo: 'Información básica',
  settings_schedule: 'Horario de operación',
  settings_closed: 'Cerrado',
  settings_notifications: 'Notificaciones',
  settings_logo: 'Logo del restaurante',
  settings_logoDesc: 'Se muestra en el encabezado de tu menú público.',
  settings_changeLogo: 'Cambiar logo',
  settings_uploadLogo: 'Subir logo',
  settings_banner: 'Banner del menú',
  settings_bannerDesc: 'Imagen de portada que aparece en la parte superior de tu menú público.',
  settings_uploadBanner: 'Subir banner',
  settings_bannerRecommended: '1200 x 400px recomendado',
  settings_change: 'Cambiar',
  settings_remove: 'Eliminar',
  settings_publicURL: 'Enlace público del menú',
  settings_restaurantName: 'Nombre del restaurante',
  settings_phone: 'Teléfono',
  settings_description: 'Descripción',
  settings_descPlaceholder: 'Describe tu restaurante...',
  settings_address: 'Dirección',
  settings_addressPlaceholder: 'Buscar dirección...',
  settings_latitude: 'Latitud',
  settings_longitude: 'Longitud',
  settings_email: 'Email',
  settings_website: 'Sitio web',
  settings_regional: 'Regional',
  settings_timezone: 'Zona horaria',
  settings_currency: 'Moneda',
  settings_mainLanguage: 'Idioma principal',
  settings_mainLanguageDesc: 'El idioma base de tus productos y categorías.',
  settings_additionalLanguages: 'Idiomas adicionales',
  settings_additionalLanguagesDesc: 'Agrega idiomas para que tus clientes puedan ver el menú en su idioma.',
  settings_primary: 'principal',
  settings_addLanguage: 'Agregar',
  settings_addLanguageSelect: 'Agregar idioma...',
  settings_languageSelectorNote: 'Tus clientes verán un selector de idioma en el menú. Ve a Menú → Productos para agregar traducciones.',
  settings_orderTypes: 'Tipos de orden',
  settings_orderTypesDesc: 'Selecciona los tipos de orden que aceptas.',
  settings_dineIn: 'En local',
  settings_pickup: 'Para llevar',
  settings_delivery: 'Delivery',
  settings_deliveryTime: 'Tiempo estimado de entrega (min)',
  settings_deliveryFee: 'Costo de envío',
  settings_paymentMethods: 'Métodos de pago',
  settings_paymentMethodsDesc: 'Selecciona los métodos de pago que aceptas.',
  settings_cash: 'Efectivo',
  settings_card: 'Tarjeta',
  settings_onlinePayment: 'Pago en línea',
  settings_stripeConnect: 'Stripe Connect',
  settings_stripeConnectDesc: 'Conecta tu cuenta de Stripe para aceptar pagos en línea.',
  settings_stripeConnected: 'Conectado',
  settings_stripeNotConnected: 'No conectado',
  settings_stripeConnect_btn: 'Conectar Stripe',
  settings_stripeConnecting: 'Conectando...',
  settings_stripeDashboard: 'Dashboard de Stripe',
  settings_notificationsTitle: 'Notificaciones',
  settings_notificationsDesc: 'Recibe notificaciones cuando tengas nuevos pedidos.',
  settings_enableNotifications: 'Activar notificaciones',
  settings_whatsappNumber: 'Número de WhatsApp',
  settings_emailNotification: 'Email de notificación',
  settings_scheduleTitle: 'Horario de operación',
  settings_scheduleDesc: 'Configura el horario en que tu restaurante está abierto.',
  settings_onlyImages: 'Solo se permiten imágenes',
  settings_maxSize: 'Máximo 10MB',
  settings_errorSaving: 'Error al guardar',
  settings_days_monday: 'Lunes',
  settings_days_tuesday: 'Martes',
  settings_days_wednesday: 'Miércoles',
  settings_days_thursday: 'Jueves',
  settings_days_friday: 'Viernes',
  settings_days_saturday: 'Sábado',
  settings_days_sunday: 'Domingo',
  settings_domainTitle: 'Dominio personalizado',
  settings_domainDesc: 'Conecta tu propio dominio para tu menú público.',
  settings_domainPlaceholder: 'menu.turestaurante.com',
  settings_domainVerified: 'Verificado',
  settings_domainPending: 'Pendiente de verificación',
  settings_domainInstructions: 'Agrega un registro CNAME apuntando a:',
  settings_domainCNAME: 'cname.menius.app',
  settings_uploadError: 'Error subiendo imagen',
  settings_bannerFormatNote: 'Medida ideal: 1200 x 400px (3:1). JPG, PNG o WebP, máximo 10MB.',
  settings_generateBannerAI: 'Generar con IA',
  settings_generatingBannerAI: 'Generando...',
  settings_dineInDesc: 'El cliente ordena y come en tu restaurante',
  settings_pickupDesc: 'El cliente ordena y pasa a recoger',
  settings_deliveryDesc: 'El cliente pone su dirección y tú le envías el pedido',
  settings_deliveryFeeNote: 'Se muestra a tus clientes antes de confirmar el pedido. Deja en 0 para envío gratis.',
  settings_cashDesc: 'El cliente paga al recibir su pedido o en caja',
  settings_onlinePaymentDesc: 'El cliente paga con tarjeta al ordenar (requiere Stripe Connect)',
  settings_stripeVerifying: 'Verificando...',
  settings_stripeReady: 'Conectado — Listo para recibir pagos',
  settings_stripePendingVerify: 'Cuenta creada — Completa la verificación',
  settings_stripeRedirecting: 'Redirigiendo...',
  settings_stripeCompleteVerify: 'Completar verificación',
  settings_timeTo: 'a',
  settings_openDay: 'Abrir',
  settings_closeDay: 'Cerrar',
  settings_24h: '24 horas',
  settings_enabled: 'Activado',
  settings_disabled: 'Desactivado',
  settings_whatsappOrdersLabel: 'WhatsApp para nuevas órdenes',
  settings_whatsappOrdersDesc: 'Recibirás un mensaje de WhatsApp cada vez que llegue una nueva orden.',
  settings_emailNotificationLabel: 'Email para notificaciones del negocio',
  settings_emailNotificationDesc: 'Los clientes que dejen su email recibirán confirmaciones y actualizaciones de su pedido.',
  settings_notificationsOffDesc: 'Las notificaciones están desactivadas. Actívalas para recibir alertas de nuevas órdenes.',
  settings_unsavedChanges: 'Cambios sin guardar',
  settings_dnsRequired: 'Configuración DNS requerida:',
  settings_dnsType: 'Tipo',
  settings_dnsName: 'Nombre',
  settings_dnsValue: 'Valor',
  settings_dnsPropagation: 'Agrega este registro CNAME en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.). La propagación puede tardar hasta 48 horas.',
  settings_domainActive: 'Dominio verificado y activo',
  settings_domainVerifyDNS: 'Verificar DNS',
  settings_domainVerifying: 'Verificando...',
  settings_domainNetworkError: 'Error de red. Intenta de nuevo.',
  settings_domain: 'Dominio',

  // Onboarding
  onboarding_title: 'Configura tu restaurante',
  onboarding_stepsOf: 'de',
  onboarding_allComplete: '¡Tu restaurante está listo!',
  onboarding_allCompleteDesc: 'Has completado todos los pasos. Tu menú digital está funcionando.',
  onboarding_uploadLogo: 'Sube el logo de tu restaurante',
  onboarding_uploadLogoDesc: 'Dale identidad visual a tu menú digital',
  onboarding_completeProfile: 'Completa tu perfil',
  onboarding_completeProfileDesc: 'Teléfono, dirección y descripción',
  onboarding_setSchedule: 'Configura tu horario',
  onboarding_setScheduleDesc: 'Que tus clientes sepan cuándo estás abierto',
  onboarding_customizeMenu: 'Personaliza tu menú',
  onboarding_customizeMenuDesc: 'Agrega tus productos, precios y fotos',
  onboarding_generateQR: 'Genera QR para tus mesas',
  onboarding_generateQRDesc: 'Imprime y colócalos en cada mesa',
  onboarding_firstOrder: 'Recibe tu primer pedido',
  onboarding_firstOrderDesc: 'Comparte tu menú y empieza a vender',
  onboarding_openCounter: 'Abre tu Counter en la tablet',
  onboarding_openCounterDesc: 'Gestiona todas tus órdenes en tiempo real desde el Counter',
  onboarding_configurePrinter: 'Configura tu impresora',
  onboarding_configurePrinterDesc: 'Conecta una impresora térmica para imprimir tickets automáticamente',
  onboarding_installPWA: 'Instala MENIUS en tu tablet',
  onboarding_installPWADesc: 'Agrega la app a tu pantalla de inicio para una mejor experiencia',

  // General
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
  general_save: 'Guardar',
  general_close: 'Cerrar',
  general_confirm: 'Confirmar',
  general_back: 'Volver',
  general_next: 'Siguiente',
  general_yes: 'Sí',
  general_no: 'No',

  // Pages
  page_orders: 'Órdenes',
  page_tables: 'Mesas & QRs',
  page_products: 'Productos',
  page_newProduct: 'Nuevo producto',
  page_editProduct: 'Editar producto',
  page_categories: 'Categorías',
  page_analytics: 'Analytics',
  page_billing: 'Facturación',
  page_settings: 'Configuración',
  page_settingsData: 'Datos y Privacidad',
  page_staff: 'Equipo',
  page_customers: 'Clientes',
  page_reviews: 'Reseñas',
  page_promotions: 'Promociones',
  page_marketing: 'Marketing',
  page_media: 'Galería de medios',
  page_subscriptionExpired: 'Suscripción expirada',
  page_verifyEmail: 'Verificar email',

  // Reviews
  reviews_average: 'Promedio',
  reviews_total: 'Total',
  reviews_visible: 'Visibles',
  reviews_hidden: 'Ocultas',
  reviews_distribution: 'Distribución',
  reviews_noReviews: 'Sin reseñas aún',
  reviews_noReviewsDesc: 'Las reseñas aparecerán cuando tus clientes califiquen sus pedidos.',
  reviews_hideReview: 'Ocultar reseña',
  reviews_showReview: 'Mostrar reseña',

  // Customers
  customers_total: 'Total clientes',
  customers_avgSpend: 'Gasto promedio',
  customers_topCustomer: 'Top cliente',
  customers_lastOrder: 'Último pedido',
  customers_searchPlaceholder: 'Buscar por nombre, teléfono o email...',
  customers_sortLastOrder: 'Última orden',
  customers_sortMostSpent: 'Mayor gasto',
  customers_sortMostOrders: 'Más órdenes',
  customers_sortNameAZ: 'Nombre A-Z',
  customers_noName: 'Sin nombre',
  customers_noResults: 'No se encontraron clientes',
  customers_empty: 'Aún no hay clientes. Se crean automáticamente con cada pedido.',
  customers_customerSince: 'Cliente desde',
  customers_close: 'Cerrar',
  customers_ordersLabel: 'Órdenes',
  customers_totalSpent: 'Total gastado',
  customers_avgTicket: 'Ticket promedio',
  customers_call: 'Llamar',
  customers_tagsLabel: 'Tags (separados por coma)',
  customers_tagsPlaceholder: 'VIP, frecuente, delivery...',
  customers_internalNotes: 'Notas internas',
  customers_notesPlaceholder: 'Alergias, preferencias, notas sobre este cliente...',
  customers_saveNotesTags: 'Guardar notas y tags',
  customers_saving: 'Guardando...',
  customers_all: 'Todos',
  customers_paginationLabel: 'clientes',
  customers_previous: 'Anterior',
  customers_next: 'Siguiente',
  customers_customerCol: 'Cliente',
  customers_contactCol: 'Contacto',
  customers_ordersCol: 'Órdenes',
  customers_totalSpentCol: 'Total gastado',
  customers_lastOrderCol: 'Última orden',
  customers_tagsCol: 'Tags',

  // Media Gallery
  media_title: 'Galería de imágenes',
  media_stored: 'almacenadas',
  media_imageSingular: 'imagen',
  media_imagesPlural: 'imágenes',
  media_search: 'Buscar...',
  media_uploading: 'Subiendo...',
  media_upload: 'Subir imagen',
  media_errorLoading: 'Error cargando imágenes',
  media_onlyImages: 'Solo imágenes',
  media_maxSize: 'Máximo 10MB',
  media_uploaded: 'Imagen subida',
  media_deleted: 'Imagen eliminada',
  media_urlCopied: 'URL copiada',
  media_copyFailed: 'No se pudo copiar',
  media_noResults: 'No se encontraron imágenes',
  media_noImages: 'No hay imágenes aún',
  media_tryOtherTerm: 'Intenta con otro término',
  media_uploadFirst: 'Sube tu primera imagen o importa un menú con IA',
  media_deleteConfirm: '¿Eliminar esta imagen? Esta acción no se puede deshacer.',
  media_errorDeleting: 'Error eliminando imagen',
  media_errorUploading: 'Error subiendo imagen',
  media_copyUrl: 'Copiar URL',
  media_download: 'Descargar',
  media_delete: 'Eliminar',

  // Marketing
  marketing_title: 'Marketing',
  marketing_subtitle: 'Campañas de email, redes sociales, SMS y automatizaciones con IA',
  marketing_tabEmail: 'Email',
  marketing_tabSocial: 'Redes Sociales',
  marketing_tabSms: 'SMS',
  marketing_tabAutomations: 'Automatizaciones',

  // Email Campaigns
  email_totalCustomers: 'Total clientes',
  email_withEmail: 'Con email',
  email_reachable: 'Alcanzables',
  email_willReceive: 'clientes recibirán el email',
  email_quickTemplates: 'Plantillas rápidas',
  email_generateAI: 'Generar con IA',
  email_aiDesc: 'La IA creará asunto, mensaje y CTA optimizados basados en tu restaurante y audiencia.',
  email_campaignType: 'Tipo de campaña',
  email_extraInstructions: 'Instrucciones extra (opcional)',
  email_generateContent: 'Generar contenido con IA',
  email_generating: 'Generando...',
  email_compose: 'Componer campaña',
  email_audience: 'Audiencia',
  email_subject: 'Asunto del email',
  email_message: 'Mensaje',
  email_buttonText: 'Texto del botón',
  email_sending: 'Enviando...',
  email_sendCampaign: 'Enviar campaña',
  email_subjectRequired: 'Asunto y mensaje son requeridos',
  email_errorSending: 'Error al enviar',
  email_connectionError: 'Error de conexión',
  email_errorGenerating: 'Error generando con IA',
  email_sentResult: 'Enviado:',
  email_failed: 'fallidos',
  email_variablesHint: 'Usa {nombre} para personalizar con el nombre del cliente, {restaurante} para tu restaurante',
  email_msgVariablesHint: 'Variables: {nombre}, {total_ordenes}, {total_gastado}, {restaurante}',
  email_typePromo: 'Promoción / Descuento',
  email_typeReactivation: 'Reactivar inactivos',
  email_typeNewProduct: 'Nuevo producto',
  email_typeVipThanks: 'Agradecimiento VIP',
  email_typeSeasonal: 'Temporada / Festivo',
  email_filterAll: 'Todos los clientes',
  email_filterAllDesc: 'Clientes con email registrado',
  email_filterVip: 'Clientes VIP',
  email_filterVipDesc: '5+ órdenes realizadas',
  email_filterInactive: 'Inactivos (30+ días)',
  email_filterInactiveDesc: 'No han ordenado en 30 días',
  email_filterRecent: 'Recientes (7 días)',
  email_filterRecentDesc: 'Ordenaron en los últimos 7 días',
  email_filterBigSpenders: 'Grandes compradores',
  email_filterBigSpendersDesc: 'Más de $100 gastados',
  email_tplPromo: 'Promoción general',
  email_tplMissYou: 'Te extrañamos',
  email_tplNewProduct: 'Nuevo producto',
  email_tplVipThanks: 'Agradecimiento VIP',

  // SMS Campaigns
  sms_totalCustomers: 'Total clientes',
  sms_withPhone: 'Con teléfono',
  sms_reachable: 'Alcanzables',
  sms_willReceive: 'clientes recibirán el SMS',
  sms_serviceTitle: 'Servicio SMS',
  sms_serviceDesc: 'Para enviar SMS se requiere un proveedor como Twilio o MessageBird. Configura tus credenciales en las variables de entorno. Costo aproximado: $0.01-0.05 USD por SMS según el país.',
  sms_quickTemplates: 'Plantillas rápidas',
  sms_generateAI: 'Generar SMS con IA',
  sms_generating: 'Generando...',
  sms_compose: 'Componer SMS',
  sms_audience: 'Audiencia',
  sms_message: 'Mensaje',
  sms_sending: 'Enviando...',
  sms_sendCampaign: 'Enviar campaña SMS',
  sms_messageRequired: 'El mensaje es requerido',
  sms_errorSending: 'Error al enviar',
  sms_connectionError: 'Error de conexión',
  sms_errorGenerating: 'Error generando con IA',
  sms_sentResult: 'Enviado:',
  sms_variables: 'Variables: {nombre}, {restaurante}, {link}',
  sms_filterAll: 'Todos los clientes',
  sms_filterAllDesc: 'Clientes con teléfono registrado',
  sms_filterVip: 'Clientes VIP',
  sms_filterVipDesc: '5+ órdenes realizadas',
  sms_filterInactive: 'Inactivos (30+ días)',
  sms_filterInactiveDesc: 'No han ordenado en 30 días',
  sms_filterRecent: 'Recientes (7 días)',
  sms_filterRecentDesc: 'Ordenaron en los últimos 7 días',
  sms_tplPromo: 'Promoción',
  sms_tplMissYou: 'Te extrañamos',
  sms_tplNewDish: 'Nuevo plato',
  sms_tplThanks: 'Agradecimiento',

  // Social Media
  social_choosePlatform: 'Elige la red social',
  social_generatePost: 'Generar post con IA para',
  social_postType: 'Tipo de publicación',
  social_extraInstructions: 'Instrucciones extra (opcional)',
  social_generateButton: 'Generar post con IA',
  social_generating: 'Generando post...',
  social_captionText: 'Caption / Texto',
  social_copyAll: 'Copiar todo',
  social_copied: 'Copiado',
  social_imageIdea: 'Imagen para el post',
  social_generateImage: 'Generar imagen con IA',
  social_generatingImage: 'Generando imagen...',
  social_downloadImage: 'Descargar imagen',
  social_imageError: 'No se pudo generar la imagen',
  social_bestTime: 'Mejor hora',
  social_proTip: 'Tip profesional',
  social_regenerate: 'Generar otra versión',
  social_typePromo: 'Promoción / Descuento',
  social_typeNewDish: 'Nuevo platillo',
  social_typeDailySpecial: 'Especial del día',
  social_typeBehindScenes: 'Detrás de cámaras',
  social_typeCustomerReview: 'Reseña de cliente',
  social_typeGeneral: 'Post general',
  social_typeEvent: 'Evento especial',
  social_typeStory: 'Historia del restaurante',

  // Automations
  auto_active: 'Automatizaciones activas',
  auto_paused: 'Automatizaciones pausadas',
  auto_configuredMsg: 'configurado',
  auto_enableMsg: 'Activa las notificaciones en Ajustes > Notificaciones',
  auto_restaurantToClient: 'Restaurante → Cliente',
  auto_platformToOwner: 'MENIUS → Dueño del restaurante',
  auto_infoText: 'Las automatizaciones se ejecutan diariamente a las 10:00 UTC mediante un cron job de Vercel. Los emails en tiempo real (confirmación de pedido, alertas) se envían al instante cuando ocurre el evento. Para activar/desactivar automatizaciones, ve a <strong>Ajustes → Notificaciones</strong>.',
  auto_statusActive: 'Activa',
  auto_statusInactive: 'Inactiva',
  auto_reasonNotifOff: 'Notificaciones desactivadas',
  auto_reasonNoEmail: 'Sin email configurado',
  auto_reasonNoWhatsApp: 'Sin WhatsApp configurado',
  auto_reasonNoChannels: 'Sin canales configurados',
  auto_orderConfirmTitle: 'Confirmación de pedido',
  auto_orderConfirmDesc: 'Envía confirmación automática al cliente cuando realiza un pedido con su email.',
  auto_orderConfirmTrigger: 'Cada nuevo pedido',
  auto_orderStatusTitle: 'Actualización de estado',
  auto_orderStatusDesc: 'Notifica al cliente cuando su pedido cambia de estado (confirmado, preparando, listo, entregado).',
  auto_orderStatusTrigger: 'Cambio de estado del pedido',
  auto_ownerAlertTitle: 'Alerta de nuevo pedido (dueño)',
  auto_ownerAlertDesc: 'Envía notificación al dueño del restaurante cada vez que llega un nuevo pedido.',
  auto_welcomeTitle: 'Bienvenida a nuevos clientes',
  auto_welcomeDesc: 'Email automático de bienvenida a clientes que hacen su primer pedido.',
  auto_reactivationTitle: 'Reactivación de inactivos',
  auto_reactivationDesc: 'Invita a regresar a clientes que no han ordenado en 30+ días.',
  auto_reviewRequestTitle: 'Solicitud de reseña',
  auto_reviewRequestDesc: 'Pide una reseña al cliente 1-2 días después de que su pedido fue entregado.',
  auto_trialExpiringTitle: 'Trial por vencer (MENIUS)',
  auto_trialExpiringDesc: 'Avisa al dueño cuando faltan 3 días o menos para que termine su prueba gratuita.',
  auto_setupIncompleteTitle: 'Menú vacío (MENIUS)',
  auto_setupIncompleteDesc: 'Recuerda al dueño configurar su menú si lleva 2+ días sin productos.',
  auto_noOrdersTitle: 'Sin pedidos (MENIUS)',
  auto_noOrdersDesc: 'Envía tips de marketing a restaurantes con productos pero sin pedidos en 14 días.',
  auto_cronTrigger: 'Diario a las 10:00 UTC (cron)',
  auto_eachNewOrder: 'Cada nuevo pedido',
  auto_statusChangeTrigger: 'Cambio de estado del pedido',

  // Trial Banner / Free plan banner
  trial_endsToday: 'Tu prueba termina hoy',
  trial_daysOfTrial: 'días de prueba',
  trial_dayOfTrial: 'día de prueba',
  free_planBanner: 'Plan gratuito · 50 pedidos/mes',
  free_planUpgrade: 'Mejorar',

  // Command Palette
  cmd_searchPlaceholder: 'Buscar o ir a...',
  cmd_noResults: 'Sin resultados para',
  cmd_navigate: 'navegar',
  cmd_go: 'ir',
  cmd_closeKey: 'cerrar',
  cmd_sectionNav: 'Navegación',
  cmd_sectionActions: 'Acciones',
  cmd_createProduct: 'Crear producto',
  cmd_createCategory: 'Crear categoría',
  cmd_createTable: 'Crear mesa',
  cmd_exportData: 'Exportar datos',

  // Analytics (extended)
  analytics_subtitle: 'Métricas y rendimiento de tu restaurante',
  analytics_custom: 'Personalizado',
  analytics_start: 'Inicio',
  analytics_end: 'Fin',
  analytics_loading: 'Cargando analytics...',
  analytics_errorLoading: 'Error al cargar analytics',
  analytics_errorUnknown: 'Error desconocido',
  analytics_noDataLoaded: 'No se pudieron cargar los datos',
  analytics_retry: 'Reintentar',
  analytics_startBeforeEnd: 'La fecha de inicio debe ser anterior a la fecha de fin',
  analytics_income: 'Ingresos',
  analytics_ordersLabel: 'Órdenes',
  analytics_avgTicket: 'Ticket promedio',
  analytics_conversionRate: 'Tasa de conversión',
  analytics_peakHourLabel: 'Hora pico',
  analytics_cancellationsLabel: 'Cancelaciones',
  analytics_discountsLabel: 'Descuentos',
  analytics_salesByDay: 'Ventas por día',
  analytics_ordersLegend: 'Órdenes',
  analytics_noDataPeriod: 'Sin datos en este periodo',
  analytics_hourlyDist: 'Distribución por hora',
  analytics_orderStatus: 'Estado de órdenes',
  analytics_topProductsLabel: 'Top productos',
  analytics_noDataShort: 'Sin datos',
  analytics_statusPending: 'Pendiente',
  analytics_statusConfirmed: 'Confirmado',
  analytics_statusPreparing: 'Preparando',
  analytics_statusReady: 'Listo',
  analytics_statusDelivered: 'Entregado',
  analytics_statusCompleted: 'Completado',
  analytics_statusCancelled: 'Cancelado',
  analytics_exportCsv: 'Exportar CSV',
  analytics_reportPdf: 'Reporte PDF (imprimir)',

  // Billing (extended)
  billing_title: 'Facturación',
  billing_subtitle: 'Gestiona tu suscripción, uso y pagos en un solo lugar.',
  billing_subscriptionActivated: 'Suscripción activada con éxito. Bienvenido a MENIUS.',
  billing_processCancelled: 'El proceso fue cancelado. Puedes intentar de nuevo cuando quieras.',
  billing_noCheckout: 'No se pudo crear la sesión. Intenta de nuevo.',
  billing_connectionError: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
  billing_statusTrialing: 'Prueba gratuita',
  billing_statusActive: 'Activa',
  billing_statusPastDue: 'Pago pendiente',
  billing_statusCanceled: 'Cancelada',
  billing_statusUnpaid: 'Sin pagar',
  billing_statusIncomplete: 'Incompleta',
  billing_invPaid: 'Pagada',
  billing_invOpen: 'Pendiente',
  billing_invUncollectible: 'Fallida',
  billing_invVoid: 'Anulada',
  billing_invDraft: 'Borrador',
  billing_unlimited: 'Ilimitado',
  billing_planLabel: 'Plan',
  billing_trialPeriod: 'Periodo de prueba',
  billing_daysRemaining: 'días restantes',
  billing_dayRemaining: 'día restante',
  billing_nextBilling: 'Próxima facturación:',
  billing_cancelsAt: 'Se cancela el',
  billing_cancelEnd: 'Tu plan se cancelará al final del periodo',
  billing_trialDowngradeNote: 'Al finalizar tu prueba, tu cuenta cambiará automáticamente al plan Free. Sin cobros automáticos, sin tarjeta de crédito requerida.',
  billing_currentUsage: 'Uso actual',
  billing_productsLabel: 'Productos',
  billing_tablesLabel: 'Mesas',
  billing_teamLabel: 'Equipo',
  billing_paymentHistory: 'Historial de pagos',
  billing_viewAll: 'Ver todas',
  billing_invoice: 'Factura',
  billing_downloadPdf: 'Descargar PDF',
  billing_redirecting: 'Redirigiendo...',
  billing_manageSubscription: 'Gestionar suscripción',
  billing_updatePayment: 'Actualizar pago',
  billing_subscribeNow: 'Suscribirse ahora',
  billing_upgradeTitle: 'Potencia tu restaurante',
  billing_upgradeDesc: 'Compara los planes y elige el que mejor se adapte a las necesidades de tu negocio.',
  billing_freePlanLabel: 'Plan gratuito',
  billing_freePrice: 'Gratis',
  billing_upgradeHeading: 'Elige un plan',
  billing_upgradeHeadingDesc: 'Elimina los límites y desbloquea todas las funciones.',
  billing_noSubscription: 'Sin suscripción activa',
  billing_choosePlan: 'Elige un plan para comenzar a usar MENIUS y digitalizar tu restaurante.',
  billing_perMonth: 'mes',
  billing_perYear: 'año',
  billing_monthEquiv: '/mes equivalente',

  // Staff
  staff_title: 'Equipo',
  staff_inviteMember: 'Invitar Miembro',
  staff_fullName: 'Nombre completo*',
  staff_email: 'Email*',
  staff_role: 'Rol*',
  staff_invite: 'Invitar',
  staff_cancel: 'Cancelar',
  staff_noMembers: 'No hay miembros en el equipo.',
  staff_noMembersDesc: 'Invita a tu equipo para que ayuden a gestionar el restaurante.',
  staff_deleteConfirm: '¿Eliminar a este miembro del equipo?',
  staff_toggleActivate: 'Activar',
  staff_toggleDeactivate: 'Desactivar',
  staff_changeRoleConfirm: '¿Cambiar el rol de este miembro?',
  staff_roleAdmin: 'Administrador',
  staff_roleManager: 'Gerente',
  staff_roleStaff: 'Mesero',
  staff_roleKitchen: 'Cocina',
  staff_statusPending: 'Pendiente',
  staff_statusActive: 'Activo',
  staff_statusInactive: 'Inactivo',

  // Promotions
  promo_title: 'Promociones y Cupones',
  promo_newPromotion: 'Nueva Promoción',
  promo_code: 'Código*',
  promo_description: 'Descripción',
  promo_discountType: 'Tipo de descuento*',
  promo_percentage: 'Porcentaje (%)',
  promo_fixedAmount: 'Monto fijo ($)',
  promo_value: 'Valor*',
  promo_minOrder: 'Pedido mínimo ($)',
  promo_maxUses: 'Usos máximos',
  promo_unlimited: 'Ilimitado',
  promo_expiresAt: 'Fecha de expiración',
  promo_createPromotion: 'Crear Promoción',
  promo_cancel: 'Cancelar',
  promo_noPromos: 'No hay promociones creadas.',
  promo_noPromosDesc: 'Crea tu primer cupón de descuento.',
  promo_discount: 'de descuento',
  promo_uses: 'Usos:',
  promo_expires: 'Expira:',
  promo_activate: 'Activar',
  promo_deactivate: 'Desactivar',
  promo_deleteConfirm: '¿Eliminar esta promoción?',
  promo_errorSaving: 'Error al guardar promoción',

  // Data & Privacy
  data_title: 'Datos y Privacidad',
  data_subtitle: 'Gestiona tus datos personales y los de tu restaurante de acuerdo al GDPR y leyes de privacidad.',
  data_exportTitle: 'Exportar mis datos',
  data_exportDesc: 'Descarga una copia completa de todos tus datos: restaurante, menú, órdenes, clientes y configuración.',
  data_restaurantInfo: 'Información del restaurante',
  data_fullMenu: 'Menú completo (categorías, productos)',
  data_orderHistory: 'Historial de órdenes',
  data_customerBase: 'Base de clientes',
  data_subscriptionData: 'Datos de suscripción',
  data_downloading: 'Preparando exportación...',
  data_downloadJson: 'Descargar mis datos (JSON)',
  data_deleteTitle: 'Eliminar cuenta',
  data_deleteDesc: 'Elimina permanentemente tu cuenta, restaurante, menú, clientes e historial de órdenes. Esta acción es <strong>irreversible</strong>.',
  data_deleteButton: 'Eliminar mi cuenta',
  data_deleteConfirmText: 'Para confirmar, escribe <span class="font-mono font-bold">ELIMINAR</span> en el campo de abajo:',
  data_deleting: 'Eliminando...',
  data_confirmDeletion: 'Confirmar eliminación',
  data_cancelButton: 'Cancelar',
  data_gdprNote: 'Tienes derechos sobre tus datos según el GDPR (Reglamento General de Protección de Datos). Para más información consulta nuestra',
  data_privacyLink: 'Política de Privacidad',
  data_errorExport: 'No se pudo exportar los datos. Intenta de nuevo.',
  data_errorDelete: 'Error al eliminar cuenta.',
  data_networkError: 'Error de red. Intenta de nuevo.',
  data_typeConfirm: 'Escribe exactamente ELIMINAR para confirmar.',

  // Subscription Expired
  expired_title: 'Tu periodo de prueba ha terminado',
  expired_desc: 'Tu menú, productos y configuración están seguros. Elige un plan para seguir recibiendo pedidos y usando el dashboard.',
  expired_errorPayment: 'No se pudo crear la sesión de pago. Intenta de nuevo.',
  expired_connectionError: 'Error de conexión. Verifica tu internet e intenta de nuevo.',
  expired_logout: 'Cerrar sesión',

  // Verify Email
  verify_title: 'Verifica tu correo',
  verify_desc: 'Para acceder al panel necesitas confirmar tu dirección de correo electrónico. Revisa tu bandeja de entrada y haz clic en el enlace que te enviamos.',
  verify_sent: '¡Listo! Revisá tu correo, el enlace puede tardar 1-2 minutos.',
  verify_resend: 'Reenviar correo de verificación',
  verify_resending: 'Enviando...',
  verify_logout: 'Cerrar sesión',
};

const en: DashboardTranslations = {
  // Nav
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
  nav_support: 'Help center',
  nav_logout: 'Log out',
  nav_menu: 'Menu',
  nav_restaurant: 'Restaurant',
  nav_business: 'Business',
  nav_gallery: 'Gallery',
  nav_customers: 'Customers',
  nav_reviews: 'Reviews',
  nav_marketing: 'Marketing',
  nav_dataPrivacy: 'Data & Privacy',
  nav_openMenu: 'Open menu',
  nav_closeMenu: 'Close menu',
  nav_counter: 'Counter / Caja',
  nav_inventory: 'Inventory',
  nav_loyalty: 'Loyalty',
  nav_branches: 'Branches',

  // Counter / Caja
  counter_title: 'Counter View',
  counter_pending: 'Pending',
  counter_inProgress: 'In Progress',
  counter_newOrder: 'NEW ORDER',
  counter_newOrders: 'NEW ORDERS',
  counter_noOrders: 'No pending orders',
  counter_noOrdersDesc: 'Orders appear here in real time',
  counter_selectOrder: 'Select an order',
  counter_selectOrderDesc: 'Tap an order on the left panel to see details',
  counter_accept: 'ACCEPT',
  counter_accepting: 'Accepting...',
  counter_reject: 'REJECT',
  counter_rejecting: 'Rejecting...',
  counter_preparing: 'PREPARING',
  counter_markReady: 'MARK READY',
  counter_deliver: 'DELIVERED',
  counter_complete: 'Order complete',
  counter_updating: 'Updating...',
  counter_etaLabel: 'Estimated Time',
  counter_orderItems: 'Order Items',
  counter_customer: 'Customer',
  counter_phone: 'Phone',
  counter_email: 'Email',
  counter_notes: 'Notes',
  counter_address: 'Delivery Address',
  counter_agoMin: 'min',
  counter_poweredBy: 'Powered by MENIUS',
  counter_autoPrint: 'Auto-print',
  counter_sound: 'Sound',
  counter_notifWA: 'WhatsApp',
  counter_notifSMS: 'SMS',
  counter_notifEmail: 'Email',
  counter_delivery: 'Delivery',
  counter_pickup: 'Pickup',
  counter_dineIn: 'Dine-in',
  counter_cash: 'Cash',
  counter_online: 'Online',
  counter_printBtn: 'Print order',
  counter_printing: 'Printing…',
  counter_printed: 'Printed',
  counter_printerError: 'Printer not connected',
  counter_printerRetry: 'Retry print',

  // Counter Hub page
  counter_hub_subtitle: 'Manage your orders in real time from any device',
  counter_hub_browserTitle: 'Counter in browser',
  counter_hub_browserDesc: 'Works on any phone, tablet, or computer with Chrome or Safari. No installation needed.',
  counter_hub_browserSpec1: 'Any device with a browser',
  counter_hub_browserSpec2: 'Print from browser settings',
  counter_hub_browserSpec3: 'Instant updates',
  counter_hub_openCounter: 'Open Counter',
  counter_hub_tabletMode: 'Tablet mode (full screen)',
  counter_hub_recommended: 'Recommended',
  counter_hub_nativeTitle: 'Android Native App',
  counter_hub_nativeDesc: 'Install the app on your Android tablet. Faster, with notifications and full Bluetooth printer support.',
  counter_hub_nativeSpec1: 'New order notifications',
  counter_hub_nativeSpec2: 'Bluetooth printer without dialog',
  counter_hub_nativeSpec3: 'Works without opening the browser',
  counter_hub_downloadApk: 'Download APK (Android)',
  counter_hub_installTitle: 'How to install the app on the tablet',
  counter_hub_installStep1: 'On the Android tablet, open Chrome and go to the APK download link.',
  counter_hub_installStep2: 'If Android asks "Install from unknown source?", accept. It\'s safe.',
  counter_hub_installStep3: 'Once installed, open the MENIUS Counter app.',
  counter_hub_installStep4: 'Sign in with your MENIUS account. The app connects automatically to your orders.',
  counter_hub_hardwareTitle: 'Recommended hardware',
  counter_hub_tabletLabel: 'Tablet',
  counter_hub_printerLabel: 'Thermal printer',
  counter_hub_specOS: 'OS',
  counter_hub_specOSValue: 'Android 9 or higher',
  counter_hub_specScreen: 'Screen',
  counter_hub_specScreenValue: '10" or more (landscape orientation)',
  counter_hub_specRAM: 'RAM',
  counter_hub_specRAMValue: '3 GB minimum (4 GB recommended)',
  counter_hub_specType: 'Type',
  counter_hub_specTypeValue: 'Thermal ESC/POS',
  counter_hub_specPaper: 'Paper',
  counter_hub_specPaperValue: '58 mm or 80 mm',
  counter_hub_specConn: 'Connection',
  counter_hub_specConnValue: 'Bluetooth 4.0+ or WiFi',
  counter_hub_wifiLabel: 'Internet connection:',
  counter_hub_wifiNote: 'The tablet must be connected to WiFi to receive orders in real time. A stable 2.4 GHz or 5 GHz WiFi is recommended in the cashier area.',

  // Home
  home_welcome: 'Welcome!',
  home_subtitle: "Here's a summary of your restaurant today.",
  home_viewMenu: 'View menu',
  home_share: 'Share',
  home_todayOrders: 'Orders today',
  home_todayRevenue: 'Revenue today',
  home_activeProducts: 'Active products',
  home_tables: 'Tables',
  home_salesToday: 'Sales today',
  home_ordersToday: 'Orders today',
  home_avgTicket: 'Avg. ticket',
  home_cancellations: 'Cancellations',
  home_vsYesterday: 'vs yesterday',
  home_rate: 'rate',
  home_pendingOrder: 'pending order',
  home_pendingOrders: 'pending orders',
  home_clickToManage: 'Click to manage them',
  home_lowStockProducts: 'products with low stock',
  home_lowStockSingular: 'product with low stock',
  home_checkInventory: 'Check inventory',
  home_outOfStock: 'Out of stock',
  home_units: 'units',
  home_recentOrders: 'Recent orders',
  home_viewAll: 'View all',
  home_noOrdersYet: 'No orders yet',
  home_noOrdersDesc: 'Share your QR menu to start receiving orders',
  home_noName: 'No name',
  home_manageOrders: 'Manage orders',
  home_editMenu: 'Edit menu',
  home_tablesQR: 'Tables & QR',
  home_trialEndsIn: 'Your free trial ends in',
  home_trialDaysLeft: 'days left of free trial',
  home_trialDay: 'day',
  home_trialDays: 'days',
  home_trialChoosePlan: 'Subscribe now to keep full access',
  home_trialEnjoy: 'You\'re trying the Starter plan for free. When it ends, you\'ll move to the Free plan — no charges.',
  home_trialDowngradeNote: 'Without a subscription, you\'ll continue on the Free plan (free forever).',
  home_viewPlans: 'View plans',
  home_dailyGoal: 'Daily goal',
  home_completed: 'completed',
  home_setGoal: '+ Set goal',
  home_goalReached: '🎉 Goal reached!',
  home_sampleMenuCreated: 'Sample menu created!',
  home_restaurantReady: 'Your restaurant is ready',
  home_sampleMenuDesc: 'You now have sample categories, products, and tables. Edit them from your dashboard.',
  home_readyDesc: 'You can add products manually or load a sample menu to see how it works.',
  home_generating: 'Generating...',
  home_loadSampleMenu: 'Load sample menu',
  home_addManually: 'Add manually',
  home_viewMyProducts: 'View my products',
  home_viewMyMenu: 'View my menu',
  home_errorGenerating: 'Error generating sample data',
  home_copyLink: 'Copy link',
  home_copied: 'Copied',
  home_moreOptions: 'More options',

  // Analytics
  analytics_title: 'Analytics',
  analytics_last7days: 'Last 7 days',
  analytics_revenue7d: 'Revenue in 7 days',
  analytics_orders7d: 'Orders in 7 days',
  analytics_revenue: 'Revenue',
  analytics_orders: 'Orders',
  analytics_orderType: 'Order type',
  analytics_noDataYet: 'No data yet',
  analytics_dineIn: 'Dine-in',
  analytics_pickup: 'Pickup',
  analytics_delivery: 'Delivery',
  analytics_topProducts: 'Popular products',
  analytics_peakHours: 'Peak hours',
  analytics_peak: 'Peak',

  // Notifications
  notif_enable: 'Enable notifications',
  notif_enableDesc: 'Get alerts when a new order arrives.',
  notif_activate: 'Enable',
  notif_notNow: 'Not now',
  notif_mute: 'Mute notifications',
  notif_unmute: 'Enable sound',
  notif_newOrder: 'New order',
  notif_viewOrders: 'View orders',

  // Orders
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
  orders_dineIn: 'Dine-in',
  orders_pickup: 'Pickup',
  orders_delivery: 'Delivery',
  orders_cash: 'Cash',
  orders_paidOnline: 'Paid online',
  orders_pendingPlural: 'Pending',
  orders_salesToday: 'Sales today',
  orders_ordersToday: 'Orders today',
  orders_searchPlaceholder: 'Search order, customer...',
  orders_today: 'Today',
  orders_thisWeek: '7 days',
  orders_thisMonth: '30 days',
  orders_all: 'All',
  orders_allTypes: 'All types',
  orders_kanban: 'Kanban',
  orders_history: 'History',
  orders_emptyDesc: 'Share your QR menu with customers to start receiving orders in real time.',
  orders_noCompleted: 'No completed orders',
  orders_withFilter: 'with that filter',
  orders_selected: 'selected',
  orders_advanceStatus: 'Advance status',
  orders_notify: 'Notify',
  orders_newOrder: 'New order',
  orders_product: 'Product',
  orders_less: 'Less',
  orders_details: 'Details',
  orders_print: 'Print',
  orders_customer: 'Customer',
  orders_products: 'Products',
  orders_variant: 'Variant',
  orders_customerNotes: 'Customer notes',
  orders_total: 'Total',

  // KDS
  kds_title: 'Kitchen (KDS)',
  kds_live: 'Live',
  kds_fullscreen: 'Fullscreen',
  kds_exit: 'Exit',
  kds_noActive: 'No active orders',
  kds_activeOrders: 'active orders',
  kds_pending: 'Pending',
  kds_preparing: 'Preparing',
  kds_ready: 'Ready',
  kds_empty: 'No active orders',
  kds_emptyDesc: 'Appear in real time',
  kds_start: 'Start',
  kds_readyToServe: 'Ready to serve',
  kds_ago: 'ago',
  kds_time: 'Time',
  kds_table: 'Table',
  kds_customer: 'Customer',
  kds_notes: 'Notes',
  kds_accept: 'ACCEPT',
  kds_prepare: 'PREPARE',
  kds_markReady: 'READY',
  kds_deliver: 'DELIVER',
  kds_pickup: 'Pickup',
  kds_delivery: 'Delivery',
  kds_cash: 'Cash',
  kds_online: 'Online',
  kds_spicy: 'SPICY',
  kds_dairyFree: 'DAIRY',
  kds_autoConfirm: 'Auto-confirm',
  kds_autoPrint: 'Auto-print',
  kds_sound: 'Sound',
  kds_pause: 'Pause',
  kds_searchPlaceholder: 'Search order, customer, phone...',
  kds_activeTab: 'Active',
  kds_history: 'History',
  kds_all: 'All',
  kds_noHistory: 'No history',
  kds_today: 'Today',
  kds_orderSingular: 'order',
  kds_orderPlural: 'orders',
  kds_avgTime: 'Avg time',
  kds_searchKey: 'Search',
  kds_queued: 'queued',
  kds_undo: 'UNDO',
  kds_pauseOrders: 'Pause orders',
  kds_30min: '30 min',
  kds_1hour: '1 hour',
  kds_2hours: '2 hours',
  kds_new: 'New',
  kds_product: 'Product',
  kds_less: 'Less',
  kds_details: 'Details',
  kds_delivered: 'Delivered',
  kds_cancelled: 'Cancelled',
  kds_recover: 'RECOVER',
  kds_reprint: 'Reprint',
  kds_collapse: 'Collapse',
  kds_sendSms: 'Send SMS',
  kds_smsReadyLabel: '✅ Your order is ready',
  kds_smsPreparingLabel: '👨‍🍳 Preparing your order',
  kds_smsDelayLabel: '⏰ Delay',
  kds_smsArriveLabel: '🏪 Ready for pickup',
  kds_smsThanksLabel: '🙏 Thanks',
  kds_customMsgPlaceholder: 'Write your message...',
  kds_customMsg: '✏️ Custom message',
  kds_send: 'Send',
  kds_sendError: 'Error sending',
  kds_connError: 'Connection error',
  kds_msgSent: 'message sent',
  kds_msgsSent: 'messages sent',
  kds_newOrderTitle: 'New Order',
  kds_newOrdersTitle: 'New Orders',
  kds_tapToView: 'Tap to view →',
  kds_busyMode: 'Busy Mode',
  kds_busyModeDesc: 'Add extra prep minutes without stopping incoming orders.',
  kds_busyNormal: 'Normal (no extra)',

  // Tables
  tables_newTable: 'New table',
  tables_createNewTable: 'Create new table',
  tables_nameRequired: 'Name required',
  tables_createTable: 'Create table',
  tables_placeholder: 'e.g. Table 1, Bar 1, Patio A',
  tables_available: 'Available',
  tables_occupied: 'Occupied',
  tables_reserved: 'Reserved',
  tables_qrPerTable: 'QR per table (Dine-in)',
  tables_noTables: 'No tables configured',
  tables_noTablesDesc: 'Create tables to generate custom QR codes that your customers scan to order.',
  tables_createFirst: 'Create first table',
  tables_downloadQR: 'Download QR',
  tables_print: 'Print',
  tables_share: 'Share',
  tables_copiedLink: 'Copied!',
  tables_copy: 'Copy',
  tables_viewLink: 'View link',
  tables_deleteTable: 'Delete table',
  tables_deleteConfirm: 'Delete this table?',
  tables_generalQR: 'General QR — Pickup & Delivery',
  tables_generalQRDesc: 'Share this QR on social media, stickers, cards, flyers',
  tables_shareWhatsApp: 'Share via WhatsApp',
  tables_openMenu: 'Open menu',
  tables_scanToView: 'Scan the code to view the menu',
  tables_orderFromPhone: 'Order and pay from your phone',
  tables_printAll: 'Print all',

  // Products
  products_new: 'New product',
  products_photos: 'Photos',
  products_importAI: 'Import menu with AI',
  products_active: 'active',
  products_total: 'total',
  products_outOfStock: 'out of stock',
  products_filters: 'Filters',
  products_category: 'Category',
  products_status: 'Status',
  products_stock: 'Stock',
  products_all: 'All',
  products_allFem: 'All',
  products_activeFilter: 'Active',
  products_hidden: 'Hidden',
  products_inStock: 'In stock',
  products_outOfStockFilter: 'Out of stock',
  products_clearFilters: 'Clear filters',
  products_selected: 'selected',
  products_activate: 'Activate',
  products_deactivate: 'Deactivate',
  products_delete: 'Delete',
  products_noResults: 'No results',
  products_noMatch: 'No products match',
  products_noProducts: 'No products',
  products_noProductsDesc: 'Create your first product to get started.',
  products_createProduct: 'Create product',
  products_createCategoryFirst: 'Create a category first',
  products_needCategory: 'You need at least one category.',
  products_createCategory: 'Create category',
  products_product: 'Product',
  products_price: 'Price',
  products_options: 'Options',
  products_activeStatus: 'Active',
  products_hiddenStatus: 'Hidden',
  products_outOfStockStatus: 'Out of stock',
  products_inStockStatus: 'In stock',
  products_markAvailable: 'Mark available',
  products_markOutOfStock: 'Mark out of stock',
  products_duplicate: 'Duplicate',
  products_hide: 'Hide',
  products_show: 'Show',
  products_deleteConfirm: 'Delete this product?',
  products_deleteMultiConfirm: 'Delete {n} products?',
  products_clickEditPrice: 'Click to edit price',
  products_groups: 'groups',
  products_copy: 'copy',
  products_bulkAI: 'AI Photos',

  // Product Editor
  editor_back: 'Back',
  editor_newProduct: 'New product',
  editor_editProduct: 'Edit product',
  editor_save: 'Save',
  editor_saving: 'Saving...',
  editor_saved: 'Saved!',
  editor_create: 'Create product',
  editor_creating: 'Creating...',
  editor_name: 'Name',
  editor_namePlaceholder: 'e.g. Classic Burger',
  editor_nameRequired: 'Enter the product name first',
  editor_description: 'Description',
  editor_descPlaceholder: 'Describe your product...',
  editor_price: 'Price',
  editor_pricePlaceholder: '0.00',
  editor_category: 'Category',
  editor_selectCategory: 'Select a category',
  editor_image: 'Image',
  editor_uploadImage: 'Upload image',
  editor_changeImage: 'Change image',
  editor_removeImage: 'Remove image',
  editor_generateAI: 'Generate with AI',
  editor_generatingAI: 'Generating...',
  editor_fromGallery: 'From gallery',
  editor_fromURL: 'From URL',
  editor_pasteURL: 'Paste the image URL',
  editor_apply: 'Apply',
  editor_visibility: 'Visibility',
  editor_visible: 'Visible',
  editor_hiddenLabel: 'Hidden',
  editor_stockLabel: 'Availability',
  editor_inStockLabel: 'In stock',
  editor_outOfStockLabel: 'Out of stock',
  editor_featured: 'Featured',
  editor_isNew: 'New',
  editor_dietaryTags: 'Dietary tags',
  editor_translations: 'Translations',
  editor_deleteProduct: 'Delete product',
  editor_deleteConfirm: 'Are you sure you want to delete this product? This action cannot be undone.',
  editor_deleting: 'Deleting...',
  editor_modifierGroups: 'Options & extras',
  editor_legacyVariants: 'Existing variants',
  editor_legacyExtras: 'Existing extras',
  editor_legacyHint: 'These options were created with the previous system. You can delete them here.',
  editor_legacyDeleteConfirm: 'Delete this option?',
  editor_basicInfo: 'Basic information',
  editor_uploading: 'Uploading...',
  editor_productUpdated: 'Product updated',
  editor_productCreated: 'Product created',
  editor_unexpectedError: 'Unexpected error',
  editor_errorDeleting: 'Error deleting',
  editor_invalidURL: 'Invalid URL',
  editor_onlyImages: 'Images only',
  editor_maxFileSize: 'Maximum 5MB',
  editor_errorUploadingImage: 'Error uploading image',
  editor_priceInvalid: 'Invalid price',
  editor_fileFormats: 'PNG, JPG up to 5MB',
  editor_errorGeneratingImage: 'Error generating image with AI',
  editor_visibleInMenu: 'Visible in menu',
  editor_categoryNote: 'Products in this category appear under "{name}" in the menu.',
  editor_aiLabel: 'AI',
  editor_translatedNamePlaceholder: 'Translated name...',
  editor_translatedDescPlaceholder: 'Translated description...',

  // Categories
  categories_title: 'Categories',
  categories_new: 'New category',
  categories_namePlaceholder: 'Category name',
  categories_nameRequired: 'Name required',
  categories_create: 'Create',
  categories_creating: 'Creating...',
  categories_noCategories: 'No categories',
  categories_noCategoriesDesc: 'Create categories to organize your menu.',
  categories_createFirst: 'Create first category',
  categories_deleteConfirm: 'Delete this category? All associated products will also be deleted.',
  categories_active: 'Active',
  categories_hidden: 'Hidden',
  categories_translate: 'Translate',
  categories_uploadImage: 'Upload image',
  categories_translationName: 'Translated name',
  categories_translationSave: 'Save translation',

  // Modifier Groups
  modifiers_title: 'Extras & Options',
  modifiers_newGroup: 'New group',
  modifiers_noGroups: 'No option groups',
  modifiers_noGroupsDesc: 'Add options like Size, Extras, Sauces...',
  modifiers_type: 'How many can they pick?',
  modifiers_single: 'Customer picks ONE',
  modifiers_singleDesc: 'Picks ONE',
  modifiers_multi: 'Customer picks SEVERAL',
  modifiers_required: 'Required',
  modifiers_min: 'Minimum to pick',
  modifiers_max: 'Maximum to pick',
  modifiers_creating: 'Creating...',
  modifiers_createGroup: 'Create group',
  modifiers_options: 'options',
  modifiers_choose1Required: 'Choose 1 (required)',
  modifiers_choose1Optional: 'Choose 1 (optional)',
  modifiers_chooseRange: 'Choose {min}-{max} (required)',
  modifiers_upTo: 'Up to {max} (optional)',
  modifiers_base: 'Included',
  modifiers_addOption: 'Add option',
  modifiers_optionPlaceholder: 'e.g. Large, Extra cheese...',
  modifiers_deleteGroupConfirm: 'Delete this group and all its options?',
  modifiers_save: 'Save',
  modifiers_pickTemplate: 'Pick a template to get started quickly:',
  modifiers_templateSize: 'Size',
  modifiers_templateSizeDesc: 'Small, Medium, Large',
  modifiers_templateExtras: 'Extras / Toppings',
  modifiers_templateExtrasDesc: 'Bacon, Cheese, Avocado',
  modifiers_templatePrep: 'Preparation',
  modifiers_templatePrepDesc: 'Medium rare, Well done',
  modifiers_templateSides: 'Side',
  modifiers_templateSidesDesc: 'Fries, Salad, Rice',
  modifiers_templateCustom: 'Custom',
  modifiers_templateCustomDesc: 'Build from scratch',
  modifiers_priceHint: '$0.00 = included',
  modifiers_singleLabel: 'Customer picks ONE',
  modifiers_multiLabel: 'Customer picks SEVERAL',
  modifiers_minHelper: 'Minimum to pick',
  modifiers_maxHelper: 'Maximum to pick',
  modifiers_displayList: 'List',
  modifiers_displayGrid: 'Grid',
  modifiers_displayHint: 'Recommended for short names',

  // AI Chat
  chat_title: 'MENIUS AI',
  chat_subtitle: 'Your smart assistant',
  chat_welcome: 'Hi! I\'m MENIUS AI',
  chat_welcomeDesc: 'Your business partner and chef consultant. Ask me about sales, customers, recipes, strategies, or how to use the dashboard.',
  chat_placeholder: 'Ask me anything...',
  chat_newConversation: 'New conversation',
  chat_quickLabel: 'Quick questions',
  chat_disclaimer: 'MENIUS AI can make mistakes. Verify important information.',
  chat_errorConnection: 'Connection error. Try again.',
  chat_errorLimit: 'You\'ve reached the message limit. Try again in a few minutes.',
  chat_q1: 'How is my day going?',
  chat_q2: 'What can I improve?',
  chat_q3: 'Suggest a promotion',
  chat_q4: 'How do I add a product?',
  chat_q5: 'Who are my best customers?',
  chat_q6: 'Marketing ideas for my restaurant',
  chat_q7: 'How do I set up delivery?',
  chat_q8: 'Help with a technical issue',

  // Settings
  settings_title: 'Settings',
  settings_save: 'Save changes',
  settings_saving: 'Saving...',
  settings_saved: 'Saved',
  settings_customDomain: 'Custom domain',
  settings_basicInfo: 'Basic information',
  settings_schedule: 'Operating hours',
  settings_closed: 'Closed',
  settings_notifications: 'Notifications',
  settings_logo: 'Restaurant logo',
  settings_logoDesc: 'Shown in the header of your public menu.',
  settings_changeLogo: 'Change logo',
  settings_uploadLogo: 'Upload logo',
  settings_banner: 'Menu banner',
  settings_bannerDesc: 'Cover image shown at the top of your public menu.',
  settings_uploadBanner: 'Upload banner',
  settings_bannerRecommended: '1200 x 400px recommended',
  settings_change: 'Change',
  settings_remove: 'Remove',
  settings_publicURL: 'Public menu link',
  settings_restaurantName: 'Restaurant name',
  settings_phone: 'Phone',
  settings_description: 'Description',
  settings_descPlaceholder: 'Describe your restaurant...',
  settings_address: 'Address',
  settings_addressPlaceholder: 'Search address...',
  settings_latitude: 'Latitude',
  settings_longitude: 'Longitude',
  settings_email: 'Email',
  settings_website: 'Website',
  settings_regional: 'Regional',
  settings_timezone: 'Timezone',
  settings_currency: 'Currency',
  settings_mainLanguage: 'Main language',
  settings_mainLanguageDesc: 'The base language for your products and categories.',
  settings_additionalLanguages: 'Additional languages',
  settings_additionalLanguagesDesc: 'Add languages so your customers can view the menu in their language.',
  settings_primary: 'primary',
  settings_addLanguage: 'Add',
  settings_addLanguageSelect: 'Add language...',
  settings_languageSelectorNote: 'Your customers will see a language selector on the menu. Go to Menu → Products to add translations.',
  settings_orderTypes: 'Order types',
  settings_orderTypesDesc: 'Select the order types you accept.',
  settings_dineIn: 'Dine-in',
  settings_pickup: 'Pickup',
  settings_delivery: 'Delivery',
  settings_deliveryTime: 'Estimated delivery time (min)',
  settings_deliveryFee: 'Delivery fee',
  settings_paymentMethods: 'Payment methods',
  settings_paymentMethodsDesc: 'Select the payment methods you accept.',
  settings_cash: 'Cash',
  settings_card: 'Card',
  settings_onlinePayment: 'Online payment',
  settings_stripeConnect: 'Stripe Connect',
  settings_stripeConnectDesc: 'Connect your Stripe account to accept online payments.',
  settings_stripeConnected: 'Connected',
  settings_stripeNotConnected: 'Not connected',
  settings_stripeConnect_btn: 'Connect Stripe',
  settings_stripeConnecting: 'Connecting...',
  settings_stripeDashboard: 'Stripe Dashboard',
  settings_notificationsTitle: 'Notifications',
  settings_notificationsDesc: 'Receive notifications when you get new orders.',
  settings_enableNotifications: 'Enable notifications',
  settings_whatsappNumber: 'WhatsApp number',
  settings_emailNotification: 'Notification email',
  settings_scheduleTitle: 'Operating hours',
  settings_scheduleDesc: 'Set the hours when your restaurant is open.',
  settings_onlyImages: 'Only images are allowed',
  settings_maxSize: 'Maximum 10MB',
  settings_errorSaving: 'Error saving',
  settings_days_monday: 'Monday',
  settings_days_tuesday: 'Tuesday',
  settings_days_wednesday: 'Wednesday',
  settings_days_thursday: 'Thursday',
  settings_days_friday: 'Friday',
  settings_days_saturday: 'Saturday',
  settings_days_sunday: 'Sunday',
  settings_domainTitle: 'Custom domain',
  settings_domainDesc: 'Connect your own domain for your public menu.',
  settings_domainPlaceholder: 'menu.yourrestaurant.com',
  settings_domainVerified: 'Verified',
  settings_domainPending: 'Pending verification',
  settings_domainInstructions: 'Add a CNAME record pointing to:',
  settings_domainCNAME: 'cname.menius.app',
  settings_uploadError: 'Error uploading image',
  settings_bannerFormatNote: 'Ideal size: 1200 x 400px (3:1). JPG, PNG or WebP, max 10MB.',
  settings_generateBannerAI: 'Generate with AI',
  settings_generatingBannerAI: 'Generating...',
  settings_dineInDesc: 'Customer orders and eats at your restaurant',
  settings_pickupDesc: 'Customer orders and picks up',
  settings_deliveryDesc: 'Customer provides their address and you deliver the order',
  settings_deliveryFeeNote: 'Shown to customers before confirming the order. Set to 0 for free delivery.',
  settings_cashDesc: 'Customer pays upon receiving the order or at the register',
  settings_onlinePaymentDesc: 'Customer pays by card when ordering (requires Stripe Connect)',
  settings_stripeVerifying: 'Verifying...',
  settings_stripeReady: 'Connected — Ready to receive payments',
  settings_stripePendingVerify: 'Account created — Complete verification',
  settings_stripeRedirecting: 'Redirecting...',
  settings_stripeCompleteVerify: 'Complete verification',
  settings_timeTo: 'to',
  settings_openDay: 'Open',
  settings_closeDay: 'Close',
  settings_24h: '24 hours',
  settings_enabled: 'Enabled',
  settings_disabled: 'Disabled',
  settings_whatsappOrdersLabel: 'WhatsApp for new orders',
  settings_whatsappOrdersDesc: 'You will receive a WhatsApp message every time a new order comes in.',
  settings_emailNotificationLabel: 'Email for business notifications',
  settings_emailNotificationDesc: 'Customers who provide their email will receive confirmations and order updates.',
  settings_notificationsOffDesc: 'Notifications are disabled. Enable them to receive alerts for new orders.',
  settings_unsavedChanges: 'Unsaved changes',
  settings_dnsRequired: 'Required DNS configuration:',
  settings_dnsType: 'Type',
  settings_dnsName: 'Name',
  settings_dnsValue: 'Value',
  settings_dnsPropagation: 'Add this CNAME record in your domain provider (GoDaddy, Namecheap, Cloudflare, etc.). Propagation can take up to 48 hours.',
  settings_domainActive: 'Domain verified and active',
  settings_domainVerifyDNS: 'Verify DNS',
  settings_domainVerifying: 'Verifying...',
  settings_domainNetworkError: 'Network error. Please try again.',
  settings_domain: 'Domain',

  // Onboarding
  onboarding_title: 'Set up your restaurant',
  onboarding_stepsOf: 'of',
  onboarding_allComplete: 'Your restaurant is ready!',
  onboarding_allCompleteDesc: "You've completed all steps. Your digital menu is live.",
  onboarding_uploadLogo: 'Upload your restaurant logo',
  onboarding_uploadLogoDesc: 'Give your digital menu a visual identity',
  onboarding_completeProfile: 'Complete your profile',
  onboarding_completeProfileDesc: 'Phone, address, and description',
  onboarding_setSchedule: 'Set your schedule',
  onboarding_setScheduleDesc: 'Let customers know when you are open',
  onboarding_customizeMenu: 'Customize your menu',
  onboarding_customizeMenuDesc: 'Add your products, prices, and photos',
  onboarding_generateQR: 'Generate QR codes for tables',
  onboarding_generateQRDesc: 'Print and place them on each table',
  onboarding_firstOrder: 'Receive your first order',
  onboarding_firstOrderDesc: 'Share your menu and start selling',
  onboarding_openCounter: 'Open Counter on your tablet',
  onboarding_openCounterDesc: 'Manage all your orders in real time from the Counter',
  onboarding_configurePrinter: 'Configure your printer',
  onboarding_configurePrinterDesc: 'Connect a thermal printer to print tickets automatically',
  onboarding_installPWA: 'Install MENIUS on your tablet',
  onboarding_installPWADesc: 'Add the app to your home screen for the best experience',

  // General
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
  general_save: 'Save',
  general_close: 'Close',
  general_confirm: 'Confirm',
  general_back: 'Back',
  general_next: 'Next',
  general_yes: 'Yes',
  general_no: 'No',

  // Pages
  page_orders: 'Orders',
  page_tables: 'Tables & QRs',
  page_products: 'Products',
  page_newProduct: 'New product',
  page_editProduct: 'Edit product',
  page_categories: 'Categories',
  page_analytics: 'Analytics',
  page_billing: 'Billing',
  page_settings: 'Settings',
  page_settingsData: 'Data & Privacy',
  page_staff: 'Team',
  page_customers: 'Customers',
  page_reviews: 'Reviews',
  page_promotions: 'Promotions',
  page_marketing: 'Marketing',
  page_media: 'Media gallery',
  page_subscriptionExpired: 'Subscription expired',
  page_verifyEmail: 'Verify email',

  // Reviews
  reviews_average: 'Average',
  reviews_total: 'Total',
  reviews_visible: 'Visible',
  reviews_hidden: 'Hidden',
  reviews_distribution: 'Distribution',
  reviews_noReviews: 'No reviews yet',
  reviews_noReviewsDesc: 'Reviews will appear when your customers rate their orders.',
  reviews_hideReview: 'Hide review',
  reviews_showReview: 'Show review',

  // Customers
  customers_total: 'Total customers',
  customers_avgSpend: 'Average spend',
  customers_topCustomer: 'Top customer',
  customers_lastOrder: 'Last order',
  customers_searchPlaceholder: 'Search by name, phone or email...',
  customers_sortLastOrder: 'Last order',
  customers_sortMostSpent: 'Most spent',
  customers_sortMostOrders: 'Most orders',
  customers_sortNameAZ: 'Name A-Z',
  customers_noName: 'No name',
  customers_noResults: 'No customers found',
  customers_empty: 'No customers yet. They are created automatically with each order.',
  customers_customerSince: 'Customer since',
  customers_close: 'Close',
  customers_ordersLabel: 'Orders',
  customers_totalSpent: 'Total spent',
  customers_avgTicket: 'Avg. ticket',
  customers_call: 'Call',
  customers_tagsLabel: 'Tags (comma separated)',
  customers_tagsPlaceholder: 'VIP, frequent, delivery...',
  customers_internalNotes: 'Internal notes',
  customers_notesPlaceholder: 'Allergies, preferences, notes about this customer...',
  customers_saveNotesTags: 'Save notes and tags',
  customers_saving: 'Saving...',
  customers_all: 'All',
  customers_paginationLabel: 'customers',
  customers_previous: 'Previous',
  customers_next: 'Next',
  customers_customerCol: 'Customer',
  customers_contactCol: 'Contact',
  customers_ordersCol: 'Orders',
  customers_totalSpentCol: 'Total spent',
  customers_lastOrderCol: 'Last order',
  customers_tagsCol: 'Tags',

  // Media Gallery
  media_title: 'Image gallery',
  media_stored: 'stored',
  media_imageSingular: 'image',
  media_imagesPlural: 'images',
  media_search: 'Search...',
  media_uploading: 'Uploading...',
  media_upload: 'Upload image',
  media_errorLoading: 'Error loading images',
  media_onlyImages: 'Images only',
  media_maxSize: 'Maximum 10MB',
  media_uploaded: 'Image uploaded',
  media_deleted: 'Image deleted',
  media_urlCopied: 'URL copied',
  media_copyFailed: 'Could not copy',
  media_noResults: 'No images found',
  media_noImages: 'No images yet',
  media_tryOtherTerm: 'Try another search term',
  media_uploadFirst: 'Upload your first image or import a menu with AI',
  media_deleteConfirm: 'Delete this image? This action cannot be undone.',
  media_errorDeleting: 'Error deleting image',
  media_errorUploading: 'Error uploading image',
  media_copyUrl: 'Copy URL',
  media_download: 'Download',
  media_delete: 'Delete',

  // Marketing
  marketing_title: 'Marketing',
  marketing_subtitle: 'Email campaigns, social media, SMS and AI automations',
  marketing_tabEmail: 'Email',
  marketing_tabSocial: 'Social Media',
  marketing_tabSms: 'SMS',
  marketing_tabAutomations: 'Automations',

  // Email Campaigns
  email_totalCustomers: 'Total customers',
  email_withEmail: 'With email',
  email_reachable: 'Reachable',
  email_willReceive: 'customers will receive the email',
  email_quickTemplates: 'Quick templates',
  email_generateAI: 'Generate with AI',
  email_aiDesc: 'AI will create optimized subject, message and CTA based on your restaurant and audience.',
  email_campaignType: 'Campaign type',
  email_extraInstructions: 'Extra instructions (optional)',
  email_generateContent: 'Generate content with AI',
  email_generating: 'Generating...',
  email_compose: 'Compose campaign',
  email_audience: 'Audience',
  email_subject: 'Email subject',
  email_message: 'Message',
  email_buttonText: 'Button text',
  email_sending: 'Sending...',
  email_sendCampaign: 'Send campaign',
  email_subjectRequired: 'Subject and message are required',
  email_errorSending: 'Error sending',
  email_connectionError: 'Connection error',
  email_errorGenerating: 'Error generating with AI',
  email_sentResult: 'Sent:',
  email_failed: 'failed',
  email_variablesHint: 'Use {name} to personalize with customer name, {restaurant} for your restaurant',
  email_msgVariablesHint: 'Variables: {name}, {total_orders}, {total_spent}, {restaurant}',
  email_typePromo: 'Promotion / Discount',
  email_typeReactivation: 'Reactivate inactive',
  email_typeNewProduct: 'New product',
  email_typeVipThanks: 'VIP thanks',
  email_typeSeasonal: 'Seasonal / Holiday',
  email_filterAll: 'All customers',
  email_filterAllDesc: 'Customers with registered email',
  email_filterVip: 'VIP customers',
  email_filterVipDesc: '5+ orders placed',
  email_filterInactive: 'Inactive (30+ days)',
  email_filterInactiveDesc: "Haven't ordered in 30 days",
  email_filterRecent: 'Recent (7 days)',
  email_filterRecentDesc: 'Ordered in the last 7 days',
  email_filterBigSpenders: 'Big spenders',
  email_filterBigSpendersDesc: 'More than $100 spent',
  email_tplPromo: 'General promotion',
  email_tplMissYou: 'We miss you',
  email_tplNewProduct: 'New product',
  email_tplVipThanks: 'VIP thanks',

  // SMS Campaigns
  sms_totalCustomers: 'Total customers',
  sms_withPhone: 'With phone',
  sms_reachable: 'Reachable',
  sms_willReceive: 'customers will receive the SMS',
  sms_serviceTitle: 'SMS Service',
  sms_serviceDesc: 'To send SMS you need a provider like Twilio or MessageBird. Configure your credentials in environment variables. Estimated cost: $0.01-0.05 USD per SMS depending on the country.',
  sms_quickTemplates: 'Quick templates',
  sms_generateAI: 'Generate SMS with AI',
  sms_generating: 'Generating...',
  sms_compose: 'Compose SMS',
  sms_audience: 'Audience',
  sms_message: 'Message',
  sms_sending: 'Sending...',
  sms_sendCampaign: 'Send SMS campaign',
  sms_messageRequired: 'Message is required',
  sms_errorSending: 'Error sending',
  sms_connectionError: 'Connection error',
  sms_errorGenerating: 'Error generating with AI',
  sms_sentResult: 'Sent:',
  sms_variables: 'Variables: {name}, {restaurant}, {link}',
  sms_filterAll: 'All customers',
  sms_filterAllDesc: 'Customers with registered phone',
  sms_filterVip: 'VIP customers',
  sms_filterVipDesc: '5+ orders placed',
  sms_filterInactive: 'Inactive (30+ days)',
  sms_filterInactiveDesc: "Haven't ordered in 30 days",
  sms_filterRecent: 'Recent (7 days)',
  sms_filterRecentDesc: 'Ordered in the last 7 days',
  sms_tplPromo: 'Promotion',
  sms_tplMissYou: 'We miss you',
  sms_tplNewDish: 'New dish',
  sms_tplThanks: 'Thank you',

  // Social Media
  social_choosePlatform: 'Choose the social network',
  social_generatePost: 'Generate AI post for',
  social_postType: 'Post type',
  social_extraInstructions: 'Extra instructions (optional)',
  social_generateButton: 'Generate post with AI',
  social_generating: 'Generating post...',
  social_captionText: 'Caption / Text',
  social_copyAll: 'Copy all',
  social_copied: 'Copied',
  social_imageIdea: 'Post image',
  social_generateImage: 'Generate image with AI',
  social_generatingImage: 'Generating image...',
  social_downloadImage: 'Download image',
  social_imageError: 'Could not generate image',
  social_bestTime: 'Best time',
  social_proTip: 'Pro tip',
  social_regenerate: 'Generate another version',
  social_typePromo: 'Promotion / Discount',
  social_typeNewDish: 'New dish',
  social_typeDailySpecial: 'Daily special',
  social_typeBehindScenes: 'Behind the scenes',
  social_typeCustomerReview: 'Customer review',
  social_typeGeneral: 'General post',
  social_typeEvent: 'Special event',
  social_typeStory: 'Restaurant story',

  // Automations
  auto_active: 'Automations active',
  auto_paused: 'Automations paused',
  auto_configuredMsg: 'configured',
  auto_enableMsg: 'Enable notifications in Settings > Notifications',
  auto_restaurantToClient: 'Restaurant → Customer',
  auto_platformToOwner: 'MENIUS → Restaurant owner',
  auto_infoText: 'Automations run daily at 10:00 UTC via a Vercel cron job. Real-time emails (order confirmation, alerts) are sent instantly when the event occurs. To enable/disable automations, go to <strong>Settings → Notifications</strong>.',
  auto_statusActive: 'Active',
  auto_statusInactive: 'Inactive',
  auto_reasonNotifOff: 'Notifications disabled',
  auto_reasonNoEmail: 'No email configured',
  auto_reasonNoWhatsApp: 'No WhatsApp configured',
  auto_reasonNoChannels: 'No channels configured',
  auto_orderConfirmTitle: 'Order confirmation',
  auto_orderConfirmDesc: 'Sends automatic confirmation to the customer when they place an order with their email.',
  auto_orderConfirmTrigger: 'Each new order',
  auto_orderStatusTitle: 'Status update',
  auto_orderStatusDesc: 'Notifies the customer when their order status changes (confirmed, preparing, ready, delivered).',
  auto_orderStatusTrigger: 'Order status change',
  auto_ownerAlertTitle: 'New order alert (owner)',
  auto_ownerAlertDesc: 'Sends notification to the restaurant owner every time a new order arrives.',
  auto_welcomeTitle: 'Welcome new customers',
  auto_welcomeDesc: 'Automatic welcome email to customers who place their first order.',
  auto_reactivationTitle: 'Reactivate inactive',
  auto_reactivationDesc: 'Invites customers who haven\'t ordered in 30+ days to come back.',
  auto_reviewRequestTitle: 'Review request',
  auto_reviewRequestDesc: 'Asks the customer for a review 1-2 days after their order was delivered.',
  auto_trialExpiringTitle: 'Trial expiring (MENIUS)',
  auto_trialExpiringDesc: 'Notifies the owner when 3 days or less remain in their free trial.',
  auto_setupIncompleteTitle: 'Empty menu (MENIUS)',
  auto_setupIncompleteDesc: 'Reminds the owner to set up their menu if they have had no products for 2+ days.',
  auto_noOrdersTitle: 'No orders (MENIUS)',
  auto_noOrdersDesc: 'Sends marketing tips to restaurants with products but no orders in 14 days.',
  auto_cronTrigger: 'Daily at 10:00 UTC (cron)',
  auto_eachNewOrder: 'Each new order',
  auto_statusChangeTrigger: 'Order status change',

  // Trial Banner / Free plan banner
  trial_endsToday: 'Your trial ends today',
  trial_daysOfTrial: 'days of trial',
  trial_dayOfTrial: 'day of trial',
  free_planBanner: 'Free plan · 50 orders/mo',
  free_planUpgrade: 'Upgrade',

  // Command Palette
  cmd_searchPlaceholder: 'Search or go to...',
  cmd_noResults: 'No results for',
  cmd_navigate: 'navigate',
  cmd_go: 'go',
  cmd_closeKey: 'close',
  cmd_sectionNav: 'Navigation',
  cmd_sectionActions: 'Actions',
  cmd_createProduct: 'Create product',
  cmd_createCategory: 'Create category',
  cmd_createTable: 'Create table',
  cmd_exportData: 'Export data',

  // Analytics (extended)
  analytics_subtitle: 'Metrics and performance of your restaurant',
  analytics_custom: 'Custom',
  analytics_start: 'Start',
  analytics_end: 'End',
  analytics_loading: 'Loading analytics...',
  analytics_errorLoading: 'Error loading analytics',
  analytics_errorUnknown: 'Unknown error',
  analytics_noDataLoaded: 'Could not load data',
  analytics_retry: 'Retry',
  analytics_startBeforeEnd: 'Start date must be before end date',
  analytics_income: 'Revenue',
  analytics_ordersLabel: 'Orders',
  analytics_avgTicket: 'Avg. ticket',
  analytics_conversionRate: 'Conversion rate',
  analytics_peakHourLabel: 'Peak hour',
  analytics_cancellationsLabel: 'Cancellations',
  analytics_discountsLabel: 'Discounts',
  analytics_salesByDay: 'Sales by day',
  analytics_ordersLegend: 'Orders',
  analytics_noDataPeriod: 'No data in this period',
  analytics_hourlyDist: 'Hourly distribution',
  analytics_orderStatus: 'Order status',
  analytics_topProductsLabel: 'Top products',
  analytics_noDataShort: 'No data',
  analytics_statusPending: 'Pending',
  analytics_statusConfirmed: 'Confirmed',
  analytics_statusPreparing: 'Preparing',
  analytics_statusReady: 'Ready',
  analytics_statusDelivered: 'Delivered',
  analytics_statusCompleted: 'Completed',
  analytics_statusCancelled: 'Cancelled',
  analytics_exportCsv: 'Export CSV',
  analytics_reportPdf: 'Print report (PDF)',

  // Billing (extended)
  billing_title: 'Billing',
  billing_subtitle: 'Manage your subscription, usage and payments in one place.',
  billing_subscriptionActivated: 'Subscription activated successfully. Welcome to MENIUS.',
  billing_processCancelled: 'The process was cancelled. You can try again anytime.',
  billing_noCheckout: 'Could not create the session. Please try again.',
  billing_connectionError: 'Connection error. Check your internet and try again.',
  billing_statusTrialing: 'Free trial',
  billing_statusActive: 'Active',
  billing_statusPastDue: 'Past due',
  billing_statusCanceled: 'Cancelled',
  billing_statusUnpaid: 'Unpaid',
  billing_statusIncomplete: 'Incomplete',
  billing_invPaid: 'Paid',
  billing_invOpen: 'Pending',
  billing_invUncollectible: 'Failed',
  billing_invVoid: 'Voided',
  billing_invDraft: 'Draft',
  billing_unlimited: 'Unlimited',
  billing_planLabel: 'Plan',
  billing_trialPeriod: 'Trial period',
  billing_daysRemaining: 'days remaining',
  billing_dayRemaining: 'day remaining',
  billing_nextBilling: 'Next billing:',
  billing_cancelsAt: 'Cancels on',
  billing_cancelEnd: 'Your plan will cancel at the end of the period',
  billing_trialDowngradeNote: 'When your trial ends, your account will automatically switch to the Free plan. No automatic charges, no credit card required.',
  billing_currentUsage: 'Current usage',
  billing_productsLabel: 'Products',
  billing_tablesLabel: 'Tables',
  billing_teamLabel: 'Team',
  billing_paymentHistory: 'Payment history',
  billing_viewAll: 'View all',
  billing_invoice: 'Invoice',
  billing_downloadPdf: 'Download PDF',
  billing_redirecting: 'Redirecting...',
  billing_manageSubscription: 'Manage subscription',
  billing_updatePayment: 'Update payment',
  billing_subscribeNow: 'Subscribe now',
  billing_upgradeTitle: 'Power up your restaurant',
  billing_upgradeDesc: 'Compare plans and choose the one that best fits your business needs.',
  billing_freePlanLabel: 'Free plan',
  billing_freePrice: 'Free',
  billing_upgradeHeading: 'Upgrade your plan',
  billing_upgradeHeadingDesc: 'Remove limits and unlock all features.',
  billing_noSubscription: 'No active subscription',
  billing_choosePlan: 'Choose a plan to start using MENIUS and digitize your restaurant.',
  billing_perMonth: 'month',
  billing_perYear: 'year',
  billing_monthEquiv: '/mo equivalent',

  // Staff
  staff_title: 'Team',
  staff_inviteMember: 'Invite Member',
  staff_fullName: 'Full name*',
  staff_email: 'Email*',
  staff_role: 'Role*',
  staff_invite: 'Invite',
  staff_cancel: 'Cancel',
  staff_noMembers: 'No team members.',
  staff_noMembersDesc: 'Invite your team to help manage the restaurant.',
  staff_deleteConfirm: 'Remove this team member?',
  staff_toggleActivate: 'Activate',
  staff_toggleDeactivate: 'Deactivate',
  staff_changeRoleConfirm: 'Change this member\'s role?',
  staff_roleAdmin: 'Admin',
  staff_roleManager: 'Manager',
  staff_roleStaff: 'Waiter',
  staff_roleKitchen: 'Kitchen',
  staff_statusPending: 'Pending',
  staff_statusActive: 'Active',
  staff_statusInactive: 'Inactive',

  // Promotions
  promo_title: 'Promotions & Coupons',
  promo_newPromotion: 'New Promotion',
  promo_code: 'Code*',
  promo_description: 'Description',
  promo_discountType: 'Discount type*',
  promo_percentage: 'Percentage (%)',
  promo_fixedAmount: 'Fixed amount ($)',
  promo_value: 'Value*',
  promo_minOrder: 'Minimum order ($)',
  promo_maxUses: 'Maximum uses',
  promo_unlimited: 'Unlimited',
  promo_expiresAt: 'Expiration date',
  promo_createPromotion: 'Create Promotion',
  promo_cancel: 'Cancel',
  promo_noPromos: 'No promotions created.',
  promo_noPromosDesc: 'Create your first discount coupon.',
  promo_discount: 'discount',
  promo_uses: 'Uses:',
  promo_expires: 'Expires:',
  promo_activate: 'Activate',
  promo_deactivate: 'Deactivate',
  promo_deleteConfirm: 'Delete this promotion?',
  promo_errorSaving: 'Error saving promotion',

  // Data & Privacy
  data_title: 'Data & Privacy',
  data_subtitle: 'Manage your personal data and restaurant data in accordance with GDPR and privacy laws.',
  data_exportTitle: 'Export my data',
  data_exportDesc: 'Download a complete copy of all your data: restaurant, menu, orders, customers and settings.',
  data_restaurantInfo: 'Restaurant information',
  data_fullMenu: 'Full menu (categories, products)',
  data_orderHistory: 'Order history',
  data_customerBase: 'Customer base',
  data_subscriptionData: 'Subscription data',
  data_downloading: 'Preparing export...',
  data_downloadJson: 'Download my data (JSON)',
  data_deleteTitle: 'Delete account',
  data_deleteDesc: 'Permanently delete your account, restaurant, menu, customers and order history. This action is <strong>irreversible</strong>.',
  data_deleteButton: 'Delete my account',
  data_deleteConfirmText: 'To confirm, type <span class="font-mono font-bold">DELETE</span> in the field below:',
  data_deleting: 'Deleting...',
  data_confirmDeletion: 'Confirm deletion',
  data_cancelButton: 'Cancel',
  data_gdprNote: 'You have rights over your data under GDPR (General Data Protection Regulation). For more information, see our',
  data_privacyLink: 'Privacy Policy',
  data_errorExport: 'Could not export data. Please try again.',
  data_errorDelete: 'Error deleting account.',
  data_networkError: 'Network error. Please try again.',
  data_typeConfirm: 'Type exactly DELETE to confirm.',

  // Subscription Expired
  expired_title: 'Your trial period has ended',
  expired_desc: 'Your menu, products and settings are safe. Choose a plan to continue receiving orders and using the dashboard.',
  expired_errorPayment: 'Could not create the payment session. Please try again.',
  expired_connectionError: 'Connection error. Check your internet and try again.',
  expired_logout: 'Log out',

  // Verify Email
  verify_title: 'Verify your email',
  verify_desc: 'To access the dashboard you need to confirm your email address. Check your inbox and click the link we sent you.',
  verify_sent: 'Done! Check your email, the link may take 1-2 minutes.',
  verify_resend: 'Resend verification email',
  verify_resending: 'Sending...',
  verify_logout: 'Log out',
};

const dashboardTranslations: Record<DashboardLocale, DashboardTranslations> = { es, en };

export function getDashboardTranslations(locale: DashboardLocale): DashboardTranslations {
  return dashboardTranslations[locale] ?? dashboardTranslations.es;
}
