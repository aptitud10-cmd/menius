'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  '¿Cómo va mi día?',
  '¿Qué puedo mejorar?',
  'Sugiéreme una promoción',
  'Dame una receta creativa',
  '¿Cómo agrego un producto?',
  '¿Quiénes son mis mejores clientes?',
  'Ideas para menú de temporada',
  '¿Cómo configuro el WhatsApp?',
];

function formatAIText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
    if (open && !historyLoaded) {
      setHistoryLoaded(true);
      fetch('/api/ai/chat/history')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.messages?.length > 0) {
            setMessages(data.messages.map((m: { role: string; content: string; created_at: string }, i: number) => ({
              id: `h-${i}`,
              role: m.role as 'user' | 'assistant',
              text: m.content,
              timestamp: new Date(m.created_at),
            })));
            setShowQuick(false);
          }
        })
        .catch(() => {});
    }
  }, [open, historyLoaded]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowQuick(false);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply ?? data.error ?? 'No pude procesar tu pregunta.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Error de conexión. Intenta de nuevo.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          open
            ? 'bg-white/10 backdrop-blur-xl border border-white/20 rotate-0'
            : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/25'
        }`}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente IA'}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] transition-all duration-300 origin-bottom-right ${
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden" style={{ height: 'min(600px, calc(100vh - 160px))' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-purple-500/[0.08] to-transparent flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white">MENIUS AI</h3>
              <p className="text-[11px] text-gray-500">Tu asistente inteligente</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/80">Online</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">Hola! Soy MENIUS AI</h4>
                <p className="text-gray-500 text-xs leading-relaxed max-w-[280px] mx-auto">
                  Tu socio de negocio y chef consultor. Pregúntame sobre ventas, clientes, recetas, estrategias o cómo usar el dashboard.
                </p>
              </div>
            )}

            {/* Quick questions */}
            {messages.length === 0 && showQuick && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium px-1">Preguntas rápidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-purple-500/10 hover:border-purple-500/20 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-white/[0.05] border border-white/[0.06] text-gray-300 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="whitespace-pre-wrap">
                      {msg.text.split('\n').map((line, i) => (
                        <span key={i}>
                          {formatAIText(line)}
                          {i < msg.text.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                  <div className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-purple-200/50' : 'text-gray-600'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-3 bg-[#080808]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregúntame lo que quieras..."
                disabled={loading}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-white/[0.04] disabled:text-gray-600 text-white flex items-center justify-center transition-all disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
            <p className="text-center text-[9px] text-gray-700 mt-2">
              MENIUS AI puede cometer errores. Verifica la información importante.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
