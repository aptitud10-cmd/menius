'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { PLANS, type PlanId, type BillingInterval } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface PricingTableProps {
  onSelect: (planId: PlanId, interval: BillingInterval) => void;
  currentPlan?: string;
  loading?: string | null;
  compact?: boolean;
}

const PLAN_ORDER: PlanId[] = ['starter', 'pro', 'business'];

export function PricingTable({ onSelect, currentPlan, loading, compact }: PricingTableProps) {
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
            Mensual
          </button>
          <button
            onClick={() => setInterval('annual')}
            className={cn(
              'relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200',
              interval === 'annual' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Anual
          </button>
        </div>
        {interval === 'annual' && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold animate-fade-in">
            Ahorra {annualSavings}%
          </span>
        )}
      </div>

      {/* ─── Plan cards ─── */}
      <div className={cn(
        'grid gap-5',
        compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3',
      )}>
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isPopular = !!plan.popular;
          const isBusiness = id === 'business';
          const isCurrent = currentPlan === id;
          const price = plan.price[interval];
          const monthlyEquiv = interval === 'annual' ? Math.round(price / 12) : price;

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
                !isPopular && !isBusiness
                  ? 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  : '',
                isCurrent && !isPopular && 'ring-2 ring-emerald-500',
              )}
            >
              {/* Inner container for gradient-bordered card */}
              <div className={cn(
                'flex flex-col flex-1 rounded-[14px] p-6',
                isPopular ? 'bg-white' : '',
                isBusiness && !isPopular ? 'p-6' : '',
                !isPopular && !isBusiness ? '' : '',
              )}>
                {/* Badges */}
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md">
                    Mas popular
                  </span>
                )}
                {isCurrent && (
                  <span className={cn(
                    'absolute -top-3 right-4 px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider',
                    isBusiness ? 'bg-white text-gray-900' : 'bg-gray-900 text-white',
                  )}>
                    Tu plan
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
                      ${monthlyEquiv}
                    </span>
                    <span className={cn(
                      'text-sm',
                      isBusiness ? 'text-gray-400' : 'text-gray-500',
                    )}>
                      /mes
                    </span>
                  </div>
                  {interval === 'annual' && (
                    <p className={cn(
                      'text-xs mt-1',
                      isBusiness ? 'text-gray-500' : 'text-gray-400',
                    )}>
                      ${price}/ano — facturado anualmente
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
                      Redirigiendo...
                    </>
                  ) : isCurrent ? (
                    'Plan actual'
                  ) : currentPlan ? (
                    `Cambiar a ${plan.name}`
                  ) : (
                    'Comenzar prueba gratis'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
