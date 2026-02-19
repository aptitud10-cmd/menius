'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ('places')[] = ['places'];
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? '';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  dark?: boolean;
  rows?: number;
}

export function AddressAutocomplete({ value, onChange, label, placeholder = 'Buscar dirección...', dark = true, rows }: AddressAutocompleteProps) {
  const [localValue, setLocalValue] = useState(value);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const onLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.formatted_address) {
      setLocalValue(place.formatted_address);
      onChange(place.formatted_address);
    }
  }, [onChange]);

  const handleManualChange = (v: string) => {
    setLocalValue(v);
    onChange(v);
  };

  const inputClass = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-sm bg-white/[0.04] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30'
    : 'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-brand-400 transition-colors text-gray-900';

  if (!API_KEY || !isLoaded) {
    return (
      <div>
        {label && (
          <label className={`block text-xs font-medium mb-1 ${dark ? 'text-gray-400' : 'font-semibold text-gray-500 uppercase tracking-wider mb-2'}`}>
            {label}
          </label>
        )}
        {rows ? (
          <textarea value={localValue} onChange={(e) => handleManualChange(e.target.value)} placeholder={placeholder} rows={rows} className={`${inputClass} resize-none`} />
        ) : (
          <input type="text" value={localValue} onChange={(e) => handleManualChange(e.target.value)} placeholder={placeholder} className={inputClass} />
        )}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className={`block text-xs font-medium mb-1 ${dark ? 'text-gray-400' : 'font-semibold text-gray-500 uppercase tracking-wider mb-2'}`}>
          {label}
        </label>
      )}
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <input
          type="text"
          value={localValue}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      </Autocomplete>
    </div>
  );
}
