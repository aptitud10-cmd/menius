'use client';

import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
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
}

export function PhoneField({
  value,
  onChange,
  onBlur,
  label,
  placeholder = '+1 555 123 4567',
  required,
  dark = true,
  error = false,
  valid = false,
  id,
}: PhoneFieldProps) {
  const baseInput = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-base bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30'
    : 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';
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
      <PhoneInput
        international
        defaultCountry="US"
        flags={flags}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        placeholder={placeholder}
        className={`phone-field ${dark ? 'phone-field--dark' : 'phone-field--light'}`}
        numberInputProps={{ id, className: baseInput + errorInput + validInput, onBlur, autoComplete: 'tel' }}
      />
    </div>
  );
}
