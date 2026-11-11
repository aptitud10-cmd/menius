'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  CheckCircle, Check, Camera, Loader2, MapPin, AlertTriangle, Navigation,
  Phone, MessageSquare, Banknote, ArrowRight, ArrowDown,
} from 'lucide-react';
import { C, money } from '@/components/orders/counter/ui';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { usePWAInstall } from '@/hooks/use-pwa-install';

type GpsStatus = 'idle' | 'sharing' | 'error' | 'unsupported';
type DeliveryStep = 'start' | 'picked_up' | 'at_door' | 'delivered';

function getT(lang: string) {
  const en = lang === 'en';
  return {
    en,
    pickedUpBtn: en ? 'I have the order'            : 'Ya tengo el pedido',
    atDoorBtn:   en ? "I'm at the door"             : 'Llegué a la puerta',
    slideDone:   en ? 'Slide: delivered'            : 'Desliza: entregado',
    slideLocked: en ? 'Photo or "in hand" first'    : 'Primero foto o "en la mano"',
    gpsLive:     en ? 'Live location'               : 'Ubicación en vivo',
    gpsOff:      en ? 'Location off'                : 'GPS apagado',
    gpsErr:      en ? 'Could not get your location' : 'No se pudo obtener tu ubicación',
    gpsDenied:   en ? 'Location blocked — allow it in the browser settings' : 'Ubicación bloqueada: permítela en los ajustes del navegador',
    tryAgain:    en ? 'Try again'                   : 'Intentar de nuevo',
    atDoorPill:  en ? 'At the door'                 : 'En la puerta',
    collect:     en ? 'Collect cash'                : 'Cobrar en efectivo',
    collectNow:  en ? 'Collect before handing over' : 'Cobrar antes de entregar',
    handIn:      en ? 'Hand in at the register'     : 'Entrega en caja',
    paid:        en ? 'Paid online — do not collect' : 'Pagado online, no cobrar',
    deliverTo:   en ? 'Deliver to'                  : 'Entregar a',
    deliverAt:   en ? 'Deliver at'                  : 'Entregar en',
    inBag:       (n: number) => en ? `In the bag · ${n} item${n === 1 ? '' : 's'}` : `En la bolsa · ${n} artículo${n === 1 ? '' : 's'}`,
    navigate:    en ? 'Navigate'                    : 'Navegar',
    call:        en ? 'Call'                        : 'Llamar',
    message:     en ? 'Message'                     : 'Mensaje',
    pocketBtn:   en ? 'Pocket mode'                 : 'Modo bolsillo',
    mapsHint:    en ? 'Coming back from Maps sends your location again.' : 'Al volver de Maps, la ubicación se reenvía sola.',
    photoTake:   en ? 'Left at the door: take the photo' : 'Lo dejé en la puerta: toma la foto',
    photoOk:     en ? 'Photo ready · Retake'        : 'Foto lista · Repetir',
    photoAlt:    en ? 'Delivery proof'              : 'Foto de entrega',
    photoErr:    en ? 'Upload failed — try again'   : 'No se pudo subir la foto, intenta de nuevo',
    photoSeen:   en ? 'The customer and the counter see this photo.' : 'La foto la ven el cliente en su seguimiento y el mostrador en el detalle.',
    or:          en ? 'or'                          : 'o',
    inHand:      en ? 'I handed it over in person'  : 'Se lo di en la mano',
    inHandOk:    en ? 'Handed over in person'       : 'Entregado en la mano',
    undo:        en ? 'Change'                      : 'Cambiar',
    problem:     en ? 'I have a problem with this delivery' : 'Tengo un problema con esta entrega',
    problemTitle: en ? 'What happened?'             : '¿Qué pasó?',
    noAnswer:    en ? "Customer doesn't answer — call them" : 'El cliente no contesta: llamarlo',
    cantFind:    en ? "Can't find the address — call the customer" : 'No encuentro la dirección: llamar al cliente',
    callRest:    en ? 'Call the restaurant'         : 'Llamar al restaurante',
    close:       en ? 'Close'                       : 'Cerrar',
    doneTitle:   en ? 'Delivered'                   : 'Entregado',
    doneSub:     en ? 'You can close this page. Scan the next order’s QR to start it.' : 'Puedes cerrar esta página. El próximo pedido se abre escaneando su QR.',
    cancelled:   en ? 'Order cancelled'             : 'Pedido cancelado',
    cancelledSub: en ? 'The restaurant cancelled this order. Bring the bag back.' : 'El restaurante canceló este pedido. Devuelve la bolsa al restaurante.',
    offline:     en ? 'No connection — your taps are saved and sent later' : 'Sin conexión: lo que toques se guarda y se envía después',
    connErr:     en ? 'Connection error'            : 'Error de conexión',
    tokenExp:    en ? 'Link expired'                : 'Enlace expirado',
    errSend:     en ? 'Error — try again'           : 'Error, intenta de nuevo',
    pocketHint:  en ? 'Black screen, GPS keeps working. Pocket the phone without locking it.' : 'Pantalla negra, el GPS sigue. Guarda el celular sin bloquearlo.',
    pocketHold:  en ? 'Press and hold to exit'      : 'Mantén presionado para salir',
    install:     en ? 'Install' : 'Instalar',
    installTitle: en ? 'Add to home screen'         : 'Agregar a la pantalla de inicio',
  };
}

