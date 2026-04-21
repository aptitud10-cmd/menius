'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import type { DashboardTranslations } from '@/lib/dashboard-translations';

const MIN_W = 320;
const MAX_W = 640;
const MIN_H = 420;
const MAX_H = 800;
const HISTORY_KEY = 'menius-ai-history';
const MAX_STORED = 30;
const PROACTIVE_DELAY_MS = 45_000;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  streaming?: boolean;
}

function formatAIText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)>\]]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    const mdLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (mdLink) {
      const [, linkText, href] = mdLink;
      const isExternal = href.startsWith('http');
      return (
        <a key={i} href={href} target={isExternal ? '_blank' : '_self'} rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors">
          {linkText}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-purple-300 hover:text-purple-200 underline underline-offset-2 transition-colors break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const MessageItem = memo(function MessageItem({ msg }: { msg: Message }) {
  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
        msg.role === 'user'
          ? 'bg-purple-600 text-white rounded-br-md'
          : 'bg-white/[0.05] border border-white/[0.06] text-gray-300 rounded-bl-md'
      }`}>
        {msg.role === 'assistant' ? (
          <div className="whitespace-pre-wrap">
            {msg.text.split('\n').map((line, i, arr) => (
              <span key={i}>{formatAIText(line)}{i < arr.length - 1 && <br />}</span>
            ))}
            {msg.streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-purple-400 animate-pulse rounded-sm align-middle" />}
          </div>
        ) : (
          <span>{msg.text}</span>
        )}
        {!msg.streaming && (
          <div className={`text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-purple-200/50' : 'text-gray-600'}`}>
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
});

// Shared chat panel content — used by both desktop and mobile
function ChatPanel({
  messages, loading, input, showQuick, quickQuestions, inputRef, messagesEndRef, lastAiMsgRef,
  onInput, onSubmit, onQuickSend, onNewConversation, onClose, isEn, t, visibleMessages,
  headerExtra,
}: {
  messages: Message[];
  loading: boolean;
  input: string;
  showQuick: boolean;
  quickQuestions: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  lastAiMsgRef: React.RefObject<HTMLDivElement | null>;
  onInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onQuickSend: (q: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
  isEn: boolean;
  t: DashboardTranslations;
  visibleMessages: Message[];
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="relative bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden h-full">
      {headerExtra}

      {/* Header */}
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
            <button onClick={onNewConversation}
              className="px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
              title={t.chat_newConversation}>
              {t.chat_newConversation}
            </button>
          )}
          <button onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
            aria-label={isEn ? 'Close chat' : 'Cerrar chat'}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h4 className="text-white font-semibold text-sm mb-1">{t.chat_welcome}</h4>
            <p className="text-gray-500 text-xs leading-relaxed max-w-[260px] mx-auto">{t.chat_welcomeDesc}</p>
          </div>
        )}

        {messages.length === 0 && showQuick && (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-600 uppercase tracking-wider font-medium px-1">{t.chat_quickLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button key={q} onClick={() => onQuickSend(q)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-purple-500/10 hover:border-purple-500/20 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleMessages.map((msg, idx) => {
          const isLastAI = msg.role === 'assistant' && !visibleMessages.slice(idx + 1).some(m => m.role === 'assistant');
          return (
            <div key={msg.id} ref={isLastAI ? (lastAiMsgRef as React.Ref<HTMLDivElement>) : undefined}>
              <MessageItem msg={msg} />
            </div>
          );
        })}

        {loading && !messages.some(m => m.streaming) && (
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
      <div className="flex-shrink-0 border-t border-white/[0.06] px-3 py-2.5 bg-[#080808]">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder={t.chat_placeholder}
            disabled={loading}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-purple-500/20 transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-white/[0.04] disabled:text-gray-600 text-white flex items-center justify-center transition-all disabled:cursor-not-allowed flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[9px] text-gray-700 mt-1.5">{t.chat_disclaimer}</p>
      </div>
    </div>
  );
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [panelW, setPanelW] = useState(360);
  const [panelH, setPanelH] = useState(520);

  const resizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAiMsgRef = useRef<HTMLDivElement>(null);
  const lastRoleRef = useRef<'user' | 'assistant' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  openRef.current = open;

  const { t, locale } = useDashboardLocale();
  const isEn = locale === 'en';
  const quickQuestions = [t.chat_q1, t.chat_q2, t.chat_q3, t.chat_q4, t.chat_q5, t.chat_q6, t.chat_q7, t.chat_q8];

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<{ id: string; role: string; text: string; timestamp: string }>;
        const restored: Message[] = parsed.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          text: m.text,
          timestamp: new Date(m.timestamp),
        }));
        if (restored.length > 0) {
          setMessages(restored);
          setShowQuick(false);
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // Save history to localStorage whenever messages change (skip streaming messages)
  useEffect(() => {
    if (messages.length === 0) { localStorage.removeItem(HISTORY_KEY); return; }
    const toSave = messages.filter(m => !m.streaming);
    if (toSave.length === 0) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave.slice(-MAX_STORED)));
    } catch { /* ignore quota errors */ }
  }, [messages]);

  // Proactive tooltip after 45s if never opened
  useEffect(() => {
    proactiveTimerRef.current = setTimeout(() => {
      if (!openRef.current) setShowProactive(true);
    }, PROACTIVE_DELAY_MS);
    return () => clearTimeout(proactiveTimerRef.current);
  }, []);

  useEffect(() => {
    if (open) { setShowProactive(false); clearTimeout(proactiveTimerRef.current); }
  }, [open]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (lastRoleRef.current === 'assistant') {
      setTimeout(() => lastAiMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } else if (lastRoleRef.current === 'user') {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Desktop resize handlers
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const dx = resizeStartRef.current.x - e.clientX;
      const dy = resizeStartRef.current.y - e.clientY;
      setPanelW(Math.min(MAX_W, Math.max(MIN_W, resizeStartRef.current.w + dx)));
      setPanelH(Math.min(MAX_H, Math.max(MIN_H, resizeStartRef.current.h + dy)));
    }
    function onMouseUp() { resizingRef.current = false; document.body.style.userSelect = ''; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Lock body scroll on mobile when chat is open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setShowQuick(true);
    setInput('');
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    lastRoleRef.current = 'user';
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowQuick(false);

    // Create placeholder for streaming assistant message
    const assistantId = `a-${Date.now()}`;

    try {
      const history = messages.filter(m => !m.streaming).slice(-20).map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      // Handle non-streaming error responses (403, 429, etc.)
      if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        const replyText = res.status === 403
          ? (isEn
              ? '🔒 MENIUS AI is available from the **Starter plan** ($39/mo). [Upgrade your plan](/app/billing) to unlock the AI assistant, unlimited orders, and more.'
              : '🔒 MENIUS AI está disponible desde el **plan Starter** ($39/mes). [Mejora tu plan](/app/billing) para desbloquear el asistente IA, pedidos ilimitados y más.')
          : (data.error ?? t.chat_errorConnection);

        lastRoleRef.current = 'assistant';
        setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: replyText, timestamp: new Date() }]);
        if (!openRef.current) setHasUnread(true);
        setLoading(false);
        return;
      }

      // Stream SSE chunks
      const streamingMsg: Message = { id: assistantId, role: 'assistant', text: '', timestamp: new Date(), streaming: true };
      lastRoleRef.current = 'assistant';
      setMessages(prev => [...prev, streamingMsg]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, text: parsed.error, streaming: false } : m
              ));
              setLoading(false);
              return;
            }
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, text: accumulated } : m
              ));
            }
            if (parsed.done) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, streaming: false } : m
              ));
            }
          } catch {
            // malformed line — skip
          }
        }
      }

      if (!openRef.current) setHasUnread(true);
    } catch {
      lastRoleRef.current = 'assistant';
      setMessages(prev => {
        // Replace streaming placeholder if exists, else append
        const hasPlaceholder = prev.some(m => m.id === assistantId);
        const errMsg: Message = { id: assistantId, role: 'assistant', text: t.chat_errorConnection, timestamp: new Date() };
        return hasPlaceholder ? prev.map(m => m.id === assistantId ? errMsg : m) : [...prev, errMsg];
      });
      if (!openRef.current) setHasUnread(true);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, isEn, t.chat_errorConnection]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleOpen = useCallback(() => {
    setOpen(prev => !prev);
    setHasUnread(false);
    setShowProactive(false);
    clearTimeout(proactiveTimerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const visibleMessages = messages.slice(-30);

  const sharedPanelProps = {
    messages, loading, input, showQuick, quickQuestions,
    inputRef, messagesEndRef, lastAiMsgRef,
    onInput: setInput,
    onSubmit: handleSubmit,
    onQuickSend: sendMessage,
    onNewConversation: handleNewConversation,
    onClose: handleClose,
    isEn, t, visibleMessages,
  };

  return (
    <>
      {/* ── MOBILE: full-screen drawer (< md) ─────────────────────────────── */}
      {/* Uses fixed positioning without touching body overflow on iOS.        */}
      {/* The drawer is mounted always but hidden via translate to avoid        */}
      {/* remount issues on iPhone that caused the original mobile problems.   */}
      <div className="md:hidden">
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
            aria-hidden="true"
          />
        )}

        {/* Drawer — slides up from bottom, safe-area aware */}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ height: 'calc(100dvh - 56px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <ChatPanel {...sharedPanelProps} />
        </div>

        {/* Mobile launcher button */}
        <div className="fixed bottom-4 right-4 z-50">
          {showProactive && !open && (
            <div className="absolute bottom-full right-0 mb-2 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl whitespace-nowrap border border-white/10">
                {isEn ? '💬 Need help?' : '💬 ¿Tienes preguntas?'}
                <div className="absolute bottom-0 right-5 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-white/10" />
              </div>
            </div>
          )}
          <button
            onClick={handleOpen}
            className={`relative w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
              open
                ? 'bg-[#1a1a1a] border border-white/[0.15]'
                : 'bg-gradient-to-br from-purple-600 to-purple-700 shadow-purple-500/25'
            }`}
            aria-label={open ? (isEn ? 'Close assistant' : 'Cerrar asistente') : (isEn ? 'Open AI assistant' : 'Abrir asistente IA')}
          >
            {showProactive && !open && (
              <span className="absolute inset-0 rounded-2xl bg-purple-500 animate-ping opacity-40 pointer-events-none" />
            )}
            {hasUnread && !open && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white z-10" />
            )}
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
        </div>
      </div>

      {/* ── DESKTOP: floating resizable panel (≥ md) ──────────────────────── */}
      <div className="hidden md:contents">
        {showProactive && !open && (
          <div className="fixed bottom-[88px] right-4 z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-xl whitespace-nowrap border border-white/10">
              {isEn ? '💬 Need help?' : '💬 ¿Tienes preguntas?'}
              <div className="absolute bottom-0 right-5 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-white/10" />
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleOpen}
            className={`relative w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center motion-reduce:transition-none transition-all duration-300 hover:scale-105 ${
              open
                ? 'bg-[#1a1a1a] border border-white/[0.15] hover:bg-[#252525]'
                : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/25'
            }`}
            aria-label={open ? (isEn ? 'Close assistant' : 'Cerrar asistente') : (isEn ? 'Open AI assistant' : 'Abrir asistente IA')}
          >
            {showProactive && !open && (
              <span className="absolute inset-0 rounded-2xl bg-purple-500 animate-ping opacity-40 pointer-events-none" />
            )}
            {hasUnread && !open && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white z-10" />
            )}
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
        </div>

        <div
          className={`fixed bottom-20 right-4 z-50 motion-reduce:transition-none transition-all duration-300 origin-bottom-right ${
            open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
          }`}
          style={{ width: `min(92vw, ${panelW}px)`, height: `min(70dvh, ${panelH}px)` }}
        >
          <ChatPanel
            {...sharedPanelProps}
            headerExtra={
              <div
                className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  resizingRef.current = true;
                  resizeStartRef.current = { x: e.clientX, y: e.clientY, w: panelW, h: panelH };
                  document.body.style.userSelect = 'none';
                }}
              >
                <svg className="w-3 h-3 mt-1 ml-1 text-white/20 group-hover:text-white/50 transition-colors" viewBox="0 0 12 12" fill="none">
                  <path d="M1 11L11 1M1 6L6 1M6 11L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}
