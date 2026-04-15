'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRestaurant, createProduct } from '@/lib/actions/restaurant';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { createRestaurantSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const WIZARD_TEXT = {
  es: {
    businessType: '¿Qué tipo de negocio tienes?',
    businessTypeDesc: 'Así preparamos la mejor experiencia para ti.',
    skip: 'Omitir →',
    types: { restaurante: 'Restaurante', cafeteria: 'Cafetería / Bar', foodtruck: 'Food Truck', otro: 'Otro' },
    createTitle: 'Crea tu restaurante',
    createDesc: 'Configura lo básico y te prepararemos un menú de ejemplo listo para editar.',
    restaurantName: 'Nombre del restaurante',
    restaurantNamePlaceholder: 'Mi Restaurante',
    menuUrl: 'URL de tu menú',
    checking: 'Verificando...',
    available: 'Disponible',
    unavailable: 'No disponible',
    slugTaken: 'Esta URL ya está en uso. Prueba con otra.',
    slugPrefix: 'Tu menú estará en:',
    menuLanguage: 'Idioma del menú / Menu language',
    currency: 'Moneda',
    timezone: 'Zona horaria',
    continue: 'Continuar →',
    creating: 'Creando tu restaurante...',
    seedNote: 'Se generará un menú de ejemplo con categorías, productos y mesas para que veas cómo funciona.',
    productsTitle: '¿Qué vendes?',
    productsDesc: 'Agrega tus primeros platillos. Con nombre y precio ya aparecen en tu menú.',
    productLabel: 'Platillo',
    productOptional: 'opcional',
    pricePlaceholder: 'Precio',
    launch: '¡Lanzar mi menú! →',
    launching: 'Creando tu menú...',
    skipProducts: 'Omitir por ahora →',
    successTitle: '¡Tu restaurante está listo!',
    successDesc: 'Ya puedes recibir pedidos, gestionar tu menú y ver todo en tiempo real desde el Counter.',
    quickWins: [
      { icon: '🍽', title: 'Tu menú ya está en línea', sub: (slug: string) => `menius.app/${slug} — compártelo ahora` },
      { icon: '📲', title: 'Clientes pueden pedir desde su celular', sub: 'Escanean el QR de tu mesa y listo' },
      { icon: '🔔', title: 'Los pedidos te llegan al instante', sub: 'Te avisamos en tu celular o tablet' },
    ],
    viewOrders: 'Ver cómo llegan mis pedidos →',
    goDashboard: 'Ir a mi panel →',
    stepOf: 'Paso',
    stepOfTotal: 'de',
    stepTime: '~2 min',
    atLeastOne: 'Agrega al menos un platillo',
    invalidPrice: (name: string) => `El precio de "${name}" no es válido`,
    productPlaceholders: ['Ej: Hamburguesa clásica', 'Ej: Refresco', 'Ej: Papas fritas'],
  },
  en: {
    businessType: 'What type of business do you have?',
    businessTypeDesc: "We'll prepare the best experience for you.",
    skip: 'Skip →',
    types: { restaurante: 'Restaurant', cafeteria: 'Café / Bar', foodtruck: 'Food Truck', otro: 'Other' },
    createTitle: 'Create your restaurant',
    createDesc: "Set up the basics and we'll prepare a sample menu ready to edit.",
    restaurantName: 'Restaurant name',
    restaurantNamePlaceholder: 'My Restaurant',
    menuUrl: 'Your menu URL',
    checking: 'Checking...',
    available: 'Available',
    unavailable: 'Not available',
    slugTaken: 'This URL is already taken. Try another.',
    slugPrefix: 'Your menu will be at:',
    menuLanguage: 'Menu language',
    currency: 'Currency',
    timezone: 'Timezone',
    continue: 'Continue →',
    creating: 'Creating your restaurant...',
    seedNote: "A sample menu with categories, products and tables will be generated so you can see how it works.",
    productsTitle: 'What do you sell?',
    productsDesc: 'Add your first dishes. With a name and price they already appear on your menu.',
    productLabel: 'Item',
    productOptional: 'optional',
    pricePlaceholder: 'Price',
    launch: 'Launch my menu! →',
    launching: 'Creating your menu...',
    skipProducts: 'Skip for now →',
    successTitle: 'Your restaurant is ready!',
    successDesc: 'You can now receive orders, manage your menu and see everything in real time from the Counter.',
    quickWins: [
      { icon: '🍽', title: 'Your menu is live', sub: (slug: string) => `menius.app/${slug} — share it now` },
      { icon: '📲', title: 'Customers can order from their phone', sub: 'They scan the QR on your table and go' },
      { icon: '🔔', title: 'Orders arrive instantly', sub: "We'll notify you on your phone or tablet" },
    ],
    viewOrders: 'See how orders come in →',
    goDashboard: 'Go to my dashboard →',
    stepOf: 'Step',
    stepOfTotal: 'of',
    stepTime: '~2 min',
    atLeastOne: 'Add at least one item',
    invalidPrice: (name: string) => `The price for "${name}" is not valid`,
    productPlaceholders: ['e.g. Classic Burger', 'e.g. Soft Drink', 'e.g. French Fries'],
  },
};

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — Dólar americano ($)' },
  { code: 'MXN', label: 'MXN — Peso mexicano ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'COP', label: 'COP — Peso colombiano ($)' },
  { code: 'PEN', label: 'PEN — Sol peruano (S/)' },
  { code: 'ARS', label: 'ARS — Peso argentino ($)' },
  { code: 'CLP', label: 'CLP — Peso chileno ($)' },
  { code: 'DOP', label: 'DOP — Peso dominicano ($)' },
  { code: 'BRL', label: 'BRL — Real brasileño (R$)' },
  { code: 'GBP', label: 'GBP — Libra esterlina (£)' },
];

