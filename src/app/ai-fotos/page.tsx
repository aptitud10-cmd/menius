'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload, Sparkles, Wand2, FileText, ArrowRight, Check, Copy,
  Loader2, X, Download, ChevronRight, Star, Zap, Shield, RefreshCw,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Mode = 'enhance' | 'generate' | 'describe';

const STYLES = [
  {
    id: 'dark_moody',
    label: 'Oscuro & Dramático',
    desc: 'Fine dining, fondo oscuro',
    thumb: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'bright_airy',
    label: 'Luminoso & Fresco',
    desc: 'Fondo blanco, luz natural',
    thumb: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'natural',
    label: 'Luz Natural',
    desc: 'Ambiente cálido de restaurante',
    thumb: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    desc: 'Estilo revista Michelin',
    thumb: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop&q=80',
  },
  {
    id: 'delivery',
    label: 'Para Delivery',
    desc: 'Optimizado para apps',
    thumb: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop&q=80',
  },
];

const CUISINES = [
  'General', 'Mexicana', 'Colombiana', 'Peruana', 'Argentina',
  'Italiana', 'Americana', 'Venezolana', 'Brasileña',
];

const PRICING_PLANS = [
  {
    name: 'Free',
    price: 0,
    desc: 'Empieza sin costo',
    features: ['Generación de fotos con IA', 'Importar menú desde foto', 'Todos los estilos visuales', 'Sin marca de agua'],
    cta: 'Empezar gratis',
    href: '/signup',
  },
  {
    name: 'Starter',
    price: 39,
    desc: 'Para restaurantes en crecimiento',
    features: ['Todo lo del plan Free', 'Pagos online (0% comisión)', 'Notificaciones push', 'Soporte por chat'],
    cta: 'Elegir Starter',
    href: '/signup',
    popular: true,
  },
  {
    name: 'Pro',
    price: 79,
    desc: 'Para operaciones completas',
    features: ['Todo lo de Starter', 'Programa de lealtad', 'Marketing Hub + automatizaciones', 'Chat prioritario 24h'],
    cta: 'Elegir Pro',
    href: '/signup',
  },
];

/* ─── Before/After Slider ────────────────────────────────────────────────── */
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      updatePos('touches' in e ? e.touches[0].clientX : e.clientX);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, [updatePos]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden select-none cursor-ew-resize shadow-xl"
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; updatePos(e.touches[0].clientX); }}
    >
      <Image src={after} alt="Mejorado" fill className="object-cover" unoptimized />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt="Original" fill className="object-cover" unoptimized />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 9H12M6 9L4 7M6 9L4 11M12 9L14 7M12 9L14 11" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-widest text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">Antes</span>
      <span className="absolute top-3 right-3 text-[11px] font-bold uppercase tracking-widest text-white bg-orange-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">Después</span>
    </div>
  );
}

