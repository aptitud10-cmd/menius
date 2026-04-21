'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  CheckCircle, Camera, Upload,
  Loader2, Package, DoorOpen, MapPin, Bike, AlertTriangle, Navigation,
} from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { usePWAInstall } from '@/hooks/use-pwa-install';

type GpsStatus = 'idle' | 'sharing' | 'error' | 'unsupported';
type DeliveryStep = 'start' | 'picked_up' | 'at_door' | 'delivered';

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

// ── IndexedDB helpers for offline status queue ────────────────────────────────

function openDriverDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('menius-driver', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('status_queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueStatusAction(token: string, action: string): Promise<void> {
  try {
    const db = await openDriverDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('status_queue', 'readwrite');
      tx.objectStore('status_queue').add({ token, action, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Register background sync (Android Chrome only — iOS falls back to online-event replay)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('driver-status-sync');
    }
  } catch { /* silent — action error shown to user on non-network failures */ }
}

async function replayQueuedActions(token: string): Promise<void> {
  try {
    const db = await openDriverDB();
    const items: Array<{ id: number; token: string; action: string }> = await new Promise((resolve, reject) => {
      const tx = db.transaction('status_queue', 'readonly');
      const req = tx.objectStore('status_queue').getAll();
      req.onsuccess = () => resolve(req.result as Array<{ id: number; token: string; action: string }>);
      req.onerror = () => reject(req.error);
    });
    for (const item of items) {
      try {
        const res = await fetch('/api/driver/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: item.token, action: item.action }),
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          const db2 = await openDriverDB();
          await new Promise<void>((resolve, reject) => {
            const tx = db2.transaction('status_queue', 'readwrite');
            tx.objectStore('status_queue').delete(item.id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
        }
      } catch { break; }
    }
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export function DriverTrackClient({ token, lang }: { token: string; lang: string }) {
  const t = getT(lang);
  const { canInstall, install } = usePWAInstall();

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
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCancelled, setOrderCancelled] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSendRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  // PWA / offline additions
  const [isOnline, setIsOnline] = useState(true);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchOrderInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/order?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveryAddress(data.deliveryAddress ?? null);
        setCustomerPhone(data.customerPhone ?? null);
        if (data.orderId) setOrderId(data.orderId);
        if (data.restaurantName) setRestaurantName(data.restaurantName);
        if (data.orderStatus === 'cancelled') setOrderCancelled(true);

        // Restore step from server timestamps so a page reload doesn't reset progress
        if (data.driverDeliveredAt) {
          setDeliveryStep('delivered');
        } else if (data.driverAtDoorAt) {
          setDeliveryStep('at_door');
        } else if (data.driverPickedUpAt) {
          setDeliveryStep('picked_up');
          startGps();
        }
      }
    } catch { /* silent */ }
  // startGps is stable (no deps), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchOrderInfo(); }, [fetchOrderInfo]);

  // Realtime subscription — notifies the driver immediately if the restaurant cancels the order
  useEffect(() => {
    if (!orderId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`order-track:${orderId}`)
      .on('broadcast', { event: 'status_change' }, ({ payload }: { payload: Record<string, unknown> }) => {
        if (payload?.status === 'cancelled') {
          setOrderCancelled(true);
          stopGps();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // stopGps is stable — defined below with no reactive deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Online/offline detection + iOS manual queue replay on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Flush pending GPS location
      if (pendingLocationRef.current && gpsStatus === 'sharing') {
        const { lat, lng } = pendingLocationRef.current;
        pendingLocationRef.current = null;
        sendLocation(lat, lng);
      }
      // iOS manual replay (SyncManager not available on Safari)
      if (!('SyncManager' in window)) {
        await replayQueuedActions(token);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineBannerDismissed(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // sendLocation is stable (uses refs only)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus, token]);

  const sendLocation = async (lat: number, lng: number) => {
    const now = Date.now();
    const last = lastSendRef.current;
    if (last) {
      const dt = now - last.ts;
      const dlat = Math.abs(lat - last.lat);
      const dlng = Math.abs(lng - last.lng);
      if (dt < 4_000 && dlat < 0.000135 && dlng < 0.000135) return;
    }

    try {
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lat, lng }),
      });
      // Only record last-send after a successful send so retries aren't throttled
      if (res.status !== 410) {
        lastSendRef.current = { lat, lng, ts: now };
      }
      if (res.status === 410) stopGps();
    } catch {
      // Network error — store for flush on reconnect
      pendingLocationRef.current = { lat, lng };
    }
  };

  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      const lock: WakeLockSentinel = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener('release', () => {
        setWakeLockActive(false);
        wakeLockRef.current = null;
      });
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
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('sharing');
    setGpsError('');
    acquireWakeLock();
    lastSendRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGpsStatus('sharing');
        setGpsError('');
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        setGpsError(err.message);
        if (err.code === 1) setGpsStatus('unsupported');
        else setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  };

  const stopGps = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    releaseWakeLock();
    setGpsStatus('idle');
  };

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Re-acquire WakeLock when the page becomes visible again (browser releases it on hide)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && gpsStatus === 'sharing' && !wakeLockRef.current) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // acquireWakeLock only uses refs — stable reference, safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus]);

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
      // Network error — queue in IndexedDB for background sync replay
      await queueStatusAction(token, action);
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      return true; // optimistically advance UI — IndexedDB guarantees delivery
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

        {/* Cancellation banner */}
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

        {/* Offline banner */}
        {!isOnline && !offlineBannerDismissed && (
          <div className="flex items-center gap-3 bg-amber-950/70 border border-amber-800 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-amber-300 text-sm font-semibold flex-1">
              {t.en ? 'No connection — actions saved' : 'Sin conexión — acciones guardadas'}
            </span>
            <button onClick={() => setOfflineBannerDismissed(true)} className="text-amber-600 hover:text-amber-400 transition-colors text-lg leading-none">✕</button>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Bike className="w-8 h-8 text-emerald-400" />
          </div>
          {restaurantName && (
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{restaurantName}</p>
          )}
          <h1 className="text-xl font-black text-white">{t.title}</h1>
        </div>

        {/* GPS status pill */}
        {gpsStatus === 'sharing' && (
          <div className="flex items-center justify-between gap-2 bg-emerald-950/50 border border-emerald-900 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
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

        {/* Step progress bar */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-0">
            <StepDot icon={<Package className="w-4 h-4" />} label={t.step1Label} done={stepIndex > 0} active={stepIndex === 0} />
            <StepLine done={stepIndex > 0} />
            <StepDot icon={<DoorOpen className="w-4 h-4" />} label={t.step2Label} done={stepIndex > 1} active={stepIndex === 1} />
            <StepLine done={stepIndex > 1} />
            <StepDot icon={<MapPin className="w-4 h-4" />} label={t.step3Label} done={stepIndex > 2} active={stepIndex === 2} />
          </div>
        </div>

        {/* Contextual step card */}
        <div className="bg-gray-900 rounded-2xl p-4">
          {deliveryStep === 'start' && (
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  {t.en ? 'Go to the restaurant' : 'Ve al restaurante'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.en ? 'Pick up the order and confirm when you have it.' : 'Recoge el pedido y confirma cuando lo tengas.'}
                </p>
                {restaurantName && (
                  <p className="text-xs text-emerald-400 font-semibold mt-1.5">{restaurantName}</p>
                )}
              </div>
            </div>
          )}
          {deliveryStep === 'picked_up' && (
            <div className="flex items-start gap-3">
              <Bike className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  {t.en ? 'On the way' : 'En camino'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.en ? 'GPS is active. Navigate to the delivery address.' : 'GPS activo. Navega a la dirección de entrega.'}
                </p>
              </div>
            </div>
          )}
          {deliveryStep === 'at_door' && (
            <div className="flex items-start gap-3">
              <DoorOpen className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">
                  {t.en ? 'At the door' : 'En la puerta'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.en ? 'Slide to confirm delivery and take a proof photo.' : 'Desliza para confirmar la entrega y toma una foto como prueba.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Address + navigation */}
        {deliveryAddress && deliveryStep !== 'start' && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t.deliverTo}</p>
                <p className="text-base font-semibold text-white leading-snug">{deliveryAddress}</p>
              </div>
            </div>

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

        {/* Action buttons */}
        <div className="space-y-3">
          {deliveryStep === 'start' && (
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

      {/* PWA install prompt — fixed bottom, shown when driver has picked up (most valuable moment) */}
      {canInstall && !installDismissed && deliveryStep === 'picked_up' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3">
          <div className="max-w-sm mx-auto bg-gray-900 border border-gray-700 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Bike className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {t.en ? 'Install MENIUS Driver' : 'Instalar MENIUS Repartidor'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.en ? 'Works offline — never lose a delivery' : 'Funciona sin conexión — nunca pierdas una entrega'}
              </p>
            </div>
            <button
              onClick={async () => { await install(); setInstallDismissed(true); }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex-shrink-0"
            >
              {t.en ? 'Install' : 'Instalar'}
            </button>
            <button onClick={() => setInstallDismissed(true)} className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none flex-shrink-0">✕</button>
          </div>
        </div>
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
    <div className="flex-1 h-0.5 mb-5 relative overflow-hidden rounded-full bg-gray-800">
      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${done ? 'w-full bg-emerald-500' : 'w-0'}`} />
    </div>
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
