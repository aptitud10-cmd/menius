"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

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

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isEs, setIsEs] = useState(true);

  useEffect(() => {
    if (isNotFoundError(error)) return; // no es un fallo: es un 404
    Sentry.captureException(error);
    setIsEs(!navigator.language.toLowerCase().startsWith("en"));
  }, [error]);

  if (isNotFoundError(error)) notFound();

  return (
    <div className="min-h-screen landing-bg relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-500/[0.05] rounded-full blur-[180px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-[-0.04em] text-white inline-block mb-10"
        >
          MENIUS
        </Link>

        <div className="w-16 h-16 rounded-2xl bg-red-500/[0.1] border border-red-500/[0.15] flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3 font-display tracking-tight">
          {isEs ? "Algo salió mal" : "Something went wrong"}
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-2">
          {isEs
            ? "Ocurrió un error inesperado. Nuestro equipo ha sido notificado automáticamente."
            : "An unexpected error occurred. Our team has been automatically notified."}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-600 font-mono mb-8">
            Ref: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-8" />}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            {isEs ? "Reintentar" : "Try again"}
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-white/[0.1] bg-white/[0.04] text-gray-300 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            {isEs ? "Ir al inicio" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
