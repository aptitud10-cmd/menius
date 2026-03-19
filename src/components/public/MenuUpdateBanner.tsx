'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

interface MenuUpdateBannerProps {
  restaurantId: string;
  locale?: string;
}

export function MenuUpdateBanner({ restaurantId, locale }: MenuUpdateBannerProps) {
  const router = useRouter();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const en = locale === 'en';

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`menu-updates:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurants', filter: `id=eq.${restaurantId}` },
        () => setHasUpdate(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `restaurant_id=eq.${restaurantId}` },
        () => setHasUpdate(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `restaurant_id=eq.${restaurantId}` },
        () => setHasUpdate(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setHasUpdate(false);
      setRefreshing(false);
    }, 1000);
  }, [router]);

  if (!hasUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] flex justify-center px-4 pt-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-900 text-white shadow-xl shadow-black/20 border border-white/10 text-sm font-medium animate-in slide-in-from-top-2 duration-300">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span>{en ? 'Menu updated' : 'Menú actualizado'}</span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          {en ? 'Reload' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
}
