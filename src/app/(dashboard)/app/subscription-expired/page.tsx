'use client';

import { useState } from 'react';
import { Shield, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { PricingTable } from '@/components/shared/PricingTable';
import type { PlanId, BillingInterval } from '@/lib/plans';

export default function SubscriptionExpiredPage() {
  const { t } = useDashboardLocale();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (planId: PlanId, interval: BillingInterval) => {
    setLoading(planId);
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
        setError(data.error || t.expired_errorPayment);
        setLoading(null);
      }
    } catch {
      setError(t.expired_connectionError);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
            <Shield className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
            {t.expired_title}
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-[15px] leading-relaxed">
            {t.expired_desc}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 mx-auto max-w-md p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Plans */}
        <PricingTable onSelect={handleSelect} loading={loading} />

        {/* Footer */}
        <div className="text-center mt-10">
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> {t.expired_logout}
          </button>
        </div>
      </div>
    </div>
  );
}
