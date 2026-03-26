'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, X, Check, AlertCircle, Loader2, ImageIcon, Zap } from 'lucide-react';
import { updateProduct } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Product, Category } from '@/types';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface BulkAIImageGenerateProps {
  products: Product[];
  categories: Category[];
  onComplete: (updated: Map<string, string>) => void;
  onClose: () => void;
}

type ItemStatus = 'pending' | 'generating' | 'done' | 'error';

interface ImageItem {
  product: Product;
  status: ItemStatus;
  resultUrl?: string;
  error?: string;
}

export function BulkAIImageGenerate({ products, categories, onComplete, onClose }: BulkAIImageGenerateProps) {
  const { t } = useDashboardLocale();
  const isEs = !t.products_new.toLowerCase().includes('new');

  const productsWithoutImages = products.filter(p => !p.image_url);

  const [items, setItems] = useState<ImageItem[]>(
    productsWithoutImages.map(p => ({ product: p, status: 'pending' })),
  );
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);
  const updatedRef = useRef(new Map<string, string>());

  const getCategoryName = (categoryId: string | null | undefined) =>
    categoryId ? categories.find(c => c.id === categoryId)?.name : undefined;

  const doneCount = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;

  const handleGenerate = async () => {
    setRunning(true);
    cancelRef.current = false;
    updatedRef.current = new Map();

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;
      if (items[i].status !== 'pending') continue;

      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'generating' } : it));

      try {
        const p = items[i].product;
        const res = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: p.name,
            description: p.description ?? '',
            category: getCategoryName(p.category_id),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || (isEs ? 'Error generando imagen' : 'Error generating image'));

        await updateProduct(p.id, { image_url: data.url });
        updatedRef.current.set(p.id, data.url);

        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'done', resultUrl: data.url } : it,
        ));
      } catch (err) {
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error', error: err instanceof Error ? err.message : 'Error' } : it,
        ));
      }

      if (i < items.length - 1 && !cancelRef.current) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setRunning(false);
    setFinished(true);
    onComplete(updatedRef.current);
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleRetryErrors = () => {
    setItems(prev => prev.map(it => it.status === 'error' ? { ...it, status: 'pending', error: undefined } : it));
    setFinished(false);
  };

  // Strings
  const S = {
    title:       isEs ? 'Generar imágenes con IA' : 'Generate images with AI',
    desc:        isEs ? 'Genera fotos profesionales para todos los productos sin imagen.' : 'Generate professional photos for all products without an image.',
    noProducts:  isEs ? 'Todos tus productos ya tienen imagen 🎉' : 'All your products already have an image 🎉',
    countLabel:  isEs ? `${productsWithoutImages.length} productos sin imagen` : `${productsWithoutImages.length} products without image`,
    rateNote:    isEs ? 'Límite: 20 imágenes por hora' : 'Limit: 20 images per hour',
    start:       isEs ? 'Generar todas' : 'Generate all',
    cancel:      isEs ? 'Cancelar' : 'Cancel',
    close:       isEs ? 'Cerrar' : 'Close',
    retryErrors: isEs ? 'Reintentar errores' : 'Retry errors',
    done:        isEs ? `${doneCount} generadas` : `${doneCount} generated`,
    errors:      isEs ? `${errorCount} con error` : `${errorCount} errors`,
    generating:  isEs ? 'Generando...' : 'Generating...',
    pending:     isEs ? 'Pendiente' : 'Pending',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="font-semibold text-gray-900">{S.title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {productsWithoutImages.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">{S.noProducts}</div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{S.desc}</p>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-4 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-600 font-medium">
                  {S.countLabel}
                </span>
                <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {S.rateNote}
                </span>
                {doneCount > 0 && (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium">
                    {S.done}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md font-medium">
                    {S.errors}
                  </span>
                )}
              </div>

              {/* Product list */}
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                      item.status === 'done'      && 'border-emerald-200 bg-emerald-50/50',
                      item.status === 'error'     && 'border-red-200 bg-red-50/50',
                      item.status === 'generating'&& 'border-purple-200 bg-purple-50/50',
                      item.status === 'pending'   && 'border-gray-200 bg-white',
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.resultUrl ? (
                        <Image src={item.resultUrl} alt={item.product.name} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                      {item.error && (
                        <p className="text-[11px] text-red-500 truncate">{item.error}</p>
                      )}
                    </div>

                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {item.status === 'generating' && (
                        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                      )}
                      {item.status === 'done' && (
                        <Check className="w-4 h-4 text-emerald-500" />
                      )}
                      {item.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {item.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {productsWithoutImages.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-400">
              {running
                ? `${doneCount + errorCount} / ${items.length}`
                : finished
                  ? `${doneCount} ✓  ${errorCount > 0 ? `· ${errorCount} ✗` : ''}`
                  : `${pendingCount} ${isEs ? 'pendientes' : 'pending'}`}
            </div>
            <div className="flex items-center gap-2">
              {finished && errorCount > 0 && (
                <button
                  onClick={handleRetryErrors}
                  className="px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                >
                  {S.retryErrors}
                </button>
              )}
              {running ? (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  {S.cancel}
                </button>
              ) : finished ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  {S.close}
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {S.cancel}
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {S.start}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {productsWithoutImages.length === 0 && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              {S.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
