'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Check, X, Sparkles, AlertTriangle, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { createCategory, createProduct, createVariant, createExtra, createModifierGroup, createModifierOption } from '@/lib/actions/restaurant';

interface ImportedVariant {
  name: string;
  price_delta: number;
  sort_order: number;
}

interface ImportedExtra {
  name: string;
  price: number;
  sort_order: number;
}

interface ImportedModOption {
  name: string;
  price_delta: number;
  sort_order: number;
}

interface ImportedModGroup {
  name: string;
  selection_type: 'single' | 'multi';
  is_required: boolean;
  sort_order: number;
  options: ImportedModOption[];
}

interface ImportedItem {
  category: string;
  name: string;
  description: string;
  price: number;
  variants: ImportedVariant[];
  extras: ImportedExtra[];
  modifier_groups: ImportedModGroup[];
  dietary: string[];
  selected: boolean;
}

interface MenuImportProps {
  existingCategories: { id: string; name: string }[];
  restaurantId: string;
  currency: string;
  onComplete: () => void;
  onClose: () => void;
}

const DIETARY_LABELS: Record<string, { label: string; color: string }> = {
  vegetarian: { label: 'Vegetariano', color: 'bg-green-100 text-green-700' },
  vegan: { label: 'Vegano', color: 'bg-emerald-100 text-emerald-700' },
  'gluten-free': { label: 'Sin Gluten', color: 'bg-amber-100 text-amber-700' },
  spicy: { label: 'Picante', color: 'bg-red-100 text-red-700' },
  popular: { label: 'Popular', color: 'bg-purple-100 text-purple-700' },
};

