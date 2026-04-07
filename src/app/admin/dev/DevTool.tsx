'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createDiffLines } from '@/lib/dev-tool/diff-utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];       // base64 data URLs attached by the user
  pendingChanges?: PendingChange[];
}

interface PendingChange {
  path: string;
  content: string;
  action: 'create' | 'update' | 'delete';
  explanation?: string;
  applied?: boolean;
}

interface EditorTab {
  path: string;
  content: string;
  dirty?: boolean;
}

interface DeployInfo {
  id: string;
  state: string;
  url: string;
  commitMessage: string | null;
  createdAt: string;
}

interface IndexStatus {
  totalChunks: number;
  uniqueFiles: number;
  lastIndexed: string | null;
}

interface LintError {
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
}

interface LogEntry {
  type: string;
  ts: string | null;
  text: string;
  level: 'error' | 'info';
}

interface ConversationSummary {
  id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

const MODELS = [
  { id: 'claude-opus-4-5',              label: 'Claude Opus 4.5 ⚡',    provider: 'anthropic',  color: '#7c3aed' },
  { id: 'claude-sonnet-4-5',            label: 'Claude Sonnet 4.5',     provider: 'anthropic',  color: '#2563eb' },
  { id: 'claude-haiku-3-5',             label: 'Claude Haiku 3.5',      provider: 'anthropic',  color: '#059669' },
  { id: 'gemini-2.5-pro',               label: 'Gemini 2.5 Pro',        provider: 'gemini',     color: '#d97706' },
  { id: 'gemini-2.5-flash',             label: 'Gemini 2.5 Flash',      provider: 'gemini',     color: '#ea580c' },
  { id: 'openai/o3',                    label: 'OpenAI o3 🧠',           provider: 'openrouter', color: '#16a34a' },
  { id: 'openai/o4-mini',               label: 'OpenAI o4-mini',         provider: 'openrouter', color: '#4ade80' },
  { id: 'openai/gpt-4.5',               label: 'GPT-4.5',               provider: 'openrouter', color: '#14b8a6' },
  { id: 'openai/gpt-4o',                label: 'GPT-4o 👁',             provider: 'openrouter', color: '#0d9488' },
  { id: 'meta-llama/llama-4-maverick',  label: 'Llama 4 Maverick',      provider: 'openrouter', color: '#f59e0b' },
];

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Auditar tienda', prompt: 'Audita la tienda buccaneer: velocidad, mobile, errores y propón mejoras concretas.' },
  { icon: '🐛', label: 'Buscar errores', prompt: 'Busca errores recientes en Sentry y propón fixes para los más críticos.' },
  { icon: '📊', label: 'Analytics negocio', prompt: 'Muéstrame métricas clave: subscripciones activas, MRR en Stripe, y restaurantes sin órdenes en 30 días.' },
  { icon: '🌐', label: 'Revisar web', prompt: 'Revisa menius.app y dame un análisis de la landing page, UX y posibles mejoras.' },
  { icon: '🚀', label: 'Performance', prompt: 'Analiza los archivos de mayor impacto en performance y sugiere optimizaciones.' },
  { icon: '🔒', label: 'Seguridad', prompt: 'Revisa los route handlers públicos y valida que tengan rate limiting, auth y validación correctos.' },
  { icon: '📈', label: 'Market research', prompt: 'Investiga las últimas tendencias en menús digitales para restaurantes en Latinoamérica 2026.' },
  { icon: '💡', label: 'Nueva feature', prompt: '¿Cuál sería la feature con más ROI para agregar a Menius ahora mismo?' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLanguage(filePath: string): string {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'typescriptreact';
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) return 'typescript';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.css')) return 'css';
  return 'typescript';
}

function shortPath(p: string) {
  const parts = p.split('/');
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : p;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function groupByDate(conversations: ConversationSummary[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const week = new Date(now.getTime() - 7 * 86400000);

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (d.toDateString() === today) groups[0].items.push(c);
    else if (d.toDateString() === yesterday) groups[1].items.push(c);
    else if (d >= week) groups[2].items.push(c);
    else groups[3].items.push(c);
  }

  return groups.filter(g => g.items.length > 0);
}

function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  commits,
}: {
  conversations: ConversationSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  commits: CommitInfo[];
}) {
  const [tab, setTab] = useState<'chats' | 'history'>('chats');
  const groups = groupByDate(conversations);

  return (
    <div className="flex flex-col border-r border-gray-800 bg-gray-950 flex-shrink-0" style={{ width: 220 }}>
      <div className="p-2 border-b border-gray-800">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors border border-gray-700"
        >
          <span className="font-bold">+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-800">
        {(['chats', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[10px] py-1.5 uppercase tracking-wider transition-colors"
            style={{ color: tab === t ? '#a78bfa' : '#6b7280', borderBottom: tab === t ? '2px solid #a78bfa' : '2px solid transparent' }}
          >
            {t === 'chats' ? '💬 Chats' : '📋 Commits'}
          </button>
        ))}
      </div>

      {tab === 'chats' ? (
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No conversations yet.<br />Start chatting!</p>
          ) : (
            groups.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider px-3 mb-1 font-medium">{group.label}</p>
                {group.items.map(conv => (
                  <div
                    key={conv.id}
                    className="group relative mx-1 rounded-lg"
                    style={{ background: conv.id === activeId ? '#1f2937' : 'transparent' }}
                  >
                    <button
                      onClick={() => onSelect(conv.id)}
                      className="w-full text-left px-2 py-1.5 text-xs leading-5 pr-7 transition-colors"
                      style={{ color: conv.id === activeId ? '#f9fafb' : '#9ca3af' }}
                    >
                      <span className="block truncate">{conv.title || 'New conversation'}</span>
                      {conv.model && (
                        <span className="text-[9px] text-gray-600 block truncate">{conv.model.split('/').pop()}</span>
                      )}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs w-5 h-5 flex items-center justify-center rounded"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {commits.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No commits found</p>
          ) : (
            commits.map(c => (
              <a
                key={c.sha}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2 py-2 mx-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <span className="text-[10px] font-mono text-purple-400">{c.sha}</span>
                <span className="block text-[11px] text-gray-300 truncate leading-4 mt-0.5">{c.message}</span>
                <span className="text-[9px] text-gray-600">{c.author} · {timeAgo(c.date)}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deploy badge ─────────────────────────────────────────────────────────────
function DeployBadge({ deploy, onClick }: { deploy: DeployInfo | null; onClick: () => void }) {
  if (!deploy) return null;
  const color =
    deploy.state === 'READY' ? '#16a34a' :
    deploy.state === 'BUILDING' || deploy.state === 'QUEUED' || deploy.state === 'INITIALIZING' ? '#d97706' :
    deploy.state === 'ERROR' ? '#dc2626' : '#6b7280';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors hover:opacity-80"
      style={{ borderColor: color, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: color,
          animation: deploy.state === 'BUILDING' || deploy.state === 'INITIALIZING' ? 'pulse 1s infinite' : 'none',
        }}
      />
      {deploy.state === 'READY' ? 'Live ✓' :
       deploy.state === 'BUILDING' ? 'Building…' :
       deploy.state === 'INITIALIZING' ? 'Init…' :
       deploy.state === 'ERROR' ? 'Failed ✗' : deploy.state}
    </button>
  );
}

// ─── Logs panel ───────────────────────────────────────────────────────────────
function LogsPanel({ deployId, onClose }: { deployId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [state, setDeployState] = useState('…');
  const [polling, setPolling] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!polling) return;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/dev/logs?deployId=${deployId}`);
        if (!res.ok) return;
        const json = await res.json();
        setLogs(json.logs ?? []);
        setDeployState(json.state ?? '…');
        if (json.state === 'READY' || json.state === 'ERROR' || json.state === 'CANCELED') {
          setPolling(false);
          return;
        }
        timer = setTimeout(poll, 3000);
      } catch { /* ignore */ }
    };
    poll();
    return () => clearTimeout(timer);
  }, [deployId, polling]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-300">Build Logs</span>
          <span className="text-xs text-gray-500">{deployId.slice(0, 12)}…</span>
          <span className={`text-xs font-medium ${state === 'READY' ? 'text-green-400' : state === 'ERROR' ? 'text-red-400' : 'text-yellow-400'}`}>
            {state}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className="leading-5 px-1" style={{ color: log.level === 'error' ? '#fca5a5' : log.type === 'command' ? '#93c5fd' : '#d1d5db' }}>
            {log.ts && <span className="text-gray-600 mr-2">{new Date(log.ts).toLocaleTimeString()}</span>}
            {log.text}
          </div>
        ))}
        {polling && <div className="text-gray-500 animate-pulse">● Waiting for logs…</div>}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

// ─── Diff viewer ──────────────────────────────────────────────────────────────
function DiffViewer({ change }: { change: PendingChange }) {
  const lines = useMemo(() => createDiffLines(change.content), [change.content]);
  return (
    <div className="text-xs font-mono">
      {change.explanation && <p className="text-gray-400 mb-2 text-[11px]">{change.explanation}</p>}
      <div className="overflow-auto max-h-56 border border-gray-700 rounded">
        {lines.map((line, i) => (
          <div
            key={i}
            className="px-2 py-0.5 leading-5 whitespace-pre"
            style={{
              background: line.type === '+' ? 'rgba(22,163,74,0.12)' : line.type === '-' ? 'rgba(220,38,38,0.12)' : 'transparent',
              color: line.type === '+' ? '#86efac' : line.type === '-' ? '#fca5a5' : '#9ca3af',
            }}
          >
            <span className="select-none mr-2 opacity-40 w-3 inline-block">{line.type === '+' ? '+' : line.type === '-' ? '-' : ' '}</span>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────
function ChatMessage({
  msg,
  onApply,
  onOpenInEditor,
}: {
  msg: Message;
  onApply: (changes: PendingChange[]) => void;
  onOpenInEditor: (change: PendingChange) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: isUser ? '#2563eb' : '#7c3aed', color: 'white' }}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Attached images */}
        {msg.images && msg.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`attachment ${i + 1}`}
                className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-700 object-contain bg-gray-900"
              />
            ))}
          </div>
        )}

        <div
          className="rounded-xl px-4 py-2.5 text-sm leading-relaxed"
          style={{ background: isUser ? '#1d4ed8' : '#1f2937', color: '#f9fafb' }}
        >
          <MarkdownText text={msg.content} />
        </div>

        {msg.pendingChanges?.map((change) => (
          <div key={change.path} className="w-full border border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase flex-shrink-0"
                  style={{
                    background: change.action === 'delete' ? '#7f1d1d' : change.action === 'create' ? '#14532d' : '#1e3a5f',
                    color: '#e5e7eb',
                  }}
                >
                  {change.action}
                </span>
                <span className="text-xs font-mono text-gray-300 truncate">{change.path}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setExpanded(expanded === change.path ? null : change.path)} className="text-xs text-gray-400 hover:text-white transition-colors">
                  {expanded === change.path ? '▲' : '▼'} diff
                </button>
                <button onClick={() => onOpenInEditor(change)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Open</button>
              </div>
            </div>
            {expanded === change.path && (
              <div className="p-3 bg-gray-900 border-t border-gray-700">
                <DiffViewer change={change} />
              </div>
            )}
            {!change.applied ? (
              <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex justify-end gap-2">
                <button onClick={() => onOpenInEditor(change)} className="text-xs px-3 py-1 rounded-md font-medium transition-colors border border-gray-600 text-gray-300 hover:border-gray-400">Edit first</button>
                <button onClick={() => onApply([change])} className="text-xs px-3 py-1 rounded-md font-medium" style={{ background: '#16a34a', color: 'white' }}>Apply & Commit</button>
              </div>
            ) : (
              <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 text-right">
                <span className="text-xs text-green-400">✓ Applied</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Minimal markdown renderer ────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let key = 0;

  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = []; }
      else {
        elements.push(
          <pre key={key++} className="bg-gray-950 rounded p-3 overflow-x-auto text-xs text-green-300 my-2 border border-gray-700">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith('### ')) elements.push(<h3 key={key++} className="font-bold text-sm mt-2 mb-0.5">{line.slice(4)}</h3>);
    else if (line.startsWith('## ')) elements.push(<h2 key={key++} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h2>);
    else if (line.startsWith('# ')) elements.push(<h1 key={key++} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h1>);
    else if (line.startsWith('- ') || line.startsWith('* ')) elements.push(<li key={key++} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>);
    else if (line.trim() === '') elements.push(<br key={key++} />);
    else elements.push(<span key={key++} className="block">{renderInline(line)}</span>);
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-gray-700 text-green-300 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

// ─── Main DevTool ─────────────────────────────────────────────────────────────
export default function DevTool() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[1].id);
  const [loading, setLoading] = useState(false);

  // Conversation management
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID());
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  // Attachments
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFileText, setAttachedFileText] = useState<Array<{ name: string; content: string }>>([]);

  // Voice
  const [listening, setListening] = useState(false);

  // Editor state
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [lintLoading, setLintLoading] = useState(false);

  // Deploy / logs state
  const [deploy, setDeploy] = useState<DeployInfo | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Index state
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [indexing, setIndexing] = useState(false);

  // Apply state
  const [commitMsg, setCommitMsg] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // Git history
  const [commits, setCommits] = useState<CommitInfo[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { fetchDeploy(); fetchIndexStatus(); fetchConversations(); fetchCommits(); }, []);

  const fetchDeploy = async () => {
    try {
      const res = await fetch('/api/admin/dev/deploy');
      if (!res.ok) return;
      const json = await res.json();
      if (json.deployments?.[0]) setDeploy(json.deployments[0]);
    } catch {}
  };

  const fetchIndexStatus = async () => {
    try {
      const res = await fetch('/api/admin/dev/index');
      if (!res.ok) return;
      setIndexStatus(await res.json());
    } catch {}
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/dev/chat');
      if (!res.ok) return;
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {}
  };

  const fetchCommits = async () => {
    try {
      const res = await fetch('/api/admin/dev/history');
      if (!res.ok) return;
      const json = await res.json();
      setCommits(json.commits ?? []);
    } catch {}
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/dev/chat?id=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const conv = json.conversation;
      if (!conv) return;
      const msgs: Message[] = (JSON.parse(conv.messages || '[]') as Array<{ role: string; content: string }>)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      setMessages(msgs);
      setConversationId(id);
      if (conv.model) setSelectedModel(conv.model);
      setTabs([]);
      setApplyResult(null);
      setAttachedImages([]);
      setAttachedFileText([]);
    } catch {}
  };

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setTabs([]);
    setConversationId(crypto.randomUUID());
    setInput('');
    setApplyResult(null);
    setLintErrors([]);
    setAttachedImages([]);
    setAttachedFileText([]);
  }, []);

  const deleteConversation = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await fetch(`/api/admin/dev/chat?id=${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (id === conversationId) handleNewChat();
    } catch {}
  };

  const handleIndex = async (force = false) => {
    setIndexing(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/admin/dev/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        await fetchIndexStatus();
        const errNote = json.errors?.length ? ` (${json.errors.length} file errors)` : '';
        setApplyResult(`✅ Indexado: ${json.indexed} archivos nuevos, ${json.skipped} sin cambios${errNote}`);
      } else {
        const msg = json.error ?? `HTTP ${res.status}`;
        setApplyResult(`❌ Index falló: ${msg}. Verifica VOYAGE_API_KEY y GITHUB_TOKEN en Vercel → Settings → Env Vars.`);
      }
    } catch (err) {
      setApplyResult(`❌ Index error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally { setIndexing(false); }
  };

  // ─── Attachment handlers ──────────────────────────────────────────────────
  const processFiles = useCallback((files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setAttachedImages(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      } else if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.ts') || file.name.endsWith('.tsx') ||
        file.name.endsWith('.js') || file.name.endsWith('.jsx') ||
        file.name.endsWith('.json') || file.name.endsWith('.md') ||
        file.name.endsWith('.sql') || file.name.endsWith('.csv') ||
        file.name.endsWith('.env') || file.name.endsWith('.log')
      ) {
        const reader = new FileReader();
        reader.onload = () => setAttachedFileText(prev => [
          ...prev,
          { name: file.name, content: (reader.result as string).slice(0, 15000) }
        ]);
        reader.readAsText(file);
      }
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) processFiles([file]);
      });
    }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  // ─── Voice input ──────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    type SR = typeof SpeechRecognition;
    const SpeechRecognitionClass: SR | undefined =
      (window as unknown as Record<string, unknown>).SpeechRecognition as SR ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as SR;

    if (!SpeechRecognitionClass) {
      alert('Voice recognition not supported in this browser. Try Chrome.');
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setInput(prev => (prev ? prev + ' ' + transcript : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  }, []);

  // ─── Editor helpers ───────────────────────────────────────────────────────
  const openInEditor = useCallback((change: PendingChange) => {
    setTabs(prev => {
      const existing = prev.findIndex(t => t.path === change.path);
      if (existing >= 0) { setActiveTab(existing); return prev; }
      const next = [...prev, { path: change.path, content: change.content }];
      setActiveTab(next.length - 1);
      return next;
    });
    setCommitMsg(prev => prev || `fix: ${change.path.split('/').pop()?.replace(/\.(ts|tsx)$/, '') ?? 'changes'}`);
  }, []);

  const lintActiveTab = useCallback(async () => {
    const tab = tabs[activeTab];
    if (!tab) return;
    setLintLoading(true);
    try {
      const res = await fetch('/api/admin/dev/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: tab.path, content: tab.content }),
      });
      const json = await res.json();
      setLintErrors(json.errors ?? []);
    } finally { setLintLoading(false); }
  }, [tabs, activeTab]);

  const handleApplyChanges = useCallback(async (changes: PendingChange[]) => {
    let msg = commitMsg;
    if (!msg.trim()) {
      const prompted = prompt('Commit message:', 'fix: apply AI suggested changes');
      if (!prompted) return;
      msg = prompted;
      setCommitMsg(msg);
    }
    setApplyLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/admin/dev/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changes.map(c => ({ path: c.path, content: c.content, action: c.action })),
          commitMessage: msg,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessages(prev => prev.map(m => ({
          ...m,
          pendingChanges: m.pendingChanges?.map(pc =>
            changes.some(c => c.path === pc.path) ? { ...pc, applied: true } : pc
          ),
        })));
        setApplyResult('✅ Committed! Vercel is deploying…');
        [5000, 15000, 30000, 60000].forEach(delay => setTimeout(fetchDeploy, delay));
        setTimeout(() => { setShowLogs(true); fetchCommits(); }, 3000);
      } else {
        setApplyResult(`❌ ${json.error || 'Error applying changes'}`);
      }
    } finally { setApplyLoading(false); }
  }, [commitMsg]);

  const applyActiveTab = useCallback(() => {
    const tab = tabs[activeTab];
    if (!tab) return;
    handleApplyChanges([{ path: tab.path, content: tab.content, action: 'update' }]);
  }, [tabs, activeTab, handleApplyChanges]);

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    const hasImages = attachedImages.length > 0;
    const hasFiles = attachedFileText.length > 0;
    if ((!text && !hasImages && !hasFiles) || loading) return;

    // Append file contents to the text message
    let fullText = text;
    if (hasFiles) {
      fullText += '\n\n' + attachedFileText.map(f =>
        `**Archivo adjunto: ${f.name}**\n\`\`\`\n${f.content}\n\`\`\``
      ).join('\n\n');
    }
    if (!fullText && hasImages) fullText = 'Analiza esta imagen y explica qué ves.';

    const userMsg: Message = {
      role: 'user',
      content: fullText,
      images: hasImages ? [...attachedImages] : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const imagesToSend = [...attachedImages];
    setAttachedImages([]);
    setAttachedFileText([]);
    setLoading(true);
    setApplyResult(null);

    const assistantIdx = newMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let finalAssistantContent = '';

    try {
      const res = await fetch('/api/admin/dev/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          images: imagesToSend,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map((m, i) => i === assistantIdx ? { ...m, content: `❌ Error: ${res.status}` } : m));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const collectedChanges: PendingChange[] = [];
      let toolStatusText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'token':
                finalAssistantContent += event.text;
                setMessages(prev => prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: m.content + event.text } : m
                ));
                break;
              case 'tool_call':
                toolStatusText = `\n\n*🔧 Using \`${event.name}\`…*`;
                setMessages(prev => prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: m.content + toolStatusText } : m
                ));
                break;
              case 'tool_done':
                setMessages(prev => prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: m.content.replace(toolStatusText, '') } : m
                ));
                toolStatusText = '';
                break;
              case 'pending_change':
                collectedChanges.push(event as PendingChange);
                break;
              case 'done':
                if (collectedChanges.length > 0) {
                  setMessages(prev => prev.map((m, i) =>
                    i === assistantIdx ? { ...m, pendingChanges: collectedChanges } : m
                  ));
                  collectedChanges.forEach(c => openInEditor(c));
                }
                break;
              case 'error':
                setMessages(prev => prev.map((m, i) =>
                  i === assistantIdx ? { ...m, content: m.content + `\n\n❌ ${event.message}` } : m
                ));
                break;
            }
          } catch { /* ignore parse errors */ }
        }
      }

      // Save conversation history
      if (finalAssistantContent) {
        const historyMessages = [
          ...newMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'assistant', content: finalAssistantContent },
        ];
        fetch('/api/admin/dev/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyMessages, model: selectedModel, conversationId, saveHistory: true }),
        }).then(() => fetchConversations()).catch(() => {});
      }

      // Auto-generate title for new conversations
      if (newMessages.length === 1 && finalAssistantContent) {
        const currentConvId = conversationId;
        fetch('/api/admin/dev/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `Generate a title (max 6 words, in Spanish) for: "${fullText.slice(0, 200)}". Reply ONLY with the title.` }],
            model: 'claude-haiku-3-5',
            saveHistory: false,
          }),
        }).then(r => r.ok ? r.json() : null).then(json => {
          if (json?.content) {
            fetch('/api/admin/dev/chat', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: currentConvId, title: json.content.slice(0, 60) }),
            }).then(() => fetchConversations()).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === assistantIdx ? { ...m, content: '❌ Network error. Try again.' } : m
      ));
    } finally { setLoading(false); }
  };

  const currentModel = MODELS.find(m => m.id === selectedModel) ?? MODELS[1];
  const hasTabs = tabs.length > 0;
  const currentTab = tabs[activeTab];

  return (
    <div
      className="flex h-screen bg-gray-950 text-gray-100"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={loadConversation}
        onNew={handleNewChat}
        onDelete={deleteConversation}
        commits={commits}
      />

      {/* ── CHAT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col border-r border-gray-800"
        style={{ width: hasTabs ? '40%' : undefined, flex: hasTabs ? undefined : 1 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900 flex-wrap gap-y-1">
          <span className="text-base">⚡</span>
          <span className="font-bold text-sm text-white">Menius Dev</span>
          <div className="flex-1 min-w-0" />

          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none"
          >
            <optgroup label="Claude (Anthropic) — vision ✓">
              {MODELS.filter(m => m.provider === 'anthropic').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
            <optgroup label="Gemini (Google) — vision ✓">
              {MODELS.filter(m => m.provider === 'gemini').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
            <optgroup label="OpenRouter (o3, GPT, Llama)">
              {MODELS.filter(m => m.provider === 'openrouter').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          </select>

          {indexStatus && (
            <span className="text-[10px] text-gray-500">🗂 {indexStatus.uniqueFiles}f</span>
          )}

          <button
            onClick={() => handleIndex(false)}
            disabled={indexing}
            className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-40"
          >
            {indexing ? '⏳' : '⟳'} Index
          </button>

          <DeployBadge deploy={deploy} onClick={() => setShowLogs(v => !v)} />
          <button onClick={fetchDeploy} className="text-gray-500 hover:text-gray-300 text-xs" title="Refresh">↺</button>
          <Link href="/admin/dev/setup" className="text-gray-600 hover:text-gray-400 text-xs transition-colors" title="Setup">⚙</Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="text-4xl">⚡</div>
              <div>
                <p className="text-white font-medium">Menius Dev Tool</p>
                <p className="text-gray-500 text-sm mt-1">Cursor-like AI assistant · Sube imágenes · Arrastra archivos · Voz</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => setInput(action.prompt)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors bg-gray-900"
                  >
                    <span className="mr-1">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-700">💡 Arrastra imágenes o archivos al chat · Pega screenshots con Ctrl+V · 🎙 usa el micrófono</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              msg={msg}
              onApply={handleApplyChanges}
              onOpenInEditor={openInEditor}
            />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#7c3aed', color: 'white' }}>AI</div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                <span>Thinking with {currentModel.label}…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Apply result */}
        {applyResult && (
          <div
            className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: applyResult.startsWith('✅') ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)',
              border: `1px solid ${applyResult.startsWith('✅') ? '#16a34a' : '#dc2626'}`,
              color: applyResult.startsWith('✅') ? '#86efac' : '#fca5a5',
            }}
          >
            {applyResult}
          </div>
        )}

        {/* Attachment previews */}
        {(attachedImages.length > 0 || attachedFileText.length > 0) && (
          <div className="mx-3 mb-2 flex flex-wrap gap-2">
            {attachedImages.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                <button
                  onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
            {attachedFileText.map((f, i) => (
              <div key={i} className="relative group flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                <span className="text-xs">📄</span>
                <span className="text-xs text-gray-300 max-w-[80px] truncate">{f.name}</span>
                <button
                  onClick={() => setAttachedFileText(prev => prev.filter((_, j) => j !== i))}
                  className="text-gray-600 hover:text-red-400 text-[10px] ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-800 bg-gray-900 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMessage(); } }}
              onPaste={handlePaste}
              placeholder="Pregunta, pide un fix, arrastra imágenes… (Ctrl+Enter para enviar)"
              rows={3}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              style={{ fontFamily: 'inherit' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && attachedImages.length === 0 && attachedFileText.length === 0)}
              className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
              style={{ background: '#7c3aed', color: 'white', minWidth: '80px' }}
            >
              {loading ? '⏳' : '↑ Send'}
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 mt-1.5">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={textFileInputRef}
              type="file"
              accept=".ts,.tsx,.js,.jsx,.json,.md,.sql,.csv,.txt,.log,.env"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) processFiles(e.target.files); e.target.value = ''; }}
            />

            {/* Image attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              title="Attach image (or paste/drag)"
            >
              🖼 Image
            </button>

            {/* File attach */}
            <button
              onClick={() => textFileInputRef.current?.click()}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              title="Attach file (.ts, .json, .csv, .log…)"
            >
              📎 File
            </button>

            {/* Voice input */}
            <button
              onClick={startVoice}
              disabled={listening}
              className="text-[10px] transition-colors flex items-center gap-1 disabled:opacity-50"
              style={{ color: listening ? '#a78bfa' : '#6b7280' }}
              title="Voice input (Spanish)"
            >
              {listening ? '🎙 Listening…' : '🎙 Voice'}
            </button>

            <div className="flex-1" />

            <span className="text-[10px] text-gray-600">Ctrl+Enter · {currentModel.label}</span>
            <button onClick={() => setMessages([])} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── EDITOR PANEL ────────────────────────────────────────────────────── */}
      {hasTabs && (
        <div className="flex flex-col flex-1">
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-800 bg-gray-900 overflow-x-auto">
            {tabs.map((tab, i) => (
              <div
                key={tab.path}
                className="flex items-center gap-1.5 px-3 py-2 border-r border-gray-800 cursor-pointer flex-shrink-0 group"
                style={{
                  background: i === activeTab ? '#111827' : 'transparent',
                  borderBottom: i === activeTab ? '2px solid #7c3aed' : '2px solid transparent',
                }}
                onClick={() => setActiveTab(i)}
              >
                <span className="text-xs font-mono text-gray-300 max-w-[160px] truncate" title={tab.path}>
                  {shortPath(tab.path)}
                </span>
                {tab.dirty && <span className="text-yellow-400 text-xs">●</span>}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setTabs(prev => {
                      const next = prev.filter((_, j) => j !== i);
                      setActiveTab(Math.min(activeTab, next.length - 1));
                      return next;
                    });
                  }}
                  className="text-gray-600 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Editor toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900">
            <span className="text-xs font-mono text-gray-400 truncate flex-1" title={currentTab?.path}>{currentTab?.path}</span>
            {lintErrors.length > 0 && (
              <span className="text-xs text-red-400 flex-shrink-0">⚠ {lintErrors.length} error{lintErrors.length > 1 ? 's' : ''}</span>
            )}
            <button
              onClick={lintActiveTab}
              disabled={lintLoading}
              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {lintLoading ? '⏳' : '✓'} Lint
            </button>
            <input
              type="text"
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="Commit message…"
              className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-gray-500 w-44"
            />
            <button
              onClick={applyActiveTab}
              disabled={applyLoading || !currentTab}
              className="text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
              style={{ background: '#16a34a', color: 'white' }}
            >
              {applyLoading ? '⏳' : '✓ Apply'}
            </button>
          </div>

          {/* Monaco editor or logs */}
          <div className="flex-1 overflow-hidden">
            {showLogs && deploy ? (
              <LogsPanel deployId={deploy.id} onClose={() => setShowLogs(false)} />
            ) : currentTab ? (
              <>
                <MonacoEditor
                  value={currentTab.content}
                  language={getLanguage(currentTab.path)}
                  theme="vs-dark"
                  onChange={value => {
                    setTabs(prev => prev.map((t, i) =>
                      i === activeTab ? { ...t, content: value ?? '', dirty: true } : t
                    ));
                    setLintErrors([]);
                  }}
                  options={{
                    fontSize: 12,
                    minimap: { enabled: true },
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 8, bottom: 8 },
                    renderWhitespace: 'selection',
                  }}
                />
                {lintErrors.length > 0 && (
                  <div className="border-t border-gray-800 bg-gray-900 max-h-28 overflow-y-auto">
                    {lintErrors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1 text-xs hover:bg-gray-800">
                        <span className={e.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                          {e.severity === 'error' ? '✗' : '⚠'}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">L{e.line}:{e.col}</span>
                        <span className="text-gray-300">{e.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
