'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubInfo {
  status: string;
  trial_end: string | null;
}

export function TrialBanner() {
  const [sub, setSub] = useState<SubInfo | null>(null);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((r) => r.json())
      .then((d) => setSub(d.subscription ?? null))
      .catch(() => {});
  }, []);

  if (!sub || sub.status !== 'trialing' || !sub.trial_end) return null;

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
          ? 'Tu prueba termina hoy'
          : `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} de prueba`}
      </span>
      <ArrowRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}
