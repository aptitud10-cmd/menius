'use client';

import { useState, useCallback, useEffect } from 'react';
import { MessageCircle, Users, Send, Clock, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Props {
  restaurantName: string;
  menuSlug: string;
  restaurantLocale: string;
  customersWithPhone: number;
}

type Audience = 'all' | 'inactive_30' | 'inactive_60' | 'vip';

const TEMPLATES = {
  es: [
    {
      id: 'promo',
      label: '🎁 Promoción especial',
      text: (name: string, slug: string) =>
        `¡Hola! 👋 ${name} tiene una oferta especial para ti. Visita nuestro menú y aprovecha nuestros mejores platillos: https://menius.app/${slug} 🍽️`,
    },
    {
      id: 'reactivation',
      label: '💫 Te extrañamos',
      text: (name: string, slug: string) =>
        `¡Hola! Ha pasado un tiempo desde tu última visita a ${name}. Te tenemos algo especial... Explora nuestro menú actualizado: https://menius.app/${slug} 😊`,
    },
    {
      id: 'new_items',
      label: '🆕 Nuevos platillos',
      text: (name: string, slug: string) =>
        `¡Novedad en ${name}! 🎉 Tenemos nuevos platillos que te van a encantar. Mira el menú completo aquí: https://menius.app/${slug}`,
    },
    {
      id: 'weekend',
      label: '🎉 Especial de fin de semana',
      text: (name: string, slug: string) =>
        `¡Este fin de semana en ${name} tenemos algo especial para ti! 🥳 Reserva tu mesa o haz tu pedido en línea: https://menius.app/${slug}`,
    },
  ],
  en: [
    {
      id: 'promo',
      label: '🎁 Special promotion',
      text: (name: string, slug: string) =>
        `Hi! 👋 ${name} has a special offer for you. Visit our menu and enjoy our best dishes: https://menius.app/${slug} 🍽️`,
    },
    {
      id: 'reactivation',
      label: '💫 We miss you',
      text: (name: string, slug: string) =>
        `Hi! It's been a while since your last visit to ${name}. We have something special... Check out our updated menu: https://menius.app/${slug} 😊`,
    },
    {
      id: 'new_items',
      label: '🆕 New dishes',
      text: (name: string, slug: string) =>
        `New at ${name}! 🎉 We have new dishes you'll love. See the full menu here: https://menius.app/${slug}`,
    },
    {
      id: 'weekend',
      label: '🎉 Weekend special',
      text: (name: string, slug: string) =>
        `This weekend at ${name} we have something special for you! 🥳 Reserve your table or order online: https://menius.app/${slug}`,
    },
  ],
};

const AUDIENCE_OPTIONS = {
  es: [
    { id: 'all' as Audience, label: 'Todos los clientes con teléfono', icon: Users },
    { id: 'inactive_30' as Audience, label: 'Inactivos +30 días', icon: Clock },
    { id: 'inactive_60' as Audience, label: 'Inactivos +60 días', icon: Clock },
    { id: 'vip' as Audience, label: 'Clientes VIP (5+ órdenes)', icon: CheckCircle },
  ],
  en: [
    { id: 'all' as Audience, label: 'All customers with phone', icon: Users },
    { id: 'inactive_30' as Audience, label: 'Inactive 30+ days', icon: Clock },
    { id: 'inactive_60' as Audience, label: 'Inactive 60+ days', icon: Clock },
    { id: 'vip' as Audience, label: 'VIP customers (5+ orders)', icon: CheckCircle },
  ],
};

export function WhatsAppCampaigns({ restaurantName, menuSlug, restaurantLocale, customersWithPhone }: Props) {
  const { locale } = useDashboardLocale();
  const isEs = locale === 'es';
  const lang = isEs ? 'es' : 'en';
  const templates = TEMPLATES[lang];
  const audienceOptions = AUDIENCE_OPTIONS[lang];

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [customMessage, setCustomMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [campaigns, setCampaigns] = useState<{ id: string; audience: string; message_preview: string; sent_count: number; failed_count: number; created_at: string }[]>([]);

  useEffect(() => {
    fetch('/api/tenant/whatsapp-campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .catch(() => {});
  }, [result]); // reload after each send

  const currentTemplate = templates.find(t => t.id === selectedTemplate);
  const messageText = customMessage.trim() !== ''
    ? customMessage
    : (currentTemplate?.text(restaurantName, menuSlug) ?? '');

  const fetchEstimate = useCallback(async (aud: Audience) => {
    setLoadingCount(true);
    try {
      // Use the real customers API with sort/filter to estimate counts
      let url = '/api/tenant/customers?limit=1';
      if (aud === 'inactive_30') {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        url = `/api/tenant/customers?sort=last_order_at&limit=1&before=${cutoff}`;
      } else if (aud === 'inactive_60') {
        const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        url = `/api/tenant/customers?sort=last_order_at&limit=1&before=${cutoff}`;
      } else if (aud === 'vip') {
        url = '/api/tenant/customers?sort=total_orders&limit=1';
      }
      const res = await fetch(url);
      const data = await res.json();
      // 'total' is the count from the paginated API
      setEstimatedCount(aud === 'all' ? customersWithPhone : (data.total ?? customersWithPhone));
    } catch {
      setEstimatedCount(customersWithPhone);
    }
    setLoadingCount(false);
  }, [customersWithPhone]);

  const handleAudienceChange = (aud: Audience) => {
    setAudience(aud);
    fetchEstimate(aud);
  };

  const handleSend = useCallback(async () => {
    if (!messageText.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/tenant/whatsapp-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, audience }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      } else {
        setResult({ sent: 0, failed: -1 });
      }
    } catch {
      setResult({ sent: 0, failed: -1 });
    }
    setSending(false);
  }, [messageText, audience]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            {isEs ? 'Campaña de WhatsApp' : 'WhatsApp Campaign'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEs
              ? `Envía mensajes directos a tus clientes. ${customersWithPhone} tienen número de teléfono.`
              : `Send direct messages to your customers. ${customersWithPhone} have a phone number.`}
          </p>
        </div>
      </div>

      {/* WhatsApp compliance notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          {isEs
            ? 'Asegúrate de tener el consentimiento de tus clientes antes de enviarles mensajes de marketing. Usa mensajes que aporten valor real.'
            : 'Make sure you have customer consent before sending marketing messages. Only send messages that provide real value.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configure */}
        <div className="space-y-5">
          {/* Audience */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">{isEs ? 'Audiencia' : 'Audience'}</p>
            <div className="space-y-2">
              {audienceOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <label key={opt.id} className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
                    audience === opt.id ? 'border-[#05c8a7] bg-[#05c8a7]/5' : 'border-gray-100 hover:border-gray-200'
                  )}>
                    <input
                      type="radio"
                      name="wa-audience"
                      checked={audience === opt.id}
                      onChange={() => handleAudienceChange(opt.id)}
                      className="accent-[#05c8a7]"
                    />
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{opt.label}</span>
                  </label>
                );
              })}
            </div>
            {loadingCount ? (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {isEs ? 'Calculando...' : 'Calculating...'}</p>
            ) : estimatedCount !== null && (
              <p className="text-xs text-gray-500 mt-2">
                ~{estimatedCount} {isEs ? 'destinatarios estimados' : 'estimated recipients'}
              </p>
            )}
          </div>

          {/* Template */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">{isEs ? 'Plantilla' : 'Template'}</p>
            <div className="space-y-2">
              {templates.map(tmpl => (
                <label key={tmpl.id} className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
                  selectedTemplate === tmpl.id ? 'border-[#05c8a7] bg-[#05c8a7]/5' : 'border-gray-100 hover:border-gray-200'
                )}>
                  <input
                    type="radio"
                    name="wa-template"
                    checked={selectedTemplate === tmpl.id}
                    onChange={() => { setSelectedTemplate(tmpl.id); setCustomMessage(''); }}
                    className="accent-[#05c8a7]"
                  />
                  <span className="text-sm text-gray-700">{tmpl.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Message editor + preview */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">{isEs ? 'Mensaje' : 'Message'}</p>
              <button
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {isEs ? 'Vista previa' : 'Preview'}
                {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            <textarea
              value={customMessage || (currentTemplate?.text(restaurantName, menuSlug) ?? '')}
              onChange={e => setCustomMessage(e.target.value)}
              rows={5}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#05c8a7]/30 bg-gray-50"
              placeholder={isEs ? 'Escribe tu mensaje...' : 'Write your message...'}
            />
            <p className="text-xs text-gray-400 mt-1">{messageText.length}/1000 {isEs ? 'caracteres' : 'characters'}</p>
          </div>

          {/* WhatsApp preview bubble */}
          {showPreview && (
            <div className="bg-[#e5ddd5] rounded-xl p-4">
              <p className="text-[10px] text-gray-500 mb-2 text-center">{isEs ? 'Vista previa de WhatsApp' : 'WhatsApp preview'}</p>
              <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{messageText}</p>
                <p className="text-[10px] text-gray-400 text-right mt-1">12:00 ✓✓</p>
              </div>
            </div>
          )}

          {/* Send */}
          {result ? (
            <div className={cn('rounded-xl p-4 text-center', result.failed === -1 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200')}>
              {result.failed === -1 ? (
                <p className="text-sm font-semibold text-red-700">{isEs ? 'Error al enviar la campaña' : 'Error sending campaign'}</p>
              ) : (
                <>
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-700">
                    {result.sent} {isEs ? 'mensajes enviados' : 'messages sent'}
                  </p>
                  {result.failed > 0 && (
                    <p className="text-xs text-red-500 mt-1">{result.failed} {isEs ? 'fallaron' : 'failed'}</p>
                  )}
                </>
              )}
              <button onClick={() => setResult(null)} className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline">
                {isEs ? 'Nueva campaña' : 'New campaign'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !messageText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20c55e] transition-colors disabled:opacity-50 shadow-md shadow-green-500/20"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isEs ? 'Enviando...' : 'Sending...'}</>
              ) : (
                <><Send className="w-4 h-4" /> {isEs ? 'Enviar campaña' : 'Send campaign'}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Campaign history */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            {isEs ? 'Historial de campañas' : 'Campaign history'}
          </h3>
          <div className="space-y-3">
            {campaigns.map(c => {
              const audienceLabel = isEs
                ? c.audience === 'all' ? 'Todos' : c.audience === 'inactive_30' ? 'Inactivos 30d' : c.audience === 'inactive_60' ? 'Inactivos 60d' : 'VIP'
                : c.audience === 'all' ? 'All' : c.audience === 'inactive_30' ? 'Inactive 30d' : c.audience === 'inactive_60' ? 'Inactive 60d' : 'VIP';
              const total = c.sent_count + c.failed_count;
              const successRate = total > 0 ? Math.round((c.sent_count / total) * 100) : 0;
              return (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <MessageCircle className="w-4 h-4 text-[#25D366] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{c.message_preview}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{audienceLabel}</span>
                      <span className="text-xs font-semibold text-emerald-600">✓ {c.sent_count}</span>
                      {c.failed_count > 0 && <span className="text-xs text-red-400">✗ {c.failed_count}</span>}
                      <span className="text-xs text-gray-400">{successRate}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 flex-shrink-0">
                    {new Date(c.created_at).toLocaleDateString(isEs ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
