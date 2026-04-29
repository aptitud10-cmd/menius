'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, CheckCircle2, Bell, Mail, Globe, ShoppingBag, CreditCard, Loader2, XCircle, RefreshCw, Camera, Clock, Link2, Languages, Plus, X, Receipt } from 'lucide-react';
import { COUNTRY_LIST, US_STATE_LIST, COUNTRY_TAX_PRESETS, US_STATE_TAX_RATES, US_CITY_TAX_RATES, computeTaxAmount } from '@/lib/tax-presets';
import { COUNTRY_CONFIG_LIST, COUNTRY_CONFIGS, UNIQUE_CURRENCIES, formatTimezone } from '@/lib/country-config';
import { SUPPORTED_LOCALES, getLocaleFlag } from '@/lib/i18n';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/types';
import { PhoneField } from '@/components/ui/PhoneField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

const DAYS = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
];

export function RestaurantSettings({ initialData }: { initialData: Restaurant }) {
  const { t, locale } = useDashboardLocale();
  const dayLabels: Record<string, string> = {
    monday: t.settings_days_monday,
    tuesday: t.settings_days_tuesday,
    wednesday: t.settings_days_wednesday,
    thursday: t.settings_days_thursday,
    friday: t.settings_days_friday,
    saturday: t.settings_days_saturday,
    sunday: t.settings_days_sunday,
  };

  const [form, setForm] = useState({
    name: initialData.name ?? '',
    description: initialData.description ?? '',
    address: initialData.address ?? '',
    phone: initialData.phone ?? '',
    email: initialData.email ?? '',
    website: initialData.website ?? '',
    timezone: initialData.timezone ?? 'America/New_York',
    currency: initialData.currency ?? 'USD',
    locale: initialData.locale ?? 'es',
    available_locales: initialData.available_locales ?? [initialData.locale ?? 'es'],
    custom_domain: initialData.custom_domain ?? '',
    notification_email: initialData.notification_email ?? '',
    notifications_enabled: initialData.notifications_enabled !== false,
    order_types_enabled: initialData.order_types_enabled ?? ['dine_in', 'pickup'],
    payment_methods_enabled: initialData.payment_methods_enabled ?? ['cash'],
    estimated_delivery_minutes: initialData.estimated_delivery_minutes ?? '',
    delivery_fee: initialData.delivery_fee ?? '',
    delivery_radius_km: initialData.delivery_radius_km ?? 5,
    latitude: initialData.latitude ?? '',
    longitude: initialData.longitude ?? '',
    country_code: initialData.country_code ?? '',
    state_code: initialData.state_code ?? '',
    tax_rate: initialData.tax_rate ?? 0,
    tax_included: initialData.tax_included ?? false,
    tax_label: initialData.tax_label ?? 'Tax',
  });

  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean; fullDay?: boolean }>>(
    DAYS.reduce((acc, day) => {
      const existing = initialData.operating_hours?.[day.key];
      const isFullDay = existing?.open === '00:00' && existing?.close === '23:59';
      acc[day.key] = {
        open: existing?.open ?? '09:00',
        close: existing?.close ?? '22:00',
        closed: existing?.closed ?? false,
        fullDay: isFullDay,
      };
      return acc;
    }, {} as Record<string, { open: string; close: string; closed: boolean; fullDay?: boolean }>)
  );

  const [logoUrl, setLogoUrl] = useState(initialData.logo_url ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const [coverUrl, setCoverUrl] = useState(initialData.cover_image_url ?? '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [initialFormSnapshot] = useState(() => JSON.stringify(form));
  const [initialHoursSnapshot] = useState(() => JSON.stringify(hours));
  const [initialLogoSnapshot] = useState(() => logoUrl);
  const [initialCoverSnapshot] = useState(() => coverUrl);
  const isDirty =
    JSON.stringify(form) !== initialFormSnapshot ||
    JSON.stringify(hours) !== initialHoursSnapshot ||
    logoUrl !== initialLogoSnapshot ||
    coverUrl !== initialCoverSnapshot;

  const handleCountryChange = (code: string) => {
    const cfg = COUNTRY_CONFIGS[code];
    const taxPreset = COUNTRY_TAX_PRESETS[code];
    setForm((prev) => ({
      ...prev,
      country_code: code,
      currency: cfg ? cfg.currency : prev.currency,
      timezone: cfg ? cfg.timezone : prev.timezone,
      locale: cfg ? cfg.menuLocale : prev.locale,
      available_locales: cfg
        ? prev.available_locales.includes(cfg.menuLocale)
          ? prev.available_locales
          : [cfg.menuLocale, ...prev.available_locales]
        : prev.available_locales,
      state_code: code !== 'US' ? '' : prev.state_code,
      tax_rate: taxPreset ? taxPreset.rate : prev.tax_rate,
      tax_label: taxPreset ? taxPreset.label : prev.tax_label,
      tax_included: taxPreset ? taxPreset.included : prev.tax_included,
    }));
    setSaved(false);
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    onboarding_complete: boolean;
    loading: boolean;
    connecting: boolean;
    error: string | null;
  }>({ connected: !!initialData.stripe_account_id, onboarding_complete: !!initialData.stripe_onboarding_complete, loading: true, connecting: false, error: null });

  const isColombianRestaurant =
    (form.country_code ?? '').toUpperCase() === 'CO' ||
    (form.currency ?? '').toUpperCase() === 'COP';

  useEffect(() => {
    if (isColombianRestaurant) {
      setStripeStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    setStripeStatus((prev) => ({ ...prev, loading: true }));
    fetch('/api/connect/status')
      .then((r) => r.json())
      .then((data) => {
        setStripeStatus((prev) => ({
          ...prev,
          connected: data.connected ?? false,
          onboarding_complete: data.onboarding_complete ?? false,
          loading: false,
        }));
      })
      .catch(() => setStripeStatus((prev) => ({ ...prev, loading: false })));
  }, [isColombianRestaurant]);

  const handleConnectStripe = async () => {
    setStripeStatus((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeStatus((prev) => ({ ...prev, connecting: false, error: data.error ?? 'Error connecting Stripe' }));
      }
    } catch {
      setStripeStatus((prev) => ({ ...prev, connecting: false, error: locale === 'en' ? 'Connection error' : 'Error de conexión' }));
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${appUrl}/${initialData.slug}`;

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleHourChange = (day: string, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSaved(false);
  };

  const toggleClosed = (day: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed, fullDay: false } }));
    setSaved(false);
  };

  const toggleFullDay = (day: string) => {
    setHours((prev) => {
      const wasFullDay = prev[day].fullDay;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          fullDay: !wasFullDay,
          open: wasFullDay ? '09:00' : '00:00',
          close: wasFullDay ? '22:00' : '23:59',
          closed: false,
        },
      };
    });
    setSaved(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { setError(t.settings_onlyImages); return null; }
    if (file.size > 10 * 1024 * 1024) { setError(t.settings_maxSize); return null; }
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? t.settings_uploadError); return null; }
    return data.url;
  };

  const autoSaveImageField = async (field: 'logo_url' | 'cover_image_url', url: string) => {
    try {
      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: url }),
      });
      if (res.ok) setSaved(true);
    } catch {
      // silent — user can still save manually
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    const url = await uploadImage(file);
    if (url) {
      setLogoUrl(url);
      await autoSaveImageField('logo_url', url);
    }
    setUploadingLogo(false);
    if (logoRef.current) logoRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    const url = await uploadImage(file);
    if (url) {
      setCoverUrl(url);
      await autoSaveImageField('cover_image_url', url);
    }
    setUploadingCover(false);
    if (coverRef.current) coverRef.current.value = '';
  };

  const handleSave = async () => {
    // Validate operating hours before saving
    for (const day of DAYS) {
      const h = hours[day.key];
      if (!h.closed && !h.fullDay && h.open >= h.close) {
        setError(
          locale === 'en'
            ? `${dayLabels[day.key]}: opening time must be before closing time`
            : `${dayLabels[day.key]}: la hora de apertura debe ser antes de cierre`
        );
        return;
      }
    }

    // Validate tax rate
    const taxRate = Number(form.tax_rate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      setError(locale === 'en' ? 'Tax rate must be between 0 and 100' : 'La tasa de impuesto debe estar entre 0 y 100');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          available_locales: form.available_locales,
          operating_hours: hours,
          logo_url: logoUrl || null,
          cover_image_url: coverUrl || null,
          estimated_delivery_minutes: form.estimated_delivery_minutes ? Number(form.estimated_delivery_minutes) : null,
          delivery_fee: form.delivery_fee ? Number(form.delivery_fee) : null,
          delivery_radius_km: form.delivery_radius_km ? Number(form.delivery_radius_km) : null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          country_code: form.country_code || null,
          state_code: form.state_code || null,
          tax_rate: Number(form.tax_rate) || 0,
          tax_included: form.tax_included,
          tax_label: form.tax_label || 'Tax',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const API_ERROR_MAP: Record<string, string> = {
          DOMAIN_INVALID: t.error_domainInvalid,
          NO_CHANGES: t.error_noChanges,
          TAX_RATE_INVALID: t.error_taxRateInvalid,
          EMAIL_INVALID: t.error_emailInvalid,
        };
        throw new Error(API_ERROR_MAP[data.error] ?? data.error ?? t.settings_errorSaving);
      }
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? t.settings_errorSaving);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Favicon / Icono */}
      <div id="logo" className="bg-white rounded-2xl border border-gray-200 p-5 scroll-mt-20">
        <h2 className="font-semibold text-sm text-gray-900 mb-1">
          {locale === 'en' ? 'Icon / Favicon' : 'Icono / Favicon'}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {locale === 'en'
            ? 'Square image used as your restaurant icon in the digital menu and browser tab. Recommended: 512×512 px PNG.'
            : 'Imagen cuadrada que aparece como icono de tu restaurante en el menú digital y en la pestaña del navegador. Recomendado: 512×512 px PNG.'}
        </p>
        <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        <div className="flex items-center gap-4">
          {/* Preview — single tap target, no invisible hover overlay */}
          <button
            onClick={() => logoRef.current?.click()}
            disabled={uploadingLogo}
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 flex-shrink-0 active:opacity-80 transition-opacity"
            aria-label={locale === 'en' ? 'Upload icon' : 'Subir icono'}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="Favicon" fill className="object-cover" sizes="80px" />
            ) : (
              <span className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                {uploadingLogo
                  ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  : <Camera className="w-5 h-5" />}
              </span>
            )}
          </button>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploadingLogo
                ? <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                : null}
              {logoUrl ? t.settings_changeLogo : t.settings_uploadLogo}
            </button>
            {logoUrl && (
              <button
                onClick={() => { setLogoUrl(''); setSaved(false); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                {t.settings_remove}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cover / Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="mb-1">
          <h2 className="font-semibold text-sm text-gray-900">{t.settings_banner}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {t.settings_bannerDesc} {t.settings_bannerFormatNote}
        </p>
        <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
        {coverUrl ? (
          <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden bg-gray-100 group">
            <Image src={coverUrl} alt="Banner" fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3">
              <button
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="opacity-0 group-hover:opacity-100 px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 transition-all"
              >
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Camera className="w-4 h-4 inline mr-1" />}
                {t.settings_change}
              </button>
              <button
                onClick={() => { setCoverUrl(''); setSaved(false); }}
                className="opacity-0 group-hover:opacity-100 px-3 py-2 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                {t.settings_remove}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            className="w-full aspect-[3/1] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors disabled:opacity-50"
          >
            {uploadingCover ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">{t.settings_uploadBanner}</span>
                <span className="text-[11px] text-gray-400">{t.settings_bannerRecommended}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Public URL */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-3 text-gray-900">{t.settings_publicURL}</h2>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <span className="text-sm text-gray-500 truncate flex-1 font-mono">{publicUrl}</span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100">
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Custom Domain */}
      <DomainSection
        domain={form.custom_domain}
        domainVerified={!!(initialData as any).domain_verified}
        onChange={(v) => handleChange('custom_domain', v.toLowerCase().replace(/[^a-z0-9.\-]/g, ''))}
      />

      {/* Basic info */}
      <div id="profile" className="bg-white rounded-2xl border border-gray-200 p-5 scroll-mt-20">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.settings_basicInfo}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t.settings_restaurantName} value={form.name} onChange={(v) => handleChange('name', v)} />
          <PhoneField label={t.settings_phone} value={form.phone} onChange={(v) => handleChange('phone', v)} dark={false} country={form.country_code || undefined} />
          <div className="sm:col-span-2">
            <Field label={t.settings_description} value={form.description} onChange={(v) => handleChange('description', v)} placeholder={t.settings_descPlaceholder} textarea />
          </div>
          <AddressAutocomplete
            label={t.settings_address}
            value={form.address}
            onChange={(v) => handleChange('address', v)}
            onPlaceSelect={(place) => {
              setForm((prev) => ({
                ...prev,
                address: place.address,
                latitude: place.lat ?? prev.latitude,
                longitude: place.lng ?? prev.longitude,
              }));
              setSaved(false);
            }}
            placeholder={t.settings_addressPlaceholder}
            dark={false}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.settings_latitude} value={String(form.latitude ?? '')} onChange={(v) => handleChange('latitude', v)} placeholder="19.4284" />
            <Field label={t.settings_longitude} value={String(form.longitude ?? '')} onChange={(v) => handleChange('longitude', v)} placeholder="-99.1676" />
          </div>
          <Field label={t.settings_email} value={form.email} onChange={(v) => handleChange('email', v)} placeholder="contacto@mirestaurante.com" />
          <Field label={t.settings_website} value={form.website} onChange={(v) => handleChange('website', v)} placeholder="https://..." />
        </div>
      </div>

      {/* Regional */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.settings_regional}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'en' ? 'Country' : 'País'}
            </label>
            <select
              value={form.country_code}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">{locale === 'en' ? '— Select country —' : '— Selecciona tu país —'}</option>
              {COUNTRY_CONFIG_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} — {c.currency}
                </option>
              ))}
            </select>
            {form.country_code && COUNTRY_CONFIGS[form.country_code] && (
              <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">
                {COUNTRY_CONFIGS[form.country_code].flag}&nbsp;
                {COUNTRY_CONFIGS[form.country_code].currency} &middot; +{COUNTRY_CONFIGS[form.country_code].phonePrefix} &middot; {formatTimezone(COUNTRY_CONFIGS[form.country_code].timezone)}
                {locale === 'en' ? ' — auto-filled from country' : ' — autocompletado desde el país'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.settings_timezone}</label>
            <select
              value={form.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {COUNTRY_CONFIG_LIST.map((c) => (
                <option key={c.timezone} value={c.timezone}>
                  {c.flag} {formatTimezone(c.timezone)} ({c.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.settings_currency}</label>
            <select
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {UNIQUE_CURRENCIES.map((c) => (
                <option key={c.currency} value={c.currency}>
                  {c.flag} {c.currency}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
              <Globe className="w-3.5 h-3.5" />
              {t.settings_mainLanguage}
            </label>
            <select
              value={form.locale}
              onChange={(e) => {
                const newLocale = e.target.value;
                handleChange('locale', newLocale);
                setForm((prev) => ({
                  ...prev,
                  available_locales: prev.available_locales.includes(newLocale)
                    ? prev.available_locales
                    : [newLocale, ...prev.available_locales],
                }));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              {t.settings_mainLanguageDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Taxes / Impuestos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-sm text-gray-900">
            {locale === 'en' ? 'Taxes' : 'Impuestos'}
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {locale === 'en'
            ? 'Configure the tax rate applied to orders. Select your country to auto-fill the preset.'
            : 'Configura el impuesto aplicado a los pedidos. Selecciona tu país para autocompletar el preset.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Country */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'en' ? 'Country' : 'País'}
            </label>
            <select
              value={form.country_code}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">{locale === 'en' ? '— No country / custom —' : '— Sin país / personalizado —'}</option>
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* US State (only shown when US selected) */}
          {form.country_code === 'US' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
              <select
                value={form.state_code}
                onChange={(e) => {
                  const sc = e.target.value;
                  const state = US_STATE_TAX_RATES[sc];
                  setForm((prev) => ({
                    ...prev,
                    state_code: sc,
                    tax_rate: state ? state.rate : prev.tax_rate,
                  }));
                  setSaved(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">— Select state —</option>
                {US_STATE_LIST.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.rate}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* US City (only shown when US + state with known cities selected) */}
          {form.country_code === 'US' && form.state_code && US_CITY_TAX_RATES[form.state_code] && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                City — combined rate (state + county + city)
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const rate = parseFloat(e.target.value);
                  if (!isNaN(rate)) {
                    setForm((prev) => ({ ...prev, tax_rate: rate }));
                    setSaved(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">— Select your city to auto-fill combined rate —</option>
                {US_CITY_TAX_RATES[form.state_code].map((c) => (
                  <option key={c.name} value={c.rate}>
                    {c.name} — {c.rate}%
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex gap-1.5 items-start">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>
                  Rates are approximate and may change. Verify your exact combined rate at{' '}
                  <a
                    href="https://www.taxjar.com/rates/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    taxjar.com/rates
                  </a>{' '}
                  (free lookup by ZIP code). Your accountant is the final authority.
                </span>
              </p>
            </div>
          )}

          {/* Tax rate % */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'en' ? 'Tax rate (%)' : 'Tasa de impuesto (%)'}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.tax_rate}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }));
                setSaved(false);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {/* Tax label */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {locale === 'en' ? 'Tax label' : 'Etiqueta del impuesto'}
            </label>
            <input
              type="text"
              maxLength={20}
              value={form.tax_label}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, tax_label: e.target.value }));
                setSaved(false);
              }}
              placeholder="IVA, Sales Tax, VAT…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Tax mode toggle */}
        <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-3">
            {locale === 'en' ? 'How is tax applied?' : '¿Cómo se aplica el impuesto?'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => { setForm((prev) => ({ ...prev, tax_included: true })); setSaved(false); }}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                form.tax_included
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              )}
            >
              {locale === 'en' ? '✓ Included in price' : '✓ Incluido en el precio'}
              <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                {locale === 'en' ? 'e.g. IVA Mexico / Spain / LATAM' : 'ej. IVA México / España / LATAM'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setForm((prev) => ({ ...prev, tax_included: false })); setSaved(false); }}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                !form.tax_included
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              )}
            >
              {locale === 'en' ? '+ Added on subtotal' : '+ Añadido sobre el subtotal'}
              <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                {locale === 'en' ? 'e.g. Sales Tax USA / Canada' : 'ej. Sales Tax USA / Canada'}
              </span>
            </button>
          </div>
        </div>

        {/* Preview */}
        {Number(form.tax_rate) > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            {(() => {
              const subtotal = 100;
              const taxAmt = computeTaxAmount(subtotal, Number(form.tax_rate), form.tax_included);
              const total = form.tax_included ? subtotal : subtotal + taxAmt;
              return (
                <>
                  <span className="font-semibold">{locale === 'en' ? 'Preview' : 'Vista previa'}</span>
                  {' — '}
                  {locale === 'en' ? 'On a' : 'Sobre un'} {form.tax_included ? '' : (locale === 'en' ? 'subtotal of ' : 'subtotal de ')}$100 {locale === 'en' ? 'order' : 'pedido'}:{' '}
                  {form.tax_label} = ${taxAmt.toFixed(2)}{form.tax_included ? (locale === 'en' ? ' (extracted from price)' : ' (extraído del precio)') : ''},{' '}
                  {locale === 'en' ? 'total' : 'total'} = ${total.toFixed(2)}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Multi-language */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-sm text-gray-900">{t.settings_additionalLanguages}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {t.settings_additionalLanguagesDesc}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {form.available_locales.map((code) => {
            const loc = SUPPORTED_LOCALES.find((l) => l.code === code);
            const isPrimary = code === form.locale;
            return (
              <span
                key={code}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border',
                  isPrimary
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                )}
              >
                <span>{loc?.flag ?? '🌐'}</span>
                <span>{loc?.label ?? code}</span>
                {isPrimary && <span className="text-[10px] text-emerald-500 ml-0.5">{t.settings_primary}</span>}
                {!isPrimary && (
                  <button
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        available_locales: prev.available_locales.filter((l) => l !== code),
                      }));
                      setSaved(false);
                    }}
                    className="ml-0.5 p-0.5 rounded hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {form.available_locales.length < SUPPORTED_LOCALES.length && (
          <div className="flex items-center gap-2">
            <select
              id="add-locale-select"
              defaultValue=""
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="" disabled>{t.settings_addLanguageSelect}</option>
              {SUPPORTED_LOCALES.filter((l) => !form.available_locales.includes(l.code)).map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const sel = document.getElementById('add-locale-select') as HTMLSelectElement;
                if (sel.value) {
                  setForm((prev) => ({
                    ...prev,
                    available_locales: [...prev.available_locales, sel.value],
                  }));
                  setSaved(false);
                  sel.value = '';
                }
              }}
              className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.settings_addLanguage}
            </button>
          </div>
        )}

        {form.available_locales.length > 1 && (
          <p className="text-[11px] text-emerald-600 mt-3 font-medium">
            {t.settings_languageSelectorNote}
          </p>
        )}
      </div>

      {/* Order Types */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-900">{t.settings_orderTypes}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {t.settings_orderTypesDesc}
        </p>
        <div className="space-y-2.5">
          {([
            { key: 'dine_in', label: t.settings_dineIn, desc: t.settings_dineInDesc },
            { key: 'pickup', label: t.settings_pickup, desc: t.settings_pickupDesc },
            { key: 'delivery', label: t.settings_delivery, desc: t.settings_deliveryDesc },
          ] as const).map((opt) => {
            const checked = form.order_types_enabled.includes(opt.key);
            return (
              <label key={opt.key} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
              )}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setForm((prev) => ({
                      ...prev,
                      order_types_enabled: checked
                        ? prev.order_types_enabled.filter((ot) => ot !== opt.key)
                        : [...prev.order_types_enabled, opt.key],
                    }));
                    setSaved(false);
                  }}
                  className="w-4 h-4 rounded border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/30"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  <p className="text-[11px] text-gray-500">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {form.order_types_enabled.includes('delivery') && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <label className="text-xs font-medium text-gray-500">{t.settings_deliveryTime}</label>
                </div>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={form.estimated_delivery_minutes}
                  onChange={(e) => { setForm((prev) => ({ ...prev, estimated_delivery_minutes: e.target.value })); setSaved(false); }}
                  placeholder="Ej: 30"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <label className="text-xs font-medium text-gray-500">{t.settings_deliveryFee}</label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.delivery_fee}
                  onChange={(e) => { setForm((prev) => ({ ...prev, delivery_fee: e.target.value })); setSaved(false); }}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {t.settings_deliveryFeeNote}
            </p>
          </div>
        )}

        {/* Delivery zone radius */}
        {form.order_types_enabled.includes('delivery') && (() => {
          const imperial = ['US', 'GB', 'CA'].includes((form.country_code ?? '').toUpperCase());
          const KM_PER_MI = 1.60934;
          const DEFAULT_KM = 5;
          const radiusKm = form.delivery_radius_km ? Number(form.delivery_radius_km) : DEFAULT_KM;
          const displayVal = imperial ? +(radiusKm / KM_PER_MI).toFixed(2) : radiusKm;
          const unit = imperial ? 'mi' : 'km';
          const sliderMin = imperial ? 0.3 : 0.5;
          const sliderMax = imperial ? 31 : 50;
          const sliderStep = imperial ? 0.1 : 0.5;
          const onChangeDisplay = (val: string) => {
            const km = imperial ? +(Number(val) * KM_PER_MI).toFixed(4) : Number(val);
            setForm(prev => ({ ...prev, delivery_radius_km: km || DEFAULT_KM }));
            setSaved(false);
          };
          return (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📍</span>
                <h3 className="text-xs font-semibold text-gray-700">
                  {locale === 'en' ? 'Delivery zone radius' : 'Radio de zona de entrega'}
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                {locale === 'en'
                  ? `Set the maximum ${unit} from your restaurant where you accept delivery orders.`
                  : `Define el radio máximo desde tu restaurante donde aceptas órdenes de entrega.`}
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={sliderStep}
                  value={displayVal}
                  onChange={e => onChangeDisplay(e.target.value)}
                  className="flex-1 accent-emerald-500"
                />
                <div className="flex items-center gap-1 min-w-[80px]">
                  <input
                    type="number"
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    value={displayVal}
                    onChange={e => onChangeDisplay(e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-xs text-gray-500">{unit}</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400 bg-emerald-100/60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">🏪</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    {locale === 'en'
                      ? `Coverage: ${displayVal} ${unit} radius`
                      : `Cobertura: radio de ${displayVal} ${unit}`}
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {locale === 'en'
                      ? 'Orders outside this radius can still be placed (advisory only)'
                      : 'Las órdenes fuera de este radio aún se pueden hacer (solo referencial)'}
                  </p>
                </div>
              </div>
              {form.latitude && form.longitude && (
                <p className="text-[10px] text-gray-400 mt-2">
                  📍 {locale === 'en' ? 'Center:' : 'Centro:'} {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-900">{t.settings_paymentMethods}</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {t.settings_paymentMethodsDesc}
        </p>
        <div className="space-y-2.5">
          {([
            { key: 'cash', label: t.settings_cash, desc: t.settings_cashDesc },
            {
              key: 'online',
              label: t.settings_onlinePayment,
              desc: isColombianRestaurant
                ? (locale === 'en'
                  ? 'Customer pays online with Wompi (cards, PSE, Nequi, Daviplata).'
                  : 'El cliente paga en linea con Wompi (tarjetas, PSE, Nequi, Daviplata).')
                : t.settings_onlinePaymentDesc,
            },
          ] as const).map((opt) => {
            const checked = form.payment_methods_enabled.includes(opt.key);
            return (
              <label key={opt.key} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
              )}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setForm((prev) => ({
                      ...prev,
                      payment_methods_enabled: checked
                        ? prev.payment_methods_enabled.filter((m) => m !== opt.key)
                        : [...prev.payment_methods_enabled, opt.key],
                    }));
                    setSaved(false);
                  }}
                  className="w-4 h-4 rounded border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/30"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  <p className="text-[11px] text-gray-500">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Warning: online enabled but Connect not ready */}
        {form.payment_methods_enabled.includes('online') && !isColombianRestaurant && !stripeStatus.onboarding_complete && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>
              {locale === 'en'
                ? 'Online payment is enabled but Stripe Connect is not set up. Customers will not see online payment as an option until you complete the setup below.'
                : 'El pago en línea está activado pero Stripe Connect no está configurado. Los clientes no verán esa opción hasta que completes el proceso abajo.'}
            </span>
          </div>
        )}

        {isColombianRestaurant ? (
          <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {locale === 'en' ? 'Wompi (Colombia)' : 'Wompi (Colombia)'}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {locale === 'en'
                ? 'For COP restaurants, MENIUS processes online payments with Wompi (cards, PSE, Nequi, and Daviplata).'
                : 'Para restaurantes con moneda COP, MENIUS procesa pagos en linea con Wompi (tarjetas, PSE, Nequi y Daviplata).'}
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {locale === 'en'
                  ? 'Active - customers will pay with Wompi at checkout'
                  : 'Activo - tus clientes pagaran con Wompi en checkout'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">{t.settings_stripeConnect}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {t.settings_stripeConnectDesc}
            </p>
            {stripeStatus.loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.settings_stripeVerifying}
              </div>
            ) : stripeStatus.onboarding_complete ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{t.settings_stripeReady}</span>
              </div>
            ) : stripeStatus.connected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">{t.settings_stripePendingVerify}</span>
                </div>
                <button
                  onClick={handleConnectStripe}
                  disabled={stripeStatus.connecting}
                  className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {stripeStatus.connecting ? t.settings_stripeRedirecting : t.settings_stripeCompleteVerify}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectStripe}
                disabled={stripeStatus.connecting}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {stripeStatus.connecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t.settings_stripeConnecting}</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> {t.settings_stripeConnect_btn}</>
                )}
              </button>
            )}
            {stripeStatus.error && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{stripeStatus.error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operating hours */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">{t.settings_schedule}</h2>
        <div className="space-y-2.5">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-center gap-3">
              <button
                onClick={() => toggleClosed(day.key)}
                className={`w-24 text-left text-sm font-medium ${hours[day.key].closed ? 'text-gray-500 line-through' : 'text-gray-700'}`}
              >
                {dayLabels[day.key]}
              </button>
              {hours[day.key].closed ? (
                <span className="text-sm text-red-400 font-medium">{t.settings_closed}</span>
              ) : hours[day.key].fullDay ? (
                <span className="text-sm text-emerald-600 font-semibold">{t.settings_24h}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day.key].open}
                    onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-gray-500 text-sm">{t.settings_timeTo}</span>
                  <input
                    type="time"
                    value={hours[day.key].close}
                    onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {!hours[day.key].closed && (
                  <button
                    onClick={() => toggleFullDay(day.key)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg ${hours[day.key].fullDay ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {t.settings_24h}
                  </button>
                )}
                <button
                  onClick={() => toggleClosed(day.key)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg ${hours[day.key].closed ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' : 'bg-red-500/[0.08] text-red-400 hover:bg-red-500/[0.12]'}`}
                >
                  {hours[day.key].closed ? t.settings_openDay : t.settings_closeDay}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm text-gray-900">{t.settings_notifications}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium', form.notifications_enabled ? 'text-green-600' : 'text-gray-400')}>
              {form.notifications_enabled ? t.settings_enabled : t.settings_disabled}
            </span>
            <button
              onClick={() => { setForm((prev) => ({ ...prev, notifications_enabled: !prev.notifications_enabled })); setSaved(false); }}
              className={cn(
                'relative inline-flex h-8 w-16 items-center rounded-full transition-colors shadow-inner',
                form.notifications_enabled ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md',
                form.notifications_enabled ? 'translate-x-9' : 'translate-x-1'
              )} />
            </button>
          </div>
        </div>

        {form.notifications_enabled && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Mail className="w-3.5 h-3.5" />
                {t.settings_emailNotificationLabel}
              </label>
              <input
                type="email"
                value={form.notification_email}
                onChange={(e) => { setForm((prev) => ({ ...prev, notification_email: e.target.value })); setSaved(false); }}
                placeholder="owner@mirestaurante.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {t.settings_emailNotificationDesc}
              </p>
            </div>
          </div>
        )}

        {!form.notifications_enabled && (
          <p className="text-sm text-gray-500">{t.settings_notificationsOffDesc}</p>
        )}
      </div>

      {/* Save */}
      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/[0.06] text-red-400 border border-red-500/[0.1] text-sm">{error}</div>
      )}

      <div className="flex items-center gap-3">
        {isDirty && !saved && (
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t.settings_unsavedChanges}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50',
            isDirty && !saved
              ? 'bg-amber-500 text-white hover:bg-amber-600 hover:-translate-y-0.5'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-0.5'
          )}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? t.settings_saving : saved ? t.settings_saved : t.settings_save}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const cls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-500';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function DomainSection({ domain, domainVerified, onChange }: { domain: string; domainVerified: boolean; onChange: (v: string) => void }) {
  const { t } = useDashboardLocale();
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; error?: string } | null>(null);

  const isVerified = domainVerified || verifyResult?.verified;

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/domain/verify', { method: 'POST' });
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({ verified: false, error: t.settings_domainNetworkError });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-emerald-600" />
        <h2 className="font-semibold text-sm text-gray-900">{t.settings_domainTitle}</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Plan Pro+</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">{t.settings_domainDesc}</p>

      <Field
        label={t.settings_domain}
        value={domain}
        onChange={onChange}
        placeholder={t.settings_domainPlaceholder}
      />

      {domain && (
        <>
          {/* DNS instructions */}
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-700 mb-2">{t.settings_dnsRequired}</p>
            <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div><span className="text-gray-500">{t.settings_dnsType}</span><br /><span className="text-gray-900">CNAME</span></div>
                <div><span className="text-gray-500">{t.settings_dnsName}</span><br /><span className="text-gray-900">{domain}</span></div>
                <div><span className="text-gray-500">{t.settings_dnsValue}</span><br /><span className="text-gray-900">cname.vercel-dns.com</span></div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              {t.settings_dnsPropagation}
            </p>
          </div>

          {/* Verification status */}
          <div className="mt-3 flex items-center gap-3">
            {isVerified ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">{t.settings_domainActive}</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {verifying ? t.settings_domainVerifying : t.settings_domainVerifyDNS}
                </button>

                {verifyResult && !verifyResult.verified && (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-[11px] text-amber-400">{verifyResult.error}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

