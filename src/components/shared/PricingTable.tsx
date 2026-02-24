'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
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
  const [interval, setInterval] = useState<BillingInterval>('monthly');

  const annualSavings = Math.round(((39 * 12 - 390) / (39 * 12)) * 100);

  return (
    <div className="w-full">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setInterval('monthly')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            interval === 'monthly'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Mensual
        </button>
        <button
          onClick={() => setInterval('annual')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all relative',
            interval === 'annual'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Anual
          <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
            -{annualSavings}%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className={cn(
        'grid gap-4',
        compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3',
      )}>
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isPopular = !!plan.popular;
          const isCurrent = currentPlan === id;
          const price = plan.price[interval];
          const monthlyEquiv = interval === 'annual' ? Math.round(price / 12) : price;

          return (
            <div
              key={id}
              className={cn(
                'relative rounded-2xl p-6 flex flex-col border transition-all',
                isPopular
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100/50 ring-1 ring-emerald-500/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                isCurrent && 'ring-2 ring-emerald-500',
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}

              {isCurrent && (
                <span className="absolute -top-3 right-4 px-3 py-1 bg-gray-900 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Tu plan
                </span>
              )}

              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

              <div className="mt-5 mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    ${monthlyEquiv}
                  </span>
                  <span className="text-sm text-gray-500">/mes</span>
                </div>
                {interval === 'annual' && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${price}/año — facturado anualmente
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span className="text-sm text-gray-600 leading-snug">{f}</span>
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 opacity-50">
                    <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span className="text-sm text-gray-400 leading-snug line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelect(id, interval)}
                disabled={loading !== null && loading !== undefined || isCurrent}
                className={cn(
                  'w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : isPopular
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50'
                      : 'bg-gray-900 text-white hover:bg-gray-800',
                )}
              >
                {loading === id
                  ? 'Redirigiendo...'
                  : isCurrent
                    ? 'Plan actual'
                    : 'Elegir plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
