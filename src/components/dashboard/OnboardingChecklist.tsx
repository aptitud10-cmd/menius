'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, Camera, FileText, Clock, UtensilsCrossed, QrCode,
  ShoppingBag, X, ChevronRight, Sparkles, PartyPopper,
  Monitor, Printer, Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

interface OnboardingChecklistProps {
  restaurantSlug: string;
  steps: {
    hasLogo: boolean;
    hasProfile: boolean;
    hasHours: boolean;
    hasProducts: boolean;
    hasTables: boolean;
    hasOrders: boolean;
  };
}

export function OnboardingChecklist({ restaurantSlug, steps }: OnboardingChecklistProps) {
  const storageKey = `menius-onboarding-dismissed-${restaurantSlug}`;
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const { t } = useDashboardLocale();
  const [hasPrinterConfigured, setHasPrinterConfigured] = useState(false);
  const [hasInstalledPWA, setHasInstalledPWA] = useState(false);
  const [hasOpenedCounter, setHasOpenedCounter] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    // Reset dismissed state only if fewer than 4 steps are complete (matches canDismiss threshold)
    const completedInProps = Object.values(steps).filter(Boolean).length;
    if (stored === 'true' && completedInProps < 4) {
      localStorage.removeItem(storageKey);
      setDismissed(false);
    } else {
      setDismissed(stored === 'true');
    }

    // Client-side detection for extra steps
    try {
      const printerRaw = localStorage.getItem('menius:printer-config');
      if (printerRaw) {
        const pCfg = JSON.parse(printerRaw);
        setHasPrinterConfigured(pCfg.receiptEnabled === true || pCfg.kitchenEnabled === true);
      }
    } catch { /* ignore */ }

    setHasInstalledPWA(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );

    const counterVisited = localStorage.getItem('menius-counter-visited') === 'true';
    setHasOpenedCounter(counterVisited);
  }, [storageKey, steps]);

  if (dismissed === null) return null;

  const STEP_TIME: Record<string, string> = {
    logo: '~1 min',
    profile: '~2 min',
    hours: '~2 min',
    menu: '~5 min',
    tables: '~1 min',
    orders: '~1 min',
  };

  const coreSteps: OnboardingStep[] = [
    {
      id: 'logo',
      title: t.onboarding_uploadLogo,
      description: t.onboarding_uploadLogoDesc,
      completed: steps.hasLogo,
      href: '/app/settings#logo',
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: 'profile',
      title: t.onboarding_completeProfile,
      description: t.onboarding_completeProfileDesc,
      completed: steps.hasProfile,
      href: '/app/settings#profile',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'hours',
      title: t.onboarding_setSchedule,
      description: t.onboarding_setScheduleDesc,
      completed: steps.hasHours,
      href: '/app/settings#profile',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'menu',
      title: t.onboarding_customizeMenu,
      description: t.onboarding_customizeMenuDesc,
      completed: steps.hasProducts,
      href: '/app/menu/products',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    {
      id: 'tables',
      title: t.onboarding_generateQR,
      description: t.onboarding_generateQRDesc,
      completed: steps.hasTables,
      href: '/app/tables',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'orders',
      title: t.onboarding_firstOrder,
      description: t.onboarding_firstOrderDesc,
      completed: steps.hasOrders,
      href: `/${restaurantSlug}`,
      icon: <ShoppingBag className="w-4 h-4" />,
      external: true,
    },
  ];

  // Hardware / device steps are optional — they don't count toward core progress
  const optionalSteps: OnboardingStep[] = [
    {
      id: 'counter',
      title: t.onboarding_openCounter,
      description: t.onboarding_openCounterDesc,
      completed: hasOpenedCounter,
      href: '/counter',
      icon: <Monitor className="w-4 h-4" />,
      external: true,
    },
    {
      id: 'printer',
      title: t.onboarding_configurePrinter,
      description: t.onboarding_configurePrinterDesc,
      completed: hasPrinterConfigured,
      href: '/app/settings#printer',
      icon: <Printer className="w-4 h-4" />,
    },
    {
      id: 'pwa',
      title: t.onboarding_installPWA,
      description: t.onboarding_installPWADesc,
      completed: hasInstalledPWA,
      href: '/app/settings#install',
      icon: <Smartphone className="w-4 h-4" />,
    },
  ];

  const completedCount = coreSteps.filter((s) => s.completed).length;
  const totalSteps = coreSteps.length;
  const allComplete = completedCount === totalSteps;
  const progress = (completedCount / totalSteps) * 100;
  // Allow dismissing once 4 of 6 core steps are done — no need to force all 6
  const canDismiss = completedCount >= 4 || allComplete;

  if (dismissed && allComplete) return null;

  const handleDismiss = () => {
    if (!canDismiss) return;
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  if (allComplete) {
    return (
      <div className="relative rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label={t.onboarding_close}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/[0.12] flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300">{t.onboarding_allComplete}</p>
            <p className="text-sm text-emerald-400/70 mt-0.5">
              {t.onboarding_allCompleteDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isNewUser = completedCount === 0;
  const nextStep = coreSteps.find((s) => !s.completed);
  const accentColor = isNewUser ? 'violet' : 'emerald';

  // CTA button that points to the next uncompleted step
  const NextStepLink = nextStep?.external ? 'a' : Link;
  const nextStepLinkProps = nextStep?.external
    ? { href: nextStep.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: nextStep?.href ?? '#' };
  const nextStepCTA = nextStep && !allComplete ? (
    <NextStepLink
      {...nextStepLinkProps as any}
      className={cn(
        'mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
        accentColor === 'violet'
          ? 'bg-violet-600 hover:bg-violet-700 text-white'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      )}
    >
      {nextStep.icon}
      {nextStep.title}
      <ChevronRight className="w-4 h-4 ml-auto" />
    </NextStepLink>
  ) : null;

  const renderStep = (step: OnboardingStep, i: number, list: OnboardingStep[], isOptional = false) => {
    const isNext = !isOptional && nextStep?.id === step.id;
    const LinkComponent = step.external ? 'a' : Link;
    const linkProps = step.external
      ? { href: step.href, target: '_blank', rel: 'noopener noreferrer' }
      : { href: step.href };
    const timeEst = !isOptional ? STEP_TIME[step.id] : undefined;

    return (
      <LinkComponent
        key={step.id}
        {...linkProps as any}
        className={cn(
          'flex items-center gap-3.5 px-5 py-3.5 transition-colors group',
          i < list.length - 1 && 'border-b border-gray-200',
          step.completed
            ? 'opacity-60'
            : isNext
              ? accentColor === 'violet' ? 'bg-violet-50' : 'bg-emerald-50'
              : 'hover:bg-gray-50'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
          step.completed
            ? 'bg-emerald-500/[0.12]'
            : isNext
              ? accentColor === 'violet' ? 'bg-violet-100' : 'bg-emerald-50'
              : 'bg-gray-50'
        )}>
          {step.completed ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <span className={cn(
              isNext
                ? accentColor === 'violet' ? 'text-violet-600' : 'text-emerald-600'
                : 'text-gray-600'
            )}>
              {step.icon}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              'text-sm font-medium',
              step.completed ? 'text-gray-500 line-through' : isNext ? 'text-gray-900 font-semibold' : 'text-gray-700'
            )}>
              {step.title}
            </p>
            {isNext && !isOptional && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0",
                accentColor === 'violet'
                  ? 'text-violet-700 bg-violet-100'
                  : 'text-emerald-700 bg-emerald-100'
              )}>
                {t.onboarding_next}
              </span>
            )}
            {isOptional && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {t.onboarding_optional}
              </span>
            )}
            {!step.completed && timeEst && (
              <span className="text-[10px] text-gray-400 flex-shrink-0">{timeEst}</span>
            )}
          </div>
          <p className={cn(
            'text-xs mt-0.5',
            step.completed ? 'text-gray-600' : 'text-gray-500'
          )}>
            {step.description}
          </p>
        </div>

        {!step.completed && (
          <ChevronRight className={cn(
            'w-4 h-4 flex-shrink-0 transition-all',
            isNext
              ? accentColor === 'violet'
                ? 'text-violet-600 group-hover:translate-x-0.5'
                : 'text-emerald-600 group-hover:translate-x-0.5'
              : 'text-gray-700 group-hover:text-gray-500 group-hover:translate-x-0.5'
          )} />
        )}
      </LinkComponent>
    );
  };

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isNewUser ? "border-violet-200 bg-white shadow-sm shadow-violet-100" : "border-gray-200 bg-white"
    )}>
      {/* Header */}
      <div className={cn("p-5 pb-4", isNewUser && "bg-gradient-to-br from-violet-50 to-white")}>
        {isNewUser && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide uppercase">
              <Sparkles className="w-3 h-3" /> {t.onboarding_firstSteps}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              isNewUser ? "bg-violet-100" : "bg-emerald-50"
            )}>
              <Sparkles className={cn("w-4.5 h-4.5", isNewUser ? "text-violet-600" : "text-emerald-600")} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">
                {isNewUser ? t.onboarding_setupTitle : t.onboarding_title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isNewUser
                  ? t.onboarding_setupSubtitle
                  : `${completedCount} ${t.onboarding_stepsOf} ${totalSteps}`}
              </p>
            </div>
          </div>
          {canDismiss && (
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={t.onboarding_hide}
              title={t.onboarding_hide}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isNewUser ? "bg-violet-500" : "bg-emerald-500"
            )}
            style={{ width: isNewUser ? '4%' : `${progress}%` }}
          />
        </div>
        {isNewUser && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            0 {t.onboarding_stepsOf} {totalSteps} {t.onboarding_progressLabel}
          </p>
        )}

        {/* Quick-start CTA — always visible, points to the next uncompleted step */}
        {nextStepCTA}
      </div>

      {/* Core steps */}
      <div className="border-t border-gray-200">
        {coreSteps.map((step, i) => renderStep(step, i, coreSteps))}
      </div>

      {/* Optional steps */}
      <div className="border-t border-gray-200 bg-gray-50/50">
        <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {t.onboarding_improveOps}
        </p>
        {optionalSteps.map((step, i) => renderStep(step, i, optionalSteps, true))}
      </div>
    </div>
  );
}
