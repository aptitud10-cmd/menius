'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload, Sparkles, Wand2, FileText, ArrowRight, Check, Copy,
  ChevronRight, Loader2, X, Download, ExternalLink, Star,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Mode = 'enhance' | 'generate' | 'describe';

type StyleOption = { id: string; label: string; labelEs: string };

const STYLES: StyleOption[] = [
  { id: 'dark_moody',  label: 'Dark & Moody',     labelEs: 'Oscuro y dramático' },
  { id: 'bright_airy', label: 'Bright & Airy',     labelEs: 'Luminoso y aireado' },
  { id: 'natural',     label: 'Natural Light',      labelEs: 'Luz natural' },
  { id: 'editorial',   label: 'Editorial',          labelEs: 'Editorial' },
  { id: 'delivery',    label: 'Delivery Ready',     labelEs: 'Para delivery' },
];

const CUISINES = [
  'General', 'Mexican', 'Colombian', 'Peruvian', 'Argentine',
  'Italian', 'American', 'Venezuelan', 'Brazilian',
];

/* ─── Before/After Slider ────────────────────────────────────────────────── */
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  useEffect(() => {
    const onUp = () => { dragging.current = false; };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updatePos(x);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
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
      className="relative w-full aspect-square rounded-2xl overflow-hidden select-none cursor-ew-resize"
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; updatePos(e.touches[0].clientX); }}
    >
      {/* After (full) */}
      <Image src={after} alt="Enhanced" fill className="object-cover" unoptimized />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt="Original" fill className="object-cover" unoptimized />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/70 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">Antes</span>
      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest text-white/70 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">Después</span>
    </div>
  );
}

