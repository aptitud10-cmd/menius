import Link from 'next/link';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

// Hay un solo plan a la venta: Pro. 'starter' se mantiene como valor aceptado
// (páginas con gate hasPlanAccess(...,'starter')), pero se presenta como Pro.
// 'business' ya no se vende: se muestra un aviso neutral, sin ofrecer compra.
const PRO_COLOR = {
  bg:     'bg-violet-50',
  icon:   'text-violet-500',
  badge:  'bg-violet-100 text-violet-700',
  btn:    'bg-violet-600 hover:bg-violet-700',
  shadow: 'shadow-violet-200',
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
  const feature = en ? featureEn : featureEs;

  if (requiredPlan === 'business') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
          <Lock className="w-7 h-7 text-gray-400" />
        </div>
        {feature && (
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{feature}</h2>
        )}
        <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
          {en
            ? 'This feature is not available on your plan.'
            : 'Esta función no está disponible en tu plan.'}
        </p>
        <Link
          href="/app"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          {en ? 'Back to dashboard' : 'Volver al panel'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const color = PRO_COLOR;
  const planLabel = 'Pro';

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
        {feature ?? (en ? `${planLabel} Plan Required` : `Plan ${planLabel} requerido`)}
      </h2>

      <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
        {en
          ? `This feature is included in the ${planLabel} plan. Upgrade to ${planLabel} to unlock it.`
          : `Esta función está incluida en el plan ${planLabel}. Sube a ${planLabel} para acceder.`}
      </p>

      <Link
        href="/app/billing"
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${color.btn} text-white font-semibold text-sm transition-colors shadow-md ${color.shadow}`}
      >
        {en ? `Upgrade to ${planLabel}` : `Subir a ${planLabel}`}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
