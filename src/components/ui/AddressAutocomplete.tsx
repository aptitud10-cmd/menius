'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? '';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  dark?: boolean;
  required?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Buscar dirección...',
  dark = true,
  required,
}: AddressAutocompleteProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!API_KEY || loaded) return;

    // Check if already loaded
    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true));
      if (window.google?.maps?.places) setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place?.formatted_address) {
        setLocalValue(place.formatted_address);
        onChange(place.formatted_address);
      }
    });

    autocompleteRef.current = ac;
  }, [loaded, onChange]);

  const handleManualChange = (v: string) => {
    setLocalValue(v);
    onChange(v);
  };

  const inputClass = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-base bg-white/[0.04] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30'
    : 'w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-colors bg-white';

  const labelClass = dark
    ? 'block text-xs font-medium text-gray-400 mb-1'
    : 'block text-sm font-semibold text-gray-900 mb-2';

  return (
    <div>
      {label && (
        <label className={labelClass}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {!dark && (
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
