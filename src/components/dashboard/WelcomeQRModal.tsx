'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Copy, Check, ExternalLink, QrCode, Sparkles, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeQRModalProps {
  slug: string;
  restaurantName: string;
  locale?: 'es' | 'en';
}

const t = {
  es: {
    badge: '¡Tu restaurante está listo!',
    headline: 'Comparte tu menú digital',
    sub: 'Escanea el código o envía el link — tus clientes ordenan y pagan desde su celular.',
    copyLink: 'Copiar link',
    copied: '¡Copiado!',
    download: 'Descargar QR',
    viewMenu: 'Ver mi menú',
    print: 'Imprimir',
    tip: 'Imprime el QR y colócalo en tus mesas para recibir pedidos hoy mismo.',
    cta: 'Explorar mi dashboard',
  },
  en: {
    badge: 'Your restaurant is live!',
    headline: 'Share your digital menu',
    sub: 'Scan the code or send the link — customers order and pay from their phone.',
    copyLink: 'Copy link',
    copied: 'Copied!',
    download: 'Download QR',
    viewMenu: 'View menu',
    print: 'Print',
    tip: 'Print the QR and place it on your tables to start receiving orders today.',
    cta: 'Explore my dashboard',
  },
} as const;

export function WelcomeQRModal({ slug, restaurantName, locale = 'es' }: WelcomeQRModalProps) {
  const storageKey = `menius-welcome-shown-${slug}`;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const brandedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const s = t[locale];

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  const menuUrl = `${appUrl}/${slug}`;

  useEffect(() => {
    const shown = localStorage.getItem(storageKey);
    if (!shown) {
      // Small delay so the dashboard renders first — feels more natural
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open || !qrContainerRef.current) return;
    let cancelled = false;
    import('@/lib/styled-qr').then(async ({ renderStyledQR, generateBrandedCard }) => {
      if (cancelled || !qrContainerRef.current) return;
      await renderStyledQR(qrContainerRef.current, { data: menuUrl, size: 200 });
      const card = await generateBrandedCard(menuUrl, restaurantName, restaurantName, locale === 'en' ? 'Order from your phone' : 'Ordena desde tu celular');
      if (!cancelled) {
        brandedCanvasRef.current = card;
        setQrReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [open, menuUrl, restaurantName, locale]);

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  }, [storageKey]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const downloadQR = () => {
    if (!brandedCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `menius-qr-${slug}.png`;
    link.href = brandedCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const printQR = () => {
    if (!brandedCanvasRef.current) return;
    const dataUrl = brandedCanvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR — ${restaurantName}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:system-ui,sans-serif;padding:40px}
      img{max-width:320px;width:100%}
      p{margin-top:16px;font-size:13px;color:#6b7280;text-align:center}
    </style></head><body>
      <img src="${dataUrl}" alt="QR ${restaurantName}" />
      <p>${menuUrl}</p>
    </body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] hidden md:flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={s.headline}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label={locale === 'en' ? 'Close' : 'Cerrar'}
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 pt-7 pb-8 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-full mb-4 tracking-wide uppercase">
            <Sparkles className="w-3 h-3" />
            {s.badge}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{s.headline}</h2>
          <p className="text-emerald-100 text-sm mt-2 leading-relaxed max-w-xs mx-auto">{s.sub}</p>
        </div>

        {/* QR section */}
        <div className="px-6 pt-6 pb-2">
          <div className="bg-gray-50 rounded-2xl p-5 flex flex-col items-center">
            {/* QR code */}
            <div
              ref={qrContainerRef}
              className={cn(
                'mb-4 transition-opacity duration-300',
                qrReady ? 'opacity-100' : 'opacity-0'
              )}
              style={{ minHeight: 200, minWidth: 200 }}
            />
            {!qrReady && (
              <div className="absolute w-[200px] h-[200px] flex items-center justify-center">
                <QrCode className="w-12 h-12 text-gray-300 animate-pulse" />
              </div>
            )}

            {/* Menu URL */}
            <div className="w-full flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-sm text-gray-700 font-mono truncate min-w-0">{menuUrl}</span>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" />{s.copied}</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" />{s.copyLink}</>
                )}
              </button>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2.5 mt-3 px-1">
            <span className="text-base mt-0.5">💡</span>
            <p className="text-xs text-gray-500 leading-relaxed">{s.tip}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pt-4 pb-6 space-y-3">
          {/* Primary actions row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={downloadQR}
              disabled={!qrReady}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4 text-gray-700" />
              <span className="text-[11px] font-medium text-gray-600">{s.download}</span>
            </button>
            <button
              onClick={printQR}
              disabled={!qrReady}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <Printer className="w-4 h-4 text-gray-700" />
              <span className="text-[11px] font-medium text-gray-600">{s.print}</span>
            </button>
            <button
              onClick={() => window.open(menuUrl, '_blank')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-700" />
              <span className="text-[11px] font-medium text-gray-600">{s.viewMenu}</span>
            </button>
          </div>

          {/* Dashboard CTA */}
          <button
            onClick={dismiss}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm transition-colors"
          >
            {s.cta} →
          </button>
        </div>
      </div>
    </div>
  );
}
