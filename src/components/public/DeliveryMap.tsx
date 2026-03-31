'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface Coords {
  lat: number;
  lon: number;
}

interface DeliveryMapProps {
  restaurantAddress: string;
  deliveryAddress?: string | null;
  restaurantName: string;
  driverLat?: number | null;
  driverLng?: number | null;
}

async function geocode(address: string): Promise<Coords | null> {
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'menius-app/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function MapFallback({ deliveryAddress, restaurantAddress, restaurantName }: DeliveryMapProps) {
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress ?? restaurantAddress)}`;
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700">{deliveryAddress ?? restaurantAddress}</p>
          <p className="text-[10px] text-gray-400">{restaurantName}</p>
        </div>
      </div>
      <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-2">
        Ver mapa <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

interface LiveMapProps {
  restaurantCoords: Coords;
  deliveryCoords: Coords | null;
  restaurantName: string;
  driverCoords: Coords | null;
}

function LiveMap({ restaurantCoords, deliveryCoords, restaurantName, driverCoords }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css' as any)]).catch(() => {}).then(async () => {
      const L = (await import('leaflet')).default;

      // Load CSS manually
      if (!document.querySelector('#leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if (cancelled || !containerRef.current) return;

      // Center: prefer driver → delivery → restaurant
      const center: [number, number] = driverCoords
        ? [driverCoords.lat, driverCoords.lon]
        : deliveryCoords
        ? [deliveryCoords.lat, deliveryCoords.lon]
        : [restaurantCoords.lat, restaurantCoords.lon];

      const zoom = deliveryCoords ? 14 : 15;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Restaurant marker — fork & knife emoji
      const restaurantIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#059669;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;">🍽️</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([restaurantCoords.lat, restaurantCoords.lon], { icon: restaurantIcon })
        .addTo(map)
        .bindPopup(restaurantName);

      // Delivery address marker — pin
      if (deliveryCoords) {
        const destIcon = L.divIcon({
          html: `<div style="width:32px;height:32px;border-radius:50%;background:#2563eb;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        L.marker([deliveryCoords.lat, deliveryCoords.lon], { icon: destIcon })
          .addTo(map)
          .bindPopup('Dirección de entrega');

        // Dashed line between restaurant and delivery
        L.polyline(
          [[restaurantCoords.lat, restaurantCoords.lon], [deliveryCoords.lat, deliveryCoords.lon]],
          { color: '#10b981', weight: 3, dashArray: '8 6', opacity: 0.6 }
        ).addTo(map);
      }

      // Driver marker — moto icon (only if we have coords)
      const motoIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 3px 12px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;transition:all 0.3s ease;">🛵</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (driverCoords) {
        const driverMarker = L.marker([driverCoords.lat, driverCoords.lon], { icon: motoIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup('🛵 Repartidor en camino');
        driverMarkerRef.current = driverMarker;
      } else {
        // Place marker off-screen (hidden) so we can move it when coords arrive
        const driverMarker = L.marker([0, 0], { icon: motoIcon, zIndexOffset: 1000, opacity: 0 }).addTo(map);
        driverMarkerRef.current = driverMarker;
      }

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        driverMarkerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  // Smooth driver position updates — the Uber-like part
  useEffect(() => {
    if (!ready || !mapRef.current || !driverMarkerRef.current) return;
    if (driverCoords == null) return;

    const newLatLng: [number, number] = [driverCoords.lat, driverCoords.lon];

    // Move marker smoothly
    driverMarkerRef.current.setOpacity(1);
    driverMarkerRef.current.setLatLng(newLatLng);

    // Pan map to follow driver (smooth)
    mapRef.current.panTo(newLatLng, { animate: true, duration: 0.8 });
  }, [ready, driverCoords?.lat, driverCoords?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="w-full h-56 rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ minHeight: 224 }}
    />
  );
}

export function DeliveryMap({ restaurantAddress, deliveryAddress, restaurantName, driverLat, driverLng }: DeliveryMapProps) {
  const [restaurantCoords, setRestaurantCoords] = useState<Coords | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<Coords | null>(null);
  const [geocodingDone, setGeocodingDone] = useState(false);

  const driverCoords: Coords | null = (driverLat != null && driverLng != null)
    ? { lat: driverLat, lon: driverLng }
    : null;

  useEffect(() => {
    if (!restaurantAddress) return;
    Promise.all([
      geocode(restaurantAddress),
      deliveryAddress ? geocode(deliveryAddress) : Promise.resolve(null),
    ]).then(([rCoords, dCoords]) => {
      setRestaurantCoords(rCoords);
      setDeliveryCoords(dCoords);
      setGeocodingDone(true);
    });
  }, [restaurantAddress, deliveryAddress]);

  if (!geocodingDone) {
    return <div className="w-full h-56 rounded-2xl bg-gray-100 animate-pulse" />;
  }

  if (!restaurantCoords) {
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
      />
      {driverCoords && (
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <p className="text-xs text-gray-500 font-medium">Repartidor en camino · ubicación en tiempo real</p>
        </div>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress ?? restaurantAddress)}`}
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
