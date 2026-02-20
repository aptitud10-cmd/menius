'use client';

import { useState, useRef } from 'react';
import { Save, ExternalLink, CheckCircle2, Bell, MessageCircle, Mail, Globe, ShoppingBag, CreditCard, Loader2, XCircle, RefreshCw, Camera, ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/types';
import { PhoneField } from '@/components/ui/PhoneField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export function RestaurantSettings({ initialData }: { initialData: Restaurant }) {
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
    custom_domain: initialData.custom_domain ?? '',
    notification_whatsapp: initialData.notification_whatsapp ?? '',
    notification_email: initialData.notification_email ?? '',
    notifications_enabled: initialData.notifications_enabled !== false,
    order_types_enabled: initialData.order_types_enabled ?? ['dine_in', 'pickup'],
    payment_methods_enabled: initialData.payment_methods_enabled ?? ['cash'],
  });

  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    DAYS.reduce((acc, day) => {
      const existing = initialData.operating_hours?.[day.key];
      acc[day.key] = {
        open: existing?.open ?? '09:00',
        close: existing?.close ?? '22:00',
        closed: existing?.closed ?? false,
      };
      return acc;
    }, {} as Record<string, { open: string; close: string; closed: boolean }>)
  );

  const [logoUrl, setLogoUrl] = useState(initialData.logo_url ?? '');
  const [coverUrl, setCoverUrl] = useState(initialData.cover_image_url ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${appUrl}/r/${initialData.slug}`;

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleHourChange = (day: string, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSaved(false);
  };

  const toggleClosed = (day: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }));
    setSaved(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return null; }
    if (file.size > 10 * 1024 * 1024) { setError('Máximo 10MB'); return null; }
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Error subiendo imagen'); return null; }
    return data.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    const url = await uploadImage(file);
    if (url) { setLogoUrl(url); setSaved(false); }
    setUploadingLogo(false);
    if (logoRef.current) logoRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    const url = await uploadImage(file);
    if (url) { setCoverUrl(url); setSaved(false); }
    setUploadingCover(false);
    if (coverRef.current) coverRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operating_hours: hours,
          logo_url: logoUrl || null,
          cover_image_url: coverUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo & Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="relative h-40 bg-gradient-to-br from-purple-900/40 to-blue-900/30">
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
          {coverUrl ? (
            <>
              <Image src={coverUrl} alt="Banner" fill className="object-cover" sizes="700px" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 group">
                <button
                  onClick={() => coverRef.current?.click()}
                  disabled={uploadingCover}
                  className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-black/70 text-white text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  Cambiar banner
                </button>
                <button
                  onClick={() => { setCoverUrl(''); setSaved(false); }}
                  className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-black/70 text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors"
            >
              {uploadingCover ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs font-medium">Subir banner del restaurante</span>
                </>
              )}
            </button>
          )}

          {/* Logo overlaid on banner */}
          <div className="absolute -bottom-10 left-5">
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="relative w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-gray-100 group">
              {logoUrl ? (
                <>
                  <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="80px" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => logoRef.current?.click()}
                      disabled={uploadingLogo}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                </>
              ) : (
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-emerald-600 transition-colors"
            >
              {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <Camera className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-12 px-5 pb-5">
          <h2 className="font-semibold text-sm text-gray-900">Identidad visual</h2>
          <p className="text-xs text-gray-500 mt-0.5">El logo y banner se muestran en tu menú público. Haz clic en cada uno para cambiarlos.</p>
        </div>
      </div>

      {/* Public URL */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-3 text-gray-900">Enlace público del menú</h2>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <span className="text-sm text-gray-500 truncate flex-1 font-mono">{publicUrl}</span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100">
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </a>
        </div>
      </div>

      {/* Logo & Banner */}
      <ImageUploadSection
        logoUrl={initialData.logo_url}
        coverUrl={initialData.cover_image_url ?? null}
      />

      {/* Custom Domain */}
      <DomainSection
        domain={form.custom_domain}
        domainVerified={!!(initialData as any).domain_verified}
        onChange={(v) => handleChange('custom_domain', v.toLowerCase().replace(/[^a-z0-9.\-]/g, ''))}
      />

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">Información básica</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del restaurante" value={form.name} onChange={(v) => handleChange('name', v)} />
          <PhoneField label="Teléfono" value={form.phone} onChange={(v) => handleChange('phone', v)} />
          <div className="sm:col-span-2">
            <Field label="Descripción" value={form.description} onChange={(v) => handleChange('description', v)} placeholder="Describe tu restaurante..." textarea />
          </div>
          <AddressAutocomplete label="Dirección" value={form.address} onChange={(v) => handleChange('address', v)} placeholder="Buscar dirección..." />
          <Field label="Email" value={form.email} onChange={(v) => handleChange('email', v)} placeholder="contacto@mirestaurante.com" />
          <Field label="Sitio web" value={form.website} onChange={(v) => handleChange('website', v)} placeholder="https://..." />
        </div>
      </div>

      {/* Regional */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">Regional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Zona horaria</label>
            <select
              value={form.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="America/New_York">New York (EST)</option>
              <option value="America/Chicago">Chicago (CST)</option>
              <option value="America/Los_Angeles">Los Angeles (PST)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Cancun">Cancún (GMT-5)</option>
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Lima">Lima (GMT-5)</option>
              <option value="America/Santiago">Santiago (GMT-4)</option>
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
            <select
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="PEN">PEN — Sol peruano</option>
              <option value="CLP">CLP — Peso chileno</option>
              <option value="ARS">ARS — Peso argentino</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
              <Globe className="w-3.5 h-3.5" />
              Idioma del menú
            </label>
            <select
              value={form.locale}
              onChange={(e) => handleChange('locale', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              El idioma que verán tus clientes en el menú público.
            </p>
          </div>
        </div>
      </div>

      {/* Order Types */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-900">Tipos de orden</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Selecciona qué tipos de orden pueden hacer tus clientes.
        </p>
        <div className="space-y-2.5">
          {([
            { key: 'dine_in', label: 'Comer aquí', desc: 'El cliente ordena y come en tu restaurante' },
            { key: 'pickup', label: 'Para recoger', desc: 'El cliente ordena y pasa a recoger' },
            { key: 'delivery', label: 'Delivery', desc: 'El cliente pone su dirección y tú le envías el pedido' },
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
                        ? prev.order_types_enabled.filter((t) => t !== opt.key)
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
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-900">Métodos de pago</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Cómo pueden pagar tus clientes.
        </p>
        <div className="space-y-2.5">
          {([
            { key: 'cash', label: 'Efectivo / En caja', desc: 'El cliente paga al recibir su pedido o en caja' },
            { key: 'online', label: 'Pago en línea', desc: 'El cliente paga con tarjeta al ordenar (requiere Stripe Connect)' },
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
      </div>

      {/* Operating hours */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4 text-gray-900">Horario de operación</h2>
        <div className="space-y-2.5">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-center gap-3">
              <button
                onClick={() => toggleClosed(day.key)}
                className={`w-24 text-left text-sm font-medium ${hours[day.key].closed ? 'text-gray-500 line-through' : 'text-gray-700'}`}
              >
                {day.label}
              </button>
              {hours[day.key].closed ? (
                <span className="text-sm text-red-400 font-medium">Cerrado</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day.key].open}
                    onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <span className="text-gray-500 text-sm">a</span>
                  <input
                    type="time"
                    value={hours[day.key].close}
                    onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              )}
              <button
                onClick={() => toggleClosed(day.key)}
                className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-lg ${hours[day.key].closed ? 'bg-gray-50 text-gray-500 hover:bg-gray-100' : 'bg-red-500/[0.08] text-red-400 hover:bg-red-500/[0.12]'}`}
              >
                {hours[day.key].closed ? 'Abrir' : 'Cerrar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-sm text-gray-900">Notificaciones</h2>
          </div>
          <button
            onClick={() => { setForm((prev) => ({ ...prev, notifications_enabled: !prev.notifications_enabled })); setSaved(false); }}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              form.notifications_enabled ? 'bg-emerald-500' : 'bg-gray-200'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
              form.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>

        {form.notifications_enabled && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp para nuevas órdenes
              </div>
              <PhoneField
                value={form.notification_whatsapp}
                onChange={(v) => { setForm((prev) => ({ ...prev, notification_whatsapp: v })); setSaved(false); }}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Recibirás un mensaje de WhatsApp cada vez que llegue una nueva orden.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Mail className="w-3.5 h-3.5" />
                Email para notificaciones del negocio
              </label>
              <input
                type="email"
                value={form.notification_email}
                onChange={(e) => { setForm((prev) => ({ ...prev, notification_email: e.target.value })); setSaved(false); }}
                placeholder="owner@mirestaurante.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Los clientes que dejen su email recibirán confirmaciones y actualizaciones de su pedido.
              </p>
            </div>
          </div>
        )}

        {!form.notifications_enabled && (
          <p className="text-sm text-gray-500">Las notificaciones están desactivadas. Actívalas para recibir alertas de nuevas órdenes.</p>
        )}
      </div>

      {/* Save */}
      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/[0.06] text-red-400 border border-red-500/[0.1] text-sm">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 hover:-translate-y-0.5 transition-all disabled:opacity-50"
      >
        {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
      </button>
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
      setVerifyResult({ verified: false, error: 'Error de red. Intenta de nuevo.' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-emerald-600" />
        <h2 className="font-semibold text-sm text-gray-900">Dominio personalizado</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Plan Pro+</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Conecta tu propio dominio para que tus clientes accedan al menú con tu marca.</p>

      <Field
        label="Dominio"
        value={domain}
        onChange={onChange}
        placeholder="menu.mirestaurante.com"
      />

      {domain && (
        <>
          {/* DNS instructions */}
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-700 mb-2">Configuración DNS requerida:</p>
            <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div><span className="text-gray-500">Tipo</span><br /><span className="text-gray-900">CNAME</span></div>
                <div><span className="text-gray-500">Nombre</span><br /><span className="text-gray-900">{domain}</span></div>
                <div><span className="text-gray-500">Valor</span><br /><span className="text-gray-900">cname.vercel-dns.com</span></div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              Agrega este registro CNAME en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.). La propagación puede tardar hasta 48 horas.
            </p>
          </div>

          {/* Verification status */}
          <div className="mt-3 flex items-center gap-3">
            {isVerified ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Dominio verificado y activo</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {verifying ? 'Verificando...' : 'Verificar DNS'}
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

function ImageUploadSection({ logoUrl, coverUrl }: { logoUrl: string | null; coverUrl: string | null }) {
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [cover, setCover] = useState<string | null>(coverUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const uploadAndSave = async (
    file: File,
    field: 'logo_url' | 'cover_image_url',
    setUploading: (v: boolean) => void,
    setUrl: (v: string | null) => void
  ) => {
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Máximo 10MB'); return; }

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const patchRes = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: uploadData.url }),
      });
      if (!patchRes.ok) {
        const patchData = await patchRes.json();
        throw new Error(patchData.error);
      }

      setUrl(uploadData.url);
    } catch (err: any) {
      setError(err.message ?? 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (field: 'logo_url' | 'cover_image_url', setUrl: (v: string | null) => void) => {
    setError('');
    try {
      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setUrl(null);
    } catch (err: any) {
      setError(err.message ?? 'Error al eliminar imagen');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="w-4 h-4 text-emerald-600" />
        <h2 className="font-semibold text-sm text-gray-900">Logo y banner</h2>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1] text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Logo */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Logo del restaurante</label>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAndSave(f, 'logo_url', setUploadingLogo, setLogo);
            e.target.value = '';
          }} />

          {logo ? (
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gray-50 group">
              <Image src={logo} alt="Logo" fill className="object-cover" sizes="112px" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                <button
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadingLogo}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-gray-900/80 text-white transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeImage('logo_url', setLogo)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-gray-900/80 text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {uploadingLogo && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-400/40 flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-all disabled:opacity-50"
            >
              {uploadingLogo ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Subir logo</span>
                </>
              )}
            </button>
          )}
          <p className="text-[11px] text-gray-500 mt-1.5">Cuadrado, min 200x200px</p>
        </div>

        {/* Banner / Cover */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Banner / Portada</label>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAndSave(f, 'cover_image_url', setUploadingCover, setCover);
            e.target.value = '';
          }} />

          {cover ? (
            <div className="relative w-full h-28 rounded-2xl overflow-hidden bg-gray-50 group">
              <Image src={cover} alt="Banner" fill className="object-cover" sizes="400px" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                <button
                  onClick={() => coverRef.current?.click()}
                  disabled={uploadingCover}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-gray-900/80 text-white transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeImage('cover_image_url', setCover)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-gray-900/80 text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {uploadingCover && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-400/40 flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-all disabled:opacity-50"
            >
              {uploadingCover ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Subir banner</span>
                </>
              )}
            </button>
          )}
          <p className="text-[11px] text-gray-500 mt-1.5">Horizontal, recomendado 1200x400px</p>
        </div>
      </div>
    </div>
  );
}
