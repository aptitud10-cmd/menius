'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRestaurant, createCategory, createProduct } from '@/lib/actions/restaurant';
import { createRestaurantSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';

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

const CATEGORY_SUGGESTIONS = [
  'Entradas', 'Platos principales', 'Bebidas', 'Postres', 'Ensaladas', 'Pizzas',
  'Hamburguesas', 'Tacos', 'Sushi', 'Desayunos', 'Snacks', 'Especiales del día',
  'Sodas & Refrescos', 'Cervezas', 'Licores',
];

export default function CreateRestaurantPage() {
  const router = useRouter();

  // Step 0 (intent) + Step 1–4 state
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [locale, setLocale] = useState('es');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2 state
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);

  // Step 3 state
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
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
    setLoading(false);
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('Ingresa el nombre de la categoría');
      return;
    }
    setCategoryError('');
    setCategoryLoading(true);
    const result = await createCategory({ name: categoryName.trim(), sort_order: 0, is_active: true });
    setCategoryLoading(false);
    if (result?.error) {
      setCategoryError(result.error);
      return;
    }
    if (result?.id) setCreatedCategoryId(result.id);
    setStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setProductError('Ingresa el nombre del producto');
      return;
    }
    const price = parseFloat(productPrice);
    if (isNaN(price) || price < 0) {
      setProductError('Ingresa un precio válido');
      return;
    }
    setProductError('');
    setProductLoading(true);
    const result = await createProduct({
      name: productName.trim(),
      description: '',
      price,
      category_id: createdCategoryId ?? '',
      is_active: true,
    });
    setProductLoading(false);
    if (result?.error) {
      setProductError(result.error);
      return;
    }
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

          {/* Step indicator — oculto en paso 0 */}
          {step > 0 && (
            <>
              <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      s === step ? 'w-10 bg-emerald-500' : s < step ? 'w-8 bg-emerald-500/40' : 'w-8 bg-white/[0.08]'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-3">
                <p className="text-xs text-gray-600 tabular-nums">Paso {Math.min(step, 4)} de 4</p>
                <span className="text-[10px] text-gray-700">·</span>
                <p className="text-[10px] text-gray-600">~2 min</p>
              </div>
            </>
          )}
        </div>

        {/* ── STEP 0: Intención / tipo de negocio ── */}
        {step === 0 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">¿Qué tipo de negocio tienes?</h1>
              <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
                Así preparamos la mejor experiencia para ti.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { type: 'restaurante', icon: '🍽', label: 'Restaurante' },
                { type: 'cafeteria', icon: '☕', label: 'Cafetería / Bar' },
                { type: 'foodtruck', icon: '🚚', label: 'Food Truck' },
                { type: 'otro', icon: '🛒', label: 'Otro' },
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
                Omitir →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 1: Restaurant info ── */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">Crea tu restaurante</h1>
              <p className="text-gray-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
                Configura lo básico y te prepararemos un menú de ejemplo listo para editar.
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del restaurante</label>
                  <div className={wrapClass('name')}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      className={inputClass('name')}
                      placeholder="Mi Restaurante"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-400">URL de tu menú</label>
                    {slugStatus === 'checking' && (
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Verificando...
                      </span>
                    )}
                    {slugStatus === 'available' && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Disponible
                      </span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        No disponible
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
                      placeholder="mi-restaurante"
                    />
                  </div>
                  {slug && slugStatus !== 'taken' && (
                    <p className="text-[11px] text-gray-600 mt-1.5 ml-1">
                      Tu menú estará en: <span className="text-gray-400">menius.app/{slug}</span>
                    </p>
                  )}
                  {slugStatus === 'taken' && (
                    <p className="text-[11px] text-red-400 mt-1.5 ml-1">
                      Esta URL ya está en uso. Prueba con otra.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Idioma del menú / Menu language</label>
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Moneda</label>
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Zona horaria</label>
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
                      Creando tu restaurante...
                    </span>
                  ) : 'Continuar →'}
                </button>

                <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                  Se generará un menú de ejemplo con categorías, productos y mesas para que veas cómo funciona.
                </p>
              </form>
            </div>
          </>
        )}

        {/* ── STEP 2: First category ── */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">Agrega tu primera categoría</h1>
              <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Las categorías organizan tu menú. Puedes agregar más desde el dashboard.
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <form onSubmit={handleStep2Submit} className="bg-[#0a0a0a] rounded-2xl p-8 space-y-6">
                {categoryError && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                    <span className="text-red-400 text-[13px]">{categoryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nombre de la categoría</label>
                  <div className={wrapClass('cat')}>
                    <input
                      type="text"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      onFocus={() => setFocused('cat')}
                      onBlur={() => setFocused(null)}
                      className={inputClass('cat')}
                      placeholder="Ej: Platos principales"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick suggestions */}
                <div>
                  <p className="text-[11px] text-gray-600 mb-2">Sugerencias rápidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCategoryName(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          categoryName === s
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-gray-300 hover:border-white/[0.15]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={categoryLoading || !categoryName.trim()}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-[15px] md:text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {categoryLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Guardando...
                    </span>
                  ) : 'Continuar →'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/app')}
                  className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Omitir por ahora, ir al dashboard
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── STEP 3: First product ── */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75M8.25 15l1.5.75M8.25 15l-1.5.75m0 0L5.25 15M15.75 15.75 14.25 15m1.5.75-1.5-.75M15.75 15.75l1.5-.75" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">Agrega tu primer producto</h1>
              <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {createdCategoryId
                  ? `Se agregará a la categoría "${categoryName}".`
                  : 'Puedes organizarlo en categorías desde el dashboard.'}
                {' '}Podrás agregar fotos, variantes y más después.
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
              <form onSubmit={handleStep3Submit} className="bg-[#0a0a0a] rounded-2xl p-8 space-y-6">
                {productError && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                    <span className="text-red-400 text-[13px]">{productError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del producto</label>
                  <div className={wrapClass('prod')}>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      onFocus={() => setFocused('prod')}
                      onBlur={() => setFocused(null)}
                      className={inputClass('prod')}
                      placeholder="Ej: Hamburguesa clásica"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Precio</label>
                  <div className={wrapClass('price')}>
                    <input
                      type="number"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      onFocus={() => setFocused('price')}
                      onBlur={() => setFocused(null)}
                      className={inputClass('price')}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={productLoading || !productName.trim()}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-semibold text-[15px] md:text-sm hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {productLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Guardando...
                    </span>
                  ) : '¡Lanzar mi restaurante! →'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Omitir, ir al siguiente paso
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
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">¡Tu restaurante está listo!</h1>
              <p className="text-gray-400 text-sm mt-3 max-w-sm mx-auto leading-relaxed">
                Ya puedes recibir pedidos, gestionar tu menú y ver todo en tiempo real desde el Counter.
              </p>
            </div>

            <div className="rounded-2xl p-[1px] bg-gradient-to-b from-emerald-500/[0.12] to-white/[0.02]">
              <div className="bg-[#0a0a0a] rounded-2xl p-8 space-y-4">
                {/* Quick wins */}
                {[
                  { icon: '✅', title: 'Menú de ejemplo creado', sub: 'Listo para personalizar desde el dashboard' },
                  { icon: '📱', title: 'Counter en cualquier dispositivo', sub: 'Celular, tablet o computadora' },
                  { icon: '🔗', title: `menius.app/${slug || 'tu-restaurante'}`, sub: 'Tu QR ya está activo' },
                ].map((item) => (
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
                  Abrir Counter →
                </a>

                <button
                  type="button"
                  onClick={() => router.push('/app')}
                  className="w-full py-2.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Ir al dashboard →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
