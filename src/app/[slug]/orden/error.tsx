'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCcw, ShoppingBag } from 'lucide-react';

export default function OrderTrackingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const searchParams = useSearchParams();
  const paid = searchParams.get('paid') === 'true';

  // Extract slug from URL path: /[slug]/orden/[orderNumber]
  const [slug, setSlug] = useState('');
  useEffect(() => {
    const parts = window.location.pathname.split('/');
    const idx = parts.indexOf('orden');
    if (idx > 0 && parts[idx - 1]) setSlug(parts[idx - 1]);
  }, []);

  if (paid) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pago recibido!</h1>
          <p className="text-sm text-gray-500 mb-1">Tu pago fue procesado exitosamente.</p>
          <p className="text-sm text-gray-500 mb-6">
            El restaurante ha recibido tu pedido y lo está preparando.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-6 text-left space-y-1.5">
            <p className="text-sm font-semibold text-emerald-800">¿Qué sigue?</p>
            <p className="text-xs text-emerald-700">✓ El restaurante recibió tu pedido</p>
            <p className="text-xs text-emerald-700">✓ Si dejaste tu email, recibirás un comprobante</p>
            <p className="text-xs text-emerald-700">✓ Puedes volver a intentar ver el estado de tu pedido</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-700 transition-colors active:scale-[0.98]"
            >
              <RefreshCcw className="w-4 h-4" />
              Ver estado del pedido
            </button>
            {slug && (
              <Link
                href={`/${slug}`}
                className="block w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Volver al menú
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">No se pudo cargar el pedido</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Hubo un problema al cargar el estado de tu pedido. Por favor intenta de nuevo.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors"
        >
          Intentar de nuevo
        </button>
        {slug && (
          <Link
            href={`/${slug}`}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Volver al menú
          </Link>
        )}
      </div>
    </div>
  );
}
