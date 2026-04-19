'use client';

/**
 * DeliveryMap — Mapbox GL JS professional live tracking map.
 * Uses Mapbox Geocoding v6 (reliable, fast, accurate) instead of Nominatim.
 * Smooth driver marker animation via CSS transitions + requestAnimationFrame.
 * Shows live ETA in minutes via Mapbox Directions API when driver is en route.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

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
  locale?: string;
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
async function fetchEtaMinutes(from: Coords, to: Coords): Promise<number | null> {
  const { etaMinutes } = await fetchDirections(from, to);
  return etaMinutes;
}

// ── Mapbox Geocoding v6 ──────────────────────────────────────────────────────

async function geocodeMapbox(address: string): Promise<Coords | null> {
  if (!MAPBOX_TOKEN || !address) return null;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${MAPBOX_TOKEN}&limit=1`;
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

function MapFallback({ deliveryAddress, restaurantAddress }: DeliveryMapProps) {
  const address = deliveryAddress ?? restaurantAddress;
  if (!address) return null;
  const gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return (
    <div className="space-y-2">
      <div className="w-full h-52 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <iframe
          src={gmapsEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa de entrega"
        />
      </div>
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors py-1"
      >
        <ExternalLink className="w-3 h-3" />
        Abrir en Google Maps
      </a>
    </div>
  );
}

// ── Live Mapbox Map ───────────────────────────────────────────────────────────

interface LiveMapProps {
  restaurantCoords: Coords;
  deliveryCoords: Coords | null;
  restaurantName: string;
  driverCoords: Coords | null;
  etaMinutes: number | null;
  locale?: string;
}

function LiveMap({ restaurantCoords, deliveryCoords, restaurantName, driverCoords, etaMinutes: etaMinutesProp, locale }: LiveMapProps) {
  const en = locale === 'en';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const driverElRef = useRef<HTMLDivElement | null>(null);
  const currentDriverPos = useRef<Coords | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastRoutePosRef = useRef<Coords | null>(null);
  const [ready, setReady] = useState(false);
  // Local ETA updated from Directions API alongside route geometry (single call)
  const [liveEta, setLiveEta] = useState<number | null>(etaMinutesProp);
  const etaMinutes = liveEta ?? etaMinutesProp;

  // Smooth linear interpolation between two positions
  const animateMarkerTo = useCallback((target: Coords) => {
    if (!driverMarkerRef.current || !driverElRef.current) return;

    const start = currentDriverPos.current ?? target;
    const startTime = performance.now();
    const duration = 1500; // 1.5s smooth animation

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
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;

      // Determine initial center and bounds
      const points: [number, number][] = [[restaurantCoords.lng, restaurantCoords.lat]];
      if (deliveryCoords) points.push([deliveryCoords.lng, deliveryCoords.lat]);
      if (driverCoords) points.push([driverCoords.lng, driverCoords.lat]);

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: driverCoords
          ? [driverCoords.lng, driverCoords.lat]
          : deliveryCoords
          ? [deliveryCoords.lng, deliveryCoords.lat]
          : [restaurantCoords.lng, restaurantCoords.lat],
        zoom: 14,
        attributionControl: false,
        logoPosition: 'bottom-right',
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
      restaurantEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#059669;border:2.5px solid white;box-shadow:0 2px 10px rgba(5,150,105,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;">🍽️</div>`;
      new mapboxgl.Marker({ element: restaurantEl, anchor: 'center' })
        .setLngLat([restaurantCoords.lng, restaurantCoords.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(restaurantName))
        .addTo(map);

      // Delivery address marker
      if (deliveryCoords) {
        const destEl = document.createElement('div');
        destEl.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 10px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div>`;
        new mapboxgl.Marker({ element: destEl, anchor: 'center' })
          .setLngLat([deliveryCoords.lng, deliveryCoords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText('Dirección de entrega'))
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
              'line-color': '#047a65',
              'line-width': 6,
              'line-opacity': 0.25,
            },
          });
          // Main route line — dashed until real geometry arrives
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#10b981',
              'line-width': 4,
              'line-dasharray': [2, 2],
              'line-opacity': 0.85,
            },
          });
        });
      }

      // Driver marker (moto) — always created, hidden if no coords yet
      const driverEl = document.createElement('div');
      driverEl.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 3px 14px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:22px;transition:opacity 0.3s ease;';
      driverEl.textContent = '🛵';
      driverElRef.current = driverEl;

      const initPos: [number, number] = driverCoords
        ? [driverCoords.lng, driverCoords.lat]
        : [restaurantCoords.lng, restaurantCoords.lat];

      driverEl.style.opacity = driverCoords ? '1' : '0';

      const driverMarker = new mapboxgl.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat(initPos)
        .addTo(map);

      driverMarkerRef.current = driverMarker;
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
      // Update ETA chip from the same API call — no extra request
      if (eta !== null) setLiveEta(eta);

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

  return (
    <div className="relative w-full" style={{ minHeight: 240 }}>
      <div className="w-full h-60 rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 240 }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
      {/* ETA chip — overlaid bottom-left on the map, only when driver is active */}
      {driverCoords && etaMinutes !== null && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-orange-200 shadow-md rounded-full px-3 py-1.5 pointer-events-none">
          <span className="text-base leading-none">🛵</span>
          <span className="text-sm font-bold text-gray-900">
            ~{etaMinutes} {en ? 'min' : 'min'}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {en ? 'away' : 'restantes'}
          </span>
        </div>
      )}
      {/* Loading ETA chip while calculating */}
      {driverCoords && etaMinutes === null && ready && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-full px-3 py-1.5 pointer-events-none">
          <span className="text-base leading-none">🛵</span>
          <span className="text-xs text-gray-400 font-medium">{en ? 'Calculating…' : 'Calculando…'}</span>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DeliveryMap({ restaurantAddress, deliveryAddress, restaurantName, driverLat, driverLng, locale }: DeliveryMapProps) {
  const en = locale === 'en';
  const [restaurantCoords, setRestaurantCoords] = useState<Coords | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<Coords | null>(null);
  const [geocodingDone, setGeocodingDone] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  const driverCoords = useMemo<Coords | null>(
    () => (driverLat != null && driverLng != null) ? { lat: driverLat, lng: driverLng } : null,
    [driverLat, driverLng],
  );

  useEffect(() => {
    if (!restaurantAddress) return;
    Promise.all([
      geocodeMapbox(restaurantAddress),
      deliveryAddress ? geocodeMapbox(deliveryAddress) : Promise.resolve(null),
    ]).then(([rCoords, dCoords]) => {
      setRestaurantCoords(rCoords);
      setDeliveryCoords(dCoords);
      setGeocodingDone(true);
    });
  }, [restaurantAddress, deliveryAddress]);

  // ETA is now computed inside LiveMap alongside the route update (single API call).
  // This effect only runs when there is no driver yet — static ETA from restaurant
  // to delivery address as a rough estimate before dispatch.
  useEffect(() => {
    if (driverCoords || !restaurantCoords || !deliveryCoords) return;
    fetchEtaMinutes(restaurantCoords, deliveryCoords).then((mins) => {
      if (mins !== null) setEtaMinutes(mins);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!driverCoords, restaurantCoords, deliveryCoords]);

  if (!geocodingDone) {
    return <div className="w-full h-60 rounded-2xl bg-gray-100 animate-pulse" />;
  }

  if (!restaurantCoords || !MAPBOX_TOKEN) {
    return (
      <MapFallback
        restaurantAddress={restaurantAddress}
        deliveryAddress={deliveryAddress}
        restaurantName={restaurantName}
      />
    );
  }

  return (
    <div className="space-y-2">
      <LiveMap
        restaurantCoords={restaurantCoords}
        deliveryCoords={deliveryCoords}
        restaurantName={restaurantName}
        driverCoords={driverCoords}
        etaMinutes={etaMinutes}
        locale={locale}
      />
      {driverCoords && (
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <p className="text-xs text-gray-500 font-medium">
            {etaMinutes !== null
              ? (en ? `Driver on the way · ~${etaMinutes} min` : `Repartidor en camino · ~${etaMinutes} min`)
              : (en ? 'Driver on the way · live location' : 'Repartidor en camino · ubicación en tiempo real')}
          </p>
        </div>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress ?? restaurantAddress)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors py-1"
      >
        <ExternalLink className="w-3 h-3" />
        {en ? 'Open in Google Maps' : 'Abrir en Google Maps'}
      </a>
    </div>
  );
}
