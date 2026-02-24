'use client';

import { useState } from 'react';
import { Mail, Send, Store, Filter, Sparkles, AlertCircle, CheckCircle2, Loader2, Wand2, Lightbulb, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  totalRestaurants: number;
  restaurantsWithEmail: number;
  planCounts: Record<string, number>;
}

const FILTERS = [
  { value: 'all', label: 'Todos los restaurantes', desc: 'Con email configurado' },
  { value: 'trialing', label: 'En trial', desc: 'Periodo de prueba activo' },
  { value: 'active', label: 'Activos', desc: 'Suscripción pagando' },
  { value: 'cancelled', label: 'Cancelados', desc: 'Cancelaron su plan' },
  { value: 'past_due', label: 'Pago vencido', desc: 'Necesitan renovar' },
];

const CAMPAIGN_TYPES = [
  { value: 'onboarding', label: 'Onboarding', desc: 'Guiar al nuevo usuario' },
  { value: 'upgrade', label: 'Upgrade', desc: 'Motivar a subir de plan' },
  { value: 'reactivation', label: 'Reactivación', desc: 'Traer usuarios de vuelta' },
  { value: 'feature_announce', label: 'Nueva función', desc: 'Anunciar features' },
  { value: 'tips', label: 'Tips', desc: 'Mejores prácticas' },
  { value: 'case_study', label: 'Caso de éxito', desc: 'Resultados de clientes' },
  { value: 'seasonal', label: 'Temporada', desc: 'Campaña festiva' },
];

export function AdminEmailCampaigns({ totalRestaurants, restaurantsWithEmail, planCounts }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ctaText, setCtaText] = useState('Ir a mi dashboard');
  const [filter, setFilter] = useState('all');
  const [campaignType, setCampaignType] = useState('tips');
  const [customPrompt, setCustomPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [aiTip, setAiTip] = useState('');
  const [subjectVariant, setSubjectVariant] = useState('');
  const [preheader, setPreheader] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setError('');
    setAiTip('');
    setSubjectVariant('');
    try {
      const res = await fetch('/api/admin/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'email', campaignType, audience: filter, customPrompt: customPrompt.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando contenido');
      setSubject(data.subject ?? '');
      setMessage(data.body ?? '');
      setCtaText(data.cta ?? 'Ir a mi dashboard');
      setAiTip(data.tip ?? '');
      setSubjectVariant(data.subjectVariant ?? '');
      setPreheader(data.preheader ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando con IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Asunto y mensaje son requeridos');
      return;
    }
    setError('');
    setResult(null);
    setSending(true);
    try {
      const appUrl = window.location.origin;
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          ctaText: ctaText.trim() || 'Ir a mi dashboard',
          ctaUrl: `${appUrl}/app`,
          filter,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Error al enviar');
      else setResult({ sent: data.sent, failed: data.failed, total: data.total });
    } catch {
      setError('Error de conexión');
    } finally {
      setSending(false);
    }
  };

  const useVariant = () => {
    if (subjectVariant) setSubject(subjectVariant);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Store className="w-3.5 h-3.5" /> Restaurantes</div>
          <p className="text-xl font-bold text-white">{totalRestaurants}</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Mail className="w-3.5 h-3.5" /> Con email</div>
          <p className="text-xl font-bold text-white">{restaurantsWithEmail}</p>
        </div>
        {Object.entries(planCounts).slice(0, 2).map(([plan, count]) => (
          <div key={plan} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-1 capitalize">{plan}</div>
            <p className="text-xl font-bold text-purple-400">{count}</p>
          </div>
        ))}
      </div>

      {/* AI Generate */}
      <div className="bg-purple-500/[0.08] border border-purple-500/20 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" /> Generar campaña con IA
        </h3>
        <p className="text-xs text-gray-500">La IA usa datos reales de la plataforma para crear contenido personalizado de nivel profesional.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipo de campaña</label>
            <select value={campaignType} onChange={(e) => setCampaignType(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/30">
              {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Audiencia</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/30">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Instrucciones extra</label>
            <input type="text" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Mencionar el nuevo import con IA..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30" />
          </div>
        </div>

        <button onClick={handleAIGenerate} disabled={aiGenerating}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
          {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando con IA...</> : <><Sparkles className="w-4 h-4" /> Generar contenido profesional</>}
        </button>
      </div>

      {/* AI Tip + A/B variant */}
      {aiTip && (
        <div className="flex items-start gap-3 text-sm bg-amber-500/[0.06] border border-amber-500/15 rounded-xl px-4 py-3">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-xs font-medium mb-1">Tip IA</p>
            <p className="text-amber-200/80 text-xs">{aiTip}</p>
            {subjectVariant && (
              <button onClick={useVariant} className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <Copy className="w-3 h-3" /> Usar variante A/B: &quot;{subjectVariant}&quot;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compose */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Componer email</h3>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Asunto</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Ej: 🚀 Nueva función en MENIUS: importa tu menú con IA"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30" />
          <p className="text-[10px] text-gray-600 mt-1">Usa {'{restaurante}'} para personalizar. {preheader && `Preheader: "${preheader}"`}</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Mensaje</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            placeholder="Escribe el mensaje o genera con IA..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none" />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Botón CTA</label>
          <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500/30" />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Enviado: <strong>{result.sent}</strong> de {result.total}{result.failed > 0 ? ` (${result.failed} fallidos)` : ''}</span>
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim()}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {sending ? <><div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" /> Enviando...</>
            : <><Send className="w-4 h-4" /> Enviar a restaurantes</>}
        </button>
      </div>
    </div>
  );
}
