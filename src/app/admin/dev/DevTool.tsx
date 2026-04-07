'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createDiffLines } from '@/lib/dev-tool/diff-utils';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
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

const MODELS = [
  { id: 'claude-opus-4-5',    label: 'Claude Opus 4.5',    provider: 'anthropic', color: '#7c3aed' },
  { id: 'claude-sonnet-4-5',  label: 'Claude Sonnet 4.5',  provider: 'anthropic', color: '#2563eb' },
  { id: 'claude-haiku-3-5',   label: 'Claude Haiku 3.5',   provider: 'anthropic', color: '#059669' },
  { id: 'gemini-2.5-pro',     label: 'Gemini 2.5 Pro',     provider: 'gemini',    color: '#d97706' },
  { id: 'gemini-2.5-flash',   label: 'Gemini 2.5 Flash',   provider: 'gemini',    color: '#ea580c' },
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

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
          <div
            key={i}
            className="leading-5 px-1"
            style={{ color: log.level === 'error' ? '#fca5a5' : log.type === 'command' ? '#93c5fd' : '#d1d5db' }}
          >
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
      {change.explanation && (
        <p className="text-gray-400 mb-2 text-[11px]">{change.explanation}</p>
      )}
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
            <span className="select-none mr-2 opacity-40 w-3 inline-block">
              {line.type === '+' ? '+' : line.type === '-' ? '-' : ' '}
            </span>
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
                <button
                  onClick={() => setExpanded(expanded === change.path ? null : change.path)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {expanded === change.path ? '▲' : '▼'} diff
                </button>
                <button
                  onClick={() => onOpenInEditor(change)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Open
                </button>
              </div>
            </div>

            {expanded === change.path && (
              <div className="p-3 bg-gray-900 border-t border-gray-700">
                <DiffViewer change={change} />
              </div>
            )}

            {!change.applied ? (
              <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex justify-end gap-2">
                <button
                  onClick={() => onOpenInEditor(change)}
                  className="text-xs px-3 py-1 rounded-md font-medium transition-colors border border-gray-600 text-gray-300 hover:border-gray-400"
                >
                  Edit first
                </button>
                <button
                  onClick={() => onApply([change])}
                  className="text-xs px-3 py-1 rounded-md font-medium"
                  style={{ background: '#16a34a', color: 'white' }}
                >
                  Apply & Commit
                </button>
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { fetchDeploy(); fetchIndexStatus(); }, []);

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

  const handleIndex = async (force = false) => {
    setIndexing(true);
    try {
      const res = await fetch('/api/admin/dev/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchIndexStatus();
        alert(`✅ Indexed: ${json.indexed} files, skipped: ${json.skipped}`);
      } else alert(`Error: ${json.error}`);
    } finally { setIndexing(false); }
  };

  // Open a pending change in the editor (add as new tab or focus existing)
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

  // Lint the active tab
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

  // Apply changes via GitHub
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
        // Poll deploy status
        [5000, 15000, 30000, 60000].forEach(delay =>
          setTimeout(fetchDeploy, delay)
        );
        setTimeout(() => setShowLogs(true), 3000);
      } else {
        setApplyResult(`❌ ${json.error || 'Error applying changes'}`);
      }
    } finally { setApplyLoading(false); }
  }, [commitMsg]);

  // Apply the content of the active editor tab
  const applyActiveTab = useCallback(() => {
    const tab = tabs[activeTab];
    if (!tab) return;
    handleApplyChanges([{ path: tab.path, content: tab.content, action: 'update' }]);
  }, [tabs, activeTab, handleApplyChanges]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setApplyResult(null);

    try {
      const res = await fetch('/api/admin/dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          saveHistory: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.error}` }]);
        return;
      }

      const json = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: json.content || '*(no text response)*',
        pendingChanges: json.pendingChanges?.length ? json.pendingChanges : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-open first pending change in editor
      if (json.pendingChanges?.length > 0) {
        openInEditor(json.pendingChanges[0]);
        if (json.pendingChanges.length > 1) {
          // Queue rest as tabs
          json.pendingChanges.slice(1).forEach((c: PendingChange) => openInEditor(c));
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Network error. Try again.' }]);
    } finally { setLoading(false); }
  };

  const currentModel = MODELS.find(m => m.id === selectedModel) ?? MODELS[1];
  const hasTabs = tabs.length > 0;
  const currentTab = tabs[activeTab];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* ── CHAT PANEL ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col border-r border-gray-800"
        style={{ width: hasTabs ? '45%' : '100%' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900 flex-wrap gap-y-1">
          <span className="text-base">⚡</span>
          <span className="font-bold text-sm text-white">Menius Dev</span>

          <div className="flex-1 min-w-0" />

          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none"
          >
            <optgroup label="Claude (Anthropic)">
              {MODELS.filter(m => m.provider === 'anthropic').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
            <optgroup label="Gemini (Google)">
              {MODELS.filter(m => m.provider === 'gemini').map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          </select>

          {/* Index status */}
          {indexStatus && (
            <span className="text-[10px] text-gray-500">
              🗂 {indexStatus.uniqueFiles}f
            </span>
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="text-4xl">⚡</div>
              <div>
                <p className="text-white font-medium">Menius Dev Tool</p>
                <p className="text-gray-500 text-sm mt-1">Cursor-like AI assistant integrado en tu SaaS</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  '🔍 Audita la tienda buccaneer — velocidad y mobile',
                  '🐛 Busca errores de Sentry y propón fixes',
                  '📊 Muéstrame las restaurantes sin órdenes en 30 días',
                  '⚡ Cómo funciona el lazy loading de modifiers?',
                  '🎨 Agrega un dark mode toggle al admin dashboard',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s.replace(/^[^\s]+ /, ''))}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors bg-gray-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#7c3aed', color: 'white' }}>
                AI
              </div>
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

        {/* Input */}
        <div className="border-t border-gray-800 bg-gray-900 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMessage(); } }}
              placeholder="Pregunta, pide un fix, audita una tienda… (Ctrl+Enter para enviar)"
              rows={3}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              style={{ fontFamily: 'inherit' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
              style={{ background: '#7c3aed', color: 'white', minWidth: '80px' }}
            >
              {loading ? '⏳' : '↑ Send'}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-gray-600">Ctrl+Enter · {currentModel.label}</span>
            <div className="flex-1" />
            <button onClick={() => setMessages([])} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ── EDITOR PANEL ────────────────────────────────────────────────── */}
      {hasTabs && (
        <div className="flex flex-col" style={{ width: '55%' }}>

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

            {/* Lint errors badge */}
            {lintErrors.length > 0 && (
              <span className="text-xs text-red-400 flex-shrink-0">
                ⚠ {lintErrors.length} error{lintErrors.length > 1 ? 's' : ''}
              </span>
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

                {/* Lint errors panel */}
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
