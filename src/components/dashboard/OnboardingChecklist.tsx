'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, Camera, FileText, Clock, UtensilsCrossed, QrCode,
  ShoppingBag, X, ChevronRight, Sparkles, PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setDismissed(stored === 'true');
  }, [storageKey]);

  if (dismissed === null) return null;

  const allSteps: OnboardingStep[] = [
    {
      id: 'logo',
      title: 'Sube el logo de tu restaurante',
      description: 'Dale identidad visual a tu menú digital',
      completed: steps.hasLogo,
      href: '/app/settings',
      icon: <Camera className="w-4 h-4" />,
    },
    {
      id: 'profile',
      title: 'Completa tu perfil',
      description: 'Teléfono, dirección y descripción',
      completed: steps.hasProfile,
      href: '/app/settings',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'hours',
      title: 'Configura tu horario',
      description: 'Que tus clientes sepan cuándo estás abierto',
      completed: steps.hasHours,
      href: '/app/settings',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'menu',
      title: 'Personaliza tu menú',
      description: 'Agrega tus productos, precios y fotos',
      completed: steps.hasProducts,
      href: '/app/menu/products',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    {
      id: 'tables',
      title: 'Genera QR para tus mesas',
      description: 'Imprime y colócalos en cada mesa',
      completed: steps.hasTables,
      href: '/app/tables',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'orders',
      title: 'Recibe tu primer pedido',
      description: 'Comparte tu menú y empieza a vender',
      completed: steps.hasOrders,
      href: `/r/${restaurantSlug}`,
      icon: <ShoppingBag className="w-4 h-4" />,
      external: true,
    },
  ];

  const completedCount = allSteps.filter((s) => s.completed).length;
  const totalSteps = allSteps.length;
  const allComplete = completedCount === totalSteps;
  const progress = (completedCount / totalSteps) * 100;

  if (dismissed && !allComplete) return null;
  if (dismissed && allComplete) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  if (allComplete) {
    return (
      <div className="relative rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/[0.12] flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300">¡Tu restaurante está listo!</p>
            <p className="text-sm text-emerald-400/70 mt-0.5">
              Has completado todos los pasos. Tu menú digital está funcionando.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nextStep = allSteps.find((s) => !s.completed);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900">Configura tu restaurante</h3>
              <p className="text-xs text-gray-500 mt-0.5">{completedCount} de {totalSteps} pasos completados</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Ocultar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="border-t border-gray-200">
        {allSteps.map((step, i) => {
          const isNext = nextStep?.id === step.id;
          const LinkComponent = step.external ? 'a' : Link;
          const linkProps = step.external
            ? { href: step.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: step.href };

          return (
            <LinkComponent
              key={step.id}
              {...linkProps as any}
              className={cn(
                'flex items-center gap-3.5 px-5 py-3.5 transition-colors group',
                i < allSteps.length - 1 && 'border-b border-gray-200',
                step.completed
                  ? 'opacity-60'
                  : isNext
                    ? 'bg-emerald-50'
                    : 'hover:bg-gray-50'
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                step.completed
                  ? 'bg-emerald-500/[0.12]'
                  : isNext
                    ? 'bg-emerald-50'
                    : 'bg-gray-50'
              )}>
                {step.completed ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className={cn(
                    isNext ? 'text-emerald-600' : 'text-gray-600'
                  )}>
                    {step.icon}
                  </span>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  step.completed ? 'text-gray-500 line-through' : 'text-gray-700'
                )}>
                  {step.title}
                </p>
                <p className={cn(
                  'text-xs mt-0.5',
                  step.completed ? 'text-gray-600' : 'text-gray-500'
                )}>
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {!step.completed && (
                <ChevronRight className={cn(
                  'w-4 h-4 flex-shrink-0 transition-all',
                  isNext
                    ? 'text-emerald-600 group-hover:translate-x-0.5'
                    : 'text-gray-700 group-hover:text-gray-500 group-hover:translate-x-0.5'
                )} />
              )}
            </LinkComponent>
          );
        })}
      </div>
    </div>
  );
}
