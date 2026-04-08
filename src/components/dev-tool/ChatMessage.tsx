import { useState, useMemo, useEffect, useRef } from 'react';
import { MarkdownText } from './MarkdownText';
import { DiffViewer } from './DiffViewer';
import { PendingChange, Message } from '@/app/admin/dev/DevTool'; // Adjust path as needed
import { timeAgo } from '@/lib/utils'; // Assuming timeAgo is available

export function ChatMessage({
  msg,
  msgIdx,
  onApply,
  onOpenInEditor,
  onEdit,
  onRegenerate,
  autoFixMode,
  onAutoApprove,
  autopilotMode,
}: {
  msg: Message;
  msgIdx: number;
  onApply: (changes: PendingChange[]) => void;
  onOpenInEditor: (change: PendingChange) => void;
  onEdit: (idx: number, newContent: string) => void;
  onRegenerate: (idx: number) => void;
  autoFixMode?: boolean;
  onAutoApprove?: (changes: PendingChange[]) => void;
  autopilotMode?: boolean;
}) {
  // Auto-expand all diffs when changes arrive
  const prevChangesLen = useRef(0);
  useEffect(() => {
    const changes = msg.pendingChanges ?? [];
    if (changes.length > prevChangesLen.current) {
      setExpandedSet(new Set(changes.map(c => c.path)));
    }
    prevChangesLen.current = changes.length;
  }, [msg.pendingChanges]);

  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);
  const [hovered, setHovered] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`attachment ${i + 1}`}
                className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-700 object-contain bg-gray-900"
              />
            ))}
          </div>
        )}

        {/* Context pills (AI only) */}
        {!isUser && msg.contextPills && msg.contextPills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {msg.contextPills.map((pill, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
                {pill}
              </span>
            ))}
          </div>
        )}

        {editing ? (
          <div className="w-full flex flex-col gap-1">
            <textarea
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              rows={4}
              className="w-full text-sm bg-gray-800 border border-blue-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
              <button
                onClick={() => { onEdit(msgIdx, editVal); setEditing(false); }}
                className="text-xs px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
              >
                Re-send ↑
              </button>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl px-4 py-2.5 text-sm leading-relaxed"
            style={{ background: isUser ? '#1d4ed8' : '#1f2937', color: '#f9fafb' }}
          >
            <MarkdownText text={msg.content} />
          </div>
        )}

        {/* Hover actions */}
        {hovered && !editing && (
          <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
            {isUser && (
              <button
                onClick={() => { setEditVal(msg.content); setEditing(true); }}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
                title="Edit and re-send"
              >
                ✏️ Edit
              </button>
            )}
            {!isUser && (
              <button
                onClick={() => onRegenerate(msgIdx)}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
                title="Regenerate response"
              >
                🔄 Retry
              </button>
            )}
            {/* Cost badge */}
            {msg.cost !== undefined && msg.cost > 0 && (
              <span className="text-[9px] text-gray-700" title={`${msg.inputTokens ?? 0} in / ${msg.outputTokens ?? 0} out tokens`}>
                ${msg.cost.toFixed(4)}
              </span>
            )}
          </div>
        )}

        {msg.pendingChanges && msg.pendingChanges.length > 0 && (autoFixMode || autopilotMode) && !msg.pendingChanges.every(c => c.applied) && onAutoApprove && (
          <div
            className="w-full rounded-xl border-2 p-3 flex flex-col gap-2 mb-1"
            style={{ borderColor: autopilotMode ? '#10b981' : '#16a34a', background: autopilotMode ? 'rgba(16,185,129,0.08)' : 'rgba(22,163,74,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{autopilotMode ? '⚡' : '⚡'}</span>
              <span className="text-xs font-bold" style={{ color: autopilotMode ? '#34d399' : '#16a34a' }}>
                {autopilotMode ? 'Modo Autopilot activo' : 'Modo Auto-fix activo'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {autopilotMode ? 
                `El AI ha preparado ${msg.pendingChanges.length} cambio${msg.pendingChanges.length > 1 ? 's' : ''}. Aprueba para aplicar y deployar automáticamente.` :
                `El AI propone ${msg.pendingChanges.length} cambio${msg.pendingChanges.length > 1 ? 's' : ''}. Revisa el diff y aprueba para aplicar y deployar automáticamente.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onAutoApprove(msg.pendingChanges!.filter(c => !c.applied))}
                className="flex-1 text-sm font-bold py-2 rounded-lg transition-colors"
                style={{ background: autopilotMode ? '#10b981' : '#16a34a', color: 'white' }}
              >
                ✅ Aprobar y Deploy
              </button>
              <button
                onClick={() => msg.pendingChanges?.forEach(c => onOpenInEditor(c))}
                className="text-xs px-3 py-1 rounded-lg border border-gray-600 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Revisar en editor
              </button>
            </div>
          </div>
        )}

        {!autopilotMode && msg.pendingChanges?.map((change) => (
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
                <button onClick={() => setExpandedSet(prev => {
                  const next = new Set(prev);
                  if (next.has(change.path)) next.delete(change.path);
                  else next.add(change.path);
                  return next;
                })} className="text-xs text-gray-400 hover:text-white transition-colors">
                  {expandedSet.has(change.path) ? '▲' : '▼'} diff
                </button>
                <button onClick={() => onOpenInEditor(change)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Open</button>
              </div>
            </div>
            {expandedSet.has(change.path) && (
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
