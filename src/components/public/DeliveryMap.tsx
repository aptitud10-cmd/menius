'use client';

/**
 * DeliveryMap — Mapbox GL JS professional live tracking map.
 * Uses Mapbox Geocoding v6 (reliable, fast, accurate) instead of Nominatim.
 * Smooth driver marker animation via CSS transitions + requestAnimationFrame.
 * Shows live ETA in minutes via Mapbox Directions API when driver is en route.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { getTranslations } from '@/lib/translations';
import type { Translations } from '@/lib/translations';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// Minimum position delta (degrees) to trigger a fresh Directions API call.
// ~50 m — avoids spamming the API on GPS jitter.
const ETA_MIN_DELTA = 0.0005;

interface Coords {
  lng: number;
  lat: number;
}

export interface DeliveryMapProps {
  restaurantAddress?: string | null;
  deliveryAddress?: string | null;
  restaurantName: string;
  driverLat?: number | null;
  driverLng?: number | null;
  /** Coordenadas guardadas al pedir (las de la sugerencia elegida): mandan sobre el texto. */
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  locale?: string;
  onEtaUpdate?: (minutes: number | null) => void;
}

// ── Directions — proxied through backend to protect Mapbox quota + Redis cache ─

interface DirectionsResult {
  etaMinutes: number | null;
  routeCoords: [number, number][] | null; // [lng, lat] pairs for GeoJSON LineString
}

async function fetchDirections(from: Coords, to: Coords): Promise<DirectionsResult> {
  try {
    const params = new URLSearchParams({
      fromLat: String(from.lat),
      fromLng: String(from.lng),
      toLat:   String(to.lat),
      toLng:   String(to.lng),
    });
    const res = await fetch(`/api/public/directions?${params}`);
    if (!res.ok) return { etaMinutes: null, routeCoords: null };
    return await res.json();
  } catch {
    return { etaMinutes: null, routeCoords: null };
  }
}

// Used when driver is not yet active — ETA from restaurant to delivery address
// ── Look: mismos tokens que el seguimiento (--tk-* viven en .mt-root) ──────────

const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const RESTAURANT_PIN = `<div style="width:30px;height:30px;border-radius:10px;background:var(--tk-card,#fff);border:2px solid var(--tk-ink,#0E1412);display:grid;place-items:center;box-shadow:0 2px 8px rgba(0,0,0,.18)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="stroke:var(--tk-ink,#0E1412)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M10 20v-5h4v5"/></svg></div>`;
const HOME_PIN = `<div style="width:34px;height:34px;border-radius:50%;background:var(--tk-green,#05C8A7);border:3px solid var(--tk-card,#fff);display:grid;place-items:center;box-shadow:0 2px 10px rgba(0,0,0,.25)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#04241E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/></svg></div>`;
/** Rumbo en grados (0 = norte, sentido horario) de a hacia b. */
function bearingDeg(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Flecha hacia el norte; el marcador entero gira con setRotation(rumbo).
const DRIVER_PIN = `<svg width="18" height="18" viewBox="0 0 24 24" style="fill:var(--tk-btn-fg,#fff)"><path d="M12 2.5l7 18.5-7-4-7 4z"/></svg>`;

// ── Mapbox Geocoding v6 ──────────────────────────────────────────────────────

/** Distancia aproximada en km (haversine). */
function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Una dirección de entrega a más de esto del local es un error de geocodificación. */
const MAX_DELIVERY_KM = 60;

/**
 * near: sesga la búsqueda a la zona del restaurante. Sin esto "3915 111 street"
 * (Corona, Queens) caía en una "111 St" de Canadá y el mapa encuadraba los dos.
 */
async function geocodeMapbox(address: string, near?: Coords | null): Promise<Coords | null> {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const bias = near
      ? `&proximity=${near.lng},${near.lat}&bbox=${near.lng - 0.6},${near.lat - 0.45},${near.lng + 0.6},${near.lat + 0.45}`
      : '';
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${MAPBOX_TOKEN}&limit=1${bias}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    return { lng, lat };
  } catch {
    return null;
  }
}

// ── Fallback (no geocode or no token) ────────────────────────────────────────

