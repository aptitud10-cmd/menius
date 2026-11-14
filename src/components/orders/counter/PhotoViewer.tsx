'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { CounterText } from './ui';

/**
 * Foto de la entrega a pantalla completa, sin salir del Counter (antes era un
 * enlace target=_blank: en la app Android la URL de Supabase es otro dominio y
 * se abría en Chrome). Fondo negro en Claro y en Oscuro, como cualquier visor de
 * fotos: no altera los colores de la foto. Abajo, lo que sirve de prueba cuando
 * el cliente dice "no me llegó": quién, a qué hora y dónde.
 */
export function PhotoViewer({ src, T, driver, deliveredAt, address, onClose }: {
  src: string;
  T: CounterText;
  driver?: string | null;
  deliveredAt?: string | null;
  address?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const time = deliveredAt
    ? new Date(deliveredAt).toLocaleTimeString(T.locale, { hour: '2-digit', minute: '2-digit' })
    : null;
  const line = [time && `${T.delivered} ${time}`, driver].filter(Boolean).join(' · ');

  return (
    <div role="dialog" aria-modal="true" aria-label={T.deliveryPhoto}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        background: '#000', color: '#fff',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}>
      <div className="flex-none flex items-center gap-3 px-4 pt-3">
        <p className="flex-1 text-[18px] font-semibold">{T.deliveryPhoto}</p>
        <button type="button" onClick={onClose} aria-label={T.close}
          className="w-12 h-12 rounded-full inline-flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tocar la foto no cierra (se mira con calma); tocar el negro, sí. */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={T.deliveryPhoto} onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-xl" />
      </div>

      {(line || address) && (
        <div className="flex-none px-5 text-center" onClick={(e) => e.stopPropagation()}>
          {line && <p className="text-[17px] font-semibold">{line}</p>}
          {address && <p className="text-[16px] mt-0.5" style={{ color: 'rgba(255,255,255,.72)' }}>{address}</p>}
        </div>
      )}
    </div>
  );
}
