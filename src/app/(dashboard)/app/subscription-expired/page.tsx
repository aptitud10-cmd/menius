'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CreditCard, ArrowRight, LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    desc: 'Menu digital, QR, pedidos online.',
    features: ['30 productos', '10 mesas', '1 usuario', 'Dine-in + Pickup'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    desc: 'Todo lo que necesitas para crecer.',
    popular: true,
    features: ['200 productos', '50 mesas', '3 usuarios', 'Delivery + WhatsApp + Analytics'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    desc: 'Para restaurantes grandes y cadenas.',
    features: ['Todo ilimitado', 'Dominio propio', 'Soporte dedicado'],
  },
];

export default function SubscriptionExpiredPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, interval: 'monthly' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(null);
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white/[0.04] flex items-center justify-center px-4">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/[0.1] mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-heading">
            Tu periodo de prueba ha terminado
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Para seguir usando MENIUS y recibir pedidos, elige un plan. Tu menú y tus datos están seguros y listos.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-5 flex flex-col ${
                plan.popular
                  ? 'bg-purple-950 text-white ring-2 ring-purple-400 shadow-xl'
                  : 'bg-[#0a0a0a] border border-white/[0.08]'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-purple-400 text-purple-950 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Recomendado
                </span>
              )}
              <h3 className={`text-base font-bold ${plan.popular ? 'text-white' : 'text-white'}`}>{plan.name}</h3>
              <p className={`text-xs mt-0.5 mb-3 ${plan.popular ? 'text-gray-300' : 'text-gray-400'}`}>{plan.desc}</p>
              <div className="mb-4">
                <span className={`text-3xl font-extrabold ${plan.popular ? 'text-white' : 'text-white'}`}>${plan.price}</span>
                <span className={`text-xs ${plan.popular ? 'text-gray-400' : 'text-gray-400'}`}> /mes</span>
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className={`text-xs flex items-center gap-1.5 ${plan.popular ? 'text-gray-200' : 'text-gray-400'}`}>
                    <span className={`w-1 h-1 rounded-full ${plan.popular ? 'bg-purple-400' : 'bg-purple-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-purple-400 text-purple-950 hover:bg-purple-300'
                    : 'bg-purple-500/[0.1] text-purple-400 hover:bg-white/[0.06]'
                }`}
              >
                {loading === plan.id ? (
                  'Redirigiendo...'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Suscribirse
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <div className="text-center space-y-3">
          <Link
            href="/app/billing"
            className="inline-flex items-center gap-1.5 text-sm text-purple-400 font-medium hover:underline"
          >
            Ver detalles de facturación <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <div>
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
