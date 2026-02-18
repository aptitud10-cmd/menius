'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createRestaurant } from '@/lib/actions/restaurant';
import { createRestaurantSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';

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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('America/New_York');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = createRestaurantSchema.safeParse({
      name,
      slug,
      timezone,
      currency,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await createRestaurant(parsed.data);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-safe flex items-center justify-center px-4 py-12 landing-bg noise-overlay relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/[0.12] rounded-full blur-[180px]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[350px] h-[350px] bg-blue-500/[0.08] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight font-heading inline-block">
            <span className="text-white">MENIUS</span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 mb-4">
            <div className="w-8 h-1 rounded-full bg-purple-500" />
            <div className="w-8 h-1 rounded-full bg-white/[0.08]" />
            <div className="w-8 h-1 rounded-full bg-white/[0.08]" />
          </div>

          <h1 className="text-xl font-bold text-white">Crea tu restaurante</h1>
          <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Configura lo básico y te prepararemos un menú de ejemplo con categorías, productos y mesas listas para editar.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.08] to-white/[0.02]">
          <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-2xl p-7 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1]">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-red-400 text-[13px]">{error}</span>
              </div>
            )}

            {/* Restaurant name */}
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">Nombre del restaurante</label>
              <div className={`relative rounded-xl transition-all duration-300 ${
                focused === 'name'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:outline-none transition-colors"
                  placeholder="Mi Restaurante"
                />
              </div>
            </div>

            {/* URL slug */}
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">URL de tu menú</label>
              <div className={`flex items-center rounded-xl overflow-hidden transition-all duration-300 ${
                focused === 'slug'
                  ? 'ring-1 ring-purple-500/30 shadow-[0_0_20px_rgba(120,80,255,0.08)]'
                  : ''
              }`}>
                <span className="px-3.5 py-3 text-sm text-gray-500 border-r border-white/[0.08] bg-white/[0.04] flex-shrink-0">
                  menius.app/r/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  onFocus={() => setFocused('slug')}
                  onBlur={() => setFocused(null)}
                  className="flex-1 px-3 py-3 text-sm bg-white/[0.04] border-y border-r border-white/[0.08] rounded-r-xl text-white placeholder-gray-600 focus:outline-none"
                  placeholder="mi-restaurante"
                />
              </div>
              {slug && (
                <p className="text-[11px] text-gray-600 mt-1.5 ml-1">
                  Tu menú estará en: <span className="text-gray-400">menius.app/r/{slug}</span>
                </p>
              )}
            </div>

            {/* Currency + Timezone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-2">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all appearance-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#0a0a0a] text-white">{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-400 mb-2">Zona horaria</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.tz} value={t.tz} className="bg-[#0a0a0a] text-white">{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed btn-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creando tu restaurante...
                </span>
              ) : 'Crear restaurante →'}
            </button>

            <p className="text-center text-[11px] text-gray-600 leading-relaxed">
              Se generará un menú de ejemplo con categorías, productos y mesas para que veas como funciona. Puedes editarlo todo desde tu dashboard.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
