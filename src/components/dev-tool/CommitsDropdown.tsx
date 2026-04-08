// @ts-nocheck
import { useState } from 'react';
import { timeAgo } from '@/lib/utils'; // Assuming timeAgo is available

export function CommitsDropdown({
  commits,
}: {
  commits: CommitInfo[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center gap-1"
        title="Historial de commits"
      >
        📋 {commits.length > 0 ? commits.length : '…'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-200">📋 Últimos commits</span>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {commits.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">No hay commits</p>
              ) : commits.map(c => (
                <div key={c.sha} className="px-3 py-2 border-b border-gray-800 hover:bg-gray-800 transition-colors relative group/commit">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-purple-400">{c.sha.slice(0, 7)}</span>
                      <p className="text-[11px] text-gray-300 truncate leading-4 mt-0.5">{c.message}</p>
                      <span className="text-[9px] text-gray-600">{c.author} · {timeAgo(c.date)}</span>
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-[10px] text-gray-600 hover:text-gray-300 mt-0.5"
                      title="Ver en GitHub"
                    >
                      ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
