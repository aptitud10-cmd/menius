'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  CheckCircle, Camera, Upload,
  Loader2, Package, DoorOpen, MapPin, Bike, AlertTriangle, Navigation,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { haversineKm } from '@/lib/utils/eta';
import { OrderChat } from '@/components/shared/OrderChat';

type GpsStatus = 'idle' | 'sharing' | 'error' | 'unsupported';
type DeliveryStep = 'start' | 'picked_up' | 'at_door' | 'delivered';

const DRIVER_IDENTITY_KEY = 'menius-driver-identity';

function getDriverIdentity(): { name: string; phone: string } | null {
  try {
    const raw = localStorage.getItem(DRIVER_IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.name ? { name: parsed.name, phone: parsed.phone ?? '' } : null;
  } catch { return null; }
}

function getT(lang: string) {
  const en = lang === 'en';
  return {
    en,
    title:      en ? 'MENIUS Driver'              : 'MENIUS Repartidor',
    subtitle:   en ? 'Delivery tracking'           : 'Seguimiento de entrega',
    step1Label: en ? 'Pick up order'               : 'Recoger pedido',
    step2Label: en ? 'At the door'                 : 'En la puerta',
    step3Label: en ? 'Delivered'                   : 'Entregado',
    step1Btn:   en ? '📦  I picked up the order'   : '📦  Ya tengo el pedido',
    step2Btn:   en ? '🚪  I\'m at the door'        : '🚪  Estoy en la puerta',
    step3Btn:   en ? '✅  Order delivered'          : '✅  Pedido entregado',
    gpsSharing: en ? '📡 GPS active'               : '📡 GPS activo',
    gpsEvery:   en ? 'Keep this page open'          : 'Mantén esta página abierta',
    gpsErr:     en ? 'Could not get your location'  : 'No se pudo obtener tu ubicación',
    gpsUnsupported: en ? 'GPS not available'        : 'GPS no disponible',
    tryAgain:   en ? 'Try again'                    : 'Intentar de nuevo',
    doneTitle:  en ? 'Delivery complete!'           : '¡Entrega completada!',
    doneSub:    en ? 'Thank you!'                   : '¡Gracias!',
    photoTitle: en ? 'Proof of delivery'            : 'Foto de prueba',
    photoTap:   en ? 'Tap to take photo'            : 'Toca para tomar la foto',
    photoOk:    en ? '✓ Photo uploaded'             : '✓ Foto enviada',
    photoAlt:   en ? 'Delivery proof'               : 'Foto de entrega',
    photoErr:   en ? 'Upload failed — try again'    : 'Error al subir — intenta de nuevo',
    connErr:    en ? 'Connection error'             : 'Error de conexión',
    tokenExp:   en ? 'Link expired'                 : 'Enlace expirado',
    errSend:    en ? 'Error — try again'            : 'Error — intenta de nuevo',
    deliverTo:  en ? 'Deliver to'                   : 'Entregar en',
    navigateGmaps: en ? 'Navigate with Google Maps' : 'Navegar con Google Maps',
    navigateWaze:  en ? 'Open in Waze'              : 'Abrir en Waze',
    screenOn:      en ? '🔆 Screen stays on'        : '🔆 Pantalla activa',
  };
}

const STEPS: DeliveryStep[] = ['start', 'picked_up', 'at_door', 'delivered'];

export function DriverTrackClient({ token, lang }: { token: string; lang: string }) {
  const t = getT(lang);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsError, setGpsError] = useState('');
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep>('start');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCancelled, setOrderCancelled] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const customerGeocoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const deliveryStepRef = useRef<DeliveryStep>('start');
  const geofenceTriggeredRef = useRef(false);

  // Driver identity — auto-assign from localStorage
  const [driverIdentity, setDriverIdentity] = useState<{ name: string; phone: string } | null>(null);
  const [driverAssigned, setDriverAssigned] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const selfAssignCalledRef = useRef(false);
  const [customerComingOut, setCustomerComingOut] = useState(false);

  const fetchOrderInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/order?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveryAddress(data.deliveryAddress ?? null);
        setDeliveryInstructions(data.deliveryInstructions ?? null);
        setCustomerPhone(data.customerPhone ?? null);
        if (data.orderId) setOrderId(data.orderId);
        if (data.orderStatus === 'cancelled') setOrderCancelled(true);

        // Track if a driver is already assigned
        if (data.driverName) setDriverAssigned(true);

        // Restore step from server timestamps so a page reload doesn't reset progress
        if (data.driverDeliveredAt) {
          setDeliveryStep('delivered');
        } else if (data.driverAtDoorAt) {
          setDeliveryStep('at_door');
        } else if (data.driverPickedUpAt) {
          setDeliveryStep('picked_up');
          startGps();
        }

        return data;
      }
    } catch { /* silent */ }
    return null;
  // startGps is stable (no deps), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // On mount: fetch order info, then auto-assign driver from localStorage if unassigned
  useEffect(() => {
    (async () => {
      const data = await fetchOrderInfo();
      if (!data || selfAssignCalledRef.current) return;

      // Check localStorage for registered driver identity
      const identity = getDriverIdentity();
      if (identity) {
        setDriverIdentity(identity);
        setRegName(identity.name);
        setRegPhone(identity.phone);
      }

      // Auto-assign if no driver assigned yet and we have identity
      if (!data.driverName && identity) {
        selfAssignCalledRef.current = true;
        try {
          const res = await fetch('/api/driver/self-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, driverName: identity.name, driverPhone: identity.phone }),
          });
          if (res.ok) setDriverAssigned(true);
        } catch { /* silent */ }
      } else if (!data.driverName && !identity) {
        // No identity — show registration prompt
        setShowRegistration(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => { deliveryStepRef.current = deliveryStep; }, [deliveryStep]);

  // Geocode delivery address once — used for geofencing (auto "at door" within 100 m)
  useEffect(() => {
    if (!deliveryAddress || customerGeocoordsRef.current) return;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(deliveryAddress)}`,
      { headers: { 'Accept-Language': 'en' } }
    )
      .then(r => r.json())
      .then((results: { lat: string; lon: string }[]) => {
        if (results.length) {
          customerGeocoordsRef.current = {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
          };
        }
      })
      .catch(() => {});
  }, [deliveryAddress]);

  // Realtime subscription — notifies the driver immediately if the restaurant cancels the order.
  // Only subscribes once we have the order's UUID from the initial REST fetch.
  useEffect(() => {
    if (!orderId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`driver-order:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: Record<string, unknown>) => {
          if ((payload.new as any)?.status === 'cancelled') {
            setOrderCancelled(true);
            stopGps();
          }
        }
      )
      .subscribe();

    // Listen for customer "coming out" broadcast
    const commsChannel = supabase
      .channel(`order-comms:${orderId}`)
      .on('broadcast', { event: 'customer_coming_out' }, () => {
        setCustomerComingOut(true);
        // Sound alert — urgent doorbell tone
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const now = ctx.currentTime;
          [784, 988, 784, 1175].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.35, now + i * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.18 + 0.16);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + i * 0.18);
            osc.stop(now + i * 0.18 + 0.2);
          });
        } catch { /* no audio */ }
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
        // Auto-dismiss after 30s
        setTimeout(() => setCustomerComingOut(false), 30_000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commsChannel);
    };
  // stopGps is stable — defined below with no reactive deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const sendLocation = async (lat: number, lng: number) => {
    try {
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lat, lng }),
      });
      if (res.status === 410) stopGps();
    } catch { /* silent */ }
  };

  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      const lock: WakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener('release', () => setWakeLockActive(false));
    } catch { /* permission denied or not supported */ }
  };

  const releaseWakeLock = () => {
    const lock = wakeLockRef.current;
    if (lock) {
      lock.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const startGps = () => {
    if (!navigator.geolocation) { setGpsStatus('unsupported'); return; }
    setGpsStatus('sharing');
    setGpsError('');
    acquireWakeLock();
    const gpsOpts: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };
    navigator.geolocation.getCurrentPosition(
      pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
      err => { setGpsStatus('error'); setGpsError(err.message); },
      gpsOpts,
    );
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setGpsStatus('sharing');
          setGpsError('');
          sendLocation(lat, lng);

          // Geofencing — auto-trigger "at door" when within 100 m of delivery address
          const destCoords = customerGeocoordsRef.current;
          if (
            deliveryStepRef.current === 'picked_up' &&
            destCoords &&
            !geofenceTriggeredRef.current
          ) {
            const distKm = haversineKm(lat, lng, destCoords.lat, destCoords.lng);
            if (distKm <= 0.1) {
              geofenceTriggeredRef.current = true;
              callDriverStatus('at_door').then(ok => {
                if (ok) setDeliveryStep('at_door');
              });
            }
          }
        },
        err => setGpsError(err.message),
        gpsOpts,
      );
    }, 5_000);
  };

  const stopGps = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    releaseWakeLock();
    setGpsStatus('idle');
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const callDriverStatus = async (action: 'picked_up' | 'at_door' | 'delivered'): Promise<boolean> => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
        return true;
      }
      const d = await res.json().catch(() => ({}));
      setActionError(res.status === 410 ? t.tokenExp : (d.error ?? t.errSend));
      return false;
    } catch {
      setActionError(t.connErr);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickedUp = async () => {
    startGps();
    const ok = await callDriverStatus('picked_up');
    if (ok) setDeliveryStep('picked_up');
  };

  const handleAtDoor = async () => {
    const ok = await callDriverStatus('at_door');
    if (ok) setDeliveryStep('at_door');
  };

  const handleDelivered = async () => {
    const ok = await callDriverStatus('delivered');
    if (ok) { stopGps(); setDeliveryStep('delivered'); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError('');
    try {
      const form = new FormData();
      form.append('token', token);
      form.append('photo', file);
      const res = await fetch('/api/driver/photo', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) setPhotoUrl(data.url);
      else setPhotoError(data.error ?? t.photoErr);
    } catch {
      setPhotoError(t.connErr);
    } finally {
      setPhotoUploading(false);
    }
  };

  const stepIndex = STEPS.indexOf(deliveryStep);

  if (deliveryStep === 'delivered') {
    return (
      <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-400">{t.doneTitle}</p>
            <p className="text-gray-400 text-sm mt-1">{t.doneSub}</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 space-y-3 text-left">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-300">{t.photoTitle}</p>
            </div>
            {photoUrl ? (
              <div className="space-y-2">
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <Image src={photoUrl} alt={t.photoAlt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" />
                </div>
                <p className="text-sm text-emerald-400 text-center font-semibold">{t.photoOk}</p>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-700 rounded-xl p-6 cursor-pointer hover:border-emerald-500/60 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {photoUploading
                  ? <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  : <Upload className="w-8 h-8 text-gray-400" />}
                <span className="text-sm text-gray-400">{photoUploading ? '…' : t.photoTap}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            )}
            {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
          </div>

          <p className="text-gray-700 text-xs">Powered by MENIUS · {token.slice(0, 8)}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center p-5 pb-10 text-white">
      <div className="w-full max-w-sm space-y-5 mt-8">

        {/* Cancellation banner — shown in real-time if restaurant cancels the order */}
        {orderCancelled && (
          <div className="flex items-start gap-3 bg-red-950/80 border border-red-700 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-300">
                {t.en ? 'Order cancelled' : 'Pedido cancelado'}
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                {t.en ? 'The restaurant cancelled this order. Please return the items.' : 'El restaurante canceló este pedido. Por favor devuelve los artículos.'}
              </p>
            </div>
          </div>
        )}

        {/* Customer "coming out" alert — triggered via Realtime broadcast */}
        {customerComingOut && (
          <div className="flex items-start gap-3 bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl p-4 animate-pulse">
            <span className="text-2xl flex-shrink-0">🚶</span>
            <div className="flex-1">
              <p className="text-sm font-black text-emerald-300">
                {t.en ? 'Customer is coming out!' : '¡El cliente ya sale!'}
              </p>
              <p className="text-xs text-emerald-400 mt-0.5">
                {t.en ? 'Please wait a moment.' : 'Por favor espera un momento.'}
              </p>
            </div>
            <button onClick={() => setCustomerComingOut(false)} className="text-emerald-600 hover:text-emerald-400 p-1 flex-shrink-0">
              <span className="text-lg">✕</span>
            </button>
          </div>
        )}

        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Bike className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black">{t.title}</h1>
        </div>

        {gpsStatus === 'sharing' && (
          <div className="flex items-center justify-between gap-2 bg-emerald-950/50 border border-emerald-900 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-emerald-400 text-sm font-semibold">{t.gpsSharing}</span>
            </div>
            {wakeLockActive && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-950 border border-emerald-900 px-2 py-0.5 rounded-full">
                {t.screenOn}
              </span>
            )}
          </div>
        )}
        {gpsStatus === 'error' && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm font-semibold">{t.gpsErr}</p>
            {gpsError && <p className="text-red-500 text-xs mt-1">{gpsError}</p>}
            <button onClick={startGps} className="mt-2 text-xs text-red-300 underline">{t.tryAgain}</button>
          </div>
        )}
        {gpsStatus === 'unsupported' && (
          <div className="bg-amber-950/50 border border-amber-800 rounded-xl p-3 text-center">
            <p className="text-amber-400 text-sm">{t.gpsUnsupported}</p>
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-0">
            <StepDot icon={<Package className="w-4 h-4" />} label={t.step1Label} done={stepIndex > 0} active={stepIndex === 0} />
            <StepLine done={stepIndex > 0} />
            <StepDot icon={<DoorOpen className="w-4 h-4" />} label={t.step2Label} done={stepIndex > 1} active={stepIndex === 1} />
            <StepLine done={stepIndex > 1} />
            <StepDot icon={<MapPin className="w-4 h-4" />} label={t.step3Label} done={stepIndex > 2} active={stepIndex === 2} />
          </div>
        </div>

        {deliveryAddress && deliveryStep !== 'start' && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t.deliverTo}</p>
                <p className="text-base font-semibold text-white leading-snug">{deliveryAddress}</p>
              </div>
            </div>

            {deliveryInstructions && (
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">📝</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    {t.en ? 'Customer instructions' : 'Instrucciones del cliente'}
                  </p>
                  <p className="text-sm text-amber-100 mt-0.5 whitespace-pre-line break-words">
                    {deliveryInstructions}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation deeplinks — tap to open in maps app */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.97] transition-all text-white text-sm font-bold shadow-lg shadow-blue-900/40"
              >
                <Navigation className="w-4 h-4 flex-shrink-0" />
                <span>Google Maps</span>
              </a>
              <a
                href={`https://waze.com/ul?q=${encodeURIComponent(deliveryAddress)}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00D8FF]/10 border border-[#00D8FF]/30 hover:bg-[#00D8FF]/20 active:scale-[0.97] transition-all text-[#00D8FF] text-sm font-bold"
              >
                <Navigation className="w-4 h-4 flex-shrink-0" />
                <span>Waze</span>
              </a>
            </div>

            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {customerPhone}
              </a>
            )}
          </div>
        )}

        {/* Inline registration — shown when driver has no saved identity */}
        {showRegistration && !driverAssigned && deliveryStep === 'start' && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-white">
              {t.en ? 'Identify yourself' : 'Identifícate'}
            </p>
            <p className="text-xs text-gray-500">
              {t.en
                ? 'Enter your name so the restaurant knows who picked up the order.'
                : 'Ingresa tu nombre para que el restaurante sepa quién recogió el pedido.'}
            </p>
            <input
              type="text"
              value={regName}
              onChange={e => setRegName(e.target.value)}
              placeholder={t.en ? 'Your name' : 'Tu nombre'}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="tel"
              value={regPhone}
              onChange={e => setRegPhone(e.target.value)}
              placeholder={t.en ? 'Phone (optional)' : 'Teléfono (opcional)'}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={async () => {
                if (!regName.trim()) return;
                const identity = { name: regName.trim(), phone: regPhone.trim() };
                localStorage.setItem(DRIVER_IDENTITY_KEY, JSON.stringify(identity));
                setDriverIdentity(identity);
                try {
                  const res = await fetch('/api/driver/self-assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, driverName: identity.name, driverPhone: identity.phone }),
                  });
                  if (res.ok) setDriverAssigned(true);
                } catch { /* silent */ }
                setShowRegistration(false);
              }}
              disabled={!regName.trim()}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {t.en ? 'Continue' : 'Continuar'}
            </button>
          </div>
        )}

        {/* Driver identity badge — shown after registration/auto-assign */}
        {driverAssigned && (driverIdentity || regName) && deliveryStep === 'start' && (
          <div className="bg-gray-900 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
              {(driverIdentity?.name ?? regName).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{t.en ? 'Assigned driver' : 'Repartidor asignado'}</p>
              <p className="text-sm font-semibold text-white truncate">{driverIdentity?.name ?? regName}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          </div>
        )}

        <div className="space-y-3">
          {deliveryStep === 'start' && (!showRegistration || driverAssigned) && (
            <BigButton loading={actionLoading} onClick={handlePickedUp} color="emerald">
              {t.step1Btn}
            </BigButton>
          )}
          {deliveryStep === 'picked_up' && (
            <BigButton loading={actionLoading} onClick={handleAtDoor} color="amber">
              {t.step2Btn}
            </BigButton>
          )}
          {deliveryStep === 'at_door' && (
            <SwipeToConfirm
              loading={actionLoading}
              onConfirm={handleDelivered}
              label={t.en ? 'Slide to confirm delivery' : 'Desliza para confirmar entrega'}
            />
          )}
          {actionError && (
            <p className="text-red-400 text-sm text-center">{actionError}</p>
          )}
        </div>

        <p className="text-gray-700 text-xs text-center">
          Powered by MENIUS · {token.slice(0, 8)}…
        </p>
      </div>

      {/* Real-time chat with customer — hidden once delivered */}
      {orderId && !orderCancelled && (
        <OrderChat orderId={orderId} role="driver" locale={lang} theme="dark" />
      )}
    </div>
  );
}

function StepDot({ icon, label, done, active }: {
  icon: React.ReactNode; label: string; done: boolean; active: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
        done ? 'bg-emerald-500 text-white' :
        active ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/25' :
        'bg-gray-800 text-gray-500'
      }`}>
        {done ? <CheckCircle className="w-5 h-5" /> : icon}
      </div>
      <span className={`text-[10px] font-semibold text-center leading-tight ${
        done ? 'text-emerald-400' : active ? 'text-white' : 'text-gray-600'
      }`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mb-5 transition-colors ${done ? 'bg-emerald-500' : 'bg-gray-800'}`} />
  );
}

function BigButton({ children, loading, onClick, color }: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  color: 'emerald' | 'amber';
}) {
  const bg = color === 'emerald'
    ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600'
    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-5 rounded-2xl ${bg} text-white font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg`}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : children}
    </button>
  );
}

// ── Swipe-to-confirm — prevents accidental delivery confirmation ───────────────

function SwipeToConfirm({ loading, onConfirm, label }: {
  loading: boolean;
  onConfirm: () => void;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0–1
  const [confirmed, setConfirmed] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const THUMB_SIZE = 56; // px
  const CONFIRM_THRESHOLD = 0.82;

  const getTrackWidth = () => (trackRef.current?.clientWidth ?? 300) - THUMB_SIZE;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (loading || confirmed) return;
    isDragging.current = true;
    dragStartX.current = e.clientX - progress * getTrackWidth();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSnapping(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const raw = (e.clientX - dragStartX.current) / getTrackWidth();
    setProgress(Math.min(1, Math.max(0, raw)));
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (progress >= CONFIRM_THRESHOLD) {
      setProgress(1);
      setConfirmed(true);
      if (navigator.vibrate) navigator.vibrate([80, 60, 120]);
      onConfirm();
    } else {
      setSnapping(true);
      setProgress(0);
    }
  };

  const thumbLeft = `${progress * getTrackWidth()}px`;
  const fillWidth = `calc(${progress * 100}% + ${THUMB_SIZE / 2}px)`;

  if (loading) {
    return (
      <div className="w-full h-16 rounded-2xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative w-full h-16 rounded-2xl bg-emerald-900/60 border border-emerald-700 overflow-hidden select-none touch-none"
      style={{ userSelect: 'none' }}
    >
      {/* Fill bar */}
      <div
        className="absolute inset-y-0 left-0 bg-emerald-500/30 rounded-2xl"
        style={{
          width: fillWidth,
          transition: snapping ? 'width 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
      />

      {/* Label text (fades as user swipes) */}
      <p
        className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-400 pointer-events-none"
        style={{ opacity: 1 - progress * 1.5 }}
      >
        {confirmed ? '✅' : label}
      </p>

      {/* Draggable thumb */}
      <div
        className="absolute top-1 bottom-1 flex items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-900/60 cursor-grab active:cursor-grabbing"
        style={{
          width: THUMB_SIZE,
          left: thumbLeft,
          transition: snapping ? 'left 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {confirmed
          ? <CheckCircle className="w-7 h-7 text-white" />
          : <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
        }
      </div>
    </div>
  );
}
