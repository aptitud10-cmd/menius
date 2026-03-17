'use client';

import { useEffect, useState } from 'react';
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

function MapFallback({ restaurantAddress, deliveryAddress, restaurantName }: DeliveryMapProps) {
  const query = deliveryAddress
    ? `${deliveryAddress} to ${restaurantAddress}`
    : restaurantAddress;
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
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-2"
      >
        Ver mapa <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function LeafletMap({ restaurantCoords, deliveryCoords, restaurantName, driverCoords }: {
  restaurantCoords: Coords;
  deliveryCoords: Coords | null;
  restaurantName: string;
  driverCoords: Coords | null;
}) {
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamically import to avoid SSR issues
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
    ]).then(([rl, L]) => {
      // Fix default marker icons (leaflet CSS path issue in Next.js)
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setMapComponents({ ...rl, L: L.default });
    });
  }, []);

  useEffect(() => {
    // Load leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  if (!MapComponents) {
    return (
      <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center">
        <MapPin className="w-6 h-6 text-gray-300" />
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = MapComponents;

  // Center between restaurant and delivery (or just restaurant)
  const centerLat = deliveryCoords
    ? (restaurantCoords.lat + deliveryCoords.lat) / 2
    : restaurantCoords.lat;
  const centerLon = deliveryCoords
    ? (restaurantCoords.lon + deliveryCoords.lon) / 2
    : restaurantCoords.lon;

  const zoom = deliveryCoords ? 13 : 15;

  const lineCoords: [number, number][] = deliveryCoords
    ? [[restaurantCoords.lat, restaurantCoords.lon], [deliveryCoords.lat, deliveryCoords.lon]]
    : [];

  return (
    <div className="w-full h-52 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Restaurant pin */}
        <Marker position={[restaurantCoords.lat, restaurantCoords.lon]}>
          <Popup>{restaurantName}</Popup>
        </Marker>

        {/* Delivery address pin */}
        {deliveryCoords && (
          <Marker position={[deliveryCoords.lat, deliveryCoords.lon]}>
            <Popup>Delivery address</Popup>
          </Marker>
        )}

        {/* Driver pin */}
        {driverCoords && (
          <Marker position={[driverCoords.lat, driverCoords.lon]}>
            <Popup>🛵 Driver</Popup>
          </Marker>
        )}

        {/* Line between restaurant and delivery */}
        {lineCoords.length === 2 && (
          <Polyline positions={lineCoords} color="#10b981" weight={3} dashArray="6 6" opacity={0.7} />
        )}
      </MapContainer>
    </div>
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
    return (
      <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" />
    );
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
      <LeafletMap
        restaurantCoords={restaurantCoords}
        deliveryCoords={deliveryCoords}
        restaurantName={restaurantName}
        driverCoords={driverCoords}
      />
      {/* Google Maps fallback link */}
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
