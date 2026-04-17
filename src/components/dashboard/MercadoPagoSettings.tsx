'use client';

/**
 * MercadoPagoSettings — lets the restaurant owner connect their MP account.
 *
 * The owner pastes their Access Token from:
 * developers.mercadopago.com → Tu negocio → Credenciales
 *
 * The token is saved to restaurants.mp_access_token and mp_enabled is toggled.
 * We never expose the token after it's saved — only show a masked version.
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  restaurantId: string;
  mpEnabled: boolean;
  hasMpToken: boolean; // true if mp_access_token is set (we don't expose the actual token)
  locale?: string;
}

export function MercadoPagoSettings({ restaurantId, mpEnabled, hasMpToken, locale }: Props) {
  const en = locale === 'en';

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [enabled, setEnabled] = useState(mpEnabled);
  const [hasToken, setHasToken] = useState(hasMpToken);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = {
    title: en ? 'MercadoPago Payments' : 'Pagos con MercadoPago',
    desc: en
      ? 'Accept card payments, OXXO, SPEI, and more from your customers via MercadoPago. Paste your Access Token from MercadoPago Developers.'
      : 'Acepta pagos con tarjeta, OXXO, SPEI y más de tus clientes vía MercadoPago. Pega tu Access Token de MercadoPago Desarrolladores.',
    tokenLabel: en ? 'Access Token (Production)' : 'Access Token (Producción)',
    tokenPlaceholder: 'APP_USR-...',
    tokenHelp: en
      ? 'Go to developers.mercadopago.com → Your business → Credentials → Production credentials'
      : 'Ve a developers.mercadopago.com → Tu negocio → Credenciales → Credenciales de producción',
    tokenSet: en ? 'Token configured ✓ (paste a new one to update)' : 'Token configurado ✓ (pega uno nuevo para actualizar)',
    enableLabel: en ? 'Enable MercadoPago payments' : 'Activar pagos con MercadoPago',
    save: en ? 'Save' : 'Guardar',
    saving: en ? 'Saving…' : 'Guardando…',
    success: en ? 'MercadoPago settings saved.' : 'Configuración de MercadoPago guardada.',
    error: en ? 'Could not save. Try again.' : 'No se pudo guardar. Intenta de nuevo.',
    docsLink: en ? 'Go to MercadoPago Developers →' : 'Ir a MercadoPago Desarrolladores →',
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);

    try {
      const payload: Record<string, unknown> = { mp_enabled: enabled };
      if (token.trim()) payload.mp_access_token = token.trim();

      const res = await fetch('/api/tenant/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? 'Error');

      setMsg({ type: 'success', text: t.success });
      if (token.trim()) {
        setHasToken(true);
        setToken('');
      }
    } catch {
      setMsg({ type: 'error', text: t.error });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">💳</span> {t.title}
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">{t.desc}</p>
        </div>
        <a
          href="https://developers.mercadopago.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap flex-shrink-0"
        >
          {t.docsLink} <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setEnabled(e => !e)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">{t.enableLabel}</span>
      </label>

      {/* Access Token field */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">{t.tokenLabel}</label>
        {hasToken && !token && (
          <p className="text-xs text-emerald-600 font-medium">{t.tokenSet}</p>
        )}
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={hasToken ? '••••••••••••••••••••••••' : t.tokenPlaceholder}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => setShowToken(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400">{t.tokenHelp}</p>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t.saving : t.save}
        </button>

        {msg && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${msg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
            {msg.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Status badge */}
      {hasToken && enabled && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700">
            {en ? 'MercadoPago active — customers can pay with card, OXXO, and SPEI' : 'MercadoPago activo — tus clientes pueden pagar con tarjeta, OXXO y SPEI'}
          </span>
        </div>
      )}
    </div>
  );
}
