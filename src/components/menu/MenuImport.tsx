'use client';

import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, Check, X, Sparkles, AlertTriangle, Plus } from 'lucide-react';
import { createCategory, createProduct } from '@/lib/actions/restaurant';

interface ImportedItem {
  category: string;
  name: string;
  description: string;
  price: number;
  selected: boolean;
}

interface MenuImportProps {
  existingCategories: { id: string; name: string }[];
  restaurantId: string;
  currency: string;
  onComplete: () => void;
  onClose: () => void;
}

export function MenuImport({ existingCategories, currency, onComplete, onClose }: MenuImportProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'done'>('upload');
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/ai/import-menu', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error procesando imagen');

      setItems(data.items.map((item: Omit<ImportedItem, 'selected'>) => ({ ...item, selected: true })));
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Error procesando la imagen');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  };

  const toggleItem = (index: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = (selected: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  const handleImport = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setStep('importing');
    setProgress({ current: 0, total: selectedItems.length });

    const categoryMap: Record<string, string> = {};
    for (const cat of existingCategories) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    }

    const uniqueCategories = Array.from(new Set(selectedItems.map((i) => i.category)));
    for (const catName of uniqueCategories) {
      if (!categoryMap[catName.toLowerCase()]) {
        try {
          const result = await createCategory({
            name: catName,
            sort_order: Object.keys(categoryMap).length,
            is_active: true,
          });
          if (result && 'id' in result && result.id) {
            categoryMap[catName.toLowerCase()] = result.id;
          }
        } catch {
          // Category might already exist
        }
      }
    }

    let imported = 0;
    for (const item of selectedItems) {
      try {
        const catId = categoryMap[item.category.toLowerCase()];
        if (catId) {
          await createProduct({
            name: item.name,
            description: item.description,
            price: item.price,
            category_id: catId,
            is_active: true,
          });
        }
        imported++;
        setProgress({ current: imported, total: selectedItems.length });
      } catch {
        // Continue with next item
      }
    }

    setStep('done');
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importar menú con IA</h2>
              <p className="text-xs text-gray-500">
                {step === 'upload' && 'Sube una foto de tu menú'}
                {step === 'review' && `${items.length} productos encontrados`}
                {step === 'importing' && `Importando ${progress.current}/${progress.total}...`}
                {step === 'done' && 'Importación completada'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-emerald-500/30 hover:bg-emerald-50 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                    <p className="text-sm text-gray-500 font-medium">Analizando menú con IA...</p>
                    <p className="text-xs text-gray-500">Esto puede tomar 10-20 segundos</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Sube una foto de tu menú</p>
                      <p className="text-xs text-gray-500 mt-1">Arrastra una imagen o haz clic para seleccionar</p>
                    </div>
                    <p className="text-[11px] text-gray-500">JPG, PNG, WebP • Máximo 10MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {preview && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-gray-50" />
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15]">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">{error}</p>
                    <p className="text-xs text-red-400/70 mt-1">Asegúrate de que la foto sea clara y legible.</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Tips para mejores resultados:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Foto bien iluminada y enfocada</li>
                  <li>• Menú completo visible en una sola imagen</li>
                  <li>• Texto legible (no borroso ni cortado)</li>
                  <li>• Funciona con menús en español e inglés</li>
                </ul>
              </div>
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{selectedCount}</span> de {items.length} productos seleccionados
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-emerald-600 font-medium hover:text-emerald-600">
                    Seleccionar todos
                  </button>
                  <span className="text-gray-700">|</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 font-medium hover:text-gray-700">
                    Deseleccionar
                  </button>
                </div>
              </div>

              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{cat}</p>
                  <div className="space-y-2">
                    {items.filter((i) => i.category === cat).map((item, idx) => {
                      const globalIdx = items.indexOf(item);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleItem(globalIdx)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            item.selected
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-gray-200 bg-white opacity-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.selected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                          }`}>
                            {item.selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-700 flex-shrink-0">
                            {item.price > 0 ? `${currency === 'USD' ? '$' : ''}${item.price.toFixed(2)}` : '—'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Importing step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  Importando productos...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {progress.current} de {progress.total} productos
                </p>
              </div>
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  ¡{progress.current} productos importados!
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Tu menú ha sido actualizado exitosamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {step === 'review' && (
            <>
              <button onClick={() => { setStep('upload'); setItems([]); setPreview(null); }} className="text-sm text-gray-500 hover:text-gray-700">
                ← Otra foto
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Importar {selectedCount} productos
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors"
            >
              Ver productos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
