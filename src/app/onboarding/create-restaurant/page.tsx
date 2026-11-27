'use client';

import { useState, useEffect, useRef, Suspense, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createRestaurant, createProduct } from '@/lib/actions/restaurant';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { getCreateRestaurantSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { COUNTRY_CONFIG_LIST, COUNTRY_CONFIGS, formatTimezone } from '@/lib/country-config';
import { SUPPORT_CONTACT } from '@/lib/support-contact';
import { lv2SerifItalic, lv2Stamp } from '@/components/landing-v2/fonts';
import { Alert, Spinner } from '@/components/landing-v2/auth-bits';
import '@/components/landing-v2/landing-v2.css';
import '@/components/landing-v2/lv2-pages.css';

type BusinessType = 'restaurante' | 'cafeteria' | 'foodtruck' | 'otro';

const WIZARD_TEXT = {
  es: {
    businessType: '¿Qué tipo de negocio tienes?',
    businessTypeDesc: 'Así preparamos la mejor experiencia para ti.',
    skip: 'Omitir →',
    types: { restaurante: 'Restaurante', cafeteria: 'Cafetería / Bar', foodtruck: 'Food Truck', otro: 'Otro' } as Record<BusinessType, string>,
    createTitle: 'Crea tu restaurante',
    createDesc: 'Configura lo básico y te prepararemos un menú de ejemplo listo para editar.',
    restaurantName: 'Nombre del restaurante',
    restaurantNamePlaceholder: 'Mi Restaurante',
    menuUrl: 'URL de tu menú',
    checking: 'Verificando...',
    available: 'Disponible',
    unavailable: 'No disponible',
    slugTaken: 'Esta URL ya está en uso. Prueba con otra.',
    createFailed: 'No pudimos crear tu restaurante. Inténtalo de nuevo.',
    slugPrefix: 'Tu menú estará en:',
    menuLanguage: 'Idioma del menú / Menu language',
    currency: 'Moneda',
    timezone: 'Zona horaria',
    chooseCountry: 'Elige el país de tu restaurante',
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
      { title: 'Tu menú ya está en línea', sub: (s: string) => `menius.app/${s} — compártelo ahora` },
      { title: 'Clientes pueden pedir desde su celular', sub: (_s: string) => 'Escanean el QR de tu mesa y listo' },
      { title: 'Los pedidos te llegan al instante', sub: (_s: string) => 'Te avisamos en tu celular o tablet' },
    ],
    viewOrders: 'Ver cómo llegan mis pedidos →',
    goDashboard: 'Ir a mi panel →',
    stepOf: 'Paso',
    stepOfTotal: 'de',
    stepTime: '~2 min',
    needHand: '¿Necesitas ayuda?',
    yourPage: 'Tu página',
    previewLabel: 'Vista previa de la página de pedidos',
    previewAlt: 'Una página de pedidos de MENIUS en un celular',
    atLeastOne: 'Agrega al menos un platillo',
    invalidPrice: (name: string) => `El precio de "${name}" no es válido`,
    productPlaceholders: ['Ej: Hamburguesa clásica', 'Ej: Refresco', 'Ej: Papas fritas'],
    planTitle: 'Elige tu plan',
    planDesc: 'Pro es gratis por 14 días, sin tarjeta. Antes del día 14 te pediremos una tarjeta para seguir en Pro; si no la agregas, pasas a Free.',
    planRecommended: 'Recomendado',
    planStartTrial: 'Empezar mi prueba gratis',
    planProNote: '14 días gratis, sin tarjeta. Después, mes a mes.',
    planFreeNote: 'Si a los 14 días no agregas una tarjeta, pasas a Free.',
    plans: [
      { id: 'pro', name: 'Pro', price: '$149', priceSuffix: '/mes', desc: 'Todo incluido: pedidos online, pagos, KDS y marketing.', features: ['Pickup + Delivery', 'Pagos online (0% comisión de MENIUS)', 'Dominio propio', 'Pantalla de cocina y promociones', 'Sin marca MENIUS'], recommended: true },
      { id: 'free', name: 'Free', price: '$0', priceSuffix: '/mes', desc: 'Para probar. Hasta 5 mesas, solo dine-in en efectivo.', features: ['Menú digital + QR (5 mesas)', 'Hasta 15 productos', 'Pedidos ilimitados', 'Solo efectivo', 'Branding "Powered by MENIUS"'], recommended: false },
    ],
  },
  en: {
    businessType: 'What type of business do you have?',
    businessTypeDesc: "We'll prepare the best experience for you.",
    skip: 'Skip →',
    types: { restaurante: 'Restaurant', cafeteria: 'Café / Bar', foodtruck: 'Food Truck', otro: 'Other' } as Record<BusinessType, string>,
    createTitle: 'Create your restaurant',
    createDesc: "Set up the basics and we'll prepare a sample menu ready to edit.",
    restaurantName: 'Restaurant name',
    restaurantNamePlaceholder: 'My Restaurant',
    menuUrl: 'Your menu URL',
    checking: 'Checking...',
    available: 'Available',
    unavailable: 'Not available',
    slugTaken: 'This URL is already taken. Try another.',
    createFailed: "We couldn't create your restaurant. Please try again.",
    slugPrefix: 'Your menu will be at:',
    menuLanguage: 'Menu language',
    currency: 'Currency',
    timezone: 'Timezone',
    chooseCountry: "Choose your restaurant's country",
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
      { title: 'Your menu is live', sub: (s: string) => `menius.app/${s} — share it now` },
      { title: 'Customers can order from their phone', sub: (_s: string) => 'They scan the QR on your table and go' },
      { title: 'Orders arrive instantly', sub: (_s: string) => "We'll notify you on your phone or tablet" },
    ],
    viewOrders: 'See how orders come in →',
    goDashboard: 'Go to my dashboard →',
    stepOf: 'Step',
    stepOfTotal: 'of',
    stepTime: '~2 min',
    needHand: 'Need a hand?',
    yourPage: 'Your page',
    previewLabel: 'Preview of the ordering page',
    previewAlt: 'A MENIUS ordering page on a phone',
    atLeastOne: 'Add at least one item',
    invalidPrice: (name: string) => `The price for "${name}" is not valid`,
    productPlaceholders: ['e.g. Classic Burger', 'e.g. Soft Drink', 'e.g. French Fries'],
    planTitle: 'Choose your plan',
    planDesc: 'Pro is free for 14 days, no card required. Before day 14 we’ll ask for a card to keep Pro; if you don’t add one, you move to Free.',
    planRecommended: 'Recommended',
    planStartTrial: 'Start my free trial',
    planProNote: '14 days free, no card. Month-to-month after that.',
    planFreeNote: 'After 14 days without a card, you move to Free.',
    plans: [
      { id: 'pro', name: 'Pro', price: '$149', priceSuffix: '/mo', desc: 'Everything included: online orders, payments, KDS and marketing.', features: ['Pickup + Delivery', 'Online payments (0% MENIUS commission)', 'Custom domain', 'Kitchen display screen and promotions', 'No MENIUS branding'], recommended: true },
      { id: 'free', name: 'Free', price: '$0', priceSuffix: '/mo', desc: 'Try it out. Up to 5 tables, cash dine-in only.', features: ['Digital menu + QR (5 tables)', 'Up to 15 products', 'Unlimited orders', 'Cash only', '"Powered by MENIUS" branding'], recommended: false },
    ],
  },
};

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

