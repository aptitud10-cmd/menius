'use client';

import { useState } from 'react';
import { Mail, Send, Users, Filter, Sparkles, AlertCircle, CheckCircle2, Loader2, Wand2 } from 'lucide-react';

interface Props {
  restaurantName: string;
  menuSlug: string;
  totalCustomers: number;
  customersWithEmail: number;
}

const FILTERS = [
  { value: 'all', label: 'Todos los clientes', desc: 'Clientes con email registrado' },
  { value: 'vip', label: 'Clientes VIP', desc: '5+ órdenes realizadas' },
  { value: 'inactive', label: 'Inactivos (30+ días)', desc: 'No han ordenado en 30 días' },
  { value: 'recent', label: 'Recientes (7 días)', desc: 'Ordenaron en los últimos 7 días' },
  { value: 'big_spenders', label: 'Grandes compradores', desc: 'Más de $100 gastados' },
];

const TEMPLATES = [
  {
    name: 'Promoción general',
    subject: '🎉 ¡Oferta especial en {restaurante}!',
    body: 'Hola {nombre},\n\n¡Tenemos una promoción especial para ti! Esta semana disfruta de descuentos exclusivos en nuestros mejores platillos.\n\nNo te lo pierdas, te esperamos.',
    cta: 'Ver menú',
  },
  {
    name: 'Te extrañamos',
    subject: '😢 Te extrañamos, {nombre}',
    body: 'Hola {nombre},\n\nHace tiempo que no nos visitas y te echamos de menos. Queremos darte algo especial para que vuelvas: un descuento exclusivo en tu próximo pedido.\n\n¡Te esperamos de vuelta!',
    cta: 'Ordenar ahora',
  },
  {
    name: 'Nuevo producto',
    subject: '🆕 ¡Nuevo en el menú de {restaurante}!',
    body: 'Hola {nombre},\n\nEstamos emocionados de presentarte lo nuevo en nuestro menú. Hemos agregado platillos increíbles que sabemos te van a encantar.\n\nSé de los primeros en probarlo.',
    cta: 'Descubrir lo nuevo',
  },
  {
    name: 'Agradecimiento VIP',
    subject: '⭐ Gracias por ser cliente frecuente, {nombre}',
    body: 'Hola {nombre},\n\nQueremos agradecerte por tu lealtad. Con {total_ordenes} órdenes y ${total_gastado} en compras, eres uno de nuestros clientes más valiosos.\n\nComo agradecimiento, te tenemos una sorpresa especial en tu próxima visita.',
    cta: 'Reclamar mi sorpresa',
  },
];

export function EmailCampaigns({ restaurantName, menuSlug, totalCustomers, customersWithEmail }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ctaText, setCtaText] = useState('Ver menú');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiType, setAiType] = useState('promo');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/ai/campaign-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType: aiType,
          audience: filter,
          restaurantName,
          customPrompt: aiCustomPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando contenido');
      setSubject(data.subject || '');
      setMessage(data.body || '');
      setCtaText(data.cta || 'Ver menú');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando con IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setSubject(t.subject);
    setMessage(t.body);
    setCtaText(t.cta);
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
      const res = await fetch('/api/tenant/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          ctaText: ctaText.trim() || 'Ver menú',
          ctaUrl: `${appUrl}/r/${menuSlug}`,
          filter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al enviar');
      } else {
        setResult({ sent: data.sent, failed: data.failed, total: data.total });
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> Total clientes
          </div>
          <p className="text-xl font-bold text-gray-900">{totalCustomers}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Mail className="w-3.5 h-3.5" /> Con email
          </div>
          <p className="text-xl font-bold text-gray-900">{customersWithEmail}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Filter className="w-3.5 h-3.5" /> Alcanzables
          </div>
          <p className="text-xl font-bold text-emerald-600">{customersWithEmail}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">clientes recibirán el email</p>
        </div>
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Plantillas rápidas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t)}
              className="text-left p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
            >
              <p className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate">{t.name}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 truncate">{t.subject}</p>
            </button>
          ))}
        </div>
      </div>

      {/* AI Generate */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" /> Generar con IA
        </h3>
        <p className="text-xs text-gray-500">La IA creará asunto, mensaje y CTA optimizados basados en tu restaurante y audiencia.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Tipo de campaña</label>
            <select
              value={aiType}
              onChange={(e) => setAiType(e.target.value)}
              className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            >
              <option value="promo">Promoción / Descuento</option>
              <option value="reactivation">Reactivar inactivos</option>
              <option value="new_product">Nuevo producto</option>
              <option value="vip_thanks">Agradecimiento VIP</option>
              <option value="seasonal">Temporada / Festivo</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Instrucciones extra (opcional)</label>
            <input
              type="text"
              value={aiCustomPrompt}
              onChange={(e) => setAiCustomPrompt(e.target.value)}
              placeholder="Ej: Menciona el 2x1 en pizzas..."
              className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>
        <button
          onClick={handleAIGenerate}
          disabled={aiGenerating}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {aiGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generar contenido con IA</>
          )}
        </button>
      </div>

      {/* Compose */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Componer campaña</h3>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Audiencia</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          >
            {FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Asunto del email</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="🎉 ¡Oferta especial en tu restaurante!"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
          <p className="text-[10px] text-gray-600 mt-1">Usa {'{nombre}'} para personalizar con el nombre del cliente, {'{restaurante}'} para tu restaurante</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Mensaje</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            placeholder="Hola {nombre}, tenemos algo especial para ti..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
          />
          <p className="text-[10px] text-gray-600 mt-1">Variables: {'{nombre}'}, {'{total_ordenes}'}, {'{total_gastado}'}, {'{restaurante}'}</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Texto del botón</label>
          <input
            type="text"
            value={ctaText}
            onChange={e => setCtaText(e.target.value)}
            placeholder="Ver menú"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Enviado: <strong>{result.sent}</strong> de {result.total} emails{result.failed > 0 ? ` (${result.failed} fallidos)` : ''}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !message.trim()}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Enviar campaña
            </>
          )}
        </button>
      </div>
    </div>
  );
}
