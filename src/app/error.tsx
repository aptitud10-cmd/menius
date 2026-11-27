"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SUPPORT_CONTACT } from "@/lib/support-contact";
import { LV2_MIN_CSS } from "@/components/landing-v2/lv2-min-css";
import { notFound } from "next/navigation";

/**
 * notFound() señaliza el 404 lanzando un error especial (NEXT_NOT_FOUND). Este
 * boundary lo capturaba junto con los errores reales, así que NINGUNA URL
 * inexistente llegaba a not-found.tsx: se servía esta pantalla de error con
 * status 200. Para Google eso es un soft 404 — indexa páginas vacías y las
 * cuenta como contenido válido. Se re-lanza para que Next lo maneje.
 */
function isNotFoundError(error: Error & { digest?: string }) {
  return (
    error.digest === "NEXT_NOT_FOUND" || error.message === "NEXT_NOT_FOUND"
  );
}

/**
 * Chrome mínimo a propósito (fase 2): este boundary también envuelve el
 * dashboard, y quien lo ve puede ser un cliente que ya paga: sin "Try Pro free".
 * El CSS va en un <style> que solo existe mientras se muestra (lv2-min-css.ts).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Idioma: la cookie menius_locale, como el resto del sitio (EN por defecto).
  const [isEs, setIsEs] = useState(false);

  useEffect(() => {
    if (isNotFoundError(error)) return; // no es un fallo: es un 404
    void import('@sentry/nextjs').then((S) => S.captureException(error)).catch(() => {});
    setIsEs(/(?:^|; )menius_locale=es(?:;|$)/.test(document.cookie));
  }, [error]);

  if (isNotFoundError(error)) notFound();

  return (
    <div className="lv2 lv2m root-scroll" lang={isEs ? "es" : "en"}>
      <style dangerouslySetInnerHTML={{ __html: LV2_MIN_CSS }} />
      <header className="nav nav-min">
        <div className="wrap">
          <Link className="logo" href="/" aria-label="MENIUS">
            MENIUS<i aria-hidden="true" />
          </Link>
          <a className="nav-phone" href={`tel:${SUPPORT_CONTACT.phoneE164}`}>
            {SUPPORT_CONTACT.phoneDisplay}
          </a>
        </div>
      </header>

      <main id="main-content" className="lost">
        <div className="wrap lost-grid one">
          <div>
            <div className="err-ico" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 9v4M12 17h.01M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h1>{isEs ? "Algo salió mal" : "Something went wrong"}</h1>
            <p className="lead">
              {isEs
                ? "Ocurrió un error inesperado. Nuestro equipo ha sido notificado automáticamente."
                : "An unexpected error occurred. Our team has been automatically notified."}
            </p>
            {error.digest && <p className="ref">Ref: {error.digest}</p>}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => reset()}>
                {isEs ? "Reintentar" : "Try again"}
              </button>
              <Link className="tlink" href="/">
                {isEs ? "Ir al inicio" : "Go home"}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="foot-min">
        <div className="wrap">
          <span>© {new Date().getFullYear()} MENIUS LLC</span>
          <span>
            <a href="/status">{isEs ? "Estado" : "Status"}</a> ·{" "}
            <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
