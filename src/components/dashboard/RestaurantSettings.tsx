'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, CheckCircle2, Bell, Mail, Globe, ShoppingBag, CreditCard, Loader2, XCircle, RefreshCw, Camera, Clock, Link2, Languages, Plus, X, Receipt } from 'lucide-react';
import { getCountryList, getUsStateList, COUNTRY_TAX_PRESETS, US_STATE_TAX_RATES, US_CITY_TAX_RATES, computeTaxAmount } from '@/lib/tax-presets';
import { COUNTRY_CONFIG_LIST, COUNTRY_CONFIGS, UNIQUE_CURRENCIES, US_TIMEZONES, formatTimezone } from '@/lib/country-config';
import { crossesMidnight, dayHoursError } from '@/lib/orders/business-hours';
import type { ConnectAccountState } from '@/lib/payments/connect-account';
import { onboardErrorText } from '@/lib/payments/payment-errors';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/types';
import { PhoneField } from '@/components/ui/PhoneField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { normalizeBrandColor, trackerBrand } from '@/lib/tracker-brand';
import { SUPPORT_CONTACT } from '@/lib/support-contact';

const DAYS = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
];

/** Vercel rejects request bodies over 4.5 MB before they reach the upload route. */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export function RestaurantSettings({
  initialData,
  onlinePaymentsAllowed = true,
}: {
  initialData: Restaurant;
  /** False when the plan has no online payments (/api/orders would reject cards). */
  onlinePaymentsAllowed?: boolean;
}) {
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
    instagram_url: initialData.instagram_url ?? '',
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
    delivery_min_order: initialData.delivery_min_order ?? '',
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
  // Color del seguimiento: se guarda solo (no viaja con "Guardar" para no
  // romper el resto de la configuración si la columna aún no existe).
  const [brandColor, setBrandColor] = useState<string>(normalizeBrandColor(initialData.brand_color) ?? '');
  const [brandSaving, setBrandSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const brandSavedRef = useRef<string>(brandColor);
  useEffect(() => {
    if (brandColor === brandSavedRef.current) return;
    // El selector manda un valor por cada movimiento: se guarda al quedarse quieto.
    const id = setTimeout(async () => {
      setBrandSaving('saving');
      try {
        const res = await fetch('/api/tenant/restaurant', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand_color: brandColor || null }),
        });
        if (res.ok) brandSavedRef.current = brandColor;
        setBrandSaving(res.ok ? 'saved' : 'error');
      } catch {
        setBrandSaving('error');
      }
    }, 700);
    return () => clearTimeout(id);
  }, [brandColor]);
  const logoRef = useRef<HTMLInputElement>(null);
  // Alta de Stripe completa: país y moneda fijos (el servidor también lo exige).
  const regionLocked = initialData.stripe_onboarding_complete === true;

  // "Powered by MENIUS" al pie de la tienda: Pro lo puede ocultar. Se guarda al tocar.
  const [hideBranding, setHideBranding] = useState<boolean>(
    initialData.config_overrides?.hide_menius_branding === true,
  );
  const [brandingSaving, setBrandingSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const toggleBranding = async () => {
    const next = !hideBranding;
    setHideBranding(next);
    setBrandingSaving('saving');
    try {
      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide_menius_branding: next }),
      });
      if (!res.ok) setHideBranding(!next);
      setBrandingSaving(res.ok ? 'saved' : 'error');
    } catch {
      setHideBranding(!next);
      setBrandingSaving('error');
    }
  };

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
    /** From /api/connect/status; null until it answers (or if it fails). */
    state: ConnectAccountState | null;
    requirementsDeadline: string | null;
    requirementsDueCount: number;
    loading: boolean;
    connecting: boolean;
    openingDashboard: boolean;
    error: string | null;
  }>({
    connected: !!initialData.stripe_account_id,
    onboarding_complete: !!initialData.stripe_onboarding_complete,
    state: null,
    requirementsDeadline: null,
    requirementsDueCount: 0,
    loading: true,
    connecting: false,
    openingDashboard: false,
    error: null,
  });

  const isColombianRestaurant =
    (form.country_code ?? '').toUpperCase() === 'CO' ||
    (form.currency ?? '').toUpperCase() === 'COP';

  // Wompi per-restaurant keys (CO only). Secrets are write-only: the API never
  // returns them, so the form always starts empty.
  const [wompiStatus, setWompiStatus] = useState<{
    connected: boolean;
    publicKey: string | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
  }>({ connected: !!initialData.wompi_connected, publicKey: null, loading: true, saving: false, error: null });
  const [wompiEditing, setWompiEditing] = useState(false);
  // Same inputs as usablePaymentMethods on the storefront: gateway ready + plan.
  const onlineUsable = onlinePaymentsAllowed && (isColombianRestaurant ? wompiStatus.connected : stripeStatus.onboarding_complete);
  const [wompiForm, setWompiForm] = useState({ public_key: '', integrity_secret: '', events_secret: '' });

  useEffect(() => {
    if (!isColombianRestaurant) return;
    fetch('/api/tenant/wompi-keys')
      .then((r) => r.json())
      .then((data) => {
        setWompiStatus((prev) => ({
          ...prev,
          connected: !!data.connected,
          publicKey: data.public_key ?? null,
          loading: false,
        }));
      })
      .catch(() => setWompiStatus((prev) => ({ ...prev, loading: false })));
  }, [isColombianRestaurant]);

  const handleSaveWompi = async () => {
    setWompiStatus((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const res = await fetch('/api/tenant/wompi-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wompiForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setWompiStatus((prev) => ({ ...prev, saving: false, error: data.error ?? 'Error' }));
        return;
      }
      setWompiStatus((prev) => ({ ...prev, connected: true, publicKey: wompiForm.public_key, saving: false }));
      setWompiForm({ public_key: '', integrity_secret: '', events_secret: '' });
      setWompiEditing(false);
    } catch {
      setWompiStatus((prev) => ({ ...prev, saving: false, error: locale === 'en' ? 'Connection error' : 'Error de conexión' }));
    }
  };

  const handleDisconnectWompi = async () => {
    if (!confirm(locale === 'en'
      ? 'Disconnect Wompi? Customers will no longer be able to pay online.'
      : '¿Desconectar Wompi? Tus clientes ya no podrán pagar en línea.')) return;
    setWompiStatus((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const res = await fetch('/api/tenant/wompi-keys', { method: 'DELETE' });
      if (res.ok) {
        setWompiStatus((prev) => ({ ...prev, connected: false, publicKey: null, saving: false }));
      } else {
        setWompiStatus((prev) => ({ ...prev, saving: false }));
      }
    } catch {
      setWompiStatus((prev) => ({ ...prev, saving: false }));
    }
  };

  useEffect(() => {
    if (isColombianRestaurant) {
      setStripeStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    setStripeStatus((prev) => ({ ...prev, loading: true }));
    fetch('/api/connect/status')
      // On an error keep the saved flags instead of showing "not connected".
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => {
        setStripeStatus((prev) => ({
          ...prev,
          connected: data.connected ?? false,
          onboarding_complete: data.onboarding_complete ?? false,
          state: typeof data.state === 'string' ? (data.state as ConnectAccountState) : null,
          requirementsDeadline: typeof data.requirements_deadline === 'string' ? data.requirements_deadline : null,
          requirementsDueCount: typeof data.requirements_due_count === 'number' ? data.requirements_due_count : 0,
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
        setStripeStatus((prev) => ({ ...prev, connecting: false, error: onboardErrorText(data.code, locale) ?? data.error ?? (locale === 'en' ? 'Could not connect Stripe' : 'No se pudo conectar Stripe') }));
      }
    } catch {
      setStripeStatus((prev) => ({ ...prev, connecting: false, error: locale === 'en' ? 'Connection error' : 'Error de conexión' }));
    }
  };

  const handleOpenStripeDashboard = async () => {
    setStripeStatus((prev) => ({ ...prev, openingDashboard: true, error: null }));
    const failMsg = locale === 'en'
      ? "Couldn't open your Stripe dashboard. Please try again in a minute."
      : 'No se pudo abrir tu panel de Stripe. Intenta de nuevo en un minuto.';
    try {
      const res = await fetch('/api/connect/login-link', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === 'string') {
        window.location.href = data.url;
        return;
      }
      setStripeStatus((prev) => ({ ...prev, openingDashboard: false, error: failMsg }));
    } catch {
      setStripeStatus((prev) => ({ ...prev, openingDashboard: false, error: failMsg }));
    }
  };

  // Read after mount: the server has no window, and a different first render
  // made React throw a hydration error on the public URL.
  const [appUrl, setAppUrl] = useState(process.env.NEXT_PUBLIC_APP_URL ?? '');
  useEffect(() => setAppUrl(window.location.origin), []);

  // Fallback when /api/connect/status did not answer: use the saved flags.
  const stripeState: ConnectAccountState = stripeStatus.state
    ?? (stripeStatus.onboarding_complete ? 'active' : stripeStatus.connected ? 'incomplete' : 'not_connected');
  const en = locale === 'en';
  const stripeBox: { tone: string; icon: React.ReactNode; text: string } =
    stripeState === 'rejected'
      ? {
          tone: 'bg-red-50 border-red-200 text-red-700',
          icon: <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />,
          text: en
            ? "Stripe didn't approve this account, so you can't accept card payments. Contact us and we'll review it with you."
            : 'Stripe no aprobó esta cuenta, así que no puedes cobrar con tarjeta. Escríbenos y lo revisamos contigo.',
        }
      : stripeState === 'incomplete'
      ? {
          tone: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />,
          text: en
            ? 'Stripe needs more information from you. Finish your setup on Stripe to accept card payments and receive payouts.'
            : 'A Stripe le faltan datos tuyos. Termina el alta en Stripe para cobrar con tarjeta y recibir tus depósitos.',
        }
      : stripeState === 'in_review'
      ? {
          tone: 'bg-sky-50 border-sky-200 text-sky-800',
          icon: <Clock className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />,
          text: en
            ? "Stripe is reviewing your information. There's nothing to do for now; it usually takes from a few minutes to a couple of business days."
            : 'Stripe está revisando tus datos. No tienes que hacer nada por ahora; suele tardar entre unos minutos y un par de días hábiles.',
        }
      : onlinePaymentsAllowed
      ? {
          tone: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />,
          text: t.settings_stripeReady,
        }
      : {
          tone: 'bg-gray-50 border-gray-200 text-gray-700',
          icon: <CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />,
          text: en
            ? "Stripe is connected, but card payments are off because your plan doesn't include online payments."
            : 'Stripe está conectado, pero las tarjetas están apagadas porque tu plan no incluye pagos en línea.',
        };
  // Stripe asks for more while the account can still charge: say it before it pauses.
  const stripeDueNote: string | null =
    (stripeState === 'active' || stripeState === 'in_review') && stripeStatus.requirementsDueCount > 0
      ? stripeStatus.requirementsDeadline
        ? (en
            ? `Stripe needs more information by ${new Date(stripeStatus.requirementsDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. If it's not provided, Stripe will pause your card payments.`
            : `Stripe necesita más datos antes del ${new Date(stripeStatus.requirementsDeadline).toLocaleDateString('es', { day: 'numeric', month: 'long' })}. Si no los envías, Stripe pausará tus cobros con tarjeta.`)
        : (en
            ? 'Stripe needs more information. Provide it soon so your card payments are not paused.'
            : 'Stripe necesita más datos. Envíalos pronto para que no se pausen tus cobros con tarjeta.')
      : null;

  // US spans several zones; other countries keep one zone each. The saved zone
  // is always listed so the select never shows a value it doesn't have.
  const isUsRestaurant = form.country_code === 'US' || (!form.country_code && form.currency === 'USD');
  const timezoneOptions: { value: string; label: string }[] = isUsRestaurant
    ? US_TIMEZONES.map((z) => ({ value: z.tz, label: `🇺🇸 ${locale === 'en' ? z.en : z.es} (${formatTimezone(z.tz)})` }))
    : COUNTRY_CONFIG_LIST.map((c) => ({ value: c.timezone, label: `${c.flag} ${formatTimezone(c.timezone)} (${c.name})` }));
  if (form.timezone && !timezoneOptions.some((o) => o.value === form.timezone)) {
    timezoneOptions.unshift({ value: form.timezone, label: formatTimezone(form.timezone) });
  }
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
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(locale === 'en'
        ? 'This image is larger than 4.5 MB. Please choose a smaller one (a screenshot of the photo works too).'
        : 'La imagen pesa más de 4,5 MB. Elige una más liviana (también sirve una captura de pantalla de la foto).');
      return null;
    }
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      // A 413 from the platform comes back as plain text, not JSON.
      const data: { url?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) { setError(data.error ?? t.settings_uploadError); return null; }
      return data.url;
    } catch {
      setError(t.settings_uploadError);
      return null;
    }
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
    try {
      const url = await uploadImage(file);
      if (url) {
        setLogoUrl(url);
        await autoSaveImageField('logo_url', url);
      }
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    try {
      const url = await uploadImage(file);
      if (url) {
        setCoverUrl(url);
        await autoSaveImageField('cover_image_url', url);
      }
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = '';
    }
  };

  const handleSave = async () => {
    // Validate operating hours before saving
    for (const day of DAYS) {
      const h = hours[day.key];
      // Closing earlier than opening is allowed: it closes after midnight.
      if (!h.closed && !h.fullDay && dayHoursError(h.open, h.close)) {
        setError(
          locale === 'en'
            ? `${dayLabels[day.key]}: opening and closing times are the same. If you're open all day, use "${t.settings_24h}".`
            : `${dayLabels[day.key]}: la hora de apertura y de cierre son iguales. Si abres todo el día, usa "${t.settings_24h}".`
        );
        return;
      }
    }

    // Online-only with no way to charge cards: customers could not order at all
    // (the checkout blocks it and /api/orders rejects cash).
    if (!form.payment_methods_enabled.includes('cash') && form.payment_methods_enabled.includes('online') && !onlineUsable) {
      setError(
        locale === 'en'
          ? `Customers can't pay online yet, so with only "${t.settings_onlinePayment}" nobody could order. Turn on "${t.settings_cash}" too, or finish the online payment setup first.`
          : `Tus clientes todavía no pueden pagar en línea: con solo "${t.settings_onlinePayment}" nadie podría pedir. Activa también "${t.settings_cash}", o termina primero la configuración del pago en línea.`
      );
      return;
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
          delivery_min_order: form.delivery_min_order ? Number(form.delivery_min_order) : null,
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
          DOMAIN_REQUIRES_PRO: t.error_domainRequiresPro,
          NO_CHANGES: t.error_noChanges,
          TAX_RATE_INVALID: t.error_taxRateInvalid,
          EMAIL_INVALID: t.error_emailInvalid,
          REGION_LOCKED: locale === 'en'
            ? 'Country and currency are locked because your Stripe account is active. Write to support if you need to change them.'
            : 'El país y la moneda están fijos porque tu cuenta de Stripe está activa. Escríbenos a soporte si necesitas cambiarlos.',
          OWNER_ONLY: locale === 'en'
            ? 'Payments, tax, currency, country and domain can only be changed from your phone or computer, not from a shared tablet.'
            : 'Los cobros, el impuesto, la moneda, el país y el dominio solo se cambian desde tu celular o computadora, no desde una tablet compartida.',
        };
        throw new Error(API_ERROR_MAP[data.error] ?? data.error ?? t.settings_errorSaving);
      }
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.settings_errorSaving);
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
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 shrink-0 active:opacity-80 transition-opacity"
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

      {/* Color del restaurante (seguimiento del pedido) */}
      <div id="brand-color" className="bg-white rounded-2xl border border-gray-200 p-5 scroll-mt-20">
        <h2 className="font-semibold text-sm text-gray-900 mb-1">
          {locale === 'en' ? 'Restaurant color' : 'Color del restaurante'}
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {locale === 'en'
            ? 'Used on the order tracking page your customers see (progress, map, pickup code). Buttons stay MENIUS green.'
            : 'Se usa en la página de seguimiento que ve tu cliente (avance del pedido, mapa, código para recoger). Los botones siguen en verde MENIUS.'}
        </p>
        {(() => {
          const preview = trackerBrand(brandColor || null);
          return (
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative w-11 h-11 rounded-full overflow-hidden border border-gray-200 cursor-pointer shrink-0" style={{ background: brandColor || '#ffffff' }}>
                <span className="sr-only">{locale === 'en' ? 'Pick a color' : 'Elegir color'}</span>
                <input
                  type="color"
                  value={brandColor || '#1d1d1f'}
                  onChange={(e) => { setBrandColor(normalizeBrandColor(e.target.value) ?? ''); setBrandSaving('idle'); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <span className="text-sm font-mono text-gray-700 tabular-nums">{brandColor || (locale === 'en' ? 'No color' : 'Sin color')}</span>
              {/* Vista previa: así se ve un paso hecho y el código del mostrador */}
              <span className="inline-flex items-center gap-2 rounded-full px-3 h-8 text-xs font-semibold" style={{ background: preview.brand, color: preview.ink }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.2 4.2L19 7" /></svg>
                #042
              </span>
              {brandColor && (
                <button
                  type="button"
                  onClick={() => { setBrandColor(''); setBrandSaving('idle'); }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  {t.settings_remove}
                </button>
              )}
              <span className="text-xs text-gray-500 basis-full" role="status">
                {brandSaving === 'saving' ? (locale === 'en' ? 'Saving…' : 'Guardando…')
                  : brandSaving === 'saved' ? (locale === 'en' ? 'Saved' : 'Guardado')
                  : brandSaving === 'error' ? (locale === 'en' ? "Couldn't save. Try again." : 'No se pudo guardar. Intenta de nuevo.')
                  : brandColor && preview.fallback
                    ? (locale === 'en' ? "This color is too light to read on white: we'll use dark gray instead." : 'Este color es muy claro para leerse sobre blanco: usaremos gris oscuro.')
                    : ''}
              </span>
            </div>
          );
        })()}
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
          <div className="relative w-full aspect-3/1 rounded-xl overflow-hidden bg-gray-100 group">
            <Image src={coverUrl} alt="Banner" fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
            <div className="absolute inset-0 bg-black/25 md:pointer-fine:bg-black/0 md:group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3">
              <button
                onClick={() => coverRef.current?.click()}
                disabled={uploadingCover}
                className="md:pointer-fine:opacity-0 md:group-hover:opacity-100 px-3 py-2 bg-white rounded-lg text-sm font-medium hover:bg-gray-100 active:bg-gray-200 transition-all"
              >
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Camera className="w-4 h-4 inline mr-1" />}
                {t.settings_change}
              </button>
              <button
                onClick={() => { setCoverUrl(''); setSaved(false); }}
                className="md:pointer-fine:opacity-0 md:group-hover:opacity-100 px-3 py-2 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-all"
              >
                {t.settings_remove}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            className="w-full aspect-3/1 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors disabled:opacity-50"
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

      {/* "Powered by MENIUS" footer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-gray-900">
              {locale === 'en' ? 'Hide "Powered by MENIUS"' : 'Ocultar "Powered by MENIUS"'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {onlinePaymentsAllowed
                ? locale === 'en'
                  ? 'Removes the small MENIUS line at the bottom of your online menu.'
                  : 'Quita la línea pequeña de MENIUS al final de tu menú online.'
                : locale === 'en'
                  ? 'Available on the Pro plan.'
                  : 'Disponible en el plan Pro.'}
            </p>
            {brandingSaving === 'error' && (
              <p className="text-xs text-red-600 mt-1">
                {locale === 'en' ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.'}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideBranding}
            aria-label={locale === 'en' ? 'Hide Powered by MENIUS' : 'Ocultar Powered by MENIUS'}
            disabled={!onlinePaymentsAllowed || brandingSaving === 'saving'}
            onClick={toggleBranding}
            className={cn(
              'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
              hideBranding ? 'bg-emerald-600' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                hideBranding ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
      </div>

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
          <Field label="Instagram" value={form.instagram_url} onChange={(v) => handleChange('instagram_url', v)} placeholder="https://instagram.com/mirestaurante" />
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
              disabled={regionLocked}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 disabled:bg-gray-50 disabled:text-gray-500"
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
            {regionLocked && (
              <p className="text-xs text-gray-500 mt-1.5 ml-0.5">
                {locale === 'en'
                  ? 'Country and currency are locked: your Stripe account is active in this country. Write to support if you need to change them.'
                  : 'País y moneda fijos: tu cuenta de Stripe está activa en este país. Escríbenos a soporte si necesitas cambiarlos.'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.settings_timezone}</label>
            <select
              value={form.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
            >
              {timezoneOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.settings_currency}</label>
            <select
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              disabled={regionLocked}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 disabled:bg-gray-50 disabled:text-gray-500"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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
              disabled={regionLocked}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">{locale === 'en' ? '— No country / custom —' : '— Sin país / personalizado —'}</option>
              {getCountryList().map((c) => (
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">— Select state —</option>
                {getUsStateList().map((s) => (
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">— Select your city to auto-fill combined rate —</option>
                {US_CITY_TAX_RATES[form.state_code].map((c) => (
                  <option key={c.name} value={c.rate}>
                    {c.name} — {c.rate}%
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex gap-1.5 items-start">
                <span className="shrink-0 mt-0.5">⚠️</span>
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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
                    className="ml-0.5 p-0.5 rounded-sm hover:bg-gray-200 transition-colors"
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
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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
                  className="w-4 h-4 rounded-sm border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/30"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <label className="text-xs font-medium text-gray-500">
                    {locale === 'en' ? 'Minimum order (delivery)' : 'Pedido mínimo (domicilio)'}
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.delivery_min_order}
                  onChange={(e) => { setForm((prev) => ({ ...prev, delivery_min_order: e.target.value })); setSaved(false); }}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {locale === 'en'
                    ? 'Delivery orders below this subtotal are rejected. 0 = no minimum.'
                    : 'Pedidos a domicilio por debajo de este subtotal se rechazan. 0 = sin mínimo.'}
                </p>
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
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-xs text-gray-500">{unit}</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
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
                    {form.latitude && form.longitude
                      ? (locale === 'en'
                          ? 'Enforced: autocompleted addresses outside this radius are rejected at checkout'
                          : 'Se aplica: direcciones autocompletadas fuera de este radio se rechazan en el checkout')
                      : (locale === 'en'
                          ? 'Set your restaurant address above to enforce this radius at checkout'
                          : 'Configura la dirección de tu restaurante arriba para aplicar este radio en el checkout')}
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
      <div id="pagos" className="bg-white rounded-2xl border border-gray-200 p-5 scroll-mt-20">
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
                  className="w-4 h-4 rounded-sm border-gray-300 bg-gray-50 text-emerald-600 focus:ring-emerald-500/30"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  <p className="text-[11px] text-gray-500">{opt.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Plan without online payments (e.g. trial ended): /api/orders rejects cards. */}
        {!onlinePaymentsAllowed && (
          <div className="flex items-start gap-2.5 mt-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>
              {en
                ? "Your current plan doesn't include online payments (for example, your free trial ended), so customers only see cash. "
                : 'Tu plan actual no incluye pagos en línea (por ejemplo, terminó tu prueba gratis), así que los clientes solo ven efectivo. '}
              <a href="/app/billing" className="font-semibold underline">
                {en ? 'Choose a plan' : 'Elegir un plan'}
              </a>
            </span>
          </div>
        )}

        {/* Warning: online enabled but gateway not ready */}
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
        {form.payment_methods_enabled.includes('online') && isColombianRestaurant && !wompiStatus.loading && !wompiStatus.connected && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>
              {locale === 'en'
                ? 'Online payment is enabled but Wompi is not connected. Customers will not see online payment as an option until you connect your Wompi keys below.'
                : 'El pago en línea está activado pero Wompi no está conectado. Los clientes no verán esa opción hasta que conectes tus llaves de Wompi abajo.'}
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
                ? 'Connect YOUR Wompi account (cards, PSE, Nequi, Daviplata) — payments go straight to your bank account. Get your keys at comercios.wompi.co → Developers.'
                : 'Conectá TU cuenta de Wompi (tarjetas, PSE, Nequi, Daviplata) — los cobros llegan directo a tu cuenta bancaria. Sacá tus llaves en comercios.wompi.co → Desarrolladores.'}
            </p>
            {wompiStatus.loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {locale === 'en' ? 'Checking…' : 'Verificando…'}
              </div>
            ) : wompiStatus.connected && !wompiEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    {locale === 'en' ? 'Connected' : 'Conectado'}
                    {wompiStatus.publicKey ? ` · ${wompiStatus.publicKey.slice(0, 16)}…` : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWompiEditing(true)}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {locale === 'en' ? 'Change keys' : 'Cambiar llaves'}
                  </button>
                  <button
                    onClick={handleDisconnectWompi}
                    disabled={wompiStatus.saving}
                    className="flex-1 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {locale === 'en' ? 'Disconnect' : 'Desconectar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={wompiForm.public_key}
                  onChange={(e) => setWompiForm((p) => ({ ...p, public_key: e.target.value }))}
                  placeholder={locale === 'en' ? 'Public key (pub_prod_…)' : 'Llave pública (pub_prod_…)'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400/40"
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={wompiForm.integrity_secret}
                  onChange={(e) => setWompiForm((p) => ({ ...p, integrity_secret: e.target.value }))}
                  placeholder={locale === 'en' ? 'Integrity secret (prod_integrity_…)' : 'Secreto de integridad (prod_integrity_…)'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400/40"
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  value={wompiForm.events_secret}
                  onChange={(e) => setWompiForm((p) => ({ ...p, events_secret: e.target.value }))}
                  placeholder={locale === 'en' ? 'Events secret (prod_events_…)' : 'Secreto de eventos (prod_events_…)'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400/40"
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-gray-400">
                  {locale === 'en'
                    ? 'Also set the events URL in your Wompi dashboard: '
                    : 'Configurá también la URL de eventos en tu panel de Wompi: '}
                  <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded-sm">{appUrl}/api/payments/wompi-webhook</code>
                </p>
                <div className="flex gap-2">
                  {wompiEditing && (
                    <button
                      onClick={() => { setWompiEditing(false); setWompiForm({ public_key: '', integrity_secret: '', events_secret: '' }); }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {locale === 'en' ? 'Cancel' : 'Cancelar'}
                    </button>
                  )}
                  <button
                    onClick={handleSaveWompi}
                    disabled={wompiStatus.saving || !wompiForm.public_key || !wompiForm.integrity_secret || !wompiForm.events_secret}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {wompiStatus.saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {locale === 'en' ? 'Saving…' : 'Guardando…'}</>
                      : (locale === 'en' ? 'Connect Wompi' : 'Conectar Wompi')}
                  </button>
                </div>
              </div>
            )}
            {wompiStatus.error && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{wompiStatus.error}</span>
              </div>
            )}
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
            ) : stripeState === 'not_connected' ? (
              onlinePaymentsAllowed ? (
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
              ) : null
            ) : (
              <div className="space-y-2">
                <div className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border', stripeBox.tone)}>
                  {stripeBox.icon}
                  <span className="text-sm">{stripeBox.text}</span>
                </div>
                {stripeDueNote && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                    <span className="text-xs">{stripeDueNote}</span>
                  </div>
                )}
                {stripeState === 'rejected' && (
                  <p className="text-xs text-gray-600">
                    {en ? 'Write to us at ' : 'Escríbenos a '}
                    <a href={`mailto:${SUPPORT_CONTACT.email}`} className="font-medium text-violet-700 underline">{SUPPORT_CONTACT.email}</a>
                    {SUPPORT_CONTACT.phoneDisplay ? (en ? ` or call ${SUPPORT_CONTACT.phoneDisplay}.` : ` o llama al ${SUPPORT_CONTACT.phoneDisplay}.`) : '.'}
                  </p>
                )}
                {onlinePaymentsAllowed && (stripeState === 'incomplete' || stripeDueNote) && (
                  <button
                    onClick={handleConnectStripe}
                    disabled={stripeStatus.connecting}
                    className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {stripeStatus.connecting
                      ? t.settings_stripeRedirecting
                      : (en ? 'Continue on Stripe' : 'Continuar en Stripe')}
                  </button>
                )}
                {stripeState !== 'incomplete' && (
                  <button
                    onClick={handleOpenStripeDashboard}
                    disabled={stripeStatus.openingDashboard}
                    className="w-full py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {stripeStatus.openingDashboard
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ExternalLink className="w-4 h-4" />}
                    {en ? 'Open my Stripe dashboard' : 'Abrir mi panel de Stripe'}
                  </button>
                )}
              </div>
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
        <h2 className="font-semibold text-sm mb-1 text-gray-900">{t.settings_schedule}</h2>
        <p className="text-[11px] text-gray-500 mb-4">
          {locale === 'en'
            ? 'Open past midnight? Enter the real closing time (e.g. 6:00 PM to 2:00 AM): it counts as the next morning.'
            : '¿Cierras después de la medianoche? Pon la hora real de cierre (ej. 18:00 a 02:00): cuenta como la madrugada siguiente.'}
        </p>
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <input
                    type="time"
                    value={hours[day.key].open}
                    onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-gray-500 text-sm">{t.settings_timeTo}</span>
                  <input
                    type="time"
                    value={hours[day.key].close}
                    onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {crossesMidnight(hours[day.key].open, hours[day.key].close) && (
                    <span className="basis-full text-[11px] text-gray-500">
                      {locale === 'en' ? 'Closes the next day' : 'Cierra al día siguiente'}
                    </span>
                  )}
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
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg ${hours[day.key].closed ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' : 'bg-red-500/8 text-red-400 hover:bg-red-500/12'}`}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
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
        <div className="px-4 py-2.5 rounded-xl bg-red-500/6 text-red-400 border border-red-500/10 text-sm">{error}</div>
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
  const cls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 placeholder-gray-500';
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

type DomainRecord = { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string };
type DomainVerifyResult = {
  verified: boolean;
  code?: 'NEEDS_RECORDS' | 'ISSUING_CERT' | 'PENDING_ACTIVATION' | 'NO_DOMAIN' | 'DOMAIN_REQUIRES_PRO';
  records?: DomainRecord[];
  error?: string;
};

/** Same rule as lib/vercel-domains: example.com needs an A record, www.example.com a CNAME. */
function defaultDomainRecord(domain: string): DomainRecord {
  const parts = domain.split('.').filter(Boolean);
  return parts.length === 2
    ? { type: 'A', name: '@', value: '76.76.21.21' }
    : { type: 'CNAME', name: parts[0] ?? domain, value: 'cname.vercel-dns.com' };
}

function DomainSection({ domain, domainVerified, onChange }: { domain: string; domainVerified: boolean; onChange: (v: string) => void }) {
  const { t, locale } = useDashboardLocale();
  const en = locale === 'en';
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DomainVerifyResult | null>(null);

  // The saved "verified" belongs to the saved domain: typing a new one hides it
  // until it is saved and verified again.
  const [savedDomain] = useState(domain);
  const isVerified = verifyResult?.verified || (domainVerified && domain === savedDomain);
  const records = verifyResult?.records?.length ? verifyResult.records : domain ? [defaultDomainRecord(domain)] : [];

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/domain/verify', { method: 'POST' });
      const data = (await res.json()) as DomainVerifyResult;
      setVerifyResult(data);
    } catch {
      setVerifyResult({ verified: false, error: t.settings_domainNetworkError });
    } finally {
      setVerifying(false);
    }
  };

  const statusText = (r: DomainVerifyResult): string => {
    switch (r.code) {
      case 'NEEDS_RECORDS':
        return en
          ? "Your domain doesn't point to MENIUS yet. Create the records above at your domain provider; it can take up to 48 hours."
          : 'Tu dominio todavía no apunta a MENIUS. Crea los registros de arriba en tu proveedor de dominio; puede tardar hasta 48 horas.';
      case 'ISSUING_CERT':
        return en
          ? 'DNS is correct. We are issuing the security certificate (HTTPS); try again in a few minutes.'
          : 'El DNS está bien. Estamos emitiendo el certificado de seguridad (HTTPS); vuelve a verificar en unos minutos.';
      case 'PENDING_ACTIVATION':
        return en
          ? "DNS is correct. We're activating your domain; it'll be live within 24 hours."
          : 'El DNS está bien. Estamos activando tu dominio; queda listo en menos de 24 horas.';
      case 'NO_DOMAIN':
        return en ? 'Save your domain first.' : 'Primero guarda tu dominio.';
      case 'DOMAIN_REQUIRES_PRO':
        return en ? 'Custom domains are part of the Pro plan.' : 'El dominio propio es parte del plan Pro.';
      default:
        return r.error ?? t.settings_domainNetworkError;
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
          {!isVerified && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 mb-2">{t.settings_dnsRequired}</p>
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={`${r.type}-${r.name}-${r.value}`} className="bg-white rounded-lg p-2.5 border border-emerald-200">
                    <div className="grid grid-cols-[auto_1fr_2fr] gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">{t.settings_dnsType}</span><br /><span className="text-gray-900">{r.type}</span></div>
                      <div className="min-w-0"><span className="text-gray-500">{t.settings_dnsName}</span><br /><span className="text-gray-900 break-all">{r.name}</span></div>
                      <div className="min-w-0"><span className="text-gray-500">{t.settings_dnsValue}</span><br /><span className="text-gray-900 break-all">{r.value}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                {t.settings_dnsPropagation}
              </p>
            </div>
          )}

          {/* Verification status */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {isVerified ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">{t.settings_domainActive}</span>
              </div>
            ) : domain !== savedDomain ? (
              <span className="text-[11px] text-gray-500">
                {en ? 'Save your changes, then verify the domain.' : 'Guarda los cambios y después verifica el dominio.'}
              </span>
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
                  <div className="flex items-start gap-1.5 min-w-0 flex-1">
                    {verifyResult.code === 'PENDING_ACTIVATION' || verifyResult.code === 'ISSUING_CERT'
                      ? <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                    <span className={cn('text-[11px]', verifyResult.code === 'PENDING_ACTIVATION' || verifyResult.code === 'ISSUING_CERT' ? 'text-emerald-700' : 'text-amber-700')}>{statusText(verifyResult)}</span>
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

