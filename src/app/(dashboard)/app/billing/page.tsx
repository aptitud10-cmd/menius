'use client';

import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Check, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionData {
  plan_id: string;
  status: string;
  billing_interval: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

const PLAN_DISPLAY: Record<string, { name: string; price: { monthly: number; annual: number } }> = {
  basic: { name: 'Básico', price: { monthly: 19, annual: 190 } },
  pro: { name: 'Pro', price: { monthly: 49, annual: 490 } },
  enterprise: { name: 'Enterprise', price: { monthly: 149, annual: 1490 } },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  trialing: { label: 'Periodo de prueba', color: 'text-blue-700', bg: 'bg-blue-50', icon: Clock },
  active: { label: 'Activa', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Check },
  past_due: { label: 'Pago pendiente', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle },
  canceled: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
  unpaid: { label: 'Sin pagar', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
  incomplete: { label: 'Incompleta', color: 'text-gray-700', bg: 'bg-gray-50', icon: Clock },
};

const PLAN_FEATURES: Record<string, string[]> = {
  basic: ['Hasta 50 productos', '10 mesas', '1 usuario', 'Menú digital QR', 'Pedidos en línea', 'Soporte email'],
  pro: ['500 productos', '100 mesas', '5 usuarios', 'Promos y descuentos', 'Analytics avanzado', 'Pagos Stripe', 'Reseñas', 'Soporte prioritario'],
  enterprise: ['Productos ilimitados', 'Mesas ilimitadas', 'Usuarios ilimitados', 'Multi-sucursal', 'KDS (cocina)', 'App meseros', 'API personalizada', 'Soporte 24/7'],
};

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((d) => { setSub(d.subscription ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId: string, interval: string = 'monthly') => {
    setActionLoading(planId);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, interval }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  const planInfo = sub ? PLAN_DISPLAY[sub.plan_id] : null;
  const statusInfo = sub ? STATUS_LABELS[sub.status] : null;
  const isTrialing = sub?.status === 'trialing';
  const daysLeft = sub?.trial_end
    ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Facturación</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona tu suscripción y método de pago</p>
        </div>
      </div>

      {/* Current Plan Card */}
      {sub && planInfo && statusInfo && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-bold text-gray-900">Plan {planInfo.name}</h2>
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', statusInfo.bg, statusInfo.color)}>
                  <statusInfo.icon className="w-3 h-3" />
                  {statusInfo.label}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800 text-lg">${planInfo.price[sub.billing_interval as 'monthly' | 'annual']}</span>
                  {' '}/{sub.billing_interval === 'annual' ? 'año' : 'mes'}
                </p>
                {isTrialing && (
                  <p className="text-sm text-blue-600 font-medium">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {daysLeft} días restantes de prueba
                  </p>
                )}
                {!isTrialing && periodEnd && (
                  <p className="text-sm text-gray-400">
                    {sub.cancel_at_period_end ? 'Se cancela el' : 'Próxima facturación:'} {periodEnd}
                  </p>
                )}
                {sub.cancel_at_period_end && (
                  <p className="text-sm text-amber-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                    Tu plan se cancelará al final del periodo
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {sub.stripe_subscription_id && (
                <button
                  onClick={handlePortal}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {actionLoading === 'portal' ? 'Redirigiendo...' : 'Gestionar en Stripe'}
                </button>
              )}
              {isTrialing && (
                <button
                  onClick={() => handleCheckout(sub.plan_id)}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-md"
                >
                  <CreditCard className="w-4 h-4" />
                  {actionLoading === sub.plan_id ? 'Redirigiendo...' : 'Suscribirse ahora'}
                </button>
              )}
            </div>
          </div>

          {/* Features of current plan */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluye</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(PLAN_FEATURES[sub.plan_id] ?? []).map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Section */}
      {sub && sub.plan_id !== 'business' && (
        <div className="bg-gradient-to-r from-brand-950 to-brand-900 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-brand-400" />
                <h3 className="text-lg font-bold">
                  {sub.plan_id === 'starter' ? '¿Necesitas más?' : 'Lleva tu restaurante al siguiente nivel'}
                </h3>
              </div>
              <p className="text-sm text-gray-300">
                {sub.plan_id === 'starter'
                  ? 'Actualiza a Pro para desbloquear delivery, WhatsApp, analytics y más.'
                  : 'Actualiza a Business para productos ilimitados y soporte dedicado.'
                }
              </p>
            </div>
            <button
              onClick={() => handleCheckout(sub.plan_id === 'starter' ? 'pro' : 'business')}
              disabled={actionLoading !== null}
              className="flex-shrink-0 px-6 py-2.5 rounded-xl bg-brand-400 text-brand-950 text-sm font-bold hover:bg-brand-300 disabled:opacity-50 transition-all"
            >
              {actionLoading ? 'Redirigiendo...' : `Actualizar a ${sub.plan_id === 'starter' ? 'Pro' : 'Business'}`}
            </button>
          </div>
        </div>
      )}

      {/* No subscription */}
      {!sub && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Sin suscripción</h2>
          <p className="text-sm text-gray-500 mb-5">Elige un plan para comenzar a usar MENIUS.</p>
          <button
            onClick={() => handleCheckout('pro')}
            disabled={actionLoading !== null}
            className="px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-md"
          >
            {actionLoading ? 'Redirigiendo...' : 'Elegir plan'}
          </button>
        </div>
      )}
    </div>
  );
}
