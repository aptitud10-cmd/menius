'use client';

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  dark?: boolean;
}

export function PhoneField({ value, onChange, label, placeholder = '+1 234 567 8900', required, dark = true }: PhoneFieldProps) {
  const baseInput = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-sm bg-white/[0.04] text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30'
    : 'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 transition-colors text-gray-900';

  return (
    <div>
      {label && (
        <label className={`block text-xs font-medium mb-1 ${dark ? 'text-gray-400' : 'font-semibold text-gray-500 uppercase tracking-wider mb-2'}`}>
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <PhoneInput
        international
        defaultCountry="MX"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        placeholder={placeholder}
        className={`phone-field ${dark ? 'phone-field--dark' : 'phone-field--light'}`}
        numberInputProps={{ className: baseInput }}
      />
    </div>
  );
}
