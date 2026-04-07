'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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

interface DeployInfo {
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

const MODELS = [
  { id: 'claude-opus-4-5',   label: 'Claude Opus 4.5',   tag: 'opus',   color: '#7c3aed' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', tag: 'sonnet', color: '#2563eb' },
  { id: 'claude-haiku-3-5',  label: 'Claude Haiku 3.5',  tag: 'haiku',  color: '#059669' },
];

// ─── Deploy badge ─────────────────────────────────────────────────────────────
function DeployBadge({ deploy }: { deploy: DeployInfo | null }) {
  if (!deploy) return null;
  const color =
    deploy.state === 'READY' ? '#16a34a' :
    deploy.state === 'BUILDING' || deploy.state === 'QUEUED' ? '#d97706' :
    deploy.state === 'ERROR' ? '#dc2626' : '#6b7280';

  return (
    <a
      href={deploy.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border"
      style={{ borderColor: color, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: color }}
      />
      {deploy.state === 'READY' ? 'Live' : deploy.state === 'BUILDING' ? 'Building…' : deploy.state}
    </a>
  );
}

// ─── DiffViewer ───────────────────────────────────────────────────────────────
function DiffViewer({ change }: { change: PendingChange }) {
  const lines = createDiffLines(change.content);
  return (
    <div className="text-xs font-mono">
      {change.explanation && (
        <p className="text-gray-400 mb-2 text-[11px] not-italic">{change.explanation}</p>
      )}
      <div className="overflow-auto max-h-64 border border-gray-700 rounded">
        {lines.map((line, i) => (
          <div
            key={i}
            className="px-2 py-0.5 leading-5"
            style={{
              background: line.type === '+' ? 'rgba(22,163,74,0.15)' :
                          line.type === '-' ? 'rgba(220,38,38,0.15)' : 'transparent',
              color: line.type === '+' ? '#86efac' :
                     line.type === '-' ? '#fca5a5' : '#d1d5db',
            }}
          >
            <span className="select-none mr-2 opacity-40">
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
}: {
  msg: Message;
  onApply: (changes: PendingChange[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: isUser ? '#2563eb' : '#7c3aed',
          color: 'white',
        }}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Message bubble */}
        <div
          className="rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: isUser ? '#1d4ed8' : '#1f2937',
            color: '#f9fafb',
          }}
        >
          <MarkdownText text={msg.content} />
        </div>

        {/* Pending changes */}
        {msg.pendingChanges?.map((change) => (
          <div key={change.path} className="w-full border border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase"
                  style={{
                    background: change.action === 'delete' ? '#7f1d1d' :
                                change.action === 'create' ? '#14532d' : '#1e3a5f',
                    color: '#e5e7eb',
                  }}
                >
                  {change.action}
                </span>
                <span className="text-xs font-mono text-gray-300">{change.path}</span>
              </div>
              <button
                onClick={() => setExpanded(expanded === change.path ? null : change.path)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {expanded === change.path ? 'Hide diff ▲' : 'View diff ▼'}
              </button>
            </div>

            {expanded === change.path && (
              <div className="p-3 bg-gray-900">
                <DiffViewer change={change} />
              </div>
            )}

            {!change.applied && (
              <div className="px-3 py-2 bg-gray-800 border-t border-gray-700 flex justify-end">
                <button
                  onClick={() => onApply([change])}
                  className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
                  style={{ background: '#16a34a', color: 'white' }}
                >
                  Apply & Commit
                </button>
              </div>
            )}
            {change.applied && (
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

// ─── Simple markdown renderer ─────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        elements.push(
          <pre key={key++} className="bg-gray-950 rounded p-3 overflow-x-auto text-xs text-green-300 my-2 border border-gray-700">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        inCode = false;
        codeLang = '';
        codeLines = [];
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={key++} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>);
    } else if (line.trim() === '') {
      elements.push(<br key={key++} />);
    } else {
      elements.push(<span key={key++} className="block">{renderInline(line)}</span>);
    }
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-gray-700 text-green-300 px-1 rounded text-xs">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Main DevTool component ───────────────────────────────────────────────────
export default function DevTool() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[1].id);
  const [loading, setLoading] = useState(false);
  const [deploy, setDeploy] = useState<DeployInfo | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
  const [commitMsg, setCommitMsg] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load deploy status on mount
  useEffect(() => {
    fetchDeploy();
    fetchIndexStatus();
  }, []);

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
      const json = await res.json();
      setIndexStatus(json);
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
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e) {
      alert('Error indexing');
    } finally {
      setIndexing(false);
    }
  };

  const handleApplyChanges = useCallback(async (changes: PendingChange[]) => {
    if (!commitMsg.trim()) {
      const msg = prompt('Commit message:', 'fix: apply AI suggested changes');
      if (!msg) return;
      setCommitMsg(msg);
    }

    setApplyLoading(true);
    setApplyResult(null);
    try {
      const res = await fetch('/api/admin/dev/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changes.map(c => ({
            path: c.path,
            content: c.content,
            action: c.action,
          })),
          commitMessage: commitMsg || 'fix: apply AI suggested changes',
        }),
      });
      const json = await res.json();

      if (json.ok) {
        // Mark changes as applied in messages
        setMessages(prev =>
          prev.map(msg => ({
            ...msg,
            pendingChanges: msg.pendingChanges?.map(pc =>
              changes.some(c => c.path === pc.path) ? { ...pc, applied: true } : pc
            ),
          }))
        );
        setApplyResult('✅ Changes committed! Vercel is deploying...');
        setTimeout(fetchDeploy, 5000);
        setTimeout(fetchDeploy, 15000);
        setTimeout(fetchDeploy, 30000);
      } else {
        setApplyResult(`❌ ${json.error || 'Error applying changes'}`);
      }
    } catch (e) {
      setApplyResult('❌ Network error');
    } finally {
      setApplyLoading(false);
    }
  }, [commitMsg]);

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
        content: json.content,
        pendingChanges: json.pendingChanges?.length ? json.pendingChanges : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If there's only one pending change, auto-preview it
      if (json.pendingChanges?.length === 1) {
        setActiveFile({ path: json.pendingChanges[0].path, content: json.pendingChanges[0].content });
        setCommitMsg(`fix: ${json.pendingChanges[0].path.split('/').pop()?.replace('.ts', '').replace('.tsx', '')}`);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Network error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentModel = MODELS.find(m => m.id === selectedModel) ?? MODELS[1];

  return (
    <div
      className="flex h-screen bg-gray-950 text-gray-100"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
    >
      {/* ── LEFT PANEL: Chat ─────────────────────────────────────────────── */}
      <div className="flex flex-col" style={{ width: activeFile ? '50%' : '100%', borderRight: '1px solid #1f2937' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-bold text-sm text-white">Menius Dev</span>
            <span className="text-[10px] text-gray-500">Cursor-like AI</span>
          </div>

          <div className="flex-1" />

          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-gray-500"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {/* Index status */}
          {indexStatus && (
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <span>🗂 {indexStatus.uniqueFiles} files</span>
              {indexStatus.lastIndexed && (
                <span>· {new Date(indexStatus.lastIndexed).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Index button */}
          <button
            onClick={() => handleIndex(false)}
            disabled={indexing}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
          >
            {indexing ? '⏳' : '🔍'} Index
          </button>

          {/* Deploy badge */}
          <DeployBadge deploy={deploy} />

          {/* Refresh deploy */}
          <button
            onClick={fetchDeploy}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
            title="Refresh deploy status"
          >
            🔄
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="text-4xl">⚡</div>
              <div>
                <p className="text-white font-medium">Menius Dev Tool</p>
                <p className="text-gray-500 text-sm mt-1">Ask me anything about the codebase or request changes</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  '🔍 Audit the buccaneer store performance',
                  '🐛 Find and fix the checkout bug in shelara-bloom',
                  '⚡ How does lazy modifier loading work?',
                  '🎨 Add a new feature to the admin dashboard',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion.slice(2).trim())}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors bg-gray-900"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} onApply={handleApplyChanges} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#7c3aed', color: 'white' }}
              >
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

        {/* Input area */}
        <div className="border-t border-gray-800 bg-gray-900 p-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about code, request changes, debug issues… (Ctrl+Enter to send)"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                style={{ fontFamily: 'inherit' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#7c3aed', color: 'white', minWidth: '80px' }}
            >
              {loading ? '⏳' : '⬆ Send'}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] text-gray-600">Ctrl+Enter to send · @web to search · Model: {currentModel.label}</span>
            <div className="flex-1" />
            <button
              onClick={() => setMessages([])}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Clear chat
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Code editor ──────────────────────────────────────── */}
      {activeFile && (
        <div className="flex flex-col" style={{ width: '50%' }}>
          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
            <span className="text-xs font-mono text-gray-300 truncate">{activeFile.path}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="Commit message…"
                className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-gray-500 w-48"
              />
              <button
                onClick={() => {
                  const allChanges = messages.flatMap(m => m.pendingChanges ?? []).filter(c => !c.applied);
                  if (allChanges.length) handleApplyChanges(allChanges);
                }}
                disabled={applyLoading}
                className="text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-50"
                style={{ background: '#16a34a', color: 'white' }}
              >
                {applyLoading ? '⏳ Applying…' : '✓ Apply All'}
              </button>
              <button
                onClick={() => setActiveFile(null)}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Monaco editor */}
          <div className="flex-1">
            <MonacoEditor
              value={activeFile.content}
              language={getLanguage(activeFile.path)}
              theme="vs-dark"
              onChange={value => setActiveFile(prev => prev ? { ...prev, content: value ?? '' } : null)}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getLanguage(filePath: string): string {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'typescriptreact';
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) return 'typescript';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.css')) return 'css';
  return 'typescript';
}
