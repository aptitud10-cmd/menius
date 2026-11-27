'use client';

import { useRef, useState, useEffect, useId } from 'react';
import { MapPin } from 'lucide-react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? '';

export interface PlaceResult {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  dark?: boolean;
  required?: boolean;
  error?: boolean;
  /** Sesga las sugerencias a la zona del restaurante (sin esto salían otras ciudades/países). */
  near?: { lat: number; lng: number } | null;
  /** ISO 3166-1 alfa-2 (p. ej. 'us', 'co'): restringe a ese país. */
  country?: string | null;
}

interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
  full: string;
}

/**
 * Las sugerencias se dibujan AQUÍ, debajo del campo, y no con el widget de
 * Google (`.pac-container`). El widget cuelga su lista del <body> con una
 * posición absoluta calculada al teclear: dentro de una hoja fija y con el
 * teclado de iOS desplazando la pantalla quedaba fuera de vista, el cliente no
 * podía elegir y sin elegir no se confirma la dirección (delivery trabado).
 * Datos: AutocompleteService + PlacesService.getDetails con session token
 * (mismo backend y misma facturación que el widget, la clave ya los admite).
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onBlur,
  label,
  placeholder = 'Buscar dirección...',
  dark = true,
  required,
  error = false,
  near,
  country,
}: AddressAutocompleteProps) {
  const [localValue, setLocalValue] = useState(value);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const detailsRef = useRef<google.maps.places.PlacesService | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const reqRef = useRef(0);
  const listId = useId();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (loaded) return;
    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }
    if (!API_KEY) return;
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
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
    if (!loaded || serviceRef.current) return;
    serviceRef.current = new google.maps.places.AutocompleteService();
    detailsRef.current = new google.maps.places.PlacesService(document.createElement('div'));
  }, [loaded]);

  // Pedir sugerencias con un respiro de 220 ms; solo vale la última respuesta.
  useEffect(() => {
    const q = localValue.trim();
    if (!open || !loaded || !serviceRef.current || q.length < 3) {
      if (q.length < 3) setItems([]);
      return;
    }
    const id = ++reqRef.current;
    const t = setTimeout(() => {
      if (!tokenRef.current) tokenRef.current = new google.maps.places.AutocompleteSessionToken();
      serviceRef.current?.getPlacePredictions(
        {
          input: q,
          types: ['address'],
          sessionToken: tokenRef.current,
          // ~30 km alrededor del local: prioriza (no obliga) direcciones cercanas.
          ...(near ? {
            locationBias: new google.maps.LatLngBounds(
              { lat: near.lat - 0.27, lng: near.lng - 0.35 },
              { lat: near.lat + 0.27, lng: near.lng + 0.35 },
            ),
          } : {}),
          ...(country ? { componentRestrictions: { country: country.toLowerCase() } } : {}),
        },
        (preds, status) => {
          if (id !== reqRef.current) return;
          if (status !== google.maps.places.PlacesServiceStatus.OK || !preds) {
            setItems([]);
            return;
          }
          setItems(preds.slice(0, 5).map((p) => ({
            placeId: p.place_id,
            main: p.structured_formatting?.main_text ?? p.description,
            secondary: p.structured_formatting?.secondary_text ?? '',
            full: p.description,
          })));
          setActive(-1);
        },
      );
    }, 220);
    return () => clearTimeout(t);
  // near/country son del restaurante (no cambian durante la sesión).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, open, loaded]);

  const pick = (s: Suggestion) => {
    // Invalida respuestas de sugerencias en vuelo (no deben reabrir la lista).
    const id = ++reqRef.current;
    setOpen(false);
    setItems([]);
    setLocalValue(s.full);
    // Bajar el teclado: deja a la vista el botón para confirmar.
    inputRef.current?.blur();
    const token = tokenRef.current;
    tokenRef.current = null;
    // onChange va recién con las coordenadas: llamarlo antes las borraba en el
    // padre y el aviso "elige de la lista" parpadeaba mientras volvía Google.
    const done = (address: string, lat: number | null, lng: number | null) => {
      if (id !== reqRef.current) return; // el cliente siguió escribiendo
      setLocalValue(address);
      onChange(address);
      onPlaceSelect?.({ address, lat, lng });
    };
    // Si Places Details falla (cuota, red), Geocoder por placeId: sin
    // coordenadas el delivery con radio quedaba trabado aunque eligiera bien.
    const geocode = () => {
      try {
        new google.maps.Geocoder().geocode({ placeId: s.placeId }, (res, st) => {
          const loc = st === 'OK' ? res?.[0]?.geometry?.location : undefined;
          done(res?.[0]?.formatted_address ?? s.full, loc ? loc.lat() : null, loc ? loc.lng() : null);
        });
      } catch {
        done(s.full, null, null);
      }
    };
    if (!detailsRef.current) { geocode(); return; }
    detailsRef.current.getDetails(
      { placeId: s.placeId, fields: ['formatted_address', 'geometry'], ...(token ? { sessionToken: token } : {}) },
      (place, status) => {
        const loc = status === google.maps.places.PlacesServiceStatus.OK ? place?.geometry?.location : undefined;
        if (!loc) { geocode(); return; }
        done(place?.formatted_address || s.full, loc.lat(), loc.lng());
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  };

  const baseInputClass = dark
    ? 'w-full px-3.5 py-2.5 rounded-xl border border-white/8 text-base bg-white/4 text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30'
    : 'w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 text-base text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-gray-900 transition-colors bg-white';
  const inputClass = error ? `${baseInputClass} border-red-400 focus:border-red-400 focus:ring-red-400` : baseInputClass;

  const labelClass = dark
    ? 'block text-xs font-medium text-gray-400 mb-1'
    : 'block text-sm font-semibold text-gray-900 mb-2';

  const showList = open && items.length > 0;

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
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={localValue}
          onChange={(e) => { ++reqRef.current; setLocalValue(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 150); onBlur?.(); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={inputClass}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className={dark
            ? 'mt-1.5 rounded-xl border border-white/8 bg-[#111] overflow-hidden'
            : 'mt-2 rounded-2xl bg-white shadow-[inset_0_0_0_1px_rgba(17,17,20,.1)] overflow-hidden'}
        >
          {items.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // preventDefault en pointerdown/mousedown: el input no pierde el
              // foco antes del click (si no, el primer toque solo bajaba el
              // teclado y la lista se cerraba). Elegir en click y no en
              // pointerdown: arrastrar para desplazar no debe elegir.
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={`flex items-start gap-3 px-3.5 py-3 cursor-pointer ${dark ? 'text-white' : 'text-[#111114]'} ${i > 0 ? (dark ? 'border-t border-white/6' : 'border-t border-black/[0.07]') : ''} ${i === active ? (dark ? 'bg-white/6' : 'bg-[#f5f5f8]') : ''} ${dark ? 'active:bg-white/6' : 'active:bg-[#f5f5f8]'}`}
            >
              <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${dark ? 'text-gray-500' : 'text-[#6b6b74]'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium leading-snug truncate">{s.main}</span>
                {s.secondary && <span className={`block text-[13px] leading-snug truncate ${dark ? 'text-gray-400' : 'text-[#6b6b74]'}`}>{s.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