type DriverOrderInfo = {
  orderNumber: string | null;
  customerName: string | null;
  total: number;
  currency: string;
  collectCash: boolean;
  notes: string | null;
  items: { qty: number; name: string | null }[];
  restaurantPhone: string | null;
};

const STEPS: DeliveryStep[] = ['start', 'picked_up', 'at_door', 'delivered'];

// Continuous press required to exit pocket mode. Also drives the CSS progress
// bar — keep both in sync via this constant.
const POCKET_HOLD_MS = 1500;

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

export async function queueStatusAction(token: string, action: string): Promise<void> {
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

async function replayQueuedActions(): Promise<void> {
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
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('status_queue', 'readwrite');
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

/** Cuando este pedido es una parada de una ruta (lo maneja DriverRouteClient). */
export type RouteCtx = {
  index: number;            // 0-based
  total: number;
  /** Tokens que siguen recibiendo GPS (paradas sin entregar). */
  gpsTokens: string[];
  upcoming: { shortNum: string; address: string | null }[];
  /** La parada terminó (entregada, cancelada o cerrada por el mostrador). */
  onStopDone: () => void;
  /** Mandarla al final de la ruta. */
  onSkip: () => void;
};

export function DriverTrackClient({ token, lang, route, startExtra, driver }: {
  token: string;
  lang: string;
  route?: RouteCtx;
  /** Paso "recoger" de un pedido suelto: escanear otro ticket + quién lo lleva. */
  startExtra?: React.ReactNode;
  /** Quién lo lleva (elegido en el teléfono): su nombre va al cliente y al Counter. */
  driver?: { id: string | null; name: string } | null;
}) {
  const t = getT(lang);
  const { canInstall, install } = usePWAInstall();
  // El callback de watchPosition queda con el primer render: los tokens de la
  // ruta se leen de una ref para no mandar GPS a paradas ya entregadas.
  const gpsTokensRef = useRef<string[] | null>(route?.gpsTokens ?? null);
  gpsTokensRef.current = route?.gpsTokens ?? null;

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsError, setGpsError] = useState('');
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep>('start');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderCancelled, setOrderCancelled] = useState(false);
  const [info, setInfo] = useState<DriverOrderInfo | null>(null);
  // Prueba de entrega ANTES de cerrar: foto (lo dejó en la puerta) o "en la mano".
  const [handedInPerson, setHandedInPerson] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  // Pocket mode: black overlay with the wake lock held, so the driver can pocket
  // the phone screen-on and GPS keeps reporting. Browsers suspend geolocation
  // when the screen locks — this is the PWA's answer to "phone goes in the pocket".
  const [pocketMode, setPocketMode] = useState(false);
  const [pocketHolding, setPocketHolding] = useState(false);
  const pocketHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pocketPointerIdRef = useRef<number | null>(null);
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
        setInfo({
          orderNumber: data.orderNumber ?? null,
          customerName: data.customerName ?? null,
          total: Number(data.total ?? 0),
          currency: data.currency ?? 'USD',
          collectCash: data.paymentMethod === 'cash' && data.paymentStatus !== 'paid',
          notes: data.notes ?? null,
          items: Array.isArray(data.items) ? data.items : [],
          restaurantPhone: data.restaurantPhone ?? null,
        });
        if (data.deliveryPhotoUrl) setPhotoUrl(data.deliveryPhotoUrl);
        const cancelled = data.orderStatus === 'cancelled';
        if (cancelled) setOrderCancelled(true);

        // Restore step from server timestamps so a page reload doesn't reset progress.
        // El estado del pedido manda: si el mostrador ya lo cerró, se muestra
        // "entregado" (antes volvía a "en camino" y reactivaba el GPS); si el
        // mostrador tocó "Salió", el repartidor sigue desde "en camino".
        const closed = data.orderStatus === 'delivered' || data.orderStatus === 'completed';
        if (data.driverDeliveredAt || closed) {
          setDeliveryStep('delivered');
        } else if (data.driverAtDoorAt) {
          setDeliveryStep('at_door');
        } else if (data.driverPickedUpAt || data.orderStatus === 'out_for_delivery') {
          setDeliveryStep('picked_up');
          if (!cancelled) startGps();
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
        const status = payload?.status as string | undefined;
        if (status === 'cancelled') {
          setOrderCancelled(true);
          stopGps();
        } else if (status === 'out_for_delivery') {
          setDeliveryStep('picked_up');
          startGps();
        } else if (status === 'delivered') {
          stopGps();
          setDeliveryStep('delivered');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // startGps and stopGps are stable — only use refs and state setters, no reactive deps
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
        await sendLocation(lat, lng);
      }
      // iOS manual replay (SyncManager not available on Safari)
      if (!('SyncManager' in window)) {
        await replayQueuedActions();
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
      // 2s throttle (Uber-like cadence). Uber posts every 1-2s; 4s producía
      // saltos visibles en el mapa del cliente entre interpolaciones de 1.5s.
      // El umbral de movimiento (~15m) evita spamear cuando el driver está quieto.
      if (dt < 2_000 && dlat < 0.000135 && dlng < 0.000135) return;
    }

    try {
      const many = gpsTokensRef.current;
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Ruta: un solo GPS para todas las paradas que faltan.
        body: JSON.stringify(many && many.length > 0 ? { tokens: many, lat, lng } : { token, lat, lng }),
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
    releaseWakeLock();
    setGpsStatus('idle');
  };

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  // Re-acquire WakeLock when the page becomes visible again (browser releases it on hide)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || gpsStatus !== 'sharing') return;
      if (!wakeLockRef.current) acquireWakeLock();
      // Al volver de Google Maps / Waze el navegador tuvo el GPS en pausa:
      // se manda la posición actual al instante, sin esperar al próximo evento.
      navigator.geolocation?.getCurrentPosition(
        (pos) => { lastSendRef.current = null; sendLocation(pos.coords.latitude, pos.coords.longitude); },
        () => { /* el watch sigue intentando */ },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // acquireWakeLock only uses refs — stable reference, safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsStatus]);

  // Exit pocket mode when the delivery leaves the in-transit state (cancelled,
  // at door, delivered) or GPS is irrecoverably dead (permission denied).
  // Transient GPS errors (tunnel, elevator → TIMEOUT) do NOT exit: watchPosition
  // stays alive and recovers alone — exiting would leave the bright tappable UI
  // rubbing against pocket fabric, which is exactly what this mode prevents.
  useEffect(() => {
    if (pocketMode && (deliveryStep !== 'picked_up' || orderCancelled || gpsStatus === 'unsupported')) {
      cancelPocketHold();
      setPocketMode(false);
      if (orderCancelled) {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        window.scrollTo({ top: 0 }); // the red cancellation banner lives at the top
      }
    }
  // cancelPocketHold only touches refs — stable, safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pocketMode, deliveryStep, orderCancelled, gpsStatus]);

  // Clear a pending hold timer on unmount (e.g. jump to the delivered screen)
  useEffect(() => () => {
    if (pocketHoldTimerRef.current) clearTimeout(pocketHoldTimerRef.current);
  }, []);

  const enterPocketMode = () => {
    acquireWakeLock(); // re-assert — entering the mode is pointless without it
    setPocketMode(true);
  };

  const startPocketHold = (e: React.PointerEvent) => {
    // Multi-touch guard: pocket fabric can touch in two spots. The first pointer
    // owns the hold; extra pointers must not overwrite (and orphan) its timer.
    if (pocketPointerIdRef.current !== null) return;
    pocketPointerIdRef.current = e.pointerId;
    setPocketHolding(true);
    pocketHoldTimerRef.current = setTimeout(() => {
      pocketPointerIdRef.current = null;
      setPocketMode(false);
      setPocketHolding(false);
      if (navigator.vibrate) navigator.vibrate(60);
    }, POCKET_HOLD_MS);
  };

  const cancelPocketHold = (e?: React.PointerEvent) => {
    // Ignore pointerup/cancel from pointers that don't own the hold
    if (e && pocketPointerIdRef.current !== null && e.pointerId !== pocketPointerIdRef.current) return;
    pocketPointerIdRef.current = null;
    setPocketHolding(false);
    if (pocketHoldTimerRef.current) {
      clearTimeout(pocketHoldTimerRef.current);
      pocketHoldTimerRef.current = null;
    }
  };

  const callDriverStatus = async (action: 'picked_up' | 'at_door' | 'delivered'): Promise<boolean> => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, ...(action === 'picked_up' && driver?.name ? { driver } : {}) }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        // El mostrador ya cerró el pedido: no se avanza a "en camino" ni se
        // prende el GPS; la pantalla pasa directo a entregado.
        if (body?.closed) {
          stopGps();
          setDeliveryStep('delivered');
          return false;
        }
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
    const ok = await callDriverStatus('picked_up');
    if (ok) {
      setDeliveryStep('picked_up');
      startGps();
    }
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
  const shortNum = info?.orderNumber ? `#${info.orderNumber.split('-').pop()}` : '';
  const amount = info ? money(info.total, info.currency) : '';
  const itemCount = info ? info.items.reduce((n, i) => n + i.qty, 0) : 0;
  const proofReady = !!photoUrl || handedInPerson;
  const phone = customerPhone?.trim() || null;

  const cashBlock = (label: string) => info && (info.collectCash ? (
    <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: C.orangeSoft, color: C.orange }}>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</p>
        <p className="font-display text-[30px] font-extrabold leading-none tracking-tight tabular-nums mt-1">{amount}</p>
      </div>
      <span className="w-10 h-10 rounded-xl grid place-items-center text-white" style={{ background: C.orange }}>
        <Banknote className="w-5 h-5" aria-hidden />
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: C.greenSoft, color: C.greenDeep }}>
      <CheckCircle className="w-4 h-4" aria-hidden /> {t.paid}
    </div>
  ));

  const notesBlock = info?.notes && (
    <p className="rounded-xl px-3 py-2 text-[13px] font-semibold leading-snug" style={{ background: '#FFF8E6', color: '#6B4A00' }}>
      {info.notes}
    </p>
  );

  const progress = (
    <div className="grid grid-cols-3 gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <i key={i} className="h-1 rounded-full" style={{ background: stepIndex >= i ? C.ink : C.line }} />
      ))}
    </div>
  );

  // ── Ruta: la parada terminó → la maneja DriverRouteClient (siguiente o resumen) ──
  if (route && deliveryStep === 'delivered') {
    return <RouteAdvance onDone={route.onStopDone} />;
  }

  // ── Entregado ──
  if (deliveryStep === 'delivered') {
    return (
      <div className="min-h-[100dvh] flex flex-col font-sans" style={{ background: C.surface, color: C.ink }}>
        <main className="flex-1 w-full max-w-md mx-auto px-5 flex flex-col items-center justify-center text-center gap-3 py-10">
          <span className="w-20 h-20 rounded-full grid place-items-center" style={{ background: C.green, color: C.greenInk }}>
            <Check className="w-10 h-10" strokeWidth={3} aria-hidden />
          </span>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight mt-1">{t.doneTitle}</h1>
          <p className="text-sm" style={{ color: C.sub }}>{[shortNum, info?.customerName].filter(Boolean).join(' · ')}</p>
          {info?.collectCash && <div className="w-full mt-3 text-left">{cashBlock(t.handIn)}</div>}
          {photoUrl && (
            <div className="relative w-full h-44 rounded-2xl overflow-hidden mt-2">
              <Image src={photoUrl} alt={t.photoAlt} fill className="object-cover" sizes="(max-width: 480px) 100vw, 448px" />
            </div>
          )}
          <p className="text-[13px] mt-4 max-w-xs" style={{ color: C.faint }}>{t.doneSub}</p>
          {canInstall && !installDismissed && (
            <button type="button" onClick={async () => { await install(); setInstallDismissed(true); }}
              className="mt-2 text-sm font-semibold underline underline-offset-4" style={{ color: C.sub }}>
              {t.installTitle}
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans" style={{ background: C.surface, color: C.ink }}>
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-4 flex flex-col gap-3">

        {orderCancelled && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl p-4" style={{ background: C.redSoft, color: C.red }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-[15px] font-bold">{t.cancelled}</p>
              <p className="text-[13px] mt-0.5">{t.cancelledSub}</p>
            </div>
          </div>
        )}

        {!isOnline && !offlineBannerDismissed && (
          <button type="button" onClick={() => setOfflineBannerDismissed(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold"
            style={{ background: C.amberSoft, color: C.amber }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: C.amber }} />
            {t.offline}
          </button>
        )}

        {/* Ruta: en qué parada va (puntos: hechas en tinta, la actual en verde) */}
        {route && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em]" style={{ color: C.ink }}>
              {t.en ? `Stop ${route.index + 1} of ${route.total}` : `Parada ${route.index + 1} de ${route.total}`}
            </p>
            <span className="flex gap-1.5" aria-hidden>
              {Array.from({ length: route.total }, (_, i) => (
                <i key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: i < route.index ? C.ink : i === route.index ? C.green : C.line }} />
              ))}
            </span>
          </div>
        )}

        {/* Encabezado: el pedido, no la marca */}
        <header className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: C.sub }}>
              {deliveryStep === 'start' ? restaurantName : [info?.customerName, info?.collectCash ? `${t.collect.toLowerCase()} ${amount}` : null].filter(Boolean).join(' · ')}
            </p>
            <p className="font-display text-[28px] font-extrabold leading-none tracking-tight">{shortNum}</p>
          </div>
          {deliveryStep === 'start' || gpsStatus === 'idle' ? (
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: C.line, color: C.sub }}>{t.gpsOff}</span>
          ) : gpsStatus === 'sharing' ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: C.greenSoft, color: C.greenDeep }}>
              <span className="relative flex w-2 h-2">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: C.green }} />
                <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: C.greenDeep }} />
              </span>
              {deliveryStep === 'at_door' ? t.atDoorPill : t.gpsLive}
            </span>
          ) : (
            <button type="button" onClick={startGps} className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: C.redSoft, color: C.red }}>
              {t.tryAgain}
            </button>
          )}
        </header>
        {progress}

        {(gpsStatus === 'error' || gpsStatus === 'unsupported') && deliveryStep !== 'start' && (
          <p className="rounded-xl px-3 py-2 text-[13px] font-semibold" style={{ background: C.redSoft, color: C.red }}>
            {gpsStatus === 'unsupported' ? t.gpsDenied : t.gpsErr}
          </p>
        )}

        {/* 1. Recoger */}
        {deliveryStep === 'start' && (
          <>
            {cashBlock(t.collect)}
            {deliveryAddress && (
              <section className="rounded-[18px] p-4 grid gap-2 bg-white" style={{ border: `1px solid ${C.line}` }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.faint }}>
                  {t.deliverTo}{info?.customerName ? ` ${info.customerName}` : ''}
                </p>
                <p className="font-display text-[22px] font-extrabold leading-tight">{deliveryAddress}</p>
                {notesBlock}
              </section>
            )}
            {itemCount > 0 && (
              <section className="rounded-[18px] p-4 grid gap-2 bg-white" style={{ border: `1px solid ${C.line}` }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.faint }}>{t.inBag(itemCount)}</p>
                <ul className="grid gap-1 text-[14px]">
                  {info!.items.map((it, i) => (
                    <li key={i} className="flex gap-2"><b className="tabular-nums min-w-[26px]">{it.qty}×</b><span className="min-w-0">{it.name}</span></li>
                  ))}
                </ul>
              </section>
            )}
            {!orderCancelled && startExtra}
          </>
        )}

        {/* 2. En camino */}
        {deliveryStep === 'picked_up' && deliveryAddress && (
          <>
            <section className="rounded-[18px] p-4 grid gap-2 bg-white" style={{ border: `1px solid ${C.line}` }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.faint }}>{t.deliverAt}</p>
              <p className="font-display text-[22px] font-extrabold leading-tight">{deliveryAddress}</p>
              {notesBlock}
            </section>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddress)}&travelmode=driving`}
              target="_blank" rel="noopener noreferrer"
              className="h-14 rounded-2xl flex items-center justify-center gap-2 text-white text-[17px] font-extrabold active:scale-[0.98] transition-transform"
              style={{ background: C.blue }}>
              <Navigation className="w-5 h-5" aria-hidden /> {t.navigate}
              <span className="text-[13px] font-semibold opacity-80">· Google Maps</span>
            </a>
            {phone && (
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${phone}`} className="h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold bg-white active:scale-[0.98] transition-transform" style={{ border: `1px solid ${C.line}` }}>
                  <Phone className="w-[18px] h-[18px]" aria-hidden /> {t.call}
                </a>
                <a href={`sms:${phone}`} className="h-12 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold bg-white active:scale-[0.98] transition-transform" style={{ border: `1px solid ${C.line}` }}>
                  <MessageSquare className="w-[18px] h-[18px]" aria-hidden /> {t.message}
                </a>
              </div>
            )}
            <p className="text-center text-[13px] font-semibold" style={{ color: C.sub }}>
              {gpsStatus === 'sharing' && (
                <><button type="button" onClick={enterPocketMode} className="underline underline-offset-4">{t.pocketBtn}</button>{' · '}</>
              )}
              <a href={`https://waze.com/ul?q=${encodeURIComponent(deliveryAddress)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Waze</a>
            </p>
            <p className="text-center text-[12px]" style={{ color: C.faint }}>{t.mapsHint}</p>
            {route && route.upcoming.length > 0 && (
              <section className="rounded-[18px] p-4 grid gap-2 bg-white" style={{ border: `1px solid ${C.line}` }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: C.faint }}>{t.en ? 'Then' : 'Después'}</p>
                <ol className="grid gap-1.5">
                  {route.upcoming.map((u, i) => (
                    <li key={i} className="flex gap-2 text-[14px] min-w-0">
                      <b className="tabular-nums flex-shrink-0">{u.shortNum}</b>
                      <span className="truncate" style={{ color: C.sub }}>{u.address}</span>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={route.onSkip} className="justify-self-start text-[13px] font-semibold underline underline-offset-4 py-1" style={{ color: C.sub }}>
                  {t.en ? 'Skip this stop — deliver it last' : 'Saltar esta parada: la entrego al final'}
                </button>
              </section>
            )}
          </>
        )}

        {/* 3. En la puerta: prueba primero, después deslizar */}
        {deliveryStep === 'at_door' && (
          <>
            {cashBlock(t.collectNow)}
            {notesBlock}
            {photoUrl ? (
              <label className="relative block h-40 rounded-2xl overflow-hidden cursor-pointer">
                <Image src={photoUrl} alt={t.photoAlt} fill className="object-cover" sizes="(max-width: 480px) 100vw, 448px" />
                <span className="absolute left-2.5 bottom-2.5 rounded-full px-3 py-1 text-[12px] font-bold bg-white/95" style={{ color: C.greenDeep }}>
                  ✓ {t.photoOk}
                </span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            ) : handedInPerson ? (
              <div className="flex items-center justify-between rounded-2xl px-4 h-14 text-[15px] font-bold" style={{ background: C.greenSoft, color: C.greenDeep }}>
                <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" aria-hidden /> {t.inHandOk}</span>
                <button type="button" onClick={() => setHandedInPerson(false)} className="text-[13px] underline underline-offset-4">{t.undo}</button>
              </div>
            ) : (
              <>
                <label className={`h-36 rounded-2xl grid place-items-center text-center bg-white cursor-pointer ${photoUploading ? 'opacity-60 pointer-events-none' : ''}`}
                  style={{ border: '2px dashed #C9D1CD', color: C.sub }}>
                  <span className="grid justify-items-center gap-2 text-[14px] font-semibold">
                    <span className="w-12 h-12 rounded-full grid place-items-center text-white" style={{ background: C.ink }}>
                      {photoUploading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Camera className="w-5 h-5" aria-hidden />}
                    </span>
                    {t.photoTake}
                  </span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoUpload} disabled={photoUploading} />
                </label>
                <div className="flex items-center gap-3 text-[12px] font-semibold" style={{ color: C.faint }}>
                  <span className="flex-1 h-px" style={{ background: C.line }} />{t.or}<span className="flex-1 h-px" style={{ background: C.line }} />
                </div>
                <button type="button" onClick={() => setHandedInPerson(true)}
                  className="h-12 rounded-2xl text-[15px] font-bold bg-white active:scale-[0.98] transition-transform" style={{ border: `1px solid ${C.line}` }}>
                  {t.inHand}
                </button>
              </>
            )}
            {photoError && <p className="text-[13px] font-semibold" style={{ color: C.red }}>{photoError}</p>}
            {photoUrl && <p className="text-center text-[12px]" style={{ color: C.faint }}>{t.photoSeen}</p>}
            <button type="button" onClick={() => setProblemOpen(true)} className="text-center text-[13px] font-semibold underline underline-offset-4 py-1" style={{ color: C.sub }}>
              {t.problem}
            </button>
          </>
        )}
      </main>

      {/* Ruta: pedido cancelado → la bolsa vuelve al local, la ruta sigue */}
      {orderCancelled && route && (
        <div className="sticky bottom-0 w-full border-t" style={{ background: C.surface, borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-4 pt-3">
            <PrimaryButton loading={false} onClick={route.onStopDone} tone="black">
              {route.index + 1 < route.total ? (t.en ? 'Continue to the next stop' : 'Seguir con la siguiente parada') : (t.en ? 'Finish the trip' : 'Terminar el viaje')}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Acción principal: siempre abajo, al alcance del pulgar */}
      {!orderCancelled && (
        <div className="sticky bottom-0 w-full border-t" style={{ background: C.surface, borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-md mx-auto px-4 pt-3 grid gap-2">
            {actionError && <p className="text-center text-[13px] font-semibold" style={{ color: C.red }}>{actionError}</p>}
            {deliveryStep === 'start' && (
              <PrimaryButton loading={actionLoading} onClick={handlePickedUp} tone="green">{t.pickedUpBtn}</PrimaryButton>
            )}
            {deliveryStep === 'picked_up' && (
              <PrimaryButton loading={actionLoading} onClick={handleAtDoor} tone="black">{t.atDoorBtn}</PrimaryButton>
            )}
            {deliveryStep === 'at_door' && (
              <SwipeToConfirm loading={actionLoading} disabled={!proofReady} onConfirm={handleDelivered}
                label={proofReady ? t.slideDone : t.slideLocked} />
            )}
          </div>
        </div>
      )}

      {/* Problema en la entrega */}
      {problemOpen && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t.problemTitle}>
          <button type="button" aria-label={t.close} className="absolute inset-0 w-full h-full" style={{ background: 'rgba(14,20,18,0.45)' }} onClick={() => setProblemOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl px-4 pt-3 grid gap-2 max-w-md mx-auto" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <span className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: C.line }} />
            <h2 className="font-display text-[20px] font-extrabold mb-1">{t.problemTitle}</h2>
            {phone && (
              <>
                <a href={`tel:${phone}`} className="h-[52px] rounded-2xl flex items-center gap-3 px-4 text-[15px] font-semibold" style={{ border: `1px solid ${C.line}` }}>
                  <Phone className="w-[18px] h-[18px]" style={{ color: C.sub }} aria-hidden /> {t.noAnswer}
                </a>
                <a href={`tel:${phone}`} className="h-[52px] rounded-2xl flex items-center gap-3 px-4 text-[15px] font-semibold" style={{ border: `1px solid ${C.line}` }}>
                  <MapPin className="w-[18px] h-[18px]" style={{ color: C.sub }} aria-hidden /> {t.cantFind}
                </a>
              </>
            )}
            {route && route.index + 1 < route.total && (
              <button type="button" onClick={() => { setProblemOpen(false); route.onSkip(); }}
                className="h-[52px] rounded-2xl flex items-center gap-3 px-4 text-[15px] font-semibold text-left" style={{ border: `1px solid ${C.line}` }}>
                <ArrowDown className="w-[18px] h-[18px]" style={{ color: C.sub }} aria-hidden /> {t.en ? 'Skip — deliver it last' : 'Saltar: lo entrego al final'}
              </button>
            )}
            {info?.restaurantPhone && (
              <a href={`tel:${info.restaurantPhone}`} className="h-14 mt-1 rounded-2xl flex items-center justify-center text-white text-[16px] font-extrabold" style={{ background: C.black }}>
                {t.callRest}
              </a>
            )}
            <button type="button" onClick={() => setProblemOpen(false)} className="h-11 text-[14px] font-semibold" style={{ color: C.sub }}>{t.close}</button>
          </div>
        </div>
      )}

      {/* Modo bolsillo: casi negro (OLED), pantalla encendida, GPS activo.
          Salir exige mantener 1.5 s: los roces del bolsillo son breves. */}
      {pocketMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.pocketBtn}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center select-none"
          style={{ touchAction: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={startPocketHold}
          onPointerUp={cancelPocketHold}
          onPointerCancel={cancelPocketHold}
          onPointerLeave={cancelPocketHold}
        >
          <span className="relative flex w-2.5 h-2.5 mb-4">
            {gpsStatus === 'sharing' ? (
              <>
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            )}
          </span>
          <p className={`text-sm font-semibold ${gpsStatus === 'sharing' ? 'text-gray-500' : 'text-amber-500'}`}>
            {gpsStatus === 'sharing' ? t.gpsLive : t.gpsErr}
          </p>
          <p className="text-gray-600 text-[13px] mt-1">{[shortNum, info?.collectCash ? `${t.collect.toLowerCase()} ${amount}` : null].filter(Boolean).join(' · ')}</p>
          <p className="text-gray-500 text-xs mt-8">{t.pocketHold}</p>
          <div className="mt-3 w-32 h-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{
                width: pocketHolding ? '100%' : '0%',
                transition: pocketHolding ? `width ${POCKET_HOLD_MS}ms linear` : 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Parada terminada dentro de una ruta: avisa una vez y DriverRouteClient avanza. */
function RouteAdvance({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);
  return (
    <div className="min-h-[100dvh] grid place-items-center" style={{ background: C.surface }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: C.sub }} aria-hidden />
    </div>
  );
}

function PrimaryButton({ children, loading, onClick, tone }: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  tone: 'green' | 'black';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-16 rounded-[18px] text-[18px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      style={tone === 'green' ? { background: C.green, color: C.greenInk } : { background: C.black, color: '#fff' }}
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden /> : children}
    </button>
  );
}

// ── Deslizar para confirmar: evita marcar "entregado" sin querer ───────────────

function SwipeToConfirm({ loading, disabled, onConfirm, label }: {
  loading: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0–1
  const [confirmed, setConfirmed] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  const THUMB_SIZE = 54; // px
  const CONFIRM_THRESHOLD = 0.82;

  const getTrackWidth = () => (trackRef.current?.clientWidth ?? 300) - THUMB_SIZE - 10;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (loading || confirmed || disabled) return;
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

  // Si el envío falla, el deslizador vuelve al inicio para reintentar.
  useEffect(() => {
    if (!loading && confirmed) { setConfirmed(false); setSnapping(true); setProgress(0); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full h-16 rounded-[18px] grid place-items-center" style={{ background: C.greenSoft, color: C.greenDeep }}>
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
      </div>
    );
  }

  const ease = 'cubic-bezier(0.34,1.56,0.64,1)';
  return (
    <div
      ref={trackRef}
      className="relative w-full h-16 rounded-[18px] overflow-hidden select-none touch-none"
      style={{ background: disabled ? C.line : C.greenSoft, userSelect: 'none' }}
      aria-disabled={disabled}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-[18px]"
        style={{
          width: progress > 0 && !disabled ? `calc(${progress * 100}% + ${THUMB_SIZE / 2}px)` : '0px',
          background: 'rgba(5,200,167,0.25)',
          transition: snapping ? `width 0.35s ${ease}` : 'none',
        }}
      />
      <p
        className="absolute inset-0 flex items-center justify-center pl-12 text-[15px] font-extrabold pointer-events-none"
        style={{ opacity: 1 - progress * 1.5, color: disabled ? C.faint : C.greenDeep }}
      >
        {label}
      </p>
      <div
        role="button"
        aria-label={label}
        className={`absolute top-[5px] bottom-[5px] flex items-center justify-center rounded-[14px] ${disabled ? '' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          width: THUMB_SIZE,
          left: `${5 + progress * getTrackWidth()}px`,
          background: disabled ? '#C9D1CD' : C.green,
          color: disabled ? '#fff' : C.greenInk,
          transition: snapping ? `left 0.35s ${ease}` : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {confirmed ? <Check className="w-6 h-6" strokeWidth={3} aria-hidden /> : <ArrowRight className="w-6 h-6" strokeWidth={2.6} aria-hidden />}
      </div>
    </div>
  );
}
