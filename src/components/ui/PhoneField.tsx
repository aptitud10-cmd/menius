'use client';

import PhoneInput, { type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import esLabels from 'react-phone-number-input/locale/es';
import 'react-phone-number-input/style.css';

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  dark?: boolean;
  error?: boolean;
  valid?: boolean;
  id?: string;
  /** ISO 3166-1 alpha-2 country code — sets the default flag and phone prefix */
  country?: string;
  /** Caja gris con etiqueta arriba, como los demás campos del checkout premium. */
  ios?: boolean;
  /** Idioma de los nombres de país del selector (sin esto, inglés). */
  locale?: 'es' | 'en';
}

export function PhoneField({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  required,
  dark = true,
  error = false,
  valid = false,
  id,
  country,
  ios = false,
  locale,
}: PhoneFieldProps) {
  const labels = locale === 'es' ? esLabels : undefined;
  const defaultCountry = (country?.toUpperCase() ?? 'US') as Country;
  const resolvedPlaceholder = placeholder ?? (country ? undefined : '+1 555 123 4567');

  if (ios) {
    return (
      <div className={`relative bg-[#f5f5f8] rounded-xl ${error ? 'shadow-[inset_0_0_0_1.5px_#c4321b]' : ''}`}>
        {label && (
          <label htmlFor={id} className="absolute left-3.5 top-2 text-xs text-[#6b6b74] pointer-events-none">
            {label}
          </label>
        )}
        {/* Sin `international`: ver la nota de abajo (autocompletado del iPhone). */}
        <PhoneInput
          defaultCountry={defaultCountry}
          flags={flags}
          labels={labels}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          placeholder={resolvedPlaceholder}
          className="phone-field phone-field--ios"
          numberInputProps={{
            id,
            onBlur,
            autoComplete: 'tel',
            'aria-required': required ? 'true' : undefined,
            'aria-invalid': error || undefined,
          }}
        />
      </div>
    );
  }
  const baseInput = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/8 text-base bg-white/4 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/30'
    : 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-gray-900 transition-colors bg-white';
  const errorInput = error ? ' border-red-400 focus:border-red-400 focus:ring-red-400' : '';
  const validInput = !error && valid ? ' border-green-400 focus:border-green-500' : '';

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className={`block text-xs font-medium mb-1 ${
            dark
              ? 'text-gray-400'
              : 'text-sm font-semibold text-gray-900 mb-2'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {/* Sin `international`: con defaultCountry la librería acepta un número
          local (se asume del país del restaurante) o uno con "+" (cualquier
          país). Con `international` forzado, el autocompletado del iPhone
          "(718) 555-0123" se leía como +7 185550123 (Rusia) — medido
          2026-11-11. El valor que se guarda sigue siendo E.164 (+17185550123). */}
      <PhoneInput
        defaultCountry={defaultCountry}
        flags={flags}
        labels={labels}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        placeholder={resolvedPlaceholder}
        className={`phone-field ${dark ? 'phone-field--dark' : 'phone-field--light'}`}
        numberInputProps={{ id, className: baseInput + errorInput + validInput, onBlur, autoComplete: 'tel' }}
      />
    </div>
  );
}
