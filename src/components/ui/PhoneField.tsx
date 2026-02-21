'use client';

import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  dark?: boolean;
}

export function PhoneField({
  value,
  onChange,
  label,
  placeholder = '+1 555 123 4567',
  required,
  dark = true,
}: PhoneFieldProps) {
  const baseInput = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-base bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30'
    : 'w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';

  return (
    <div>
      {label && (
        <label
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
        numberInputProps={{ className: baseInput }}
      />
    </div>
  );
}
