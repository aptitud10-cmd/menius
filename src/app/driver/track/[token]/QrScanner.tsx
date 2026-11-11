'use client';

/**
 * Escáner de QR dentro de la página del repartidor (para agregar pedidos a la
 * ruta sin salir ni abrir otra pestaña). BarcodeDetector donde existe (Chrome
 * Android); jsQR cargado solo al abrir el escáner en el resto (iPhone).
 */

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Saca el token de un QR de MENIUS (…/driver/track/<token>[?…]). */
export function tokenFromQr(text: string): string | null {
  const m = /\/driver\/track\/([A-Za-z0-9_-]{8,200})/.exec(text);
  return m ? m[1] : null;
}

export function QrScanner({ en, onToken, onClose, message }: {
  en: boolean;
  onToken: (token: string) => void;
  onClose: () => void;
  /** Resultado del último intento (error o "agregando…"), lo pone el padre. */
  message?: { tone: 'info' | 'error'; text: string } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let lastHit = '';
    let lastHitAt = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setCamError(en
          ? 'Camera blocked. Allow it in the browser, or scan the next ticket with the phone camera.'
          : 'Cámara bloqueada. Permítela en el navegador o escanea el siguiente ticket con la cámara del teléfono.');
        return;
      }
      if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const detector: Detector | null = BD ? new BD({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;

      let busy = false;
      const tick = async () => {
        if (stopped) return;
        if (!busy && video.readyState >= 2) {
          busy = true;
          let text: string | null = null;
          try {
            if (detector) {
              const codes = await detector.detect(video);
              text = codes[0]?.rawValue ?? null;
            } else if (jsQR && ctx) {
              // Recorte a 480 px de ancho: suficiente para un QR de ticket y rápido.
              const w = Math.min(480, video.videoWidth);
              const h = Math.round((video.videoHeight / video.videoWidth) * w);
              canvas.width = w; canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              text = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
          } catch { /* frame inválido: sigue */ }
          busy = false;
          if (text) {
            const token = tokenFromQr(text);
            // El mismo QR frente a la cámara no se reporta 20 veces por segundo.
            if (token && (token !== lastHit || Date.now() - lastHitAt > 3000)) {
              lastHit = token; lastHitAt = Date.now();
              if (navigator.vibrate) navigator.vibrate(40);
              onTokenRef.current(token);
            }
          }
        }
        raf = window.setTimeout(tick, 180) as unknown as number;
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [en]);

  return (
    <div className="fixed inset-0 z-[95] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={en ? 'Scan the order QR' : 'Escanear el QR del pedido'}>
      <div className="flex items-center justify-between px-4 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <p className="text-white text-[16px] font-bold">{en ? 'Scan the QR on the next ticket' : 'Escanea el QR del siguiente ticket'}</p>
        <button type="button" onClick={onClose} aria-label={en ? 'Close' : 'Cerrar'} className="w-11 h-11 rounded-full grid place-items-center bg-white/15 text-white">
          <X className="w-5 h-5" aria-hidden />
        </button>
      </div>
      <div className="relative flex-1 grid place-items-center overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative w-[64vw] max-w-[280px] aspect-square rounded-[28px]" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', border: '3px solid rgba(255,255,255,0.9)' }} aria-hidden />
        {camError && (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-white px-4 py-3 text-center text-[14px] font-semibold text-gray-900">{camError}</p>
        )}
      </div>
      <div className="px-4 pt-3 min-h-[76px]" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        {message && (
          <p className={`rounded-2xl px-4 py-3 text-center text-[15px] font-bold ${message.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-white text-gray-900'}`} role="status">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
