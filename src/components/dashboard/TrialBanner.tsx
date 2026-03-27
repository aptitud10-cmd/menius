'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface SubInfo {
  status: string;
  plan_id?: string | null;
  trial_end: string | null;
}

export function TrialBanner() {
  const { locale } = useDashboardLocale();
  const [sub, setSub] = useState<SubInfo | null>(null);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((d) => setSub(d.subscription ?? null))
      .catch(() => {});
  }, []);

  if (!sub) return null;

  const isEn = locale === 'en';

  // Legacy trial still running — show countdown
  if (sub.status === 'trialing' && sub.trial_end) {
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(sub.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ));
    const isUrgent = daysLeft <= 3;

    return (
      <Link
        href="/app/billing"
        className={cn(
          'mx-3 mb-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors group',
          isUrgent
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200',
        )}
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 leading-snug">
          {daysLeft === 0
            ? (isEn ? 'Trial ends today' : 'La prueba termina hoy')
            : isEn
              ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of trial left`
              : `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de prueba restantes`}
        </span>
        <ArrowRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </Link>
    );
  }

  // FREE plan — show upgrade nudge
  const isFreePlan =
    sub.plan_id === 'free' ||
    sub.status === 'free' ||
    sub.status === 'canceled' ||
    (!sub.status && !sub.plan_id);

  if (!isFreePlan) return null;

  return (
    <Link
      href="/app/billing"
      className="mx-3 mb-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors group"
    >
      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1 leading-snug">
        {isEn ? 'Free plan · 50 orders/mo' : 'Plan gratuito · 50 pedidos/mes'}
      </span>
      <span className="text-[10px] font-semibold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full group-hover:bg-emerald-700 transition-colors">
        {isEn ? 'Upgrade' : 'Mejorar'}
      </span>
      <ArrowRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}
