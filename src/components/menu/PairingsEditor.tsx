'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Link2, X, Loader2, Search, Plus } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { Product } from '@/types';

interface Pairing {
  id: string;
  paired_id: string;
  sort_order: number;
}

interface Props {
  productId: string;
  restaurantId: string;
  allProducts: Product[];
}

export function PairingsEditor({ productId, restaurantId, allProducts }: Props) {
  const { locale } = useDashboardLocale();
  const isEn = locale === 'en';

  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pairedIds = useMemo(() => new Set(pairings.map((p) => p.paired_id)), [pairings]);
  const eligibleProducts = useMemo(
    () => allProducts.filter((p) => p.id !== productId && !pairedIds.has(p.id)),
    [allProducts, productId, pairedIds],
  );
  const filteredProducts = useMemo(
    () =>
      search
        ? eligibleProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        : eligibleProducts,
    [eligibleProducts, search],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase
      .from('product_pairings')
      .select('id, paired_id, sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });
    if (error) {
      setErrorMsg(
        isEn
          ? 'Could not load pairings. Make sure the product_pairings table exists in Supabase (run supabase/migration-suggestions.sql).'
          : 'No se pudieron cargar las sugerencias. Asegúrate de haber ejecutado supabase/migration-suggestions.sql en Supabase.',
      );
    } else {
      setPairings((data as Pairing[]) ?? []);
    }
    setLoading(false);
  }, [productId, isEn]);

  useEffect(() => { load(); }, [load]);

  const addPairing = async (paired: Product) => {
    const supabase = getSupabaseBrowser();
    setSaving(true);
    setErrorMsg(null);
    const nextOrder = pairings.length;
    const { data, error } = await supabase
      .from('product_pairings')
      .insert({ product_id: productId, paired_id: paired.id, restaurant_id: restaurantId, sort_order: nextOrder })
      .select('id, paired_id, sort_order')
      .single();
    if (error) {
      setErrorMsg(
        isEn
          ? 'Could not save pairing. Make sure the product_pairings table exists in Supabase.'
          : 'No se pudo guardar. Verifica que la tabla product_pairings exista en Supabase.',
      );
    } else if (data) {
      setPairings((prev) => [...prev, data as Pairing]);
      setSearch('');
      setShowPicker(false);
    }
    setSaving(false);
  };

  const removePairing = async (pairingId: string) => {
    const supabase = getSupabaseBrowser();
    setSaving(true);
    setErrorMsg(null);
    const { error } = await supabase.from('product_pairings').delete().eq('id', pairingId);
    if (error) {
      setErrorMsg(isEn ? 'Could not remove pairing.' : 'No se pudo eliminar la sugerencia.');
    } else {
      setPairings((prev) => prev.filter((p) => p.id !== pairingId));
    }
    setSaving(false);
  };

  const productMap = useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-900">
          {isEn ? 'Manual Pairings' : 'Sugerencias manuales'}
        </h2>
        {saving && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin ml-auto" />}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {isEn
          ? 'Pin specific products to always appear as suggestions when customers view this item.'
          : 'Fija productos específicos para que aparezcan como sugerencias cuando el cliente vea este artículo.'}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isEn ? 'Loading…' : 'Cargando…'}
        </div>
      ) : (
        <>
          {/* Current pairings */}
          {pairings.length > 0 && (
            <div className="space-y-2 mb-4">
              {pairings.map((pairing) => {
                const p = productMap.get(pairing.paired_id);
                if (!p) return null;
                return (
                  <div
                    key={pairing.id}
                    className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                  >
                    {p.image_url ? (
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          className="object-cover"
                          unoptimized={p.image_url.includes('.supabase.co/storage/')}
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePairing(pairing.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add button / picker */}
          {pairings.length < 6 && (
            <>
              {showPicker ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={isEn ? 'Search products…' : 'Buscar productos…'}
                      className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowPicker(false); setSearch(''); }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 px-3 py-3 text-center">
                        {isEn ? 'No products found' : 'Sin resultados'}
                      </p>
                    ) : (
                      filteredProducts.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addPairing(p)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left',
                            'border-b border-gray-50 last:border-0'
                          )}
                        >
                          {p.image_url ? (
                            <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                              <Image
                                src={p.image_url}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized={p.image_url.includes('.supabase.co/storage/')}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-gray-200 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-900 truncate">{p.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium py-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isEn ? 'Add pairing' : 'Agregar sugerencia'}
                </button>
              )}
            </>
          )}

          {pairings.length === 0 && !showPicker && (
            <p className="text-xs text-gray-400 mt-2">
              {isEn
                ? 'No pairings yet. Add products that go well with this item.'
                : 'Sin sugerencias aún. Agrega productos que combinen bien con este artículo.'}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs text-red-500 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </>
      )}
    </div>
  );
}
