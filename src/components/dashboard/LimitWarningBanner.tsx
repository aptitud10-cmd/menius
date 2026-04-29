'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface UsageData {
  products: number;
  categories: number;
  tables: number;
}

interface SubInfo {
  status: string;
  plan_id?: string | null;
}

interface PlanLimits {
  maxProducts: number;
  maxTables: number;
  maxCategories: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { maxProducts: -1, maxTables: 5, maxCategories: -1 },
  starter: { maxProducts: -1, maxTables: 15, maxCategories: -1 },
  pro: { maxProducts: -1, maxTables: 50, maxCategories: -1 },
  business: { maxProducts: -1, maxTables: -1, maxCategories: -1 },
};

const WARN_THRESHOLD = 0.8; // 80%

export function LimitWarningBanner() {
  const { locale } = useDashboardLocale();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/usage').then((r) => r.json()),
      fetch('/api/billing/subscription').then((r) => r.json()),
    ])
      .then(([usageData, subData]) => {
        setUsage(usageData);
        setSub(subData.subscription ?? null);
      })
      .catch(() => {});
  }, []);

  if (dismissed || !usage) return null;

  // Determine effective plan id
  const planId = (() => {
    if (!sub) return 'free';
    if (sub.status === 'active' || sub.status === 'past_due') return sub.plan_id ?? 'free';
    if (sub.status === 'trialing') return sub.plan_id ?? 'starter';
    return 'free';
  })();

  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
  const isEn = locale === 'en';

  // Find the most-saturated limit (only ones with finite caps)
  type Item = { type: 'tables' | 'products' | 'categories'; current: number; limit: number; ratio: number };
  const items: Item[] = [];
  if (limits.maxTables > 0) {
    items.push({ type: 'tables', current: usage.tables, limit: limits.maxTables, ratio: usage.tables / limits.maxTables });
  }
  if (limits.maxProducts > 0) {
    items.push({ type: 'products', current: usage.products, limit: limits.maxProducts, ratio: usage.products / limits.maxProducts });
  }
  if (limits.maxCategories > 0) {
    items.push({ type: 'categories', current: usage.categories, limit: limits.maxCategories, ratio: usage.categories / limits.maxCategories });
  }

  const worst = items.sort((a, b) => b.ratio - a.ratio)[0];
  if (!worst || worst.ratio < WARN_THRESHOLD) return null;

  const isFull = worst.ratio >= 1;
  const labels: Record<string, { es: string; en: string }> = {
    tables: { es: 'mesas', en: 'tables' },
    products: { es: 'productos', en: 'products' },
    categories: { es: 'categorías', en: 'categories' },
  };
  const label = labels[worst.type][isEn ? 'en' : 'es'];

  // Suggest next plan that fits
  let suggestedPlan: 'starter' | 'pro' | 'business' = 'starter';
  if (worst.type === 'tables') {
    if (worst.current >= 15) suggestedPlan = 'pro';
    if (worst.current >= 50) suggestedPlan = 'business';
  } else if (planId === 'starter') {
    suggestedPlan = 'pro';
  } else if (planId === 'pro') {
    suggestedPlan = 'business';
  }

  const planName = suggestedPlan.charAt(0).toUpperCase() + suggestedPlan.slice(1);

  return (
    <div
      className={`mx-3 mb-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
        isFull
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      <div className="flex-1 leading-snug">
        <p className="font-semibold">
          {isFull
            ? (isEn
                ? `Limit reached: ${worst.current}/${worst.limit} ${label}`
                : `Límite alcanzado: ${worst.current}/${worst.limit} ${label}`)
            : (isEn
                ? `${worst.current}/${worst.limit} ${label} used`
                : `${worst.current}/${worst.limit} ${label} usadas`)}
        </p>
        <p className="text-[10px] opacity-70 font-normal mt-0.5">
          {isEn
            ? `Upgrade to ${planName} to keep growing`
            : `Subí a ${planName} para seguir creciendo`}
        </p>
      </div>
      <Link
        href={`/app/billing?autoCheckout=${suggestedPlan}`}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white font-semibold text-[11px] transition-colors"
      >
        {isEn ? 'Upgrade' : 'Mejorar'}
        <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={isEn ? 'Dismiss' : 'Cerrar'}
        className="text-current opacity-50 hover:opacity-100 transition-opacity ml-1"
      >
        ✕
      </button>
    </div>
  );
}
