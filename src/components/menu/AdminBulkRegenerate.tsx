'use client';

import { useState, useRef } from 'react';
import { X, Zap, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  restaurantId: string;
  onClose: () => void;
}

interface Progress {
  total: number;
  processed: number;
  generated: number;
  failed: number;
  currentBatch: string;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

export function AdminBulkRegenerate({ restaurantId, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const handleStart = async () => {
    setPhase('running');
    setErrorMsg('');
    setProgress(null);

    try {
      const response = await fetch('/api/admin/regenerate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => 'Error desconocido');
        setErrorMsg(text);
        setPhase('error');
        return;
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'start') {
              setProgress({ total: event.total, processed: 0, generated: 0, failed: 0, currentBatch: '' });
            } else if (event.type === 'progress') {
              setProgress({
                total: event.total,
                processed: event.processed,
                generated: event.generated,
                failed: event.failed,
                currentBatch: event.currentBatch ?? '',
              });
            } else if (event.type === 'done') {
              setProgress({
                total: event.total,
                processed: event.processed,
                generated: event.generated,
                failed: event.failed,
                currentBatch: '',
              });
              setPhase('done');
            } else if (event.type === 'error') {
              setErrorMsg(event.message ?? 'Error desconocido');
              setPhase('error');
            }
          } catch {
            // malformed event, skip
          }
        }
      }

      if (phase === 'running') setPhase('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error de conexión');
      setPhase('error');
    }
  };

  const handleCancel = () => {
    readerRef.current?.cancel().catch(() => {});
    onClose();
  };

  const pct = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-gray-900">Regeneración masiva — Admin</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Idle state */}
          {phase === 'idle' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">¿Qué hace esto?</p>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>Regenera las imágenes de <strong>todos los productos activos</strong> del restaurante</li>
                  <li>Usa <strong>Imagen 4</strong> directamente — sin límite de rate</li>
                  <li>Batches de 5 productos en paralelo</li>
                  <li>Respeta el sistema de <strong>anchors de estilo</strong> por categoría</li>
                  <li>Las imágenes anteriores son reemplazadas en la base de datos</li>
                </ul>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Este proceso puede tomar varios minutos dependiendo del número de productos.
              </p>
            </div>
          )}

          {/* Running / progress state */}
          {(phase === 'running' || phase === 'done') && progress && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-600">
                    {phase === 'done' ? 'Completado' : 'Procesando...'}
                  </span>
                  <span className="text-xs font-bold text-gray-700">{pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{progress.processed}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">de {progress.total}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-xl font-bold text-emerald-700">{progress.generated}</p>
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-0.5">generadas</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <p className="text-xl font-bold text-red-600">{progress.failed}</p>
                  </div>
                  <p className="text-[11px] text-red-500 mt-0.5">fallidas</p>
                </div>
              </div>

              {/* Current batch */}
              {phase === 'running' && progress.currentBatch && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-purple-50 rounded-xl border border-purple-100">
                  <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700 leading-relaxed truncate">
                    {progress.currentBatch}
                  </p>
                </div>
              )}

              {/* Done banner */}
              {phase === 'done' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-emerald-800">
                    ¡Listo! {progress.generated} imágenes generadas.
                    {progress.failed > 0 && ` ${progress.failed} fallaron.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {phase === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Iniciar regeneración
              </button>
            </>
          )}
          {phase === 'running' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cerrar (continúa en bg)
            </button>
          )}
          {(phase === 'done' || phase === 'error') && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
