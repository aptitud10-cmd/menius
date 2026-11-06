'use client';

import Link from 'next/link';
import { Zap, X, ArrowRight } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  /** What the user tried to do — used in the modal copy. */
  reason?: string;
  /**
   * Plan sugerido por quien abre el modal. Se ignora: desde 2026-11 hay un solo
   * plan a la venta (Pro). Se mantiene el prop para no tocar a los llamadores.
   */
  suggestedPlan?: 'starter' | 'pro' | 'business';
}

const PLAN = { name: 'Pro', price: '$79' };

export function UpgradePromptModal({ open, onClose, reason }: UpgradePromptModalProps) {
  const { locale } = useDashboardLocale();
  const isEn = locale === 'en';
  const plan = PLAN;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isEn ? 'Close' : 'Cerrar'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 mx-auto flex items-center justify-center mb-3">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isEn ? `Upgrade to ${plan.name}` : `Sube a ${plan.name}`}
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            {plan.price}
            <span className="opacity-70">{isEn ? '/mo' : '/mes'}</span>
          </p>
        </div>

        <div className="px-6 py-6">
          {reason && (
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {reason}
            </p>
          )}

          <div className="space-y-2 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {isEn ? `What you get with ${plan.name}` : `Lo que incluye ${plan.name}`}
            </p>
            {[
              isEn ? 'Pickup + Delivery' : 'Pickup + Delivery',
              isEn ? 'Online payments (0% MENIUS commission)' : 'Pagos online (0% comisión de MENIUS)',
              isEn ? 'Up to 50 tables with QR' : 'Hasta 50 mesas con QR',
              isEn ? 'Custom domain' : 'Dominio propio',
              isEn ? 'Kitchen KDS, loyalty and promotions' : 'Cocina KDS, lealtad y promociones',
              isEn ? 'No MENIUS branding' : 'Sin marca MENIUS',
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href="/app/billing?autoCheckout=pro"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            {isEn ? `Upgrade to ${plan.name}` : `Subir a ${plan.name}`}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isEn ? 'Maybe later' : 'Tal vez más tarde'}
          </button>
        </div>
      </div>
    </div>
  );
}
