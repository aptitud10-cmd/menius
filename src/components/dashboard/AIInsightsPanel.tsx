'use client';

import { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, DollarSign, Image, Tag, ArrowUpRight, Loader2, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimizerInsight, OptimizerResponse } from '@/app/api/ai/menu-optimizer/route';

interface Props {
  locale: 'es' | 'en';
  currency: string;
}

const INSIGHT_META: Record<OptimizerInsight['type'], { icon: React.ElementType; color: string; bg: string; border: string }> = {
  hidden_gem:        { icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  dead_weight:       { icon: TrendingDown,  color: 'text-red-500',     bg: 'bg-red-50',      border: 'border-red-200' },
  price_opportunity: { icon: DollarSign,    color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  missing_image:     { icon: Image,         color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200' },
  low_margin:        { icon: ArrowUpRight,  color: 'text-orange-600',  bg: 'bg-orange-50',   border: 'border-orange-200' },
  upsell_gap:        { icon: Tag,           color: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-200' },
};

const PRIORITY_LABEL: Record<OptimizerInsight['priority'], { es: string; en: string; color: string }> = {
  high:   { es: 'Alta',  en: 'High',   color: 'text-red-600 bg-red-50 border-red-200' },
  medium: { es: 'Media', en: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low:    { es: 'Baja',  en: 'Low',    color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function formatDate(iso: string, locale: 'es' | 'en') {
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AIInsightsPanel({ locale }: Props) {
  const es = locale === 'es';
  const [data, setData] = useState<OptimizerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setData(null);
    setExpandedIdx(null);
    try {
      const res = await fetch('/api/ai/menu-optimizer', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? (es ? 'Error al analizar el menú' : 'Error analyzing menu'));
      }
      const json: OptimizerResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : (es ? 'Error desconocido' : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  const highPriority = data?.insights.filter(i => i.priority === 'high') ?? [];
  const rest = data?.insights.filter(i => i.priority !== 'high') ?? [];
  const sorted = [...highPriority, ...rest];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            {es ? 'AI Menu Optimizer' : 'AI Menu Optimizer'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {es
              ? 'Análisis inteligente de tu menú con recomendaciones accionables para aumentar revenue.'
              : 'Smart menu analysis with actionable recommendations to increase revenue.'}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95 shadow-sm'
          )}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />{es ? 'Analizando…' : 'Analyzing…'}</>
            : <><Sparkles className="w-4 h-4" />{data ? (es ? 'Re-analizar' : 'Re-analyze') : (es ? 'Analizar mi menú' : 'Analyze my menu')}</>
          }
        </button>
      </div>

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-violet-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            {es ? '¿Qué hace el AI Optimizer?' : 'What does the AI Optimizer do?'}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            {es
              ? 'Analiza tus ventas, márgenes y catálogo de los últimos 30 días para identificar oportunidades concretas de revenue.'
              : 'Analyzes your sales, margins and catalog from the last 30 days to identify concrete revenue opportunities.'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto text-left mb-8">
            {[
              { icon: TrendingUp,    label: es ? 'Gemas ocultas' : 'Hidden gems',       desc: es ? 'Productos top sin destacar' : 'Top products not featured' },
              { icon: TrendingDown,  label: es ? 'Peso muerto' : 'Dead weight',          desc: es ? 'Sin ventas en 30 días' : 'No sales in 30 days' },
              { icon: DollarSign,    label: es ? 'Oportunidad de precio' : 'Price opp.', desc: es ? 'Alta demanda, subir precio' : 'High demand, raise price' },
              { icon: Image,         label: es ? 'Fotos faltantes' : 'Missing images',   desc: es ? '-30% conversión sin foto' : '-30% conversion no image' },
              { icon: ArrowUpRight,  label: es ? 'Margen bajo' : 'Low margin',           desc: es ? 'Bajar costo o subir precio' : 'Lower cost or raise price' },
              { icon: Tag,           label: es ? 'Gap de upsell' : 'Upsell gap',         desc: es ? 'Complementos faltantes' : 'Missing complementary items' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-gray-700">{label}</p>
                  <p className="text-[10px] text-gray-400 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:scale-95 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {es ? 'Comenzar análisis' : 'Start analysis'}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton w-9 h-9 rounded-xl" />
              <div className="skeleton h-4 w-48" />
            </div>
            <div className="skeleton h-3 w-full mb-2" />
            <div className="skeleton h-3 w-3/4" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div>
                  <div className="skeleton h-4 w-40 mb-1.5" />
                  <div className="skeleton h-3 w-16" />
                </div>
              </div>
              <div className="skeleton h-3 w-full mb-2" />
              <div className="skeleton h-3 w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">{es ? 'Error al analizar' : 'Analysis error'}</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
            <button onClick={runAnalysis} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700">
              <RefreshCw className="w-3.5 h-3.5" />{es ? 'Reintentar' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span className="text-xs font-semibold text-violet-200 uppercase tracking-wide">
                {es ? 'Resumen ejecutivo' : 'Executive summary'}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/90">{data.summary}</p>
            <p className="text-[11px] text-violet-300 mt-3">
              {es ? 'Generado' : 'Generated'}: {formatDate(data.generated_at, locale)}
            </p>
          </div>

          {/* Insight cards */}
          {sorted.map((insight, idx) => {
            const meta = INSIGHT_META[insight.type] ?? INSIGHT_META.hidden_gem;
            const Icon = meta.icon;
            const priority = PRIORITY_LABEL[insight.priority];
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                className={cn(
                  'bg-white rounded-2xl border transition-all duration-200',
                  isExpanded ? cn(meta.border, 'shadow-md') : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-start gap-3.5 p-5 text-left"
                >
                  <div className={cn('flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center', meta.bg)}>
                    <Icon className={cn('w-4.5 h-4.5', meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{insight.title}</span>
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border', priority.color)}>
                        {locale === 'es' ? priority.es : priority.en}
                      </span>
                    </div>
                    <p className={cn('text-xs text-gray-500 line-clamp-2 transition-all', isExpanded && 'line-clamp-none')}>
                      {insight.description}
                    </p>
                  </div>
                  <ChevronRight className={cn('flex-shrink-0 w-4 h-4 text-gray-300 transition-transform mt-1', isExpanded && 'rotate-90')} />
                </button>

                {isExpanded && (
                  <div className={cn('px-5 pb-5 border-t pt-4', meta.border)}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {es ? 'Acción recomendada' : 'Recommended action'}
                    </p>
                    <p className="text-sm text-gray-800 font-medium">{insight.action}</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Re-analyze footer */}
          <div className="flex justify-end">
            <button
              onClick={runAnalysis}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {es ? 'Re-analizar menú' : 'Re-analyze menu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
