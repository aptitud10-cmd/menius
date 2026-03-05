'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#050505', color: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, background: 'rgba(239,68,68,0.05)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 420 }}>
            {/* Logo */}
            <a href="/" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', textDecoration: 'none', display: 'inline-block', marginBottom: 40 }}>
              MENIUS
            </a>

            {/* Error icon */}
            <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <svg width="32" height="32" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 6, lineHeight: 1.6 }}>
              Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
            </p>
            {error.digest && (
              <p style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 28 }}>
                Ref: {error.digest}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
              <button
                onClick={() => reset()}
                style={{ padding: '10px 20px', background: '#fff', color: '#000', borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Reintentar
              </button>
              <a
                href="/"
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.04)', color: '#d1d5db', borderRadius: 12, fontSize: 14, fontWeight: 500, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
