'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface PricingTableProps {
  onSelect: (planId: PlanId, interval: BillingInterval) => void;
  currentPlan?: string;
  loading?: string | null;
  compact?: boolean;
  /** Hide the FREE column (e.g. when shown separately on the landing page) */
  hideFree?: boolean;
}

const ALL_PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business'];
const PLAN_RANK: Record<PlanId, number> = { free: -1, starter: 0, pro: 1, business: 2 };

export function PricingTable({ onSelect, currentPlan, loading, compact, hideFree }: PricingTableProps) {
  const PLAN_ORDER = hideFree ? ALL_PLAN_ORDER.filter((p) => p !== 'free') : ALL_PLAN_ORDER;
  const { locale } = useDashboardLocale();
  const [interval, setInterval] = useState<BillingInterval>('annual');

  const annualSavings = Math.round(((39 * 12 - 390) / (39 * 12)) * 100);

  return (
    <div className="w-full">
      {/* ─── Pill toggle ─── */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
          {/* Sliding indicator */}
          <div
            className={cn(
              'absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out',
              interval === 'monthly' ? 'left-1 w-[calc(50%-4px)]' : 'left-[50%] w-[calc(50%-4px)]',
            )}
          />
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              'relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200',
              interval === 'monthly' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {locale === 'en' ? 'Monthly' : 'Mensual'}
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={cn(
              'relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200',
              interval === 'annual' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {locale === 'en' ? 'Annual' : 'Anual'}
          </button>
        </div>
        {interval === 'annual' && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-fade-in">
            {locale === 'en' ? `Save ${annualSavings}%` : `Ahorra ${annualSavings}%`}
          </span>
        )}
      </div>

      {/* ─── Plan cards ─── */}
      <div className={cn(
        'grid gap-5',
        compact ? 'grid-cols-1' : hideFree ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      )}>
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isPopular = !!plan.popular;
          const isFree = !!plan.isFree;
          const isBusiness = id === 'business';
          const isCurrent = currentPlan === id;
          const price = plan.price[interval];
          const monthlyEquiv = interval === 'annual' && !isFree ? Math.round(price / 12) : price;

          return (
            <div
              key={id}
              className={cn(
                'relative rounded-2xl flex flex-col transition-all duration-300',
                isPopular
                  ? 'p-[2px] bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 shadow-xl shadow-emerald-100/40 sm:scale-[1.03] z-10'
                  : '',
                isBusiness && !isPopular
                  ? 'bg-gray-900 text-white shadow-xl'
                  : '',
                isFree && !isPopular
                  ? 'border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-300'
                  : '',
                !isPopular && !isBusiness && !isFree
                  ? 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  : '',
                isCurrent && !isPopular && 'ring-2 ring-emerald-500',
              )}
            >
              {/* Inner container for gradient-bordered card */}
              <div className={cn(
                'flex flex-col flex-1 rounded-[14px] p-6',
                isPopular ? 'bg-white' : '',
              )}>
                {/* Badges */}
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md">
                    {locale === 'en' ? 'Most popular' : 'Más popular'}
                  </span>
                )}
                {isFree && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-200 text-gray-600 text-[11px] font-bold rounded-full uppercase tracking-wider">
                    {locale === 'en' ? 'Forever free' : 'Siempre gratis'}
                  </span>
                )}
                {isCurrent && !isFree && (
                  <span className={cn(
                    'absolute -top-3 right-4 px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider',
                    isBusiness ? 'bg-white text-gray-900' : 'bg-gray-900 text-white',
                  )}>
                    {locale === 'en' ? 'Your plan' : 'Tu plan'}
                  </span>
                )}

                {/* Plan name & description */}
                <h3 className={cn(
                  'text-lg font-bold',
                  isBusiness ? 'text-white' : 'text-gray-900',
                )}>
                  {plan.name}
                </h3>
                <p className={cn(
                  'text-sm mt-1',
                  isBusiness ? 'text-gray-400' : 'text-gray-500',
                )}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-5 mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-4xl font-extrabold tracking-tight',
                      isBusiness ? 'text-white' : 'text-gray-900',
                    )}>
                      {isFree ? (locale === 'en' ? 'Free' : 'Gratis') : `$${monthlyEquiv}`}
                    </span>
                    {!isFree && (
                      <span className={cn(
                        'text-sm',
                        isBusiness ? 'text-gray-400' : 'text-gray-500',
                      )}>
                        /{locale === 'en' ? 'mo' : 'mes'}
                      </span>
                    )}
                  </div>
                  {interval === 'annual' && !isFree && (
                    <p className={cn(
                      'text-xs mt-1',
                      isBusiness ? 'text-gray-500' : 'text-gray-400',
                    )}>
                      ${price}/{locale === 'en' ? 'yr — billed annually' : 'año — facturado anualmente'}
                    </p>
                  )}
                  {isFree && (
                    <p className="text-xs mt-1 text-gray-400">
                      {locale === 'en' ? 'No credit card required' : 'Sin tarjeta de crédito'}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          'w-4 h-4 flex-shrink-0 mt-0.5',
                          isPopular ? 'text-emerald-600' : isBusiness ? 'text-emerald-400' : 'text-emerald-600',
                        )}
                        strokeWidth={2.5}
                      />
                      <span className={cn(
                        'text-sm leading-snug',
                        isBusiness ? 'text-gray-300' : 'text-gray-600',
                      )}>
                        {f}
                      </span>
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-50">
                      <X
                        className={cn(
                          'w-4 h-4 flex-shrink-0 mt-0.5',
                          isBusiness ? 'text-gray-500' : 'text-gray-400',
                        )}
                        strokeWidth={2}
                      />
                      <span className={cn(
                        'text-sm leading-snug line-through',
                        isBusiness ? 'text-gray-500' : 'text-gray-400',
                      )}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isFree ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-default"
                  >
                    {isCurrent
                      ? (locale === 'en' ? 'Current plan' : 'Plan actual')
                      : (locale === 'en' ? 'Your current plan' : 'Tu plan actual')}
                  </button>
                ) : (
                  <button
                    onClick={() => onSelect(id, interval)}
                    disabled={(loading !== null && loading !== undefined) || isCurrent}
                    className={cn(
                      'w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2',
                      isCurrent
                        ? isBusiness
                          ? 'bg-gray-800 text-gray-500 cursor-default'
                          : 'bg-gray-100 text-gray-400 cursor-default'
                        : isPopular
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200/40'
                          : isBusiness
                            ? 'bg-white text-gray-900 hover:bg-gray-100 font-bold'
                            : 'bg-gray-900 text-white hover:bg-gray-800',
                    )}
                  >
                    {loading === id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {locale === 'en' ? 'Redirecting...' : 'Redirigiendo...'}
                      </>
                    ) : isCurrent ? (
                      locale === 'en' ? 'Current plan' : 'Plan actual'
                    ) : currentPlan && currentPlan !== 'free' ? (
                      PLAN_RANK[id] > PLAN_RANK[currentPlan as PlanId]
                        ? (locale === 'en' ? `Upgrade to ${plan.name}` : `Mejorar a ${plan.name}`)
                        : (locale === 'en' ? `Switch to ${plan.name}` : `Cambiar a ${plan.name}`)
                    ) : (
                      locale === 'en' ? `Get ${plan.name}` : `Elegir ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
