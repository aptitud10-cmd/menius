import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

const PLAN_LABELS: Record<string, { es: string; en: string; color: string }> = {
  starter: { es: 'Starter', en: 'Starter', color: 'emerald' },
  pro:     { es: 'Pro',     en: 'Pro',     color: 'violet' },
  business:{ es: 'Business',en: 'Business',color: 'amber'  },
};

const COLOR_CLASSES: Record<string, { bg: string; icon: string; badge: string; btn: string; shadow: string }> = {
  emerald: {
    bg:     'bg-emerald-50',
    icon:   'text-emerald-500',
    badge:  'bg-emerald-100 text-emerald-700',
    btn:    'bg-emerald-600 hover:bg-emerald-700',
    shadow: 'shadow-emerald-200',
  },
  violet: {
    bg:     'bg-violet-50',
    icon:   'text-violet-500',
    badge:  'bg-violet-100 text-violet-700',
    btn:    'bg-violet-600 hover:bg-violet-700',
    shadow: 'shadow-violet-200',
  },
  amber: {
    bg:     'bg-amber-50',
    icon:   'text-amber-500',
    badge:  'bg-amber-100 text-amber-700',
    btn:    'bg-amber-600 hover:bg-amber-700',
    shadow: 'shadow-amber-200',
  },
};

interface PlanUpgradeWallProps {
  requiredPlan: 'starter' | 'pro' | 'business';
  locale?: 'es' | 'en';
  featureEs?: string;
  featureEn?: string;
}

export function PlanUpgradeWall({
  requiredPlan,
  locale = 'es',
  featureEs,
  featureEn,
}: PlanUpgradeWallProps) {
  const en = locale === 'en';
  const plan = PLAN_LABELS[requiredPlan] ?? PLAN_LABELS.pro;
  const color = COLOR_CLASSES[plan.color] ?? COLOR_CLASSES.violet;
  const planLabel = en ? plan.en : plan.es;
  const feature = en ? featureEn : featureEs;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className={`w-16 h-16 rounded-2xl ${color.bg} flex items-center justify-center mb-6`}>
        <Lock className={`w-7 h-7 ${color.icon}`} />
      </div>

      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${color.badge}`}>
        <Sparkles className="w-3 h-3" />
        {planLabel}
      </span>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {feature
          ? (en ? feature : feature)
          : (en ? `${planLabel} Plan Required` : `Plan ${planLabel} requerido`)}
      </h2>

      <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
        {en
          ? `This feature is included in the ${planLabel} plan and above. Upgrade to unlock full access.`
          : `Esta función está incluida en el plan ${planLabel} y superiores. Mejora tu plan para acceder.`}
      </p>

      <Link
        href="/app/billing"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${color.btn} text-white font-semibold text-sm transition-colors shadow-md ${color.shadow}`}
      >
        {en ? 'Upgrade Plan' : 'Mejorar Plan'}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
