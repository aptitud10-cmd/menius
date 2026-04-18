'use client';

/**
 * OrderChat — real-time ephemeral chat between customer and driver.
 * Uses Supabase Realtime broadcast (no DB persistence — Uber does the same
 * during an active delivery).
 *
 * Shared component used on both the customer tracker and the driver track page.
 * The `role` prop determines sender identity and which quick replies are shown.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

type Role = 'customer' | 'driver';

interface Message {
  id: string;
  from: Role;
  text: string;
  ts: number;
}

interface OrderChatProps {
  orderId: string;
  role: Role;
  locale?: string;
  /** Visual theme — "light" for customer tracker, "dark" for driver page */
  theme?: 'light' | 'dark';
  /** Hide the floating button when the delivery is already complete */
  disabled?: boolean;
}

const QUICK_REPLIES: Record<Role, { es: string[]; en: string[] }> = {
  customer: {
    es: ['¿Dónde estás?', 'Ya voy saliendo', 'Por favor toca el timbre', 'Déjalo en la puerta', 'Gracias 🙏'],
    en: ['Where are you?', 'I\'m coming out', 'Please ring the bell', 'Leave at the door', 'Thanks 🙏'],
  },
  driver: {
    es: ['Estoy en camino', 'Llegando en 2 min', 'Estoy afuera', 'No encuentro la dirección', '¿Puedes salir?'],
    en: ['On my way', 'Arriving in 2 min', 'I\'m outside', 'Can\'t find the address', 'Can you come out?'],
  },
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function OrderChat({ orderId, role, locale = 'es', theme = 'light', disabled = false }: OrderChatProps) {
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null>(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Subscribe to the chat channel
  useEffect(() => {
    if (!orderId) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`order-chat:${orderId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'msg' }, (payload) => {
        const msg = payload.payload as Message;
        if (!msg || !msg.id || msg.from === role) return;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (!openRef.current) {
          setUnread(u => u + 1);
          // Subtle ping
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1046;
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
          } catch { /* silent */ }
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [orderId, role]);

  // Reset unread counter when user opens the chat
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !channelRef.current) return;
    const msg: Message = { id: makeId(), from: role, text: trimmed.slice(0, 500), ts: Date.now() };
    // Local echo — don't wait for server
    setMessages(prev => [...prev, msg]);
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: msg });
    setInput('');
    setShowQuickReplies(false);
  }, [role]);

  if (disabled) return null;

  const isLight = theme === 'light';
  const quickReplies = en ? QUICK_REPLIES[role].en : QUICK_REPLIES[role].es;
  const counterpartLabel = role === 'customer'
    ? (en ? 'Driver' : 'Repartidor')
    : (en ? 'Customer' : 'Cliente');

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={en ? 'Open chat' : 'Abrir chat'}
          className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all ${
            isLight
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/50'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center border-2 border-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel — slide up from bottom */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in"
          />
          <div className={`relative w-full sm:max-w-md ${isLight ? 'bg-white' : 'bg-gray-900'} rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isLight ? 'border-gray-100' : 'border-gray-800'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isLight ? 'bg-brand-100 text-brand-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-black ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {en ? 'Chat' : 'Chat'}
                  </p>
                  <p className={`text-[11px] ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {en ? 'with' : 'con'} {counterpartLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={en ? 'Close' : 'Cerrar'}
                className={`p-1.5 rounded-lg ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className={`flex-1 overflow-y-auto px-4 py-3 space-y-2 ${isLight ? 'bg-gray-50' : 'bg-gray-950'}`}
            >
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className={`w-10 h-10 mx-auto mb-2 ${isLight ? 'text-gray-300' : 'text-gray-700'}`} />
                  <p className={`text-sm ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {en ? 'No messages yet' : 'Sin mensajes aún'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-300' : 'text-gray-600'}`}>
                    {en ? 'Messages are deleted after delivery' : 'Los mensajes se eliminan al terminar la entrega'}
                  </p>
                </div>
              )}
              {messages.map(m => {
                const mine = m.from === role;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm break-words ${
                        mine
                          ? isLight
                            ? 'bg-brand-500 text-white rounded-br-md'
                            : 'bg-emerald-500 text-white rounded-br-md'
                          : isLight
                            ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                            : 'bg-gray-800 text-gray-100 rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      <p className={`text-[9px] mt-0.5 text-right tabular-nums ${mine ? 'opacity-70' : isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(m.ts).toLocaleTimeString(en ? 'en-US' : 'es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick replies */}
            {showQuickReplies && quickReplies.length > 0 && (
              <div className={`px-4 py-2 border-t ${isLight ? 'border-gray-100 bg-white' : 'border-gray-800 bg-gray-900'}`}>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  {quickReplies.map(qr => (
                    <button
                      key={qr}
                      onClick={() => sendMessage(qr)}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${
                        isLight
                          ? 'bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                      }`}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input); }}
              className={`flex items-end gap-2 px-4 py-3 border-t ${isLight ? 'border-gray-100 bg-white' : 'border-gray-800 bg-gray-900'}`}
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 500))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                onFocus={() => setShowQuickReplies(true)}
                placeholder={en ? 'Type a message…' : 'Escribe un mensaje…'}
                rows={1}
                maxLength={500}
                className={`flex-1 resize-none px-3.5 py-2.5 rounded-2xl text-sm focus:outline-none max-h-24 ${
                  isLight
                    ? 'bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-500/30'
                    : 'bg-gray-800 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/50'
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label={en ? 'Send' : 'Enviar'}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all ${
                  isLight
                    ? 'bg-brand-500 hover:bg-brand-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
