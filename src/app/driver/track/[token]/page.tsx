/**
 * Driver GPS tracking page — opened by the delivery driver on their phone.
 * Uses a per-delivery token (no auth required).
 * Step flow: Start → Picked up → At door → Delivered
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, Camera, Upload,
  Loader2, Package, DoorOpen, MapPin, Bike,
} from 'lucide-react';

interface PageProps {
  params: { token: string };
  searchParams: { lang?: string };
}

type GpsStatus = 'idle' | 'sharing' | 'error' | 'unsupported';
type DeliveryStep = 'start' | 'picked_up' | 'at_door' | 'delivered';

function getT(lang: string) {
  const en = lang === 'en';
  return {
    en,
    title:      en ? 'MENIUS Driver'                      : 'MENIUS Repartidor',
    subtitle:   en ? 'Delivery tracking'                  : 'Seguimiento de entrega',
    // Steps
    step1Label: en ? 'Start delivery'                     : 'Iniciar entrega',
    step1Desc:  en ? 'Tap to pick up the order and start GPS sharing.' : 'Toca para recoger el pedido e iniciar GPS.',
    step1Btn:   en ? 'I picked up the order'              : 'Recogí el pedido',
    step2Label: en ? 'At the door'                        : 'En la puerta',
    step2Desc:  en ? 'Tap when you arrive at the delivery address.' : 'Toca cuando llegues a la dirección de entrega.',
    step2Btn:   en ? "I'm at the door"                   : 'Estoy en la puerta',
    step3Label: en ? 'Delivered'                          : 'Entregado',
    step3Desc:  en ? 'Tap to confirm the order was delivered.' : 'Toca para confirmar que el pedido fue entregado.',
    step3Btn:   en ? 'Order delivered'                    : 'Pedido entregado',
    // GPS
    gpsSharing: en ? 'GPS sharing active'                 : 'GPS activo',
    gpsEvery:   en ? 'Updated every 10 s — keep page open' : 'Actualizado cada 10 s — mantén la página abierta',
    gpsErr:     en ? 'Could not get your location'        : 'No se pudo obtener tu ubicación',
    gpsUnsupported: en ? 'GPS not available on this device' : 'GPS no disponible en este dispositivo',
    tryAgain:   en ? 'Try again'                          : 'Intentar de nuevo',
    // Done
    doneTitle:  en ? 'Delivery complete!'                 : '¡Entrega completada!',
    doneSub:    en ? 'Thank you for your delivery.'       : 'Gracias por tu entrega.',
    // Photo
    photoTitle: en ? 'Proof of delivery photo'            : 'Foto de prueba de entrega',
    photoTap:   en ? 'Tap to take or upload photo'        : 'Toca para tomar o subir foto',
    photoOk:    en ? 'Photo uploaded'                     : 'Foto subida',
    photoAlt:   en ? 'Delivery proof'                     : 'Foto de entrega',
    photoErr:   en ? 'Upload failed — try again'          : 'Error al subir — intenta de nuevo',
    connErr:    en ? 'Connection error'                   : 'Error de conexión',
    // Action feedback
    sending:    en ? 'Sending…'                           : 'Enviando…',
    notified:   en ? 'Customer notified'                  : 'Cliente notificado',
    errSend:    en ? 'Error — please try again'           : 'Error — intenta de nuevo',
  };
}

const STEPS: DeliveryStep[] = ['start', 'picked_up', 'at_door', 'delivered'];

export default function DriverTrackPage({ params, searchParams }: PageProps) {
  const { token } = params;
  const lang = searchParams?.lang === 'en' ? 'en' : 'es';
  const t = getT(lang);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsError, setGpsError] = useState('');
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep>('start');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');

  // GPS helpers
  const sendLocation = async (lat: number, lng: number) => {
    try {
      await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lat, lng }),
      });
    } catch { /* silent — will retry on next interval */ }
  };

  const startGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }
    setGpsStatus('sharing');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      pos => sendLocation(pos.coords.latitude, pos.coords.longitude),
      err => { setGpsStatus('error'); setGpsError(err.message); },
    );
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          // Recover from a previous GPS error automatically
          setGpsStatus('sharing');
          setGpsError('');
          sendLocation(pos.coords.latitude, pos.coords.longitude);
        },
        err => setGpsError(err.message),
      );
    }, 10_000);
  };

  const stopGps = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setGpsStatus('idle');
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Call /api/driver/status for a given action — returns true on success
  const callDriverStatus = async (action: 'picked_up' | 'at_door' | 'delivered'): Promise<boolean> => {
    setActionLoading(true);
    setActionFeedback('');
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      if (res.ok) {
        setActionFeedback(t.notified);
        return true;
      }
      const d = await res.json().catch(() => ({}));
      setActionFeedback(d.error ?? t.errSend);
      return false;
    } catch {
      setActionFeedback(t.errSend);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // Step handlers — only advance step if API call succeeded
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
    if (ok) {
      stopGps();
      setDeliveryStep('delivered');
    }
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

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center p-5 pb-10 text-white">
      <div className="w-full max-w-sm space-y-5 mt-8">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Bike className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black">{t.title}</h1>
          <p className="text-gray-400 text-sm">{t.subtitle}</p>
        </div>

        {/* GPS indicator — shown while sharing */}
        {gpsStatus === 'sharing' && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-emerald-400 text-sm font-semibold">{t.gpsSharing}</span>
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

        {/* Progress steps */}
        {deliveryStep !== 'delivered' && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            {/* Step 1 */}
            <StepRow
              icon={<Package className="w-5 h-5" />}
              label={t.step1Label}
              done={stepIndex > 0}
              active={deliveryStep === 'start'}
            />
            {/* Step 2 */}
            <StepRow
              icon={<MapPin className="w-5 h-5" />}
              label={t.step2Label}
              done={stepIndex > 1}
              active={deliveryStep === 'picked_up'}
            />
            {/* Step 3 */}
            <StepRow
              icon={<DoorOpen className="w-5 h-5" />}
              label={t.step3Label}
              done={stepIndex > 2}
              active={deliveryStep === 'at_door'}
            />
          </div>
        )}

        {/* Action area */}
        {deliveryStep === 'delivered' ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <p className="text-xl font-black text-emerald-400">{t.doneTitle}</p>
            <p className="text-gray-400 text-sm">{t.doneSub}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveryStep === 'start' && (
              <>
                <p className="text-gray-400 text-sm text-center">{t.step1Desc}</p>
                <ActionButton loading={actionLoading} onClick={handlePickedUp} color="emerald">
                  <Package className="w-5 h-5" /> {t.step1Btn}
                </ActionButton>
              </>
            )}

            {deliveryStep === 'picked_up' && (
              <>
                <div className="text-center text-xs text-gray-500">{t.gpsEvery}</div>
                <p className="text-gray-400 text-sm text-center">{t.step2Desc}</p>
                <ActionButton loading={actionLoading} onClick={handleAtDoor} color="amber">
                  <DoorOpen className="w-5 h-5" /> {t.step2Btn}
                </ActionButton>
              </>
            )}

            {deliveryStep === 'at_door' && (
              <>
                <p className="text-gray-400 text-sm text-center">{t.step3Desc}</p>
                <ActionButton loading={actionLoading} onClick={handleDelivered} color="emerald">
                  <CheckCircle className="w-5 h-5" /> {t.step3Btn}
                </ActionButton>
              </>
            )}

            {actionFeedback && (
              <p className={`text-xs text-center ${actionFeedback === t.notified ? 'text-emerald-400' : 'text-red-400'}`}>
                {actionFeedback}
              </p>
            )}
          </div>
        )}

        {/* Proof of delivery photo — shown after picked up */}
        {(deliveryStep === 'picked_up' || deliveryStep === 'at_door' || deliveryStep === 'delivered') && (
          <div className="border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-300">{t.photoTitle}</p>
            </div>
            {photoUrl ? (
              <div className="space-y-2">
                <img src={photoUrl} alt={t.photoAlt} className="w-full rounded-xl object-cover max-h-48" />
                <p className="text-xs text-emerald-400 text-center">✓ {t.photoOk}</p>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 rounded-xl p-5 cursor-pointer hover:border-gray-500 transition-colors ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {photoUploading
                  ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  : <Upload className="w-6 h-6 text-gray-400" />}
                <span className="text-xs text-gray-400">{photoUploading ? '…' : t.photoTap}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            )}
            {photoError && <p className="text-red-400 text-xs">{photoError}</p>}
          </div>
        )}

        <p className="text-gray-700 text-xs text-center">
          Powered by MENIUS · {token.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepRow({ icon, label, done, active }: {
  icon: React.ReactNode; label: string; done: boolean; active: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-2 px-1 rounded-xl transition-all ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500/20 text-emerald-400' : active ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500'}`}>
        {done ? <CheckCircle className="w-4 h-4" /> : icon}
      </div>
      <span className={`text-sm font-semibold ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-gray-500'}`}>
        {label}
      </span>
      {done && <span className="ml-auto text-emerald-500 text-xs">✓</span>}
    </div>
  );
}

function ActionButton({ children, loading, onClick, color }: {
  children: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  color: 'emerald' | 'amber';
}) {
  const bg = color === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-amber-500 hover:bg-amber-400';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-4 rounded-2xl ${bg} text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
}