function OpenInMapsLink({ address, label }: { address: string; label: string }) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="h-11 flex items-center justify-center gap-1.5 text-[13px] font-semibold border-t"
      style={{ color: 'var(--tk-sub, #6b7280)', borderColor: 'var(--tk-line, #e5e7eb)' }}
    >
      <ExternalLink className="w-3.5 h-3.5" aria-hidden />
      {label}
    </a>
  );
}

function MapFallback({ deliveryAddress, restaurantAddress, locale }: DeliveryMapProps) {
  const address = deliveryAddress ?? restaurantAddress;
  if (!address) return null;
  const gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;
  return (
    <div>
      <div className="w-full h-64 overflow-hidden">
        <iframe
          src={gmapsEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={locale === 'en' ? 'Delivery map' : 'Mapa de entrega'}
        />
      </div>
      <OpenInMapsLink address={address} label={getTranslations(locale ?? 'es').mapOpenInMaps} />
    </div>
  );
}

// ── Live Mapbox Map ───────────────────────────────────────────────────────────

interface LiveMapProps {
  restaurantCoords: Coords;
  deliveryCoords: Coords | null;
  restaurantName: string;
  driverCoords: Coords | null;
  t: Translations;
  onEtaUpdate?: (minutes: number | null) => void;
  /** Mapbox no pudo dibujar (llave, estilo, WebGL): se pasa al mapa de Google. */
  onFail: (reason: string) => void;
}

/** Si el estilo no cargó en este tiempo, el mapa quedó negro: se pasa al de reserva. */
const MAP_LOAD_TIMEOUT_MS = 12_000;

function LiveMap({ restaurantCoords, deliveryCoords, restaurantName, driverCoords, t, onEtaUpdate, onFail }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const driverElRef = useRef<HTMLDivElement | null>(null);
  const currentDriverPos = useRef<Coords | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastRoutePosRef = useRef<Coords | null>(null);
  const [ready, setReady] = useState(false);

  // Smooth linear interpolation between two positions
  const animateMarkerTo = useCallback((target: Coords) => {
    if (!driverMarkerRef.current || !driverElRef.current) return;

    const start = currentDriverPos.current ?? target;
    const startTime = performance.now();
    const duration = 1500; // 1.5s smooth animation

    // La flecha apunta hacia donde va (rumbo). Solo si hubo desplazamiento real
    // (>~5m), para no girarla por jitter de GPS con el repartidor detenido.
    // setRotation y no style.transform: Mapbox usa el transform del elemento
    // para posicionarlo y lo pisaba.
    const dLat = target.lat - start.lat;
    const dLng = target.lng - start.lng;
    if (Math.abs(dLat) > 0.00005 || Math.abs(dLng) > 0.00005) {
      driverMarkerRef.current.setRotation(bearingDeg(start, target));
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);

      const lat = start.lat + (target.lat - start.lat) * eased;
      const lng = start.lng + (target.lng - start.lng) * eased;

      driverMarkerRef.current?.setLngLat([lng, lat]);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        currentDriverPos.current = target;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // Inject mapbox CSS
      if (!document.getElementById('mapbox-gl-css')) {
        const link = document.createElement('link');
        link.id = 'mapbox-gl-css';
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;

      // Determine initial center and bounds
      const points: [number, number][] = [[restaurantCoords.lng, restaurantCoords.lat]];
      if (deliveryCoords) points.push([deliveryCoords.lng, deliveryCoords.lat]);
      if (driverCoords) points.push([driverCoords.lng, driverCoords.lat]);

      const dark = prefersDark();
      const routeColor = dark ? '#5BE3C9' : '#0E1412';
      // Antes, si Mapbox fallaba (llave, estilo, sin WebGL) el cliente veía un
      // recuadro negro sin aviso. Ahora cae al mapa de Google y queda en Sentry.
      let map: any;
      try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        // Mapa sobrio (gris) para que el color lo pongan los puntos y la ruta;
        // oscuro si el teléfono está en oscuro, como el resto de la página.
        style: dark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        center: driverCoords
          ? [driverCoords.lng, driverCoords.lat]
          : deliveryCoords
          ? [deliveryCoords.lng, deliveryCoords.lat]
          : [restaurantCoords.lng, restaurantCoords.lat],
        zoom: 14,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });
      } catch (err) {
        onFail(err instanceof Error ? err.message : 'map init failed');
        return;
      }
      let styleLoaded = false;
      const loadTimer = setTimeout(() => { if (!styleLoaded && !cancelled) onFail('style load timeout'); }, MAP_LOAD_TIMEOUT_MS);
      map.on('load', () => { styleLoaded = true; clearTimeout(loadTimer); });
      map.on('error', (e: { error?: { message?: string; status?: number } }) => {
        // Después de cargar, un tile caído es pasajero; antes, el mapa queda vacío.
        if (styleLoaded || cancelled) return;
        clearTimeout(loadTimer);
        onFail(e?.error?.status ? `HTTP ${e.error.status}: ${e.error.message ?? ''}` : (e?.error?.message ?? 'map error'));
      });

      // Fit map to show all markers
      if (points.length > 1) {
        const lngs = points.map(p => p[0]);
        const lats = points.map(p => p[1]);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
      }

      // Restaurant marker
      const restaurantEl = document.createElement('div');
      restaurantEl.innerHTML = RESTAURANT_PIN;
      new mapboxgl.Marker({ element: restaurantEl, anchor: 'center' })
        .setLngLat([restaurantCoords.lng, restaurantCoords.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(restaurantName))
        .addTo(map);

      // Delivery address marker
      if (deliveryCoords) {
        const destEl = document.createElement('div');
        destEl.innerHTML = HOME_PIN;
        new mapboxgl.Marker({ element: destEl, anchor: 'center' })
          .setLngLat([deliveryCoords.lng, deliveryCoords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(t.mapDeliveryAddress))
          .addTo(map);

        // Route line — starts as dashed placeholder, upgraded to real road
        // geometry from Mapbox Directions once the driver is active.
        map.on('load', () => {
          const placeholderCoords: [number, number][] = [
            [restaurantCoords.lng, restaurantCoords.lat],
            [deliveryCoords.lng, deliveryCoords.lat],
          ];

          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: placeholderCoords },
            },
          });
          // Solid underline (road casing)
          map.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': routeColor,
              'line-width': 8,
              'line-opacity': 0.12,
            },
          });
          // Main route line — dashed until real geometry arrives
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': routeColor,
              'line-width': 4,
              'line-dasharray': [2, 2],
              'line-opacity': 0.9,
            },
          });
        });
      }

      // Repartidor: círculo con flecha — always created, hidden if no coords yet
      const driverEl = document.createElement('div');
      driverEl.style.cssText = 'width:40px;height:40px;border-radius:50%;background:var(--tk-btn,#111816);border:3px solid var(--tk-card,#fff);box-shadow:0 3px 12px rgba(0,0,0,.3);display:grid;place-items:center;transition:opacity 0.3s ease;';
      driverEl.innerHTML = DRIVER_PIN;
      driverElRef.current = driverEl;

      const initPos: [number, number] = driverCoords
        ? [driverCoords.lng, driverCoords.lat]
        : [restaurantCoords.lng, restaurantCoords.lat];

      driverEl.style.opacity = driverCoords ? '1' : '0';

      const driverMarker = new mapboxgl.Marker({ element: driverEl, anchor: 'center', rotationAlignment: 'map' })
        .setLngLat(initPos)
        .addTo(map);

      driverMarkerRef.current = driverMarker;
      // Antes del primer movimiento, la flecha mira hacia la casa del cliente.
      if (driverCoords && deliveryCoords) driverMarker.setRotation(bearingDeg(driverCoords, deliveryCoords));
      if (driverCoords) currentDriverPos.current = driverCoords;

      mapRef.current = map;
      map.resize();
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth driver position updates (Uber-like)
  useEffect(() => {
    if (!ready || !mapRef.current || !driverMarkerRef.current) return;
    if (driverCoords == null) return;

    if (driverElRef.current) driverElRef.current.style.opacity = '1';
    animateMarkerTo(driverCoords);

    // Smoothly pan map to follow driver
    mapRef.current.easeTo({
      center: [driverCoords.lng, driverCoords.lat],
      duration: 1000,
      easing: (t: number) => t * (2 - t), // ease out quad
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, driverCoords?.lat, driverCoords?.lng]);

  // Update route geometry from Mapbox Directions when driver moves >~50m.
  // Replaces the dashed placeholder with the real road path driver→destination.
  useEffect(() => {
    if (!ready || !mapRef.current || !driverCoords || !deliveryCoords) return;

    const map = mapRef.current;
    if (!map.getSource('route')) return;

    const last = lastRoutePosRef.current;
    const moved = !last
      || Math.abs(driverCoords.lat - last.lat) > ETA_MIN_DELTA
      || Math.abs(driverCoords.lng - last.lng) > ETA_MIN_DELTA;
    if (!moved) return;

    lastRoutePosRef.current = driverCoords;

    fetchDirections(driverCoords, deliveryCoords).then(({ etaMinutes: eta, routeCoords }) => {
      if (eta !== null) onEtaUpdate?.(eta);

      if (!routeCoords || !map.getSource('route')) return;
      // Update GeoJSON source with real road geometry
      (map.getSource('route') as any).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeCoords },
      });
      // Switch from dashed to solid once we have real route data
      if (map.getLayer('route')) {
        map.setPaintProperty('route', 'line-dasharray', [1, 0]);
        map.setPaintProperty('route', 'line-width', 4);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, driverCoords?.lat, driverCoords?.lng]);

  // Los minutos van en el bloque grande del seguimiento; el mapa no los repite.
  return (
    <div className="w-full h-64 overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DeliveryMap({ restaurantAddress, deliveryAddress, restaurantName, driverLat, driverLng, deliveryLat, deliveryLng, restaurantLat, restaurantLng, locale, onEtaUpdate }: DeliveryMapProps) {
  const t = getTranslations(locale ?? 'es');
  const [restaurantCoords, setRestaurantCoords] = useState<Coords | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<Coords | null>(null);
  const [geocodingDone, setGeocodingDone] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const failReported = useRef(false);
  const handleMapFail = useCallback((reason: string) => {
    if (!failReported.current) {
      failReported.current = true;
      Sentry.captureMessage(`DeliveryMap: Mapbox falló — ${reason}`, 'warning');
    }
    setLiveFailed(true);
  }, []);

  const driverCoords = useMemo<Coords | null>(
    () => (driverLat != null && driverLng != null) ? { lat: driverLat, lng: driverLng } : null,
    [driverLat, driverLng],
  );

  useEffect(() => {
    if (!restaurantAddress && restaurantLat == null) return;
    let cancelled = false;
    (async () => {
      const rCoords: Coords | null = restaurantLat != null && restaurantLng != null
        ? { lat: restaurantLat, lng: restaurantLng }
        : await geocodeMapbox(restaurantAddress ?? '');
      let dCoords: Coords | null = deliveryLat != null && deliveryLng != null
        ? { lat: deliveryLat, lng: deliveryLng }
        : deliveryAddress ? await geocodeMapbox(deliveryAddress, rCoords) : null;
      // Resultado absurdo (otra ciudad/país): no se dibuja en vez de mostrar un
      // punto falso — el mapa queda con el local y el repartidor.
      if (dCoords && rCoords && distanceKm(rCoords, dCoords) > MAX_DELIVERY_KM) dCoords = null;
      if (cancelled) return;
      setRestaurantCoords(rCoords);
      setDeliveryCoords(dCoords);
      setGeocodingDone(true);
    })();
    return () => { cancelled = true; };
  }, [restaurantAddress, deliveryAddress, deliveryLat, deliveryLng, restaurantLat, restaurantLng]);

  // El ETA en vivo se calcula dentro de LiveMap junto con la ruta (una sola
  // llamada) y sube por onEtaUpdate al bloque grande del seguimiento.

  if (!geocodingDone) {
    return <div className="w-full h-64 animate-pulse" style={{ background: 'var(--tk-surface, #f3f4f6)' }} />;
  }

  if (!restaurantCoords || !MAPBOX_TOKEN || liveFailed) {
    return (
      <MapFallback
        restaurantAddress={restaurantAddress}
        deliveryAddress={deliveryAddress}
        restaurantName={restaurantName}
        locale={locale}
      />
    );
  }

  return (
    <div>
      <LiveMap
        restaurantCoords={restaurantCoords}
        deliveryCoords={deliveryCoords}
        restaurantName={restaurantName}
        driverCoords={driverCoords}
        t={t}
        onEtaUpdate={onEtaUpdate}
        onFail={handleMapFail}
      />
      <OpenInMapsLink address={deliveryAddress ?? restaurantAddress ?? ''} label={t.mapOpenInMaps} />
    </div>
  );
}
