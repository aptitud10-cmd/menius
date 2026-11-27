'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Spinner } from '@/components/landing-v2/auth-bits';
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
    menuLabel: 'Where does your menu live today?',
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : s.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-card req-card">
        <div className="sent" role="status">
          <div className="env">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2>{s.successTitle}</h2>
          <p>
            {s.successPrefix} <b>{s.successHours}</b> {s.successMid} <b>{form.email}</b> {s.successSuffix}
          </p>
        </div>
      </div>
    );
  }

  // Etiquetas sin el " *" / " (optional)" del texto: la maqueta los muestra aparte.
  const plain = (label: string) => label.replace(/\s*\*$/, '').replace(/\s*\((optional|opcional)\)$/i, '');
  const optional = locale === 'es' ? '(opcional)' : '(optional)';

  return (
    <form onSubmit={handleSubmit} className="auth-card req-card">
      <div className="form">
        <fieldset className="fld svc-set">
          <legend className="lbl">
            {plain(s.serviceLabel)} <span className="req">*</span>
          </legend>
          <div className="svc">
            {packages.map((pkg) => (
              <label key={pkg.id}>
                <input
                  type="radio"
                  name="package_id"
                  value={pkg.id}
                  checked={form.package_id === pkg.id}
                  onChange={() => handleChange('package_id', pkg.id)}
                />
                {pkg.name}
                <small>${pkg.price.toLocaleString('en-US')} {s.priceOneTime}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="two">
          <div className="fld">
            <label htmlFor="sf-name">{plain(s.nameLabel)} <span className="req">*</span></label>
            <input
              id="sf-name"
              className="inp"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={s.namePlaceholder}
              autoComplete="name"
              required
            />
          </div>
          <div className="fld">
            <label htmlFor="sf-email">{plain(s.emailLabel)} <span className="req">*</span></label>
            <input
              id="sf-email"
              className="inp"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder={s.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>
          <div className="fld">
            <label htmlFor="sf-rest">{plain(s.restaurantLabel)} <span className="req">*</span></label>
            <input
              id="sf-rest"
              className="inp"
              type="text"
              value={form.restaurant_name}
              onChange={(e) => handleChange('restaurant_name', e.target.value)}
              placeholder={s.restaurantPlaceholder}
              autoComplete="organization"
              required
            />
          </div>
          <div className="fld tel-fld-wrap">
            <label htmlFor="sf-phone">{plain(s.phoneLabel)} <span className="opt">{optional}</span></label>
            <PhoneField
              id="sf-phone"
              value={form.phone}
              onChange={(v) => handleChange('phone', v)}
              dark={false}
              locale={locale}
            />
          </div>
        </div>

        <div className="fld">
          <label htmlFor="sf-menu">{s.menuLabel}</label>
          <select
            id="sf-menu"
            className="sel"
            value={form.current_menu}
            onChange={(e) => handleChange('current_menu', e.target.value)}
          >
            <option value="">{s.menuDefault}</option>
            {s.menuOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="fld">
          <label htmlFor="sf-msg">{plain(s.messageLabel)} <span className="opt">{optional}</span></label>
          <textarea
            id="sf-msg"
            className="txt"
            value={form.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder={s.messagePlaceholder}
            rows={4}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <button type="submit" disabled={sending} className="btn btn-primary btn-block">
          {sending ? (
            <>
              <Spinner />
              {s.submitSending}
            </>
          ) : s.submitButton}
        </button>

        <p className="foot-note">{s.submitFooter}</p>
      </div>
    </form>
  );
}
