'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

function formatAIText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Memoized message bubble — prevents re-renders when only new messages are added
const MessageItem = memo(function MessageItem({ msg }: { msg: Message }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
          msg.role === 'user'
            ? 'bg-purple-600 text-white rounded-br-md'
            : 'bg-white/[0.05] border border-white/[0.06] text-gray-300 rounded-bl-md'
        }`}
      >
        {msg.role === 'assistant' ? (
          <div className="whitespace-pre-wrap">
            {msg.text.split('\n').map((line, i, arr) => (
              <span key={i}>
                {formatAIText(line)}
                {i < arr.length - 1 && <br />}
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
  );
});

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useDashboardLocale();

  const quickQuestions = [t.chat_q1, t.chat_q2, t.chat_q3, t.chat_q4, t.chat_q5, t.chat_q6, t.chat_q7, t.chat_q8];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens — no history loading (fresh start every time)
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setShowQuick(true);
    setInput('');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
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
      // Keep last 8 for context, but cap stored messages at 30 (see render slice below)
      const history = messages.slice(-8).map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply ?? data.error ?? t.chat_errorConnection,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: t.chat_errorConnection,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, t.chat_errorConnection]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  // Only render the last 30 messages to avoid long list freezes on mobile
  const visibleMessages = messages.slice(-30);

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center motion-reduce:transition-none transition-all duration-300 hover:scale-105 ${
          open
            ? 'bg-white/10 backdrop-blur-xl border border-white/20'
            : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/25'
        }`}
        aria-label={open ? 'Close assistant' : 'Open AI assistant'}
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

      {/* Chat panel
          Desktop: 360px wide, 520px tall, anchored bottom-right
          Mobile:  min(92vw, 360px) wide, min(70dvh, 520px) tall — leaves 30% visible behind
      */}
      <div
        className={`fixed bottom-20 right-3 sm:right-4 z-50 motion-reduce:transition-none transition-all duration-300 origin-bottom-right ${
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
        }`}
        style={{
          width: 'min(92vw, 360px)',
          maxHeight: 'min(70dvh, 520px)',
        }}
      >
        <div
          className="bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          style={{
            height: 'min(70dvh, 520px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Header — sticky inside panel */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-purple-500/[0.08] to-transparent flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white leading-tight">{t.chat_title}</h3>
              <p className="text-[11px] text-gray-500 leading-tight">{t.chat_subtitle}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={handleNewConversation}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  title={t.chat_newConversation}
                >
                  {t.chat_newConversation}
                </button>
              )}
              {/* Close button — white icon, 40px touch target for mobile */}
              <button
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
                aria-label="Cerrar chat"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area — internal scroll, won't block page body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">{t.chat_welcome}</h4>
                <p className="text-gray-500 text-xs leading-relaxed max-w-[260px] mx-auto">
                  {t.chat_welcomeDesc}
                </p>
              </div>
            )}

            {messages.length === 0 && showQuick && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium px-1">{t.chat_quickLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q) => (
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

            {/* Render only last 30 messages */}
            {visibleMessages.map((msg) => (
              <MessageItem key={msg.id} msg={msg} />
            ))}

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

          {/* Input area — fixed at bottom of panel */}
          <div className="flex-shrink-0 border-t border-white/[0.06] px-3 py-2.5 bg-[#080808]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.chat_placeholder}
                disabled={loading}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500/20 transition-all disabled:opacity-50"
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
            <p className="text-center text-[9px] text-gray-700 mt-1.5">
              {t.chat_disclaimer}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