/* ─── Drop Zone ──────────────────────────────────────────────────────────── */
function DropZone({ onFile, preview, loading }: { onFile: (f: File) => void; preview: string | null; loading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) onFile(f);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !loading && inputRef.current?.click()}
      className={`relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden
        ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50'}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {preview ? (
        <>
          <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
                <p className="text-sm font-semibold text-white">Procesando con IA…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 text-white" />
                <p className="text-sm font-semibold text-white">Cambiar foto</p>
              </div>
            )}
          </div>
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white">IA procesando…</p>
              <p className="text-xs text-white/60">Puede tomar hasta 30 segundos</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center">
            <Upload className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">Arrastra tu foto aquí</p>
            <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionar</p>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, WEBP — máx 10 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AIFotosPage() {
  const [mode, setMode] = useState<Mode>('enhance');
  const [style, setStyle] = useState('editorial');
  const [cuisine, setCuisine] = useState('General');
  const [dishName, setDishName] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ url: string; originalUrl?: string; engine?: string } | null>(null);
  const [description, setDescription] = useState<{
    name: string; shortDesc: string; longDesc: string; ingredients: string[]; tags: string[];
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setDescription(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('style', style);
      const res = await fetch('/api/ai/enhance', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al mejorar imagen');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [file, style]);

  const handleGenerate = useCallback(async () => {
    if (!dishName.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: dishName.trim(), cuisine, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al generar imagen');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [dishName, cuisine, style]);

  const handleDescribe = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null); setDescription(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('locale', 'es');
      const res = await fetch('/api/ai/describe', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al describir imagen');
      setDescription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [file]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const canRun = mode === 'generate' ? dishName.trim().length > 0 : !!file;
  const runAction = mode === 'enhance' ? handleEnhance : mode === 'generate' ? handleGenerate : handleDescribe;

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-gray-900">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-black tracking-tighter text-gray-900">MENIUS</span>
            <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-widest">IA Fotos</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition-colors">
              Empezar gratis <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">IA especializada en fotografía gastronómica</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] text-gray-900 mb-4">
            Fotos de menú que{' '}
            <span className="relative">
              <span className="relative z-10 text-orange-500">venden más</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-orange-100 -z-0 rounded" />
            </span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            Transforma cualquier foto de celular en imagen de revista.
            Sin fotógrafo. Sin estudio. En 30 segundos.
          </p>
          <div className="flex items-center justify-center gap-10 text-center">
            {[
              { value: '+35%', label: 'más pedidos' },
              { value: '30s', label: 'por imagen' },
              { value: '95%', label: 'más barato' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo before/after */}
        <div className="max-w-2xl mx-auto mb-4">
          <BeforeAfterSlider
            before="https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&h=600&fit=crop&q=60&sat=-80"
            after="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop&q=90"
          />
          <p className="text-center text-xs text-gray-400 mt-2">← Arrastra para comparar · Ejemplo de transformación IA</p>
        </div>
      </section>

      {/* ── Tool ── */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">

          {/* Mode tabs */}
          <div className="flex gap-1 mb-8 bg-gray-100 rounded-2xl p-1.5 max-w-lg mx-auto">
            {([
              { id: 'enhance', icon: Wand2, label: 'Mejorar foto' },
              { id: 'generate', icon: Sparkles, label: 'Crear desde cero' },
              { id: 'describe', icon: FileText, label: 'Descripción IA' },
            ] as { id: Mode; icon: React.ElementType; label: string }[]).map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setDescription(null); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${mode === m.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <m.icon className="w-4 h-4" />
                <span className="hidden sm:block">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 items-start">

            {/* LEFT: Input */}
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {mode === 'enhance' ? 'Paso 1 — Sube tu foto' : mode === 'generate' ? 'Paso 1 — Nombre del plato' : 'Paso 1 — Sube tu foto'}
                </p>
                {(mode === 'enhance' || mode === 'describe') && (
                  <DropZone onFile={handleFile} preview={preview} loading={loading} />
                )}
                {mode === 'generate' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={dishName}
                      onChange={e => setDishName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && canRun && !loading && runAction()}
                      placeholder="Tacos al pastor, Burger BBQ, Ceviche..."
                      className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all bg-white"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tipo de cocina</p>
                      <div className="flex flex-wrap gap-2">
                        {CUISINES.map(c => (
                          <button
                            key={c}
                            onClick={() => setCuisine(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                              ${cuisine === c ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Style picker */}
              {(mode === 'enhance' || mode === 'generate') && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    {mode === 'enhance' ? 'Paso 2 — Elige el estilo' : 'Paso 2 — Estilo fotográfico'}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`relative rounded-xl overflow-hidden transition-all aspect-square border-2
                          ${style === s.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-transparent hover:border-gray-200'}`}
                      >
                        <Image src={s.thumb} alt={s.label} fill className="object-cover" unoptimized />
                        <div className={`absolute inset-0 transition-all ${style === s.id ? 'bg-orange-500/20' : 'bg-black/20 hover:bg-black/10'}`} />
                        {style === s.id && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-[9px] font-bold text-white leading-tight">{s.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {STYLES.find(s => s.id === style)?.desc}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* CTA button */}
              <button
                onClick={runAction}
                disabled={loading || !canRun}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-all active:scale-[0.98] shadow-lg shadow-orange-200"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Procesando con IA…</>
                ) : mode === 'enhance' ? (
                  <><Wand2 className="w-5 h-5" /> Mejorar foto</>
                ) : mode === 'generate' ? (
                  <><Sparkles className="w-5 h-5" /> Generar imagen</>
                ) : (
                  <><FileText className="w-5 h-5" /> Generar descripción</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                {mode === 'enhance' ? '3 mejoras gratis por hora · Sin registro requerido' :
                 mode === 'generate' ? '2 generaciones gratis por hora · Sin registro' :
                 'Gratis · Sin registro'}
              </p>
            </div>

            {/* RIGHT: Result */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {(result || description) ? 'Resultado' : 'Vista previa del resultado'}
              </p>

              {/* Enhance result */}
              {mode === 'enhance' && result && preview && (
                <div className="space-y-4">
                  <BeforeAfterSlider before={preview} after={result.url} />
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={result.url}
                      download="foto-mejorada-menius.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 h-12 rounded-xl bg-gray-900 hover:bg-gray-700 text-sm font-bold text-white transition-all"
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </a>
                    <Link
                      href="/app/menu/products"
                      className="flex items-center justify-center gap-2 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition-all"
                    >
                      Aplicar al menú <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  {result.engine && (
                    <p className="text-center text-[10px] text-gray-400 uppercase tracking-wider">
                      Motor: {result.engine === 'fal-ai' ? 'FLUX.2 Pro' : 'Gemini Imagen 4'}
                    </p>
                  )}
                </div>
              )}

              {/* Generate result */}
              {mode === 'generate' && result && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
                    <Image src={result.url} alt={dishName} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <p className="absolute bottom-4 left-4 text-base font-bold text-white">{dishName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={result.url}
                      download={`${dishName}-menius.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 h-12 rounded-xl bg-gray-900 hover:bg-gray-700 text-sm font-bold text-white transition-all"
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </a>
                    <Link
                      href="/app/menu/products/new"
                      className="flex items-center justify-center gap-2 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition-all"
                    >
                      Agregar al menú <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Describe result */}
              {mode === 'describe' && description && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 bg-white">
                    <h3 className="text-sm font-bold text-gray-900">Descripción generada por IA</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <DescField label="Nombre del plato" value={description.name} onCopy={() => copy(description.name, 'name')} copied={copied === 'name'} />
                    <DescField label="Descripción corta (menú)" value={description.shortDesc} onCopy={() => copy(description.shortDesc, 'short')} copied={copied === 'short'} />
                    <DescField label="Caption para redes" value={description.longDesc} onCopy={() => copy(description.longDesc, 'long')} copied={copied === 'long'} multiline />
                    {description.ingredients.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ingredientes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {description.ingredients.map(i => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700">{i}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {description.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {description.tags.map(t => (
                          <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 uppercase tracking-wide">{t}</span>
                        ))}
                      </div>
                    )}
                    <Link href="/app/menu/products" className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-sm font-bold text-white transition-all">
                      Aplicar a un producto en Menius <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty / loading state */}
              {!result && !description && (
                <div className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center p-8">
                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-orange-500" />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-600">IA transformando tu foto…</p>
                      <p className="text-xs text-gray-400">Puede tomar hasta 30 segundos</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                        {mode === 'enhance' ? <Wand2 className="w-6 h-6 text-orange-400" /> :
                         mode === 'generate' ? <Sparkles className="w-6 h-6 text-orange-400" /> :
                         <FileText className="w-6 h-6 text-orange-400" />}
                      </div>
                      <p className="text-sm font-semibold text-gray-500">
                        {mode === 'enhance' ? 'Sube una foto y el resultado aparecerá aquí' :
                         mode === 'generate' ? 'Escribe el plato y genera la imagen' :
                         'Sube una foto para describir el plato'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Zap, color: 'text-orange-500 bg-orange-50', title: 'Resultados en 30 segundos', desc: 'Sin esperas largas. La IA procesa tu foto en segundos y devuelve una imagen lista para publicar.' },
            { icon: Shield, color: 'text-emerald-500 bg-emerald-50', title: 'Tu comida, mejorada', desc: 'No generamos comida falsa. Mejoramos tu foto real — iluminación, fondo y presentación — sin alterar el plato.' },
            { icon: ArrowRight, color: 'text-blue-500 bg-blue-50', title: 'Directo a tu menú', desc: 'Aplica la imagen mejorada directamente a un producto de tu menú Menius sin descargar ni cargar nada.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Planes simples y transparentes</h2>
            <p className="text-gray-500">Incluido en todos los planes Menius. Sin costos adicionales.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-6 border transition-all ${plan.popular ? 'border-orange-400 shadow-lg shadow-orange-100 ring-1 ring-orange-400' : 'border-gray-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Más popular</span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.desc}</p>
                </div>
                <div className="mb-5">
                  <span className="text-4xl font-black text-gray-900">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/mes</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all
                    ${plan.popular ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                >
                  {plan.cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-10">
          Usado por restaurantes en toda Latinoamérica
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { quote: 'Mis ventas en Uber Eats subieron 40% el primer mes. Las fotos hacen toda la diferencia.', name: 'Carlos M.', restaurant: 'Tacos El Güero, CDMX' },
            { quote: 'Tenía fotos horribles de mi bandeja paisa. Ahora parecen de revista gastronómica.', name: 'Diana R.', restaurant: 'La Fonda Paisa, Medellín' },
            { quote: 'En 5 minutos actualicé todas las fotos de mi menú. Increíble lo que hace la IA.', name: 'Miguel A.', restaurant: 'Burger Bros, Lima' },
          ].map(t => (
            <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-orange-400 fill-orange-400" />)}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="text-xs font-bold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400">{t.restaurant}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-orange-500 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            Empieza gratis hoy
          </h2>
          <p className="text-orange-100 mb-8">
            Incluido en todos los planes de Menius. Sin costo adicional.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-orange-50 text-base font-bold text-orange-600 transition-all active:scale-[0.98] shadow-xl"
          >
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-orange-200 mt-4">No se requiere tarjeta de crédito</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-4 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm font-black tracking-tighter text-gray-400 hover:text-gray-900 transition-colors">MENIUS</Link>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Privacidad</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Términos</Link>
            <Link href="/support" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DescField({ label, value, onCopy, copied, multiline }: { label: string; value: string; onCopy: () => void; copied: boolean; multiline?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{label}</span>
        <button onClick={onCopy} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors font-medium">
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className={`text-sm text-gray-800 leading-relaxed ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</p>
    </div>
  );
}