/* ─── Drop Zone ──────────────────────────────────────────────────────────── */
function DropZone({
  onFile, preview, loading,
}: {
  onFile: (f: File) => void;
  preview: string | null;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onFile(file);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
      onDragLeave={() => setDraggingOver(false)}
      onClick={() => !loading && inputRef.current?.click()}
      className={`relative w-full aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden
        ${draggingOver ? 'border-orange-400 bg-orange-400/10' : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {preview ? (
        <>
          <Image src={preview} alt="Preview" fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
                <p className="text-sm font-medium text-white">Procesando…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
                <Upload className="w-8 h-8 text-white" />
                <p className="text-sm font-medium text-white">Cambiar imagen</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 px-6 text-center pointer-events-none">
          {loading ? (
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin" />
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
                <Upload className="w-7 h-7 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Arrastra tu foto aquí</p>
                <p className="text-xs text-white/40 mt-1">o haz clic para seleccionar</p>
                <p className="text-xs text-white/20 mt-2">JPG, PNG, WEBP — máx 10MB</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AIFotosPage() {
  const [mode, setMode] = useState<Mode>('enhance');
  const [style, setStyle] = useState('natural');
  const [cuisine, setCuisine] = useState('General');
  const [dishName, setDishName] = useState('');
  const [locale] = useState<'es' | 'en'>('es');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    url: string;
    originalUrl?: string;
    engine?: string;
  } | null>(null);

  const [description, setDescription] = useState<{
    name: string; shortDesc: string; longDesc: string;
    ingredients: string[]; tags: string[]; cuisine: string;
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
    setLoading(true);
    setError(null);
    setResult(null);
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
    setLoading(true);
    setError(null);
    setResult(null);
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
    setLoading(true);
    setError(null);
    setDescription(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('locale', locale);
      const res = await fetch('/api/ai/describe', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al generar descripción');
      setDescription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [file, locale]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const canRun = mode === 'generate' ? dishName.trim().length > 0 : !!file;
  const runAction = mode === 'enhance' ? handleEnhance : mode === 'generate' ? handleGenerate : handleDescribe;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tighter text-white">MENIUS</span>
            <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-0.5 rounded-full uppercase tracking-widest">IA Fotos</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] text-white/50 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-bold text-white transition-colors"
            >
              Empezar gratis <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-400/30 bg-orange-400/5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[12px] font-semibold text-orange-400">IA de Fotografía Gastronómica</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.05] mb-4">
            Fotos de menú que{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              venden más
            </span>
          </h1>

          <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto mb-8">
            Transforma cualquier foto de celular en imágenes de revista.
            Sin fotógrafo. Sin estudio. En 30 segundos.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-center mb-10">
            {[
              { value: '+35%', label: 'más pedidos' },
              { value: '30s',  label: 'por imagen' },
              { value: '95%',  label: 'más barato' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/30 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tool */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-2xl p-1.5 border border-white/[0.06]">
            {([
              { id: 'enhance',  icon: Wand2,     label: 'Mejorar foto',       sub: 'foto fea → foto pro' },
              { id: 'generate', icon: Sparkles,   label: 'Crear desde cero',   sub: 'texto → imagen' },
              { id: 'describe', icon: FileText,   label: 'Descripción IA',     sub: 'foto → texto de menú' },
            ] as { id: Mode; icon: React.ElementType; label: string; sub: string }[]).map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setDescription(null); setError(null); }}
                className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all
                  ${mode === m.id
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-white/40 hover:text-white/70'}`}
              >
                <m.icon className="w-4 h-4" />
                <span className="hidden sm:block">{m.label}</span>
                <span className="text-[10px] font-normal opacity-60 hidden sm:block">{m.sub}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input panel */}
            <div className="space-y-4">
              {/* Image input (enhance + describe) */}
              {(mode === 'enhance' || mode === 'describe') && (
                <DropZone onFile={handleFile} preview={preview} loading={loading} />
              )}

              {/* Text input (generate) */}
              {mode === 'generate' && (
                <div className="space-y-4">
                  <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 space-y-4">
                    <div>
                      <label className="text-[11px] uppercase font-bold text-white/40 tracking-wider block mb-2">
                        Nombre del plato
                      </label>
                      <input
                        type="text"
                        value={dishName}
                        onChange={e => setDishName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && canRun && !loading && runAction()}
                        placeholder="Tacos al pastor, Hamburguesa BBQ..."
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-400/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] uppercase font-bold text-white/40 tracking-wider block mb-2">
                        Cocina
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CUISINES.map(c => (
                          <button
                            key={c}
                            onClick={() => setCuisine(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                              ${cuisine === c
                                ? 'border-orange-400/50 bg-orange-400/10 text-orange-400'
                                : 'border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12]'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Style selector (enhance + generate) */}
              {(mode === 'enhance' || mode === 'generate') && (
                <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
                  <label className="text-[11px] uppercase font-bold text-white/40 tracking-wider block mb-3">
                    Estilo fotográfico
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`p-3 rounded-xl border text-left transition-all
                          ${style === s.id
                            ? 'border-orange-400/50 bg-orange-400/10 text-white'
                            : 'border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/[0.12]'}`}
                      >
                        <p className="text-xs font-semibold leading-tight">{s.labelEs}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Run button */}
              <button
                onClick={runAction}
                disabled={loading || !canRun}
                className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Procesando…</>
                ) : mode === 'enhance' ? (
                  <><Wand2 className="w-5 h-5" /> Mejorar foto</>
                ) : mode === 'generate' ? (
                  <><Sparkles className="w-5 h-5" /> Generar imagen</>
                ) : (
                  <><FileText className="w-5 h-5" /> Generar descripción</>
                )}
              </button>

              <p className="text-center text-[11px] text-white/20">
                {mode === 'enhance' ? '3 mejoras gratis por hora · Sin registro' :
                 mode === 'generate' ? '2 generaciones gratis por hora · Sin registro' :
                 'Gratis · Sin registro'}
              </p>
            </div>

            {/* Right: Result panel */}
            <div>
              {/* Enhance result */}
              {mode === 'enhance' && result && preview && (
                <div className="space-y-4">
                  <BeforeAfterSlider before={preview} after={result.url} />
                  <div className="flex gap-2">
                    <a
                      href={result.url}
                      download
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-semibold text-white transition-all"
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </a>
                    <Link
                      href="/app/menu/products"
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-bold text-white transition-all"
                    >
                      Aplicar al menú <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  {result.engine && (
                    <p className="text-center text-[10px] text-white/20 uppercase tracking-wider">
                      Engine: {result.engine}
                    </p>
                  )}
                </div>
              )}

              {/* Generate result */}
              {mode === 'generate' && result && (
                <div className="space-y-4">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                    <Image src={result.url} alt={dishName} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <p className="absolute bottom-4 left-4 text-base font-bold text-white">{dishName}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={result.url}
                      download
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-semibold text-white transition-all"
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </a>
                    <Link
                      href="/app/menu/products/new"
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-bold text-white transition-all"
                    >
                      Agregar al menú <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Describe result */}
              {mode === 'describe' && description && (
                <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Descripción generada</h3>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{description.cuisine}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Name */}
                    <DescField
                      label="Nombre del plato"
                      value={description.name}
                      onCopy={() => copy(description.name, 'name')}
                      copied={copied === 'name'}
                    />
                    {/* Short desc */}
                    <DescField
                      label="Descripción corta (menú)"
                      value={description.shortDesc}
                      onCopy={() => copy(description.shortDesc, 'short')}
                      copied={copied === 'short'}
                    />
                    {/* Long desc */}
                    <DescField
                      label="Caption para redes sociales"
                      value={description.longDesc}
                      onCopy={() => copy(description.longDesc, 'long')}
                      copied={copied === 'long'}
                      multiline
                    />
                    {/* Ingredients */}
                    {description.ingredients.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider mb-2">Ingredientes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {description.ingredients.map(i => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-white/60">{i}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Tags */}
                    {description.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {description.tags.map(t => (
                          <span key={t} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20">{t}</span>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/app/menu/products"
                      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-bold text-white transition-all"
                    >
                      Aplicar a producto en Menius <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!result && !description && !loading && (
                <div className="w-full aspect-square rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mb-4">
                    {mode === 'enhance' ? <Wand2 className="w-7 h-7 text-orange-400" /> :
                     mode === 'generate' ? <Sparkles className="w-7 h-7 text-orange-400" /> :
                     <FileText className="w-7 h-7 text-orange-400" />}
                  </div>
                  <p className="text-sm font-semibold text-white/40">
                    {mode === 'enhance' ? 'Sube una foto para mejorarla' :
                     mode === 'generate' ? 'Escribe el nombre del plato y genera' :
                     'Sube una foto para describir el plato'}
                  </p>
                  <p className="text-xs text-white/20 mt-1">El resultado aparece aquí</p>
                </div>
              )}

              {loading && !result && !description && (
                <div className="w-full aspect-square rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-orange-400/20 border-t-orange-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">IA trabajando…</p>
                    <p className="text-xs text-white/30 mt-1">Puede tomar hasta 30 segundos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-t border-white/[0.06] py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-white/30 uppercase tracking-widest mb-10">
              Usado por restaurantes en toda Latinoamérica
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: 'Mis ventas en Uber Eats subieron 40% el primer mes. Las fotos hacen toda la diferencia.',
                  name: 'Carlos M.',
                  restaurant: 'Tacos El Güero, CDMX',
                },
                {
                  quote: 'Tenía fotos horribles de mi bandeja paisa. Ahora parecen de revista gastronómica.',
                  name: 'Diana R.',
                  restaurant: 'La Fonda Paisa, Medellín',
                },
                {
                  quote: 'En 5 minutos actualicé todas las fotos de mi menú. Increíble lo que hace la IA.',
                  name: 'Miguel A.',
                  restaurant: 'Burger Bros, Lima',
                },
              ].map(t => (
                <div key={t.name} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-left">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.restaurant}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">
              Empieza gratis hoy
            </h2>
            <p className="text-white/40 mb-8">
              Incluido en todos los planes de Menius. Sin costo adicional.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-base font-bold text-white transition-all active:scale-[0.98]"
            >
              Crear cuenta gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-white/20 mt-4">No se requiere tarjeta de crédito</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] py-8 px-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-sm font-black tracking-tighter text-white/40 hover:text-white transition-colors">MENIUS</Link>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-xs text-white/20 hover:text-white/40 transition-colors">Privacidad</Link>
              <Link href="/terms" className="text-xs text-white/20 hover:text-white/40 transition-colors">Términos</Link>
              <Link href="/support" className="text-xs text-white/20 hover:text-white/40 transition-colors">Soporte</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function DescField({
  label, value, onCopy, copied, multiline,
}: {
  label: string; value: string; onCopy: () => void; copied: boolean; multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">{label}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-orange-400 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className={`text-sm text-white/80 ${multiline ? 'whitespace-pre-line' : ''}`}>{value}</p>
    </div>
  );
}
