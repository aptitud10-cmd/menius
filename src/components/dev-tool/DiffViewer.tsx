// @ts-nocheck
import { useMemo } from 'react';

function createDiffLines(content: string) {
  return (content || '').split('\n').map(line => ({
    text: line.replace(/^[+-] /, ''),
    type: line.startsWith('+') ? '+' : line.startsWith('-') ? '-' : ' ',
  }));
}

export function DiffViewer({ change }: { change: any }) {
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