export function MenuImport({ existingCategories, currency, onComplete, onClose }: MenuImportProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'done'>('upload');
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error procesando la imagen');
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

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const hasDetails = (item: ImportedItem) =>
    item.variants.length > 0 || item.extras.length > 0 || item.modifier_groups.length > 0 || item.dietary.length > 0;

  const detailsSummary = (item: ImportedItem) => {
    const parts: string[] = [];
    if (item.variants.length > 0) parts.push(`${item.variants.length} variante${item.variants.length > 1 ? 's' : ''}`);
    if (item.extras.length > 0) parts.push(`${item.extras.length} extra${item.extras.length > 1 ? 's' : ''}`);
    if (item.modifier_groups.length > 0) parts.push(`${item.modifier_groups.length} grupo${item.modifier_groups.length > 1 ? 's' : ''}`);
    return parts.join(' · ');
  };

  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] as string[] });

  const handleImport = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setStep('importing');
    setProgress({ current: 0, total: selectedItems.length, label: '' });

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
          if (result && 'error' in result) {
            console.error(`Category "${catName}":`, result.error);
          } else if (result && 'id' in result && result.id) {
            categoryMap[catName.toLowerCase()] = result.id;
          }
        } catch (err) {
          console.error(`Category "${catName}" exception:`, err);
        }
      }
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    let processed = 0;

    for (const item of selectedItems) {
      processed++;
      setProgress({ current: processed, total: selectedItems.length, label: item.name });

      const catId = categoryMap[item.category.toLowerCase()];
      if (!catId) {
        failed++;
        errors.push(`${item.name}: categoría "${item.category}" no se pudo crear`);
        continue;
      }

      try {
        const productResult = await createProduct({
          name: item.name,
          description: item.description,
          price: item.price,
          category_id: catId,
          is_active: true,
          ...(item.dietary.length > 0 && { dietary_tags: item.dietary }),
        });

        if (productResult && 'error' in productResult) {
          failed++;
          errors.push(`${item.name}: ${productResult.error}`);
          continue;
        }

        const productId = productResult && 'id' in productResult
          ? (productResult.id as string)
          : null;

        if (!productId) {
          failed++;
          errors.push(`${item.name}: no se obtuvo ID del producto`);
          continue;
        }

        for (const v of item.variants) {
          await createVariant(productId, { name: v.name, price_delta: v.price_delta, sort_order: v.sort_order });
        }

        for (const e of item.extras) {
          await createExtra(productId, { name: e.name, price: e.price, sort_order: e.sort_order });
        }

        for (const mg of item.modifier_groups) {
          const groupResult = await createModifierGroup(productId, {
            name: mg.name,
            selection_type: mg.selection_type,
            min_select: mg.is_required ? 1 : 0,
            max_select: mg.selection_type === 'multi' ? mg.options.length : 1,
            is_required: mg.is_required,
            sort_order: mg.sort_order,
          });

          const groupId = groupResult && 'group' in groupResult
            ? (groupResult.group as { id: string })?.id
            : null;

          if (groupId) {
            for (const opt of mg.options) {
              await createModifierOption(groupId, {
                name: opt.name,
                price_delta: opt.price_delta,
                is_default: opt.sort_order === 0,
                sort_order: opt.sort_order,
              });
            }
          }
        }

        success++;
      } catch (err) {
        failed++;
        errors.push(`${item.name}: ${err instanceof Error ? err.message : 'error desconocido'}`);
      }
    }

    setImportResult({ success, failed, errors });
    setStep('done');
  };

  const selectedCount = items.filter((i) => i.selected).length;
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const totalVariants = items.filter((i) => i.selected).reduce((s, i) => s + i.variants.length, 0);
  const totalExtras = items.filter((i) => i.selected).reduce((s, i) => s + i.extras.length, 0);
  const totalGroups = items.filter((i) => i.selected).reduce((s, i) => s + i.modifier_groups.length, 0);
  const fmtPrice = (n: number) => n > 0 ? `${currency === 'USD' ? '$' : ''}${n.toFixed(2)}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importar menú con IA</h2>
              <p className="text-xs text-gray-500">
                {step === 'upload' && 'Sube una foto de tu menú'}
                {step === 'review' && `${items.length} productos · ${totalVariants} variantes · ${totalExtras} extras · ${totalGroups} grupos`}
                {step === 'importing' && `Importando ${progress.current}/${progress.total}...`}
                {step === 'done' && 'Importación completada'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
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
                    <p className="text-xs text-gray-500">Extrayendo productos, variantes, extras y modificadores</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Sube una foto de tu menú</p>
                      <p className="text-xs text-gray-500 mt-1">La IA detectará productos, precios, variantes, extras y modificadores</p>
                    </div>
                    <p className="text-[11px] text-gray-500">JPG, PNG, WebP · Máximo 10MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                <p className="text-xs font-semibold text-gray-700">La IA detecta automáticamente:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• <strong>Categorías</strong> — Desayunos, Entradas, Bebidas, Postres...</li>
                  <li>• <strong>Variantes</strong> — Chico/Grande, 4pcs/8pcs, tamaños</li>
                  <li>• <strong>Extras</strong> — +Guacamole, +Tocino, complementos opcionales</li>
                  <li>• <strong>Modificadores</strong> — Elige proteína, estilo de cocción, etc.</li>
                  <li>• <strong>Tags</strong> — Vegetariano, Vegano, Sin Gluten, Picante</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{selectedCount}</span> de {items.length} seleccionados
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
                    Todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 font-medium hover:text-gray-700">
                    Ninguno
                  </button>
                </div>
              </div>

              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{cat}</p>
                  <div className="space-y-2">
                    {items.filter((i) => i.category === cat).map((item) => {
                      const globalIdx = items.indexOf(item);
                      const expanded = expandedItems.has(globalIdx);
                      const details = hasDetails(item);
                      return (
                        <div
                          key={globalIdx}
                          className={`rounded-xl border transition-all ${
                            item.selected ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white opacity-50'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => toggleItem(globalIdx)}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              item.selected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                            }`}>
                              {item.selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                {item.dietary.map((d) => {
                                  const info = DIETARY_LABELS[d];
                                  return info ? (
                                    <span key={d} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${info.color}`}>
                                      {info.label}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                              )}
                              {details && (
                                <p className="text-[11px] text-emerald-600 mt-1">{detailsSummary(item)}</p>
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-700 flex-shrink-0">{fmtPrice(item.price)}</span>
                            {details && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(globalIdx); }}
                                className="p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
                              >
                                {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                              </button>
                            )}
                          </div>

                          {expanded && details && (
                            <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-100 mx-3">
                              {item.variants.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Variantes</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.variants.map((v, vi) => (
                                      <span key={vi} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                                        {v.name} {v.price_delta > 0 ? `+${v.price_delta.toFixed(2)}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.extras.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Extras</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.extras.map((e, ei) => (
                                      <span key={ei} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-lg">
                                        +{e.name} {e.price > 0 ? `$${e.price.toFixed(2)}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.modifier_groups.map((mg, mgi) => (
                                <div key={mgi} className="mt-2">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
                                    {mg.name} {mg.is_required && <span className="text-red-400">(requerido)</span>}
                                    {' · '}{mg.selection_type === 'single' ? 'elige 1' : 'elige varios'}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {mg.options.map((opt, oi) => (
                                      <span key={oi} className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-lg">
                                        {opt.name} {opt.price_delta > 0 ? `+${opt.price_delta.toFixed(2)}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Importando productos...</p>
                <p className="text-sm text-gray-500 mt-1">
                  {progress.current} de {progress.total} productos
                </p>
                {progress.label && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">{progress.label}</p>
                )}
              </div>
              <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                importResult.success > 0 ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                {importResult.success > 0
                  ? <Check className="w-8 h-8 text-emerald-600" />
                  : <AlertTriangle className="w-8 h-8 text-red-500" />
                }
              </div>
              <div className="text-center">
                {importResult.success > 0 ? (
                  <p className="text-lg font-bold text-gray-900">
                    ¡{importResult.success} producto{importResult.success !== 1 ? 's' : ''} importado{importResult.success !== 1 ? 's' : ''}!
                  </p>
                ) : (
                  <p className="text-lg font-bold text-red-600">
                    No se pudo importar ningún producto
                  </p>
                )}
                {importResult.failed > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {importResult.failed} producto{importResult.failed !== 1 ? 's' : ''} fallaron
                  </p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="w-full max-h-32 overflow-y-auto bg-red-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-600 mb-1">Errores:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500">• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          {step === 'review' && (
            <>
              <button onClick={() => { setStep('upload'); setItems([]); setPreview(null); setExpandedItems(new Set()); }} className="text-sm text-gray-500 hover:text-gray-700">
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
