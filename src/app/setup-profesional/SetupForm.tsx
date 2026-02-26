'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { PhoneField } from '@/components/ui/PhoneField';

interface PackageOption {
  id: string;
  name: string;
  price: number;
}

const formT = {
  es: {
    serviceLabel: 'Servicio *',
    priceMonthly: '/mes',
    priceOneTime: 'único',
    nameLabel: 'Tu nombre *',
    namePlaceholder: 'Juan Pérez',
    emailLabel: 'Email *',
    emailPlaceholder: 'juan@mirestaurante.com',
    restaurantLabel: 'Nombre del restaurante *',
    restaurantPlaceholder: 'Mi Restaurante',
    phoneLabel: 'Teléfono (opcional)',
    menuLabel: '¿Cómo tienes tu menú actualmente?',
    menuDefault: 'Selecciona una opción',
    menuOptions: [
      { value: 'printed', label: 'Menú impreso / físico' },
      { value: 'pdf', label: 'PDF o documento digital' },
      { value: 'photos', label: 'Fotos del menú' },
      { value: 'other_platform', label: 'En otra plataforma digital' },
      { value: 'none', label: 'No tengo menú aún' },
    ],
    messageLabel: 'Mensaje adicional (opcional)',
    messagePlaceholder: 'Cuéntanos sobre tu restaurante, cuántos productos tienes, necesidades especiales...',
    submitSending: 'Enviando...',
    submitButton: 'Enviar solicitud',
    submitFooter: 'Te contactaremos en menos de 24 horas. Sin compromiso.',
    errorRequired: 'Por favor completa todos los campos requeridos.',
    errorGeneric: 'Error enviando la solicitud. Intenta de nuevo.',
    successTitle: '¡Solicitud enviada!',
    successPrefix: 'Recibimos tu solicitud. Te contactaremos en menos de',
    successHours: '24 horas',
    successMid: 'al email',
    successSuffix: 'para confirmar los detalles y comenzar.',
  },
  en: {
    serviceLabel: 'Service *',
    priceMonthly: '/mo',
    priceOneTime: 'one-time',
    nameLabel: 'Your name *',
    namePlaceholder: 'John Smith',
    emailLabel: 'Email *',
    emailPlaceholder: 'john@myrestaurant.com',
    restaurantLabel: 'Restaurant name *',
    restaurantPlaceholder: 'My Restaurant',
    phoneLabel: 'Phone (optional)',
    menuLabel: 'How do you currently have your menu?',
    menuDefault: 'Select an option',
    menuOptions: [
      { value: 'printed', label: 'Printed / physical menu' },
      { value: 'pdf', label: 'PDF or digital document' },
      { value: 'photos', label: 'Photos of the menu' },
      { value: 'other_platform', label: 'On another digital platform' },
      { value: 'none', label: "I don't have a menu yet" },
    ],
    messageLabel: 'Additional message (optional)',
    messagePlaceholder: 'Tell us about your restaurant, how many products you have, special needs...',
    submitSending: 'Sending...',
    submitButton: 'Send request',
    submitFooter: "We'll contact you within 24 hours. No commitment.",
    errorRequired: 'Please fill in all required fields.',
    errorGeneric: 'Error sending the request. Please try again.',
    successTitle: 'Request sent!',
    successPrefix: 'We received your request. We\'ll contact you within',
    successHours: '24 hours',
    successMid: 'at',
    successSuffix: 'to confirm details and get started.',
  },
} as const;

export function SetupForm({ packages, locale = 'es' }: { packages: PackageOption[]; locale?: 'es' | 'en' }) {
  const searchParams = useSearchParams();
  const s = formT[locale];
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    restaurant_name: '',
    package_id: '',
    current_menu: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) {
      const match = packages.find((p) => p.id === planParam);
      if (match) setForm((prev) => ({ ...prev, package_id: match.id }));
    }
  }, [searchParams, packages]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.restaurant_name || !form.package_id) {
      setError(s.errorRequired);
      return;
    }

    setSending(true);
    setError('');

    try {
      const selectedPkg = packages.find((p) => p.id === form.package_id);

      const res = await fetch('/api/setup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          package_name: selectedPkg?.name,
          package_price: selectedPkg?.price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || s.errorGeneric);
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || s.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">{s.successTitle}</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          {s.successPrefix} <strong className="text-white">{s.successHours}</strong> {s.successMid}{' '}
          <strong className="text-white">{form.email}</strong> {s.successSuffix}
        </p>
      </div>
    );
  }

  const inputClasses = 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Package selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{s.serviceLabel}</label>
        <div className="grid grid-cols-2 gap-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleChange('package_id', pkg.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                form.package_id === pkg.id
                  ? 'border-purple-500/40 bg-purple-500/10'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              }`}
            >
              <p className={`text-sm font-semibold ${form.package_id === pkg.id ? 'text-white' : 'text-gray-300'}`}>{pkg.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                ${pkg.price} {pkg.id === 'soporte-mensual' ? s.priceMonthly : s.priceOneTime}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{s.nameLabel}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={s.namePlaceholder}
            className={inputClasses}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{s.emailLabel}</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={s.emailPlaceholder}
            className={inputClasses}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{s.restaurantLabel}</label>
          <input
            type="text"
            value={form.restaurant_name}
            onChange={(e) => handleChange('restaurant_name', e.target.value)}
            placeholder={s.restaurantPlaceholder}
            className={inputClasses}
            required
          />
        </div>
        <div>
          <PhoneField
            label={s.phoneLabel}
            value={form.phone}
            onChange={(v) => handleChange('phone', v)}
            dark={true}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{s.menuLabel}</label>
        <select
          value={form.current_menu}
          onChange={(e) => handleChange('current_menu', e.target.value)}
          className={`${inputClasses} bg-[#0a0a0a]`}
        >
          <option value="">{s.menuDefault}</option>
          {s.menuOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">{s.messageLabel}</label>
        <textarea
          value={form.message}
          onChange={(e) => handleChange('message', e.target.value)}
          placeholder={s.messagePlaceholder}
          rows={4}
          className={`${inputClasses} resize-none`}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full py-4 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-all btn-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {s.submitSending}
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            {s.submitButton}
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-600">
        {s.submitFooter}
      </p>
    </form>
  );
}
