'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { ChevronDown, Check, Plus, Store, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { switchRestaurant } from '@/lib/actions/restaurant';
import { useRouter } from 'next/navigation';

interface Branch {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface Props {
  currentRestaurantId: string;
  currentName: string;
  isEn: boolean;
}

export function RestaurantSwitcher({ currentRestaurantId, currentName, isEn }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lazy-load branches on first open
  useEffect(() => {
    if (!open || loaded) return;
    fetch('/api/tenant/branches')
      .then(r => r.json())
      .then(data => { setBranches(data.branches ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [open, loaded]);

  const handleSwitch = (id: string) => {
    if (id === currentRestaurantId || isPending) return;
    setSwitchingId(id);
    startTransition(async () => {
      const result = await switchRestaurant(id);
      if (result.error) {
        setSwitchingId(null);
        return;
      }
      setOpen(false);
      router.refresh();
      setSwitchingId(null);
    });
  };

  if (branches.length <= 1 && loaded) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
          open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        )}
      >
        <Store className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[100px] truncate">{currentName}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden py-1">
          {!loaded ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {isEn ? 'Your locations' : 'Tus sucursales'}
              </p>
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSwitch(b.id)}
                  disabled={isPending}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left',
                    b.id === currentRestaurantId
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {switchingId === b.id ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  ) : b.id === currentRestaurantId ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate font-medium">{b.name}</span>
                  {!b.is_active && (
                    <span className="text-[10px] text-gray-400">{isEn ? 'Inactive' : 'Inactivo'}</span>
                  )}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-1 pt-1">
                <a
                  href="/app/business"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>{isEn ? 'Business overview' : 'Resumen del negocio'}</span>
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
