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
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
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

function getStatusMap(t: ReturnType<typeof useDashboardLocale>['t']) {
  return {
    trialing: { label: t.billing_statusTrialing, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    active: { label: t.billing_statusActive, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
    past_due: { label: t.billing_statusPastDue, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
    canceled: { label: t.billing_statusCanceled, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
    unpaid: { label: t.billing_statusUnpaid, color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
    incomplete: { label: t.billing_statusIncomplete, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
  } as Record<string, { label: string; color: string; bg: string; dot: string }>;
}

function getInvStatus(t: ReturnType<typeof useDashboardLocale>['t']) {
  return {
    paid: { label: t.billing_invPaid, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    open: { label: t.billing_invOpen, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    uncollectible: { label: t.billing_invUncollectible, cls: 'bg-red-50 text-red-700 border-red-200' },
    void: { label: t.billing_invVoid, cls: 'bg-gray-50 text-gray-500 border-gray-200' },
    draft: { label: t.billing_invDraft, cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  } as Record<string, { label: string; cls: string }>;
}

/* ─── Helpers ─── */

function formatCurrency(cents: number, currency: string, uiLocale: 'en' | 'es' = 'es') {
  return new Intl.NumberFormat(uiLocale === 'en' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(ts: number, uiLocale: 'en' | 'es' = 'es') {
  return new Date(ts * 1000).toLocaleDateString(uiLocale === 'en' ? 'en-US' : 'es-MX', {
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
  unlimitedLabel,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  limit: number;
  unlimitedLabel: string;
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
          {value} / {isUnlimited ? <span className="text-emerald-600 font-medium">{unlimitedLabel}</span> : limit}
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
  const { t, locale } = useDashboardLocale();
  const STATUS_MAP = getStatusMap(t);
  const INV_STATUS = getInvStatus(t);
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [commissions, setCommissions] = useState<{
    planId: string;
    isTrial: boolean;
    isCommissionPlan: boolean;
    currency: string;
    commissionBps: number;
    commissionRate: number;
    thisMonth: { onlineRevenue: number; orderCount: number; commissionAmount: number };
    prevMonth: { onlineRevenue: number; orderCount: number; commissionAmount: number };
  } | null>(null);
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
      fetch('/api/billing/commissions').then((r) => r.json()),
    ])
      .then(([subData, invData, usageData, commData]) => {
        setSub(subData.subscription ?? null);
        setInvoices(invData.invoices ?? []);
        setUsage(usageData);
        setCommissions(commData ?? null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(t.billing_connectionError);
      });
  }, [t.billing_connectionError]);

  const handlePlanSelect = useCallback(
    async (planId: PlanId, interval: BillingInterval) => {
      setActionLoading(planId);
      setError(null);
      try {
        const hasLiveSub = sub?.stripe_subscription_id &&
          (sub.status === 'active' || sub.status === 'past_due');

        if (hasLiveSub) {
          const res = await fetch('/api/billing/change-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: planId, interval }),
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            setError(data.error || t.billing_noCheckout);
            setActionLoading(null);
          }
        } else {
          const res = await fetch('/api/billing/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: planId, interval }),
          });
          const data = await res.json();
          if (data.url) window.location.href = data.url;
          else {
            setError(data.error || t.billing_noCheckout);
            setActionLoading(null);
          }
        }
      } catch {
        setError(t.billing_connectionError);
        setActionLoading(null);
      }
    },
    [sub, t.billing_connectionError, t.billing_noCheckout],
  );

  const handlePortal = useCallback(async () => {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else {
        setError(data.error || t.billing_noCheckout);
        setActionLoading(null);
      }
    } catch {
      setError(t.billing_connectionError);
      setActionLoading(null);
    }
  }, [t.billing_connectionError, t.billing_noCheckout]);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="h-56 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const resolvedId = sub ? resolvePlanId(sub.plan_id) : 'free';
  const planInfo = resolvedId ? (PLANS[resolvedId] ?? PLANS.free) : PLANS.free;
  const isFreePlan = !sub || sub.plan_id === 'free' || sub.status === 'free' || sub.status === 'canceled';
  const statusInfo = isFreePlan
    ? { label: t.billing_freePlanLabel, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' }
    : sub ? (STATUS_MAP[sub.status] ?? STATUS_MAP.incomplete) : null;
  const isTrialing = sub?.status === 'trialing';
  const isActive = sub?.status === 'active';
  const billingInterval: BillingInterval = sub?.stripe_price_id
    ? getIntervalByStripePrice(sub.stripe_price_id)
    : 'monthly';
  const daysLeft = sub?.trial_end
    ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
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
        <h1 className="dash-heading">{t.billing_title}</h1>
        <p className="text-gray-500 mt-1">{t.billing_subtitle}</p>
      </div>

      {/* ─── Checkout banners ─── */}
      {banner === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800 flex-1">
            {t.billing_subscriptionActivated}
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
            {t.billing_processCancelled}
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
                    <h2 className="text-xl font-bold text-gray-900">{t.billing_planLabel} {planInfo.name}</h2>
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
                  {isFreePlan ? (
                    <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                      {t.billing_freePrice}
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        ${planInfo.price[billingInterval]}
                      </span>
                      <span className="text-gray-400 ml-1">
                        /{billingInterval === 'annual' ? t.billing_perYear : t.billing_perMonth}
                      </span>
                      {billingInterval === 'annual' && (
                        <span className="ml-3 text-sm text-emerald-600 font-medium">
                          ${Math.round(planInfo.price.annual / 12)}/{t.billing_monthEquiv}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Trial bar */}
                {isTrialing && (
                  <div className="mb-4 space-y-2">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">{t.billing_trialPeriod}</span>
                        </div>
                        <span className={cn(
                          'text-sm font-bold',
                          daysLeft <= 3 ? 'text-amber-600' : 'text-blue-700',
                        )}>
                          {daysLeft} {daysLeft === 1 ? t.billing_dayRemaining : t.billing_daysRemaining}
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
                    <p className="text-xs text-gray-500 px-1">{t.billing_trialDowngradeNote}</p>
                  </div>
                )}

                {/* Billing date */}
                {!isTrialing && periodEnd && (
                  <p className="text-sm text-gray-500">
                    {sub.canceled_at ? t.billing_cancelsAt : t.billing_nextBilling}{' '}
                    <span className="font-medium text-gray-700">{periodEnd}</span>
                  </p>
                )}

                {sub.canceled_at && sub.status !== 'canceled' && (
                  <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5 mt-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t.billing_cancelEnd}
                  </p>
                )}

                {/* Top 4 features */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(locale === 'en' ? (planInfo.features_en ?? planInfo.features) : planInfo.features).slice(0, 6).map((f) => (
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
                    {actionLoading === 'portal' ? t.billing_redirecting : t.billing_manageSubscription}
                  </button>
                )}
                {isTrialing && (
                  <button
                    onClick={() => handlePlanSelect(resolvedId as PlanId, 'monthly')}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-200/50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {actionLoading === resolvedId ? t.billing_redirecting : t.billing_subscribeNow}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Commission-plan upsell calculator ─── */}
      {commissions?.isCommissionPlan && (() => {
        const paid = commissions.thisMonth.commissionAmount;
        const currency = (commissions.currency || 'USD').toUpperCase();
        const isUSD = currency === 'USD';

        const fmtLocal = (n: number) =>
          new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(n);

        const fmtUSD = (n: number) =>
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(n);

        // Plan prices are always in USD (Stripe billing). Savings math is only
        // valid when the restaurant's commission currency is also USD. For all
        // other currencies we show the plan price in USD and skip the arithmetic.
        const PLAN_PRICES = { starter: 39, pro: 79, business: 149 } as const;
        type UpsellPlan = keyof typeof PLAN_PRICES;
        const upsellPlans: UpsellPlan[] = ['starter', 'pro', 'business'];

        // Breakeven = plan_price_USD / 0.04 — how much USD online revenue needed
        // for the plan to pay itself. Only shown for USD restaurants.
        const bestPlan = isUSD
          ? upsellPlans.find((p) => PLAN_PRICES[p] < paid) ?? null
          : null;

        return (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 mb-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900">
                      {locale === 'en' ? 'Commission Plan' : 'Plan por Comisión'}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      4% {locale === 'en' ? 'per online order' : 'por orden online'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {locale === 'en'
                      ? 'Business-tier features · No monthly fee · Pay only when you sell online'
                      : 'Acceso Business · Sin cuota mensual · Solo pagas cuando vendes online'}
                  </p>
                </div>
              </div>

              {/* This month summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-white/70 rounded-xl border border-white p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {locale === 'en' ? 'Commission paid this month' : 'Comisión pagada este mes'}
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {fmtLocal(paid)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {commissions.thisMonth.orderCount}{' '}
                    {locale === 'en' ? 'online orders' : 'órdenes online'}
                  </p>
                </div>
                <div className="bg-white/70 rounded-xl border border-white p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {locale === 'en' ? 'Online revenue' : 'Ingresos online'}
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
                    {fmtLocal(commissions.thisMonth.onlineRevenue)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {locale === 'en' ? 'this month' : 'este mes'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/70 rounded-xl border border-white p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {locale === 'en' ? 'Effective rate' : 'Tasa efectiva'}
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">4%</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {locale === 'en' ? 'on online payments only' : 'solo en pagos online'}
                  </p>
                </div>
              </div>

              {/* Savings calculator */}
              <div className="bg-white/60 rounded-xl border border-emerald-100 p-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {locale === 'en' ? '💡 Compare with a subscription' : '💡 Comparar con una suscripción'}
                </p>
                <div className="space-y-2">
                  {upsellPlans.map((planKey) => {
                    const priceUSD = PLAN_PRICES[planKey];
                    // Savings math is only valid when both amounts are in USD
                    const savings = isUSD ? paid - priceUSD : null;
                    const wouldSave = savings !== null && savings > 0;
                    return (
                      <div
                        key={planKey}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                          wouldSave
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-semibold capitalize ${wouldSave ? 'text-emerald-800' : 'text-gray-600'}`}>
                            {planKey.charAt(0).toUpperCase() + planKey.slice(1)}
                          </span>
                          <span className={`text-xs ${wouldSave ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {fmtUSD(priceUSD)}/{locale === 'en' ? 'mo' : 'mes'} · 0%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {wouldSave && savings !== null ? (
                            <>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                {locale === 'en'
                                  ? `Save ${fmtUSD(savings)}/mo`
                                  : `Ahorras ${fmtUSD(savings)}/mes`}
                              </span>
                              <button
                                onClick={() => handlePlanSelect(planKey as Parameters<typeof handlePlanSelect>[0], 'monthly')}
                                disabled={actionLoading !== null}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 disabled:opacity-50"
                              >
                                {locale === 'en' ? 'Switch' : 'Cambiar'}
                              </button>
                            </>
                          ) : isUSD ? (
                            <span className="text-xs text-gray-400">
                              {locale === 'en'
                                ? `Breakeven at ${fmtUSD(priceUSD * 25)}/mo revenue`
                                : `Se paga con ${fmtUSD(priceUSD * 25)}/mes en ventas`}
                            </span>
                          ) : (
                            // Non-USD: show switch button without savings arithmetic
                            <button
                              onClick={() => handlePlanSelect(planKey as Parameters<typeof handlePlanSelect>[0], 'monthly')}
                              disabled={actionLoading !== null}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 disabled:opacity-50"
                            >
                              {locale === 'en' ? 'Switch → 0%' : 'Cambiar → 0%'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {bestPlan && paid > 0 && isUSD && (
                  <p className="text-xs text-emerald-700 font-medium mt-3 px-1">
                    {locale === 'en'
                      ? `✓ At your current volume, ${bestPlan.charAt(0).toUpperCase() + bestPlan.slice(1)} already pays for itself.`
                      : `✓ Con tu volumen actual, el plan ${bestPlan.charAt(0).toUpperCase() + bestPlan.slice(1)} ya se paga solo.`}
                  </p>
                )}
                {!isUSD && (
                  <p className="text-xs text-gray-400 mt-3 px-1">
                    {locale === 'en'
                      ? `Plans are billed in USD via Stripe. Your commissions are in ${currency}.`
                      : `Los planes se cobran en USD vía Stripe. Tus comisiones están en ${currency}.`}
                  </p>
                )}
                {paid === 0 && (
                  <p className="text-xs text-gray-400 mt-3 px-1">
                    {locale === 'en'
                      ? 'No online orders this month yet — commissions will show here as you process payments.'
                      : 'Aún no hay órdenes online este mes — las comisiones aparecerán aquí conforme proceses pagos.'}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                {locale === 'en'
                  ? 'Commission is only charged on online card payments via Stripe Connect. Cash and Wompi orders are always free.'
                  : 'La comisión solo aplica a pagos online con tarjeta vía Stripe Connect. Efectivo y Wompi siempre son gratuitos.'}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ─── Commission card (subscription plans) ─── */}
      {commissions && !commissions.isCommissionPlan && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {locale === 'en' ? 'Platform commissions' : 'Comisiones de plataforma'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {locale === 'en'
                  ? 'Applied to online payments via Stripe Connect only'
                  : 'Solo aplica a pagos online con Stripe Connect'}
              </p>
            </div>
            {/* Current rate badge */}
            <span className={cn(
              'flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border',
              commissions.commissionBps === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : commissions.commissionBps <= 100
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200'
            )}>
              {commissions.isTrial
                ? (locale === 'en' ? '0% — trial period' : '0% — período de prueba')
                : commissions.commissionBps === 0
                  ? (locale === 'en' ? '0% — no commission' : '0% — sin comisión')
                  : `${commissions.commissionBps / 100}% ${locale === 'en' ? 'per online order' : 'por orden online'}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* This month commissions */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">
                {locale === 'en' ? 'Commission this month' : 'Comisión este mes'}
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {commissions.commissionBps === 0
                  ? new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
                      style: 'currency', currency: commissions.currency || 'USD', minimumFractionDigits: 0,
                    }).format(0)
                  : new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
                      style: 'currency', currency: commissions.currency || 'USD', minimumFractionDigits: 2,
                    }).format(commissions.thisMonth.commissionAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {commissions.thisMonth.orderCount}{' '}
                {locale === 'en' ? 'online orders' : 'órdenes online'}
              </p>
            </div>

            {/* Online revenue this month */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">
                {locale === 'en' ? 'Online revenue (this month)' : 'Ingresos online (este mes)'}
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
                  style: 'currency', currency: commissions.currency || 'USD', minimumFractionDigits: 0,
                }).format(commissions.thisMonth.onlineRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {locale === 'en' ? 'via Stripe Connect' : 'vía Stripe Connect'}
              </p>
            </div>

            {/* Upgrade CTA if paying commission */}
            {commissions.commissionBps > 0 ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">
                    {locale === 'en' ? 'Upgrade to Pro → 0%' : 'Sube a Pro → 0%'}
                  </p>
                  <p className="text-xs text-emerald-600 leading-relaxed">
                    {locale === 'en'
                      ? 'Pro plan eliminates commissions. At current volume, it pays for itself.'
                      : 'El plan Pro elimina las comisiones. Con tu volumen actual, se paga solo.'}
                  </p>
                </div>
                <button
                  onClick={() => document.getElementById('pricing-table')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1"
                >
                  {locale === 'en' ? 'See plans →' : 'Ver planes →'}
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {locale === 'en' ? '0% commission' : '0% comisión'}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {locale === 'en' ? 'Your plan has no transaction fees' : 'Tu plan no tiene comisiones por transacción'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Usage meters ─── */}
      {sub && usage && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
            {t.billing_currentUsage}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <UsageMeter
              label={t.billing_productsLabel}
              icon={Package}
              value={usage.products}
              limit={planLimits.maxProducts}
              unlimitedLabel={t.billing_unlimited}
            />
            <UsageMeter
              label={t.billing_tablesLabel}
              icon={LayoutGrid}
              value={usage.tables}
              limit={planLimits.maxTables}
              unlimitedLabel={t.billing_unlimited}
            />
            <UsageMeter
              label={t.billing_teamLabel}
              icon={Users}
              value={1}
              limit={planLimits.maxUsers}
              unlimitedLabel={t.billing_unlimited}
            />
          </div>
        </div>
      )}

      {/* ─── Invoices ─── */}
      {invoices.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {t.billing_paymentHistory}
            </h3>
            {sub?.stripe_subscription_id && (
              <button
                onClick={handlePortal}
                disabled={actionLoading !== null}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
              >
                {t.billing_viewAll}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {invoices.slice(0, 5).map((inv) => {
              const st = INV_STATUS[inv.status ?? ''] ?? INV_STATUS.draft;
              return (
                <div key={inv.id} className="px-4 sm:px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {inv.number || t.billing_invoice}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-gray-400">{formatDate(inv.created, locale)}</p>
                      <span className="hidden sm:inline text-gray-300">·</span>
                      <span className="sm:hidden text-sm font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(inv.amount_paid, inv.currency, locale)}
                      </span>
                      <span className={cn(
                        'sm:hidden inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
                        st.cls,
                      )}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <span className="hidden sm:inline text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(inv.amount_paid, inv.currency, locale)}
                  </span>
                  <span className={cn(
                    'hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border',
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
                      title={t.billing_downloadPdf}
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

      {/* ─── Change plan section ─── */}
      <div className="mt-10 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isFreePlan ? t.billing_upgradeHeading : t.billing_upgradeTitle}
          </h2>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto">
            {isFreePlan ? t.billing_upgradeHeadingDesc : t.billing_upgradeDesc}
          </p>
        </div>
        <PricingTable
          onSelect={handlePlanSelect}
          currentPlan={isFreePlan ? 'free' : (resolvedId ?? undefined)}
          loading={actionLoading}
          hideFree={isActive && !isFreePlan}
        />
      </div>

      {/* ─── No subscription (legacy fallback) ─── */}
      {false && !sub && (
        <div className="space-y-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t.billing_noSubscription}</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {t.billing_choosePlan}
            </p>
          </div>
          <PricingTable onSelect={handlePlanSelect} loading={actionLoading} />
        </div>
      )}
    </div>
  );
}
