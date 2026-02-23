'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X, Upload, ImagePlus, Check, AlertCircle, Loader2,
  Link2, Unlink, ChevronDown,
} from 'lucide-react';
import { updateProduct } from '@/lib/actions/restaurant';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface BulkImageUploadProps {
  products: Product[];
  onComplete: (updated: Map<string, string>) => void;
  onClose: () => void;
}

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  matchedProductId: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  resultUrl?: string;
  error?: string;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findBestMatch(fileName: string, products: Product[]): string | null {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const normalized = normalizeForMatch(baseName);
  if (!normalized) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const p of products) {
    const pNorm = normalizeForMatch(p.name);
    if (!pNorm) continue;

    if (pNorm === normalized) return p.id;

    if (normalized.includes(pNorm) || pNorm.includes(normalized)) {
      const score = Math.min(pNorm.length, normalized.length) / Math.max(pNorm.length, normalized.length);
      if (score > bestScore && score > 0.4) {
        bestScore = score;
        bestId = p.id;
      }
    }
  }

  return bestId;
}

export function BulkImageUpload({ products, onComplete, onClose }: BulkImageUploadProps) {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const productsWithoutImage = products.filter((p) => !p.image_url);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newEntries: ImageEntry[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) continue;

        const matchedProductId = findBestMatch(file.name, products);

        newEntries.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
          matchedProductId,
          status: 'pending',
          progress: 0,
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
    },
    [products],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  };

  const setMatch = (entryId: string, productId: string | null) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, matchedProductId: productId } : e)),
    );
  };

  const uploadAll = async () => {
    const toUpload = entries.filter((e) => e.status === 'pending' && e.matchedProductId);
    if (toUpload.length === 0) return;

    setUploading(true);
    setDoneCount(0);
    const updatedMap = new Map<string, string>();

    const CONCURRENT = 3;
    let idx = 0;

    const processNext = async (): Promise<void> => {
      while (idx < toUpload.length) {
        const current = idx++;
        const entry = toUpload[current];

        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading', progress: 30 } : e)),
        );

        try {
          const fd = new FormData();
          fd.append('file', entry.file);
          const res = await fetch('/api/tenant/upload', { method: 'POST', body: fd });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || 'Upload failed');

          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, progress: 80 } : e)),
          );

          await updateProduct(entry.matchedProductId!, { image_url: data.url });

          updatedMap.set(entry.matchedProductId!, data.url);

          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id ? { ...e, status: 'done', progress: 100, resultUrl: data.url } : e,
            ),
          );
          setDoneCount((c) => c + 1);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error';
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, status: 'error', error: message } : e)),
          );
          setDoneCount((c) => c + 1);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENT }, () => processNext()));

    setUploading(false);
    if (updatedMap.size > 0) {
      onComplete(updatedMap);
    }
  };

  const matched = entries.filter((e) => e.matchedProductId);
  const unmatched = entries.filter((e) => !e.matchedProductId);
  const allDone = entries.length > 0 && entries.every((e) => e.status === 'done' || e.status === 'error');

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        style={{ animation: 'fadeIn 0.15s ease-out both' }}
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[560px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ImagePlus className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[15px] text-gray-900">Subir imágenes en lote</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {entries.length === 0
                  ? `${productsWithoutImage.length} productos sin imagen`
                  : `${matched.length} vinculadas · ${unmatched.length} sin vincular`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50',
            )}
          >
            <Upload className={cn('w-8 h-8 mx-auto mb-2', isDragging ? 'text-indigo-500' : 'text-gray-300')} />
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, WebP · Máx 10MB cada una · Se comprimen automáticamente a WebP
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* Tip */}
          {entries.length === 0 && productsWithoutImage.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs text-amber-700">
                <strong>Tip:</strong> Nombra tus archivos igual que tus productos (ej: &ldquo;Huevos Rancheros.jpg&rdquo;)
                y se vincularán automáticamente.
              </p>
            </div>
          )}

          {/* Entries list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  products={products}
                  onRemove={() => removeEntry(entry.id)}
                  onMatch={(pid) => setMatch(entry.id, pid)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500">
            {uploading && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {doneCount}/{matched.length} procesadas
              </span>
            )}
            {allDone && (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                ¡Listo! Imágenes subidas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="dash-btn-secondary">
              {allDone ? 'Cerrar' : 'Cancelar'}
            </button>
            {!allDone && (
              <button
                onClick={uploadAll}
                disabled={uploading || matched.length === 0}
                className="dash-btn-primary disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Subir {matched.length} {matched.length === 1 ? 'imagen' : 'imágenes'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Entry Row ─── */

function EntryRow({
  entry,
  products,
  onRemove,
  onMatch,
}: {
  entry: ImageEntry;
  products: Product[];
  onRemove: () => void;
  onMatch: (pid: string | null) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const matchedProduct = entry.matchedProductId
    ? products.find((p) => p.id === entry.matchedProductId)
    : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all',
        entry.status === 'done'
          ? 'border-emerald-200 bg-emerald-50/30'
          : entry.status === 'error'
            ? 'border-red-200 bg-red-50/30'
            : entry.status === 'uploading'
              ? 'border-indigo-200 bg-indigo-50/30'
              : entry.matchedProductId
                ? 'border-gray-200 bg-white'
                : 'border-amber-200 bg-amber-50/20',
      )}
    >
      {/* Preview */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        <Image src={entry.preview} alt="" fill sizes="48px" className="object-cover" />
        {entry.status === 'uploading' && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}
        {entry.status === 'done' && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
        )}
        {entry.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{entry.file.name}</p>
        <p className="text-[11px] text-gray-400">
          {(entry.file.size / 1024).toFixed(0)} KB
          {entry.status === 'error' && entry.error && (
            <span className="text-red-500 ml-1">· {entry.error}</span>
          )}
        </p>

        {/* Progress bar */}
        {entry.status === 'uploading' && (
          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${entry.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Match selector */}
      {entry.status === 'pending' && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors max-w-[150px]',
              matchedProduct
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100',
            )}
          >
            {matchedProduct ? (
              <><Link2 className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{matchedProduct.name}</span></>
            ) : (
              <><Unlink className="w-3 h-3 flex-shrink-0" /> Vincular</>
            )}
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-50" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-60 overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-xl">
                {matchedProduct && (
                  <button
                    onClick={() => { onMatch(null); setShowDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="w-3 h-3" /> Desvincular
                  </button>
                )}
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onMatch(p.id); setShowDropdown(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left',
                      p.id === entry.matchedProductId ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700',
                    )}
                  >
                    {p.image_url ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image src={p.image_url} alt="" fill sizes="24px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded bg-gray-100 flex-shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                    {!p.image_url && (
                      <span className="ml-auto text-[9px] text-amber-500 font-medium flex-shrink-0">sin foto</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Done badge */}
      {entry.status === 'done' && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium flex-shrink-0">
          <Check className="w-3.5 h-3.5" /> Subida
        </span>
      )}

      {/* Remove */}
      {(entry.status === 'pending' || entry.status === 'error') && (
        <button onClick={onRemove} className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