const TIMEZONES = [
  { tz: 'America/New_York', label: 'New York (EST/EDT)' },
  { tz: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { tz: 'America/Denver', label: 'Denver (MST/MDT)' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { tz: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { tz: 'America/Bogota', label: 'Bogotá (COT)' },
  { tz: 'America/Lima', label: 'Lima (PET)' },
  { tz: 'America/Santiago', label: 'Santiago (CLT)' },
  { tz: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { tz: 'America/Santo_Domingo', label: 'Santo Domingo (AST)' },
  { tz: 'Europe/Madrid', label: 'Madrid (CET)' },
  { tz: 'Europe/London', label: 'Londres (GMT/BST)' },
];


export default function CreateRestaurantPage() {
  const router = useRouter();

  // Detect browser/cookie locale for UI language
  const uiLocale: 'es' | 'en' = (() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/menius_locale=(\w+)/);
      if (match?.[1] === 'en') return 'en';
    }
    return 'es';
  })();
  const ui = WIZARD_TEXT[uiLocale];

  // Step 0 (intent) + Step 1–4 state
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [locale, setLocale] = useState(uiLocale); // default menu language to UI locale
  const [currency, setCurrency] = useState(uiLocale === 'en' ? 'USD' : 'MXN');
  const [timezone, setTimezone] = useState(uiLocale === 'en' ? 'America/New_York' : 'America/Mexico_City');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);

  // Step 3 state — up to 3 products
  const [products, setProducts] = useState([
    { name: '', price: '' },
    { name: '', price: '' },
    { name: '', price: '' },
  ]);
  const [productError, setProductError] = useState('');
  const [productLoading, setProductLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    const newSlug = slugify(val);
    setSlug(newSlug);
    triggerSlugCheck(newSlug);
  };

  const triggerSlugCheck = (s: string) => {
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    if (!s || s.length < 2) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    slugDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/slug-check?slug=${encodeURIComponent(s)}`);
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  };

  useEffect(() => () => { if (slugDebounce.current) clearTimeout(slugDebounce.current); }, []);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = createRestaurantSchema.safeParse({ name, slug, timezone, currency, locale });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await createRestaurant(parsed.data);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    trackEvent('restaurant_created', {
      restaurant_name: parsed.data.name,
      slug: parsed.data.slug,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      business_type: businessType || 'unknown',
    });
    // Fetch the first seeded category so products can be assigned to it in Step 3
    if (result.restaurantId) {
      try {
        const supabase = getSupabaseBrowser();
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .eq('restaurant_id', result.restaurantId)
          .order('sort_order', { ascending: true })
          .limit(1);
        if (cats?.[0]?.id) setCreatedCategoryId(cats[0].id);
      } catch { /* non-critical — products will still be created without category */ }
    }
    setLoading(false);
    setStep(3);
  };


  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validProducts = products.filter((p) => p.name.trim());
    if (validProducts.length === 0) {
      setProductError(ui.atLeastOne);
      return;
    }
    for (const p of validProducts) {
      const price = parseFloat(p.price);
      if (isNaN(price) || price < 0) {
        setProductError(ui.invalidPrice(p.name));
        return;
      }
    }
    setProductError('');
    setProductLoading(true);
    for (const p of validProducts) {
      const result = await createProduct({
        name: p.name.trim(),
        description: '',
        price: parseFloat(p.price) || 0,
        category_id: createdCategoryId ?? '',
        is_active: true,
      });
      if (result?.error) {
        setProductError(result.error);
        setProductLoading(false);
        return;
      }
    }
    setProductLoading(false);
    trackEvent('onboarding_step_completed', { step: 3, step_name: 'first_products', product_count: validProducts.length });
    trackEvent('onboarding_completed', { completed_all_steps: true });
    setStep(4);
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm placeholder-gray-500 focus:outline-none transition-colors ${
      focused === field ? 'border-emerald-500/40' : ''
    }`;

  const wrapClass = (field: string) =>
    `relative rounded-xl transition-all duration-300 ${
      focused === field ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : ''
    }`;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-10 landing-bg noise-overlay relative overflow-x-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>

          {/* Step indicator — hidden in step 0, step 2 doesn't exist, remap 3→2, 4→3 */}
          {step > 0 && step < 4 && (
            <>
              <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                {[1, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      s === step ? 'w-10 bg-emerald-500' : s < step ? 'w-8 bg-emerald-500/40' : 'w-8 bg-white/[0.08]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-3">
                <p className="text-xs text-gray-600 tabular-nums">
                  {ui.stepOf} {step === 1 ? 1 : step === 3 ? 2 : 3} {ui.stepOfTotal} 3
                </p>
                <span className="text-[10px] text-gray-700">·</span>
                <p className="text-[10px] text-gray-600">{ui.stepTime}</p>
              </div>
            </>
          )}
        </div>

        {/* ── STEP 0: Business type ── */}
        {step === 0 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{ui.businessType}</h1>
              <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
                {ui.businessTypeDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { type: 'restaurante', icon: '🍽', label: ui.types.restaurante },
                { type: 'cafeteria', icon: '☕', label: ui.types.cafeteria },
                { type: 'foodtruck', icon: '🚚', label: ui.types.foodtruck },
                { type: 'otro', icon: '🛒', label: ui.types.otro },
              ].map(({ type, icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setBusinessType(type); setStep(1); }}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-200 group"
                >
                  <span className="text-3xl">{icon}</span>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{label}</span>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[12px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                {ui.skip}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 1: Restaurant info ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{ui.createTitle}</h1>
              <p className="text-gray-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
                {ui.createDesc}
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <form onSubmit={handleStep1Submit} className="bg-[#0a0a0a] rounded-2xl p-8 space-y-6">
                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-red-400 text-[13px]">{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{ui.restaurantName}</label>
                  <div className={wrapClass('name')}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      className={inputClass('name')}
                      placeholder={ui.restaurantNamePlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400">{ui.menuUrl}</label>
                    {slugStatus === 'checking' && (
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        {ui.checking}
                      </span>
                    )}
                    {slugStatus === 'available' && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {ui.available}
                      </span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        {ui.unavailable}
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center rounded-xl overflow-hidden transition-all duration-300 ${
                    focused === 'slug' ? 'ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' :
                    slugStatus === 'available' ? 'ring-1 ring-emerald-500/20' :
                    slugStatus === 'taken' ? 'ring-1 ring-red-500/20' : ''
                  }`}>
                    <span className="px-3.5 py-3.5 text-[15px] md:text-sm text-gray-500 border-r border-white/[0.08] bg-white/[0.04] flex-shrink-0">
                      menius.app/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setSlug(v);
                        triggerSlugCheck(v);
                      }}
                      onFocus={() => setFocused('slug')}
                      onBlur={() => setFocused(null)}
                      className="flex-1 px-3 py-3.5 text-[15px] md:text-sm bg-white/[0.04] border-y border-r border-white/[0.08] rounded-r-xl text-white placeholder-gray-500 focus:outline-none"
                      placeholder="my-restaurant"
                    />
                  </div>
                  {slug && slugStatus !== 'taken' && (
                    <p className="text-[11px] text-gray-600 mt-1.5 ml-1">
                      {ui.slugPrefix} <span className="text-gray-400">menius.app/{slug}</span>
                    </p>
                  )}
                  {slugStatus === 'taken' && (
                    <p className="text-[11px] text-red-400 mt-1.5 ml-1">
                      {ui.slugTaken}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{ui.menuLanguage}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLocale(l.code)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          locale === l.code
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{ui.currency}</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code} className="bg-[#0a0a0a] text-white">{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{ui.timezone}</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[15px] md:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all appearance-none cursor-pointer"
                    >
                      {TIMEZONES.map((t) => (
                        <option key={t.tz} value={t.tz} className="bg-[#0a0a0a] text-white">{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name.trim() || slugStatus === 'taken'}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] md:text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      {ui.creating}
                    </span>
                  ) : ui.continue}
                </button>

                <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                  {ui.seedNote}
                </p>
              </form>
            </div>
          </>
        )}


        {/* ── STEP 3: First products (up to 3) ── */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75M8.25 15l1.5.75M8.25 15l-1.5.75m0 0L5.25 15M15.75 15.75 14.25 15m1.5.75-1.5-.75M15.75 15.75l1.5-.75" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{ui.productsTitle}</h1>
              <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {ui.productsDesc}
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <form onSubmit={handleStep3Submit} className="bg-[#0a0a0a] rounded-2xl p-8 space-y-5">
                {productError && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                    <span className="text-red-400 text-[13px]">{productError}</span>
                  </div>
                )}

                {products.map((p, idx) => (
                  <div key={idx} className="space-y-3">
                    {idx === 0 && (
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold">
                        {ui.productLabel} {idx + 1}
                      </p>
                    )}
                    {idx > 0 && products[idx - 1].name.trim() && (
                      <p className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold">
                        {ui.productLabel} {idx + 1} <span className="text-gray-700 normal-case font-normal">({ui.productOptional})</span>
                      </p>
                    )}
                    {(idx === 0 || products[idx - 1].name.trim()) && (
                      <div className="flex gap-2">
                        <div className={`flex-1 ${wrapClass(`prod-${idx}`)}`}>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const updated = [...products];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setProducts(updated);
                            }}
                            onFocus={() => setFocused(`prod-${idx}`)}
                            onBlur={() => setFocused(null)}
                            className={inputClass(`prod-${idx}`)}
                            placeholder={ui.productPlaceholders[idx]}
                            autoFocus={idx === 0}
                          />
                        </div>
                        <div className={`w-28 ${wrapClass(`price-${idx}`)}`}>
                          <input
                            type="number"
                            value={p.price}
                            onChange={(e) => {
                              const updated = [...products];
                              updated[idx] = { ...updated[idx], price: e.target.value };
                              setProducts(updated);
                            }}
                            onFocus={() => setFocused(`price-${idx}`)}
                            onBlur={() => setFocused(null)}
                            className={inputClass(`price-${idx}`)}
                            placeholder={ui.pricePlaceholder}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={productLoading || !products[0].name.trim()}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-[15px] md:text-sm hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {productLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      {ui.launching}
                    </span>
                  ) : ui.launch}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    trackEvent('onboarding_step_skipped', { step: 3, step_name: 'first_products' });
                    trackEvent('onboarding_completed', { completed_all_steps: false });
                    setStep(4);
                  }}
                  className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {ui.skipProducts}
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── STEP 4: First win celebration ── */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              {/* Animated success icon with pulsing ring */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                  <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{ui.successTitle}</h1>
              <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
                {ui.successDesc}
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-emerald-500/[0.12] to-white/[0.02]">
              <div className="bg-[#0a0a0a] rounded-2xl p-8 space-y-4">
                {/* Quick wins with plain language */}
                {ui.quickWins.map((item) => ({ ...item, sub: item.sub(slug || 'my-restaurant') })).map((item) => (
                  <div key={item.icon} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}

                <a
                  href="/app/counter/tablet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-[15px] md:text-sm hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  {ui.viewOrders}
                </a>

                <button
                  type="button"
                  onClick={() => router.push('/app')}
                  className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {ui.goDashboard}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
