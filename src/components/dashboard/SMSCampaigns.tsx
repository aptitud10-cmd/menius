'use client';

import { useState } from 'react';
import { Smartphone, Send, Users, Filter, Sparkles, AlertCircle, CheckCircle2, Loader2, Wand2, Info } from 'lucide-react';

interface Props {
  restaurantName: string;
  menuSlug: string;
  totalCustomers: number;
  customersWithPhone: number;
}

const FILTERS = [
  { value: 'all', label: 'Todos los clientes', desc: 'Clientes con teléfono registrado' },
  { value: 'vip', label: 'Clientes VIP', desc: '5+ órdenes realizadas' },
  { value: 'inactive', label: 'Inactivos (30+ días)', desc: 'No han ordenado en 30 días' },
  { value: 'recent', label: 'Recientes (7 días)', desc: 'Ordenaron en los últimos 7 días' },
];

const TEMPLATES = [
  { name: 'Promoción', text: '🎉 ¡Hola {nombre}! Hoy tenemos ofertas especiales en {restaurante}. Haz tu pedido: {link}' },
  { name: 'Te extrañamos', text: '😢 {nombre}, hace tiempo que no nos visitas. ¡Te esperamos! Pide aquí: {link}' },
  { name: 'Nuevo plato', text: '🆕 ¡Nuevo en {restaurante}! No te pierdas lo último en nuestro menú 🔥 {link}' },
  { name: 'Agradecimiento', text: '⭐ Gracias por ser parte de {restaurante}, {nombre}. ¡Tu próximo pedido tiene sorpresa! {link}' },
];

export function SMSCampaigns({ restaurantName, menuSlug, totalCustomers, customersWithPhone }: Props) {
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;
  const isConfigured = !!(process.env.NEXT_PUBLIC_SMS_CONFIGURED === 'true');

  const handleAIGenerate = async () => {
    setAiGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/ai/campaign-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignType: 'promo',
          audience: filter,
          restaurantName,
          customPrompt: `Genera SOLO un mensaje SMS corto (máximo 160 caracteres). ${aiPrompt}`.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando contenido');
      const smsText = (data.body ?? '').replace(/\n/g, ' ').slice(0, 160);
      setMessage(smsText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando con IA');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError('El mensaje es requerido');
      return;
    }
    setError('');
    setResult(null);
    setSending(true);

    try {
      const res = await fetch('/api/tenant/sms-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          filter,
          menuUrl: `${window.location.origin}/r/${menuSlug}`,
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
            <Smartphone className="w-3.5 h-3.5" /> Con teléfono
          </div>
          <p className="text-xl font-bold text-gray-900">{customersWithPhone}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Filter className="w-3.5 h-3.5" /> Alcanzables
          </div>
          <p className="text-xl font-bold text-emerald-600">{customersWithPhone}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">clientes recibirán el SMS</p>
        </div>
      </div>

      {/* SMS Provider notice */}
      <div className="flex items-start gap-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Servicio SMS</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Para enviar SMS se requiere un proveedor como Twilio o MessageBird. Configura tus credenciales en las variables de entorno.
            Costo aproximado: $0.01-0.05 USD por SMS según el país.
          </p>
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
              onClick={() => setMessage(t.text)}
              className="text-left p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
            >
              <p className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{t.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{t.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* AI Generate */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" /> Generar SMS con IA
        </h3>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Ej: 2x1 en hamburguesas este viernes..."
          className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
        <button
          onClick={handleAIGenerate}
          disabled={aiGenerating}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {aiGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generar SMS con IA</>
          )}
        </button>
      </div>

      {/* Compose */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Componer SMS</h3>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Audiencia</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          >
            {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Mensaje</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            maxLength={320}
            placeholder="Hola {nombre}, tenemos algo especial para ti..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
          />
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-gray-500">Variables: {'{nombre}'}, {'{restaurante}'}, {'{link}'}</p>
            <p className={`text-[10px] font-medium ${charCount > 160 ? 'text-amber-600' : 'text-gray-500'}`}>
              {charCount}/160 · {smsCount} SMS{smsCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Enviado: <strong>{result.sent}</strong> de {result.total} SMS{result.failed > 0 ? ` (${result.failed} fallidos)` : ''}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" /> Enviando...</>
          ) : (
            <><Send className="w-4 h-4" /> Enviar campaña SMS</>
          )}
        </button>
      </div>
    </div>
  );
}