const ICON = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true } as const;

/** Íconos de línea en lugar de los emojis de antes (maqueta fase 2). */
const BUSINESS_TYPES: { type: BusinessType; icon: ReactNode }[] = [
  { type: 'restaurante', icon: <svg {...ICON}><path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 21V3c-2.2 0-4 2.5-4 6s1.3 4 4 4" /></svg> },
  { type: 'cafeteria', icon: <svg {...ICON}><path d="M4 8h13v5a6 6 0 01-6 6h-1a6 6 0 01-6-6V8zM17 9h1.5a2.5 2.5 0 010 5H17M7 3v2M11 3v2M15 3v2" /></svg> },
  { type: 'foodtruck', icon: <svg {...ICON}><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg> },
  { type: 'otro', icon: <svg {...ICON}><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h8.2a2 2 0 002-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></svg> },
];

export default function CreateRestaurantPage() {
  return (
    <Suspense fallback={null}>
      <CreateRestaurantPageInner />
    </Suspense>
  );
}

function CreateRestaurantPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect browser/cookie locale after hydration to avoid SSR mismatch
  // EN por defecto (como la landing); ES si la cookie lo dice.
  const [uiLocale, setUiLocale] = useState<'es' | 'en'>('en');
  const ui = WIZARD_TEXT[uiLocale];

  // Step 0 (intent) + Step 1–4 state
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // No default country: a default (it used to be Mexico for every non-English
  // browser) went unnoticed and the Stripe account was then created in that
  // country for good. The owner picks it.
  const [countryCode, setCountryCode] = useState<string>('');
  const [locale, setLocale] = useState<string>('es');
  const [currency, setCurrency] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

  const handleCountryChange = (code: string) => {
    const config = COUNTRY_CONFIGS[code];
    if (!config) return;
    setCountryCode(code);
    setCurrency(config.currency);
    setTimezone(config.timezone);
    setLocale(config.menuLocale);
  };

  useEffect(() => {
    const match = document.cookie.match(/menius_locale=(\w+)/);
    if (match?.[1] === 'es') setUiLocale('es');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (!COUNTRY_CONFIGS[countryCode]) {
      setError(ui.chooseCountry);
      return;
    }
    const parsed = getCreateRestaurantSchema(uiLocale).safeParse({ name, slug, country_code: countryCode, timezone, currency, locale });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const result = await createRestaurant(parsed.data);
    if (result?.error) {
      // The action answers in Spanish (or with the raw DB error): show the
      // wizard's own text in the interface language instead.
      setError(/slug ya está en uso|duplicate key.*slug/i.test(result.error) ? ui.slugTaken : ui.createFailed);
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

  // Progreso: pasos reales 1, 3 y 4 = "1 de 3", "2 de 3", "3 de 3". En el 0 y
  // el 5 la barra no se muestra (queda su lugar, sin salto).
  const progIndex = step === 1 ? 1 : step === 3 ? 2 : step === 4 ? 3 : 0;
  const progLabel = `${ui.stepOf} ${progIndex || 1} ${ui.stepOfTotal} 3`;
  const pageUrl = `menius.app/${slug || 'my-restaurant'}`;

  const preview = (
    <figure className="ob-shot" aria-label={ui.previewLabel}>
      <div className="tile">
        <div className="phone">
          <div className="scr">
            <Image src="/landing/v2/store-menu-v1.webp" alt={ui.previewAlt} width={600} height={1298} quality={80} sizes="216px" />
          </div>
        </div>
      </div>
      <figcaption>
        <span>{ui.yourPage}</span>
        <b>{pageUrl}</b>
      </figcaption>
    </figure>
  );

  return (
    <div className={`lv2 lv2p root-scroll ${lv2SerifItalic.variable} ${lv2Stamp.variable}`} lang={uiLocale}>
      <header className="ob-head">
        <div className="wrap">
          <Link className="logo" href="/" aria-label="MENIUS">
            MENIUS<i aria-hidden="true" />
          </Link>
          <div className="prog" aria-label={progLabel} style={progIndex ? undefined : { visibility: 'hidden' }}>
            <span className="bars" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <i key={n} className={n < progIndex ? 'on' : n === progIndex ? 'now' : undefined} />
              ))}
            </span>
            <span>{progLabel}</span>
            <small>{ui.stepTime}</small>
          </div>
          <p className="ob-help">
            <span>{ui.needHand}</span>
            <a href={`tel:${SUPPORT_CONTACT.phoneE164}`}>{SUPPORT_CONTACT.phoneDisplay}</a>
          </p>
        </div>
      </header>

      <main id="main-content" className="ob">
        <div className="wrap">
          {/* ── STEP 0: Business type ── */}
          {step === 0 && (
            <div className="ob-grid">
              <div className="ob-copy">
                <h1>{ui.businessType}</h1>
                <p className="lead">{ui.businessTypeDesc}</p>
              </div>
              <div>
                <div className="types">
                  {BUSINESS_TYPES.map(({ type, icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setBusinessType(type); setStep(1); }}
                    >
                      {icon}
                      {ui.types[type]}
                    </button>
                  ))}
                </div>
                <button type="button" className="skip" onClick={() => setStep(1)}>
                  {ui.skip}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Restaurant info ── */}
          {step === 1 && (
            <div className="ob-grid">
              <div className="ob-copy">
                <h1>{ui.createTitle}</h1>
                <p className="lead">{ui.createDesc}</p>
                {preview}
              </div>
              <form onSubmit={handleStep1Submit} className="auth-card">
                <div className="form">
                  {error && <Alert>{error}</Alert>}

                  <div className="fld">
                    <label htmlFor="ob-name">{ui.restaurantName}</label>
                    <input
                      id="ob-name"
                      className="inp"
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={ui.restaurantNamePlaceholder}
                      autoComplete="organization"
                    />
                  </div>

                  <div className="fld">
                    <div className="lbl-row">
                      <label htmlFor="ob-slug">{ui.menuUrl}</label>
                      {slugStatus === 'checking' && (
                        <span key="checking" className="hint slug-st" aria-live="polite">
                          <Spinner />
                          {ui.checking}
                        </span>
                      )}
                      {slugStatus === 'available' && (
                        <span key="available" className="hint is-ok slug-st" aria-live="polite">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                          {ui.available}
                        </span>
                      )}
                      {slugStatus === 'taken' && (
                        <span key="taken" className="hint is-bad slug-st" aria-live="polite">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M6 18L18 6M6 6l12 12" /></svg>
                          {ui.unavailable}
                        </span>
                      )}
                    </div>
                    <div className="prefix-fld" data-state={slugStatus}>
                      <span>menius.app/</span>
                      <input
                        id="ob-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setSlug(v);
                          triggerSlugCheck(v);
                        }}
                        placeholder="my-restaurant"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                    </div>
                    {slug && slugStatus !== 'taken' && (
                      <p className="hint">
                        {ui.slugPrefix} <b>menius.app/{slug}</b>
                      </p>
                    )}
                    {slugStatus === 'taken' && <p className="hint is-bad">{ui.slugTaken}</p>}
                  </div>

                  <div className="fld">
                    <span className="lbl" id="ob-lang">{ui.menuLanguage}</span>
                    <div className="seg2" role="group" aria-labelledby="ob-lang">
                      {LANGUAGES.map((l) => (
                        <button key={l.code} type="button" aria-pressed={locale === l.code} onClick={() => setLocale(l.code)}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Country — auto-fills currency, timezone and language */}
                  <div className="fld">
                    <label htmlFor="ob-country">{uiLocale === 'en' ? 'Country' : 'País'}</label>
                    <select
                      id="ob-country"
                      className="sel"
                      value={countryCode}
                      required
                      onChange={(e) => handleCountryChange(e.target.value)}
                    >
                      <option value="" disabled>
                        {ui.chooseCountry}
                      </option>
                      {COUNTRY_CONFIG_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} — {c.currency}
                        </option>
                      ))}
                    </select>
                    {COUNTRY_CONFIGS[countryCode] && (
                      <p className="hint">
                        {COUNTRY_CONFIGS[countryCode].currency} · +{COUNTRY_CONFIGS[countryCode].phonePrefix} · {formatTimezone(COUNTRY_CONFIGS[countryCode].timezone)}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading || !name.trim() || !countryCode || slugStatus === 'taken' || slugStatus === 'checking'}
                  >
                    {loading ? (
                      <>
                        <Spinner />
                        {ui.creating}
                      </>
                    ) : ui.continue}
                  </button>
                  <p className="hint seed-note">{ui.seedNote}</p>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: First products (up to 3) ── */}
          {step === 3 && (
            <div className="ob-grid">
              <div className="ob-copy">
                <h1>{ui.productsTitle}</h1>
                <p className="lead">{ui.productsDesc}</p>
                {preview}
              </div>
              <form onSubmit={handleStep3Submit} className="auth-card">
                <div className="form">
                  {productError && <Alert>{productError}</Alert>}

                  <div className="items">
                    {products.map((p, idx) => {
                      if (idx > 0 && !products[idx - 1].name.trim()) return null;
                      return (
                        <div key={idx}>
                          <p className="item-k">
                            {ui.productLabel} {idx + 1}
                            {idx > 0 && <span className="opt"> {ui.productOptional}</span>}
                          </p>
                          <div className="item-row">
                            <input
                              className="inp"
                              type="text"
                              aria-label={`${ui.productLabel} ${idx + 1}`}
                              value={p.name}
                              onChange={(e) => {
                                const updated = [...products];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setProducts(updated);
                              }}
                              placeholder={ui.productPlaceholders[idx]}
                              autoFocus={idx === 0}
                            />
                            <input
                              className="inp"
                              type="number"
                              inputMode="decimal"
                              aria-label={`${ui.productLabel} ${idx + 1} · ${ui.pricePlaceholder}`}
                              value={p.price}
                              onChange={(e) => {
                                const updated = [...products];
                                updated[idx] = { ...updated[idx], price: e.target.value };
                                setProducts(updated);
                              }}
                              placeholder={ui.pricePlaceholder}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={productLoading || !products[0].name.trim()}
                  >
                    {productLoading ? (
                      <>
                        <Spinner />
                        {ui.launching}
                      </>
                    ) : ui.launch}
                  </button>
                  <button
                    type="button"
                    className="skip"
                    onClick={() => {
                      trackEvent('onboarding_step_skipped', { step: 3, step_name: 'first_products' });
                      trackEvent('onboarding_completed', { completed_all_steps: false });
                      setStep(4);
                    }}
                  >
                    {ui.skipProducts}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 4: Plan ──
              La prueba de Pro ya está activa desde el paso 1 (createRestaurant →
              RPC create_restaurant_with_subscription: plan 'pro', status
              'trialing', 14 días, sin tarjeta). "Empezar mi prueba" no manda a
              Stripe: sigue al paso final con la prueba corriendo. Free no es un
              botón porque haría exactamente lo mismo; se muestra como lo que
              pasa al día 14 si no se agrega tarjeta. */}
          {step === 4 && (
            <div className="ob-grid">
              <div className="ob-copy">
                <h1>{ui.planTitle}</h1>
                <p className="lead">{ui.planDesc}</p>
                {preview}
              </div>
              <div className="plans">
                {ui.plans.map((pl) => (
                  <div key={pl.id} className={pl.recommended ? 'pl rec' : 'pl'}>
                    <div className="top">
                      {pl.name}
                      {pl.recommended && <span className="stamp label">{ui.planRecommended}</span>}
                    </div>
                    <div className="pr">
                      {pl.price}
                      <span>{pl.priceSuffix}</span>
                    </div>
                    <p>{pl.desc}</p>
                    <ul>
                      {pl.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {pl.recommended ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          onClick={() => {
                            trackEvent('onboarding_plan_selected', {
                              plan: 'pro',
                              trial: true,
                              card: false,
                              intended_plan: searchParams.get('plan') ?? undefined,
                            });
                            setStep(5);
                          }}
                        >
                          {ui.planStartTrial}
                        </button>
                        <p className="pl-note">{ui.planProNote}</p>
                      </>
                    ) : (
                      <p className="pl-note">{ui.planFreeNote}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 5: First win ── */}
          {step === 5 && (
            <div className="ob-grid">
              <div className="ob-copy">
                <h1>{ui.successTitle}</h1>
                <p className="lead">{ui.successDesc}</p>
              </div>
              <div>
                <ul className="wins">
                  {ui.quickWins.map((item) => (
                    <li key={item.title}>
                      <b>{item.title}</b>
                      <span>{item.sub(slug || 'my-restaurant')}</span>
                    </li>
                  ))}
                </ul>
                <div className="ob-done">
                  <a className="btn btn-primary" href="/app/counter/tablet" target="_blank" rel="noopener noreferrer">
                    {ui.viewOrders}
                  </a>
                  <button type="button" className="tlink" onClick={() => router.push('/app')}>
                    {ui.goDashboard}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
