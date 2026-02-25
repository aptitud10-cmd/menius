'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  Check,
  AlertTriangle,
  Clock,
  CreditCard,
  X,
  Download,
  ChevronRight,
  Package,
  LayoutGrid,
  Users,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLANS,
  resolvePlanId,
  getIntervalByStripePrice,
  type PlanId,
  type BillingInterval,
} from '@/lib/plans';
import { PricingTable } from '@/components/shared/PricingTable';

/* ─── Types ─── */

interface SubscriptionData {
  plan_id: string;
  status: string;
  stripe_price_id: string | null;
  current_period_end: string;
  trial_end: string | null;
  canceled_at: string | null;
  stripe_subscription_id: string | null;
}

interface Invoice {
  id: string;
  number: string | null;
  amount_paid: number;
  currency: string;
  status: string | null;
  created: number;
  invoice_pdf: string | null;
}

interface UsageData {
  products: number;
  categories: number;
  tables: number;
}

/* ─── Status config ─── */

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  trialing: { label: 'Prueba gratuita', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  active: { label: 'Activa', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  past_due: { label: 'Pago pendiente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  canceled: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  unpaid: { label: 'Sin pagar', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  incomplete: { label: 'Incompleta', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
};

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Pagada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  open: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  uncollectible: { label: 'Fallida', cls: 'bg-red-50 text-red-700 border-red-200' },
  void: { label: 'Anulada', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  draft: { label: 'Borrador', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
};

/* ─── Helpers ─── */

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Usage Meter ─── */

function UsageMeter({
  label,
  icon: Icon,
  value,
  limit,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? Math.min(value / 100, 1) * 30 : Math.min(value / limit, 1) * 100;
  const barColor =
    isUnlimited || pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 text-gray-400" />
          {label}
        </div>
        <span className="text-sm tabular-nums text-gray-500">
          {value} / {isUnlimited ? <span className="text-emerald-600 font-medium">Ilimitado</span> : limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<'success' | 'cancel' | null>(null);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') setBanner('success');
    else if (checkout === 'cancel') setBanner('cancel');

    if (checkout) {
      const timer = setTimeout(() => setBanner(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/subscription').then((r) => r.json()),
      fetch('/api/billing/invoices').then((r) => r.json()),
      fetch('/api/billing/usage').then((r) => r.json()),
    ])
      .then(([subData, invData, usageData]) => {
        setSub(subData.subscription ?? null);
        setInvoices(invData.invoices ?? []);
        setUsage(usageData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = useCallback(
    async (planId: PlanId, interval: BillingInterval) => {
      setActionLoading(planId);
      setError(null);
      try {
        const res = await fetch('/api/billing/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: planId, interval }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else {
          setError(data.error || 'No se pudo crear la sesion. Intenta de nuevo.');
          setActionLoading(null);
        }
      } catch {
        setError('Error de conexion. Verifica tu internet e intenta de nuevo.');
        setActionLoading(null);
      }
    },
    [],
  );

  const handlePortal = useCallback(async () => {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        setError(data.error || 'No se pudo abrir el portal.');
        setActionLoading(null);
      }
    } catch {
      setError('Error de conexion.');
      setActionLoading(null);
    }
  }, []);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-56 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const resolvedId = sub ? resolvePlanId(sub.plan_id) : null;
  const planInfo = resolvedId ? PLANS[resolvedId] : null;
  const statusInfo = sub ? STATUS_MAP[sub.status] ?? STATUS_MAP.incomplete : null;
  const isTrialing = sub?.status === 'trialing';
  const isActive = sub?.status === 'active';
  const billingInterval: BillingInterval = sub?.stripe_price_id
    ? getIntervalByStripePrice(sub.stripe_price_id)
    : 'monthly';
  const daysLeft = sub?.trial_end
    ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const planLimits = planInfo
    ? planInfo.limits
    : { maxProducts: -1, maxTables: 10, maxUsers: 1, maxCategories: -1 };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="dash-heading">Facturación</h1>
        <p className="text-gray-500 mt-1">Gestiona tu suscripcion, uso y pagos en un solo lugar.</p>
      </div>

      {/* ─── Checkout banners ─── */}
      {banner === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800 flex-1">
            Suscripcion activada con exito. Bienvenido a MENIUS.
          </p>
          <button onClick={() => setBanner(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {banner === 'cancel' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 animate-fade-in">
          <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800 flex-1">
            El proceso fue cancelado. Puedes intentar de nuevo cuando quieras.
          </p>
          <button onClick={() => setBanner(null)} className="text-amber-400 hover:text-amber-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Error ─── */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Current plan card ─── */}
      {sub && planInfo && statusInfo && (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white mb-6">
          {/* Decorative gradient strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: plan info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Plan {planInfo.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        statusInfo.bg, statusInfo.color,
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot)} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    ${planInfo.price[billingInterval]}
                  </span>
                  <span className="text-gray-400 ml-1">
                    /{billingInterval === 'annual' ? 'ano' : 'mes'}
                  </span>
                  {billingInterval === 'annual' && (
                    <span className="ml-3 text-sm text-emerald-600 font-medium">
                      ${Math.round(planInfo.price.annual / 12)}/mes equivalente
                    </span>
                  )}
                </div>

                {/* Trial bar */}
                {isTrialing && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">Periodo de prueba</span>
                      </div>
                      <span className={cn(
                        'text-sm font-bold',
                        daysLeft <= 3 ? 'text-amber-600' : 'text-blue-700',
                      )}>
                        {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          daysLeft <= 3 ? 'bg-amber-500' : 'bg-blue-500',
                        )}
                        style={{ width: `${Math.max(5, (daysLeft / 14) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Billing date */}
                {!isTrialing && periodEnd && (
                  <p className="text-sm text-gray-500">
                    {sub.canceled_at ? 'Se cancela el' : 'Proxima facturacion:'}{' '}
                    <span className="font-medium text-gray-700">{periodEnd}</span>
                  </p>
                )}

                {sub.canceled_at && sub.status !== 'canceled' && (
                  <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tu plan se cancelara al final del periodo
                  </p>
                )}

                {/* Top 4 features */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {planInfo.features.slice(0, 6).map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-col gap-3 lg:min-w-[200px]">
                {sub.stripe_subscription_id && (
                  <button
                    onClick={handlePortal}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {actionLoading === 'portal' ? 'Redirigiendo...' : 'Gestionar suscripcion'}
                  </button>
                )}
                {sub.stripe_subscription_id && (
                  <button
                    onClick={handlePortal}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    {actionLoading === 'portal' ? 'Redirigiendo...' : 'Actualizar pago'}
                  </button>
                )}
                {isTrialing && (
                  <button
                    onClick={() => handleCheckout(resolvedId as PlanId, 'monthly')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-200/50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {actionLoading === resolvedId ? 'Redirigiendo...' : 'Suscribirse ahora'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Usage meters ─── */}
      {sub && usage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
            Uso actual
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <UsageMeter
              label="Productos"
              icon={Package}
              value={usage.products}
              limit={planLimits.maxProducts}
            />
            <UsageMeter
              label="Mesas"
              icon={LayoutGrid}
              value={usage.tables}
              limit={planLimits.maxTables}
            />
            <UsageMeter
              label="Equipo"
              icon={Users}
              value={1}
              limit={planLimits.maxUsers}
            />
          </div>
        </div>
      )}

      {/* ─── Invoices ─── */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Historial de pagos
            </h3>
            {sub?.stripe_subscription_id && (
              <button
                onClick={handlePortal}
                disabled={actionLoading !== null}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
              >
                Ver todas
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {invoices.slice(0, 5).map((inv) => {
              const st = INV_STATUS[inv.status ?? ''] ?? INV_STATUS.draft;
              return (
                <div key={inv.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {inv.number || 'Factura'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(inv.created)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(inv.amount_paid, inv.currency)}
                  </span>
                  <span className={cn(
                    'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border',
                    st.cls,
                  )}>
                    {st.label}
                  </span>
                  {inv.invoice_pdf && (
                    <a
                      href={inv.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Upgrade section ─── */}
      {sub && resolvedId && resolvedId !== 'business' && (isActive || isTrialing) && (
        <div className="mt-10 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Potencia tu restaurante
            </h2>
            <p className="text-gray-500 mt-2 max-w-lg mx-auto">
              Compara los planes y elige el que mejor se adapte a las necesidades de tu negocio.
            </p>
          </div>
          <PricingTable
            onSelect={handleCheckout}
            currentPlan={resolvedId}
            loading={actionLoading}
          />
        </div>
      )}

      {/* ─── No subscription ─── */}
      {!sub && (
        <div className="space-y-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sin suscripcion activa</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Elige un plan para comenzar a usar MENIUS y digitalizar tu restaurante.
            </p>
          </div>
          <PricingTable onSelect={handleCheckout} loading={actionLoading} />
        </div>
      )}
    </div>
  );
}
