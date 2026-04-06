'use client';

import { useTransition, useState } from 'react';
import Image from 'next/image';
import { Store, TrendingUp, ShoppingBag, Activity, Plus, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchRestaurant } from '@/lib/actions/restaurant';
import { useRouter } from 'next/navigation';

interface BranchStat {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url: string | null;
  todayOrders: number;
  activeOrders: number;
  todayRevenue: number;
  currency: string;
}

interface Props {
  branches: BranchStat[];
  currentRestaurantId: string;
  locale: 'es' | 'en';
}

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount.toFixed(0)}`;
  }
}

export function BusinessOverview({ branches, currentRestaurantId, locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const isEn = locale === 'en';

  const totalRevenue = branches.reduce((s, b) => s + b.todayRevenue, 0);
  const totalOrders = branches.reduce((s, b) => s + b.todayOrders, 0);
  const totalActive = branches.reduce((s, b) => s + b.activeOrders, 0);

  const handleSwitch = (id: string) => {
    if (id === currentRestaurantId || isPending) return;
    setSwitchingId(id);
    startTransition(async () => {
      await switchRestaurant(id);
      router.push('/app');
      setSwitchingId(null);
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isEn ? 'Business Overview' : 'Resumen del Negocio'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEn
            ? `${branches.length} location${branches.length !== 1 ? 's' : ''} · Today's performance`
            : `${branches.length} sucursal${branches.length !== 1 ? 'es' : ''} · Rendimiento de hoy`}
        </p>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isEn ? "Today's Revenue" : 'Ingresos Hoy'}</p>
            <p className="text-xl font-bold text-gray-900">{fmt(totalRevenue, branches[0]?.currency ?? 'MXN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isEn ? "Today's Orders" : 'Órdenes Hoy'}</p>
            <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{isEn ? 'Active Orders' : 'Órdenes Activas'}</p>
            <p className="text-xl font-bold text-gray-900">{totalActive}</p>
            {totalActive > 0 && (
              <p className="text-[11px] text-amber-600 font-medium">{isEn ? 'In progress' : 'En proceso'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Branch cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{isEn ? 'Locations' : 'Sucursales'}</h2>
          <a
            href="/app/settings"
            className="text-xs font-semibold text-[#05c8a7] hover:underline flex items-center gap-1"
          >
            {isEn ? 'Manage' : 'Gestionar'}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(branch => (
            <div
              key={branch.id}
              className={cn(
                'bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md',
                branch.id === currentRestaurantId ? 'border-[#05c8a7] ring-1 ring-[#05c8a7]/20' : 'border-gray-200'
              )}
            >
              {/* Branch header */}
              <div className="flex items-center gap-3">
                {branch.logo_url ? (
                  <Image src={branch.logo_url} alt={branch.name} width={40} height={40} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" unoptimized />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-900 truncate">{branch.name}</p>
                    {!branch.is_active && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                        {isEn ? 'Inactive' : 'Inactivo'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">/{branch.slug}</p>
                </div>
                {branch.id === currentRestaurantId && (
                  <div className="w-6 h-6 rounded-full bg-[#05c8a7] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <p className="text-base font-bold text-gray-900">{branch.todayOrders}</p>
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">{isEn ? 'Orders' : 'Órdenes'}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                  <p className="text-base font-bold text-amber-700">{branch.activeOrders}</p>
                  <p className="text-[10px] text-amber-600 font-medium leading-tight">{isEn ? 'Active' : 'Activas'}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                  <p className="text-base font-bold text-emerald-700 text-[13px]">{fmt(branch.todayRevenue, branch.currency)}</p>
                  <p className="text-[10px] text-emerald-600 font-medium leading-tight">{isEn ? 'Revenue' : 'Ingresos'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {branch.id !== currentRestaurantId ? (
                  <button
                    onClick={() => handleSwitch(branch.id)}
                    disabled={isPending}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-[#05c8a7] hover:bg-[#04b096] transition-colors flex items-center justify-center gap-1.5"
                  >
                    {switchingId === branch.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      isEn ? 'Switch to this location' : 'Cambiar a esta sucursal'
                    )}
                  </button>
                ) : (
                  <a
                    href="/app"
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-[#05c8a7] bg-[#05c8a7]/10 hover:bg-[#05c8a7]/20 transition-colors text-center"
                  >
                    {isEn ? 'Go to dashboard' : 'Ir al dashboard'}
                  </a>
                )}
                <a
                  href={`/menu/${branch.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
                  title={isEn ? 'View menu' : 'Ver menú'}
                >
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}

          {/* Add branch card */}
          <a
            href="/app/settings#branches"
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 text-center hover:border-[#05c8a7] hover:bg-[#05c8a7]/5 transition-colors group min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-[#05c8a7]/10 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#05c8a7]" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 group-hover:text-[#05c8a7] transition-colors">
                {isEn ? 'Add location' : 'Agregar sucursal'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEn ? 'Expand your business' : 'Expande tu negocio'}
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
