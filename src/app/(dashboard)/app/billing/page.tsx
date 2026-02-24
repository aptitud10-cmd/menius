'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Check, AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANS, resolvePlanId, getIntervalByStripePrice, type PlanId, type BillingInterval } from '@/lib/plans';
import { PricingTable } from '@/components/shared/PricingTable';

interface SubscriptionData {
  plan_id: string;
  status: string;
  stripe_price_id: string | null;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  stripe_subscription_id: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  trialing: { label: 'Periodo de prueba', color: 'text-blue-600', bg: 'bg-blue-50', Icon: Clock },
  active: { label: 'Activa', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: Check },
  past_due: { label: 'Pago pendiente', color: 'text-amber-600', bg: 'bg-amber-50', Icon: AlertTriangle },
  canceled: { label: 'Cancelada', color: 'text-red-600', bg: 'bg-red-50', Icon: AlertTriangle },
  unpaid: { label: 'Sin pagar', color: 'text-red-600', bg: 'bg-red-50', Icon: AlertTriangle },
  incomplete: { label: 'Incompleta', color: 'text-gray-600', bg: 'bg-gray-100', Icon: Clock },
};

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((d) => { setSub(d.subscription ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId: PlanId, interval: BillingInterval) => {
    setActionLoading(planId);
    setError(null);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'No se pudo crear la sesión. Intenta de nuevo.');
        setActionLoading(null);
      }
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'No se pudo abrir el portal. Intenta de nuevo.');
        setActionLoading(null);
      }
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-48 w-full rounded-2xl bg-gray-100" />
      </div>
    );
  }

  const resolvedId = sub ? resolvePlanId(sub.plan_id) : null;
  const planInfo = resolvedId ? PLANS[resolvedId] : null;
  const statusInfo = sub ? STATUS_MAP[sub.status] : null;
  const isTrialing = sub?.status === 'trialing';
  const isActive = sub?.status === 'active';
  const billingInterval: BillingInterval = sub?.stripe_price_id
    ? getIntervalByStripePrice(sub.stripe_price_id)
    : 'monthly';
  const daysLeft = sub?.trial_end
    ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div>
      <div className="mb-6">
        <h1 className="dash-heading">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu suscripción y método de pago</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current plan card */}
      {sub && planInfo && statusInfo && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold text-gray-900">Plan {planInfo.name}</h2>
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
                  statusInfo.bg, statusInfo.color,
                )}>
                  <statusInfo.Icon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-1.5">
                <p className="text-gray-600">
                  <span className="text-2xl font-extrabold text-gray-900">
                    ${planInfo.price[billingInterval]}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    /{billingInterval === 'annual' ? 'año' : 'mes'}
                  </span>
                </p>

                {isTrialing && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          daysLeft <= 3 ? 'bg-amber-500' : 'bg-blue-500',
                        )}
                        style={{ width: `${Math.max(5, (daysLeft / 14) * 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-sm font-medium',
                      daysLeft <= 3 ? 'text-amber-600' : 'text-blue-600',
                    )}>
                      {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes
                    </span>
                  </div>
                )}

                {!isTrialing && periodEnd && (
                  <p className="text-sm text-gray-500">
                    {sub.canceled_at ? 'Se cancela el' : 'Próxima facturación:'} {periodEnd}
                  </p>
                )}

                {sub.canceled_at && sub.status !== 'canceled' && (
                  <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tu plan se cancelará al final del periodo
                  </p>
                )}
              </div>

              {/* Current plan features */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Incluido en tu plan</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {planInfo.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:min-w-[180px]">
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
                  onClick={() => handleCheckout(resolvedId as PlanId, 'monthly')}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  {actionLoading === resolvedId ? 'Redirigiendo...' : 'Suscribirse ahora'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade section */}
      {sub && resolvedId && resolvedId !== 'business' && (isActive || isTrialing) && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar de plan</h2>
          <p className="text-sm text-gray-500 mb-6">
            Compara los planes y elige el que mejor se adapte a tu restaurante.
          </p>
          <PricingTable
            onSelect={handleCheckout}
            currentPlan={resolvedId}
            loading={actionLoading}
          />
        </div>
      )}

      {/* No subscription */}
      {!sub && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sin suscripción activa</h2>
            <p className="text-sm text-gray-500 mb-2">Elige un plan para comenzar a usar MENIUS.</p>
          </div>
          <PricingTable onSelect={handleCheckout} loading={actionLoading} />
        </div>
      )}
    </div>
  );
}
